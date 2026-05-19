<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import ActionButton from '@/components/ActionButton.vue'
import DataToolbar from '@/components/DataToolbar.vue'
import ListLoadingState from '@/components/ListLoadingState.vue'
import SectionHeader from '@/components/SectionHeader.vue'
import { useToast } from '@/composables/useToast'
import { realErpService } from '@/services/realErpService'

const props = defineProps({
  mode: {
    type: String,
    default: 'create',
  },
  id: {
    type: String,
    default: '',
  },
})

const router = useRouter()
const toast = useToast()

const loading = ref(false)
const saving = ref(false)
const error = ref('')

const form = ref({
  nama: '',
  harga: 0,
  satuan: '',
  deskripsi: '',
})

const pageTitle = computed(() => (props.mode === 'edit' ? 'Edit Produk Expense' : 'Tambah Produk Expense'))
const pageDescription = computed(() => (props.mode === 'edit'
  ? 'Perbarui master produk pembiayaan.'
  : 'Tambahkan produk pembiayaan baru untuk transaksi expense.'))

const goBack = () => {
  router.push('/real/produk-biaya')
}

const loadDetail = async () => {
  if (props.mode !== 'edit' || !props.id) return

  loading.value = true
  error.value = ''
  try {
    const item = await realErpService.getFinancingProductById(props.id)
    form.value = {
      nama: item?.nama ?? '',
      harga: Number(item?.harga ?? 0),
      satuan: item?.satuan ?? '',
      deskripsi: item?.deskripsi ?? '',
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Gagal memuat detail produk expense.'
  } finally {
    loading.value = false
  }
}

const submitForm = async () => {
  saving.value = true
  error.value = ''

  try {
    const payload = {
      nama: form.value.nama.trim(),
      harga: Number(form.value.harga),
      satuan: form.value.satuan.trim(),
      deskripsi: form.value.deskripsi.trim() || null,
    }

    if (props.mode === 'edit' && props.id) {
      await realErpService.updateFinancingProduct(props.id, payload)
      toast.success('Produk expense berhasil diperbarui.')
    } else {
      await realErpService.createFinancingProduct(payload)
      toast.success('Produk expense berhasil ditambahkan.')
    }

    goBack()
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Gagal menyimpan produk expense.'
  } finally {
    saving.value = false
  }
}

onMounted(loadDetail)
</script>

<template>
  <section class="space-y-6">
    <SectionHeader eyebrow="Master Data" :title="pageTitle" :description="pageDescription" />

    <DataToolbar content-class="flex flex-wrap gap-2">
      <ActionButton variant="muted" @click="goBack">Kembali ke List</ActionButton>
    </DataToolbar>

    <ListLoadingState v-if="loading" :card-count="3" />

    <div v-else class="rounded-2xl border border-white/10 bg-black/20 p-4 sm:p-5">
      <div v-if="error" class="mb-4 rounded-xl border border-red-300/40 bg-red-500/10 px-4 py-3 text-sm text-red-100">
        {{ error }}
      </div>

      <form class="grid gap-4 md:grid-cols-2" @submit.prevent="submitForm">
        <label class="space-y-1 text-sm text-emerald-100/85 md:col-span-2">
          <span>Nama Produk *</span>
          <input v-model="form.nama" class="field w-full" type="text" required />
        </label>

        <label class="space-y-1 text-sm text-emerald-100/85">
          <span>Harga *</span>
          <input v-model.number="form.harga" class="field w-full" type="number" min="0" step="1" required />
        </label>

        <label class="space-y-1 text-sm text-emerald-100/85">
          <span>Satuan *</span>
          <input v-model="form.satuan" class="field w-full" type="text" placeholder="kg, liter, pcs" required />
        </label>

        <label class="space-y-1 text-sm text-emerald-100/85 md:col-span-2">
          <span>Deskripsi</span>
          <textarea v-model="form.deskripsi" class="field w-full" rows="3"></textarea>
        </label>

        <div class="md:col-span-2 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <ActionButton variant="muted" full-width @click="goBack">Batal</ActionButton>
          <button type="submit" class="btn-primary w-full sm:w-auto" :disabled="saving">
            {{ saving ? 'Menyimpan...' : 'Simpan' }}
          </button>
        </div>
      </form>
    </div>
  </section>
</template>
