<script setup>
defineProps({
  contentClass: { type: String, default: 'flex flex-wrap items-center gap-3' },
})
</script>

<template>
  <div class="rounded-2xl border border-white/10 bg-black/20 p-4">
    <div :class="contentClass">
      <slot />
    </div>
  </div>
</template>
