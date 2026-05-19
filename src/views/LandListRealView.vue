<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import SectionHeader from '@/components/SectionHeader.vue'
import { useToast } from '@/composables/useToast'
import { realErpService } from '@/services/realErpService'

const router = useRouter()
const toast = useToast()

const lands = ref([])
const loading = ref(false)
const error = ref('')
const deletingId = ref('')
const searchTerm = ref('')
const currentPage = ref(1)
const pageSize = ref(9)

const filteredLands = computed(() => {
  const keyword = String(searchTerm.value ?? '').toLowerCase().trim()
  if (!keyword) return lands.value

  return lands.value.filter((item) => {
    const text = [item.kode, item.pemilik_nama, item.kabupaten_kota, item.kecamatan, item.desa_kelurahan, item.kepemilikan]
      .map((value) => String(value ?? '').toLowerCase())
      .join(' ')
    return text.includes(keyword)
  })
})

const totalPages = computed(() => {
  const total = Math.ceil(filteredLands.value.length / pageSize.value)
  return total > 0 ? total : 1
})

const paginatedLands = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return filteredLands.value.slice(start, start + pageSize.value)
})

const pageInfo = computed(() => {
  if (!filteredLands.value.length) return '0 dari 0'

  const start = (currentPage.value - 1) * pageSize.value + 1
  const end = Math.min(currentPage.value * pageSize.value, filteredLands.value.length)
  return `${start}-${end} dari ${filteredLands.value.length}`
})

const loadLands = async () => {
  loading.value = true
  error.value = ''
  try {
    const data = await realErpService.getLands({ search: searchTerm.value.trim() })
    lands.value = Array.isArray(data) ? data : []
    currentPage.value = 1
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Gagal memuat data lahan.'
  } finally {
    loading.value = false
  }
}

const goToPrevPage = () => {
  currentPage.value = Math.max(1, currentPage.value - 1)
}

const goToNextPage = () => {
  currentPage.value = Math.min(totalPages.value, currentPage.value + 1)
}

const onChangePageSize = () => {
  currentPage.value = 1
}

const goToCreate = () => {
  router.push('/real/lahan/new')
}

const goToDetail = (landId) => {
  router.push(`/real/lahan/${landId}`)
}

const goToEdit = (landId) => {
  router.push(`/real/lahan/${landId}/edit`)
}

const deleteLand = async (land) => {
  const ok = window.confirm(`Hapus data lahan ${land.kode}?`)
  if (!ok) return

  deletingId.value = land.id
  try {
    await realErpService.deleteLand(land.id)
    lands.value = lands.value.filter((item) => item.id !== land.id)
    toast.success(`Lahan ${land.kode} berhasil dihapus.`)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Gagal menghapus data lahan.'
    error.value = message
    toast.error(message)
  } finally {
    deletingId.value = ''
  }
}

onMounted(loadLands)
</script>

<template>
  <section class="space-y-6">
    <SectionHeader
      eyebrow="Real API"
      title="Master Data Lahan"
      description="List lahan dengan fitur search dan tombol CRUD untuk mempercepat update data lahan."
    />

    <div class="flex flex-wrap items-center gap-3">
      <input
        v-model="searchTerm"
        type="text"
        class="field min-w-64 flex-1"
        placeholder="Cari kode lahan, pemilik, kab/kota, atau kecamatan..."
        @keyup.enter="loadLands"
      />
      <button type="button" class="btn-muted" @click="loadLands">Search</button>
      <button type="button" class="btn-muted" @click="loadLands">Refresh</button>
      <button type="button" class="btn-primary" @click="goToCreate">Tambah Lahan</button>
    </div>

    <p v-if="loading" class="text-sm text-emerald-100/80">Memuat data lahan dari API...</p>

    <div v-else-if="error" class="rounded-xl border border-red-300/40 bg-red-500/10 px-4 py-3 text-sm text-red-100">
      {{ error }}
    </div>

    <div v-else-if="!filteredLands.length" class="rounded-2xl border border-white/10 bg-black/20 px-4 py-6 text-sm text-emerald-100/80">
      Data lahan tidak ditemukan untuk kata kunci tersebut.
    </div>

    <div v-else class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <article v-for="land in paginatedLands" :key="land.id" class="rounded-2xl border border-white/10 bg-linear-to-br from-white/8 to-white/3 p-4">
        <div class="space-y-2">
          <p class="text-xs text-emerald-100/75">ID: {{ land.id }}</p>
          <h3 class="text-lg font-bold text-white">{{ land.kode }}</h3>
          <p class="text-sm text-emerald-100/85">Pemilik: {{ land.pemilik_nama || '-' }}</p>
        </div>

        <div class="mt-4 grid gap-2 text-xs text-emerald-100/90">
          <p class="rounded-lg bg-black/20 px-3 py-2">Luas: {{ land.luas ?? '-' }} ha</p>
          <p class="rounded-lg bg-black/20 px-3 py-2">Elevasi: {{ land.elevasi ?? '-' }} mdpl</p>
          <p class="rounded-lg bg-black/20 px-3 py-2">Kepemilikan: {{ land.kepemilikan || '-' }}</p>
          <p class="rounded-lg bg-black/20 px-3 py-2">Kab/Kota: {{ land.kabupaten_kota || '-' }}</p>
          <p class="rounded-lg bg-black/20 px-3 py-2">Kecamatan: {{ land.kecamatan || '-' }}</p>
          <p class="rounded-lg bg-black/20 px-3 py-2">Desa: {{ land.desa_kelurahan || '-' }}</p>
        </div>

        <div class="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <button type="button" class="icon-action w-full justify-center sm:w-auto" @click="goToDetail(land.id)">Detail</button>
          <button type="button" class="icon-action w-full justify-center sm:w-auto" @click="goToEdit(land.id)">Edit</button>
          <button
            type="button"
            class="icon-action w-full justify-center border-red-300/40 text-red-100 hover:border-red-300/60 hover:bg-red-500/20 sm:w-auto"
            :disabled="deletingId === land.id"
            @click="deleteLand(land)"
          >
            {{ deletingId === land.id ? 'Menghapus...' : 'Hapus' }}
          </button>
        </div>
      </article>
    </div>

    <div v-if="filteredLands.length" class="flex flex-col gap-3 rounded-xl border border-white/10 bg-black/20 px-4 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
      <p class="text-sm text-emerald-100/85">Menampilkan {{ pageInfo }}</p>

      <div class="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <label class="text-sm text-emerald-100/85" for="pageSize">Per halaman</label>
        <select id="pageSize" v-model.number="pageSize" class="field" @change="onChangePageSize">
          <option :value="6">6</option>
          <option :value="9">9</option>
          <option :value="12">12</option>
        </select>

        <button type="button" class="btn-muted" :disabled="currentPage <= 1" @click="goToPrevPage">Sebelumnya</button>
        <span class="px-2 text-sm text-emerald-100/85">Halaman {{ currentPage }} / {{ totalPages }}</span>
        <button type="button" class="btn-muted" :disabled="currentPage >= totalPages" @click="goToNextPage">Berikutnya</button>
      </div>
    </div>
  </section>
</template>
