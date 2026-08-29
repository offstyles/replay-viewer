<script setup lang="ts">
import { computed, ref } from 'vue'
import type { PlaybackState } from './playback'
import { IN_FORWARD, IN_BACK, IN_MOVELEFT, IN_MOVERIGHT, IN_JUMP, IN_DUCK } from './playback'
import type { ReplayTime } from './types'
import { formatRunTime } from './formatRunTime'
import type { RunTicks } from './zones'

const props = defineProps<{
  isFreecam: boolean
  showInfo: boolean
  mapName: string
  time: ReplayTime | null
  runTicks: RunTicks | null
}>()

const runTime = computed(() =>
  props.time && props.time.time > 0 ? formatRunTime(props.time.time) : null,
)

const timerEl = ref<HTMLElement | null>(null)
const speedEl = ref<HTMLElement | null>(null)
const keyDuck = ref<HTMLElement | null>(null)
const keyW = ref<HTMLElement | null>(null)
const keyA = ref<HTMLElement | null>(null)
const keyS = ref<HTMLElement | null>(null)
const keyD = ref<HTMLElement | null>(null)
const keyJump = ref<HTMLElement | null>(null)

let lastTimer = ''
let lastSpeed = ''
let lastButtons = -1

function timerText(state: PlaybackState): string {
  if (!props.runTicks) return ''
  const { start, end } = props.runTicks
  const elapsed = Math.max(state.exactTick - start, 0) / state.tickRate
  const finalTime = state.time > 0 ? state.time : (end - start) / state.tickRate
  return formatRunTime(Math.min(elapsed, finalTime))
}

function setKey(el: HTMLElement | null, buttons: number, flag: number) {
  el?.classList.toggle('active', (buttons & flag) !== 0)
}

function update(state: PlaybackState) {
  const timer = timerText(state)
  if (timer !== lastTimer) {
    lastTimer = timer
    if (timerEl.value) timerEl.value.textContent = timer
  }
  const speed = Math.round(state.speed).toString()
  if (speed !== lastSpeed) {
    lastSpeed = speed
    if (speedEl.value) speedEl.value.textContent = speed
  }
  if (state.buttons !== lastButtons) {
    lastButtons = state.buttons
    setKey(keyDuck.value, state.buttons, IN_DUCK)
    setKey(keyW.value, state.buttons, IN_FORWARD)
    setKey(keyA.value, state.buttons, IN_MOVELEFT)
    setKey(keyS.value, state.buttons, IN_BACK)
    setKey(keyD.value, state.buttons, IN_MOVERIGHT)
    setKey(keyJump.value, state.buttons, IN_JUMP)
  }
}

defineExpose({ update })
</script>

<template>
  <div class="absolute inset-0 pointer-events-none z-10 font-mono text-white">
    <!-- Camera mode -->
    <div class="absolute top-4 left-5 text-sm text-gray-400 drop-shadow-lg">
      {{ isFreecam ? 'Freecam' : 'Follow Cam' }}
    </div>

    <!-- Replay info -->
    <div
      v-if="showInfo"
      class="absolute top-12 left-5 drop-shadow-lg space-y-0.5 leading-tight"
    >
      <div v-if="mapName" class="text-base text-white">{{ mapName }}</div>
      <div v-if="time?.name" class="text-sm text-gray-300">{{ time.name }}</div>
      <div v-if="runTime" class="text-sm text-gray-300 tabular-nums">{{ runTime }}</div>
    </div>

    <!-- Timer + speed -->
    <div class="hud-live absolute bottom-24 left-1/2 -translate-x-1/2 w-48 drop-shadow-lg tabular-nums flex flex-col items-center gap-1">
      <div v-if="runTicks" ref="timerEl" class="text-lg font-semibold leading-none" />
      <div class="relative text-xl font-bold leading-none">
        <span ref="speedEl" />
        <span class="absolute left-full top-1/2 -translate-y-1/2 ml-1 text-xs font-normal text-gray-400 whitespace-nowrap">u/s</span>
      </div>
    </div>

    <!-- Key display: ShavitTimer-style layout -->
    <div class="hud-live absolute bottom-[88px] left-2 key-panel">
      <!-- Duck + W row -->
      <div class="flex gap-[3px] mb-[3px]">
        <div ref="keyDuck" class="key-box key-wide">Duck</div>
        <div ref="keyW" class="key-box">W</div>
        <div class="key-box key-placeholder" />
      </div>
      <!-- A S D row -->
      <div class="flex gap-[3px] mb-[3px]">
        <div ref="keyA" class="key-box">A</div>
        <div ref="keyS" class="key-box">S</div>
        <div ref="keyD" class="key-box">D</div>
      </div>
      <!-- Jump row (full width) -->
      <div class="flex">
        <div ref="keyJump" class="key-box flex-1">Jump</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.hud-live {
  contain: layout style paint;
}

.key-panel {
  background: rgba(0, 0, 0, 0.25);
  padding: 6px;
  border-radius: 6px;
  width: 204px;
}

.key-box {
  width: 60px;
  height: 40px;
  line-height: 40px;
  text-align: center;
  font-size: 13px;
  font-weight: 600;
  color: hsl(240, 4%, 50%);
  background: rgba(0, 0, 0, 0.5);
  border-radius: 3px;
  border: 1px solid transparent;
}
.key-box.key-wide {
  width: 60px;
}
.key-box.key-placeholder {
  visibility: hidden;
}
.key-box.active {
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
  border-color: rgba(255, 255, 255, 0.25);
  text-shadow: 0 0 4px rgba(255, 255, 255, 0.4);
}
</style>
