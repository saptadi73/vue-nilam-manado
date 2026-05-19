<script setup>
const props = defineProps({
  variant: { type: String, default: 'neutral' },
  fullWidth: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
})

const classByVariant = {
  neutral: 'icon-action',
  danger: 'icon-action border-red-300/40 text-red-100 hover:border-red-300/60 hover:bg-red-500/20',
  primary: 'btn-primary',
  muted: 'btn-muted',
}
</script>

<template>
  <button
    type="button"
    :disabled="disabled"
    :class="[classByVariant[variant] ?? classByVariant.neutral, fullWidth ? 'w-full justify-center sm:w-auto' : '']"
  >
    <slot />
  </button>
</template>
