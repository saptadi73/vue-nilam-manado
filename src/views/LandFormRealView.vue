<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import L from 'leaflet'
import { useRoute, useRouter } from 'vue-router'
import ActionButton from '@/components/ActionButton.vue'
import DataToolbar from '@/components/DataToolbar.vue'
import ListLoadingState from '@/components/ListLoadingState.vue'
import SectionHeader from '@/components/SectionHeader.vue'
import { useToast } from '@/composables/useToast'
import { appConfig } from '@/config/env'
import { realErpService, toAbsoluteUrl } from '@/services/realErpService'

const props = defineProps({
  mode: { type: String, default: 'create' },
  id: { type: String, default: '' },
})

const route = useRoute()
const router = useRouter()
const toast = useToast()

const ownerIdFromQuery = String(route.query.pemilik_id ?? '').trim()
const LAND_OWNERSHIP_OPTIONS = ['hak milik', 'sewa', 'pinjam']
const IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_PHOTO_SIZE_BYTES = 5 * 1024 * 1024

const loading = ref(false)
const saving = ref(false)
const error = ref('')
const landData = ref(null)
const owner = ref(null)
const photoFile = ref(null)
const pickedPhotoUrl = ref('')
const pickedPhotoObjectUrl = ref('')
const farmers = ref([])
const defaultPhoto = appConfig.defaultFarmerPhotoUrl

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

const gettingGpsIndex = ref(null)
const mapEl = ref(null)
let mapInstance = null
let polygonLayer = null
let pointMarkers = []

const validPolygonPoints = computed(() =>
  coordinateRows.value
    .filter((row) => {
      const lat = Number(row.latitude)
      const lng = Number(row.longitude)
      return (
        String(row.latitude).trim() !== '' &&
        String(row.longitude).trim() !== '' &&
        Number.isFinite(lat) &&
        Number.isFinite(lng)
      )
    })
    .map((row) => [Number(row.latitude), Number(row.longitude)]),
)

const showMap = computed(() => validPolygonPoints.value.length >= 3)
const currentPhotoUrl = computed(() => {
  if (pickedPhotoUrl.value) return pickedPhotoUrl.value
  if (landData.value?.foto_url) return toAbsoluteUrl(landData.value.foto_url)
  return defaultPhoto
})

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
  landData.value = land
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

  if (pickedPhotoObjectUrl.value) {
    URL.revokeObjectURL(pickedPhotoObjectUrl.value)
    pickedPhotoObjectUrl.value = ''
  }
  pickedPhotoUrl.value = ''

  if (!file) {
    photoFile.value = null
    return
  }

  if (!IMAGE_MIME_TYPES.includes(file.type)) {
    toast.error('Format foto lahan harus JPG, PNG, atau WEBP.')
    photoFile.value = null
    event.target.value = ''
    return
  }

  if (file.size > MAX_PHOTO_SIZE_BYTES) {
    toast.error('Ukuran foto lahan maksimal 5MB.')
    photoFile.value = null
    event.target.value = ''
    return
  }

  photoFile.value = file

  if (typeof FileReader !== 'undefined') {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        pickedPhotoUrl.value = reader.result
      }
    }
    reader.onerror = () => {
      pickedPhotoObjectUrl.value = URL.createObjectURL(file)
      pickedPhotoUrl.value = pickedPhotoObjectUrl.value
    }
    reader.readAsDataURL(file)
    return
  }

  pickedPhotoObjectUrl.value = URL.createObjectURL(file)
  pickedPhotoUrl.value = pickedPhotoObjectUrl.value
}

const addCoordinateRow = () => {
  coordinateRows.value.push({ latitude: '', longitude: '' })
}

const removeCoordinateRow = (index) => {
  coordinateRows.value = coordinateRows.value.filter((_, idx) => idx !== index)
}

const captureGps = (index) => {
  if (!navigator.geolocation) {
    toast.error('Browser tidak mendukung geolokasi GPS.')
    return
  }
  gettingGpsIndex.value = index
  navigator.geolocation.getCurrentPosition(
    (position) => {
      coordinateRows.value[index].latitude = String(position.coords.latitude.toFixed(6))
      coordinateRows.value[index].longitude = String(position.coords.longitude.toFixed(6))
      gettingGpsIndex.value = null
      toast.success(`Koordinat GPS titik ${index + 1} berhasil diambil.`)
    },
    (err) => {
      gettingGpsIndex.value = null
      toast.error(`Gagal mengambil GPS: ${err.message}`)
    },
    { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 },
  )
}

const destroyMap = () => {
  if (!mapInstance) return
  mapInstance.remove()
  mapInstance = null
  polygonLayer = null
  pointMarkers = []
}

const buildMap = async () => {
  await nextTick()
  if (!mapEl.value) return

  if (!mapInstance) {
    mapInstance = L.map(mapEl.value)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '\u00a9 OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(mapInstance)
  }

  if (polygonLayer) {
    mapInstance.removeLayer(polygonLayer)
    polygonLayer = null
  }
  pointMarkers.forEach((m) => mapInstance.removeLayer(m))
  pointMarkers = []

  const pts = validPolygonPoints.value
  if (pts.length < 3) return

  polygonLayer = L.polygon(pts, { color: '#10b981', fillColor: '#10b981', fillOpacity: 0.2, weight: 2 }).addTo(mapInstance)

  pts.forEach((pt, idx) => {
    const marker = L.circleMarker(pt, {
      radius: 7,
      color: '#10b981',
      fillColor: '#ffffff',
      fillOpacity: 0.9,
      weight: 2,
    }).addTo(mapInstance)
    marker.bindTooltip(`Titik ${idx + 1}`, { permanent: false, direction: 'top' })
    pointMarkers.push(marker)
  })

  mapInstance.fitBounds(polygonLayer.getBounds(), { padding: [28, 28] })
}

watch(
  validPolygonPoints,
  async (pts) => {
    if (pts.length < 3) {
      destroyMap()
      return
    }
    await buildMap()
  },
  { deep: true },
)

const buildCoordinates = () => {
  const hasIncomplete = coordinateRows.value.some((row) => {
    const hasLat = String(row.latitude).trim() !== ''
    const hasLng = String(row.longitude).trim() !== ''
    return (hasLat || hasLng) && !(hasLat && hasLng)
  })

  if (hasIncomplete) {
    throw new Error('Setiap titik koordinat harus memiliki latitude dan longitude sekaligus.')
  }

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

  const hasOutOfRange = validRows.some((row) => row.latitude < -90 || row.latitude > 90 || row.longitude < -180 || row.longitude > 180)
  if (hasOutOfRange) {
    throw new Error('Latitude harus antara -90 sampai 90, dan longitude antara -180 sampai 180.')
  }

  return validRows
}

const validateRegionHierarchy = () => {
  const provinsiKode = String(form.value.provinsi_kode ?? '').trim()
  const kabupatenKode = String(form.value.kabupaten_kota_kode ?? '').trim()
  const kecamatanKode = String(form.value.kecamatan_kode ?? '').trim()
  const desaKode = String(form.value.desa_kelurahan_kode ?? '').trim()
  const filledCount = [provinsiKode, kabupatenKode, kecamatanKode, desaKode].filter(Boolean).length

  if (filledCount === 0) return ''
  if (filledCount < 4) return 'Jika mengisi wilayah lahan, isi lengkap dari provinsi sampai desa/kelurahan.'

  if (!/^\d{2}$/.test(provinsiKode)) return 'Kode provinsi lahan harus 2 digit.'
  if (!/^\d{4}$/.test(kabupatenKode)) return 'Kode kabupaten/kota lahan harus 4 digit.'
  if (!/^\d{6}$/.test(kecamatanKode)) return 'Kode kecamatan lahan harus 6 digit.'
  if (!/^\d{10}$/.test(desaKode)) return 'Kode desa/kelurahan lahan harus 10 digit.'

  if (!kabupatenKode.startsWith(provinsiKode)) return 'Kode kabupaten/kota lahan tidak sesuai provinsi.'
  if (!kecamatanKode.startsWith(kabupatenKode)) return 'Kode kecamatan lahan tidak sesuai kabupaten/kota.'
  if (!desaKode.startsWith(kecamatanKode)) return 'Kode desa/kelurahan lahan tidak sesuai kecamatan.'

  return ''
}

const validateForm = () => {
  const kode = String(form.value.kode ?? '').trim()
  if (!kode) return 'Kode lahan wajib diisi.'
  if (kode.length > 50) return 'Kode lahan maksimal 50 karakter.'

  if (!form.value.pemilik_id) return 'Pemilik lahan wajib dipilih.'

  const luas = Number(form.value.luas)
  if (!Number.isFinite(luas) || luas <= 0) return 'Luas lahan harus lebih dari 0.'

  if (!LAND_OWNERSHIP_OPTIONS.includes(form.value.kepemilikan)) {
    return 'Kepemilikan harus salah satu dari: hak milik, sewa, pinjam.'
  }

  const elevasiRaw = String(form.value.elevasi ?? '').trim()
  if (elevasiRaw) {
    const elevasi = Number(elevasiRaw)
    if (!Number.isFinite(elevasi)) return 'Elevasi harus berupa angka.'
  }

  return validateRegionHierarchy()
}

const ensureLandCodeNotDuplicate = async (kode, currentId = '') => {
  const rows = await realErpService.getLands({ search: kode })
  if (!Array.isArray(rows)) return

  const duplicate = rows.find((item) => String(item?.kode ?? '').trim().toLowerCase() === kode.toLowerCase() && String(item?.id ?? '') !== String(currentId ?? ''))
  if (duplicate) {
    throw new Error('Kode lahan sudah terdaftar. Gunakan kode lain.')
  }
}

const submitForm = async () => {
  if (isReadOnly.value) return

  const validationError = validateForm()
  if (validationError) {
    toast.error(validationError)
    return
  }

  saving.value = true
  error.value = ''
  try {
    const kode = form.value.kode.trim()
    await ensureLandCodeNotDuplicate(kode, props.mode === 'edit' ? props.id : '')

    const luas = Number(form.value.luas)

    const payload = {
      kode,
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
onUnmounted(() => {
  destroyMap()
  if (pickedPhotoObjectUrl.value) {
    URL.revokeObjectURL(pickedPhotoObjectUrl.value)
  }
})
</script>

<template>
  <section class="space-y-6">
    <SectionHeader eyebrow="Real API" :title="pageTitle" :description="pageDescription" />

    <DataToolbar content-class="flex flex-wrap gap-2">
      <ActionButton variant="muted" @click="router.push('/real/lahan')">Kembali ke List Lahan</ActionButton>
    </DataToolbar>

    <ListLoadingState v-if="loading" :card-count="4" />

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

        <div class="md:col-span-2">
          <p class="mb-2 text-sm text-emerald-100/85">Preview Foto Lahan</p>
          <div class="lg:flex lg:justify-center">
            <img
              :src="currentPhotoUrl"
              alt="Preview foto lahan"
              class="h-48 w-full rounded-xl border border-white/10 object-cover sm:h-56 md:h-64 lg:h-64 lg:w-64 xl:h-72 xl:w-72"
            />
          </div>
        </div>
      </div>

      <div class="mt-5 space-y-3">
        <div class="flex items-center justify-between">
          <p class="text-sm font-semibold text-white">Koordinat Polygon (Opsional)</p>
          <ActionButton v-if="!isReadOnly" variant="muted" @click="addCoordinateRow">Tambah Titik</ActionButton>
        </div>

        <div class="space-y-2">
          <div
            v-for="(row, index) in coordinateRows"
            :key="index"
            class="flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-black/20 p-3"
          >
            <span class="w-5 shrink-0 text-center text-xs font-bold text-emerald-100/50">{{ index + 1 }}</span>
            <input v-model="row.latitude" class="field min-w-28 flex-1" type="number" step="0.000001" placeholder="Latitude" :disabled="isReadOnly" />
            <input v-model="row.longitude" class="field min-w-28 flex-1" type="number" step="0.000001" placeholder="Longitude" :disabled="isReadOnly" />
            <template v-if="!isReadOnly">
              <button
                type="button"
                :title="'Ambil koordinat GPS untuk titik ' + (index + 1)"
                :disabled="gettingGpsIndex !== null"
                class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-cyan-400/40 bg-cyan-500/20 text-cyan-300 transition hover:bg-cyan-500/35 disabled:cursor-not-allowed disabled:opacity-50"
                @click="captureGps(index)"
              >
                <svg v-if="gettingGpsIndex === index" xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path stroke-linecap="round" stroke-linejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
              <ActionButton full-width @click="removeCoordinateRow(index)">Hapus</ActionButton>
            </template>
          </div>

          <!-- Preview peta polygon -->
          <div v-if="showMap" class="mt-2 overflow-hidden rounded-xl border border-emerald-500/30">
            <div class="flex items-center gap-2 bg-black/30 px-3 py-1.5">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
              <span class="text-xs text-emerald-100/70">Preview Polygon — {{ validPolygonPoints.length }} titik</span>
            </div>
            <div ref="mapEl" class="h-72 w-full" />
          </div>
          <p v-else-if="!isReadOnly" class="text-xs text-emerald-100/50">Peta akan muncul setelah minimal 3 titik koordinat terisi.</p>
        </div>
      </div>

      <div class="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
        <ActionButton variant="muted" full-width @click="router.push('/real/lahan')">Kembali</ActionButton>
        <button v-if="!isReadOnly" type="button" class="btn-primary w-full sm:w-auto" :disabled="saving" @click="submitForm">
          {{ saving ? 'Menyimpan...' : 'Simpan Lahan' }}
        </button>
      </div>
    </div>
  </section>
</template>
