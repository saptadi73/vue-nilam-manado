<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import ActionButton from '@/components/ActionButton.vue'
import DataToolbar from '@/components/DataToolbar.vue'
import ListLoadingState from '@/components/ListLoadingState.vue'
import PageState from '@/components/PageState.vue'
import SectionHeader from '@/components/SectionHeader.vue'
import { realErpService } from '@/services/realErpService'
import { fmtNumber } from '@/utils/formatters'

const props = defineProps({
  id: {
    type: String,
    required: true,
  },
})

const router = useRouter()

const loading = ref(false)
const error = ref('')
const farmer = ref(null)
const plantingItems = ref([])
const oilItems = ref([])

const isUnfinishedStatus = (status) => String(status ?? '').toLowerCase() !== 'selesai'

const loadData = async () => {
  loading.value = true
  error.value = ''

  try {
    const [farmerData, plantingData, oilData] = await Promise.all([
      realErpService.getFarmerById(props.id),
      realErpService.getPlantingProductions({ petani_id: props.id }),
      realErpService.getOilProductions({ petani_id: props.id }),
    ])

    farmer.value = farmerData ?? null

    const plantingRows = Array.isArray(plantingData) ? plantingData : []
    const oilRows = Array.isArray(oilData) ? oilData : []

    plantingItems.value = plantingRows.filter((item) => isUnfinishedStatus(item?.status))
    oilItems.value = oilRows.filter((item) => isUnfinishedStatus(item?.status))
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Gagal memuat data update produksi petani.'
  } finally {
    loading.value = false
  }
}

const totalPending = computed(() => plantingItems.value.length + oilItems.value.length)

const goToFarmerList = () => {
  router.push('/real/petani')
}

const goToPlantingEdit = (id) => {
  router.push(`/real/produksi-tanam/${id}/edit`)
}

const goToPlantingDetail = (id) => {
  router.push(`/real/produksi-tanam/${id}`)
}

const goToOilEdit = (id) => {
  router.push(`/real/produksi-minyak/${id}/edit`)
}

const goToOilDetail = (id) => {
  router.push(`/real/produksi-minyak/${id}`)
}

const goToPlantingList = () => {
  router.push({
    path: '/real/produksi-tanam',
    query: { petani_id: props.id, status: 'belum_selesai' },
  })
}

const goToOilList = () => {
  router.push({
    path: '/real/produksi-minyak',
    query: { petani_id: props.id, status: 'belum_selesai' },
  })
}

onMounted(loadData)
</script>

<template>
  <section class="space-y-6">
    <SectionHeader
      eyebrow="Real API"
      title="Update Produksi Petani"
      :description="`Pusat update produksi belum selesai untuk ${farmer?.nama || 'petani terpilih'}.`"
    />

    <DataToolbar content-class="flex flex-wrap gap-2">
      <ActionButton variant="primary" @click="loadData">Refresh</ActionButton>
      <ActionButton variant="muted" @click="goToPlantingList">List Tanam Belum Selesai</ActionButton>
      <ActionButton variant="muted" @click="goToOilList">List Minyak Belum Selesai</ActionButton>
      <ActionButton variant="muted" @click="goToFarmerList">Kembali ke Master Petani</ActionButton>
    </DataToolbar>

    <ListLoadingState v-if="loading" :card-count="4" />

    <PageState
      v-else-if="error"
      variant="error"
      title="Data update produksi belum berhasil dimuat"
      :description="error"
      action-label="Coba Lagi"
      @action="loadData"
    />

    <template v-else>
      <div class="grid gap-3 md:grid-cols-3">
        <div class="rounded-xl border border-white/10 bg-black/20 px-4 py-3">
          <p class="text-xs text-emerald-100/70">Petani</p>
          <p class="mt-1 text-sm font-semibold text-white">{{ farmer?.nama || '-' }}</p>
        </div>
        <div class="rounded-xl border border-white/10 bg-black/20 px-4 py-3">
          <p class="text-xs text-emerald-100/70">Produksi Tanam Pending</p>
          <p class="mt-1 text-sm font-semibold text-white">{{ plantingItems.length }} item</p>
        </div>
        <div class="rounded-xl border border-white/10 bg-black/20 px-4 py-3">
          <p class="text-xs text-emerald-100/70">Produksi Minyak Pending</p>
          <p class="mt-1 text-sm font-semibold text-white">{{ oilItems.length }} item</p>
        </div>
      </div>

      <p class="text-sm text-emerald-100/80">Total item belum selesai: {{ totalPending }}</p>

      <div class="grid gap-4 lg:grid-cols-2">
        <article class="rounded-2xl border border-white/10 bg-linear-to-br from-white/8 to-white/3 p-4">
          <div class="mb-3 flex items-center justify-between gap-3">
            <h3 class="text-base font-bold text-white">Produksi Tanam Belum Selesai</h3>
            <span class="rounded-full bg-emerald-500/20 px-2 py-1 text-xs font-semibold text-emerald-50">{{ plantingItems.length }} item</span>
          </div>

          <PageState
            v-if="!plantingItems.length"
            title="Tidak ada produksi tanam pending"
            description="Semua produksi tanam milik petani ini sudah selesai atau belum ada data yang perlu diperbarui."
          />

          <div v-else class="space-y-3">
            <div v-for="item in plantingItems" :key="item.id" class="rounded-lg border border-white/10 bg-black/20 p-3">
              <div class="flex items-start justify-between gap-3">
                <div>
                  <p class="text-xs text-emerald-100/75">{{ item.kode }}</p>
                  <p class="text-sm font-semibold text-white">Lahan: {{ item.lahan?.kode || item.lahan_kode || item.lahan_id || '-' }}</p>
                </div>
                <span class="rounded-full bg-amber-500/20 px-2 py-1 text-xs font-semibold text-amber-50">{{ item.status || '-' }}</span>
              </div>
              <div class="mt-2 grid grid-cols-1 gap-2 text-xs text-emerald-100/90 sm:grid-cols-2">
                <p class="rounded bg-black/20 px-2 py-1">Mulai: {{ item.tanggal_mulai || '-' }}</p>
                <p class="rounded bg-black/20 px-2 py-1">Akhir: {{ item.tanggal_akhir || '-' }}</p>
                <p class="rounded bg-black/20 px-2 py-1 sm:col-span-2">Hasil Basah: {{ fmtNumber(item.aktual_hasil_produksi_basah ?? item.hasil_produksi_basah ?? 0) }} kg</p>
              </div>
              <div class="mt-3 flex flex-col gap-2 sm:flex-row">
                <ActionButton full-width @click="goToPlantingDetail(item.id)">Detail</ActionButton>
                <ActionButton variant="primary" full-width @click="goToPlantingEdit(item.id)">Update</ActionButton>
              </div>
            </div>
          </div>
        </article>

        <article class="rounded-2xl border border-white/10 bg-linear-to-br from-white/8 to-white/3 p-4">
          <div class="mb-3 flex items-center justify-between gap-3">
            <h3 class="text-base font-bold text-white">Produksi Minyak Belum Selesai</h3>
            <span class="rounded-full bg-cyan-500/20 px-2 py-1 text-xs font-semibold text-cyan-50">{{ oilItems.length }} item</span>
          </div>

          <PageState
            v-if="!oilItems.length"
            title="Tidak ada produksi minyak pending"
            description="Semua produksi minyak milik petani ini sudah selesai atau belum ada data yang perlu diperbarui."
          />

          <div v-else class="space-y-3">
            <div v-for="item in oilItems" :key="item.id" class="rounded-lg border border-white/10 bg-black/20 p-3">
              <div class="flex items-start justify-between gap-3">
                <div>
                  <p class="text-xs text-emerald-100/75">{{ item.kode }}</p>
                  <p class="text-sm font-semibold text-white">Lahan: {{ item.lahan?.kode || item.lahan_kode || item.lahan_id || '-' }}</p>
                </div>
                <span class="rounded-full bg-amber-500/20 px-2 py-1 text-xs font-semibold text-amber-50">{{ item.status || '-' }}</span>
              </div>
              <div class="mt-2 grid grid-cols-1 gap-2 text-xs text-emerald-100/90 sm:grid-cols-2">
                <p class="rounded bg-black/20 px-2 py-1">Mulai: {{ item.tanggal_mulai || '-' }}</p>
                <p class="rounded bg-black/20 px-2 py-1">Akhir: {{ item.tanggal_akhir || '-' }}</p>
                <p class="rounded bg-black/20 px-2 py-1 sm:col-span-2">Hasil Minyak: {{ fmtNumber(item.aktual_hasil_minyak ?? item.hasil_minyak ?? 0) }} kg</p>
              </div>
              <div class="mt-3 flex flex-col gap-2 sm:flex-row">
                <ActionButton full-width @click="goToOilDetail(item.id)">Detail</ActionButton>
                <ActionButton variant="primary" full-width @click="goToOilEdit(item.id)">Update</ActionButton>
              </div>
            </div>
          </div>
        </article>
      </div>
    </template>
  </section>
</template>
