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

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/

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
const noteModalOpen = ref(false)
const noteSaving = ref(false)
const noteError = ref('')
const selectedForNote = ref(null)
const noteForm = ref({
  tanggal: new Date().toISOString().slice(0, 10),
  catatan: '',
})
const notesList = ref([])
const notesLoading = ref(false)
const editingNote = ref(null)

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
    const data = await realErpService.getOilProductions(query)
    const rows = Array.isArray(data) ? data : []
    items.value = statusFilter.value === 'belum_selesai' ? rows.filter((row) => isUnfinishedStatus(row?.status)) : rows
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Gagal memuat daftar produksi minyak.'
  } finally {
    loading.value = false
  }
}

const refreshAll = async () => {
  try {
    await Promise.all([loadFarmers(), loadLands(), loadItems()])
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Gagal memuat data produksi minyak.'
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
  router.push(`/real/produksi-minyak/${id}`)
}

const goToEdit = (id) => {
  router.push(`/real/produksi-minyak/${id}/edit`)
}

const deleteItem = async (item) => {
  const ok = window.confirm(`Hapus data produksi minyak ${item.kode}?`)
  if (!ok) return

  try {
    await realErpService.deleteOilProduction(item.id)
    items.value = items.value.filter((entry) => entry.id !== item.id)
    toast.success(`Data produksi minyak ${item.kode} berhasil dihapus.`)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Gagal menghapus data produksi minyak.'
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

const parseIsoDate = (value) => {
  const text = String(value ?? '').trim()
  if (!text) return null
  const date = new Date(`${text}T00:00:00`)
  return Number.isNaN(date.getTime()) ? null : date
}

const getProgressPercent = (item) => {
  if (String(item?.status ?? '').toLowerCase() === 'selesai') return 100

  const start = parseIsoDate(item?.tanggal_mulai)
  const end = parseIsoDate(item?.tanggal_akhir)
  if (!start || !end) return 0

  const duration = end.getTime() - start.getTime()
  if (duration <= 0) return 0

  const today = new Date()
  const todayRef = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()
  const progress = ((todayRef - start.getTime()) / duration) * 100
  return Math.max(0, Math.min(100, Math.round(progress)))
}

const loadNotes = async (productionId) => {
  notesLoading.value = true
  try {
    const data = await realErpService.getOilProductionNotes(productionId)
    notesList.value = Array.isArray(data) ? data : []
  } catch {
    notesList.value = []
  } finally {
    notesLoading.value = false
  }
}

const openNoteModal = (item) => {
  selectedForNote.value = item
  noteModalOpen.value = true
  noteSaving.value = false
  noteError.value = ''
  editingNote.value = null
  notesList.value = []
  noteForm.value = {
    tanggal: new Date().toISOString().slice(0, 10),
    catatan: '',
  }
  loadNotes(item.id)
}

const closeNoteModal = () => {
  noteModalOpen.value = false
  selectedForNote.value = null
  noteSaving.value = false
  noteError.value = ''
  editingNote.value = null
  notesList.value = []
}

const startEditNote = (note) => {
  editingNote.value = note
  noteForm.value = {
    tanggal: String(note.tanggal ?? '').slice(0, 10) || new Date().toISOString().slice(0, 10),
    catatan: note.catatan ?? '',
  }
  noteError.value = ''
}

const cancelEditNote = () => {
  editingNote.value = null
  noteForm.value = { tanggal: new Date().toISOString().slice(0, 10), catatan: '' }
  noteError.value = ''
}

const deleteNote = async (note) => {
  if (!selectedForNote.value?.id) return
  const ok = window.confirm('Hapus catatan ini?')
  if (!ok) return
  try {
    await realErpService.deleteOilProductionNote(selectedForNote.value.id, note.id)
    notesList.value = notesList.value.filter((n) => n.id !== note.id)
    toast.success('Catatan berhasil dihapus.')
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Gagal menghapus catatan.')
  }
}

const submitNote = async () => {
  if (!selectedForNote.value?.id) return
  if (!ISO_DATE_REGEX.test(String(noteForm.value.tanggal ?? '').trim())) {
    noteError.value = 'Tanggal catatan wajib format YYYY-MM-DD.'
    return
  }

  if (!String(noteForm.value.catatan ?? '').trim()) {
    noteError.value = 'Catatan wajib diisi.'
    return
  }

  if (String(noteForm.value.catatan ?? '').trim().length > 2000) {
    noteError.value = 'Catatan maksimal 2000 karakter.'
    return
  }

  noteSaving.value = true
  noteError.value = ''
  try {
    const payload = {
      tanggal: noteForm.value.tanggal,
      catatan: String(noteForm.value.catatan ?? '').trim(),
    }
    if (editingNote.value) {
      await realErpService.updateOilProductionNote(selectedForNote.value.id, editingNote.value.id, payload)
      toast.success('Catatan berhasil diperbarui.')
    } else {
      await realErpService.createOilProductionNote(selectedForNote.value.id, payload)
      toast.success(`Catatan untuk ${selectedForNote.value.kode} berhasil ditambahkan.`)
    }
    editingNote.value = null
    noteForm.value = { tanggal: new Date().toISOString().slice(0, 10), catatan: '' }
    await loadNotes(selectedForNote.value.id)
  } catch (err) {
    noteError.value = err instanceof Error ? err.message : 'Gagal menyimpan catatan produksi minyak.'
  } finally {
    noteSaving.value = false
  }
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
    'berat_kering_bahan',
    'hasil_minyak_target',
    'hasil_minyak_aktual',
    'tempat_penyulingan',
    'harga_penyulingan_per_kg',
    'redaman',
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
    item.berat_kering_bahan ?? '',
    item.hasil_minyak ?? '',
    item.aktual_hasil_minyak ?? '',
    item.tempat_penyulingan ?? '',
    item.harga_penyulingan_per_kg ?? '',
    item.redaman ?? '',
  ])

  const csv = [headers, ...rows].map((row) => row.map(toCsvValue).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `produksi-minyak-${new Date().toISOString().slice(0, 10)}.csv`
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
      title="List Produksi Minyak"
      description="Cari produksi minyak berdasarkan kode, petani, lahan, atau status dengan card mobile-friendly."
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
        <option v-for="land in lands" :key="land.id" :value="land.id">{{ land.kode }} - {{ land.luas }} M²</option>
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
        <ActionButton variant="muted" full-width @click="router.push('/real/produksi-minyak/new')">Tambah Produksi Minyak</ActionButton>
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
      title="Data produksi minyak belum berhasil dimuat"
      :description="error"
      action-label="Coba Lagi"
      @action="refreshAll"
    />
    <PageState
      v-else-if="!items.length"
      title="Data produksi minyak tidak ditemukan"
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
          <p class="rounded-lg bg-black/20 px-3 py-2">Akhir: {{ item.tanggal_akhir || '-' }}</p>
          <p class="rounded-lg bg-black/20 px-3 py-2">Berat Kering: {{ fmtNumber(item.berat_kering_bahan ?? 0) }} kg</p>
          <p class="rounded-lg bg-black/20 px-3 py-2">Hasil Minyak: {{ fmtNumber(item.aktual_hasil_minyak ?? item.hasil_minyak ?? 0) }} kg</p>
          <p class="rounded-lg bg-black/20 px-3 py-2">Tempat: {{ item.tempat_penyulingan || '-' }}</p>
          <p class="rounded-lg bg-black/20 px-3 py-2">Harga Penyulingan: {{ item.harga_penyulingan_per_kg != null ? `Rp ${fmtNumber(item.harga_penyulingan_per_kg)}` : '-' }}</p>
          <p class="rounded-lg bg-black/20 px-3 py-2 sm:col-span-2">Redaman: {{ item.redaman != null ? Number(item.redaman).toFixed(3) : '-' }}</p>
        </div>

        <div class="mt-4 space-y-1">
          <div class="flex items-center justify-between text-xs text-emerald-100/85">
            <span>Progress Durasi</span>
            <span>{{ getProgressPercent(item) }}%</span>
          </div>
          <div class="h-2 overflow-hidden rounded-full bg-white/10">
            <div
              class="h-full rounded-full bg-linear-to-r from-emerald-400 to-cyan-400 transition-all"
              :style="{ width: `${getProgressPercent(item)}%` }"
            />
          </div>
          <p class="text-[11px] text-emerald-100/70">Perhitungan: tanggal mulai - hari ini - rencana selesai.</p>
        </div>

        <div class="mt-4 flex flex-col gap-2 sm:flex-row">
          <ActionButton full-width @click="openNoteModal(item)">
            <span class="inline-flex items-center gap-1">
              <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" />
                <path d="M14 3v6h6" />
                <path d="M9 13h6" />
                <path d="M9 17h6" />
              </svg>
              Catatan
            </span>
          </ActionButton>
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
            <p class="text-xs uppercase tracking-[0.14em] text-emerald-100/70">Ringkasan Produksi Minyak</p>
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
          <p class="rounded-lg bg-black/20 px-3 py-2">Berat Kering: {{ fmtNumber(selectedItem.berat_kering_bahan ?? 0) }} kg</p>
          <p class="rounded-lg bg-black/20 px-3 py-2">Hasil (target): {{ fmtNumber(selectedItem.hasil_minyak ?? 0) }} kg</p>
          <p class="rounded-lg bg-black/20 px-3 py-2">Hasil (aktual): {{ fmtNumber(selectedItem.aktual_hasil_minyak ?? 0) }} kg</p>
          <p class="rounded-lg bg-black/20 px-3 py-2">Tempat Penyulingan: {{ selectedItem.tempat_penyulingan || '-' }}</p>
          <p class="rounded-lg bg-black/20 px-3 py-2">Harga Penyulingan/Kg: {{ selectedItem.harga_penyulingan_per_kg != null ? `Rp ${fmtNumber(selectedItem.harga_penyulingan_per_kg)}` : '-' }}</p>
          <p class="rounded-lg bg-black/20 px-3 py-2">Redaman: {{ selectedItem.redaman != null ? Number(selectedItem.redaman).toFixed(3) : '-' }}</p>
        </div>
      </div>
    </div>

    <div v-if="noteModalOpen && selectedForNote" class="fixed inset-0 z-50 flex items-end justify-center bg-black/65 p-0 sm:items-center sm:p-4" @click="closeNoteModal">
      <div class="w-full rounded-t-3xl border border-white/10 bg-[#0a2f29] p-4 sm:max-w-xl sm:rounded-2xl sm:p-5" @click.stop>
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="text-xs uppercase tracking-[0.14em] text-emerald-100/70">Catatan Produksi Minyak</p>
            <h3 class="text-lg font-bold text-white">{{ selectedForNote.kode }}</h3>
          </div>
          <ActionButton variant="muted" @click="closeNoteModal">Tutup</ActionButton>
        </div>

        <!-- Riwayat catatan -->
        <div class="mt-4 space-y-2">
          <p class="text-xs font-semibold uppercase tracking-wide text-emerald-100/70">Riwayat Catatan</p>
          <p v-if="notesLoading" class="text-sm text-emerald-100/60">Memuat catatan...</p>
          <p v-else-if="!notesList.length" class="text-sm text-emerald-100/50">Belum ada catatan untuk produksi ini.</p>
          <ul v-else class="max-h-44 space-y-2 overflow-y-auto pr-1">
            <li
              v-for="note in notesList"
              :key="note.id"
              class="flex items-start justify-between gap-2 rounded-xl border border-white/10 bg-black/25 px-3 py-2"
            >
              <div class="min-w-0">
                <p class="text-xs text-emerald-100/60">{{ note.tanggal }}</p>
                <p class="whitespace-pre-wrap text-sm text-emerald-50/90">{{ note.catatan }}</p>
              </div>
              <div class="flex shrink-0 gap-1">
                <button type="button" class="rounded-lg px-2 py-1 text-xs text-emerald-300 hover:bg-emerald-500/20" @click="startEditNote(note)">Edit</button>
                <button type="button" class="rounded-lg px-2 py-1 text-xs text-red-300 hover:bg-red-500/20" @click="deleteNote(note)">Hapus</button>
              </div>
            </li>
          </ul>
        </div>

        <div v-if="noteError" class="mt-3 rounded-xl border border-red-300/40 bg-red-500/10 px-4 py-3 text-sm text-red-100">
          {{ noteError }}
        </div>

        <!-- Form tambah / edit catatan -->
        <form class="mt-4 space-y-3" @submit.prevent="submitNote">
          <p class="text-xs font-semibold uppercase tracking-wide text-emerald-100/70">
            {{ editingNote ? 'Edit Catatan' : 'Tambah Catatan Baru' }}
          </p>
          <label class="block space-y-1 text-sm text-emerald-100/85">
            <span>Tanggal *</span>
            <input v-model="noteForm.tanggal" type="date" class="field w-full" required>
          </label>

          <label class="block space-y-1 text-sm text-emerald-100/85">
            <span>Catatan *</span>
            <textarea v-model="noteForm.catatan" class="field w-full" rows="3" placeholder="Tulis catatan progres produksi..." required></textarea>
          </label>

          <div class="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <ActionButton v-if="editingNote" variant="muted" full-width @click="cancelEditNote">Batal Edit</ActionButton>
            <ActionButton variant="muted" full-width @click="closeNoteModal">Tutup</ActionButton>
            <button type="submit" class="btn-primary w-full sm:w-auto" :disabled="noteSaving">
              {{ noteSaving ? 'Menyimpan...' : editingNote ? 'Perbarui Catatan' : 'Simpan Catatan' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </section>
</template>
