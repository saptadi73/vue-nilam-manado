<script setup>
import { computed, onMounted, ref } from 'vue'
import SectionHeader from '@/components/SectionHeader.vue'
import FarmerAreaModal from '@/components/FarmerAreaModal.vue'
import { useErpData } from '@/composables/useErpData'
import { fmtCurrency, fmtNumber } from '@/utils/formatters'

const { data, loading, error, refresh } = useErpData((service) => service.getFarmerPerformance())
const regionFilter = ref('all')
const selectedFarmer = ref(null)

onMounted(refresh)

const farmers = computed(() => data.value ?? [])
const availableRegions = computed(() => {
  const regions = farmers.value.map((item) => item.address.split(',')[0].trim())
  return ['all', ...new Set(regions)]
})

const filteredFarmers = computed(() => {
  if (regionFilter.value === 'all') return farmers.value
  return farmers.value.filter((item) => item.address.includes(regionFilter.value))
})

const badgeClass = (score) => {
  if (score >= 95) return 'bg-emerald-400/30 text-emerald-50'
  if (score >= 90) return 'bg-cyan-400/30 text-cyan-50'
  return 'bg-amber-400/30 text-amber-50'
}

const openAreaModal = (farmer) => {
  selectedFarmer.value = farmer
}

const closeAreaModal = () => {
  selectedFarmer.value = null
}
</script>

<template>
  <section class="space-y-6">
    <SectionHeader eyebrow="Data Performa" title="Performa Petani" description="Profil tiap petani dengan capaian produksi, omzet, dan kesiapan panen dalam tampilan kartu." />

    <div class="flex flex-wrap items-center gap-3">
      <label for="regionFilter" class="text-sm text-emerald-100/80">Filter Kota/Kabupaten</label>
      <select id="regionFilter" v-model="regionFilter" class="field min-w-52">
        <option v-for="region in availableRegions" :key="region" :value="region">
          {{ region === 'all' ? 'Semua Wilayah' : region }}
        </option>
      </select>
      <button class="btn-primary" type="button" @click="refresh">Refresh Data</button>
    </div>

    <p v-if="loading" class="text-sm text-emerald-100/80">Memuat data petani...</p>
    <div v-else-if="error" class="rounded-xl border border-red-300/40 bg-red-500/10 px-4 py-3 text-sm text-red-100">
      {{ error }}
    </div>

    <div v-else class="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      <article
        v-for="farmer in filteredFarmers"
        :key="farmer.id"
        class="overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.08] to-white/[0.03]"
      >
        <div class="relative h-36 bg-black/30">
          <img
            :src="farmer.photoUrl || 'https://i.pravatar.cc/240?img=1'"
            :alt="`Foto ${farmer.name}`"
            class="h-full w-full object-cover opacity-85"
          />
          <div class="absolute inset-0 bg-gradient-to-t from-[#082521] via-[#082521]/25 to-transparent" />
          <div class="absolute bottom-3 left-4">
            <p class="text-xs text-emerald-100/80">{{ farmer.id }}</p>
            <h3 class="text-lg font-bold text-white">{{ farmer.name }}</h3>
          </div>
          <span class="absolute right-3 top-3 rounded-full px-3 py-1 text-xs font-semibold" :class="badgeClass(farmer.targetAchievement)">
            Target {{ farmer.targetAchievement }}%
          </span>
        </div>

        <div class="space-y-4 p-4">
          <p class="text-sm text-emerald-100/80">{{ farmer.address }}</p>

          <div>
            <div class="mb-1 flex items-center justify-between text-xs text-emerald-100/70">
              <span>Pencapaian Produksi</span>
              <span>{{ farmer.targetAchievement }}%</span>
            </div>
            <div class="h-2 rounded-full bg-white/10">
              <div class="h-2 rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400" :style="{ width: `${farmer.targetAchievement}%` }" />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3 text-sm">
            <div class="rounded-xl bg-black/20 p-3">
              <p class="text-xs text-emerald-100/70">Asset Area</p>
              <p class="mt-1 font-semibold text-emerald-50">{{ farmer.areaHa }} ha</p>
            </div>
            <div class="rounded-xl bg-black/20 p-3">
              <p class="text-xs text-emerald-100/70">Status Tanam</p>
              <p class="mt-1 font-semibold text-emerald-50">{{ farmer.plantedHa }} ha</p>
            </div>
            <div class="rounded-xl bg-black/20 p-3">
              <p class="text-xs text-emerald-100/70">Total Hasil</p>
              <p class="mt-1 font-semibold text-emerald-50">{{ fmtNumber(farmer.harvestKg) }} kg</p>
            </div>
            <div class="rounded-xl bg-black/20 p-3">
              <p class="text-xs text-emerald-100/70">Siap Produksi</p>
              <p class="mt-1 font-semibold text-emerald-50">{{ fmtNumber(farmer.readyKg) }} kg</p>
            </div>
          </div>

          <div class="rounded-xl border border-emerald-300/15 bg-emerald-500/10 px-3 py-2">
            <p class="text-xs text-emerald-100/70">Total Penjualan</p>
            <p class="mt-1 text-sm font-semibold text-emerald-50">{{ fmtCurrency(farmer.salesIdr) }}</p>
          </div>

          <button type="button" class="btn-primary w-full" @click="openAreaModal(farmer)">Lihat Polygon Area Lahan</button>
        </div>
      </article>
    </div>

    <FarmerAreaModal :open="Boolean(selectedFarmer)" :farmer="selectedFarmer" @close="closeAreaModal" />
  </section>
</template>
