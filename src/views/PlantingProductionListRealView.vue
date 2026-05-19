<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import SectionHeader from '@/components/SectionHeader.vue'
import { realErpService } from '@/services/realErpService'
import { useToast } from '@/composables/useToast'
import { fmtNumber } from '@/utils/formatters'

const router = useRouter()
const toast = useToast()

const loading = ref(false)
const error = ref('')
const searchTerm = ref('')
const statusFilter = ref('all')
const farmerFilter = ref('')
const landFilter = ref('')
const items = ref([])
const farmers = ref([])
const lands = ref([])

let searchTimer = null

const normalize = (value) => String(value ?? '').trim()

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
    if (statusFilter.value !== 'all') query.status = statusFilter.value
    if (farmerFilter.value) query.petani_id = farmerFilter.value
    if (landFilter.value) query.lahan_id = landFilter.value
    const data = await realErpService.getPlantingProductions(query)
    items.value = Array.isArray(data) ? data : []
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

watch(searchTerm, () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => loadItems(), 300)
})

watch(statusFilter, loadItems)
watch(farmerFilter, async () => {
  landFilter.value = ''
  await loadLands()
  await loadItems()
})
watch(landFilter, loadItems)

onMounted(refreshAll)

const selectedFarmer = computed(() => farmers.value.find((item) => item.id === farmerFilter.value) ?? null)
const selectedLand = computed(() => lands.value.find((item) => item.id === landFilter.value) ?? null)

const cardSubtitle = (item) => [item.petani?.nama || item.petani_nama || item.petani_id || '-', item.lahan?.kode || item.lahan_kode || item.lahan_id || '-'].join(' | ')
</script>

<template>
  <section class="space-y-6">
    <SectionHeader
      eyebrow="Real API"
      title="List Produksi Tanam"
      description="Cari produksi tanam berdasarkan kode, petani, lahan, atau status dengan tampilan card yang nyaman di mobile."
    />

    <div class="grid gap-3 rounded-2xl border border-white/10 bg-black/20 p-4 sm:grid-cols-2 xl:grid-cols-4">
      <input v-model="searchTerm" class="field w-full" type="text" placeholder="Cari kode / petani / lahan..." />
      <select v-model="statusFilter" class="field w-full">
        <option value="all">Semua Status</option>
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

      <div class="flex flex-col gap-2 sm:flex-row xl:col-span-4">
        <button type="button" class="btn-primary w-full sm:w-auto" @click="refreshAll">Refresh</button>
        <button type="button" class="btn-muted w-full sm:w-auto" @click="resetFilters">Reset Filter</button>
        <button type="button" class="btn-muted w-full sm:w-auto" @click="router.push('/real/produksi-tanam/new')">Tambah Produksi Tanam</button>
      </div>
    </div>

    <p v-if="selectedFarmer || selectedLand" class="text-sm text-emerald-100/80">
      Filter aktif:
      <span v-if="selectedFarmer">Petani {{ selectedFarmer.nama }}</span>
      <span v-if="selectedFarmer && selectedLand">, </span>
      <span v-if="selectedLand">Lahan {{ selectedLand.kode }}</span>
    </p>

    <p v-if="loading" class="text-sm text-emerald-100/80">Memuat daftar produksi tanam...</p>
    <div v-else-if="error" class="rounded-xl border border-red-300/40 bg-red-500/10 px-4 py-3 text-sm text-red-100">
      {{ error }}
    </div>
    <div v-else-if="!items.length" class="rounded-2xl border border-white/10 bg-black/20 px-4 py-6 text-sm text-emerald-100/80">
      Data produksi tanam tidak ditemukan.
    </div>

    <div v-else class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <article v-for="item in items" :key="item.id" class="rounded-2xl border border-white/10 bg-linear-to-br from-white/8 to-white/3 p-4">
        <div class="space-y-2">
          <div class="flex items-start justify-between gap-3">
            <div>
              <p class="text-xs text-emerald-100/75">ID: {{ item.id }}</p>
              <h3 class="text-lg font-bold text-white">{{ item.kode }}</h3>
            </div>
            <span class="rounded-full bg-emerald-500/20 px-2 py-1 text-xs font-semibold text-emerald-50">{{ item.status }}</span>
          </div>
          <p class="text-sm text-emerald-100/85">{{ cardSubtitle(item) }}</p>
        </div>

        <div class="mt-4 grid grid-cols-1 gap-2 text-xs text-emerald-100/90 sm:grid-cols-2">
          <p class="rounded-lg bg-black/20 px-3 py-2">Mulai: {{ item.tanggal_mulai || '-' }}</p>
          <p class="rounded-lg bg-black/20 px-3 py-2">Selesai: {{ item.tanggal_selesai || '-' }}</p>
          <p class="rounded-lg bg-black/20 px-3 py-2">Luas Garapan: {{ item.luas_garapan ?? '-' }} ha</p>
          <p class="rounded-lg bg-black/20 px-3 py-2">Hasil Basah: {{ fmtNumber(item.aktual_hasil_produksi_basah ?? item.hasil_produksi_basah ?? 0) }} kg</p>
          <p class="rounded-lg bg-black/20 px-3 py-2 sm:col-span-2">Hasil Kering: {{ fmtNumber(item.aktual_hasil_produksi_kering ?? 0) }} kg</p>
        </div>

        <div class="mt-4 flex flex-col gap-2 sm:flex-row">
          <button type="button" class="icon-action w-full justify-center sm:w-auto" @click="goToDetail(item.id)">Detail</button>
          <button type="button" class="icon-action w-full justify-center sm:w-auto" @click="goToEdit(item.id)">Edit</button>
          <button type="button" class="icon-action w-full justify-center border-red-300/40 text-red-100 hover:border-red-300/60 hover:bg-red-500/20 sm:w-auto" @click="deleteItem(item)">Hapus</button>
        </div>
      </article>
    </div>
  </section>
</template>
