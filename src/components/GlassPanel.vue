<script setup>
defineProps({
  title: { type: String, default: '' },
  tight: { type: Boolean, default: false },
})
</script>

<template>
  <article class="rounded-2xl border border-white/10 bg-white/[0.04]" :class="tight ? 'p-4' : 'p-5'">
    <h3 v-if="title" class="mb-3 text-sm font-semibold text-emerald-100">{{ title }}</h3>
    <slot />
  </article>
</template>
