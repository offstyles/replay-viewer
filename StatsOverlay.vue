<script setup lang="ts">
defineProps<{
  fps: number;
  frameTime: number;
  drawCalls: number;
  triangles: number;
}>();
</script>

<template>
  <div class="absolute top-12 right-5 z-20 bg-black/50 backdrop-blur-sm rounded px-3 py-2 font-mono text-xs text-white leading-relaxed pointer-events-none select-none">
    <div>FPS: {{ fps }}</div>
    <div>Frame: {{ frameTime.toFixed(1) }}ms</div>
    <div>Draw calls: {{ drawCalls }}</div>
    <div>Triangles: {{ triangles.toLocaleString() }}</div>
  </div>
</template>
