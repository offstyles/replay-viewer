<script setup lang="ts">
import { ref, watch, onUnmounted, nextTick, shallowRef } from "vue";
import LoadingModal from "./LoadingModal.vue";
import ViewerHUD from "./ViewerHUD.vue";
import ViewerControls from "./ViewerControls.vue";
import StatsOverlay from "./StatsOverlay.vue";
import type { NoclipRenderer } from "./noclipRenderer";
import { DEFAULT_RENDER_SETTINGS, type RenderSettings } from "./renderSettings";
import { PlaybackEngine, type PlaybackState } from "./playback";
import { Camera } from "./camera";
import { fetchWithProgress } from "./fetchWithProgress";
import ViewerSettings from "./ViewerSettings.vue";
import type { Time } from "@/types/Time";

async function waitForNextPaint() {
  await nextTick();
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
}

const props = defineProps<{
  mapName: string;
  replayId: string;
  show: boolean;
  time?: Time | null;
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
  currentStep.value = 1;
  stepLabel.value = "Initializing WASM...";
  progress.value = null;
  const wasm = await import("./wasm/bhop_replay_viewer_wasm");
  await wasm.default();

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

  currentStep.value = 3;
  stepLabel.value = "Decompressing BSP...";
  progress.value = null;
  await waitForNextPaint();
  const bspBytes = wasm.decompress_bz2(new Uint8Array(bz2Data));
  // Drop the compressed buffer ASAP — on big maps (e.g. bhop_gyat ~980MB
  // compressed → ~1.9GB raw) holding both alongside the wasm working set
  // pushes total memory past browser limits and trips the wasm OOM panic.
  bz2Data = null;

  currentStep.value = 4;
  stepLabel.value = "Initializing renderer...";
  await waitForNextPaint();
  if (!canvas.value) throw new Error("Canvas not mounted");
  const { NoclipRenderer } = await import("./noclipRenderer");
  renderer = new NoclipRenderer(canvas.value);
  autoExposureSupported.value = renderer.isAutoExposureSupported();

  stepLabel.value = "Parsing map...";
  await waitForNextPaint();
  await renderer.loadBSP(bspBytes, props.mapName);

  currentStep.value = 5;
  stepLabel.value = "Downloading replay...";
  progress.value = 0;
  const replayUrl = `${apiBaseUrl}/replay?id=${encodeURIComponent(props.replayId)}`;
  const replayBuf = await fetchWithProgress(
    replayUrl,
    (received, total) => {
      if (total) {
        progress.value = received / total;
        const pct = Math.round((received / total) * 100);
        stepLabel.value = `Downloading replay... ${pct}% (${(received / 1024).toFixed(0)} / ${(total / 1024).toFixed(0)}KB)`;
      } else {
        progress.value = null;
        stepLabel.value = `Downloading replay... ${(received / 1024).toFixed(0)}KB`;
      }
    },
    "include",
  );

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
