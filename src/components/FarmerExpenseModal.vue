<script setup>
import { computed, ref, watch } from 'vue'
import ActionButton from '@/components/ActionButton.vue'
import DataToolbar from '@/components/DataToolbar.vue'
import ListLoadingState from '@/components/ListLoadingState.vue'
import PageState from '@/components/PageState.vue'
import PaginationBar from '@/components/PaginationBar.vue'
import { useToast } from '@/composables/useToast'
import { fmtCurrency, fmtNumber } from '@/utils/formatters'
import { realErpService } from '@/services/realErpService'
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/

const props = defineProps({
  open: Boolean,
  farmerId: [String, Number],
})
const emit = defineEmits(['close'])
const toast = useToast()

const search = ref('')
const page = ref(1)
const pageSize = 5
const showForm = ref(false)
const form = ref({ id: null, tanggal: '', nama: '', produk_id: '', harga: 0, quantity: 1, deskripsi: '' })
const expenses = ref([])
const loading = ref(false)
const saving = ref(false)
const deleting = ref('')
const products = ref([])
const error = ref('')
const formError = ref('')

const filteredExpenses = computed(() => {
  const keyword = search.value.toLowerCase().trim()
  if (!keyword) return expenses.value
  return expenses.value.filter(
    (item) =>
      String(item.nama).toLowerCase().includes(keyword) ||
      String(item.deskripsi ?? '').toLowerCase().includes(keyword) ||
      String(item.harga).includes(keyword) ||
      String(item.quantity).includes(keyword)
  )
})
const totalPages = computed(() => Math.max(1, Math.ceil(filteredExpenses.value.length / pageSize)))
const paginatedExpenses = computed(() => {
  const start = (page.value - 1) * pageSize
  return filteredExpenses.value.slice(start, start + pageSize)
})

watch(() => props.open, async (val) => {
  if (val && props.farmerId) {
    await fetchExpenses()
    await fetchProducts()
  }
})

watch(filteredExpenses, () => {
  page.value = 1
})

async function fetchExpenses() {
  loading.value = true
  error.value = ''
  try {
    const res = await realErpService.getFinancings({ petani_id: props.farmerId })
    expenses.value = Array.isArray(res.items) ? res.items : []
  } catch (e) {
    error.value = e?.message || 'Gagal memuat data expense.'
    expenses.value = []
  } finally {
    loading.value = false
  }
}

async function fetchProducts() {
  try {
    const res = await realErpService.getFinancingProducts()
    products.value = Array.isArray(res) ? res : []
  } catch {}
}

function openForm(item = null) {
  formError.value = ''
  if (item) {
    form.value = {
      id: item.id,
      tanggal: item.tanggal,
      nama: item.nama,
      produk_id: item.produk_id,
      harga: item.harga,
      quantity: item.quantity,
      deskripsi: item.deskripsi ?? '',
    }
  } else {
    form.value = { id: null, tanggal: '', nama: '', produk_id: '', harga: 0, quantity: 1, deskripsi: '' }
  }
  showForm.value = true
}
function closeForm() {
  showForm.value = false
  formError.value = ''
}

function validateForm() {
  const nama = String(form.value.nama ?? '').trim()
  const tanggal = String(form.value.tanggal ?? '').trim()
  const produkId = String(form.value.produk_id ?? '').trim()
  const harga = Number(form.value.harga)
  const quantity = Number(form.value.quantity)

  if (!nama) return 'Nama expense wajib diisi.'
  if (nama.length > 150) return 'Nama expense maksimal 150 karakter.'
  if (!ISO_DATE_REGEX.test(tanggal)) return 'Tanggal expense wajib format YYYY-MM-DD.'
  if (!produkId) return 'Produk pembiayaan wajib dipilih.'
  if (!Number.isFinite(harga) || harga < 0) return 'Harga harus angka dan tidak boleh negatif.'
  if (!Number.isFinite(quantity) || quantity <= 0) return 'Quantity harus lebih dari 0.'

  if (!products.value.some((item) => item.id === produkId)) {
    return 'Produk pembiayaan tidak valid. Silakan pilih ulang.'
  }

  return ''
}

async function saveExpense() {
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
      produk_id: String(form.value.produk_id ?? '').trim(),
      harga: Number(form.value.harga),
      quantity: Number(form.value.quantity),
      deskripsi: String(form.value.deskripsi ?? '').trim() || null,
      petani_id: props.farmerId,
    }
    if (form.value.id) {
      await realErpService.updateFinancing(form.value.id, payload)
      toast.success('Expense berhasil diperbarui.')
    } else {
      await realErpService.createFinancing(payload)
      toast.success('Expense berhasil ditambahkan.')
    }
    await fetchExpenses()
    showForm.value = false
  } catch (e) {
    formError.value = e?.message || 'Gagal menyimpan expense.'
  } finally {
    saving.value = false
  }
}
async function deleteExpense(item) {
  if (!confirm('Hapus expense ini?')) return
  deleting.value = item.id
  try {
    await realErpService.deleteFinancing(item.id)
    toast.success('Expense berhasil dihapus.')
    await fetchExpenses()
  } catch (e) {
    error.value = e?.message || 'Gagal menghapus expense.'
    toast.error(error.value)
  } finally {
    deleting.value = ''
  }
}
</script>

<template>
  <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4" @click="emit('close')">
    <div class="w-full max-w-5xl rounded-3xl border border-white/10 bg-[#092d27] p-4 sm:p-5" @click.stop>
      <div class="flex flex-col gap-3 border-b border-white/10 pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p class="text-xs uppercase tracking-[0.18em] text-emerald-100/70">Expense Petani</p>
          <h2 class="mt-2 text-2xl font-bold text-white">Daftar Expense per Petani</h2>
          <p class="mt-2 text-sm text-emerald-100/80">Kelola pembiayaan berdasarkan petani terpilih dengan pencarian, pagination, dan form cepat.</p>
        </div>
        <ActionButton variant="muted" @click="emit('close')">Tutup</ActionButton>
      </div>

      <DataToolbar class="mt-4" content-class="flex flex-wrap items-center gap-3">
        <input v-model="search" type="text" class="field min-w-64 flex-1" placeholder="Cari nama expense, deskripsi, harga, atau quantity..." />
        <ActionButton variant="primary" @click="openForm()">Tambah Expense</ActionButton>
      </DataToolbar>

      <ListLoadingState v-if="loading" variant="table" :row-count="5" :column-count="5" class="mt-4" />

      <PageState
        v-else-if="error"
        class="mt-4"
        variant="error"
        title="Data expense belum berhasil dimuat"
        :description="error"
        action-label="Coba Lagi"
        @action="fetchExpenses"
      />

      <PageState
        v-else-if="!filteredExpenses.length"
        class="mt-4"
        title="Belum ada expense untuk petani ini"
        description="Tambahkan expense baru atau ubah kata kunci pencarian untuk melihat data yang tersedia."
        action-label="Tambah Expense"
        @action="openForm()"
      />

      <div v-else class="mt-4 overflow-auto rounded-2xl border border-white/10 bg-black/20 p-2">
        <table class="w-full min-w-185 text-left text-sm text-emerald-50/90">
          <thead class="text-emerald-100">
            <tr>
              <th class="p-2">Tanggal</th>
              <th class="p-2">Nama Expense</th>
              <th class="p-2">Produk</th>
              <th class="p-2">Qty</th>
              <th class="p-2">Sub Total</th>
              <th class="p-2">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in paginatedExpenses" :key="item.id" class="border-t border-white/10">
              <td class="p-2">{{ item.tanggal }}</td>
              <td class="p-2">
                <p class="font-medium text-white">{{ item.nama }}</p>
                <p class="text-xs text-emerald-100/70">{{ item.deskripsi || 'Tanpa deskripsi' }}</p>
              </td>
              <td class="p-2">{{ item.produk?.nama || '-' }}</td>
              <td class="p-2">{{ fmtNumber(item.quantity ?? 0) }}</td>
              <td class="p-2">{{ fmtCurrency(item.sub_total ?? 0) }}</td>
              <td class="p-2">
                <div class="flex flex-wrap gap-2">
                  <ActionButton @click="openForm(item)">Edit</ActionButton>
                  <ActionButton variant="danger" :disabled="deleting === item.id" @click="deleteExpense(item)">
                    {{ deleting === item.id ? 'Menghapus...' : 'Hapus' }}
                  </ActionButton>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <PaginationBar
        v-if="filteredExpenses.length"
        class="mt-4"
        :summary="`Menampilkan ${paginatedExpenses.length} dari ${filteredExpenses.length} data`"
        :page="page"
        :total-pages="totalPages"
        @prev="page = Math.max(1, page - 1)"
        @next="page = Math.min(totalPages, page + 1)"
      />

      <div v-if="showForm" class="fixed inset-0 z-60 flex items-center justify-center bg-black/75 p-4" @click="closeForm">
        <div class="w-full max-w-2xl rounded-3xl border border-white/10 bg-[#0a2f29] p-5" @click.stop>
          <div class="flex items-center justify-between">
            <div>
              <p class="text-xs uppercase tracking-[0.16em] text-emerald-100/70">Form Expense</p>
              <h3 class="mt-1 text-lg font-semibold text-white">{{ form.id ? 'Edit Expense' : 'Tambah Expense' }}</h3>
            </div>
            <ActionButton variant="muted" @click="closeForm">Tutup</ActionButton>
          </div>

          <div v-if="formError" class="mt-4 rounded-xl border border-red-300/40 bg-red-500/10 px-4 py-3 text-sm text-red-100">
            {{ formError }}
          </div>

          <form class="mt-4 grid gap-3 md:grid-cols-2" @submit.prevent="saveExpense">
            <input v-model="form.nama" class="field" type="text" placeholder="Nama expense" required />
            <input v-model="form.tanggal" class="field" type="date" required />

            <select v-model="form.produk_id" class="field" required>
              <option value="" disabled>Pilih produk pembiayaan</option>
              <option v-for="prod in products" :key="prod.id" :value="prod.id">{{ prod.nama }} ({{ fmtCurrency(prod.harga) }}/{{ prod.satuan }})</option>
            </select>
            <input v-model.number="form.harga" class="field" type="number" min="0" placeholder="Harga satuan" required />

            <input v-model.number="form.quantity" class="field" type="number" min="1" placeholder="Jumlah" required />
            <input v-model="form.deskripsi" class="field" type="text" placeholder="Deskripsi (opsional)" />

            <div class="md:col-span-2 flex justify-end gap-2">
              <ActionButton variant="muted" @click="closeForm">Batal</ActionButton>
              <button type="submit" class="btn-primary" :disabled="saving">
                {{ saving ? 'Menyimpan...' : 'Simpan' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>
