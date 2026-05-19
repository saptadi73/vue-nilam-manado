<script setup>
import { computed, onMounted, ref } from 'vue'
import MetricCard from '@/components/MetricCard.vue'
import SectionHeader from '@/components/SectionHeader.vue'
import GlassPanel from '@/components/GlassPanel.vue'
import { useErpData } from '@/composables/useErpData'
import { fmtCurrency, fmtNumber } from '@/utils/formatters'
import erpImage from '@/assets/images/erp.png'
import nilam1 from '@/assets/images/nilam1.jpg'
import nilam2 from '@/assets/images/nilam2.jpg'
import nilam3 from '@/assets/images/nilam3.png'
import nilam4 from '@/assets/images/nilam4.png'
import nilam5 from '@/assets/images/nilam5.png'

const { data, loading, error, refresh } = useErpData((service) => service.getDashboard())

onMounted(refresh)

const farmerPerformance = computed(() => data.value?.farmerPerformance ?? [])
const productionSummary = computed(() => data.value?.productionSummary ?? { totalRangeKg: 0 })
const salesSeries = computed(() => data.value?.salesSeries ?? [])

const totalArea = computed(() => farmerPerformance.value.reduce((acc, item) => acc + item.areaHa, 0))
const totalHarvest = computed(() => farmerPerformance.value.reduce((acc, item) => acc + item.harvestKg, 0))
const totalSales = computed(() => salesSeries.value.reduce((acc, item) => acc + item, 0))
const avgTarget = computed(() => {
  if (!farmerPerformance.value.length) return 0
  const total = farmerPerformance.value.reduce((acc, item) => acc + item.targetAchievement, 0)
  return Math.round(total / farmerPerformance.value.length)
})
const activeGalleryItem = ref(null)

const galleryItems = [
  {
    src: nilam1,
    title: 'Budidaya Terarah',
    description: 'Lahan nilam dikelola dengan pola tanam presisi untuk menjaga konsistensi kualitas daun.',
  },
  {
    src: nilam2,
    title: 'Kemitraan Petani',
    description: 'Kolaborasi petani dan perusahaan menjadi fondasi rantai pasok minyak nilam yang berkelanjutan.',
  },
  {
    src: nilam3,
    title: 'Panen Bernilai',
    description: 'Setiap batch panen ditracking dari kebun agar transparan dari asal hingga ke pelanggan akhir.',
  },
  {
    src: nilam4,
    title: 'Distilasi Terukur',
    description: 'Proses penyulingan dikontrol ketat untuk mempertahankan kadar Patchouli Alcohol yang optimal.',
  },
  {
    src: nilam4,
    title: 'Quality Assurance',
    description: 'Pengujian berlapis menjamin spesifikasi mutu terpenuhi sebelum masuk ke stok finished goods.',
  },
  {
    src: nilam5,
    title: 'Siap Pasar Global',
    description: 'Produk setengah jadi dan jadi dipersiapkan untuk kebutuhan pabrik domestik dan ekspor.',
  },
]

const openGalleryModal = (item) => {
  activeGalleryItem.value = item
}

const closeGalleryModal = () => {
  activeGalleryItem.value = null
}

const closeOnOverlay = (event) => {
  if (event.target === event.currentTarget) closeGalleryModal()
}
</script>

<template>
  <section class="space-y-6">
    <GlassPanel tight>
      <div class="rounded-2xl bg-gradient-to-br from-emerald-500/25 via-cyan-500/15 to-black/20 p-5">
        <p class="text-xs uppercase tracking-[0.2em] text-emerald-100/80">Nilam Visual Story</p>
        <h2 class="mt-2 text-2xl font-bold text-white">Galeri Ekosistem Patchouli dari Kebun ke Industri</h2>
        <p class="mt-2 max-w-3xl text-sm text-emerald-50/85">
          Dokumentasi proses nyata dalam ekosistem nilam: budidaya, panen, distilasi, quality control, hingga pengiriman produk bernilai tinggi.
        </p>
      </div>
      <div class="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <button
          v-for="item in galleryItems"
          :key="item.title"
          type="button"
          class="overflow-hidden rounded-2xl border border-white/10 bg-black/20 text-left transition hover:scale-[1.01] hover:border-emerald-300/40"
          @click="openGalleryModal(item)"
        >
          <img :src="item.src" :alt="item.title" class="h-44 w-full object-cover" />
          <div class="space-y-1 p-4">
            <h3 class="text-sm font-semibold text-emerald-50">{{ item.title }}</h3>
            <p class="text-xs leading-relaxed text-emerald-100/80">{{ item.description }}</p>
          </div>
        </button>
      </div>
    </GlassPanel>

    <SectionHeader
      eyebrow="Integrated Overview"
      title="Digital Control Tower Industri Patchouli"
      description="Monitoring seluruh rantai nilai dari petani, produksi, quality, inventory, sampai sales order dan pengiriman."
    />

    <p v-if="loading" class="text-sm text-emerald-100/80">Memuat data dashboard...</p>
    <div v-else-if="error" class="rounded-xl border border-red-300/40 bg-red-500/10 px-4 py-3 text-sm text-red-100">
      {{ error }}
      <button class="ml-3 underline" type="button" @click="refresh">Muat ulang</button>
    </div>

    <template v-else>
      <div class="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <GlassPanel tight>
          <div class="overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500/30 to-cyan-500/20 p-6">
            <p class="text-xs uppercase tracking-[0.2em] text-emerald-100/80">Ringkasan Tahunan</p>
            <div class="mt-5 grid gap-3 text-sm text-emerald-50/90 md:grid-cols-2">
              <p class="rounded-xl bg-black/20 px-4 py-3">Total Produksi: <strong>{{ fmtNumber(productionSummary.totalRangeKg) }} kg</strong></p>
              <p class="rounded-xl bg-black/20 px-4 py-3">Total Omzet: <strong>{{ fmtCurrency(totalSales) }}</strong></p>
            </div>
          </div>
        </GlassPanel>

        <div class="overflow-hidden rounded-3xl border border-white/10 bg-[#123932] p-4">
          <img :src="erpImage" alt="ERP Illustration" class="h-full w-full rounded-2xl object-cover" />
        </div>
      </div>

      <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Total Petani Aktif" :value="fmtNumber(farmerPerformance.length)" subtitle="Mitra terdata" />
        <MetricCard title="Asset Area" :value="`${totalArea.toFixed(1)} ha`" subtitle="Total lahan budidaya" />
        <MetricCard title="Total Hasil" :value="`${fmtNumber(totalHarvest)} kg`" subtitle="Akumulasi panen" />
        <MetricCard title="Rata-Rata Target" :value="`${avgTarget}%`" subtitle="Pencapaian produksi" />
      </div>
    </template>

    <div
      v-if="activeGalleryItem"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      @click="closeOnOverlay"
    >
      <div class="w-full max-w-5xl overflow-hidden rounded-2xl border border-white/15 bg-[#0a2f29]">
        <div class="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <div>
            <p class="text-sm font-semibold text-emerald-50">{{ activeGalleryItem.title }}</p>
            <p class="text-xs text-emerald-100/75">{{ activeGalleryItem.description }}</p>
          </div>
          <button type="button" class="btn-muted" @click="closeGalleryModal">Tutup</button>
        </div>
        <img :src="activeGalleryItem.src" :alt="activeGalleryItem.title" class="max-h-[78vh] w-full object-contain bg-black/30" />
      </div>
    </div>
  </section>
</template>
