<script setup>
defineProps({
  variant: { type: String, default: 'empty' },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  actionLabel: { type: String, default: '' },
})

const emit = defineEmits(['action'])

const toneClassByVariant = {
  empty: 'border-white/10 bg-black/20 text-emerald-100/85',
  error: 'border-red-300/40 bg-red-500/10 text-red-100',
}

const badgeClassByVariant = {
  empty: 'bg-emerald-400/15 text-emerald-50 border-emerald-300/20',
  error: 'bg-red-400/15 text-red-50 border-red-300/20',
}
</script>

<template>
  <div class="rounded-2xl border px-4 py-6 sm:px-5" :class="toneClassByVariant[variant] ?? toneClassByVariant.empty">
    <div class="mx-auto flex max-w-2xl flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <span class="inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em]" :class="badgeClassByVariant[variant] ?? badgeClassByVariant.empty">
          {{ variant === 'error' ? 'Terjadi Kendala' : 'Belum Ada Data' }}
        </span>
        <h3 class="mt-3 text-lg font-semibold text-white">{{ title }}</h3>
        <p v-if="description" class="mt-2 text-sm leading-relaxed opacity-90">
          {{ description }}
        </p>
      </div>

      <button v-if="actionLabel" type="button" class="btn-muted w-full sm:w-auto" @click="emit('action')">
        {{ actionLabel }}
      </button>
    </div>
  </div>
</template>
