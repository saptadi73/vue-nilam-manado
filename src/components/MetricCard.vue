<script setup>
const props = defineProps({
  title: { type: String, required: true },
  value: { type: String, required: true },
  subtitle: { type: String, default: '' },
})
</script>

<template>
  <article class="rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-sm">
    <p class="text-xs uppercase tracking-widest text-emerald-100/70">{{ title }}</p>
    <p class="mt-3 text-2xl font-semibold text-white">{{ value }}</p>
    <p v-if="subtitle" class="mt-1 text-sm text-emerald-100/70">{{ subtitle }}</p>
  </article>
</template>
