<script setup>
defineProps({
  eyebrow: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String, default: '' },
})
</script>

<template>
  <div>
    <p class="text-xs uppercase tracking-[0.18em] text-emerald-100/70">{{ eyebrow }}</p>
    <h2 class="text-2xl font-bold text-white">{{ title }}</h2>
    <p v-if="description" class="mt-2 text-sm text-emerald-50/80">{{ description }}</p>
  </div>
</template>
