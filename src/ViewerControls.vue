<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import type { PlaybackEngine } from './playback'
import type { Camera } from './camera'
import type { RunTicks } from './zones'

const props = defineProps<{
  playback: PlaybackEngine
  camera: Camera
  runTicks: RunTicks | null
}>()

const emit = defineEmits<{
  close: []
  'toggle-stats': []
  'toggle-settings': []
  'toggle-info': []
  preview: [tick: number | null]
}>()

const isScrubbing = ref(false)
const scrubberEl = ref<HTMLInputElement | null>(null)
const timeEl = ref<HTMLElement | null>(null)
let lastScrubTick = -1
const isPlaying = ref(true)
const speedFocused = ref(false)

const previewCanvas = ref<HTMLCanvasElement | null>(null)
const previewTick = ref<number | null>(null)
const previewX = ref(0)

// Auto-fade: hide controls after 3s of no mouse movement
const isVisible = ref(true)
let fadeTimer: number | null = null

function showControls() {
  isVisible.value = true
  resetFadeTimer()
}

function resetFadeTimer() {
  if (fadeTimer !== null) clearTimeout(fadeTimer)
  fadeTimer = window.setTimeout(() => {
    // Don't hide if scrubbing or paused
    if (!isScrubbing.value && isPlaying.value && !speedFocused.value) {
      isVisible.value = false
    }
  }, 3000)
}

function onMouseMove() {
  showControls()
}

function formatTicks(ticks: number) {
  const elapsed = ticks / props.playback.state.tickRate
  const mins = Math.floor(elapsed / 60)
  const secs = elapsed - mins * 60
  return `${mins}:${secs < 10 ? '0' : ''}${secs.toFixed(1)}`
}

const totalTimeDisplay = computed(() => formatTicks(props.playback.state.totalTicks - 1))
const previewTimeDisplay = computed(() => formatTicks(previewTick.value ?? 0))

// Match 12px thumb travel.
function tickPosition(tick: number) {
  const frac = tick / (props.playback.state.totalTicks - 1)
  return `calc(6px + ${frac} * (100% - 12px))`
}

function togglePlay() {
  props.playback.togglePlaying()
  showControls()
}

function onScrubInput(e: Event) {
  isScrubbing.value = true
  const val = parseInt((e.target as HTMLInputElement).value, 10)
  props.playback.setTick(val)
}

function onScrubChange() {
  isScrubbing.value = false
  resetFadeTimer()
}

function onScrubHover(e: MouseEvent) {
  const el = e.currentTarget as HTMLInputElement
  const rect = el.getBoundingClientRect()
  const frac = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
  const tick = Math.round(frac * (props.playback.state.totalTicks - 1))
  previewX.value = Math.max(128, Math.min(window.innerWidth - 128, rect.left + frac * rect.width))
  if (tick !== previewTick.value) {
    previewTick.value = tick
    emit('preview', tick)
  }
}

function onScrubLeave() {
  previewTick.value = null
  emit('preview', null)
}

function onSpeedChange(e: Event) {
  const select = e.target as HTMLSelectElement
  const val = parseFloat(select.value)
  if (!Number.isNaN(val)) {
    props.playback.setPlaybackRate(val)
  }
  select.blur()
}

function toggleCamera() {
  props.camera.toggleFreecam()
}

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen()
  } else {
    document.exitFullscreen()
  }
}

function onKeyDown(e: KeyboardEvent) {
  if (e.key === ' ') {
    e.preventDefault()
    togglePlay()
  } else if (e.key === 'Escape') {
    emit('close')
  } else if (e.key.toLowerCase() === 'x') {
    toggleCamera()
  } else if (e.key.toLowerCase() === 'g') {
    emit('toggle-stats')
  } else if (e.key.toLowerCase() === 'i') {
    emit('toggle-info')
  } else if (e.key.toLowerCase() === 'f' && !e.ctrlKey) {
    toggleFullscreen()
  }
}

onMounted(() => {
  document.addEventListener('keydown', onKeyDown)
  document.addEventListener('mousemove', onMouseMove)
  resetFadeTimer()
})

onUnmounted(() => {
  document.removeEventListener('keydown', onKeyDown)
  document.removeEventListener('mousemove', onMouseMove)
  if (fadeTimer !== null) clearTimeout(fadeTimer)
})

function updateScrubber() {
  const tick = props.playback.state.tick
  if (!isScrubbing.value && tick !== lastScrubTick) {
    lastScrubTick = tick
    if (scrubberEl.value) scrubberEl.value.value = String(tick)
    if (timeEl.value) timeEl.value.textContent = formatTicks(tick)
  }
  isPlaying.value = props.playback.isPlaying
}

defineExpose({ updateScrubber, previewCanvas })
</script>

<template>
  <div
    class="absolute bottom-0 left-0 w-full z-20 transition-[opacity,transform] duration-300"
    :class="isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'"
    @mouseenter="showControls"
  >
    <div
      v-show="previewTick !== null"
      class="absolute bottom-full mb-1 -translate-x-1/2 pointer-events-none flex flex-col items-center gap-1"
      :style="{ left: `${previewX}px` }"
    >
      <canvas
        ref="previewCanvas"
        width="240"
        height="135"
        class="rounded border border-main-400/50 bg-black shadow-lg"
      />
      <span class="text-xs text-white font-mono bg-main-800/90 px-1.5 rounded">{{ previewTimeDisplay }}</span>
    </div>

    <!-- Controls bar background -->
    <div class="bg-main-800/90 backdrop-blur-sm border-t border-main-400/30 px-4 py-2.5">
      <!-- Scrubber row -->
      <div class="flex items-center gap-3 mb-2">
        <span ref="timeEl" class="text-xs text-gray-400 font-mono w-12 text-right shrink-0" />
        <div class="relative flex-1 flex items-center">
          <template v-if="runTicks">
            <div
              class="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-0.5 h-3 rounded-sm pointer-events-none"
              :style="{ left: tickPosition(runTicks.start), background: 'rgb(67, 210, 230)' }"
              title="Run start"
            />
            <div
              class="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-0.5 h-3 rounded-sm pointer-events-none"
              :style="{ left: tickPosition(runTicks.end), background: 'rgb(165, 19, 194)' }"
              title="Run end"
            />
          </template>
          <input
            ref="scrubberEl"
            type="range"
            min="0"
            :max="playback.state.totalTicks - 1"
            @input="onScrubInput"
            @change="onScrubChange"
            @mousemove="onScrubHover"
            @mouseleave="onScrubLeave"
            class="scrubber w-full h-1 appearance-none bg-main-300/40 rounded outline-none cursor-pointer"
          />
        </div>
        <span class="text-xs text-gray-400 font-mono w-12 shrink-0">{{ totalTimeDisplay }}</span>
      </div>

      <!-- Controls row -->
      <div class="flex items-center gap-2">
        <!-- Play/Pause -->
        <button
          @click="togglePlay"
          class="w-8 h-8 flex items-center justify-center bg-main-600 hover:bg-main-500 text-white rounded transition-colors shrink-0"
          :title="isPlaying ? 'Pause (Space)' : 'Play (Space)'"
        >
          <svg v-if="isPlaying" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-4 h-4">
            <path fill-rule="evenodd" d="M6.75 5.25a.75.75 0 01.75-.75H9a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H7.5a.75.75 0 01-.75-.75V5.25zm7.5 0A.75.75 0 0115 4.5h1.5a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H15a.75.75 0 01-.75-.75V5.25z" clip-rule="evenodd" />
          </svg>
          <svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-4 h-4">
            <path fill-rule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" clip-rule="evenodd" />
          </svg>
        </button>

        <!-- Speed -->
        <select
          @change="onSpeedChange"
          @focus="speedFocused = true"
          @blur="speedFocused = false; showControls()"
          class="bg-main-600 hover:bg-main-500 text-white text-xs font-mono rounded px-2 py-1.5 cursor-pointer transition-colors border-none outline-none"
          title="Playback speed"
        >
          <option value="0.25">0.25x</option>
          <option value="0.5">0.5x</option>
          <option value="1" selected>1x</option>
          <option value="2">2x</option>
          <option value="5">5x</option>
        </select>

        <div class="flex-1" />

        <!-- Camera toggle -->
        <button
          @click="toggleCamera"
          class="bg-main-600 hover:bg-main-500 text-white text-xs px-3 py-1.5 rounded transition-colors shrink-0"
          title="Toggle camera (X)"
        >
          Camera <span class="text-gray-400 ml-0.5">X</span>
        </button>

        <!-- Info toggle -->
        <button
          @click="$emit('toggle-info')"
          class="bg-main-600 hover:bg-main-500 text-white text-xs px-3 py-1.5 rounded transition-colors shrink-0"
          title="Toggle info (I)"
        >
          Info <span class="text-gray-400 ml-0.5">I</span>
        </button>

        <!-- Stats toggle -->
        <button
          @click="$emit('toggle-stats')"
          class="bg-main-600 hover:bg-main-500 text-white text-xs px-3 py-1.5 rounded transition-colors shrink-0"
          title="Toggle stats (G)"
        >
          Stats <span class="text-gray-400 ml-0.5">G</span>
        </button>

        <!-- Settings toggle -->
        <button
          @click="$emit('toggle-settings')"
          class="bg-main-600 hover:bg-main-500 text-white text-xs px-3 py-1.5 rounded transition-colors shrink-0"
          title="Render settings"
        >
          Settings
        </button>

        <!-- Fullscreen -->
        <button
          @click="toggleFullscreen"
          class="bg-main-600 hover:bg-main-500 text-white text-xs px-3 py-1.5 rounded transition-colors shrink-0"
          title="Toggle fullscreen (F)"
        >
          Fullscreen <span class="text-gray-400 ml-0.5">F</span>
        </button>

        <!-- Close -->
        <button
          @click="$emit('close')"
          class="bg-red-800/60 hover:bg-red-700/80 text-white text-xs px-3 py-1.5 rounded transition-colors shrink-0"
          title="Close (Esc)"
        >
          Close <span class="text-gray-400 ml-0.5">Esc</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Custom range slider styling — uses app green instead of pink */
.scrubber::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: hsl(140, 40%, 40%);
  cursor: pointer;
  border: 2px solid rgba(255, 255, 255, 0.3);
  transition: transform 0.1s;
}
.scrubber::-webkit-slider-thumb:hover {
  transform: scale(1.3);
}
.scrubber::-moz-range-thumb {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: hsl(140, 40%, 40%);
  cursor: pointer;
  border: 2px solid rgba(255, 255, 255, 0.3);
}
.scrubber::-moz-range-track {
  background: transparent;
}

/* Select dropdown styling */
select option {
  background: hsl(240, 14%, 5.5%);
  color: white;
}
</style>
