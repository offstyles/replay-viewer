<script setup lang="ts">
import { ref, watch } from 'vue'
import type { RenderSettings } from './renderSettings'

const props = withDefaults(defineProps<{
  modelValue: RenderSettings
  show: boolean
  autoExposureSupported?: boolean
}>(), {
  autoExposureSupported: true,
})

const emit = defineEmits<{
  'update:modelValue': [RenderSettings]
  'close': []
}>()

// Local mirror so checkbox bindings stay snappy without parent round-trip.
const local = ref<RenderSettings>({ ...props.modelValue })

watch(
  () => props.modelValue,
  (v) => { local.value = { ...v } },
  { deep: true },
)

function commit() {
  emit('update:modelValue', { ...local.value })
}
</script>

<template>
  <div
    v-if="show"
    class="absolute top-4 right-4 z-30 w-64 bg-main-800/95 backdrop-blur-sm border border-main-400/40 rounded-md shadow-lg text-sm"
  >
    <div class="flex items-center justify-between px-3 py-2 border-b border-main-400/30">
      <span class="font-mono text-gray-200">Render Settings</span>
      <button
        @click="$emit('close')"
        class="text-gray-400 hover:text-white text-xs"
        title="Close"
      >✕</button>
    </div>

    <div class="px-3 py-2 space-y-2">
      <label class="flex items-center justify-between cursor-pointer">
        <span class="text-gray-300">Bloom</span>
        <input
          type="checkbox"
          v-model="local.bloom"
          @change="commit"
          class="accent-green-700"
        />
      </label>
      <label
        class="flex items-center justify-between"
        :class="props.autoExposureSupported ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'"
        :title="props.autoExposureSupported ? '' : 'Auto-exposure is disabled in this browser because gl.getQueryParameter stalls the JS thread on Firefox.'"
      >
        <span class="text-gray-300">
          Auto-exposure
          <span v-if="!props.autoExposureSupported" class="text-xs text-gray-500">(unsupported)</span>
        </span>
        <input
          type="checkbox"
          v-model="local.autoExposure"
          :disabled="!props.autoExposureSupported"
          @change="commit"
          class="accent-green-700 disabled:cursor-not-allowed"
        />
      </label>
      <label class="flex items-center justify-between cursor-pointer">
        <span class="text-gray-300">Anti-aliasing</span>
        <select
          v-model="local.antialiasing"
          @change="commit"
          class="bg-main-700 border border-main-400/40 text-gray-200 rounded px-1 py-0.5 text-xs focus:outline-none focus:border-green-700"
        >
          <option value="none">None</option>
          <option value="fxaa">FXAA</option>
          <option value="msaa4">MSAA 4&times;</option>
        </select>
      </label>
      <label class="flex items-center justify-between cursor-pointer">
        <span class="text-gray-300">Disable fog</span>
        <input
          type="checkbox"
          v-model="local.disableFog"
          @change="commit"
          class="accent-green-700"
        />
      </label>
      <label class="flex items-center justify-between cursor-pointer">
        <span class="text-gray-300">Full bright</span>
        <input
          type="checkbox"
          v-model="local.fullbright"
          @change="commit"
          class="accent-green-700"
        />
      </label>
      <label class="flex items-center justify-between cursor-pointer">
        <span class="text-gray-300">Show zones</span>
        <input
          type="checkbox"
          v-model="local.showZones"
          @change="commit"
          class="accent-green-700"
        />
      </label>
    </div>
  </div>
</template>
