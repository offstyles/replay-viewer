<script setup lang="ts">
import { computed } from 'vue'
import type { PlaybackState } from './playback'
import { IN_FORWARD, IN_BACK, IN_MOVELEFT, IN_MOVERIGHT, IN_JUMP, IN_DUCK } from './playback'

const props = defineProps<{
  state: PlaybackState
  isFreecam: boolean
}>()

const speed = computed(() => Math.round(props.state.speed).toString())

const timeDisplay = computed(() => {
  const elapsed = props.state.tick / props.state.tickRate
  const mins = Math.floor(elapsed / 60)
  const secs = elapsed - mins * 60
  return `${mins}:${secs < 10 ? '0' : ''}${secs.toFixed(2)}`
})

function isPressed(flag: number): boolean {
  return (props.state.buttons & flag) !== 0
}
</script>

<template>
  <div class="absolute inset-0 pointer-events-none z-10 font-mono text-white">
    <!-- Camera mode -->
    <div class="absolute top-4 left-5 text-sm text-gray-400 drop-shadow-lg">
      {{ isFreecam ? 'Freecam' : 'Follow Cam' }}
    </div>

    <!-- Time -->
    <div class="absolute top-4 right-5 text-lg drop-shadow-lg">
      {{ timeDisplay }}
    </div>

    <!-- Speed (centered above key display) -->
    <div class="absolute bottom-24 left-1/2 -translate-x-1/2 text-3xl font-bold drop-shadow-lg tabular-nums">
      {{ speed }}
      <span class="text-sm font-normal text-gray-400 ml-0.5">u/s</span>
    </div>

    <!-- Key display: ShavitTimer-style layout -->
    <div class="absolute bottom-[88px] left-2 key-panel">
      <!-- Speed + Sync row -->
      <div class="flex gap-[3px] mb-[3px]">
        <div class="key-stat flex-1">
          Speed
          <span class="text-white">{{ speed }}</span>
        </div>
      </div>
      <!-- Duck + W row -->
      <div class="flex gap-[3px] mb-[3px]">
        <div class="key-box key-wide" :class="{ active: isPressed(IN_DUCK) }">Duck</div>
        <div class="key-box" :class="{ active: isPressed(IN_FORWARD) }">W</div>
        <div class="key-box key-placeholder" />
      </div>
      <!-- A S D row -->
      <div class="flex gap-[3px] mb-[3px]">
        <div class="key-box" :class="{ active: isPressed(IN_MOVELEFT) }">A</div>
        <div class="key-box" :class="{ active: isPressed(IN_BACK) }">S</div>
        <div class="key-box" :class="{ active: isPressed(IN_MOVERIGHT) }">D</div>
      </div>
      <!-- Jump row (full width) -->
      <div class="flex">
        <div class="key-box flex-1" :class="{ active: isPressed(IN_JUMP) }">Jump</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.key-panel {
  background: rgba(0, 0, 0, 0.25);
  padding: 6px;
  border-radius: 6px;
  width: 204px;
}

.key-stat {
  height: 32px;
  line-height: 32px;
  text-align: center;
  font-size: 10px;
  color: hsl(240, 4%, 50%);
  background: rgba(0, 0, 0, 0.5);
  border-radius: 3px;
  padding: 0 8px;
}
.key-stat span {
  font-size: 12px;
  margin-left: 4px;
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
  transition: background-color 0.05s, color 0.05s, border-color 0.05s;
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
