<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Pencil, Plus, RefreshCw, Trash2 } from '@lucide/vue'
import ActionButton from '@/components/ActionButton.vue'
import DataToolbar from '@/components/DataToolbar.vue'
import ListLoadingState from '@/components/ListLoadingState.vue'
import PaginationBar from '@/components/PaginationBar.vue'
import PageState from '@/components/PageState.vue'
import SectionHeader from '@/components/SectionHeader.vue'
import { useToast } from '@/composables/useToast'
import { realErpService } from '@/services/realErpService'

const router = useRouter()
const toast = useToast()

const loading = ref(false)
const error = ref('')
const deletingId = ref('')

const searchTerm = ref('')
const items = ref([])
const currentPage = ref(1)
const pageSize = ref(10)

let searchTimer = null

const filteredItems = computed(() => {
  const keyword = String(searchTerm.value ?? '').trim().toLowerCase()
  if (!keyword) return items.value

  return items.value.filter((item) => {
    const source = `${item?.nama ?? ''} ${item?.alamat ?? ''} ${item?.hp ?? ''} ${item?.email ?? ''} ${item?.pic ?? ''}`.toLowerCase()
    return source.includes(keyword)
  })
})

const totalItems = computed(() => filteredItems.value.length)
const totalPages = computed(() => Math.max(1, Math.ceil(totalItems.value / pageSize.value)))
const pageStart = computed(() => (currentPage.value - 1) * pageSize.value)
const pageEnd = computed(() => Math.min(pageStart.value + pageSize.value, totalItems.value))
const paginatedItems = computed(() => filteredItems.value.slice(pageStart.value, pageEnd.value))

const goToPrevPage = () => {
  if (currentPage.value > 1) currentPage.value -= 1
}

const goToNextPage = () => {
  if (currentPage.value < totalPages.value) currentPage.value += 1
}

const updatePageSize = (value) => {
  pageSize.value = value
  currentPage.value = 1
}

const loadItems = async () => {
  loading.value = true
  error.value = ''

  try {
    const data = await realErpService.getPartners({ search: searchTerm.value.trim() })
    items.value = Array.isArray(data) ? data : []
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Gagal memuat data mitra.'
    items.value = []
  } finally {
    loading.value = false
  }
}

const goToCreate = () => {
  router.push('/real/mitra/new')
}

const goToEdit = (id) => {
  router.push(`/real/mitra/${id}/edit`)
}

const deleteItem = async (item) => {
  const ok = window.confirm(`Hapus mitra ${item.nama}?`)
  if (!ok) return

  deletingId.value = item.id
  try {
    await realErpService.deletePartner(item.id)
    toast.success('Mitra berhasil dihapus.')
    await loadItems()
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Gagal menghapus mitra.'
    toast.error(message)
  } finally {
    deletingId.value = ''
  }
}

watch(searchTerm, () => {
  clearTimeout(searchTimer)
  currentPage.value = 1
  searchTimer = setTimeout(loadItems, 300)
})

watch(totalItems, () => {
  if (currentPage.value > totalPages.value) currentPage.value = totalPages.value
})

onMounted(loadItems)
</script>

<template>
  <section class="space-y-6">
    <SectionHeader
      eyebrow="Master Data"
      title="List Data Mitra"
      description="Kelola data partner pembeli/distributor untuk alur transaksi penjualan."
    />

    <DataToolbar content-class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <input v-model="searchTerm" class="field w-full" type="text" placeholder="Cari nama, alamat, PIC, email..." />
      <ActionButton full-width @click="goToCreate">
        <Plus :size="16" aria-hidden="true" />
        Tambah Mitra
      </ActionButton>
      <ActionButton variant="muted" full-width @click="loadItems">
        <RefreshCw :size="16" aria-hidden="true" />
        Refresh
      </ActionButton>
    </DataToolbar>

    <ListLoadingState v-if="loading" variant="table" :row-count="5" :column-count="6" />

    <PageState
      v-else-if="error"
      variant="error"
      title="Data mitra belum berhasil dimuat"
      :description="error"
      action-label="Coba Lagi"
      @action="loadItems"
    />

    <PageState
      v-else-if="!filteredItems.length"
      title="Data mitra belum tersedia"
      description="Tambahkan mitra baru untuk dipakai pada transaksi penjualan."
      action-label="Tambah Mitra"
      @action="goToCreate"
    />

    <div v-else class="overflow-auto rounded-2xl border border-white/10 bg-black/20 p-2">
      <table class="w-full min-w-220 text-left text-sm text-emerald-50/90">
        <thead class="text-emerald-100">
          <tr>
            <th class="p-2">Nama</th>
            <th class="p-2">PIC</th>
            <th class="p-2">HP</th>
            <th class="p-2">Email</th>
            <th class="p-2">Alamat</th>
            <th class="p-2">Wilayah</th>
            <th class="p-2">Aksi</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in paginatedItems" :key="item.id" class="border-t border-white/10">
            <td class="p-2 font-semibold">{{ item.nama }}</td>
            <td class="p-2">{{ item.pic || '-' }}</td>
            <td class="p-2">{{ item.hp || '-' }}</td>
            <td class="p-2">{{ item.email || '-' }}</td>
            <td class="p-2">{{ item.alamat || '-' }}</td>
            <td class="p-2">{{ [item.kecamatan, item.kabupaten_kota, item.provinsi].filter(Boolean).join(', ') || '-' }}</td>
            <td class="p-2">
              <div class="flex flex-nowrap gap-2">
                <ActionButton class="justify-center" @click="goToEdit(item.id)">
                  <Pencil :size="16" aria-hidden="true" />
                  Edit
                </ActionButton>
                <ActionButton
                  variant="danger"
                  :disabled="deletingId === item.id"
                  @click="deleteItem(item)"
                >
                  <Trash2 :size="16" aria-hidden="true" />
                  {{ deletingId === item.id ? '...' : 'Hapus' }}
                </ActionButton>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <PaginationBar
      v-if="filteredItems.length"
      :summary="`Menampilkan ${pageStart + 1}-${pageEnd} dari ${totalItems} mitra`"
      :page="currentPage"
      :total-pages="totalPages"
      :page-size="pageSize"
      :page-size-options="[5, 10, 20]"
      show-page-size
      @prev="goToPrevPage"
      @next="goToNextPage"
      @update:page-size="updatePageSize"
    />
  </section>
</template>
