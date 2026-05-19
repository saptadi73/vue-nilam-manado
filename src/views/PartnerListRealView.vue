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

const router = useRouter()
const toast = useToast()

const loading = ref(false)
const error = ref('')
const deletingId = ref('')

const searchTerm = ref('')
const items = ref([])

let searchTimer = null

const filteredItems = computed(() => {
  const keyword = String(searchTerm.value ?? '').trim().toLowerCase()
  if (!keyword) return items.value

  return items.value.filter((item) => {
    const source = `${item?.nama ?? ''} ${item?.alamat ?? ''} ${item?.hp ?? ''} ${item?.email ?? ''} ${item?.pic ?? ''}`.toLowerCase()
    return source.includes(keyword)
  })
})

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
  searchTimer = setTimeout(loadItems, 300)
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
      <ActionButton full-width @click="goToCreate">Tambah Mitra</ActionButton>
      <ActionButton variant="muted" full-width @click="loadItems">Refresh</ActionButton>
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
          <tr v-for="item in filteredItems" :key="item.id" class="border-t border-white/10">
            <td class="p-2 font-semibold">{{ item.nama }}</td>
            <td class="p-2">{{ item.pic || '-' }}</td>
            <td class="p-2">{{ item.hp || '-' }}</td>
            <td class="p-2">{{ item.email || '-' }}</td>
            <td class="p-2">{{ item.alamat || '-' }}</td>
            <td class="p-2">{{ [item.kecamatan, item.kabupaten_kota, item.provinsi].filter(Boolean).join(', ') || '-' }}</td>
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
