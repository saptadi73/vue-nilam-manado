<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import ActionButton from '@/components/ActionButton.vue'
import { appConfig } from '@/config/env'
import FarmerLandModalReal from '@/components/FarmerLandModalReal.vue'
import SectionHeader from '@/components/SectionHeader.vue'
import FarmerExpenseModal from '@/components/FarmerExpenseModal.vue'
import DataToolbar from '@/components/DataToolbar.vue'
import ListLoadingState from '@/components/ListLoadingState.vue'
import PageState from '@/components/PageState.vue'
import { realErpService, toAbsoluteUrl } from '@/services/realErpService'
import { useToast } from '@/composables/useToast'
import { fmtCurrency, fmtNumber } from '@/utils/formatters'

const router = useRouter()
const toast = useToast()

const defaultPhoto = appConfig.defaultFarmerPhotoUrl

const farmers = ref([])
const loading = ref(false)
const error = ref('')
const deletingId = ref('')
const searchTerm = ref('')
const landModalOpen = ref(false)
const selectedFarmerForLand = ref(null)
const landsByFarmer = ref([])
const landLoading = ref(false)
const landError = ref('')
const farmerMetricsById = ref({})
const metricLoading = ref(false)
const farmerPendingById = ref({})
const metricRange = ref('30d')

const expenseModalOpen = ref(false)
const selectedFarmerIdForExpense = ref(null)

function openExpenseModal(farmer) {
  selectedFarmerIdForExpense.value = farmer.id
  expenseModalOpen.value = true
}
function closeExpenseModal() {
  expenseModalOpen.value = false
  selectedFarmerIdForExpense.value = null
}

const metricRangeOptions = [
  { value: '30d', label: '30 Hari' },
  { value: '90d', label: '90 Hari' },
  { value: '365d', label: '1 Tahun' },
  { value: 'all', label: 'Semua Waktu' },
]

const normalizeText = (text) => String(text ?? '').toLowerCase().trim()

const filteredFarmers = computed(() => {
  const keyword = normalizeText(searchTerm.value)
  if (!keyword) return farmers.value

  return farmers.value.filter((item) => {
    const searchable = [item.nama, item.kabupaten_kota, item.kecamatan, item.desa_kelurahan]
    return searchable.some((part) => normalizeText(part).includes(keyword))
  })
})

const getPhotoUrl = (farmer) => {
  if (!farmer?.foto_url) return defaultPhoto
  return toAbsoluteUrl(farmer.foto_url)
}

const toIsoDate = (date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const getDateRangeParams = (rangeKey) => {
  if (rangeKey === 'all') return {}

  const end = new Date()
  const start = new Date(end)
  const dayMap = {
    '30d': 30,
    '90d': 90,
    '365d': 365,
  }
  const days = dayMap[rangeKey] ?? 30
  start.setDate(end.getDate() - (days - 1))

  return {
    tanggal_mulai: toIsoDate(start),
    tanggal_akhir: toIsoDate(end),
  }
}

const pickMetricDate = (row) => {
  const value = row?.aktual_tanggal_akhir ?? row?.tanggal_akhir ?? row?.tanggal_mulai ?? row?.created_at ?? null
  if (!value) return null
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

const isDateInRange = (dateValue, rangeKey) => {
  if (rangeKey === 'all') return true
  if (!(dateValue instanceof Date) || Number.isNaN(dateValue.getTime())) return false

  const end = new Date()
  end.setHours(23, 59, 59, 999)
  const start = new Date(end)
  const dayMap = {
    '30d': 30,
    '90d': 90,
    '365d': 365,
  }
  const days = dayMap[rangeKey] ?? 30
  start.setDate(end.getDate() - (days - 1))
  start.setHours(0, 0, 0, 0)

  return dateValue >= start && dateValue <= end
}

const loadFarmers = async () => {
  loading.value = true
  error.value = ''
  try {
    const data = await realErpService.getFarmers()
    farmers.value = Array.isArray(data) ? data : []
    await loadFarmerMetrics(farmers.value)
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Gagal memuat data petani.'
    farmerMetricsById.value = {}
    farmerPendingById.value = {}
  } finally {
    loading.value = false
  }
}

const loadFarmerMetrics = async (farmerList) => {
  metricLoading.value = true
  try {
    const dateRangeQuery = getDateRangeParams(metricRange.value)
    const [salesExpenseRows, plantingRows, oilRows] = await Promise.all([
      realErpService.getDashboardSalesVsExpensesByFarmer(dateRangeQuery),
      realErpService.getPlantingProductions(),
      realErpService.getOilProductions(),
    ])

    const salesExpenseMap = new Map()
    ;(Array.isArray(salesExpenseRows) ? salesExpenseRows : []).forEach((row) => {
      const farmerId = row?.petani?.id
      if (!farmerId) return
      salesExpenseMap.set(farmerId, {
        totalPenjualan: Number(row?.total_penjualan ?? 0),
        totalExpense: Number(row?.total_expense ?? 0),
      })
    })

    const productionMap = new Map()
    const pendingMap = new Map()
    ;(Array.isArray(plantingRows) ? plantingRows : []).forEach((row) => {
      const farmerId = row?.petani_id
      if (!farmerId) return

      if (String(row?.status ?? '').toLowerCase() !== 'selesai') {
        const prevPending = pendingMap.get(farmerId) ?? { tanam: 0, minyak: 0 }
        pendingMap.set(farmerId, { ...prevPending, tanam: prevPending.tanam + 1 })
      }

      if (!isDateInRange(pickMetricDate(row), metricRange.value)) return
      const prev = productionMap.get(farmerId) ?? 0
      const produksi = Number(row?.aktual_hasil_produksi_kering ?? row?.aktual_hasil_produksi_basah ?? row?.hasil_produksi_basah ?? 0)
      productionMap.set(farmerId, prev + (Number.isFinite(produksi) ? produksi : 0))
    })

    ;(Array.isArray(oilRows) ? oilRows : []).forEach((row) => {
      const farmerId = row?.petani_id
      if (!farmerId) return

      if (String(row?.status ?? '').toLowerCase() !== 'selesai') {
        const prevPending = pendingMap.get(farmerId) ?? { tanam: 0, minyak: 0 }
        pendingMap.set(farmerId, { ...prevPending, minyak: prevPending.minyak + 1 })
      }

      if (!isDateInRange(pickMetricDate(row), metricRange.value)) return
      const prev = productionMap.get(farmerId) ?? 0
      const produksi = Number(row?.aktual_hasil_minyak ?? row?.hasil_minyak ?? 0)
      productionMap.set(farmerId, prev + (Number.isFinite(produksi) ? produksi : 0))
    })

    const nextMetrics = {}
    const nextPending = {}
    ;(Array.isArray(farmerList) ? farmerList : []).forEach((farmer) => {
      const salesExpense = salesExpenseMap.get(farmer.id) ?? { totalPenjualan: 0, totalExpense: 0 }
      const pending = pendingMap.get(farmer.id) ?? { tanam: 0, minyak: 0 }
      nextMetrics[farmer.id] = {
        totalPenjualan: salesExpense.totalPenjualan,
        totalExpense: salesExpense.totalExpense,
        totalProduksi: productionMap.get(farmer.id) ?? 0,
      }
      nextPending[farmer.id] = pending
    })

    farmerMetricsById.value = nextMetrics
    farmerPendingById.value = nextPending
  } catch {
    const nextMetrics = {}
    const nextPending = {}
    ;(Array.isArray(farmerList) ? farmerList : []).forEach((farmer) => {
      nextMetrics[farmer.id] = { totalPenjualan: 0, totalExpense: 0, totalProduksi: 0 }
      nextPending[farmer.id] = { tanam: 0, minyak: 0 }
    })
    farmerMetricsById.value = nextMetrics
    farmerPendingById.value = nextPending
  } finally {
    metricLoading.value = false
  }
}

const metricFor = (farmerId) => farmerMetricsById.value[farmerId] ?? { totalPenjualan: 0, totalExpense: 0, totalProduksi: 0 }
const pendingFor = (farmerId) => farmerPendingById.value[farmerId] ?? { tanam: 0, minyak: 0 }
const hasPending = (farmerId) => {
  const pending = pendingFor(farmerId)
  return pending.tanam + pending.minyak > 0
}

watch(metricRange, () => {
  loadFarmerMetrics(farmers.value)
})

const goToCreate = () => {
  router.push('/real/petani/new')
}

const goToDetail = (farmerId) => {
  router.push(`/real/petani/${farmerId}`)
}

const goToEdit = (farmerId) => {
  router.push(`/real/petani/${farmerId}/edit`)
}

const goToAddLand = (farmerId) => {
  router.push({
    path: '/real/lahan/new',
    query: { pemilik_id: farmerId },
  })
}

const goToPlantingProduction = (farmerId) => {
  router.push({
    path: '/real/produksi-tanam/new',
    query: { petani_id: farmerId },
  })
}

const goToOilProduction = (farmerId) => {
  router.push({
    path: '/real/produksi-minyak/new',
    query: { petani_id: farmerId },
  })
}

const goToPlantingProductionList = (farmerId) => {
  router.push({
    path: '/real/produksi-tanam',
    query: { petani_id: farmerId, status: 'belum_selesai' },
  })
}

const goToOilProductionList = (farmerId) => {
  router.push({
    path: '/real/produksi-minyak',
    query: { petani_id: farmerId, status: 'belum_selesai' },
  })
}

const goToProductionUpdate = (farmerId) => {
  router.push(`/real/petani/${farmerId}/produksi-update`)
}

const openLandModal = async (farmer) => {
  selectedFarmerForLand.value = farmer
  landsByFarmer.value = []
  landError.value = ''
  landModalOpen.value = true
  landLoading.value = true

  try {
    const lands = await realErpService.getLands({ pemilik_id: farmer.id })
    landsByFarmer.value = Array.isArray(lands) ? lands : []
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Gagal memuat data lahan petani.'
    landError.value = message
    toast.error(message)
  } finally {
    landLoading.value = false
  }
}

const closeLandModal = () => {
  landModalOpen.value = false
  selectedFarmerForLand.value = null
  landsByFarmer.value = []
  landLoading.value = false
  landError.value = ''
}

const deleteFarmer = async (farmer) => {
  const ok = window.confirm(`Hapus data petani ${farmer.nama}?`)
  if (!ok) return

  deletingId.value = farmer.id
  error.value = ''
  try {
    await realErpService.deleteFarmer(farmer.id)
    farmers.value = farmers.value.filter((item) => item.id !== farmer.id)
    if (farmerMetricsById.value[farmer.id]) {
      const next = { ...farmerMetricsById.value }
      delete next[farmer.id]
      farmerMetricsById.value = next
    }
    if (farmerPendingById.value[farmer.id]) {
      const nextPending = { ...farmerPendingById.value }
      delete nextPending[farmer.id]
      farmerPendingById.value = nextPending
    }
    toast.success(`Data petani ${farmer.nama} berhasil dihapus.`)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Gagal menghapus data petani.'
    error.value = message
    toast.error(message)
  } finally {
    deletingId.value = ''
  }
}

onMounted(loadFarmers)
</script>

<template>
  <section class="space-y-6">
    <SectionHeader
      eyebrow="Real API"
      title="Master Data Petani"
      description="List petani dari backend real dengan tampilan card, aksi CRUD, dan filter cepat nama atau wilayah."
    />

    <DataToolbar>
      <input
        v-model="searchTerm"
        type="text"
        class="field min-w-64 flex-1"
        placeholder="Cari nama, kota/kabupaten, atau kecamatan..."
      />
      <select v-model="metricRange" class="field w-full sm:w-auto" aria-label="Pilih periode metric petani">
        <option v-for="option in metricRangeOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
      </select>
      <ActionButton variant="muted" @click="loadFarmers">Refresh</ActionButton>
      <ActionButton variant="primary" @click="goToCreate">Tambah Petani</ActionButton>
    </DataToolbar>

    <ListLoadingState v-if="loading" :card-count="6" />

    <PageState
      v-else-if="error"
      variant="error"
      title="Data petani belum berhasil dimuat"
      :description="error"
      action-label="Coba Lagi"
      @action="loadFarmers"
    />

    <PageState
      v-else-if="!filteredFarmers.length"
      title="Data petani tidak ditemukan"
      description="Coba ubah kata kunci pencarian atau refresh data dari backend real API."
      action-label="Refresh Data"
      @action="loadFarmers"
    />

    <div v-else class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <article
        v-for="farmer in filteredFarmers"
        :key="farmer.id"
        class="overflow-hidden rounded-2xl border bg-linear-to-br"
        :class="hasPending(farmer.id) ? 'border-amber-300/40 from-amber-300/10 to-emerald-200/5 shadow-[0_0_0_1px_rgba(252,211,77,0.2)]' : 'border-white/10 from-white/8 to-white/3'"
      >
        <div
          class="relative h-40 cursor-pointer bg-black/30"
          role="button"
          tabindex="0"
          :aria-label="`Lihat lahan milik ${farmer.nama}`"
          @click="openLandModal(farmer)"
          @keydown.enter.prevent="openLandModal(farmer)"
          @keydown.space.prevent="openLandModal(farmer)"
        >
          <img :src="getPhotoUrl(farmer)" :alt="`Foto ${farmer.nama}`" class="h-full w-full object-cover" />
          <div class="absolute inset-0 bg-linear-to-t from-[#082521] via-[#082521]/25 to-transparent" />
          <div class="absolute bottom-3 left-4">
            <p class="text-xs text-emerald-100/80">NIK: {{ farmer.nik }}</p>
            <h3 class="text-lg font-bold text-white">{{ farmer.nama }}</h3>
          </div>
          <span class="absolute right-3 top-3 rounded-full bg-emerald-500/85 px-2 py-1 text-[11px] font-semibold text-[#06221d]">Lihat Lahan</span>
        </div>

        <div class="space-y-4 p-3 sm:p-4">
          <div class="space-y-1 text-sm text-emerald-100/85">
            <p>{{ farmer.alamat }}</p>
            <p>HP: {{ farmer.hp || '-' }}</p>
          </div>

          <div class="grid grid-cols-1 gap-2 text-xs text-emerald-100/90">
            <p class="rounded-lg bg-black/20 px-3 py-2">Provinsi: {{ farmer.provinsi || '-' }}</p>
            <p class="rounded-lg bg-black/20 px-3 py-2">Kab/Kota: {{ farmer.kabupaten_kota || '-' }}</p>
            <p class="rounded-lg bg-black/20 px-3 py-2">Kecamatan: {{ farmer.kecamatan || '-' }}</p>
            <p class="rounded-lg bg-black/20 px-3 py-2">Desa: {{ farmer.desa_kelurahan || '-' }}</p>
          </div>

          <div class="grid grid-cols-1 gap-2 text-xs sm:grid-cols-3">
            <div class="rounded-lg border border-emerald-300/20 bg-emerald-500/10 px-3 py-2">
              <p class="text-emerald-100/70">Total Penjualan</p>
              <p class="mt-1 font-semibold text-emerald-50">
                {{ metricLoading ? '...' : fmtCurrency(metricFor(farmer.id).totalPenjualan) }}
              </p>
            </div>
            <div class="rounded-lg border border-cyan-300/20 bg-cyan-500/10 px-3 py-2">
              <p class="text-emerald-100/70">Total Produksi</p>
              <p class="mt-1 font-semibold text-cyan-50">
                {{ metricLoading ? '...' : `${fmtNumber(metricFor(farmer.id).totalProduksi)} kg` }}
              </p>
            </div>
            <div class="rounded-lg border border-amber-300/20 bg-amber-500/10 px-3 py-2">
              <p class="text-emerald-100/70">Total Expense</p>
              <p class="mt-1 font-semibold text-amber-50">
                {{ metricLoading ? '...' : fmtCurrency(metricFor(farmer.id).totalExpense) }}
              </p>
            </div>
          </div>

          <div class="flex flex-wrap items-center gap-2 text-xs">
            <span class="rounded-full border px-2 py-1" :class="pendingFor(farmer.id).tanam > 0 ? 'border-amber-200/60 bg-amber-400/25 font-semibold text-amber-50' : 'border-amber-300/40 bg-amber-500/10 text-amber-50'">
              Pending Tanam: {{ pendingFor(farmer.id).tanam }}
            </span>
            <span class="rounded-full border px-2 py-1" :class="pendingFor(farmer.id).minyak > 0 ? 'border-cyan-200/60 bg-cyan-400/25 font-semibold text-cyan-50' : 'border-cyan-300/40 bg-cyan-500/10 text-cyan-50'">
              Pending Minyak: {{ pendingFor(farmer.id).minyak }}
            </span>
          </div>

          <div class="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <ActionButton variant="primary" full-width @click="openLandModal(farmer)">Lihat Lahan</ActionButton>
            <ActionButton full-width @click="goToAddLand(farmer.id)">Add Lahan</ActionButton>
            <ActionButton full-width @click="goToPlantingProduction(farmer.id)">Produksi Tanam</ActionButton>
            <ActionButton full-width @click="goToOilProduction(farmer.id)">Produksi Minyak</ActionButton>
            <ActionButton full-width @click="goToPlantingProductionList(farmer.id)">List Tanam</ActionButton>
            <ActionButton full-width @click="goToOilProductionList(farmer.id)">List Minyak</ActionButton>
            <ActionButton
              :variant="hasPending(farmer.id) ? 'primary' : 'neutral'"
              full-width
              :class="hasPending(farmer.id) ? 'animate-pulse' : ''"
              @click="goToProductionUpdate(farmer.id)"
            >
              Update Produksi
            </ActionButton>
            <ActionButton full-width @click="openExpenseModal(farmer)">List Expense</ActionButton>
            <ActionButton full-width @click="goToDetail(farmer.id)">Detail</ActionButton>
            <ActionButton full-width @click="goToEdit(farmer.id)">Edit</ActionButton>
            <ActionButton
              variant="danger"
              full-width
              :disabled="deletingId === farmer.id"
              @click="deleteFarmer(farmer)"
            >
              {{ deletingId === farmer.id ? 'Menghapus...' : 'Hapus' }}
            </ActionButton>
          </div>
        </div>
      </article>
    </div>

    <FarmerLandModalReal
      :open="landModalOpen"
      :farmer="selectedFarmerForLand"
      :lands="landsByFarmer"
      :loading="landLoading"
      :error="landError"
      @close="closeLandModal"
    />

    <FarmerExpenseModal
      :open="expenseModalOpen"
      :farmer-id="selectedFarmerIdForExpense"
      @close="closeExpenseModal"
    />
  </section>
</template>
