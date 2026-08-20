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
import { fmtCurrency } from '@/utils/formatters'

const router = useRouter()
const toast = useToast()

const loading = ref(false)
const error = ref('')
const deletingId = ref('')

const items = ref([])
const searchTerm = ref('')
const jenisFilter = ref('')
const currentPage = ref(1)
const pageSize = ref(10)

let searchTimer = null

const filteredItems = computed(() => {
  const keyword = String(searchTerm.value ?? '').trim().toLowerCase()
  const jenis = String(jenisFilter.value ?? '').trim()

  return items.value.filter((item) => {
    const matchesJenis = !jenis || item?.jenis === jenis
    const source = `${item?.nama ?? ''} ${item?.jenis ?? ''} ${item?.satuan ?? ''} ${item?.deskripsi ?? ''}`.toLowerCase()
    const matchesKeyword = !keyword || source.includes(keyword)
    return matchesJenis && matchesKeyword
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
    const query = {
      search: searchTerm.value.trim(),
      jenis: jenisFilter.value,
    }
    const data = await realErpService.getSalesProducts(query)
    items.value = Array.isArray(data) ? data : []
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Gagal memuat produk penjualan.'
    items.value = []
  } finally {
    loading.value = false
  }
}

const goToCreate = () => {
  router.push('/real/produk-penjualan/new')
}

const goToEdit = (id) => {
  router.push(`/real/produk-penjualan/${id}/edit`)
}

const deleteItem = async (item) => {
  const ok = window.confirm(`Hapus produk penjualan ${item.nama}?`)
  if (!ok) return

  deletingId.value = item.id
  try {
    await realErpService.deleteSalesProduct(item.id)
    toast.success('Produk penjualan berhasil dihapus.')
    await loadItems()
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Gagal menghapus produk penjualan.'
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

watch(jenisFilter, () => {
  currentPage.value = 1
  loadItems()
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
      title="List Produk Penjualan"
      description="Kelola master produk penjualan jenis barang dan jasa."
    />

    <DataToolbar content-class="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      <input v-model="searchTerm" class="field w-full" type="text" placeholder="Cari nama/satuan/deskripsi..." />

      <select v-model="jenisFilter" class="field w-full">
        <option value="">Semua Jenis</option>
        <option value="barang">Barang</option>
        <option value="jasa">Jasa</option>
      </select>

      <ActionButton full-width @click="goToCreate">
        <Plus :size="16" aria-hidden="true" />
        Tambah Produk Penjualan
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
      title="Produk penjualan belum berhasil dimuat"
      :description="error"
      action-label="Coba Lagi"
      @action="loadItems"
    />

    <PageState
      v-else-if="!filteredItems.length"
      title="Produk penjualan belum tersedia"
      description="Tambahkan produk/jasa baru untuk transaksi penjualan."
      action-label="Tambah Produk"
      @action="goToCreate"
    />

    <div v-else class="overflow-auto rounded-2xl border border-white/10 bg-black/20 p-2">
      <table class="w-full min-w-180 text-left text-sm text-emerald-50/90">
        <thead class="text-emerald-100">
          <tr>
            <th class="p-2">Nama</th>
            <th class="p-2">Jenis</th>
            <th class="p-2">Harga</th>
            <th class="p-2">Satuan</th>
            <th class="p-2">Deskripsi</th>
            <th class="p-2">Aksi</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in paginatedItems" :key="item.id" class="border-t border-white/10">
            <td class="p-2 font-semibold">{{ item.nama }}</td>
            <td class="p-2 uppercase">{{ item.jenis || '-' }}</td>
            <td class="p-2">{{ fmtCurrency(Number(item.harga ?? 0)) }}</td>
            <td class="p-2">{{ item.satuan || '-' }}</td>
            <td class="p-2">{{ item.deskripsi || '-' }}</td>
            <td class="p-2">
              <div class="flex flex-nowrap gap-2">
                <ActionButton @click="goToEdit(item.id)">
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
      :summary="`Menampilkan ${pageStart + 1}-${pageEnd} dari ${totalItems} produk`"
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
