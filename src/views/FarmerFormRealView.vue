<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import ActionButton from '@/components/ActionButton.vue'
import DataToolbar from '@/components/DataToolbar.vue'
import ListLoadingState from '@/components/ListLoadingState.vue'
import { appConfig } from '@/config/env'
import SectionHeader from '@/components/SectionHeader.vue'
import { realErpService, toAbsoluteUrl } from '@/services/realErpService'
import { useToast } from '@/composables/useToast'

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

const defaultPhoto = appConfig.defaultFarmerPhotoUrl

const form = ref({
  nama: '',
  nik: '',
  alamat: '',
  hp: '',
  provinsi_kode: '',
  kabupaten_kota_kode: '',
  kecamatan_kode: '',
  desa_kelurahan_kode: '',
})

const loading = ref(false)
const saving = ref(false)
const error = ref('')
const farmerData = ref(null)
const photoFile = ref(null)
const pickedPhotoUrl = ref('')
const pickedPhotoObjectUrl = ref('')

const provinsiOptions = ref([])
const kabupatenOptions = ref([])
const kecamatanOptions = ref([])
const desaOptions = ref([])

const isReadOnly = computed(() => props.mode === 'detail')

const pageTitle = computed(() => {
  if (props.mode === 'create') return 'Tambah Petani Real'
  if (props.mode === 'edit') return 'Edit Petani Real'
  return 'Detail Petani Real'
})

const pageDescription = computed(() => {
  if (props.mode === 'create') return 'Input data petani baru langsung ke backend.'
  if (props.mode === 'edit') return 'Perbarui data petani yang sudah tersimpan.'
  return 'Tinjau informasi lengkap petani dari API real.'
})

const currentPhotoUrl = computed(() => {
  if (pickedPhotoUrl.value) return pickedPhotoUrl.value
  if (farmerData.value?.foto_url) return toAbsoluteUrl(farmerData.value.foto_url)
  return defaultPhoto
})

const loadProvinsi = async () => {
  const result = await realErpService.getProvinsi()
  provinsiOptions.value = Array.isArray(result) ? result : []
}

const loadKabupaten = async (provinsiKode) => {
  if (!provinsiKode) {
    kabupatenOptions.value = []
    return
  }
  const result = await realErpService.getKabupatenKota(provinsiKode)
  kabupatenOptions.value = Array.isArray(result) ? result : []
}

const loadKecamatan = async (kabupatenKotaKode) => {
  if (!kabupatenKotaKode) {
    kecamatanOptions.value = []
    return
  }
  const result = await realErpService.getKecamatan(kabupatenKotaKode)
  kecamatanOptions.value = Array.isArray(result) ? result : []
}

const loadDesa = async (kecamatanKode) => {
  if (!kecamatanKode) {
    desaOptions.value = []
    return
  }
  const result = await realErpService.getDesaKelurahan(kecamatanKode)
  desaOptions.value = Array.isArray(result) ? result : []
}

const loadFarmerDetail = async () => {
  if (!props.id) return

  const farmer = await realErpService.getFarmerById(props.id)
  farmerData.value = farmer
  form.value = {
    nama: farmer?.nama ?? '',
    nik: farmer?.nik ?? '',
    alamat: farmer?.alamat ?? '',
    hp: farmer?.hp ?? '',
    provinsi_kode: farmer?.provinsi_kode ?? '',
    kabupaten_kota_kode: farmer?.kabupaten_kota_kode ?? '',
    kecamatan_kode: farmer?.kecamatan_kode ?? '',
    desa_kelurahan_kode: farmer?.desa_kelurahan_kode ?? '',
  }
}

const initPage = async () => {
  loading.value = true
  error.value = ''
  try {
    await loadProvinsi()

    if (props.mode !== 'create') {
      await loadFarmerDetail()
      await loadKabupaten(form.value.provinsi_kode)
      await loadKecamatan(form.value.kabupaten_kota_kode)
      await loadDesa(form.value.kecamatan_kode)
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Gagal memuat halaman form petani.'
  } finally {
    loading.value = false
  }
}

const onPickPhoto = (event) => {
  const [file] = event?.target?.files ?? []

  if (pickedPhotoObjectUrl.value) {
    URL.revokeObjectURL(pickedPhotoObjectUrl.value)
    pickedPhotoObjectUrl.value = ''
  }

  if (pickedPhotoUrl.value) {
    pickedPhotoUrl.value = ''
  }

  photoFile.value = file ?? null

  if (!file) return

  // Prefer Data URL to ensure preview renders consistently across environments.
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

const validateForm = () => {
  const required = ['nama', 'nik', 'alamat', 'provinsi_kode', 'kabupaten_kota_kode', 'kecamatan_kode', 'desa_kelurahan_kode']
  const invalid = required.some((key) => !String(form.value[key] ?? '').trim())
  if (invalid) return 'Field bertanda * wajib diisi.'

  const nik = String(form.value.nik ?? '').trim()
  if (!/^\d{16}$/.test(nik)) {
    return 'NIK harus 16 digit angka.'
  }

  const provinsiKode = String(form.value.provinsi_kode ?? '').trim()
  const kabupatenKode = String(form.value.kabupaten_kota_kode ?? '').trim()
  const kecamatanKode = String(form.value.kecamatan_kode ?? '').trim()
  const desaKode = String(form.value.desa_kelurahan_kode ?? '').trim()

  if (!/^\d{2}$/.test(provinsiKode)) return 'Kode provinsi harus 2 digit.'
  if (!/^\d{4}$/.test(kabupatenKode)) return 'Kode kabupaten/kota harus 4 digit.'
  if (!/^\d{6}$/.test(kecamatanKode)) return 'Kode kecamatan harus 6 digit.'
  if (!/^\d{10}$/.test(desaKode)) return 'Kode desa/kelurahan harus 10 digit.'

  if (!kabupatenKode.startsWith(provinsiKode)) {
    return 'Kode kabupaten/kota tidak sesuai provinsi.'
  }
  if (!kecamatanKode.startsWith(kabupatenKode)) {
    return 'Kode kecamatan tidak sesuai kabupaten/kota.'
  }
  if (!desaKode.startsWith(kecamatanKode)) {
    return 'Kode desa/kelurahan tidak sesuai kecamatan.'
  }

  const hp = String(form.value.hp ?? '').trim()
  if (hp && !/^\+?[0-9]{8,15}$/.test(hp)) {
    return 'No. HP harus berupa 8-15 digit angka (boleh diawali +).'
  }

  return ''
}

const ensureNikNotDuplicate = async (nik, currentId = '') => {
  const rows = await realErpService.getFarmers(nik)
  if (!Array.isArray(rows)) return

  const duplicate = rows.find((item) => String(item?.nik ?? '').trim() === nik && String(item?.id ?? '') !== String(currentId ?? ''))
  if (duplicate) {
    throw new Error('NIK petani sudah terdaftar. Gunakan NIK lain.')
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
    const hp = form.value.hp.trim()
    const nik = form.value.nik.trim()

    // Prevent common 422 from duplicate NIK before POST/PUT request.
    await ensureNikNotDuplicate(nik, props.mode === 'edit' ? props.id : '')

    const payload = {
      nama: form.value.nama.trim(),
      nik,
      alamat: form.value.alamat.trim(),
      provinsi_kode: form.value.provinsi_kode,
      kabupaten_kota_kode: form.value.kabupaten_kota_kode,
      kecamatan_kode: form.value.kecamatan_kode,
      desa_kelurahan_kode: form.value.desa_kelurahan_kode,
    }

    if (hp) {
      payload.hp = hp
    }

    let saved = null

    if (props.mode === 'create') {
      saved = await realErpService.createFarmer(payload)
    } else {
      saved = await realErpService.updateFarmer(props.id, payload)
    }

    if (photoFile.value && saved?.id) {
      await realErpService.uploadFarmerPhoto(saved.id, photoFile.value)
    }

    toast.success(props.mode === 'create' ? 'Data petani berhasil ditambahkan.' : 'Data petani berhasil diperbarui.')
    router.push('/real/petani')
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Gagal menyimpan data petani.'
    error.value = msg
    toast.error(msg)
  } finally {
    saving.value = false
  }
}

const goBack = () => {
  router.push('/real/petani')
}

onMounted(initPage)
onUnmounted(() => {
  if (pickedPhotoObjectUrl.value) {
    URL.revokeObjectURL(pickedPhotoObjectUrl.value)
  }
})
</script>

<template>
  <section class="space-y-6">
    <SectionHeader eyebrow="Real API" :title="pageTitle" :description="pageDescription" />

    <DataToolbar content-class="flex flex-wrap gap-2">
      <ActionButton variant="muted" @click="goBack">Kembali ke List</ActionButton>
    </DataToolbar>

    <ListLoadingState v-if="loading" :card-count="4" />

    <div v-else class="rounded-2xl border border-white/10 bg-black/20 p-4 sm:p-5">
      <div v-if="error" class="mb-4 rounded-xl border border-red-300/40 bg-red-500/10 px-4 py-3 text-sm text-red-100">
        {{ error }}
      </div>

      <div class="grid gap-4 md:grid-cols-2">
        <label class="space-y-1 text-sm text-emerald-100/85">
          <span>Nama *</span>
          <input v-model="form.nama" :disabled="isReadOnly" class="field w-full" type="text" />
        </label>

        <label class="space-y-1 text-sm text-emerald-100/85">
          <span>NIK *</span>
          <input v-model="form.nik" :disabled="isReadOnly" class="field w-full" type="text" />
        </label>

        <label class="space-y-1 text-sm text-emerald-100/85 md:col-span-2">
          <span>Alamat *</span>
          <textarea v-model="form.alamat" :disabled="isReadOnly" class="field w-full" rows="2"></textarea>
        </label>

        <label class="space-y-1 text-sm text-emerald-100/85">
          <span>No. HP</span>
          <input v-model="form.hp" :disabled="isReadOnly" class="field w-full" type="text" />
        </label>

        <label class="space-y-1 text-sm text-emerald-100/85">
          <span>Provinsi *</span>
          <select v-model="form.provinsi_kode" :disabled="isReadOnly" class="field w-full" @change="onProvinsiChange">
            <option value="">Pilih provinsi</option>
            <option v-for="item in provinsiOptions" :key="item.kode" :value="item.kode">{{ item.nama }}</option>
          </select>
        </label>

        <label class="space-y-1 text-sm text-emerald-100/85">
          <span>Kabupaten/Kota *</span>
          <select
            v-model="form.kabupaten_kota_kode"
            :disabled="isReadOnly || !form.provinsi_kode"
            class="field w-full"
            @change="onKabupatenChange"
          >
            <option value="">Pilih kabupaten/kota</option>
            <option v-for="item in kabupatenOptions" :key="item.kode" :value="item.kode">{{ item.nama }}</option>
          </select>
        </label>

        <label class="space-y-1 text-sm text-emerald-100/85">
          <span>Kecamatan *</span>
          <select v-model="form.kecamatan_kode" :disabled="isReadOnly || !form.kabupaten_kota_kode" class="field w-full" @change="onKecamatanChange">
            <option value="">Pilih kecamatan</option>
            <option v-for="item in kecamatanOptions" :key="item.kode" :value="item.kode">{{ item.nama }}</option>
          </select>
        </label>

        <label class="space-y-1 text-sm text-emerald-100/85">
          <span>Desa/Kelurahan *</span>
          <select v-model="form.desa_kelurahan_kode" :disabled="isReadOnly || !form.kecamatan_kode" class="field w-full">
            <option value="">Pilih desa/kelurahan</option>
            <option v-for="item in desaOptions" :key="item.kode" :value="item.kode">{{ item.nama }}</option>
          </select>
        </label>

        <label v-if="!isReadOnly" class="space-y-1 text-sm text-emerald-100/85 md:col-span-2">
          <span>Foto Petani (opsional)</span>
          <input class="field w-full" type="file" accept="image/png,image/jpeg,image/webp" @change="onPickPhoto" />
          <p v-if="photoFile" class="text-xs text-emerald-100/70">File dipilih: {{ photoFile.name }}</p>
        </label>

        <div class="md:col-span-2">
          <p class="mb-2 text-sm text-emerald-100/85">Preview Foto</p>
          <div class="lg:flex lg:justify-center">
            <img
              :src="currentPhotoUrl"
              alt="Preview foto petani"
              class="h-48 w-full rounded-xl border border-white/10 object-cover sm:h-56 md:h-64 lg:h-64 lg:w-64 xl:h-72 xl:w-72"
            />
          </div>
        </div>
      </div>

      <div class="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
        <ActionButton variant="muted" full-width @click="goBack">Batal</ActionButton>
        <button v-if="!isReadOnly" type="button" class="btn-primary w-full sm:w-auto" :disabled="saving" @click="submitForm">
          {{ saving ? 'Menyimpan...' : 'Simpan' }}
        </button>
      </div>
    </div>
  </section>
</template>
