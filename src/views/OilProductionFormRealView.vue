<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ActionButton from '@/components/ActionButton.vue'
import DataToolbar from '@/components/DataToolbar.vue'
import ListLoadingState from '@/components/ListLoadingState.vue'
import SectionHeader from '@/components/SectionHeader.vue'
import { useToast } from '@/composables/useToast'
import { realErpService } from '@/services/realErpService'

const props = defineProps({
  mode: { type: String, default: 'create' },
  id: { type: String, default: '' },
})

const route = useRoute()
const router = useRouter()
const toast = useToast()

const loading = ref(false)
const saving = ref(false)
const error = ref('')

const farmers = ref([])
const lands = ref([])

const form = ref({
  kode: '',
  tanggal_mulai: new Date().toISOString().slice(0, 10),
  tanggal_akhir: '',
  aktual_tanggal_akhir: '',
  berat_kering_bahan: '',
  hasil_minyak: '',
  aktual_hasil_minyak: '',
  status: 'rencana',
  petani_id: String(route.query.petani_id ?? ''),
  lahan_id: '',
})

const isReadOnly = computed(() => props.mode === 'detail')
const pageTitle = computed(() => {
  if (props.mode === 'edit') return 'Edit Produksi Minyak'
  if (props.mode === 'detail') return 'Detail Produksi Minyak'
  return 'Input Produksi Minyak'
})
const pageDescription = computed(() => {
  if (props.mode === 'edit') return 'Perbarui data produksi minyak yang tersimpan di backend real API.'
  if (props.mode === 'detail') return 'Lihat detail data produksi minyak dari backend real API.'
  return 'Form create produksi minyak dengan relasi petani dan lahan yang diambil langsung dari daftar lahan milik petani terpilih.'
})

const selectedFarmer = computed(() => farmers.value.find((item) => item.id === form.value.petani_id) ?? null)
const selectedLand = computed(() => lands.value.find((item) => item.id === form.value.lahan_id) ?? null)

const loadFarmers = async () => {
  const data = await realErpService.getFarmers()
  farmers.value = Array.isArray(data) ? data : []
}

const loadLandsByFarmer = async () => {
  if (!form.value.petani_id) {
    lands.value = []
    form.value.lahan_id = ''
    return
  }

  const data = await realErpService.getLands({ pemilik_id: form.value.petani_id })
  lands.value = Array.isArray(data) ? data : []

  const hasSelected = lands.value.some((item) => item.id === form.value.lahan_id)
  if (!hasSelected && props.mode === 'create') {
    form.value.lahan_id = ''
  }
}

const loadProductionDetail = async () => {
  if (!props.id) return
  const detail = await realErpService.getOilProductionById(props.id)

  form.value = {
    kode: detail?.kode ?? '',
    tanggal_mulai: detail?.tanggal_mulai ?? new Date().toISOString().slice(0, 10),
    tanggal_akhir: detail?.tanggal_akhir ?? '',
    aktual_tanggal_akhir: detail?.aktual_tanggal_akhir ?? '',
    berat_kering_bahan: detail?.berat_kering_bahan ?? '',
    hasil_minyak: detail?.hasil_minyak ?? '',
    aktual_hasil_minyak: detail?.aktual_hasil_minyak ?? '',
    status: detail?.status ?? 'rencana',
    petani_id: detail?.petani_id ?? '',
    lahan_id: detail?.lahan_id ?? '',
  }
}

const init = async () => {
  loading.value = true
  error.value = ''
  try {
    await loadFarmers()

    if (props.mode === 'create') {
      form.value.petani_id = String(route.query.petani_id ?? form.value.petani_id ?? '')
    } else {
      await loadProductionDetail()
    }

    await loadLandsByFarmer()
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Gagal memuat form produksi minyak.'
  } finally {
    loading.value = false
  }
}

watch(
  () => form.value.petani_id,
  async (ownerId, prevId) => {
    if (loading.value || !ownerId || ownerId === prevId) return
    try {
      await loadLandsByFarmer()
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Gagal memuat lahan milik petani.'
    }
  },
)

const validateForm = () => {
  if (!form.value.kode.trim()) return 'Kode produksi minyak wajib diisi.'
  if (!form.value.tanggal_mulai) return 'Tanggal mulai wajib diisi.'
  if (!form.value.petani_id) return 'Petani wajib dipilih.'

  if (form.value.status === 'selesai') {
    if (!form.value.aktual_tanggal_akhir) return 'Aktual tanggal akhir wajib diisi saat status selesai.'
    if (!String(form.value.berat_kering_bahan).trim()) return 'Berat kering bahan wajib diisi saat status selesai.'
    if (!String(form.value.aktual_hasil_minyak).trim()) return 'Aktual hasil minyak wajib diisi saat status selesai.'
  }

  return ''
}

const submitForm = async () => {
  if (isReadOnly.value) return

  saving.value = true
  error.value = ''

  try {
    const validationError = validateForm()
    if (validationError) {
      throw new Error(validationError)
    }

    const payload = {
      kode: form.value.kode.trim(),
      tanggal_mulai: form.value.tanggal_mulai,
      status: form.value.status,
      petani_id: form.value.petani_id,
    }

    const optionalFields = ['tanggal_akhir', 'aktual_tanggal_akhir', 'berat_kering_bahan', 'hasil_minyak', 'aktual_hasil_minyak']
    optionalFields.forEach((field) => {
      const value = form.value[field]
      if (String(value ?? '').trim() === '') return
      const numericFields = ['berat_kering_bahan', 'hasil_minyak', 'aktual_hasil_minyak']
      if (numericFields.includes(field)) {
        const numericValue = Number(value)
        if (Number.isFinite(numericValue)) payload[field] = numericValue
        return
      }
      payload[field] = value
    })

    if (form.value.lahan_id) {
      payload.lahan_id = form.value.lahan_id
    }

    if (props.mode === 'edit') {
      await realErpService.updateOilProduction(props.id, payload)
      toast.success('Data produksi minyak berhasil diperbarui.')
    } else {
      await realErpService.createOilProduction(payload)
      toast.success('Data produksi minyak berhasil ditambahkan.')
    }

    router.push('/real/produksi-minyak')
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Gagal menyimpan produksi minyak.'
    error.value = message
    toast.error(message)
  } finally {
    saving.value = false
  }
}

onMounted(init)
</script>

<template>
  <section class="space-y-6">
    <SectionHeader eyebrow="Real API" :title="pageTitle" :description="pageDescription" />

    <DataToolbar content-class="flex flex-wrap gap-2">
      <ActionButton variant="muted" @click="router.push('/real/produksi-minyak')">Kembali ke List Produksi Minyak</ActionButton>
    </DataToolbar>

    <ListLoadingState v-if="loading" :card-count="4" />

    <div v-else class="rounded-2xl border border-white/10 bg-black/20 p-4 sm:p-5">
      <div v-if="error" class="mb-4 rounded-xl border border-red-300/40 bg-red-500/10 px-4 py-3 text-sm text-red-100">
        {{ error }}
      </div>

      <div class="mb-4 rounded-xl border border-white/10 bg-black/20 p-4 text-sm text-emerald-100/85">
        <p class="font-semibold text-white">Petani Terpilih</p>
        <p>{{ selectedFarmer?.nama || '-' }} ({{ selectedFarmer?.id || form.petani_id || '-' }})</p>
        <p>{{ selectedFarmer?.alamat || '-' }}</p>
      </div>

      <div class="grid gap-4 md:grid-cols-2">
        <label class="space-y-1 text-sm text-emerald-100/85">
          <span>Kode Produksi Minyak *</span>
          <input v-model="form.kode" class="field w-full" type="text" placeholder="OM-001" />
        </label>

        <label class="space-y-1 text-sm text-emerald-100/85">
          <span>Tanggal Mulai *</span>
          <input v-model="form.tanggal_mulai" class="field w-full" type="date" />
        </label>

        <label class="space-y-1 text-sm text-emerald-100/85">
          <span>Tanggal Akhir</span>
          <input v-model="form.tanggal_akhir" class="field w-full" type="date" />
        </label>

        <label class="space-y-1 text-sm text-emerald-100/85">
          <span>Aktual Tanggal Akhir</span>
          <input v-model="form.aktual_tanggal_akhir" class="field w-full" type="date" />
        </label>

        <label class="space-y-1 text-sm text-emerald-100/85">
          <span>Berat Kering Bahan</span>
          <input v-model="form.berat_kering_bahan" class="field w-full" type="number" min="0" step="0.01" />
        </label>

        <label class="space-y-1 text-sm text-emerald-100/85">
          <span>Hasil Minyak</span>
          <input v-model="form.hasil_minyak" class="field w-full" type="number" min="0" step="0.01" />
        </label>

        <label class="space-y-1 text-sm text-emerald-100/85">
          <span>Aktual Hasil Minyak</span>
          <input v-model="form.aktual_hasil_minyak" class="field w-full" type="number" min="0" step="0.01" />
        </label>

        <label class="space-y-1 text-sm text-emerald-100/85">
          <span>Status *</span>
          <select v-model="form.status" class="field w-full">
            <option value="rencana">Rencana</option>
            <option value="berjalan">Berjalan</option>
            <option value="selesai">Selesai</option>
          </select>
        </label>

        <label class="space-y-1 text-sm text-emerald-100/85">
          <span>Petani *</span>
          <select v-model="form.petani_id" class="field w-full">
            <option value="">Pilih petani</option>
            <option v-for="farmer in farmers" :key="farmer.id" :value="farmer.id">{{ farmer.nama }}</option>
          </select>
        </label>

        <label class="space-y-1 text-sm text-emerald-100/85">
          <span>Lahan (opsional)</span>
          <select v-model="form.lahan_id" class="field w-full" :disabled="!form.petani_id">
            <option value="">Tanpa lahan</option>
            <option v-for="land in lands" :key="land.id" :value="land.id">{{ land.kode }} - {{ land.luas }} ha</option>
          </select>
        </label>
      </div>

      <div class="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
        <ActionButton variant="muted" full-width @click="router.push('/real/produksi-minyak')">Batal</ActionButton>
        <button v-if="!isReadOnly" type="button" class="btn-primary w-full sm:w-auto" :disabled="saving" @click="submitForm">
          {{ saving ? 'Menyimpan...' : props.mode === 'edit' ? 'Update Produksi Minyak' : 'Simpan Produksi Minyak' }}
        </button>
        <ActionButton v-else variant="primary" full-width @click="router.push(`/real/produksi-minyak/${props.id}/edit`)">Edit Data</ActionButton>
      </div>
    </div>
  </section>
</template>
