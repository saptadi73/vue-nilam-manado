<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import MetricCard from '@/components/MetricCard.vue'
import SectionHeader from '@/components/SectionHeader.vue'
import GlassPanel from '@/components/GlassPanel.vue'
import NotificationStack from '@/components/NotificationStack.vue'
import VueApexCharts from 'vue3-apexcharts'
import { useErpData } from '@/composables/useErpData'
import { mockErpService } from '@/services/mockErpService'
import { fmtCurrency, fmtNumber } from '@/utils/formatters'

const { data, loading, error, refresh } = useErpData((service) => service.getSalesReport())
const farmerFilter = ref('all')
const regionFilter = ref('all')

const showSoModal = ref(false)
const showInvModal = ref(false)
const notices = ref([])
const submitting = reactive({ so: false, inv: false })

const soForm = reactive({ id: '', date: '', buyer: '', farmer: '', qtyKg: null, pricePerKg: null })
const invForm = reactive({ id: '', soId: '', buyer: '', date: '', total: null })

onMounted(refresh)

const months = computed(() => data.value?.months ?? [])
const salesSeries = computed(() => data.value?.salesSeries ?? [])
const salesOrders = computed(() => data.value?.salesOrders ?? [])
const invoices = computed(() => data.value?.invoices ?? [])
const farmers = computed(() => data.value?.farmerPerformance ?? [])
const farmerRegionMap = computed(() =>
  Object.fromEntries(
    farmers.value.map((item) => [item.name, item.address.split(',')[0].replace('Kab. ', '').trim()]),
  ),
)

const regionSummary = computed(() => {
  const summary = {}
  for (const order of salesOrders.value) {
    const region = order.region ?? farmerRegionMap.value[order.farmer] ?? 'Unknown'
    summary[region] = (summary[region] ?? 0) + order.total
  }
  return Object.entries(summary).map(([region, total]) => ({ region, total }))
})

const totalSalesAll = computed(() => salesSeries.value.reduce((acc, item) => acc + item, 0))
const selectedRegionTotal = computed(() => {
  if (regionFilter.value === 'all') return totalSalesAll.value
  const row = regionSummary.value.find((item) => item.region === regionFilter.value)
  return row?.total ?? 0
})
const regionShare = computed(() => {
  if (regionFilter.value === 'all') return 1
  const totalSummary = regionSummary.value.reduce((acc, item) => acc + item.total, 0) || 1
  return selectedRegionTotal.value / totalSummary
})
const salesSeriesFiltered = computed(() => salesSeries.value.map((item) => Math.round(item * regionShare.value)))
const totalSales = computed(() => salesSeriesFiltered.value.reduce((acc, item) => acc + item, 0))

const salesOptions = computed(() => ({
  chart: { toolbar: { show: false }, foreColor: '#cce7df' },
  xaxis: { categories: months.value },
  grid: { borderColor: 'rgba(255,255,255,0.08)' },
  theme: { mode: 'dark' },
  colors: ['#10b981'],
}))
const salesData = computed(() => [{ name: 'Penjualan (IDR)', data: salesSeriesFiltered.value }])

const availableFarmers = computed(() => ['all', ...new Set(salesOrders.value.map((item) => item.farmer))])
const availableRegions = computed(() => ['all', ...regionSummary.value.map((item) => item.region)])
const filteredOrders = computed(() => {
  return salesOrders.value.filter((item) => {
    const region = item.region ?? farmerRegionMap.value[item.farmer] ?? 'Unknown'
    const passFarmer = farmerFilter.value === 'all' || item.farmer === farmerFilter.value
    const passRegion = regionFilter.value === 'all' || region === regionFilter.value
    return passFarmer && passRegion
  })
})
const regionSummaryFiltered = computed(() => {
  if (regionFilter.value === 'all') return regionSummary.value
  return regionSummary.value.filter((item) => item.region === regionFilter.value)
})

const showNotice = (message, type = 'success') => {
  const id = `${Date.now()}-${Math.random()}`
  notices.value = [{ id, message, type }, ...notices.value].slice(0, 4)
  setTimeout(() => {
    notices.value = notices.value.filter((item) => item.id !== id)
  }, 3000)
}

const submitSO = async () => {
  if (!soForm.id || !soForm.date || !soForm.buyer || !soForm.farmer || !soForm.qtyKg || !soForm.pricePerKg) {
    showNotice('Form SO belum lengkap.', 'error')
    return
  }
  submitting.so = true
  try {
    await mockErpService.submitSaleOrder({
      id: soForm.id,
      date: soForm.date,
      buyer: soForm.buyer,
      farmer: soForm.farmer,
      qtyKg: Number(soForm.qtyKg),
      pricePerKg: Number(soForm.pricePerKg),
    })
    showNotice('Sale Order berhasil dibuat.')
    Object.assign(soForm, { id: '', date: '', buyer: '', farmer: '', qtyKg: null, pricePerKg: null })
    showSoModal.value = false
    await refresh()
  } catch (err) {
    showNotice(err instanceof Error ? err.message : 'Gagal membuat SO.', 'error')
  } finally {
    submitting.so = false
  }
}

const submitINV = async () => {
  if (!invForm.id || !invForm.soId || !invForm.buyer || !invForm.date || !invForm.total) {
    showNotice('Form Invoice belum lengkap.', 'error')
    return
  }
  submitting.inv = true
  try {
    await mockErpService.submitInvoice({
      id: invForm.id,
      soId: invForm.soId,
      buyer: invForm.buyer,
      date: invForm.date,
      total: Number(invForm.total),
    })
    showNotice('Invoice berhasil dibuat.')
    Object.assign(invForm, { id: '', soId: '', buyer: '', date: '', total: null })
    showInvModal.value = false
    await refresh()
  } catch (err) {
    showNotice(err instanceof Error ? err.message : 'Gagal membuat invoice.', 'error')
  } finally {
    submitting.inv = false
  }
}

const closeOnOverlay = (event, closer) => {
  if (event.target === event.currentTarget) closer.value = false
}
</script>

<template>
  <section class="space-y-6">
    <NotificationStack :items="notices" />
    <SectionHeader eyebrow="Laporan Penjualan" title="Monitoring Sales Order dan Revenue" />

    <div class="flex flex-wrap items-center gap-3">
      <label class="text-sm text-emerald-100/80">Filter Petani</label>
      <select v-model="farmerFilter" class="field min-w-52">
        <option v-for="farmer in availableFarmers" :key="farmer" :value="farmer">
          {{ farmer === 'all' ? 'Semua Petani' : farmer }}
        </option>
      </select>
      <label class="text-sm text-emerald-100/80">Kota/Kabupaten</label>
      <select v-model="regionFilter" class="field min-w-52">
        <option v-for="region in availableRegions" :key="region" :value="region">
          {{ region === 'all' ? 'Semua Wilayah' : region }}
        </option>
      </select>

      <button class="icon-action" type="button" title="Form SO" @click="showSoModal = true">
        <svg viewBox="0 0 24 24" fill="none"><path d="M7 3h8l5 5v13H7V3Z" stroke="currentColor" stroke-width="1.8"/><path d="M15 3v5h5" stroke="currentColor" stroke-width="1.8"/><path d="M10 12h7M10 16h7" stroke="currentColor" stroke-width="1.8"/></svg>
        <span>SO</span>
      </button>
      <button class="icon-action" type="button" title="Form Invoice" @click="showInvModal = true">
        <svg viewBox="0 0 24 24" fill="none"><rect x="4" y="3" width="16" height="18" rx="2" stroke="currentColor" stroke-width="1.8"/><path d="M8 8h8M8 12h8M8 16h5" stroke="currentColor" stroke-width="1.8"/></svg>
        <span>INV</span>
      </button>

      <button class="btn-primary" type="button" @click="refresh">Refresh Data</button>
    </div>

    <p v-if="loading" class="text-sm text-emerald-100/80">Memuat laporan penjualan...</p>
    <div v-else-if="error" class="rounded-xl border border-red-300/40 bg-red-500/10 px-4 py-3 text-sm text-red-100">
      {{ error }}
    </div>

    <template v-else>
      <div class="grid gap-4 md:grid-cols-3">
        <MetricCard title="Total Penjualan" :value="fmtCurrency(totalSales)" subtitle="Akumulasi 12 bulan" />
        <MetricCard title="Order Aktif" :value="fmtNumber(filteredOrders.length)" subtitle="Status proses/siap kirim" />
        <MetricCard title="Invoice" :value="fmtNumber(invoices.length)" subtitle="Dokumen terbit" />
      </div>

      <GlassPanel title="Grafik Penjualan (IDR / bulan)" tight>
        <VueApexCharts type="bar" height="300" :options="salesOptions" :series="salesData" />
      </GlassPanel>

      <div class="grid gap-4 xl:grid-cols-2">
        <GlassPanel title="Penjualan Berdasarkan Petani dan Tanggal" tight>
          <div class="overflow-auto">
            <table class="w-full min-w-[760px] text-left text-sm text-emerald-50/90">
              <thead class="text-emerald-100">
                <tr>
                  <th class="pb-2">SO</th>
                  <th class="pb-2">Petani</th>
                  <th class="pb-2">Kota/Kab.</th>
                  <th class="pb-2">Tanggal</th>
                  <th class="pb-2">Qty (kg)</th>
                  <th class="pb-2">Total</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="order in filteredOrders" :key="order.id" class="border-t border-white/10">
                  <td class="py-3">{{ order.id }}</td>
                  <td>{{ order.farmer }}</td>
                  <td>{{ order.region ?? farmerRegionMap[order.farmer] ?? 'Unknown' }}</td>
                  <td>{{ order.date }}</td>
                  <td>{{ fmtNumber(order.qtyKg) }}</td>
                  <td>{{ fmtCurrency(order.total) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </GlassPanel>

        <GlassPanel title="Total Penjualan per Kota/Kabupaten" tight>
          <ul class="space-y-2 text-sm text-emerald-50/90">
            <li v-for="entry in regionSummaryFiltered" :key="entry.region" class="flex justify-between rounded-lg bg-black/20 px-3 py-2">
              <span>{{ entry.region }}</span>
              <strong>{{ fmtCurrency(entry.total) }}</strong>
            </li>
          </ul>
        </GlassPanel>
      </div>
    </template>

    <div v-if="showSoModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4" @click="(e) => closeOnOverlay(e, showSoModal)">
      <div class="w-full max-w-xl rounded-2xl border border-white/10 bg-[#0a2f29] p-5">
        <h3 class="text-lg font-semibold text-white">Form Sale Order (SO)</h3>
        <form class="mt-4 grid gap-3 md:grid-cols-2" @submit.prevent="submitSO">
          <input v-model="soForm.id" class="field" placeholder="Nomor SO" />
          <input v-model="soForm.date" class="field" type="date" />
          <input v-model="soForm.buyer" class="field" placeholder="Customer" />
          <input v-model="soForm.farmer" class="field" placeholder="Petani" />
          <input v-model.number="soForm.qtyKg" class="field" placeholder="Qty (kg)" type="number" />
          <input v-model.number="soForm.pricePerKg" class="field" placeholder="Harga per Kg" type="number" />
          <div class="md:col-span-2 flex justify-end gap-2">
            <button type="button" class="btn-muted" @click="showSoModal = false">Batal</button>
            <button type="submit" class="btn-primary" :disabled="submitting.so">{{ submitting.so ? 'Menyimpan...' : 'Simpan SO' }}</button>
          </div>
        </form>
      </div>
    </div>

    <div v-if="showInvModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4" @click="(e) => closeOnOverlay(e, showInvModal)">
      <div class="w-full max-w-xl rounded-2xl border border-white/10 bg-[#0a2f29] p-5">
        <h3 class="text-lg font-semibold text-white">Form Invoice (INV)</h3>
        <form class="mt-4 grid gap-3 md:grid-cols-2" @submit.prevent="submitINV">
          <input v-model="invForm.id" class="field" placeholder="Nomor Invoice" />
          <input v-model="invForm.date" class="field" type="date" />
          <input v-model="invForm.soId" class="field" placeholder="Referensi SO" />
          <input v-model="invForm.buyer" class="field" placeholder="Customer" />
          <input v-model.number="invForm.total" class="field md:col-span-2" placeholder="Total Invoice" type="number" />
          <div class="md:col-span-2 flex justify-end gap-2">
            <button type="button" class="btn-muted" @click="showInvModal = false">Batal</button>
            <button type="submit" class="btn-primary" :disabled="submitting.inv">{{ submitting.inv ? 'Menyimpan...' : 'Simpan Invoice' }}</button>
          </div>
        </form>
      </div>
    </div>
  </section>
</template>
