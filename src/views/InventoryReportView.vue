<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import MetricCard from '@/components/MetricCard.vue'
import SectionHeader from '@/components/SectionHeader.vue'
import GlassPanel from '@/components/GlassPanel.vue'
import NotificationStack from '@/components/NotificationStack.vue'
import ApexChartSafe from '@/components/ApexChartSafe.vue'
import { useErpData } from '@/composables/useErpData'
import { mockErpService } from '@/services/mockErpService'
import { fmtNumber } from '@/utils/formatters'

const { data, loading, error, refresh } = useErpData((service) => service.getInventoryReport())

const showDoModal = ref(false)
const showRoModal = ref(false)
const notices = ref([])
const submitting = reactive({ do: false, ro: false })

const doForm = reactive({ id: '', date: '', customer: '', mode: '', qtyKg: null, address: '' })
const roForm = reactive({ id: '', date: '', farmer: '', quality: '', qtyKg: null, destination: 'Gudang Utama Aceh' })

onMounted(refresh)

const inventoryFlow = computed(() => data.value?.inventoryFlow ?? [])
const transferNotes = computed(() => data.value?.transferNotes ?? [])

const inventoryOptions = computed(() => ({
  chart: { toolbar: { show: false }, foreColor: '#cce7df' },
  xaxis: { categories: inventoryFlow.value.map((item) => item.stage) },
  grid: { borderColor: 'rgba(255,255,255,0.08)' },
  theme: { mode: 'dark' },
  colors: ['#34d399'],
  plotOptions: { bar: { distributed: true, borderRadius: 6 } },
}))

const inventorySeries = computed(() => [{ name: 'Qty (kg)', data: inventoryFlow.value.map((item) => item.qtyKg) }])

const received = computed(() => inventoryFlow.value[0]?.qtyKg ?? 0)
const sold = computed(() => inventoryFlow.value[inventoryFlow.value.length - 1]?.qtyKg ?? 0)
const movement = computed(() => received.value - sold.value)

const showNotice = (message, type = 'success') => {
  const id = `${Date.now()}-${Math.random()}`
  notices.value = [{ id, message, type }, ...notices.value].slice(0, 4)
  setTimeout(() => {
    notices.value = notices.value.filter((item) => item.id !== id)
  }, 3000)
}

const submitDO = async () => {
  if (!doForm.id || !doForm.date || !doForm.customer || !doForm.mode || !doForm.qtyKg || !doForm.address) {
    showNotice('Form DO belum lengkap.', 'error')
    return
  }
  submitting.do = true
  try {
    await mockErpService.submitDeliveryOrder({
      id: doForm.id,
      date: doForm.date,
      customer: doForm.customer,
      mode: doForm.mode,
      qtyKg: Number(doForm.qtyKg),
      address: doForm.address,
    })
    showNotice('Delivery Order berhasil dibuat.')
    Object.assign(doForm, { id: '', date: '', customer: '', mode: '', qtyKg: null, address: '' })
    showDoModal.value = false
    await refresh()
  } catch (err) {
    showNotice(err instanceof Error ? err.message : 'Gagal membuat DO.', 'error')
  } finally {
    submitting.do = false
  }
}

const submitRO = async () => {
  if (!roForm.id || !roForm.date || !roForm.farmer || !roForm.quality || !roForm.qtyKg) {
    showNotice('Form RO belum lengkap.', 'error')
    return
  }
  submitting.ro = true
  try {
    await mockErpService.submitReceiptOrder({
      id: roForm.id,
      date: roForm.date,
      farmer: roForm.farmer,
      quality: roForm.quality,
      qtyKg: Number(roForm.qtyKg),
      destination: roForm.destination,
    })
    showNotice('Receipt Order minyak nilam berhasil dicatat.')
    Object.assign(roForm, { id: '', date: '', farmer: '', quality: '', qtyKg: null, destination: 'Gudang Utama Aceh' })
    showRoModal.value = false
    await refresh()
  } catch (err) {
    showNotice(err instanceof Error ? err.message : 'Gagal membuat RO.', 'error')
  } finally {
    submitting.ro = false
  }
}

const closeOnOverlay = (event, closer) => {
  if (event.target === event.currentTarget) closer.value = false
}
</script>

<template>
  <section class="space-y-6">
    <NotificationStack :items="notices" />
    <SectionHeader eyebrow="Laporan Inventory" title="Pergerakan Stok Minyak Nilam" />

    <div class="flex flex-wrap items-center gap-3">
      <button class="icon-action" type="button" title="Form Delivery Order" @click="showDoModal = true">
        <svg viewBox="0 0 24 24" fill="none"><path d="M3 7h12v10H3V7Zm12 3h3l3 3v4h-6v-7Z" stroke="currentColor" stroke-width="1.8"/><circle cx="7" cy="18" r="2" stroke="currentColor" stroke-width="1.8"/><circle cx="18" cy="18" r="2" stroke="currentColor" stroke-width="1.8"/></svg>
        <span>DO</span>
      </button>
      <button class="icon-action" type="button" title="Form Receipt Order" @click="showRoModal = true">
        <svg viewBox="0 0 24 24" fill="none"><rect x="5" y="3" width="14" height="18" rx="2" stroke="currentColor" stroke-width="1.8"/><path d="M8 8h8M8 12h8M8 16h5" stroke="currentColor" stroke-width="1.8"/></svg>
        <span>RO</span>
      </button>
      <button class="btn-primary" type="button" @click="refresh">Refresh Data</button>
    </div>

    <p v-if="loading" class="text-sm text-emerald-100/80">Memuat laporan inventory...</p>
    <div v-else-if="error" class="rounded-xl border border-red-300/40 bg-red-500/10 px-4 py-3 text-sm text-red-100">
      {{ error }}
    </div>

    <template v-else>
      <div class="grid gap-4 md:grid-cols-3">
        <MetricCard title="Diterima dari Petani" :value="`${fmtNumber(received)} kg`" />
        <MetricCard title="Produk Terjual" :value="`${fmtNumber(sold)} kg`" />
        <MetricCard title="Pergerakan Barang" :value="`${fmtNumber(movement)} kg`" subtitle="Dalam proses/semi-finished" />
      </div>

      <GlassPanel title="Flow Traceability Inventory" tight>
        <ApexChartSafe type="bar" height="310" :options="inventoryOptions" :series="inventorySeries" />
      </GlassPanel>

      <GlassPanel title="Batch Penerimaan Terbaru (RO)" tight>
        <ul class="space-y-2 text-sm text-emerald-50/90">
          <li v-for="item in transferNotes" :key="item.id" class="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-black/20 px-3 py-2">
            <span>{{ item.id }} - {{ item.farmer }}</span>
            <span>{{ item.date }} | {{ fmtNumber(item.qtyKg) }} kg | {{ item.quality }}</span>
          </li>
        </ul>
      </GlassPanel>
    </template>

    <div v-if="showDoModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4" @click="(e) => closeOnOverlay(e, showDoModal)">
      <div class="w-full max-w-xl rounded-2xl border border-white/10 bg-[#0a2f29] p-5">
        <h3 class="text-lg font-semibold text-white">Form Delivery Order (DO)</h3>
        <form class="mt-4 grid gap-3 md:grid-cols-2" @submit.prevent="submitDO">
          <input v-model="doForm.id" class="field" placeholder="Nomor DO" />
          <input v-model="doForm.date" class="field" type="date" />
          <input v-model="doForm.customer" class="field" placeholder="Customer" />
          <input v-model="doForm.mode" class="field" placeholder="Moda kirim" />
          <input v-model.number="doForm.qtyKg" class="field" placeholder="Qty (kg)" type="number" />
          <input v-model="doForm.address" class="field" placeholder="Alamat kirim" />
          <div class="md:col-span-2 flex justify-end gap-2">
            <button type="button" class="btn-muted" @click="showDoModal = false">Batal</button>
            <button type="submit" class="btn-primary" :disabled="submitting.do">{{ submitting.do ? 'Menyimpan...' : 'Simpan DO' }}</button>
          </div>
        </form>
      </div>
    </div>

    <div v-if="showRoModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4" @click="(e) => closeOnOverlay(e, showRoModal)">
      <div class="w-full max-w-xl rounded-2xl border border-white/10 bg-[#0a2f29] p-5">
        <h3 class="text-lg font-semibold text-white">Form Receipt Order (RO) Minyak Nilam</h3>
        <form class="mt-4 grid gap-3 md:grid-cols-2" @submit.prevent="submitRO">
          <input v-model="roForm.id" class="field" placeholder="Nomor RO" />
          <input v-model="roForm.date" class="field" type="date" />
          <input v-model="roForm.farmer" class="field" placeholder="Nama Petani" />
          <input v-model="roForm.quality" class="field" placeholder="Kualitas (A/B/C)" />
          <input v-model.number="roForm.qtyKg" class="field" placeholder="Qty diterima (kg)" type="number" />
          <input v-model="roForm.destination" class="field" placeholder="Gudang tujuan" />
          <div class="md:col-span-2 flex justify-end gap-2">
            <button type="button" class="btn-muted" @click="showRoModal = false">Batal</button>
            <button type="submit" class="btn-primary" :disabled="submitting.ro">{{ submitting.ro ? 'Menyimpan...' : 'Simpan RO' }}</button>
          </div>
        </form>
      </div>
    </div>
  </section>
</template>
