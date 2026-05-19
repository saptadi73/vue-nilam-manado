<script setup>
import { useToast } from '@/composables/useToast'

const { toasts, removeToast } = useToast()

const variantClass = (variant) => {
  if (variant === 'success') {
    return 'border-emerald-300/40 bg-emerald-500/15 text-emerald-50'
  }
  if (variant === 'error') {
    return 'border-red-300/40 bg-red-500/15 text-red-50'
  }
  return 'border-cyan-300/40 bg-cyan-500/15 text-cyan-50'
}
</script>

<template>
  <div class="pointer-events-none fixed right-4 top-20 z-50 flex w-88 max-w-[92vw] flex-col gap-2">
    <article
      v-for="item in toasts.items"
      :key="item.id"
      class="pointer-events-auto flex items-start justify-between gap-3 rounded-xl border px-4 py-3 text-sm shadow-xl backdrop-blur"
      :class="variantClass(item.variant)"
    >
      <p>{{ item.message }}</p>
      <button type="button" class="text-xs opacity-80 transition hover:opacity-100" @click="removeToast(item.id)">Tutup</button>
    </article>
  </div>
</template>
