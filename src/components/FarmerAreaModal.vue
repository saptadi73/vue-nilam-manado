<script setup>
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'
import L from 'leaflet'

const props = defineProps({
  open: { type: Boolean, default: false },
  farmer: { type: Object, default: null },
})

const emit = defineEmits(['close'])

const mapEl = ref(null)
let mapInstance = null
let polygonLayer = null

const destroyMap = () => {
  if (mapInstance) {
    mapInstance.remove()
    mapInstance = null
    polygonLayer = null
  }
}

const initMap = () => {
  const polygon = props.farmer?.areaPolygon
  if (!mapEl.value || !Array.isArray(polygon) || polygon.length < 3) return

  destroyMap()

  mapInstance = L.map(mapEl.value, {
    zoomControl: true,
    attributionControl: true,
  })

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors',
  }).addTo(mapInstance)

  polygonLayer = L.polygon(polygon, {
    color: '#10b981',
    weight: 2,
    fillColor: '#10b981',
    fillOpacity: 0.28,
  }).addTo(mapInstance)

  mapInstance.fitBounds(polygonLayer.getBounds(), { padding: [20, 20] })
}

watch(
  () => [props.open, props.farmer?.id],
  async ([open]) => {
    if (open) {
      await nextTick()
      initMap()
      return
    }
    destroyMap()
  },
)

onBeforeUnmount(() => {
  destroyMap()
})

const handleOverlayClick = (event) => {
  if (event.target === event.currentTarget) {
    emit('close')
  }
}
</script>

<template>
  <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" @click="handleOverlayClick">
    <div class="w-full max-w-4xl rounded-2xl border border-white/15 bg-[#0a2f29] shadow-2xl">
      <div class="flex items-center justify-between border-b border-white/10 px-5 py-4">
        <div>
          <p class="text-xs uppercase tracking-[0.18em] text-emerald-100/70">Area Lahan Petani</p>
          <h3 class="text-lg font-semibold text-white">{{ farmer?.name }} - {{ farmer?.id }}</h3>
        </div>
        <button type="button" class="rounded-lg bg-white/10 px-3 py-1 text-sm text-emerald-50 hover:bg-white/20" @click="$emit('close')">
          Tutup
        </button>
      </div>

      <div class="space-y-3 p-5">
        <p class="text-sm text-emerald-100/85">{{ farmer?.address }} | Area {{ farmer?.areaHa }} ha</p>
        <div v-if="farmer?.areaPolygon?.length >= 3" ref="mapEl" class="h-[420px] w-full overflow-hidden rounded-xl border border-white/10" />
        <div v-else class="rounded-xl border border-amber-200/30 bg-amber-500/10 p-4 text-sm text-amber-100">
          Polygon area belum tersedia untuk petani ini.
        </div>
      </div>
    </div>
  </div>
</template>
