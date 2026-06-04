<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import ActionButton from '@/components/ActionButton.vue'
import ListLoadingState from '@/components/ListLoadingState.vue'
import PageState from '@/components/PageState.vue'
import L from 'leaflet'

const props = defineProps({
  open: { type: Boolean, default: false },
  farmer: { type: Object, default: null },
  lands: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  error: { type: String, default: '' },
})

const emit = defineEmits(['close'])

const selectedLandId = ref('')
const mapEl = ref(null)
let mapInstance = null
let polygonLayer = null
let pointMarkers = []

const toFiniteNumber = (value) => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value === 'string') {
    const normalized = value.trim().replace(',', '.')
    if (!normalized) return null
    const parsed = Number(normalized)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

const normalizeLatLng = (latValue, lngValue) => {
  const lat = toFiniteNumber(latValue)
  const lng = toFiniteNumber(lngValue)
  if (lat === null || lng === null) return null

  const isLatLngValid = Math.abs(lat) <= 90 && Math.abs(lng) <= 180
  if (isLatLngValid) return { latitude: lat, longitude: lng }

  const isLngLatValid = Math.abs(lng) <= 90 && Math.abs(lat) <= 180
  if (isLngLatValid) return { latitude: lng, longitude: lat }

  return null
}

const extractCoordinateSource = (rawCoordinates) => {
  if (Array.isArray(rawCoordinates)) return rawCoordinates

  if (rawCoordinates && typeof rawCoordinates === 'object') {
    if (rawCoordinates.type === 'Feature' && rawCoordinates.geometry) {
      return extractCoordinateSource(rawCoordinates.geometry)
    }

    if (rawCoordinates.type === 'Polygon' && Array.isArray(rawCoordinates.coordinates)) {
      return Array.isArray(rawCoordinates.coordinates[0]) ? rawCoordinates.coordinates[0] : []
    }

    if (Array.isArray(rawCoordinates.coordinates)) return rawCoordinates.coordinates
    if (Array.isArray(rawCoordinates.koordinat)) return rawCoordinates.koordinat
    if (Array.isArray(rawCoordinates.points)) return rawCoordinates.points
  }

  if (typeof rawCoordinates === 'string') {
    try {
      const parsed = JSON.parse(rawCoordinates)
      return extractCoordinateSource(parsed)
    } catch {
      return []
    }
  }

  return []
}

const resolveLandCoordinatePayload = (land) => {
  if (!land || typeof land !== 'object') return []

  const candidates = [
    land.koordinat,
    land.coordinates,
    land.land_coordinates,
    land.polygon,
    land.area_polygon,
    land.areaPolygon,
  ]

  for (const candidate of candidates) {
    const source = extractCoordinateSource(candidate)
    if (Array.isArray(source) && source.length) return source
  }

  return []
}

const normalizeCoordinatePoints = (rawCoordinates) => {
  const source = extractCoordinateSource(rawCoordinates)
  if (!Array.isArray(source)) return []

  return source
    .map((point, index) => {
      if (Array.isArray(point)) {
        const normalized = normalizeLatLng(point[0], point[1])
        return {
          latitude: normalized?.latitude ?? null,
          longitude: normalized?.longitude ?? null,
          urutan: index + 1,
        }
      }

      const normalized = normalizeLatLng(
        point?.latitude ?? point?.lat,
        point?.longitude ?? point?.lng ?? point?.lon ?? point?.long,
      )
      const urutan = toFiniteNumber(point?.urutan ?? point?.order ?? point?.sequence ?? point?.no)

      return {
        id: point?.id,
        latitude: normalized?.latitude ?? null,
        longitude: normalized?.longitude ?? null,
        urutan: urutan ?? index + 1,
      }
    })
    .filter((point) => point.latitude !== null && point.longitude !== null)
    .sort((a, b) => Number(a.urutan) - Number(b.urutan))
}

const EARTH_RADIUS_METERS = 6371008.8

const calculatePolygonAreaM2 = (polygon) => {
  if (!Array.isArray(polygon) || polygon.length < 3) return null

  const lat0 = polygon.reduce((sum, point) => sum + point[0], 0) / polygon.length
  const lat0Rad = (lat0 * Math.PI) / 180

  const projected = polygon.map((point) => {
    const latRad = (point[0] * Math.PI) / 180
    const lngRad = (point[1] * Math.PI) / 180
    return {
      x: EARTH_RADIUS_METERS * lngRad * Math.cos(lat0Rad),
      y: EARTH_RADIUS_METERS * latRad,
    }
  })

  let sum = 0
  for (let i = 0; i < projected.length; i += 1) {
    const current = projected[i]
    const next = projected[(i + 1) % projected.length]
    sum += current.x * next.y - next.x * current.y
  }

  const areaSqMeters = Math.abs(sum) / 2
  return Number.isFinite(areaSqMeters) ? areaSqMeters : null
}

const formatAreaM2 = (value) => {
  if (!Number.isFinite(value)) return '-'
  const digits = value >= 100 ? 0 : 2
  return value.toLocaleString('id-ID', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })
}

const availableLands = computed(() => (Array.isArray(props.lands) ? props.lands : []))

const selectedLand = computed(() => {
  if (!availableLands.value.length) return null
  if (!selectedLandId.value) return availableLands.value[0]
  return availableLands.value.find((item) => item.id === selectedLandId.value) ?? availableLands.value[0]
})

const orderedCoordinates = computed(() => {
  return normalizeCoordinatePoints(resolveLandCoordinatePayload(selectedLand.value))
})

const centroidCoordinate = computed(() => {
  const polygon = toPolygon(selectedLand.value)
  if (polygon.length < 3) return null

  const center = polygon.reduce(
    (acc, point) => {
      acc.lat += point[0]
      acc.lng += point[1]
      return acc
    },
    { lat: 0, lng: 0 },
  )

  return {
    lat: center.lat / polygon.length,
    lng: center.lng / polygon.length,
  }
})

const googleMapsUrl = computed(() => {
  if (!centroidCoordinate.value) return ''
  return `https://www.google.com/maps?q=${centroidCoordinate.value.lat},${centroidCoordinate.value.lng}`
})

const estimatedPolygonAreaM2 = computed(() => calculatePolygonAreaM2(toPolygon(selectedLand.value)))
const polygonAreaDiffM2 = computed(() => {
  const actual = Number(selectedLand.value?.luas)
  if (!Number.isFinite(actual) || !Number.isFinite(estimatedPolygonAreaM2.value)) return null
  return estimatedPolygonAreaM2.value - actual
})

const toPolygon = (land) => {
  return normalizeCoordinatePoints(resolveLandCoordinatePayload(land)).map((point) => [point.latitude, point.longitude])
}

const destroyMap = () => {
  if (!mapInstance) return
  mapInstance.remove()
  mapInstance = null
  polygonLayer = null
  pointMarkers = []
}

const initMap = () => {
  const polygon = toPolygon(selectedLand.value)
  if (!mapEl.value || polygon.length < 3) {
    destroyMap()
    return
  }

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

  pointMarkers = polygon.map((point, index) => {
    const marker = L.circleMarker(point, {
      radius: 5,
      color: '#22d3ee',
      fillColor: '#22d3ee',
      fillOpacity: 0.9,
      weight: 1,
    }).addTo(mapInstance)
    marker.bindPopup(`Titik ${index + 1}<br/>Lat: ${point[0].toFixed(6)}<br/>Lng: ${point[1].toFixed(6)}`)
    return marker
  })

  mapInstance.fitBounds(polygonLayer.getBounds(), { padding: [20, 20] })
}

const focusCoordinate = (index) => {
  const marker = pointMarkers[index]
  if (!mapInstance || !marker) return
  mapInstance.panTo(marker.getLatLng(), { animate: true, duration: 0.35 })
  marker.openPopup()
}

watch(
  () => [props.open, availableLands.value.length],
  async ([open]) => {
    if (!open) {
      destroyMap()
      return
    }

    if (!selectedLandId.value && availableLands.value.length > 0) {
      selectedLandId.value = availableLands.value[0].id
    }

    await nextTick()
    initMap()
  },
)

watch(
  () => selectedLandId.value,
  async () => {
    if (!props.open) return
    await nextTick()
    initMap()
  },
)

onBeforeUnmount(() => {
  destroyMap()
})

const closeModal = () => {
  emit('close')
}

const handleOverlayClick = (event) => {
  if (event.target === event.currentTarget) {
    closeModal()
  }
}

const fmtCoord = (value) => Number(value).toFixed(6)
</script>

<template>
  <div v-if="open" class="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4" @click="handleOverlayClick">
    <div class="flex h-[96vh] w-full max-w-5xl flex-col overflow-hidden rounded-t-3xl border border-white/15 bg-[#0a2f29] shadow-2xl sm:h-auto sm:max-h-[92vh] sm:rounded-2xl">
      <div class="flex items-start justify-between gap-3 border-b border-white/10 px-4 py-4 sm:items-center sm:px-5">
        <div>
          <p class="text-xs uppercase tracking-[0.18em] text-emerald-100/70">Lahan Petani</p>
          <h3 class="text-lg font-semibold text-white">{{ farmer?.nama || '-' }}</h3>
          <p class="text-xs text-emerald-100/75">ID Petani: {{ farmer?.id || '-' }}</p>
        </div>
        <ActionButton variant="muted" @click="closeModal">Tutup</ActionButton>
      </div>

      <div class="flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:p-5">
        <ListLoadingState v-if="loading" :card-count="3" />

        <PageState
          v-else-if="error"
          variant="error"
          title="Data lahan belum berhasil dimuat"
          :description="error"
        />

        <PageState
          v-else-if="!availableLands.length"
          title="Belum ada data lahan untuk petani ini"
          description="Tambahkan lahan baru dari halaman list petani atau form lahan untuk melihat polygon area di sini."
        />

        <template v-else>
          <div class="grid gap-4 lg:grid-cols-[280px,1fr]">
            <aside class="space-y-3 rounded-xl border border-white/10 bg-black/20 p-3">
              <label class="space-y-1 text-sm text-emerald-100/85">
                <span>Pilih Lahan</span>
                <select v-model="selectedLandId" class="field w-full">
                  <option v-for="land in availableLands" :key="land.id" :value="land.id">
                    {{ land.kode }} - {{ land.luas }} M²
                  </option>
                </select>
              </label>

              <div class="space-y-2 text-xs text-emerald-100/85">
                <p class="rounded-lg bg-black/20 px-3 py-2">Kode: {{ selectedLand?.kode || '-' }}</p>
                <p class="rounded-lg bg-black/20 px-3 py-2">Luas: {{ selectedLand?.luas ?? '-' }} M²</p>
                <p class="rounded-lg bg-black/20 px-3 py-2">Estimasi luas polygon: {{ formatAreaM2(estimatedPolygonAreaM2) }} M²</p>
                <p v-if="polygonAreaDiffM2 !== null" class="rounded-lg bg-black/20 px-3 py-2" :class="Math.abs(polygonAreaDiffM2) < 50 ? 'text-emerald-100/85' : 'text-amber-200/95'">
                  Selisih estimasi: {{ polygonAreaDiffM2 >= 0 ? '+' : '' }}{{ formatAreaM2(polygonAreaDiffM2) }} M²
                </p>
                <p class="rounded-lg bg-black/20 px-3 py-2">Kepemilikan: {{ selectedLand?.kepemilikan || '-' }}</p>
                <p class="rounded-lg bg-black/20 px-3 py-2">Elevasi: {{ selectedLand?.elevasi ?? '-' }} mdpl</p>
                <p class="rounded-lg bg-black/20 px-3 py-2">Wilayah: {{ selectedLand?.kabupaten_kota || '-' }}, {{ selectedLand?.kecamatan || '-' }}</p>
                <p class="rounded-lg bg-black/20 px-3 py-2">Titik Koordinat: {{ orderedCoordinates.length }}</p>
              </div>

              <a
                v-if="googleMapsUrl"
                :href="googleMapsUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="inline-flex w-full items-center justify-center rounded-lg bg-cyan-500/25 px-3 py-2 text-xs font-semibold text-cyan-50 transition hover:bg-cyan-500/35"
              >
                Buka di Google Maps
              </a>

              <div class="space-y-2">
                <p class="text-xs uppercase tracking-[0.14em] text-emerald-100/65">Daftar Titik Polygon</p>
                <div class="max-h-48 space-y-2 overflow-y-auto rounded-lg border border-white/10 bg-black/20 p-2">
                  <button
                    v-for="(point, index) in orderedCoordinates"
                    :key="point.id || `${point.urutan}-${index}`"
                    type="button"
                    class="w-full rounded-lg bg-black/20 px-3 py-2 text-left text-xs text-emerald-100/90 transition hover:bg-emerald-500/20"
                    @click="focusCoordinate(index)"
                  >
                    Titik {{ index + 1 }}: {{ fmtCoord(point.latitude) }}, {{ fmtCoord(point.longitude) }}
                  </button>
                  <p v-if="!orderedCoordinates.length" class="px-2 py-1 text-xs text-emerald-100/65">Belum ada titik koordinat.</p>
                </div>
              </div>
            </aside>

            <div>
              <div v-if="toPolygon(selectedLand).length >= 3" ref="mapEl" class="h-85 w-full overflow-hidden rounded-xl border border-white/10 sm:h-105" />
              <div v-else class="rounded-xl border border-amber-200/30 bg-amber-500/10 p-4 text-sm text-amber-100">
                Polygon area belum tersedia untuk lahan terpilih.
              </div>
            </div>
          </div>
        </template>
      </div>

      <div class="sticky bottom-0 border-t border-white/10 bg-[#0a2f29]/95 px-4 py-3 backdrop-blur sm:px-5">
        <div class="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <ActionButton variant="muted" full-width @click="closeModal">Tutup</ActionButton>
        </div>
      </div>
    </div>
  </div>
</template>
