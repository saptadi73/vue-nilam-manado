<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import ApexChartSafe from '@/components/ApexChartSafe.vue'
import SectionHeader from '@/components/SectionHeader.vue'
import GlassPanel from '@/components/GlassPanel.vue'
import MetricCard from '@/components/MetricCard.vue'
import { realErpService } from '@/services/realErpService'
import { fmtCurrency, fmtNumber } from '@/utils/formatters'

const loading = ref(false)
const error = ref('')
const farmers = ref([])

const filters = reactive({
  tanggal_mulai: '',
  tanggal_akhir: '',
  petani_id: '',
})

const plantingMonthly = ref([])
const oilMonthly = ref([])
const salesByFarmerRegency = ref([])
const salesVsExpensesMonthly = ref([])
const farmerNetProfit = ref([])

const fmtPercent = (value) => `${Number(value ?? 0).toFixed(2)}%`

const buildQuery = (includeFarmer = true) => {
  const query = {}
  if (filters.tanggal_mulai) query.tanggal_mulai = filters.tanggal_mulai
  if (filters.tanggal_akhir) query.tanggal_akhir = filters.tanggal_akhir
  if (includeFarmer && filters.petani_id) query.petani_id = filters.petani_id
  return query
}

const fetchDashboard = async () => {
  loading.value = true
  error.value = ''

  try {
    const sharedQuery = buildQuery(false)
    const farmerQuery = buildQuery(true)

    const [
      farmersRes,
      plantingMonthlyRes,
      oilMonthlyRes,
      salesByFarmerRegencyRes,
      salesVsExpensesMonthlyRes,
      farmerNetProfitRes,
    ] = await Promise.all([
      realErpService.getFarmers(),
      realErpService.getDashboardPlantingProductionsMonthly(farmerQuery),
      realErpService.getDashboardOilProductionsMonthly(farmerQuery),
      realErpService.getDashboardSalesByFarmerRegency(sharedQuery),
      realErpService.getDashboardSalesVsExpensesMonthly(farmerQuery),
      realErpService.getDashboardFarmerNetProfit(sharedQuery),
    ])

    farmers.value = Array.isArray(farmersRes) ? farmersRes : []
    plantingMonthly.value = Array.isArray(plantingMonthlyRes) ? plantingMonthlyRes : []
    oilMonthly.value = Array.isArray(oilMonthlyRes) ? oilMonthlyRes : []
    salesByFarmerRegency.value = Array.isArray(salesByFarmerRegencyRes) ? salesByFarmerRegencyRes : []
    salesVsExpensesMonthly.value = Array.isArray(salesVsExpensesMonthlyRes) ? salesVsExpensesMonthlyRes : []
    farmerNetProfit.value = Array.isArray(farmerNetProfitRes) ? farmerNetProfitRes : []
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Gagal memuat dashboard real API.'
  } finally {
    loading.value = false
  }
}

const resetFilters = async () => {
  filters.tanggal_mulai = ''
  filters.tanggal_akhir = ''
  filters.petani_id = ''
  await fetchDashboard()
}

onMounted(fetchDashboard)

const monthLabels = computed(() => salesVsExpensesMonthly.value.map((item) => item.bulan))

const totalSalesMonthly = computed(() => salesVsExpensesMonthly.value.reduce((acc, item) => acc + Number(item?.total_penjualan ?? 0), 0))
const totalSalesByRegency = computed(() => salesByFarmerRegency.value.reduce((acc, item) => acc + Number(item?.total_penjualan ?? 0), 0))
const totalSales = computed(() => (filters.petani_id ? totalSalesMonthly.value : totalSalesByRegency.value))
const totalSalesSubtitle = computed(() => (filters.petani_id ? 'Agregat petani terpilih' : 'Agregat per kabupaten'))
const totalExpenses = computed(() => salesVsExpensesMonthly.value.reduce((acc, item) => acc + Number(item?.total_expense ?? 0), 0))
const totalNetProfit = computed(() => salesVsExpensesMonthly.value.reduce((acc, item) => acc + Number(item?.net_profit ?? 0), 0))

const totalPlantingProductions = computed(() => plantingMonthly.value.reduce((acc, item) => acc + Number(item?.jumlah_produksi ?? 0), 0))
const totalOilProductions = computed(() => oilMonthly.value.reduce((acc, item) => acc + Number(item?.jumlah_produksi ?? 0), 0))

const salesVsExpenseChartOptions = computed(() => ({
  chart: { type: 'line', toolbar: { show: false }, foreColor: '#d1f7ea' },
  stroke: { width: [0, 0, 3], curve: 'smooth' },
  plotOptions: { bar: { borderRadius: 6, columnWidth: '45%' } },
  xaxis: { categories: monthLabels.value },
  yaxis: [
    {
      labels: {
        formatter: (value) => fmtNumber(value),
      },
    },
    {
      opposite: true,
      labels: {
        formatter: (value) => fmtNumber(value),
      },
    },
  ],
  grid: { borderColor: 'rgba(255, 255, 255, 0.1)' },
  legend: { position: 'top' },
  theme: { mode: 'dark' },
  colors: ['#22c55e', '#ef4444', '#38bdf8'],
}))

const salesVsExpenseChartSeries = computed(() => [
  {
    name: 'Penjualan',
    type: 'column',
    data: salesVsExpensesMonthly.value.map((item) => Number(item?.total_penjualan ?? 0)),
  },
  {
    name: 'Expense',
    type: 'column',
    data: salesVsExpensesMonthly.value.map((item) => Number(item?.total_expense ?? 0)),
  },
  {
    name: 'Net Profit',
    type: 'line',
    data: salesVsExpensesMonthly.value.map((item) => Number(item?.net_profit ?? 0)),
  },
])

const regencyPieChartOptions = computed(() => ({
  labels: salesByFarmerRegency.value.map((item) => item.kabupaten_kota || item.kabupaten_kota_kode || 'Unknown'),
  chart: { foreColor: '#d1f7ea' },
  legend: { position: 'bottom' },
  dataLabels: {
    formatter: (value) => `${value.toFixed(1)}%`,
  },
  theme: { mode: 'dark' },
  colors: ['#14b8a6', '#22c55e', '#eab308', '#f97316', '#f43f5e', '#3b82f6', '#8b5cf6'],
}))

const regencyPieChartSeries = computed(() => salesByFarmerRegency.value.map((item) => Number(item?.total_penjualan ?? 0)))

const regencySalesBarOptions = computed(() => ({
  chart: { type: 'bar', toolbar: { show: false }, foreColor: '#d1f7ea' },
  plotOptions: { bar: { horizontal: true, borderRadius: 4, barHeight: '58%' } },
  xaxis: {
    categories: salesByFarmerRegency.value.map((item) => item.kabupaten_kota || item.kabupaten_kota_kode || 'Tanpa Wilayah'),
    labels: { formatter: (value) => fmtNumber(value) },
  },
  yaxis: { labels: { maxWidth: 180 } },
  dataLabels: { enabled: false },
  tooltip: { y: { formatter: (value) => fmtCurrency(value) } },
  grid: { borderColor: 'rgba(255, 255, 255, 0.1)' },
  theme: { mode: 'dark' },
  colors: ['#22c55e'],
}))

const regencySalesBarSeries = computed(() => [
  {
    name: 'Total Penjualan',
    data: salesByFarmerRegency.value.map((item) => Number(item?.total_penjualan ?? 0)),
  },
])

const productionTrendOptions = computed(() => ({
  chart: { type: 'line', toolbar: { show: false }, foreColor: '#d1f7ea' },
  stroke: { curve: 'smooth', width: 3 },
  xaxis: { categories: plantingMonthly.value.map((item) => item.bulan) },
  grid: { borderColor: 'rgba(255, 255, 255, 0.1)' },
  legend: { position: 'top' },
  theme: { mode: 'dark' },
  colors: ['#0ea5e9', '#f59e0b'],
}))

const productionTrendSeries = computed(() => [
  {
    name: 'Produksi Tanam (Aktual Kering)',
    data: plantingMonthly.value.map((item) => Number(item?.total_aktual_hasil_kering ?? 0)),
  },
  {
    name: 'Produksi Minyak (Aktual)',
    data: oilMonthly.value.map((item) => Number(item?.total_aktual_hasil_minyak ?? 0)),
  },
])

</script>

<template>
  <section class="space-y-6">
    <SectionHeader
      eyebrow="Dashboard Real API"
      title="Analitik Nilam Berbasis Endpoint Backend"
      description="Semua chart di halaman ini mengambil data langsung dari endpoint dashboard pada FRONTEND_API.md."
    />

    <GlassPanel tight>
      <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <input v-model="filters.tanggal_mulai" type="date" class="field" />
        <input v-model="filters.tanggal_akhir" type="date" class="field" />
        <select v-model="filters.petani_id" class="field">
          <option value="">Semua Petani</option>
          <option v-for="farmer in farmers" :key="farmer.id" :value="farmer.id">
            {{ farmer.nama }}
          </option>
        </select>
        <button type="button" class="btn-primary" @click="fetchDashboard">Terapkan Filter</button>
        <button type="button" class="btn-muted" @click="resetFilters">Reset Filter</button>
      </div>
    </GlassPanel>

    <p v-if="loading" class="text-sm text-emerald-100/80">Memuat data dashboard real API...</p>
    <div v-else-if="error" class="rounded-xl border border-red-300/40 bg-red-500/10 px-4 py-3 text-sm text-red-100">
      {{ error }}
      <button type="button" class="ml-3 underline" @click="fetchDashboard">Muat ulang</button>
    </div>

    <template v-else>
      <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard title="Total Penjualan" :value="fmtCurrency(totalSales)" :subtitle="totalSalesSubtitle" />
        <MetricCard title="Total Expense" :value="fmtCurrency(totalExpenses)" subtitle="Agregat bulanan" />
        <MetricCard title="Net Profit" :value="fmtCurrency(totalNetProfit)" subtitle="Penjualan - Expense" />
        <MetricCard title="Produksi Tanam" :value="fmtNumber(totalPlantingProductions)" subtitle="Jumlah batch" />
        <MetricCard title="Produksi Minyak" :value="fmtNumber(totalOilProductions)" subtitle="Jumlah batch" />
      </div>

      <div class="grid gap-4 xl:grid-cols-2">
        <GlassPanel title="Penjualan vs Expense per Bulan (Mixed Bar + Line)" tight>
          <ApexChartSafe type="line" height="320" :options="salesVsExpenseChartOptions" :series="salesVsExpenseChartSeries" />
        </GlassPanel>

        <GlassPanel title="Distribusi Penjualan per Kabupaten (Pie Chart)" tight>
          <ApexChartSafe type="pie" height="320" :options="regencyPieChartOptions" :series="regencyPieChartSeries" />
        </GlassPanel>
      </div>

      <div class="grid gap-4 xl:grid-cols-2">
        <GlassPanel title="Total Penjualan Petani per Kabupaten (Bar Chart)" tight>
          <ApexChartSafe type="bar" height="320" :options="regencySalesBarOptions" :series="regencySalesBarSeries" />
        </GlassPanel>

        <GlassPanel title="Tren Produksi Tanam vs Minyak (Line Chart)" tight>
          <ApexChartSafe type="line" height="320" :options="productionTrendOptions" :series="productionTrendSeries" />
        </GlassPanel>
      </div>

      <GlassPanel title="Ranking Net Profit Petani" tight>
        <div class="overflow-auto">
          <table class="w-full min-w-155 text-left text-sm text-emerald-50/90">
            <thead class="text-emerald-100">
              <tr>
                <th class="pb-2">Petani</th>
                <th class="pb-2">Penjualan</th>
                <th class="pb-2">Expense</th>
                <th class="pb-2">Net Profit</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in farmerNetProfit" :key="row?.petani?.id || row?.petani?.nama" class="border-t border-white/10">
                <td class="py-3">{{ row?.petani?.nama || 'Tanpa Nama' }}</td>
                <td>{{ fmtCurrency(Number(row?.total_penjualan ?? 0)) }}</td>
                <td>{{ fmtCurrency(Number(row?.total_expense ?? 0)) }}</td>
                <td>{{ fmtCurrency(Number(row?.net_profit ?? 0)) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </GlassPanel>

      <GlassPanel title="Distribusi Penjualan per Kabupaten" tight>
        <div class="overflow-auto">
          <table class="w-full min-w-185 text-left text-sm text-emerald-50/90">
            <thead class="text-emerald-100">
              <tr>
                <th class="pb-2">Kabupaten/Kota</th>
                <th class="pb-2">Total Penjualan</th>
                <th class="pb-2">Transaksi</th>
                <th class="pb-2">Jumlah Petani</th>
                <th class="pb-2">Persentase</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in salesByFarmerRegency" :key="row.kabupaten_kota_kode" class="border-t border-white/10">
                <td class="py-3">{{ row.kabupaten_kota || row.kabupaten_kota_kode }}</td>
                <td>{{ fmtCurrency(Number(row.total_penjualan ?? 0)) }}</td>
                <td>{{ fmtNumber(Number(row.jumlah_transaksi ?? 0)) }}</td>
                <td>{{ fmtNumber(Number(row.jumlah_petani ?? 0)) }}</td>
                <td>{{ fmtPercent(row.persentase) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </GlassPanel>
    </template>
  </section>
</template>
