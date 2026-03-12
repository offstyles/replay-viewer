<script setup lang="ts">
defineProps<{
  stepLabel: string
  progress: number | null  // 0-1 for determinate, null for indeterminate
  errorMessage: string | null
  currentStep: number
  totalSteps: number
}>()

defineEmits(['close'])
</script>

<template>
  <div class="absolute inset-0 flex flex-col items-center justify-center bg-main-900 z-50">
    <h1 class="text-2xl font-bold text-gray-100 mb-6">Replay Viewer</h1>

    <!-- Error State -->
    <template v-if="errorMessage">
      <p class="text-red-400 text-sm mb-4 max-w-md text-center">{{ errorMessage }}</p>
      <button
        @click="$emit('close')"
        class="px-4 py-2 bg-main-600 hover:bg-main-500 text-white rounded-md transition-colors"
      >
        Close
      </button>
    </template>

    <!-- Loading State -->
    <template v-else>
      <p class="text-gray-400 text-sm font-mono mb-3">{{ stepLabel }}</p>

      <!-- Overall step progress bar -->
      <div class="w-[300px] h-1 bg-main-600 rounded-full overflow-hidden mb-2">
        <div
          class="h-full bg-green-700/60 transition-[width] duration-300"
          :style="{ width: `${Math.round((currentStep / totalSteps) * 100)}%` }"
        />
      </div>

      <!-- Sub-step progress bar -->
      <div class="w-[300px] h-1.5 bg-main-600 rounded-full overflow-hidden mb-2">
        <!-- Determinate progress bar -->
        <div
          v-if="progress !== null"
          class="h-full bg-green-600 transition-[width] duration-200"
          :style="{ width: `${Math.round(progress * 100)}%` }"
        />
        <!-- Indeterminate animation -->
        <div
          v-else
          class="h-full bg-green-600 w-1/3 animate-indeterminate"
        />
      </div>

      <!-- Step counter -->
      <p class="text-gray-500 text-xs font-mono">
        Step {{ currentStep }} / {{ totalSteps }}
        <span v-if="progress !== null" class="ml-2 text-gray-400">{{ Math.round(progress * 100) }}%</span>
      </p>
    </template>
  </div>
</template>

<style scoped>
@keyframes indeterminate {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(400%); }
}
.animate-indeterminate {
  animation: indeterminate 1.5s ease-in-out infinite;
}
</style>
