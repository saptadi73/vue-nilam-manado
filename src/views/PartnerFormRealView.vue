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

const provinsiOptions = ref([])
const kabupatenOptions = ref([])
const kecamatanOptions = ref([])

const form = ref({
  nama: '',
  alamat: '',
  hp: '',
  email: '',
  pic: '',
  web: '',
  provinsi_kode: '',
  kabupaten_kota_kode: '',
  kecamatan_kode: '',
})

const pageTitle = computed(() => (props.mode === 'edit' ? 'Edit Data Mitra' : 'Tambah Data Mitra'))
const pageDescription = computed(() => (props.mode === 'edit'
  ? 'Perbarui informasi mitra pembeli/distributor.'
  : 'Tambahkan data mitra baru sebagai rekanan transaksi.'))

const goBack = () => {
  router.push('/real/mitra')
}

const loadProvinsi = async () => {
  const rows = await realErpService.getProvinsi()
  provinsiOptions.value = Array.isArray(rows) ? rows : []
}

const loadKabupaten = async (provinsiKode) => {
  if (!provinsiKode) {
    kabupatenOptions.value = []
    return
  }

  const rows = await realErpService.getKabupatenKota(provinsiKode)
  kabupatenOptions.value = Array.isArray(rows) ? rows : []
}

const loadKecamatan = async (kabupatenKode) => {
  if (!kabupatenKode) {
    kecamatanOptions.value = []
    return
  }

  const rows = await realErpService.getKecamatan(kabupatenKode)
  kecamatanOptions.value = Array.isArray(rows) ? rows : []
}

const onProvinsiChange = async () => {
  form.value.kabupaten_kota_kode = ''
  form.value.kecamatan_kode = ''
  kecamatanOptions.value = []
  await loadKabupaten(form.value.provinsi_kode)
}

const onKabupatenChange = async () => {
  form.value.kecamatan_kode = ''
  await loadKecamatan(form.value.kabupaten_kota_kode)
}

const loadDetail = async () => {
  if (props.mode !== 'edit' || !props.id) return

  const item = await realErpService.getPartnerById(props.id)
  form.value = {
    nama: item?.nama ?? '',
    alamat: item?.alamat ?? '',
    hp: item?.hp ?? '',
    email: item?.email ?? '',
    pic: item?.pic ?? '',
    web: item?.web ?? '',
    provinsi_kode: item?.provinsi_kode ?? '',
    kabupaten_kota_kode: item?.kabupaten_kota_kode ?? '',
    kecamatan_kode: item?.kecamatan_kode ?? '',
  }

  await loadKabupaten(form.value.provinsi_kode)
  await loadKecamatan(form.value.kabupaten_kota_kode)
}

const initPage = async () => {
  loading.value = true
  error.value = ''

  try {
    await loadProvinsi()
    await loadDetail()
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Gagal memuat form data mitra.'
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
      alamat: form.value.alamat.trim(),
      hp: form.value.hp.trim() || null,
      email: form.value.email.trim() || null,
      pic: form.value.pic.trim() || null,
      web: form.value.web.trim() || null,
      provinsi_kode: form.value.provinsi_kode,
      kabupaten_kota_kode: form.value.kabupaten_kota_kode,
      kecamatan_kode: form.value.kecamatan_kode,
    }

    if (props.mode === 'edit' && props.id) {
      await realErpService.updatePartner(props.id, payload)
      toast.success('Data mitra berhasil diperbarui.')
    } else {
      await realErpService.createPartner(payload)
      toast.success('Data mitra berhasil ditambahkan.')
    }

    goBack()
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Gagal menyimpan data mitra.'
  } finally {
    saving.value = false
  }
}

onMounted(initPage)
</script>

<template>
  <section class="space-y-6">
    <SectionHeader eyebrow="Master Data" :title="pageTitle" :description="pageDescription" />

    <DataToolbar content-class="flex flex-wrap gap-2">
      <ActionButton variant="muted" @click="goBack">Kembali ke List</ActionButton>
    </DataToolbar>

    <ListLoadingState v-if="loading" :card-count="4" />

    <div v-else class="rounded-2xl border border-white/10 bg-black/20 p-4 sm:p-5">
      <div v-if="error" class="mb-4 rounded-xl border border-red-300/40 bg-red-500/10 px-4 py-3 text-sm text-red-100">
        {{ error }}
      </div>

      <form class="grid gap-4 md:grid-cols-2" @submit.prevent="submitForm">
        <label class="space-y-1 text-sm text-emerald-100/85 md:col-span-2">
          <span>Nama Mitra *</span>
          <input v-model="form.nama" class="field w-full" type="text" required />
        </label>

        <label class="space-y-1 text-sm text-emerald-100/85 md:col-span-2">
          <span>Alamat *</span>
          <textarea v-model="form.alamat" class="field w-full" rows="2" required></textarea>
        </label>

        <label class="space-y-1 text-sm text-emerald-100/85">
          <span>HP</span>
          <input v-model="form.hp" class="field w-full" type="text" />
        </label>

        <label class="space-y-1 text-sm text-emerald-100/85">
          <span>Email</span>
          <input v-model="form.email" class="field w-full" type="email" />
        </label>

        <label class="space-y-1 text-sm text-emerald-100/85">
          <span>PIC</span>
          <input v-model="form.pic" class="field w-full" type="text" />
        </label>

        <label class="space-y-1 text-sm text-emerald-100/85">
          <span>Website</span>
          <input v-model="form.web" class="field w-full" type="url" placeholder="https://" />
        </label>

        <label class="space-y-1 text-sm text-emerald-100/85">
          <span>Provinsi *</span>
          <select v-model="form.provinsi_kode" class="field w-full" required @change="onProvinsiChange">
            <option value="">Pilih provinsi</option>
            <option v-for="item in provinsiOptions" :key="item.kode" :value="item.kode">{{ item.nama }}</option>
          </select>
        </label>

        <label class="space-y-1 text-sm text-emerald-100/85">
          <span>Kabupaten/Kota *</span>
          <select
            v-model="form.kabupaten_kota_kode"
            class="field w-full"
            :disabled="!form.provinsi_kode"
            required
            @change="onKabupatenChange"
          >
            <option value="">Pilih kabupaten/kota</option>
            <option v-for="item in kabupatenOptions" :key="item.kode" :value="item.kode">{{ item.nama }}</option>
          </select>
        </label>

        <label class="space-y-1 text-sm text-emerald-100/85 md:col-span-2">
          <span>Kecamatan *</span>
          <select v-model="form.kecamatan_kode" class="field w-full" :disabled="!form.kabupaten_kota_kode" required>
            <option value="">Pilih kecamatan</option>
            <option v-for="item in kecamatanOptions" :key="item.kode" :value="item.kode">{{ item.nama }}</option>
          </select>
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
