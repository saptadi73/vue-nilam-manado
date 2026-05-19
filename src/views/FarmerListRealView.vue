<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import FarmerLandModalReal from '@/components/FarmerLandModalReal.vue'
import SectionHeader from '@/components/SectionHeader.vue'
import { realErpService, toAbsoluteUrl } from '@/services/realErpService'
import { useToast } from '@/composables/useToast'

const router = useRouter()
const toast = useToast()

const defaultPhoto = 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=900&q=80'

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

const loadFarmers = async () => {
  loading.value = true
  error.value = ''
  try {
    const data = await realErpService.getFarmers()
    farmers.value = Array.isArray(data) ? data : []
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Gagal memuat data petani.'
  } finally {
    loading.value = false
  }
}

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

    <div class="flex flex-wrap items-center gap-3">
      <input
        v-model="searchTerm"
        type="text"
        class="field min-w-64 flex-1"
        placeholder="Cari nama, kota/kabupaten, atau kecamatan..."
      />
      <button type="button" class="btn-muted" @click="loadFarmers">Refresh</button>
      <button type="button" class="btn-primary" @click="goToCreate">Tambah Petani</button>
    </div>

    <p v-if="loading" class="text-sm text-emerald-100/80">Memuat data petani dari API...</p>

    <div v-else-if="error" class="rounded-xl border border-red-300/40 bg-red-500/10 px-4 py-3 text-sm text-red-100">
      {{ error }}
    </div>

    <div v-else-if="!filteredFarmers.length" class="rounded-2xl border border-white/10 bg-black/20 px-4 py-6 text-sm text-emerald-100/80">
      Data petani tidak ditemukan untuk kata kunci tersebut.
    </div>

    <div v-else class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <article
        v-for="farmer in filteredFarmers"
        :key="farmer.id"
        class="overflow-hidden rounded-2xl border border-white/10 bg-linear-to-br from-white/8 to-white/3"
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

          <div class="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <button type="button" class="btn-primary w-full sm:w-auto" @click="openLandModal(farmer)">Lihat Lahan</button>
            <button type="button" class="icon-action w-full justify-center sm:w-auto" @click="goToAddLand(farmer.id)">Add Lahan</button>
            <button type="button" class="icon-action w-full justify-center sm:w-auto" @click="goToPlantingProduction(farmer.id)">Produksi Tanam</button>
            <button type="button" class="icon-action w-full justify-center sm:w-auto" @click="goToOilProduction(farmer.id)">Produksi Minyak</button>
            <button type="button" class="icon-action w-full justify-center sm:w-auto" @click="goToDetail(farmer.id)">Detail</button>
            <button type="button" class="icon-action w-full justify-center sm:w-auto" @click="goToEdit(farmer.id)">Edit</button>
            <button
              type="button"
              class="icon-action w-full justify-center border-red-300/40 text-red-100 hover:border-red-300/60 hover:bg-red-500/20 sm:w-auto"
              :disabled="deletingId === farmer.id"
              @click="deleteFarmer(farmer)"
            >
              {{ deletingId === farmer.id ? 'Menghapus...' : 'Hapus' }}
            </button>
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
  </section>
</template>
