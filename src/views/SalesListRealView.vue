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

const loading = ref(false)
const error = ref('')
const deletingId = ref('')
const saving = ref(false)

const items = ref([])
const totalSales = ref(0)
const farmers = ref([])
const partners = ref([])
const products = ref([])

const searchTerm = ref('')
const sellerFilter = ref('')
const buyerFilter = ref('')
const productFilter = ref('')
const startDateFilter = ref('')
const endDateFilter = ref('')

const pageSize = ref(9)
const currentPage = ref(1)

const formOpen = ref(false)
const formError = ref('')
const useDefaultPrice = ref(true)
const form = ref({
  id: '',
  nama: '',
  tanggal: '',
  deskripsi: '',
  produk_penjualan_id: '',
  harga: 0,
  quantity: 1,
  penjual_id: '',
  pembeli_id: '',
})

let searchTimer = null

const totalPages = computed(() => Math.max(1, Math.ceil(items.value.length / pageSize.value)))
const paginatedItems = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return items.value.slice(start, start + pageSize.value)
})

const activeFilterChips = computed(() => {
  const chips = []
  const search = String(searchTerm.value ?? '').trim()

  if (search) chips.push(`Cari: ${search}`)

  if (sellerFilter.value) {
    const farmer = farmers.value.find((item) => item.id === sellerFilter.value)
    chips.push(`Penjual: ${farmer?.nama || 'Dipilih'}`)
  }

  if (buyerFilter.value) {
    const partner = partners.value.find((item) => item.id === buyerFilter.value)
    chips.push(`Pembeli: ${partner?.nama || 'Dipilih'}`)
  }

  if (productFilter.value) {
    const product = products.value.find((item) => item.id === productFilter.value)
    chips.push(`Produk: ${product?.nama || 'Dipilih'}`)
  }

  if (startDateFilter.value || endDateFilter.value) {
    chips.push(`Periode: ${startDateFilter.value || '...'} s/d ${endDateFilter.value || '...'}`)
  }

  return chips
})

const selectedProductDefaultPrice = computed(() => {
  const id = String(form.value.produk_penjualan_id ?? '').trim()
  if (!id) return 0
  const product = products.value.find((item) => item.id === id)
  return Number(product?.harga ?? 0)
})

const isAutoPriceActive = computed(() => {
  const isCreateMode = !form.value.id
  const selectedProductId = String(form.value.produk_penjualan_id ?? '').trim()
  const currentPrice = Number(form.value.harga)

  if (!isCreateMode) return false
  if (!selectedProductId) return false
  if (selectedProductDefaultPrice.value <= 0) return false

  return currentPrice === selectedProductDefaultPrice.value
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
  sellerFilter.value = ''
  buyerFilter.value = ''
  productFilter.value = ''
  startDateFilter.value = ''
  endDateFilter.value = ''
  currentPage.value = 1
  await loadItems()
}

const loadMeta = async () => {
  const [farmerData, partnerData, productData] = await Promise.all([
    realErpService.getFarmers(),
    realErpService.getPartners(),
    realErpService.getSalesProducts(),
  ])

  farmers.value = Array.isArray(farmerData) ? farmerData : []
  partners.value = Array.isArray(partnerData) ? partnerData : []
  products.value = Array.isArray(productData) ? productData : []
}

const buildQuery = () => {
  const query = {}
  const search = String(searchTerm.value ?? '').trim()
  if (search) query.search = search
  if (sellerFilter.value) query.penjual_id = sellerFilter.value
  if (buyerFilter.value) query.pembeli_id = buyerFilter.value
  if (productFilter.value) query.produk_penjualan_id = productFilter.value
  if (startDateFilter.value) query.tanggal_mulai = startDateFilter.value
  if (endDateFilter.value) query.tanggal_akhir = endDateFilter.value
  return query
}

const loadItems = async () => {
  loading.value = true
  error.value = ''

  try {
    const data = await realErpService.getSales(buildQuery())
    const list = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : []

    items.value = list

    const backendTotal = Number(data?.total_sub_total ?? data?.total_penjualan ?? 0)
    totalSales.value = backendTotal > 0
      ? backendTotal
      : list.reduce((acc, item) => acc + Number(item?.sub_total ?? 0), 0)
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Gagal memuat data penjualan.'
    items.value = []
    totalSales.value = 0
  } finally {
    loading.value = false
  }
}

const refreshAll = async () => {
  await Promise.all([loadMeta(), loadItems()])
}

const resetForm = () => {
  useDefaultPrice.value = true
  form.value = {
    id: '',
    nama: '',
    tanggal: '',
    deskripsi: '',
    produk_penjualan_id: '',
    harga: 0,
    quantity: 1,
    penjual_id: sellerFilter.value || '',
    pembeli_id: buyerFilter.value || '',
  }
}

const openCreateForm = () => {
  resetForm()
  formError.value = ''
  formOpen.value = true
}

const openEditForm = (item) => {
  useDefaultPrice.value = false
  form.value = {
    id: item.id,
    nama: item.nama ?? '',
    tanggal: item.tanggal ?? '',
    deskripsi: item.deskripsi ?? '',
    produk_penjualan_id: item.produk_penjualan_id ?? '',
    harga: Number(item.harga ?? 0),
    quantity: Number(item.quantity ?? 1),
    penjual_id: item.penjual_id ?? '',
    pembeli_id: item.pembeli_id ?? '',
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
  const penjualId = String(form.value.penjual_id ?? '').trim()
  const pembeliId = String(form.value.pembeli_id ?? '').trim()
  const produkId = String(form.value.produk_penjualan_id ?? '').trim()
  const harga = Number(form.value.harga)
  const quantity = Number(form.value.quantity)

  if (!nama) return 'Nama penjualan wajib diisi.'
  if (nama.length > 150) return 'Nama penjualan maksimal 150 karakter.'
  if (!ISO_DATE_REGEX.test(tanggal)) return 'Tanggal penjualan wajib format YYYY-MM-DD.'
  if (!penjualId) return 'Penjual (petani) wajib dipilih.'
  if (!pembeliId) return 'Pembeli (mitra) wajib dipilih.'
  if (!produkId) return 'Produk penjualan wajib dipilih.'
  if (!Number.isFinite(harga) || harga < 0) return 'Harga harus angka dan tidak boleh negatif.'
  if (!Number.isFinite(quantity) || quantity <= 0) return 'Quantity harus lebih dari 0.'

  if (!farmers.value.some((item) => item.id === penjualId)) {
    return 'Petani penjual tidak valid. Silakan pilih ulang.'
  }

  if (!partners.value.some((item) => item.id === pembeliId)) {
    return 'Mitra pembeli tidak valid. Silakan pilih ulang.'
  }

  if (!products.value.some((item) => item.id === produkId)) {
    return 'Produk penjualan tidak valid. Silakan pilih ulang.'
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
      produk_penjualan_id: String(form.value.produk_penjualan_id ?? '').trim(),
      harga: Number(form.value.harga),
      quantity: Number(form.value.quantity),
      penjual_id: String(form.value.penjual_id ?? '').trim(),
      pembeli_id: String(form.value.pembeli_id ?? '').trim(),
    }

    if (form.value.id) {
      await realErpService.updateSale(form.value.id, payload)
      toast.success('Data penjualan berhasil diperbarui.')
    } else {
      await realErpService.createSale(payload)
      toast.success('Data penjualan berhasil ditambahkan.')
    }

    closeForm()
    await loadItems()
  } catch (err) {
    formError.value = err instanceof Error ? err.message : 'Gagal menyimpan data penjualan.'
  } finally {
    saving.value = false
  }
}

const deleteItem = async (item) => {
  const ok = window.confirm(`Hapus data penjualan ${item.nama}?`)
  if (!ok) return

  deletingId.value = item.id
  try {
    await realErpService.deleteSale(item.id)
    toast.success('Data penjualan berhasil dihapus.')
    await loadItems()
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Gagal menghapus data penjualan.'
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

watch([sellerFilter, buyerFilter, productFilter, startDateFilter, endDateFilter], async () => {
  currentPage.value = 1
  await loadItems()
})

watch(
  () => form.value.produk_penjualan_id,
  () => {
    const isCreateMode = !form.value.id
    const currentPrice = Number(form.value.harga)
    const shouldUseDefault = useDefaultPrice.value && isCreateMode && (!Number.isFinite(currentPrice) || currentPrice <= 0)
    if (!shouldUseDefault) return
    if (selectedProductDefaultPrice.value <= 0) return
    form.value.harga = selectedProductDefaultPrice.value
  },
)

watch(useDefaultPrice, (enabled) => {
  if (!enabled) return
  if (form.value.id) return
  if (selectedProductDefaultPrice.value <= 0) return
  form.value.harga = selectedProductDefaultPrice.value
})

onMounted(refreshAll)
</script>

<template>
  <section class="space-y-6">
    <SectionHeader
      eyebrow="Real API"
      title="List Penjualan"
      description="Daftar transaksi penjualan dengan fitur search, pagination, dan CRUD langsung ke endpoint sales."
    />

    <DataToolbar content-class="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      <input v-model="searchTerm" class="field w-full" type="text" placeholder="Cari nama, deskripsi, atau nominal..." />

      <select v-model="sellerFilter" class="field w-full">
        <option value="">Semua Penjual</option>
        <option v-for="farmer in farmers" :key="farmer.id" :value="farmer.id">{{ farmer.nama }}</option>
      </select>

      <select v-model="buyerFilter" class="field w-full">
        <option value="">Semua Pembeli</option>
        <option v-for="partner in partners" :key="partner.id" :value="partner.id">{{ partner.nama }}</option>
      </select>

      <select v-model="productFilter" class="field w-full">
        <option value="">Semua Produk Penjualan</option>
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
        <ActionButton variant="primary" full-width @click="openCreateForm">Tambah Penjualan</ActionButton>
        <ActionButton variant="muted" full-width @click="loadItems">Refresh</ActionButton>
        <ActionButton variant="muted" full-width @click="resetFilters">Reset Filter</ActionButton>
      </div>
    </DataToolbar>

    <div v-if="activeFilterChips.length" class="flex flex-wrap gap-2">
      <span
        v-for="chip in activeFilterChips"
        :key="chip"
        class="rounded-full border border-white/15 bg-white/8 px-3 py-1 text-xs text-emerald-100/90"
      >
        {{ chip }}
      </span>
    </div>

    <div class="grid gap-4 md:grid-cols-3">
      <article class="rounded-2xl border border-white/10 bg-white/4 p-4">
        <p class="text-xs uppercase tracking-widest text-emerald-100/70">Total Data</p>
        <p class="mt-2 text-2xl font-semibold text-white">{{ fmtNumber(items.length) }}</p>
      </article>
      <article class="rounded-2xl border border-white/10 bg-white/4 p-4">
        <p class="text-xs uppercase tracking-widest text-emerald-100/70">Total Sub Total</p>
        <p class="mt-2 text-2xl font-semibold text-white">{{ fmtCurrency(totalSales) }}</p>
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
      title="Data penjualan belum berhasil dimuat"
      :description="error"
      action-label="Coba Lagi"
      @action="loadItems"
    />

    <PageState
      v-else-if="!items.length"
      title="Data penjualan tidak ditemukan"
      description="Belum ada transaksi penjualan yang sesuai dengan filter sekarang. Coba ubah filter atau refresh data dari backend."
      action-label="Refresh Data"
      @action="loadItems"
    />

    <div v-else class="space-y-3">
      <div class="space-y-3 md:hidden">
        <article v-for="item in paginatedItems" :key="`mobile-sale-${item.id}`" class="rounded-2xl border border-white/10 bg-black/20 p-4">
          <div class="flex items-start justify-between gap-3">
            <div>
              <p class="text-sm font-semibold text-white">{{ item.nama }}</p>
              <p class="text-xs text-emerald-100/75">{{ item.tanggal }}</p>
            </div>
            <p class="text-sm font-semibold text-emerald-100">{{ fmtCurrency(Number(item.sub_total ?? 0)) }}</p>
          </div>

          <div class="mt-3 grid grid-cols-2 gap-2 text-xs text-emerald-100/85">
            <p><span class="text-emerald-100/60">Penjual:</span> {{ item.penjual?.nama || '-' }}</p>
            <p><span class="text-emerald-100/60">Pembeli:</span> {{ item.pembeli?.nama || '-' }}</p>
            <p><span class="text-emerald-100/60">Produk:</span> {{ item.produk_penjualan?.nama || '-' }}</p>
            <p><span class="text-emerald-100/60">Qty:</span> {{ fmtNumber(Number(item.quantity ?? 0)) }}</p>
            <p class="col-span-2"><span class="text-emerald-100/60">Harga:</span> {{ fmtCurrency(Number(item.harga ?? 0)) }}</p>
          </div>

          <div class="mt-3 flex flex-col gap-2">
            <ActionButton full-width @click="openEditForm(item)">Edit</ActionButton>
            <ActionButton
              variant="danger"
              full-width
              :disabled="deletingId === item.id"
              @click="deleteItem(item)"
            >
              {{ deletingId === item.id ? 'Menghapus...' : 'Hapus' }}
            </ActionButton>
          </div>
        </article>
      </div>

      <div class="hidden overflow-auto rounded-2xl border border-white/10 bg-black/20 p-2 md:block">
        <table class="w-full min-w-220 text-left text-sm text-emerald-50/90">
          <thead class="text-emerald-100">
            <tr>
              <th class="p-2">Tanggal</th>
              <th class="p-2">Nama Penjualan</th>
              <th class="p-2">Penjual</th>
              <th class="p-2">Pembeli</th>
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
              <td class="p-2">{{ item.penjual?.nama || '-' }}</td>
              <td class="p-2">{{ item.pembeli?.nama || '-' }}</td>
              <td class="p-2">{{ item.produk_penjualan?.nama || '-' }}</td>
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
      <div class="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-white/10 bg-[#0a2f29] p-5">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-semibold text-white">{{ form.id ? 'Edit Penjualan' : 'Tambah Penjualan' }}</h3>
          <ActionButton variant="muted" @click="closeForm">Tutup</ActionButton>
        </div>

        <div v-if="formError" class="mt-3 rounded-xl border border-red-300/40 bg-red-500/10 px-4 py-3 text-sm text-red-100">
          {{ formError }}
        </div>

        <form class="mt-4 grid gap-3 md:grid-cols-2" @submit.prevent="saveItem">
          <input v-model="form.nama" class="field" type="text" placeholder="Nama penjualan" required />
          <input v-model="form.tanggal" class="field" type="date" required />

          <select v-model="form.penjual_id" class="field" required>
            <option value="" disabled>Pilih penjual (petani)</option>
            <option v-for="farmer in farmers" :key="farmer.id" :value="farmer.id">{{ farmer.nama }}</option>
          </select>

          <select v-model="form.pembeli_id" class="field" required>
            <option value="" disabled>Pilih pembeli (mitra)</option>
            <option v-for="partner in partners" :key="partner.id" :value="partner.id">{{ partner.nama }}</option>
          </select>

          <select v-model="form.produk_penjualan_id" class="field" required>
            <option value="" disabled>Pilih produk penjualan</option>
            <option v-for="product in products" :key="product.id" :value="product.id">{{ product.nama }}</option>
          </select>

          <label class="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-emerald-100/85">
            <input v-model="useDefaultPrice" :disabled="Boolean(form.id)" type="checkbox" class="h-4 w-4" />
            Pakai harga default produk
          </label>

          <div>
            <input v-model.number="form.harga" class="field w-full" type="number" min="0" step="1" placeholder="Harga" required />
            <div class="mt-1 flex flex-wrap items-center gap-2 text-xs text-emerald-100/70">
              <span>Harga default produk: {{ fmtCurrency(selectedProductDefaultPrice) }}</span>
              <span v-if="isAutoPriceActive" class="rounded-full border border-emerald-300/35 bg-emerald-500/20 px-2 py-0.5 text-[11px] font-semibold text-emerald-50">Auto harga aktif</span>
            </div>
          </div>
          <input v-model.number="form.quantity" class="field" type="number" min="1" step="1" placeholder="Quantity" required />

          <textarea v-model="form.deskripsi" class="field md:col-span-2" rows="3" placeholder="Deskripsi (opsional)" />

          <div class="md:col-span-2 sticky bottom-0 -mx-2 flex flex-col-reverse justify-end gap-2 border-t border-white/10 bg-[#0a2f29] px-2 pt-3 sm:-mx-3 sm:flex-row sm:px-3">
            <ActionButton variant="muted" full-width @click="closeForm">Batal</ActionButton>
            <button type="submit" class="btn-primary w-full sm:w-auto" :disabled="saving">{{ saving ? 'Menyimpan...' : 'Simpan' }}</button>
          </div>
        </form>
      </div>
    </div>
  </section>
</template>
