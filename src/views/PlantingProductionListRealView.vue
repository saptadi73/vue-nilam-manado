<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ActionButton from '@/components/ActionButton.vue'
import DataToolbar from '@/components/DataToolbar.vue'
import PaginationBar from '@/components/PaginationBar.vue'
import SectionHeader from '@/components/SectionHeader.vue'
import ListLoadingState from '@/components/ListLoadingState.vue'
import PageState from '@/components/PageState.vue'
import { realErpService } from '@/services/realErpService'
import { useToast } from '@/composables/useToast'
import { fmtNumber } from '@/utils/formatters'

const router = useRouter()
const route = useRoute()
const toast = useToast()

const loading = ref(false)
const error = ref('')
const searchTerm = ref('')
const statusFilter = ref('all')
const farmerFilter = ref('')
const landFilter = ref('')
const pageSize = ref(9)
const currentPage = ref(1)
const items = ref([])
const farmers = ref([])
const lands = ref([])
const detailModalOpen = ref(false)
const selectedItem = ref(null)

let searchTimer = null

const normalize = (value) => String(value ?? '').trim()
const isUnfinishedStatus = (status) => String(status ?? '').toLowerCase() !== 'selesai'

const applyRouteFilters = () => {
  const petaniId = normalize(route.query.petani_id)
  const lahanId = normalize(route.query.lahan_id)
  const status = normalize(route.query.status)
  const search = normalize(route.query.search)

  if (petaniId) farmerFilter.value = petaniId
  if (lahanId) landFilter.value = lahanId
  if (search) searchTerm.value = search

  if (status === 'belum_selesai') {
    statusFilter.value = 'belum_selesai'
  } else if (['rencana', 'berjalan', 'selesai', 'all'].includes(status)) {
    statusFilter.value = status
  }
}

const loadFarmers = async () => {
  const data = await realErpService.getFarmers()
  farmers.value = Array.isArray(data) ? data : []
}

const loadLands = async () => {
  const query = {}
  if (farmerFilter.value) query.pemilik_id = farmerFilter.value
  const data = await realErpService.getLands(query)
  lands.value = Array.isArray(data) ? data : []
}

const loadItems = async () => {
  loading.value = true
  error.value = ''
  try {
    const query = { search: normalize(searchTerm.value) }
    if (statusFilter.value !== 'all' && statusFilter.value !== 'belum_selesai') query.status = statusFilter.value
    if (farmerFilter.value) query.petani_id = farmerFilter.value
    if (landFilter.value) query.lahan_id = landFilter.value
    const data = await realErpService.getPlantingProductions(query)
    const rows = Array.isArray(data) ? data : []
    items.value = statusFilter.value === 'belum_selesai' ? rows.filter((row) => isUnfinishedStatus(row?.status)) : rows
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Gagal memuat daftar produksi tanam.'
  } finally {
    loading.value = false
  }
}

const refreshAll = async () => {
  try {
    await Promise.all([loadFarmers(), loadLands(), loadItems()])
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Gagal memuat data produksi tanam.'
  }
}

const resetFilters = () => {
  searchTerm.value = ''
  statusFilter.value = 'all'
  farmerFilter.value = ''
  landFilter.value = ''
  currentPage.value = 1
}

const goToDetail = (id) => {
  router.push(`/real/produksi-tanam/${id}`)
}

const goToEdit = (id) => {
  router.push(`/real/produksi-tanam/${id}/edit`)
}

const deleteItem = async (item) => {
  const ok = window.confirm(`Hapus data produksi tanam ${item.kode}?`)
  if (!ok) return

  try {
    await realErpService.deletePlantingProduction(item.id)
    items.value = items.value.filter((entry) => entry.id !== item.id)
    toast.success(`Data produksi tanam ${item.kode} berhasil dihapus.`)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Gagal menghapus data produksi tanam.'
    error.value = message
    toast.error(message)
  }
}

const openQuickDetail = (item) => {
  selectedItem.value = item
  detailModalOpen.value = true
}

const closeQuickDetail = () => {
  detailModalOpen.value = false
  selectedItem.value = null
}

const onOverlayClose = (event) => {
  if (event.target === event.currentTarget) {
    closeQuickDetail()
  }
}

watch(searchTerm, () => {
  clearTimeout(searchTimer)
  currentPage.value = 1
  searchTimer = setTimeout(() => loadItems(), 300)
})

watch(statusFilter, async () => {
  currentPage.value = 1
  await loadItems()
})
watch(farmerFilter, async () => {
  currentPage.value = 1
  landFilter.value = ''
  await loadLands()
  await loadItems()
})
watch(landFilter, async () => {
  currentPage.value = 1
  await loadItems()
})

onMounted(async () => {
  applyRouteFilters()
  await refreshAll()
})

const selectedFarmer = computed(() => farmers.value.find((item) => item.id === farmerFilter.value) ?? null)
const selectedLand = computed(() => lands.value.find((item) => item.id === landFilter.value) ?? null)
const totalItems = computed(() => items.value.length)
const totalPages = computed(() => Math.max(1, Math.ceil(totalItems.value / pageSize.value)))
const paginatedItems = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return items.value.slice(start, start + pageSize.value)
})

watch([totalItems, pageSize], () => {
  if (currentPage.value > totalPages.value) {
    currentPage.value = totalPages.value
  }
})

const goToPrevPage = () => {
  if (currentPage.value > 1) currentPage.value -= 1
}

const goToNextPage = () => {
  if (currentPage.value < totalPages.value) currentPage.value += 1
}

const cardSubtitle = (item) => [item.petani?.nama || item.petani_nama || item.petani_id || '-', item.lahan?.kode || item.lahan_kode || item.lahan_id || '-'].join(' | ')

const statusBadgeClass = (status) => {
  if (status === 'selesai') return 'bg-cyan-500/20 text-cyan-50'
  if (status === 'berjalan') return 'bg-amber-500/20 text-amber-50'
  return 'bg-emerald-500/20 text-emerald-50'
}

const toCsvValue = (value) => {
  const text = String(value ?? '')
  if (text.includes('"')) {
    return `"${text.replaceAll('"', '""')}"`
  }
  if (text.includes(',') || text.includes('\n')) {
    return `"${text}"`
  }
  return text
}

const exportCsv = () => {
  if (!items.value.length) {
    toast.info('Tidak ada data untuk diexport.')
    return
  }

  const headers = [
    'id',
    'kode',
    'status',
    'tanggal_mulai',
    'tanggal_akhir',
    'aktual_tanggal_akhir',
    'petani',
    'petani_nik',
    'petani_hp',
    'lahan',
    'luas_garapan',
    'jarak_tanam',
    'jumlah_batang',
    'cara_tanam',
    'perawatan',
    'hasil_basah_target',
    'hasil_basah_aktual',
    'hasil_kering_aktual',
    'rasio_kering_basah',
    'rasio_luas_hasil_kering',
  ]
  const rows = items.value.map((item) => [
    item.id,
    item.kode,
    item.status,
    item.tanggal_mulai,
    item.tanggal_akhir,
    item.aktual_tanggal_akhir ?? '',
    item.petani?.nama || item.petani_nama || item.petani_id || '',
    item.petani?.nik || '',
    item.petani?.hp || '',
    item.lahan?.kode || item.lahan_kode || item.lahan_id || '',
    item.luas_garapan,
    item.jarak_tanam ?? '',
    item.jumlah_batang ?? '',
    item.cara_tanam ?? '',
    item.perawatan ?? '',
    item.hasil_produksi_basah ?? '',
    item.aktual_hasil_produksi_basah ?? '',
    item.aktual_hasil_produksi_kering ?? '',
    item.rasio_berat_kering_ke_basah ?? '',
    item.rasio_luas_garapan_ke_hasil_kering ?? '',
  ])

  const csv = [headers, ...rows].map((row) => row.map(toCsvValue).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `produksi-tanam-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
</script>

<template>
  <section class="space-y-6">
    <SectionHeader
      eyebrow="Real API"
      title="List Produksi Tanam"
      description="Cari produksi tanam berdasarkan kode, petani, lahan, atau status dengan tampilan card yang nyaman di mobile."
    />

    <DataToolbar content-class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <input v-model="searchTerm" class="field w-full" type="text" placeholder="Cari kode / petani / lahan..." />
      <select v-model="statusFilter" class="field w-full">
        <option value="all">Semua Status</option>
        <option value="belum_selesai">Belum Selesai</option>
        <option value="rencana">Rencana</option>
        <option value="berjalan">Berjalan</option>
        <option value="selesai">Selesai</option>
      </select>
      <select v-model="farmerFilter" class="field w-full">
        <option value="">Semua Petani</option>
        <option v-for="farmer in farmers" :key="farmer.id" :value="farmer.id">{{ farmer.nama }}</option>
      </select>
      <select v-model="landFilter" class="field w-full" :disabled="!farmerFilter">
        <option value="">Semua Lahan</option>
        <option v-for="land in lands" :key="land.id" :value="land.id">{{ land.kode }} - {{ land.luas }} ha</option>
      </select>

      <select v-model.number="pageSize" class="field w-full">
        <option :value="6">6 per halaman</option>
        <option :value="9">9 per halaman</option>
        <option :value="12">12 per halaman</option>
      </select>

      <div class="flex flex-col gap-2 sm:flex-row xl:col-span-4">
        <ActionButton variant="primary" full-width @click="refreshAll">Refresh</ActionButton>
        <ActionButton variant="muted" full-width @click="resetFilters">Reset Filter</ActionButton>
        <ActionButton variant="muted" full-width @click="exportCsv">Export CSV</ActionButton>
        <ActionButton variant="muted" full-width @click="router.push('/real/produksi-tanam/new')">Tambah Produksi Tanam</ActionButton>
      </div>
    </DataToolbar>

    <p v-if="selectedFarmer || selectedLand" class="text-sm text-emerald-100/80">
      Filter aktif:
      <span v-if="selectedFarmer">Petani {{ selectedFarmer.nama }}</span>
      <span v-if="selectedFarmer && selectedLand">, </span>
      <span v-if="selectedLand">Lahan {{ selectedLand.kode }}</span>
    </p>

    <p v-if="!loading && !error" class="text-sm text-emerald-100/80">
      Total hasil filter: {{ items.length }} data
    </p>

    <ListLoadingState v-if="loading" :card-count="6" />
    <PageState
      v-else-if="error"
      variant="error"
      title="Data produksi tanam belum berhasil dimuat"
      :description="error"
      action-label="Coba Lagi"
      @action="refreshAll"
    />
    <PageState
      v-else-if="!items.length"
      title="Data produksi tanam tidak ditemukan"
      description="Belum ada data yang sesuai dengan filter saat ini. Coba ubah filter atau refresh data."
      action-label="Refresh Data"
      @action="refreshAll"
    />

    <div v-else class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <article v-for="item in paginatedItems" :key="item.id" class="rounded-2xl border border-white/10 bg-linear-to-br from-white/8 to-white/3 p-4">
        <div class="space-y-2">
          <div class="flex items-start justify-between gap-3">
            <div>
              <p class="text-xs text-emerald-100/75">ID: {{ item.id }}</p>
              <h3 class="text-lg font-bold text-white">{{ item.kode }}</h3>
            </div>
            <span class="rounded-full px-2 py-1 text-xs font-semibold" :class="statusBadgeClass(item.status)">{{ item.status }}</span>
          </div>
          <p class="text-sm text-emerald-100/85">{{ cardSubtitle(item) }}</p>
        </div>

        <div class="mt-4 grid grid-cols-1 gap-2 text-xs text-emerald-100/90 sm:grid-cols-2">
          <p class="rounded-lg bg-black/20 px-3 py-2">Mulai: {{ item.tanggal_mulai || '-' }}</p>
          <p class="rounded-lg bg-black/20 px-3 py-2">Selesai: {{ item.aktual_tanggal_akhir || item.tanggal_akhir || '-' }}</p>
          <p class="rounded-lg bg-black/20 px-3 py-2">Luas Garapan: {{ item.luas_garapan ?? '-' }} ha</p>
          <p class="rounded-lg bg-black/20 px-3 py-2">Hasil Basah: {{ fmtNumber(item.aktual_hasil_produksi_basah ?? item.hasil_produksi_basah ?? 0) }} kg</p>
          <p class="rounded-lg bg-black/20 px-3 py-2 sm:col-span-2">Hasil Kering: {{ fmtNumber(item.aktual_hasil_produksi_kering ?? 0) }} kg</p>
        </div>

        <div class="mt-4 flex flex-col gap-2 sm:flex-row">
          <ActionButton full-width @click="openQuickDetail(item)">Ringkas</ActionButton>
          <ActionButton full-width @click="goToDetail(item.id)">Detail</ActionButton>
          <ActionButton full-width @click="goToEdit(item.id)">Edit</ActionButton>
          <ActionButton variant="danger" full-width @click="deleteItem(item)">Hapus</ActionButton>
        </div>
      </article>
    </div>

    <PaginationBar
      v-if="items.length"
      :summary="`Halaman ${currentPage} dari ${totalPages}`"
      :page="currentPage"
      :total-pages="totalPages"
      @prev="goToPrevPage"
      @next="goToNextPage"
    />

    <div v-if="detailModalOpen && selectedItem" class="fixed inset-0 z-50 flex items-end justify-center bg-black/65 p-0 sm:items-center sm:p-4" @click="onOverlayClose">
      <div class="w-full rounded-t-3xl border border-white/10 bg-[#0a2f29] p-4 sm:max-w-2xl sm:rounded-2xl sm:p-5">
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="text-xs uppercase tracking-[0.14em] text-emerald-100/70">Ringkasan Produksi Tanam</p>
            <h3 class="text-lg font-bold text-white">{{ selectedItem.kode }}</h3>
          </div>
          <ActionButton variant="muted" @click="closeQuickDetail">Tutup</ActionButton>
        </div>

        <div class="mt-4 grid grid-cols-1 gap-2 text-sm text-emerald-100/90 sm:grid-cols-2">
          <p class="rounded-lg bg-black/20 px-3 py-2">Status: {{ selectedItem.status || '-' }}</p>
          <p class="rounded-lg bg-black/20 px-3 py-2">Mulai: {{ selectedItem.tanggal_mulai || '-' }}</p>
          <p class="rounded-lg bg-black/20 px-3 py-2">Tanggal Akhir: {{ selectedItem.tanggal_akhir || '-' }}</p>
          <p class="rounded-lg bg-black/20 px-3 py-2">Aktual Akhir: {{ selectedItem.aktual_tanggal_akhir || '-' }}</p>
          <p class="rounded-lg bg-black/20 px-3 py-2">Petani: {{ selectedItem.petani?.nama || selectedItem.petani_nama || selectedItem.petani_id || '-' }}</p>
          <p class="rounded-lg bg-black/20 px-3 py-2">Lahan: {{ selectedItem.lahan?.kode || selectedItem.lahan_kode || selectedItem.lahan_id || '-' }}</p>
          <p class="rounded-lg bg-black/20 px-3 py-2">Luas Garapan: {{ selectedItem.luas_garapan ?? '-' }} ha</p>
          <p class="rounded-lg bg-black/20 px-3 py-2">Jumlah Batang: {{ selectedItem.jumlah_batang ?? '-' }}</p>
          <p class="rounded-lg bg-black/20 px-3 py-2">Basah (target): {{ fmtNumber(selectedItem.hasil_produksi_basah ?? 0) }} kg</p>
          <p class="rounded-lg bg-black/20 px-3 py-2">Basah (aktual): {{ fmtNumber(selectedItem.aktual_hasil_produksi_basah ?? 0) }} kg</p>
          <p class="rounded-lg bg-black/20 px-3 py-2 sm:col-span-2">Kering (aktual): {{ fmtNumber(selectedItem.aktual_hasil_produksi_kering ?? 0) }} kg</p>
        </div>
      </div>
    </div>
  </section>
</template>
