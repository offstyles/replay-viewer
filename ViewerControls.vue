<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import type { PlaybackEngine } from './playback'
import type { Camera } from './camera'

const props = defineProps<{
  playback: PlaybackEngine
  camera: Camera
}>()

const emit = defineEmits(['close', 'toggle-stats'])

const isScrubbing = ref(false)
const scrubberValue = ref(0)
const isPlaying = ref(true)
const selectedSpeed = ref('1')

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
    if (!isScrubbing.value && isPlaying.value) {
      isVisible.value = false
    }
  }, 3000)
}

function onMouseMove() {
  showControls()
}

const timeDisplay = computed(() => {
  const elapsed = scrubberValue.value / props.playback.state.tickRate
  const mins = Math.floor(elapsed / 60)
  const secs = elapsed - mins * 60
  return `${mins}:${secs < 10 ? '0' : ''}${secs.toFixed(1)}`
})

const totalTimeDisplay = computed(() => {
  const total = (props.playback.state.totalTicks - 1) / props.playback.state.tickRate
  const mins = Math.floor(total / 60)
  const secs = total - mins * 60
  return `${mins}:${secs < 10 ? '0' : ''}${secs.toFixed(1)}`
})

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

function onSpeedChange(e: Event) {
  const val = parseFloat((e.target as HTMLSelectElement).value)
  if (!Number.isNaN(val)) {
    props.playback.setPlaybackRate(val)
  }
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
  if (!isScrubbing.value) {
    scrubberValue.value = props.playback.state.tick
  }
  isPlaying.value = props.playback.isPlaying
  selectedSpeed.value = props.playback.playbackRate.toString()
}

defineExpose({ updateScrubber })
</script>

<template>
  <div
    class="absolute bottom-0 left-0 w-full z-20 transition-[opacity,transform] duration-300"
    :class="isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'"
    @mouseenter="showControls"
  >
    <!-- Controls bar background -->
    <div class="bg-main-800/90 backdrop-blur-sm border-t border-main-400/30 px-4 py-2.5">
      <!-- Scrubber row -->
      <div class="flex items-center gap-3 mb-2">
        <span class="text-xs text-gray-400 font-mono w-12 text-right shrink-0">{{ timeDisplay }}</span>
        <input
          type="range"
          min="0"
          :max="playback.state.totalTicks - 1"
          :value="scrubberValue"
          @input="onScrubInput"
          @change="onScrubChange"
          class="scrubber flex-1 h-1 appearance-none bg-main-300/40 rounded outline-none cursor-pointer"
        />
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
          :value="selectedSpeed"
          @change="onSpeedChange"
          class="bg-main-600 hover:bg-main-500 text-white text-xs font-mono rounded px-2 py-1.5 cursor-pointer transition-colors border-none outline-none"
          title="Playback speed"
        >
          <option value="0.25">0.25x</option>
          <option value="0.5">0.5x</option>
          <option value="1">1x</option>
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

        <!-- Stats toggle -->
        <button
          @click="$emit('toggle-stats')"
          class="bg-main-600 hover:bg-main-500 text-white text-xs px-3 py-1.5 rounded transition-colors shrink-0"
          title="Toggle stats (G)"
        >
          Stats <span class="text-gray-400 ml-0.5">G</span>
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
