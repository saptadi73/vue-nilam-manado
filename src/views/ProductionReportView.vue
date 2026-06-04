<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import MetricCard from '@/components/MetricCard.vue'
import SectionHeader from '@/components/SectionHeader.vue'
import GlassPanel from '@/components/GlassPanel.vue'
import ApexChartSafe from '@/components/ApexChartSafe.vue'
import { useErpData } from '@/composables/useErpData'
import { fmtNumber } from '@/utils/formatters'

const { data, loading, error, refresh } = useErpData((service) => service.getProductionReport())

const monthStart = ref(0)
const monthEnd = ref(11)
const regionFilter = ref('all')

onMounted(refresh)

watch(monthStart, (value) => {
  if (value > monthEnd.value) monthEnd.value = value
})

watch(monthEnd, (value) => {
  if (value < monthStart.value) monthStart.value = value
})

const months = computed(() => data.value?.months ?? [])
const productionSeries = computed(() => data.value?.productionSeries ?? { produksiKg: [], tanamHa: [], redamanPct: [] })
const productionSummary = computed(() => data.value?.productionSummary ?? { totalRangeKg: 0, byFarmerKg: {}, byRegionKg: {} })
const farmers = computed(() => data.value?.farmerPerformance ?? [])
const farmerRegionMap = computed(() =>
  Object.fromEntries(
    farmers.value.map((item) => [item.name, item.address.split(',')[0].replace('Kab. ', '').trim()]),
  ),
)
const availableRegions = computed(() => ['all', ...Object.keys(productionSummary.value.byRegionKg ?? {})])
const regionShare = computed(() => {
  if (regionFilter.value === 'all') return 1
  const regionValue = productionSummary.value.byRegionKg?.[regionFilter.value] ?? 0
  const total = productionSummary.value.totalRangeKg || 1
  return regionValue / total
})

const filteredMonths = computed(() => months.value.slice(monthStart.value, monthEnd.value + 1))
const productionBarData = computed(() =>
  productionSeries.value.produksiKg
    .slice(monthStart.value, monthEnd.value + 1)
    .map((item) => Math.round(item * regionShare.value)),
)
const plantingLineData = computed(() =>
  productionSeries.value.tanamHa
    .slice(monthStart.value, monthEnd.value + 1)
    .map((item) => Number((item * regionShare.value).toFixed(2))),
)
const absorbAreaData = computed(() => productionSeries.value.redamanPct.slice(monthStart.value, monthEnd.value + 1))
const filteredTotalRangeKg = computed(() => {
  if (regionFilter.value === 'all') return productionSummary.value.totalRangeKg
  return productionSummary.value.byRegionKg?.[regionFilter.value] ?? 0
})

const barOptions = computed(() => ({
  chart: { toolbar: { show: false }, foreColor: '#cce7df' },
  xaxis: { categories: filteredMonths.value },
  grid: { borderColor: 'rgba(255,255,255,0.08)' },
  theme: { mode: 'dark' },
  colors: ['#22c55e'],
}))

const lineOptions = computed(() => ({
  chart: { toolbar: { show: false }, foreColor: '#cce7df' },
  xaxis: { categories: filteredMonths.value },
  stroke: { curve: 'smooth', width: 3 },
  grid: { borderColor: 'rgba(255,255,255,0.08)' },
  theme: { mode: 'dark' },
  colors: ['#38bdf8'],
}))

const areaOptions = computed(() => ({
  chart: { toolbar: { show: false }, foreColor: '#cce7df' },
  xaxis: { categories: filteredMonths.value },
  stroke: { curve: 'smooth', width: 3 },
  dataLabels: { enabled: false },
  fill: { type: 'gradient', gradient: { opacityFrom: 0.5, opacityTo: 0.05 } },
  grid: { borderColor: 'rgba(255,255,255,0.08)' },
  theme: { mode: 'dark' },
  colors: ['#f59e0b'],
}))

const productionBar = computed(() => [{ name: 'Produksi (kg)', data: productionBarData.value }])
const plantingLine = computed(() => [{ name: 'Tanam (ha)', data: plantingLineData.value }])
const absorbArea = computed(() => [{ name: 'Redaman (%)', data: absorbAreaData.value }])

const totalByFarmer = computed(() =>
  Object.entries(productionSummary.value.byFarmerKg ?? {}).filter(([name]) => {
    if (regionFilter.value === 'all') return true
    return farmerRegionMap.value[name] === regionFilter.value
  }),
)
const totalByRegion = computed(() =>
  Object.entries(productionSummary.value.byRegionKg ?? {}).filter(([region]) => {
    if (regionFilter.value === 'all') return true
    return region === regionFilter.value
  }),
)

const avgRedaman = computed(() => {
  if (!absorbAreaData.value.length) return 0
  const total = absorbAreaData.value.reduce((a, b) => a + b, 0)
  return (total / absorbAreaData.value.length).toFixed(1)
})
</script>

<template>
  <section class="space-y-6">
    <SectionHeader eyebrow="Laporan Produksi" title="Produksi, Tanam, dan Redaman" />

    <div class="flex flex-wrap items-center gap-3">
      <label class="text-sm text-emerald-100/80">Dari Bulan</label>
      <select v-model.number="monthStart" class="field min-w-36">
        <option v-for="(m, idx) in months" :key="`start-${m}`" :value="idx">{{ m }}</option>
      </select>
      <label class="text-sm text-emerald-100/80">Sampai</label>
      <select v-model.number="monthEnd" class="field min-w-36">
        <option v-for="(m, idx) in months" :key="`end-${m}`" :value="idx">{{ m }}</option>
      </select>
      <label class="text-sm text-emerald-100/80">Kota/Kabupaten</label>
      <select v-model="regionFilter" class="field min-w-48">
        <option v-for="region in availableRegions" :key="region" :value="region">
          {{ region === 'all' ? 'Semua Wilayah' : region }}
        </option>
      </select>
      <button class="btn-primary" type="button" @click="refresh">Refresh Data</button>
    </div>

    <p v-if="loading" class="text-sm text-emerald-100/80">Memuat laporan produksi...</p>
    <div v-else-if="error" class="rounded-xl border border-red-300/40 bg-red-500/10 px-4 py-3 text-sm text-red-100">
      {{ error }}
    </div>

    <template v-else>
      <div class="grid gap-4 md:grid-cols-3">
        <MetricCard title="Total Produksi Rentang Waktu" :value="`${fmtNumber(filteredTotalRangeKg)} kg`" />
        <MetricCard title="Rata-rata Redaman" :value="`${avgRedaman}%`" />
        <MetricCard title="Total Luas Tanam" :value="`${plantingLineData[plantingLineData.length - 1] ?? 0} ha`" subtitle="Posisi bulan terakhir" />
      </div>

      <div class="grid gap-5 lg:grid-cols-2">
        <GlassPanel title="Grafik Produksi (kg / bulan)" tight>
          <ApexChartSafe type="bar" height="280" :options="barOptions" :series="productionBar" />
        </GlassPanel>
        <GlassPanel title="Grafik Tanam (ha / bulan)" tight>
          <ApexChartSafe type="line" height="280" :options="lineOptions" :series="plantingLine" />
        </GlassPanel>
      </div>

      <GlassPanel title="Rata-rata Redaman Tercapai (%)" tight>
        <ApexChartSafe type="area" height="280" :options="areaOptions" :series="absorbArea" />
      </GlassPanel>

      <div class="grid gap-4 lg:grid-cols-2">
        <GlassPanel title="Total Produksi per Petani" tight>
          <ul class="space-y-2 text-sm text-emerald-50/90">
            <li v-for="entry in totalByFarmer" :key="entry[0]" class="flex justify-between rounded-lg bg-black/20 px-3 py-2">
              <span>{{ entry[0] }}</span><strong>{{ fmtNumber(entry[1]) }} kg</strong>
            </li>
          </ul>
        </GlassPanel>
        <GlassPanel title="Total Produksi per Kota/Kabupaten" tight>
          <ul class="space-y-2 text-sm text-emerald-50/90">
            <li v-for="entry in totalByRegion" :key="entry[0]" class="flex justify-between rounded-lg bg-black/20 px-3 py-2">
              <span>{{ entry[0] }}</span><strong>{{ fmtNumber(entry[1]) }} kg</strong>
            </li>
          </ul>
        </GlassPanel>
      </div>
    </template>
  </section>
</template>
