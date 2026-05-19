<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import SectionHeader from '@/components/SectionHeader.vue'
import GlassPanel from '@/components/GlassPanel.vue'
import VueApexCharts from 'vue3-apexcharts'
import { useErpData } from '@/composables/useErpData'

const { data, loading, error, refresh } = useErpData((service) => service.getQualityReport())
const selectedRegion = ref('all')
const selectedFarmer = ref('all')

onMounted(refresh)

const months = computed(() => data.value?.months ?? [])
const productionSeries = computed(() => data.value?.productionSeries ?? { redamanPct: [] })
const qualityByRegion = computed(() => data.value?.qualityByRegion ?? [])
const farmers = computed(() => data.value?.farmerPerformance ?? [])
const paSeriesByFarmer = computed(() => data.value?.paPatchouliAlcoholSeriesByFarmer ?? {})

const farmerRegionMap = computed(() =>
  Object.fromEntries(
    farmers.value.map((item) => [item.name, item.address.split(',')[0].replace('Kab. ', '').trim()]),
  ),
)

const availableRegions = computed(() => [
  'all',
  ...new Set([
    ...qualityByRegion.value.map((item) => item.region),
    ...farmers.value.map((item) => item.address.split(',')[0].replace('Kab. ', '').trim()),
  ]),
])

const availableFarmers = computed(() => {
  const names = farmers.value
    .map((item) => item.name)
    .filter((name) => {
      if (selectedRegion.value === 'all') return true
      return farmerRegionMap.value[name] === selectedRegion.value
    })
  return ['all', ...names]
})

const filteredRegionRows = computed(() => {
  if (selectedRegion.value === 'all') return qualityByRegion.value
  return qualityByRegion.value.filter((item) => item.region === selectedRegion.value)
})

watch(qualityByRegion, (rows) => {
  if (!rows.some((item) => item.region === selectedRegion.value)) {
    selectedRegion.value = 'all'
  }
})

watch(availableFarmers, (names) => {
  if (!names.includes(selectedFarmer.value)) {
    selectedFarmer.value = 'all'
  }
})

const selectedFarmersForPa = computed(() =>
  farmers.value
    .map((item) => item.name)
    .filter((name) => {
      const passRegion = selectedRegion.value === 'all' || farmerRegionMap.value[name] === selectedRegion.value
      const passFarmer = selectedFarmer.value === 'all' || name === selectedFarmer.value
      return passRegion && passFarmer && Array.isArray(paSeriesByFarmer.value[name])
    }),
)

const paMonthlyAverage = computed(() => {
  if (!selectedFarmersForPa.value.length) return []

  return months.value.map((_, monthIndex) => {
    const values = selectedFarmersForPa.value
      .map((name) => paSeriesByFarmer.value[name][monthIndex])
      .filter((value) => typeof value === 'number')

    if (!values.length) return null

    const avg = values.reduce((acc, item) => acc + item, 0) / values.length
    return Number(avg.toFixed(2))
  })
})

const paValues = computed(() => paMonthlyAverage.value.filter((value) => typeof value === 'number'))
const paAvg = computed(() => {
  if (!paValues.value.length) return 0
  return Number((paValues.value.reduce((acc, item) => acc + item, 0) / paValues.value.length).toFixed(2))
})
const paMin = computed(() => (paValues.value.length ? Math.min(...paValues.value) : 0))
const paMax = computed(() => (paValues.value.length ? Math.max(...paValues.value) : 0))

const regionOptions = computed(() => ({
  chart: { toolbar: { show: false }, foreColor: '#cce7df' },
  xaxis: { categories: filteredRegionRows.value.map((item) => item.region) },
  theme: { mode: 'dark' },
  colors: ['#22c55e', '#f59e0b'],
  grid: { borderColor: 'rgba(255,255,255,0.08)' },
}))

const regionSeries = computed(() => [
  { name: 'Redaman Rata-rata (%)', data: filteredRegionRows.value.map((item) => item.avgRedaman) },
  { name: 'Target Tercapai (%)', data: filteredRegionRows.value.map((item) => item.targetPct) },
])

const timelineOptions = computed(() => ({
  chart: { toolbar: { show: false }, foreColor: '#cce7df' },
  xaxis: { categories: months.value },
  stroke: { curve: 'smooth', width: 3 },
  theme: { mode: 'dark' },
  colors: ['#60a5fa', '#10b981'],
  grid: { borderColor: 'rgba(255,255,255,0.08)' },
}))

const timelineSeries = computed(() => [
  { name: 'Redaman (%)', data: productionSeries.value.redamanPct },
  { name: 'Target Produksi (%)', data: [86, 86.3, 87, 87.5, 88, 88.4, 88.9, 89.2, 89.5, 90, 90.2, 90.7] },
])

const paOptions = computed(() => ({
  chart: { toolbar: { show: false }, foreColor: '#cce7df' },
  xaxis: { categories: months.value },
  yaxis: {
    min: 31,
    max: 38,
    tickAmount: 7,
    labels: {
      formatter: (value) => `${value.toFixed(1)}%`,
    },
  },
  stroke: { curve: 'smooth', width: 3 },
  dataLabels: { enabled: false },
  theme: { mode: 'dark' },
  colors: ['#f97316'],
  grid: { borderColor: 'rgba(255,255,255,0.08)' },
}))

const paChartSeries = computed(() => [
  {
    name: 'PA Patchouli Alcohol (%)',
    data: paMonthlyAverage.value,
  },
])
</script>

<template>
  <section class="space-y-6">
    <SectionHeader eyebrow="Laporan Kualitas" title="Mutu Redaman, Target, dan PA Patchouli Alcohol" />

    <div class="flex flex-wrap items-center gap-3">
      <label class="text-sm text-emerald-100/80">Filter Kota/Kabupaten</label>
      <select v-model="selectedRegion" class="field min-w-52">
        <option v-for="region in availableRegions" :key="region" :value="region">
          {{ region === 'all' ? 'Semua Wilayah' : region }}
        </option>
      </select>
      <label class="text-sm text-emerald-100/80">Filter Produksi Petani</label>
      <select v-model="selectedFarmer" class="field min-w-52">
        <option v-for="farmer in availableFarmers" :key="farmer" :value="farmer">
          {{ farmer === 'all' ? 'Semua Petani' : farmer }}
        </option>
      </select>
      <button class="btn-primary" type="button" @click="refresh">Refresh Data</button>
    </div>

    <p v-if="loading" class="text-sm text-emerald-100/80">Memuat laporan kualitas...</p>
    <div v-else-if="error" class="rounded-xl border border-red-300/40 bg-red-500/10 px-4 py-3 text-sm text-red-100">
      {{ error }}
    </div>

    <template v-else>
      <GlassPanel title="Kualitas berdasarkan Kota/Kabupaten" tight>
        <VueApexCharts type="bar" height="300" :options="regionOptions" :series="regionSeries" />
      </GlassPanel>

      <GlassPanel title="Tren Kualitas vs Target (Berdasarkan Tanggal/Bulan)" tight>
        <VueApexCharts type="line" height="300" :options="timelineOptions" :series="timelineSeries" />
      </GlassPanel>

      <GlassPanel title="Laporan Pengukuran Kadar PA Patchouli Alcohol (%) - Rata-rata Bulan ke Bulan" tight>
        <div class="mb-4 grid gap-3 md:grid-cols-3">
          <div class="rounded-lg bg-black/20 px-3 py-3 text-sm text-emerald-50/90">
            <p class="text-xs text-emerald-100/70">Rata-rata PA</p>
            <p class="mt-1 text-lg font-semibold">{{ paAvg.toFixed(2) }}%</p>
          </div>
          <div class="rounded-lg bg-black/20 px-3 py-3 text-sm text-emerald-50/90">
            <p class="text-xs text-emerald-100/70">PA Minimum</p>
            <p class="mt-1 text-lg font-semibold">{{ paMin.toFixed(2) }}%</p>
          </div>
          <div class="rounded-lg bg-black/20 px-3 py-3 text-sm text-emerald-50/90">
            <p class="text-xs text-emerald-100/70">PA Maksimum</p>
            <p class="mt-1 text-lg font-semibold">{{ paMax.toFixed(2) }}%</p>
          </div>
        </div>

        <VueApexCharts type="line" height="320" :options="paOptions" :series="paChartSeries" />
      </GlassPanel>

      <GlassPanel title="Ringkasan per Petani" tight>
        <ul class="space-y-2 text-sm text-emerald-50/90">
          <li class="flex justify-between rounded-lg bg-black/20 px-3 py-2">
            <span>Rahman Siregar</span><strong>Redaman 89.6% | Target 94%</strong>
          </li>
          <li class="flex justify-between rounded-lg bg-black/20 px-3 py-2">
            <span>Murniati B.</span><strong>Redaman 87.2% | Target 90%</strong>
          </li>
          <li class="flex justify-between rounded-lg bg-black/20 px-3 py-2">
            <span>Deni Maulana</span><strong>Redaman 90.8% | Target 96%</strong>
          </li>
          <li class="flex justify-between rounded-lg bg-black/20 px-3 py-2">
            <span>Sulastri Dewi</span><strong>Redaman 88.0% | Target 91%</strong>
          </li>
        </ul>
      </GlassPanel>
    </template>
  </section>
</template>
