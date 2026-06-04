<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import ActionButton from '@/components/ActionButton.vue'
import DataToolbar from '@/components/DataToolbar.vue'
import PaginationBar from '@/components/PaginationBar.vue'
import SectionHeader from '@/components/SectionHeader.vue'
import ListLoadingState from '@/components/ListLoadingState.vue'
import PageState from '@/components/PageState.vue'
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

const updatePageSize = (value) => {
  pageSize.value = value
  onChangePageSize()
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

    <DataToolbar>
      <input
        v-model="searchTerm"
        type="text"
        class="field min-w-64 flex-1"
        placeholder="Cari kode lahan, pemilik, kab/kota, atau kecamatan..."
        @keyup.enter="loadLands"
      />
      <ActionButton variant="muted" @click="loadLands">Search</ActionButton>
      <ActionButton variant="muted" @click="loadLands">Refresh</ActionButton>
      <ActionButton variant="primary" @click="goToCreate">Tambah Lahan</ActionButton>
    </DataToolbar>

    <ListLoadingState v-if="loading" :card-count="6" />

    <PageState
      v-else-if="error"
      variant="error"
      title="Data lahan belum berhasil dimuat"
      :description="error"
      action-label="Coba Lagi"
      @action="loadLands"
    />

    <PageState
      v-else-if="!filteredLands.length"
      title="Data lahan tidak ditemukan"
      description="Belum ada lahan yang cocok dengan kata kunci saat ini. Coba kata kunci lain atau refresh data."
      action-label="Refresh Data"
      @action="loadLands"
    />

    <div v-else class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <article v-for="land in paginatedLands" :key="land.id" class="rounded-2xl border border-white/10 bg-linear-to-br from-white/8 to-white/3 p-4">
        <div class="space-y-2">
          <p class="text-xs text-emerald-100/75">ID: {{ land.id }}</p>
          <h3 class="text-lg font-bold text-white">{{ land.kode }}</h3>
          <p class="text-sm text-emerald-100/85">Pemilik: {{ land.pemilik_nama || '-' }}</p>
        </div>

        <div class="mt-4 grid gap-2 text-xs text-emerald-100/90">
          <p class="rounded-lg bg-black/20 px-3 py-2">Luas: {{ land.luas ?? '-' }} M²</p>
          <p class="rounded-lg bg-black/20 px-3 py-2">Elevasi: {{ land.elevasi ?? '-' }} mdpl</p>
          <p class="rounded-lg bg-black/20 px-3 py-2">Kepemilikan: {{ land.kepemilikan || '-' }}</p>
          <p class="rounded-lg bg-black/20 px-3 py-2">Kab/Kota: {{ land.kabupaten_kota || '-' }}</p>
          <p class="rounded-lg bg-black/20 px-3 py-2">Kecamatan: {{ land.kecamatan || '-' }}</p>
          <p class="rounded-lg bg-black/20 px-3 py-2">Desa: {{ land.desa_kelurahan || '-' }}</p>
        </div>

        <div class="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <ActionButton full-width @click="goToDetail(land.id)">Detail</ActionButton>
          <ActionButton full-width @click="goToEdit(land.id)">Edit</ActionButton>
          <ActionButton
            variant="danger"
            full-width
            :disabled="deletingId === land.id"
            @click="deleteLand(land)"
          >
            {{ deletingId === land.id ? 'Menghapus...' : 'Hapus' }}
          </ActionButton>
        </div>
      </article>
    </div>

    <PaginationBar
      v-if="filteredLands.length"
      :summary="`Menampilkan ${pageInfo}`"
      :page="currentPage"
      :total-pages="totalPages"
      :page-size="pageSize"
      :page-size-options="[6, 9, 12]"
      show-page-size
      @prev="goToPrevPage"
      @next="goToNextPage"
      @update:page-size="updatePageSize"
    />
  </section>
</template>
