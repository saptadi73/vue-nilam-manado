<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import ActionButton from '@/components/ActionButton.vue'
import DataToolbar from '@/components/DataToolbar.vue'
import PaginationBar from '@/components/PaginationBar.vue'
import SectionHeader from '@/components/SectionHeader.vue'
import ListLoadingState from '@/components/ListLoadingState.vue'
import PageState from '@/components/PageState.vue'
import { realErpService } from '@/services/realErpService'
import { useToast } from '@/composables/useToast'
import { fmtCurrency, fmtNumber } from '@/utils/formatters'

const toast = useToast()
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const loading = ref(false)
const error = ref('')
const deletingId = ref('')
const saving = ref(false)

const items = ref([])
const totalExpense = ref(0)
const farmers = ref([])
const products = ref([])

const searchTerm = ref('')
const farmerFilter = ref('')
const productFilter = ref('')
const startDateFilter = ref('')
const endDateFilter = ref('')

const pageSize = ref(9)
const currentPage = ref(1)

const formOpen = ref(false)
const formError = ref('')
const form = ref({
  id: '',
  nama: '',
  tanggal: '',
  deskripsi: '',
  produk_id: '',
  harga: 0,
  quantity: 1,
  petani_id: '',
  planting_production_id: '',
  oil_production_id: '',
  paid_by: '',
})

let searchTimer = null

const totalPages = computed(() => Math.max(1, Math.ceil(items.value.length / pageSize.value)))
const paginatedItems = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return items.value.slice(start, start + pageSize.value)
})

watch([() => items.value.length, pageSize], () => {
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

const resetFilters = async () => {
  searchTerm.value = ''
  farmerFilter.value = ''
  productFilter.value = ''
  startDateFilter.value = ''
  endDateFilter.value = ''
  currentPage.value = 1
  await loadItems()
}

const loadMeta = async () => {
  const [farmerData, productData] = await Promise.all([
    realErpService.getFarmers(),
    realErpService.getFinancingProducts(),
  ])

  farmers.value = Array.isArray(farmerData) ? farmerData : []
  products.value = Array.isArray(productData) ? productData : []
}

const buildQuery = () => {
  const query = {}
  const search = String(searchTerm.value ?? '').trim()
  if (search) query.search = search
  if (farmerFilter.value) query.petani_id = farmerFilter.value
  if (productFilter.value) query.produk_id = productFilter.value
  if (startDateFilter.value) query.tanggal_mulai = startDateFilter.value
  if (endDateFilter.value) query.tanggal_akhir = endDateFilter.value
  return query
}

const loadItems = async () => {
  loading.value = true
  error.value = ''

  try {
    const data = await realErpService.getFinancings(buildQuery())
    items.value = Array.isArray(data?.items) ? data.items : []
    totalExpense.value = Number(data?.total_sub_total ?? 0)
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Gagal memuat data expense.'
    items.value = []
    totalExpense.value = 0
  } finally {
    loading.value = false
  }
}

const refreshAll = async () => {
  await Promise.all([loadMeta(), loadItems()])
}

const resetForm = () => {
  form.value = {
    id: '',
    nama: '',
    tanggal: '',
    deskripsi: '',
    produk_id: '',
    harga: 0,
    quantity: 1,
    petani_id: farmerFilter.value || '',
    planting_production_id: '',
    oil_production_id: '',
    paid_by: '',
  }
}

const openCreateForm = () => {
  resetForm()
  formError.value = ''
  formOpen.value = true
}

const openEditForm = (item) => {
  form.value = {
    id: item.id,
    nama: item.nama ?? '',
    tanggal: item.tanggal ?? '',
    deskripsi: item.deskripsi ?? '',
    produk_id: item.produk_id ?? '',
    harga: Number(item.harga ?? 0),
    quantity: Number(item.quantity ?? 1),
    petani_id: item.petani_id ?? '',
    planting_production_id: item.planting_production_id ?? '',
    oil_production_id: item.oil_production_id ?? '',
    paid_by: item.paid_by ?? '',
  }
  formError.value = ''
  formOpen.value = true
}

const closeForm = () => {
  formOpen.value = false
  formError.value = ''
}

const onOverlayClose = (event) => {
  if (event.target === event.currentTarget) closeForm()
}

const validateForm = () => {
  const nama = String(form.value.nama ?? '').trim()
  const tanggal = String(form.value.tanggal ?? '').trim()
  const petaniId = String(form.value.petani_id ?? '').trim()
  const produkId = String(form.value.produk_id ?? '').trim()
  const harga = Number(form.value.harga)
  const quantity = Number(form.value.quantity)

  if (!nama) return 'Nama expense wajib diisi.'
  if (nama.length > 150) return 'Nama expense maksimal 150 karakter.'
  if (!ISO_DATE_REGEX.test(tanggal)) return 'Tanggal expense wajib format YYYY-MM-DD.'
  if (!petaniId) return 'Petani wajib dipilih.'
  if (!produkId) return 'Produk pembiayaan wajib dipilih.'
  if (!Number.isFinite(harga) || harga < 0) return 'Harga harus angka dan tidak boleh negatif.'
  if (!Number.isFinite(quantity) || quantity <= 0) return 'Quantity harus lebih dari 0.'

  if (!farmers.value.some((item) => item.id === petaniId)) {
    return 'Petani tidak valid. Silakan pilih ulang.'
  }

  if (!products.value.some((item) => item.id === produkId)) {
    return 'Produk pembiayaan tidak valid. Silakan pilih ulang.'
  }

  const plantingId = String(form.value.planting_production_id ?? '').trim()
  const oilId = String(form.value.oil_production_id ?? '').trim()

  if (plantingId && !UUID_REGEX.test(plantingId)) {
    return 'Planting production ID harus format UUID yang valid.'
  }

  if (oilId && !UUID_REGEX.test(oilId)) {
    return 'Oil production ID harus format UUID yang valid.'
  }

  return ''
}

const saveItem = async () => {
  const validationError = validateForm()
  if (validationError) {
    formError.value = validationError
    toast.error(validationError)
    return
  }

  saving.value = true
  formError.value = ''

  try {
    const payload = {
      nama: String(form.value.nama ?? '').trim(),
      tanggal: String(form.value.tanggal ?? '').trim(),
      deskripsi: String(form.value.deskripsi ?? '').trim() || null,
      produk_id: String(form.value.produk_id ?? '').trim(),
      harga: Number(form.value.harga),
      quantity: Number(form.value.quantity),
      petani_id: String(form.value.petani_id ?? '').trim(),
      planting_production_id: String(form.value.planting_production_id ?? '').trim() || null,
      oil_production_id: String(form.value.oil_production_id ?? '').trim() || null,
      paid_by: String(form.value.paid_by ?? '').trim() || null,
    }

    if (form.value.id) {
      await realErpService.updateFinancing(form.value.id, payload)
      toast.success('Expense berhasil diperbarui.')
    } else {
      await realErpService.createFinancing(payload)
      toast.success('Expense berhasil ditambahkan.')
    }

    closeForm()
    await loadItems()
  } catch (err) {
    formError.value = err instanceof Error ? err.message : 'Gagal menyimpan expense.'
  } finally {
    saving.value = false
  }
}

const deleteItem = async (item) => {
  const ok = window.confirm(`Hapus expense ${item.nama}?`)
  if (!ok) return

  deletingId.value = item.id
  try {
    await realErpService.deleteFinancing(item.id)
    toast.success('Expense berhasil dihapus.')
    await loadItems()
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Gagal menghapus expense.'
    error.value = message
    toast.error(message)
  } finally {
    deletingId.value = ''
  }
}

watch(searchTerm, () => {
  clearTimeout(searchTimer)
  currentPage.value = 1
  searchTimer = setTimeout(() => {
    loadItems()
  }, 300)
})

watch([farmerFilter, productFilter, startDateFilter, endDateFilter], async () => {
  currentPage.value = 1
  await loadItems()
})

onMounted(refreshAll)
</script>

<template>
  <section class="space-y-6">
    <SectionHeader
      eyebrow="Real API"
      title="List Expense"
      description="Daftar pembiayaan/expense dengan fitur search, pagination, dan CRUD langsung ke endpoint financings."
    />

    <DataToolbar content-class="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      <input v-model="searchTerm" class="field w-full" type="text" placeholder="Cari nama, deskripsi, atau nominal..." />

      <select v-model="farmerFilter" class="field w-full">
        <option value="">Semua Petani</option>
        <option v-for="farmer in farmers" :key="farmer.id" :value="farmer.id">{{ farmer.nama }}</option>
      </select>

      <select v-model="productFilter" class="field w-full">
        <option value="">Semua Produk Expense</option>
        <option v-for="product in products" :key="product.id" :value="product.id">{{ product.nama }}</option>
      </select>

      <input v-model="startDateFilter" type="date" class="field w-full" />
      <input v-model="endDateFilter" type="date" class="field w-full" />

      <select v-model.number="pageSize" class="field w-full">
        <option :value="6">6 per halaman</option>
        <option :value="9">9 per halaman</option>
        <option :value="12">12 per halaman</option>
      </select>

      <div class="flex flex-col gap-2 sm:flex-row xl:col-span-4">
        <ActionButton variant="primary" full-width @click="openCreateForm">Tambah Expense</ActionButton>
        <ActionButton variant="muted" full-width @click="loadItems">Refresh</ActionButton>
        <ActionButton variant="muted" full-width @click="resetFilters">Reset Filter</ActionButton>
      </div>
    </DataToolbar>

    <div class="grid gap-4 md:grid-cols-3">
      <article class="rounded-2xl border border-white/10 bg-white/4 p-4">
        <p class="text-xs uppercase tracking-widest text-emerald-100/70">Total Data</p>
        <p class="mt-2 text-2xl font-semibold text-white">{{ fmtNumber(items.length) }}</p>
      </article>
      <article class="rounded-2xl border border-white/10 bg-white/4 p-4">
        <p class="text-xs uppercase tracking-widest text-emerald-100/70">Total Sub Total</p>
        <p class="mt-2 text-2xl font-semibold text-white">{{ fmtCurrency(totalExpense) }}</p>
      </article>
      <article class="rounded-2xl border border-white/10 bg-white/4 p-4">
        <p class="text-xs uppercase tracking-widest text-emerald-100/70">Halaman</p>
        <p class="mt-2 text-2xl font-semibold text-white">{{ currentPage }} / {{ totalPages }}</p>
      </article>
    </div>

    <ListLoadingState v-if="loading" variant="table" :row-count="6" :column-count="8" />

    <PageState
      v-else-if="error"
      variant="error"
      title="Data expense belum berhasil dimuat"
      :description="error"
      action-label="Coba Lagi"
      @action="loadItems"
    />

    <PageState
      v-else-if="!items.length"
      title="Data expense tidak ditemukan"
      description="Belum ada expense yang sesuai dengan filter sekarang. Coba ubah filter atau refresh data dari backend."
      action-label="Refresh Data"
      @action="loadItems"
    />

    <div v-else class="overflow-auto rounded-2xl border border-white/10 bg-black/20 p-2">
      <table class="w-full min-w-220 text-left text-sm text-emerald-50/90">
        <thead class="text-emerald-100">
          <tr>
            <th class="p-2">Tanggal</th>
            <th class="p-2">Nama Expense</th>
            <th class="p-2">Petani</th>
            <th class="p-2">Produk</th>
            <th class="p-2">Harga</th>
            <th class="p-2">Qty</th>
            <th class="p-2">Sub Total</th>
            <th class="p-2">Aksi</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in paginatedItems" :key="item.id" class="border-t border-white/10">
            <td class="p-2">{{ item.tanggal }}</td>
            <td class="p-2">{{ item.nama }}</td>
            <td class="p-2">{{ item.petani?.nama || '-' }}</td>
            <td class="p-2">{{ item.produk?.nama || '-' }}</td>
            <td class="p-2">{{ fmtCurrency(Number(item.harga ?? 0)) }}</td>
            <td class="p-2">{{ fmtNumber(Number(item.quantity ?? 0)) }}</td>
            <td class="p-2">{{ fmtCurrency(Number(item.sub_total ?? 0)) }}</td>
            <td class="p-2">
              <div class="flex flex-wrap gap-2">
                <ActionButton @click="openEditForm(item)">Edit</ActionButton>
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

    <PaginationBar
      v-if="items.length"
      :summary="`Menampilkan ${paginatedItems.length} dari ${items.length} data`"
      :page="currentPage"
      :total-pages="totalPages"
      @prev="goToPrevPage"
      @next="goToNextPage"
    />

    <div v-if="formOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" @click="onOverlayClose">
      <div class="w-full max-w-2xl rounded-2xl border border-white/10 bg-[#0a2f29] p-5">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-semibold text-white">{{ form.id ? 'Edit Expense' : 'Tambah Expense' }}</h3>
          <ActionButton variant="muted" @click="closeForm">Tutup</ActionButton>
        </div>

        <div v-if="formError" class="mt-3 rounded-xl border border-red-300/40 bg-red-500/10 px-4 py-3 text-sm text-red-100">
          {{ formError }}
        </div>

        <form class="mt-4 grid gap-3 md:grid-cols-2" @submit.prevent="saveItem">
          <input v-model="form.nama" class="field" type="text" placeholder="Nama expense" required />
          <input v-model="form.tanggal" class="field" type="date" required />

          <select v-model="form.petani_id" class="field" required>
            <option value="" disabled>Pilih petani</option>
            <option v-for="farmer in farmers" :key="farmer.id" :value="farmer.id">{{ farmer.nama }}</option>
          </select>

          <select v-model="form.produk_id" class="field" required>
            <option value="" disabled>Pilih produk pembiayaan</option>
            <option v-for="product in products" :key="product.id" :value="product.id">{{ product.nama }}</option>
          </select>

          <input v-model.number="form.harga" class="field" type="number" min="0" step="1" placeholder="Harga" required />
          <input v-model.number="form.quantity" class="field" type="number" min="1" step="1" placeholder="Quantity" required />

          <input v-model="form.planting_production_id" class="field" type="text" placeholder="Planting production ID (opsional)" />
          <input v-model="form.oil_production_id" class="field" type="text" placeholder="Oil production ID (opsional)" />

          <input v-model="form.paid_by" class="field md:col-span-2" type="text" placeholder="Dibayar oleh (opsional)" />
          <textarea v-model="form.deskripsi" class="field md:col-span-2" rows="3" placeholder="Deskripsi (opsional)" />

          <div class="md:col-span-2 flex justify-end gap-2">
            <ActionButton variant="muted" @click="closeForm">Batal</ActionButton>
            <button type="submit" class="btn-primary" :disabled="saving">{{ saving ? 'Menyimpan...' : 'Simpan' }}</button>
          </div>
        </form>
      </div>
    </div>
  </section>
</template>
