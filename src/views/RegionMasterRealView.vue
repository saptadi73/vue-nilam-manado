<script setup>
import { ref } from 'vue'
import SectionHeader from '@/components/SectionHeader.vue'
import { realErpService } from '@/services/realErpService'

const loading = ref(false)
const error = ref('')

const searchProvinsi = ref('')
const searchKabupaten = ref('')
const searchKecamatan = ref('')
const searchDesa = ref('')

const provinsiOptions = ref([])
const kabupatenOptions = ref([])
const kecamatanOptions = ref([])
const desaOptions = ref([])

const selectedProvinsi = ref('')
const selectedKabupaten = ref('')
const selectedKecamatan = ref('')

const withLoader = async (work) => {
  loading.value = true
  error.value = ''
  try {
    await work()
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Gagal memuat master wilayah.'
  } finally {
    loading.value = false
  }
}

const loadProvinsi = async () => {
  await withLoader(async () => {
    const data = await realErpService.getProvinsi(searchProvinsi.value.trim())
    provinsiOptions.value = Array.isArray(data) ? data : []
  })
}

const loadKabupaten = async () => {
  if (!selectedProvinsi.value) {
    error.value = 'Pilih provinsi terlebih dahulu.'
    return
  }

  await withLoader(async () => {
    const data = await realErpService.getKabupatenKota(selectedProvinsi.value, searchKabupaten.value.trim())
    kabupatenOptions.value = Array.isArray(data) ? data : []
  })
}

const loadKecamatan = async () => {
  if (!selectedKabupaten.value) {
    error.value = 'Pilih kabupaten/kota terlebih dahulu.'
    return
  }

  await withLoader(async () => {
    const data = await realErpService.getKecamatan(selectedKabupaten.value, searchKecamatan.value.trim())
    kecamatanOptions.value = Array.isArray(data) ? data : []
  })
}

const loadDesa = async () => {
  if (!selectedKecamatan.value) {
    error.value = 'Pilih kecamatan terlebih dahulu.'
    return
  }

  await withLoader(async () => {
    const data = await realErpService.getDesaKelurahan(selectedKecamatan.value, searchDesa.value.trim())
    desaOptions.value = Array.isArray(data) ? data : []
  })
}

const onChangeProvinsi = () => {
  selectedKabupaten.value = ''
  selectedKecamatan.value = ''
  kabupatenOptions.value = []
  kecamatanOptions.value = []
  desaOptions.value = []
}

const onChangeKabupaten = () => {
  selectedKecamatan.value = ''
  kecamatanOptions.value = []
  desaOptions.value = []
}

const onChangeKecamatan = () => {
  desaOptions.value = []
}
</script>

<template>
  <section class="space-y-6">
    <SectionHeader
      eyebrow="Real API"
      title="Master Wilayah GIS"
      description="Eksplorasi data provinsi, kabupaten/kota, kecamatan, dan desa/kelurahan langsung dari endpoint backend."
    />

    <div v-if="error" class="rounded-xl border border-red-300/40 bg-red-500/10 px-4 py-3 text-sm text-red-100">
      {{ error }}
    </div>

    <div class="grid gap-5 lg:grid-cols-2">
      <article class="space-y-3 rounded-2xl border border-white/10 bg-black/20 p-4 sm:p-5">
        <h3 class="text-lg font-semibold text-white">Provinsi</h3>
        <div class="flex flex-col gap-2 sm:flex-row">
          <input v-model="searchProvinsi" class="field flex-1" type="text" placeholder="Cari provinsi..." />
          <button class="btn-primary w-full sm:w-auto" type="button" @click="loadProvinsi">Cari</button>
        </div>
        <select v-model="selectedProvinsi" class="field w-full" @change="onChangeProvinsi">
          <option value="">Pilih provinsi</option>
          <option v-for="item in provinsiOptions" :key="item.kode" :value="item.kode">{{ item.nama }} ({{ item.kode }})</option>
        </select>
      </article>

      <article class="space-y-3 rounded-2xl border border-white/10 bg-black/20 p-4 sm:p-5">
        <h3 class="text-lg font-semibold text-white">Kabupaten/Kota</h3>
        <div class="flex flex-col gap-2 sm:flex-row">
          <input v-model="searchKabupaten" class="field flex-1" type="text" placeholder="Cari kabupaten/kota..." />
          <button class="btn-primary w-full sm:w-auto" type="button" :disabled="!selectedProvinsi" @click="loadKabupaten">Cari</button>
        </div>
        <select v-model="selectedKabupaten" class="field w-full" :disabled="!selectedProvinsi" @change="onChangeKabupaten">
          <option value="">Pilih kabupaten/kota</option>
          <option v-for="item in kabupatenOptions" :key="item.kode" :value="item.kode">{{ item.nama }} ({{ item.kode }})</option>
        </select>
      </article>

      <article class="space-y-3 rounded-2xl border border-white/10 bg-black/20 p-4 sm:p-5">
        <h3 class="text-lg font-semibold text-white">Kecamatan</h3>
        <div class="flex flex-col gap-2 sm:flex-row">
          <input v-model="searchKecamatan" class="field flex-1" type="text" placeholder="Cari kecamatan..." />
          <button class="btn-primary w-full sm:w-auto" type="button" :disabled="!selectedKabupaten" @click="loadKecamatan">Cari</button>
        </div>
        <select v-model="selectedKecamatan" class="field w-full" :disabled="!selectedKabupaten" @change="onChangeKecamatan">
          <option value="">Pilih kecamatan</option>
          <option v-for="item in kecamatanOptions" :key="item.kode" :value="item.kode">{{ item.nama }} ({{ item.kode }})</option>
        </select>
      </article>

      <article class="space-y-3 rounded-2xl border border-white/10 bg-black/20 p-4 sm:p-5">
        <h3 class="text-lg font-semibold text-white">Desa/Kelurahan</h3>
        <div class="flex flex-col gap-2 sm:flex-row">
          <input v-model="searchDesa" class="field flex-1" type="text" placeholder="Cari desa/kelurahan..." />
          <button class="btn-primary w-full sm:w-auto" type="button" :disabled="!selectedKecamatan" @click="loadDesa">Cari</button>
        </div>
        <ul class="max-h-52 space-y-2 overflow-y-auto rounded-xl border border-white/10 bg-black/15 p-3 text-sm text-emerald-100/90">
          <li v-if="!desaOptions.length" class="text-emerald-100/70">Belum ada data desa/kelurahan.</li>
          <li v-for="item in desaOptions" :key="item.kode" class="rounded-lg bg-black/20 px-3 py-2">
            <p class="font-medium text-white">{{ item.nama }}</p>
            <p class="text-xs text-emerald-100/75">Kode: {{ item.kode }}</p>
          </li>
        </ul>
      </article>
    </div>

    <p v-if="loading" class="text-sm text-emerald-100/80">Memuat data wilayah...</p>
  </section>
</template>
