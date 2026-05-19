<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import ActionButton from '@/components/ActionButton.vue'
import DataToolbar from '@/components/DataToolbar.vue'
import ListLoadingState from '@/components/ListLoadingState.vue'
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
  searchTimer = setTimeout(loadItems, 300)
})

watch(jenisFilter, loadItems)

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

      <ActionButton full-width @click="goToCreate">Tambah Produk Penjualan</ActionButton>
      <ActionButton variant="muted" full-width @click="loadItems">Refresh</ActionButton>
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
          <tr v-for="item in filteredItems" :key="item.id" class="border-t border-white/10">
            <td class="p-2 font-semibold">{{ item.nama }}</td>
            <td class="p-2 uppercase">{{ item.jenis || '-' }}</td>
            <td class="p-2">{{ fmtCurrency(Number(item.harga ?? 0)) }}</td>
            <td class="p-2">{{ item.satuan || '-' }}</td>
            <td class="p-2">{{ item.deskripsi || '-' }}</td>
            <td class="p-2">
              <div class="flex flex-wrap gap-2">
                <ActionButton @click="goToEdit(item.id)">Edit</ActionButton>
                <ActionButton
                  variant="danger"
                  :disabled="deletingId === item.id"
                  @click="deleteItem(item)"
                >
                  {{ deletingId === item.id ? 'Menghapus...' : 'Hapus' }}
                </ActionButton>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
