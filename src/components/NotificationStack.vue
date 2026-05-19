<script setup>
defineProps({
  items: {
    type: Array,
    default: () => [],
  },
})
</script>

<template>
  <div class="fixed right-4 top-24 z-40 w-[min(92vw,360px)] space-y-2">
    <div
      v-for="item in items"
      :key="item.id"
      class="rounded-xl border px-4 py-3 text-sm shadow-lg backdrop-blur"
      :class="item.type === 'error' ? 'border-red-200/50 bg-red-500/20 text-red-50' : 'border-emerald-200/40 bg-emerald-500/20 text-emerald-50'"
    >
      {{ item.message }}
    </div>
  </div>
</template>
