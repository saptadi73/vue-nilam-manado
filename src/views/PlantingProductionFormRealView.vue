<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
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
  luas_garapan: '',
  jarak_tanam: '',
  jumlah_batang: '',
  hasil_produksi_basah: '',
  aktual_hasil_produksi_basah: '',
  aktual_hasil_produksi_kering: '',
  varietas_bibit: '',
  sumber_bibit: '',
  cara_tanam: 'Bibit dalam Polybag',
  perawatan: 'Manual',
  pupuk: '',
  musim_tanam: '',
  status: 'rencana',
  petani_id: String(route.query.petani_id ?? ''),
  lahan_id: '',
})

const isReadOnly = computed(() => props.mode === 'detail')
const pageTitle = computed(() => {
  if (props.mode === 'edit') return 'Edit Produksi Tanam'
  if (props.mode === 'detail') return 'Detail Produksi Tanam'
  return 'Input Produksi Tanam'
})
const pageDescription = computed(() => {
  if (props.mode === 'edit') return 'Perbarui data produksi tanam yang tersimpan di backend real API.'
  if (props.mode === 'detail') return 'Lihat detail data produksi tanam dari backend real API.'
  return 'Form create produksi tanam dengan relasi petani dan lahan yang diambil langsung dari daftar lahan milik petani terpilih.'
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
  const detail = await realErpService.getPlantingProductionById(props.id)

  form.value = {
    kode: detail?.kode ?? '',
    tanggal_mulai: detail?.tanggal_mulai ?? new Date().toISOString().slice(0, 10),
    tanggal_akhir: detail?.tanggal_akhir ?? '',
    aktual_tanggal_akhir: detail?.aktual_tanggal_akhir ?? '',
    luas_garapan: detail?.luas_garapan ?? '',
    jarak_tanam: detail?.jarak_tanam ?? '',
    jumlah_batang: detail?.jumlah_batang ?? '',
    hasil_produksi_basah: detail?.hasil_produksi_basah ?? '',
    aktual_hasil_produksi_basah: detail?.aktual_hasil_produksi_basah ?? '',
    aktual_hasil_produksi_kering: detail?.aktual_hasil_produksi_kering ?? '',
    varietas_bibit: detail?.varietas_bibit ?? '',
    sumber_bibit: detail?.sumber_bibit ?? '',
    cara_tanam: detail?.cara_tanam ?? 'Bibit dalam Polybag',
    perawatan: detail?.perawatan ?? 'Manual',
    pupuk: detail?.pupuk ?? '',
    musim_tanam: detail?.musim_tanam ?? '',
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
    error.value = err instanceof Error ? err.message : 'Gagal memuat form produksi tanam.'
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

const submitForm = async () => {
  if (isReadOnly.value) return

  saving.value = true
  error.value = ''

  try {
    if (!form.value.kode.trim()) throw new Error('Kode produksi tanam wajib diisi.')
    if (!form.value.tanggal_mulai) throw new Error('Tanggal mulai wajib diisi.')
    if (!form.value.petani_id) throw new Error('Petani wajib dipilih.')

    const luasGarapan = Number(form.value.luas_garapan)
    if (!Number.isFinite(luasGarapan) || luasGarapan <= 0) {
      throw new Error('Luas garapan harus lebih dari 0.')
    }

    const payload = {
      kode: form.value.kode.trim(),
      tanggal_mulai: form.value.tanggal_mulai,
      luas_garapan: luasGarapan,
      status: form.value.status,
      petani_id: form.value.petani_id,
    }

    const optionalFields = [
      'tanggal_akhir',
      'aktual_tanggal_akhir',
      'jarak_tanam',
      'jumlah_batang',
      'hasil_produksi_basah',
      'aktual_hasil_produksi_basah',
      'aktual_hasil_produksi_kering',
      'varietas_bibit',
      'sumber_bibit',
      'cara_tanam',
      'perawatan',
      'pupuk',
      'musim_tanam',
    ]

    optionalFields.forEach((field) => {
      const value = form.value[field]
      if (String(value ?? '').trim() === '') return
      if (['jumlah_batang', 'hasil_produksi_basah', 'aktual_hasil_produksi_basah', 'aktual_hasil_produksi_kering'].includes(field)) {
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
      await realErpService.updatePlantingProduction(props.id, payload)
      toast.success('Data produksi tanam berhasil diperbarui.')
    } else {
      await realErpService.createPlantingProduction(payload)
      toast.success('Data produksi tanam berhasil ditambahkan.')
    }

    router.push('/real/produksi-tanam')
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Gagal menyimpan produksi tanam.'
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

    <div class="flex flex-wrap gap-2">
      <button type="button" class="btn-muted" @click="router.push('/real/produksi-tanam')">Kembali ke List Produksi Tanam</button>
    </div>

    <p v-if="loading" class="text-sm text-emerald-100/80">Memuat data form...</p>

    <div v-else class="rounded-2xl border border-white/10 bg-black/20 p-5">
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
          <span>Kode Produksi Tanam *</span>
          <input v-model="form.kode" class="field w-full" type="text" placeholder="PT-001" />
        </label>

        <label class="space-y-1 text-sm text-emerald-100/85">
          <span>Tanggal Mulai *</span>
          <input v-model="form.tanggal_mulai" class="field w-full" type="date" />
        </label>

        <label class="space-y-1 text-sm text-emerald-100/85">
          <span>Luas Garapan (ha) *</span>
          <input v-model="form.luas_garapan" class="field w-full" type="number" min="0" step="0.01" />
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

        <label class="space-y-1 text-sm text-emerald-100/85 md:col-span-2">
          <span>Jarak Tanam</span>
          <input v-model="form.jarak_tanam" class="field w-full" type="text" placeholder="30x30 cm" :disabled="isReadOnly" />
        </label>

        <label class="space-y-1 text-sm text-emerald-100/85">
          <span>Jumlah Batang</span>
          <input v-model="form.jumlah_batang" class="field w-full" type="number" min="0" step="1" :disabled="isReadOnly" />
        </label>

        <label class="space-y-1 text-sm text-emerald-100/85">
          <span>Hasil Produksi Basah</span>
          <input v-model="form.hasil_produksi_basah" class="field w-full" type="number" min="0" step="0.01" :disabled="isReadOnly" />
        </label>

        <label class="space-y-1 text-sm text-emerald-100/85">
          <span>Aktual Hasil Produksi Basah</span>
          <input v-model="form.aktual_hasil_produksi_basah" class="field w-full" type="number" min="0" step="0.01" :disabled="isReadOnly" />
        </label>

        <label class="space-y-1 text-sm text-emerald-100/85">
          <span>Aktual Hasil Produksi Kering</span>
          <input v-model="form.aktual_hasil_produksi_kering" class="field w-full" type="number" min="0" step="0.01" :disabled="isReadOnly" />
        </label>

        <label class="space-y-1 text-sm text-emerald-100/85">
          <span>Varietas Bibit</span>
          <input v-model="form.varietas_bibit" class="field w-full" type="text" :disabled="isReadOnly" />
        </label>

        <label class="space-y-1 text-sm text-emerald-100/85">
          <span>Sumber Bibit</span>
          <input v-model="form.sumber_bibit" class="field w-full" type="text" :disabled="isReadOnly" />
        </label>

        <label class="space-y-1 text-sm text-emerald-100/85">
          <span>Pupuk</span>
          <input v-model="form.pupuk" class="field w-full" type="text" :disabled="isReadOnly" />
        </label>

        <label class="space-y-1 text-sm text-emerald-100/85">
          <span>Musim Tanam</span>
          <input v-model="form.musim_tanam" class="field w-full" type="text" :disabled="isReadOnly" />
        </label>

        <label class="space-y-1 text-sm text-emerald-100/85">
          <span>Perawatan</span>
          <select v-model="form.perawatan" class="field w-full">
            <option value="Manual">Manual</option>
            <option value="Mesin">Mesin</option>
          </select>
        </label>
      </div>

      <div class="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
        <button type="button" class="btn-muted w-full sm:w-auto" @click="router.push('/real/produksi-tanam')">Batal</button>
        <button v-if="!isReadOnly" type="button" class="btn-primary w-full sm:w-auto" :disabled="saving" @click="submitForm">
          {{ saving ? 'Menyimpan...' : props.mode === 'edit' ? 'Update Produksi Tanam' : 'Simpan Produksi Tanam' }}
        </button>
        <button v-else type="button" class="btn-primary w-full sm:w-auto" @click="router.push(`/real/produksi-tanam/${props.id}/edit`)">
          Edit Data
        </button>
      </div>
    </div>
  </section>
</template>
