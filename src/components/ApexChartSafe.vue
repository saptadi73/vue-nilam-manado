<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import VueApexCharts from 'vue3-apexcharts'

const props = defineProps({
  type: { type: String, required: true },
  height: { type: [String, Number], default: 'auto' },
  width: { type: [String, Number], default: '100%' },
  options: { type: Object, default: () => ({}) },
  series: { type: Array, default: () => [] },
})

const canRender = ref(false)
let rafId = 0

onMounted(() => {
  rafId = window.requestAnimationFrame(() => {
    canRender.value = true
  })
})

onBeforeUnmount(() => {
  if (rafId) {
    window.cancelAnimationFrame(rafId)
  }
  canRender.value = false
})
</script>

<template>
  <VueApexCharts
    v-if="canRender"
    :type="props.type"
    :height="props.height"
    :width="props.width"
    :options="props.options"
    :series="props.series"
  />
</template>
