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

const ownerIdFromQuery = String(route.query.pemilik_id ?? '').trim()

const loading = ref(false)
const saving = ref(false)
const error = ref('')
const owner = ref(null)
const photoFile = ref(null)
const farmers = ref([])

const provinsiOptions = ref([])
const kabupatenOptions = ref([])
const kecamatanOptions = ref([])
const desaOptions = ref([])

const form = ref({
  kode: '',
  luas: '',
  elevasi: '',
  kepemilikan: 'hak milik',
  pemilik_id: ownerIdFromQuery,
  provinsi_kode: '',
  kabupaten_kota_kode: '',
  kecamatan_kode: '',
  desa_kelurahan_kode: '',
})

const coordinateRows = ref([
  { latitude: '', longitude: '' },
  { latitude: '', longitude: '' },
  { latitude: '', longitude: '' },
])

const isReadOnly = computed(() => props.mode === 'detail')
const pageTitle = computed(() => {
  if (props.mode === 'edit') return 'Edit Data Lahan'
  if (props.mode === 'detail') return 'Detail Data Lahan'
  return 'Tambah Data Lahan'
})
const pageDescription = computed(() => {
  if (props.mode === 'edit') return 'Perbarui data lahan yang sudah terdaftar.'
  if (props.mode === 'detail') return 'Lihat detail data lahan yang tersimpan di backend real API.'
  return 'Form input lahan baru untuk petani terpilih.'
})

const loadFarmers = async () => {
  const data = await realErpService.getFarmers()
  farmers.value = Array.isArray(data) ? data : []
}

const loadOwnerById = async (ownerId) => {
  if (!ownerId) {
    owner.value = null
    return
  }
  owner.value = await realErpService.getFarmerById(ownerId)
}

const applyOwnerRegion = async () => {
  form.value.provinsi_kode = owner.value?.provinsi_kode ?? ''
  form.value.kabupaten_kota_kode = owner.value?.kabupaten_kota_kode ?? ''
  form.value.kecamatan_kode = owner.value?.kecamatan_kode ?? ''
  form.value.desa_kelurahan_kode = owner.value?.desa_kelurahan_kode ?? ''

  if (form.value.provinsi_kode) await loadKabupaten(form.value.provinsi_kode)
  if (form.value.kabupaten_kota_kode) await loadKecamatan(form.value.kabupaten_kota_kode)
  if (form.value.kecamatan_kode) await loadDesa(form.value.kecamatan_kode)
}

const loadLandDetail = async () => {
  if (!props.id) throw new Error('ID lahan tidak ditemukan untuk mode ini.')

  const land = await realErpService.getLandById(props.id)
  form.value = {
    kode: land?.kode ?? '',
    luas: String(land?.luas ?? ''),
    elevasi: land?.elevasi ?? '',
    kepemilikan: land?.kepemilikan ?? 'hak milik',
    pemilik_id: land?.pemilik_id ?? '',
    provinsi_kode: land?.provinsi_kode ?? '',
    kabupaten_kota_kode: land?.kabupaten_kota_kode ?? '',
    kecamatan_kode: land?.kecamatan_kode ?? '',
    desa_kelurahan_kode: land?.desa_kelurahan_kode ?? '',
  }

  const coordinates = Array.isArray(land?.koordinat)
    ? land.koordinat
        .sort((a, b) => Number(a?.urutan ?? 0) - Number(b?.urutan ?? 0))
        .map((point) => ({
          latitude: String(point?.latitude ?? ''),
          longitude: String(point?.longitude ?? ''),
        }))
    : []

  coordinateRows.value = coordinates.length ? coordinates : [{ latitude: '', longitude: '' }, { latitude: '', longitude: '' }, { latitude: '', longitude: '' }]
}

const loadProvinsi = async () => {
  const data = await realErpService.getProvinsi()
  provinsiOptions.value = Array.isArray(data) ? data : []
}

const loadKabupaten = async (provinsiKode) => {
  if (!provinsiKode) {
    kabupatenOptions.value = []
    return
  }
  const data = await realErpService.getKabupatenKota(provinsiKode)
  kabupatenOptions.value = Array.isArray(data) ? data : []
}

const loadKecamatan = async (kabupatenKotaKode) => {
  if (!kabupatenKotaKode) {
    kecamatanOptions.value = []
    return
  }
  const data = await realErpService.getKecamatan(kabupatenKotaKode)
  kecamatanOptions.value = Array.isArray(data) ? data : []
}

const loadDesa = async (kecamatanKode) => {
  if (!kecamatanKode) {
    desaOptions.value = []
    return
  }
  const data = await realErpService.getDesaKelurahan(kecamatanKode)
  desaOptions.value = Array.isArray(data) ? data : []
}

const init = async () => {
  loading.value = true
  error.value = ''
  try {
    await loadFarmers()
    await loadProvinsi()

    if (props.mode === 'create') {
      form.value.pemilik_id = ownerIdFromQuery || form.value.pemilik_id
      if (form.value.pemilik_id) {
        await loadOwnerById(form.value.pemilik_id)
        await applyOwnerRegion()
      }
    } else {
      await loadLandDetail()
      if (form.value.provinsi_kode) await loadKabupaten(form.value.provinsi_kode)
      if (form.value.kabupaten_kota_kode) await loadKecamatan(form.value.kabupaten_kota_kode)
      if (form.value.kecamatan_kode) await loadDesa(form.value.kecamatan_kode)
      await loadOwnerById(form.value.pemilik_id)
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Gagal menyiapkan form lahan.'
  } finally {
    loading.value = false
  }
}

watch(
  () => form.value.pemilik_id,
  async (ownerId, prevId) => {
    if (!ownerId || ownerId === prevId || loading.value) return
    try {
      await loadOwnerById(ownerId)
      if (props.mode === 'create') {
        await applyOwnerRegion()
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Gagal memuat data pemilik lahan.'
    }
  },
)

const onProvinsiChange = async () => {
  form.value.kabupaten_kota_kode = ''
  form.value.kecamatan_kode = ''
  form.value.desa_kelurahan_kode = ''
  kabupatenOptions.value = []
  kecamatanOptions.value = []
  desaOptions.value = []
  await loadKabupaten(form.value.provinsi_kode)
}

const onKabupatenChange = async () => {
  form.value.kecamatan_kode = ''
  form.value.desa_kelurahan_kode = ''
  kecamatanOptions.value = []
  desaOptions.value = []
  await loadKecamatan(form.value.kabupaten_kota_kode)
}

const onKecamatanChange = async () => {
  form.value.desa_kelurahan_kode = ''
  desaOptions.value = []
  await loadDesa(form.value.kecamatan_kode)
}

const onPickPhoto = (event) => {
  const [file] = event?.target?.files ?? []
  photoFile.value = file ?? null
}

const addCoordinateRow = () => {
  coordinateRows.value.push({ latitude: '', longitude: '' })
}

const removeCoordinateRow = (index) => {
  coordinateRows.value = coordinateRows.value.filter((_, idx) => idx !== index)
}

const buildCoordinates = () => {
  const validRows = coordinateRows.value
    .map((row, index) => ({
      latitude: Number(row.latitude),
      longitude: Number(row.longitude),
      urutan: index + 1,
    }))
    .filter((row) => Number.isFinite(row.latitude) && Number.isFinite(row.longitude))

  if (validRows.length > 0 && validRows.length < 3) {
    throw new Error('Jika mengisi koordinat polygon, minimal 3 titik harus valid.')
  }

  return validRows
}

const submitForm = async () => {
  if (isReadOnly.value) return

  saving.value = true
  error.value = ''
  try {
    if (!form.value.kode.trim()) throw new Error('Kode lahan wajib diisi.')
    if (!form.value.pemilik_id) throw new Error('Pemilik lahan wajib dipilih.')

    const luas = Number(form.value.luas)
    if (!Number.isFinite(luas) || luas <= 0) {
      throw new Error('Luas lahan harus lebih dari 0.')
    }

    const payload = {
      kode: form.value.kode.trim(),
      luas,
      kepemilikan: form.value.kepemilikan,
      pemilik_id: form.value.pemilik_id,
    }

    const elevasi = Number(form.value.elevasi)
    if (form.value.elevasi !== '' && Number.isFinite(elevasi)) {
      payload.elevasi = elevasi
    }

    if (form.value.provinsi_kode) payload.provinsi_kode = form.value.provinsi_kode
    if (form.value.kabupaten_kota_kode) payload.kabupaten_kota_kode = form.value.kabupaten_kota_kode
    if (form.value.kecamatan_kode) payload.kecamatan_kode = form.value.kecamatan_kode
    if (form.value.desa_kelurahan_kode) payload.desa_kelurahan_kode = form.value.desa_kelurahan_kode

    const koordinat = buildCoordinates()
    if (koordinat.length) payload.koordinat = koordinat

    const saved =
      props.mode === 'edit'
        ? await realErpService.updateLand(props.id, payload)
        : await realErpService.createLand(payload)

    if (photoFile.value && saved?.id) {
      await realErpService.uploadLandPhoto(saved.id, photoFile.value)
    }

    toast.success(props.mode === 'edit' ? 'Data lahan berhasil diperbarui.' : 'Data lahan berhasil ditambahkan.')
    router.push('/real/lahan')
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Gagal menyimpan data lahan.'
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
      <button type="button" class="btn-muted" @click="router.push('/real/lahan')">Kembali ke List Lahan</button>
    </div>

    <p v-if="loading" class="text-sm text-emerald-100/80">Menyiapkan form lahan...</p>

    <div v-else class="rounded-2xl border border-white/10 bg-black/20 p-4 sm:p-5">
      <div v-if="error" class="mb-4 rounded-xl border border-red-300/40 bg-red-500/10 px-4 py-3 text-sm text-red-100">
        {{ error }}
      </div>

      <div class="mb-4 rounded-xl border border-white/10 bg-black/20 p-4 text-sm text-emerald-100/85">
        <p class="font-semibold text-white">Pemilik Lahan</p>
        <p>{{ owner?.nama || '-' }} ({{ owner?.id || form.pemilik_id || '-' }})</p>
        <p>{{ owner?.alamat || '-' }}</p>
      </div>

      <div class="grid gap-4 md:grid-cols-2">
        <label class="space-y-1 text-sm text-emerald-100/85">
          <span>Kode Lahan *</span>
          <input v-model="form.kode" class="field w-full" type="text" placeholder="LHN-001" :disabled="isReadOnly" />
        </label>

        <label class="space-y-1 text-sm text-emerald-100/85">
          <span>Luas (ha) *</span>
          <input v-model="form.luas" class="field w-full" type="number" step="0.01" min="0" :disabled="isReadOnly" />
        </label>

        <label class="space-y-1 text-sm text-emerald-100/85">
          <span>Elevasi (mdpl)</span>
          <input v-model="form.elevasi" class="field w-full" type="number" step="0.1" :disabled="isReadOnly" />
        </label>

        <label class="space-y-1 text-sm text-emerald-100/85">
          <span>Kepemilikan *</span>
          <select v-model="form.kepemilikan" class="field w-full" :disabled="isReadOnly">
            <option value="hak milik">Hak Milik</option>
            <option value="sewa">Sewa</option>
            <option value="pinjam">Pinjam</option>
          </select>
        </label>

        <label class="space-y-1 text-sm text-emerald-100/85">
          <span>Pemilik Lahan *</span>
          <select v-model="form.pemilik_id" class="field w-full" :disabled="isReadOnly">
            <option value="">Pilih petani pemilik</option>
            <option v-for="item in farmers" :key="item.id" :value="item.id">{{ item.nama }}</option>
          </select>
        </label>

        <label class="space-y-1 text-sm text-emerald-100/85">
          <span>Provinsi</span>
          <select v-model="form.provinsi_kode" class="field w-full" :disabled="isReadOnly" @change="onProvinsiChange">
            <option value="">Pilih provinsi</option>
            <option v-for="item in provinsiOptions" :key="item.kode" :value="item.kode">{{ item.nama }}</option>
          </select>
        </label>

        <label class="space-y-1 text-sm text-emerald-100/85">
          <span>Kabupaten/Kota</span>
          <select v-model="form.kabupaten_kota_kode" class="field w-full" :disabled="isReadOnly || !form.provinsi_kode" @change="onKabupatenChange">
            <option value="">Pilih kabupaten/kota</option>
            <option v-for="item in kabupatenOptions" :key="item.kode" :value="item.kode">{{ item.nama }}</option>
          </select>
        </label>

        <label class="space-y-1 text-sm text-emerald-100/85">
          <span>Kecamatan</span>
          <select v-model="form.kecamatan_kode" class="field w-full" :disabled="isReadOnly || !form.kabupaten_kota_kode" @change="onKecamatanChange">
            <option value="">Pilih kecamatan</option>
            <option v-for="item in kecamatanOptions" :key="item.kode" :value="item.kode">{{ item.nama }}</option>
          </select>
        </label>

        <label class="space-y-1 text-sm text-emerald-100/85">
          <span>Desa/Kelurahan</span>
          <select v-model="form.desa_kelurahan_kode" class="field w-full" :disabled="isReadOnly || !form.kecamatan_kode">
            <option value="">Pilih desa/kelurahan</option>
            <option v-for="item in desaOptions" :key="item.kode" :value="item.kode">{{ item.nama }}</option>
          </select>
        </label>

        <label v-if="!isReadOnly" class="space-y-1 text-sm text-emerald-100/85 md:col-span-2">
          <span>Foto Lahan (opsional)</span>
          <input class="field w-full" type="file" accept="image/png,image/jpeg,image/webp" @change="onPickPhoto" />
          <p v-if="photoFile" class="text-xs text-emerald-100/70">File dipilih: {{ photoFile.name }}</p>
        </label>
      </div>

      <div class="mt-5 space-y-3">
        <div class="flex items-center justify-between">
          <p class="text-sm font-semibold text-white">Koordinat Polygon (Opsional)</p>
          <button v-if="!isReadOnly" type="button" class="btn-muted" @click="addCoordinateRow">Tambah Titik</button>
        </div>

        <div class="space-y-2">
          <div v-for="(row, index) in coordinateRows" :key="index" class="grid gap-2 rounded-xl border border-white/10 bg-black/20 p-3 md:grid-cols-[1fr,1fr,auto]">
            <input v-model="row.latitude" class="field w-full" type="number" step="0.000001" placeholder="Latitude" :disabled="isReadOnly" />
            <input v-model="row.longitude" class="field w-full" type="number" step="0.000001" placeholder="Longitude" :disabled="isReadOnly" />
            <button v-if="!isReadOnly" type="button" class="icon-action w-full justify-center md:w-auto" @click="removeCoordinateRow(index)">Hapus</button>
          </div>
        </div>
      </div>

      <div class="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
        <button type="button" class="btn-muted w-full sm:w-auto" @click="router.push('/real/lahan')">Kembali</button>
        <button v-if="!isReadOnly" type="button" class="btn-primary w-full sm:w-auto" :disabled="saving" @click="submitForm">
          {{ saving ? 'Menyimpan...' : 'Simpan Lahan' }}
        </button>
      </div>
    </div>
  </section>
</template>
