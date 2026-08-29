<script setup lang="ts">
import { ref, watch, onUnmounted, nextTick, shallowRef } from "vue";
import LoadingModal from "./LoadingModal.vue";
import ViewerHUD from "./ViewerHUD.vue";
import ViewerControls from "./ViewerControls.vue";
import StatsOverlay from "./StatsOverlay.vue";
import type { NoclipRenderer } from "./noclipRenderer";
import { DEFAULT_RENDER_SETTINGS, type RenderSettings } from "./renderSettings";
import { PlaybackEngine, type PlaybackState } from "./playback";
import { Camera, followViewMatrix } from "./camera";
import { mat4 } from "gl-matrix";
import { fetchWithProgress } from "./fetchWithProgress";
import { decompressBz2 } from "./decompressBz2";
import ViewerSettings from "./ViewerSettings.vue";
import type { ReplayTime } from "./types";
import { fetchZones } from "./zones";

const loadMarks: { name: string; at: number }[] = [];
function mark(name: string) {
  loadMarks.push({ name, at: performance.now() });
}

function reportLoadTimings() {
  const rows = loadMarks.slice(1).map((m, i) => ({
    phase: m.name,
    ms: Math.round(m.at - loadMarks[i].at),
  }));
  rows.push({ phase: "TOTAL", ms: Math.round(loadMarks[loadMarks.length - 1].at - loadMarks[0].at) });
  console.table(rows);
  (window as { __replayLoadTimings?: typeof rows }).__replayLoadTimings = rows;
}

async function waitForNextPaint() {
  await nextTick();
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
}

const props = defineProps<{
  mapName: string;
  replayId: string;
  show: boolean;
  time?: ReplayTime | null;
}>();

const emit = defineEmits(["close"]);

const apiBaseUrl = "/api";

// State
const isLoading = ref(true);
const stepLabel = ref("Initializing...");
const progress = ref<number | null>(null);
const errorMessage = ref<string | null>(null);
const currentStep = ref(0);
const totalSteps = 6;

const canvas = ref<HTMLCanvasElement | null>(null);
const controlsRef = ref<InstanceType<typeof ViewerControls> | null>(null);

// Non-reactive engine references (not tracked by Vue)
let renderer: NoclipRenderer | null = null;
let playbackEngine: PlaybackEngine | null = null;
let camera: Camera | null = null;
let animFrameId: number | null = null;
let previewTick: number | null = null;
let renderedPreviewTick: number | null = null;
const previewView = mat4.create();
const previewPos = new Float32Array(3);
const previewAngles = new Float32Array(2);

function onPreview(tick: number | null) {
  previewTick = tick;
  if (tick === null) renderedPreviewTick = null;
}

function renderPreview() {
  if (!renderer || !playbackEngine || previewTick === null || previewTick === renderedPreviewTick) return;
  const target = controlsRef.value?.previewCanvas;
  if (!target) return;
  const eyeHeight = playbackEngine.getTickView(previewTick, previewPos, previewAngles);
  previewPos[2] += eyeHeight;
  followViewMatrix(previewView, previewPos, previewAngles);
  renderer.renderPreview(previewView, target);
  renderedPreviewTick = previewTick;
}

// Reactive state exposed to child components
const playbackState = shallowRef<PlaybackState>({
  tick: 0,
  position: new Float32Array(3),
  angles: new Float32Array(2),
  buttons: 0,
  flags: 0,
  eyeHeight: 64,
  speed: 0,
  isPlaying: true,
  playbackRate: 1.0,
  totalTicks: 0,
  tickRate: 100,
  time: 0,
});
const isFreecam = ref(false);
const showStats = ref(false);
const showSettings = ref(false);
const showInfo = ref(true);
const renderSettings = ref<RenderSettings>({ ...DEFAULT_RENDER_SETTINGS });
const autoExposureSupported = ref(true);

function onSettingsChanged(s: RenderSettings) {
  renderSettings.value = s;
  renderer?.setSettings(s);
}

const statsFps = ref(0);
const statsFrameTime = ref(0);

// Expose non-reactive refs for ViewerControls
const playbackRef = shallowRef<PlaybackEngine | null>(null);
const cameraRef = shallowRef<Camera | null>(null);

watch(
  () => props.show,
  async (newShow) => {
    if (newShow) {
      document.body.style.overflow = "hidden";
      isLoading.value = true;
      errorMessage.value = null;
      currentStep.value = 0;
      await nextTick();
      try {
        await initViewer();
      } catch (err) {
        console.error("Replay viewer init failed:", err);
        errorMessage.value =
          err instanceof Error ? err.message : "Failed to initialize replay viewer";
      }
    } else {
      cleanup();
      document.body.style.overflow = "";
    }
  },
);

onUnmounted(() => {
  cleanup();
  document.body.style.overflow = "";
});

async function initViewer() {
  loadMarks.length = 0;
  mark("start");
  currentStep.value = 1;
  stepLabel.value = "Initializing WASM...";
  progress.value = null;
  const wasm = await import("./wasm/bhop_replay_viewer_wasm");
  await wasm.default();

  mark("wasm init");

  // Independent of the map pipeline, so start it now rather than after parsing.
  const replayUrl = `${apiBaseUrl}/replay?id=${encodeURIComponent(props.replayId)}`;
  const replayBufPromise = fetchWithProgress(replayUrl, () => {}, "include");
  replayBufPromise.catch(() => {});
  const zonesPromise = fetchZones(props.mapName).catch((err) => {
    console.warn("Failed to fetch zones:", err);
    return [];
  });

  currentStep.value = 2;
  stepLabel.value = "Downloading map...";
  progress.value = 0;
  const bspUrl = `${apiBaseUrl}/bsp?map=${encodeURIComponent(props.mapName)}`;
  let bz2Data: ArrayBuffer | null = await fetchWithProgress(bspUrl, (received, total) => {
    if (total) {
      progress.value = received / total;
      const pct = Math.round((received / total) * 100);
      stepLabel.value = `Downloading map... ${pct}% (${(received / 1024 / 1024).toFixed(1)} / ${(total / 1024 / 1024).toFixed(1)}MB)`;
    } else {
      progress.value = null;
      stepLabel.value = `Downloading map... ${(received / 1024 / 1024).toFixed(1)}MB`;
    }
  });

  mark("download map");

  currentStep.value = 3;
  stepLabel.value = "Decompressing BSP...";
  progress.value = null;
  // Transferred into the worker, so the compressed buffer and the wasm working set
  // leave this thread's heap entirely. On big maps (e.g. bhop_gyat ~980MB compressed
  // → ~1.9GB raw) holding both here pushed total memory past browser limits and
  // tripped the wasm OOM panic.
  const bspBytes = await decompressBz2(bz2Data);
  bz2Data = null;

  mark("decompress bsp");

  currentStep.value = 4;
  stepLabel.value = "Initializing renderer...";
  await waitForNextPaint();
  if (!canvas.value) throw new Error("Canvas not mounted");
  const { NoclipRenderer } = await import("./noclipRenderer");
  renderer = new NoclipRenderer(canvas.value);
  autoExposureSupported.value = renderer.isAutoExposureSupported();

  mark("init renderer");

  stepLabel.value = "Parsing map...";
  await waitForNextPaint();
  await renderer.loadBSP(bspBytes, props.mapName, mark);
  renderer.setZones(await zonesPromise);

  currentStep.value = 5;
  stepLabel.value = "Downloading replay...";
  progress.value = null;
  const replayBuf = await replayBufPromise;

  mark("download replay");

  currentStep.value = 6;
  stepLabel.value = "Parsing replay...";
  progress.value = null;
  await waitForNextPaint();
  const replay = wasm.parse_replay(new Uint8Array(replayBuf));

  playbackEngine = new PlaybackEngine(
    replay.positions(),
    replay.angles(),
    replay.buttons_array(),
    replay.flags_array(),
    replay.tick_count(),
    replay.tick_rate(),
    replay.time(),
  );
  camera = new Camera(canvas.value);

  playbackRef.value = playbackEngine;
  cameraRef.value = camera;

  mark("parse replay");
  reportLoadTimings();

  isLoading.value = false;
  startRenderLoop();
}

function startRenderLoop() {
  let lastTime = performance.now();

  function frame(now: number) {
    if (!renderer || !playbackEngine || !camera) return;

    const dt = Math.min((now - lastTime) / 1000, 0.1);
    lastTime = now;

    playbackEngine.update(dt);
    camera.update(dt, playbackEngine.state);
    renderPreview();
    const camPos = camera.getPosition();
    renderer.render(camera.viewMatrix, playbackEngine.state.position, camPos, camera.isFreecam);

    playbackState.value = { ...playbackEngine.state };
    isFreecam.value = camera.isFreecam;

    if (showStats.value) {
      statsFrameTime.value = dt * 1000;
      statsFps.value = Math.round(1 / dt);
    }

    controlsRef.value?.updateScrubber();

    animFrameId = requestAnimationFrame(frame);
  }

  animFrameId = requestAnimationFrame(frame);
}

function cleanup() {
  if (animFrameId !== null) {
    cancelAnimationFrame(animFrameId);
    animFrameId = null;
  }
  if (camera) {
    camera.dispose();
    camera = null;
  }
  if (renderer) {
    renderer.dispose();
    renderer = null;
  }
  playbackEngine = null;
  playbackRef.value = null;
  cameraRef.value = null;
  isLoading.value = true;

  if (document.fullscreenElement) {
    document.exitFullscreen().catch(() => {});
  }
}

function close() {
  cleanup();
  document.body.style.overflow = "";
  emit("close");
}
</script>

<template>
  <div v-if="show" class="fixed inset-0 z-50 bg-black">
    <canvas ref="canvas" class="w-full h-full block" />

    <!-- Loading overlay -->
    <LoadingModal
      v-if="isLoading"
      :step-label="stepLabel"
      :progress="progress"
      :error-message="errorMessage"
      :current-step="currentStep"
      :total-steps="totalSteps"
      @close="close"
    />

    <!-- HUD -->
    <ViewerHUD
      v-if="!isLoading && !errorMessage"
      :state="playbackState"
      :is-freecam="isFreecam"
      :show-info="showInfo"
      :map-name="mapName"
      :time="time ?? null"
    />

    <!-- Controls -->
    <ViewerControls
      v-if="!isLoading && !errorMessage && playbackRef && cameraRef"
      ref="controlsRef"
      :playback="playbackRef"
      :camera="cameraRef"
      @close="close"
      @toggle-stats="showStats = !showStats"
      @toggle-settings="showSettings = !showSettings"
      @toggle-info="showInfo = !showInfo"
      @preview="onPreview"
    />

    <!-- Stats overlay -->
    <StatsOverlay
      v-if="!isLoading && !errorMessage && showStats"
      :fps="statsFps"
      :frame-time="statsFrameTime"
    />

    <!-- Render settings -->
    <ViewerSettings
      v-if="!isLoading && !errorMessage"
      :show="showSettings"
      :model-value="renderSettings"
      :auto-exposure-supported="autoExposureSupported"
      @update:model-value="onSettingsChanged"
      @close="showSettings = false"
    />
  </div>
</template>
