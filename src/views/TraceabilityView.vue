<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import SectionHeader from '@/components/SectionHeader.vue'
import GlassPanel from '@/components/GlassPanel.vue'
import { mockErpService } from '@/services/mockErpService'
import { fmtNumber } from '@/utils/formatters'

const route = useRoute()
const router = useRouter()

const lots = ref([])
const lotLoading = ref(false)
const lotError = ref('')

const selectedLotId = ref('')
const detail = ref(null)
const detailLoading = ref(false)
const detailError = ref('')

const loadLots = async () => {
  lotLoading.value = true
  lotError.value = ''
  try {
    lots.value = await mockErpService.getTraceabilityLots()
    if (!selectedLotId.value && lots.value.length) {
      selectedLotId.value = route.params.lotId || lots.value[0].lotId
    }
  } catch (err) {
    lotError.value = err instanceof Error ? err.message : 'Gagal memuat daftar lot.'
  } finally {
    lotLoading.value = false
  }
}

const loadDetail = async (lotId) => {
  if (!lotId) return
  detailLoading.value = true
  detailError.value = ''
  try {
    detail.value = await mockErpService.getTraceabilityByLot(lotId)
  } catch (err) {
    detail.value = null
    detailError.value = err instanceof Error ? err.message : 'Gagal memuat detail lot.'
  } finally {
    detailLoading.value = false
  }
}

watch(
  () => route.params.lotId,
  (lotId) => {
    if (typeof lotId === 'string' && lotId && lotId !== selectedLotId.value) {
      selectedLotId.value = lotId
    }
  },
)

watch(selectedLotId, async (lotId) => {
  if (!lotId) return
  if (route.params.lotId !== lotId) {
    await router.replace(`/traceability/${lotId}`)
  }
  await loadDetail(lotId)
})

onMounted(async () => {
  selectedLotId.value = typeof route.params.lotId === 'string' ? route.params.lotId : ''
  await loadLots()
  if (selectedLotId.value) {
    await loadDetail(selectedLotId.value)
  }
})

const selectedSummary = computed(() => lots.value.find((item) => item.lotId === selectedLotId.value))
</script>

<template>
  <section class="space-y-6">
    <SectionHeader
      eyebrow="Traceability"
      title="Detail Perjalanan Lot"
      description="Telusuri jejak batch dari penerimaan petani, proses produksi, quality check, hingga delivery customer."
    />

    <div class="grid gap-5 xl:grid-cols-[340px_1fr]">
      <GlassPanel title="Daftar Lot" tight>
        <p v-if="lotLoading" class="text-sm text-emerald-100/80">Memuat lot...</p>
        <p v-else-if="lotError" class="text-sm text-red-100">{{ lotError }}</p>
        <ul v-else class="max-h-[36vh] space-y-2 overflow-y-auto pr-1 sm:max-h-none">
          <li v-for="item in lots" :key="item.lotId">
            <button
              type="button"
              class="w-full rounded-lg border px-3 py-2 text-left text-sm transition"
              :class="item.lotId === selectedLotId ? 'border-emerald-300/60 bg-emerald-500/15 text-emerald-50' : 'border-white/10 bg-black/20 text-emerald-100/85 hover:border-white/20'"
              @click="selectedLotId = item.lotId"
            >
              <p class="font-semibold">{{ item.lotId }}</p>
              <p class="text-xs opacity-80">{{ item.farmer }} - {{ item.region }}</p>
            </button>
          </li>
        </ul>
      </GlassPanel>

      <div class="space-y-5">
        <GlassPanel title="Ringkasan Batch" tight>
          <p v-if="detailLoading" class="text-sm text-emerald-100/80">Memuat detail lot...</p>
          <p v-else-if="detailError" class="text-sm text-red-100">{{ detailError }}</p>
          <div v-else-if="selectedSummary" class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div class="rounded-lg bg-black/20 px-3 py-3 text-sm text-emerald-50/90">
              <p class="text-xs opacity-80">Petani</p>
              <p class="mt-1 font-semibold">{{ selectedSummary.farmer }}</p>
            </div>
            <div class="rounded-lg bg-black/20 px-3 py-3 text-sm text-emerald-50/90">
              <p class="text-xs opacity-80">Received</p>
              <p class="mt-1 font-semibold">{{ fmtNumber(selectedSummary.receivedKg) }} kg</p>
            </div>
            <div class="rounded-lg bg-black/20 px-3 py-3 text-sm text-emerald-50/90">
              <p class="text-xs opacity-80">Finished Goods</p>
              <p class="mt-1 font-semibold">{{ fmtNumber(selectedSummary.fgKg) }} kg</p>
            </div>
            <div class="rounded-lg bg-black/20 px-3 py-3 text-sm text-emerald-50/90">
              <p class="text-xs opacity-80">Current Stage</p>
              <p class="mt-1 font-semibold">{{ selectedSummary.currentStage }}</p>
            </div>
          </div>
        </GlassPanel>

        <GlassPanel title="Timeline Batch" tight>
          <p v-if="detailLoading" class="text-sm text-emerald-100/80">Menyiapkan timeline...</p>
          <div v-else-if="detail && detail.timeline?.length" class="space-y-4">
            <div v-for="event in detail.timeline" :key="`${event.docRef}-${event.date}`" class="grid gap-3 md:grid-cols-[140px_1fr] md:items-start">
              <div class="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs text-emerald-100/70 md:border-0 md:bg-transparent md:px-0 md:py-0">
                {{ event.date }}
              </div>
              <div class="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-emerald-50/90">
                <p class="font-semibold text-emerald-100">{{ event.stage }}</p>
                <p class="mt-1">PIC: {{ event.actor }} | Dok: {{ event.docRef }} | Qty: {{ fmtNumber(event.qtyKg) }} kg</p>
                <p class="mt-1 text-emerald-100/80">{{ event.note }}</p>
              </div>
            </div>
          </div>
          <p v-else class="text-sm text-emerald-100/80">Belum ada event timeline untuk lot ini.</p>
        </GlassPanel>
      </div>
    </div>
  </section>
</template>
