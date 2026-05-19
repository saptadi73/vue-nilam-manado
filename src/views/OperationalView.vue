<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { RouterLink } from 'vue-router'
import QRCode from 'qrcode'
import SectionHeader from '@/components/SectionHeader.vue'
import GlassPanel from '@/components/GlassPanel.vue'
import NotificationStack from '@/components/NotificationStack.vue'
import { useErpData } from '@/composables/useErpData'
import { mockErpService } from '@/services/mockErpService'
import { fmtCurrency, fmtNumber } from '@/utils/formatters'

const { data, loading, error, refresh } = useErpData((service) => service.getOperational())

const qrCanvas = ref(null)
const traceCode = 'LOT-NILAM-ACEH-2602-1138|PTN-003|DO-2602-022|2026-02-19'
const quickLotId = 'LOT-NILAM-ACEH-2602-1138'

const notices = ref([])
const submitting = reactive({ so: false, stb: false, do: false })

const soForm = reactive({
  id: '',
  date: '',
  buyer: '',
  farmer: '',
  qtyKg: null,
  pricePerKg: null,
  note: '',
})
const stbForm = reactive({
  id: '',
  date: '',
  farmer: '',
  quality: '',
  qtyKg: null,
  destination: '',
})
const doForm = reactive({
  id: '',
  date: '',
  customer: '',
  mode: '',
  qtyKg: null,
  address: '',
})

const errors = reactive({ so: {}, stb: {}, do: {} })

const showNotice = (message, type = 'success') => {
  const id = `${Date.now()}-${Math.random()}`
  notices.value = [{ id, message, type }, ...notices.value].slice(0, 4)
  setTimeout(() => {
    notices.value = notices.value.filter((item) => item.id !== id)
  }, 3000)
}

const isBlank = (value) => String(value ?? '').trim() === ''

const validateSo = () => {
  const next = {}
  if (isBlank(soForm.id)) next.id = 'Nomor SO wajib diisi.'
  if (isBlank(soForm.date)) next.date = 'Tanggal wajib diisi.'
  if (isBlank(soForm.buyer)) next.buyer = 'Customer wajib diisi.'
  if (isBlank(soForm.farmer)) next.farmer = 'Petani wajib diisi.'
  if (!soForm.qtyKg || soForm.qtyKg <= 0) next.qtyKg = 'Qty harus lebih dari 0.'
  if (!soForm.pricePerKg || soForm.pricePerKg <= 0) next.pricePerKg = 'Harga harus lebih dari 0.'
  errors.so = next
  return Object.keys(next).length === 0
}

const validateStb = () => {
  const next = {}
  if (isBlank(stbForm.id)) next.id = 'Nomor STB wajib diisi.'
  if (isBlank(stbForm.date)) next.date = 'Tanggal wajib diisi.'
  if (isBlank(stbForm.farmer)) next.farmer = 'Nama petani wajib diisi.'
  if (isBlank(stbForm.quality)) next.quality = 'Kualitas wajib diisi.'
  if (!stbForm.qtyKg || stbForm.qtyKg <= 0) next.qtyKg = 'Qty harus lebih dari 0.'
  if (isBlank(stbForm.destination)) next.destination = 'Gudang tujuan wajib diisi.'
  errors.stb = next
  return Object.keys(next).length === 0
}

const validateDo = () => {
  const next = {}
  if (isBlank(doForm.id)) next.id = 'Nomor DO wajib diisi.'
  if (isBlank(doForm.date)) next.date = 'Tanggal wajib diisi.'
  if (isBlank(doForm.customer)) next.customer = 'Customer wajib diisi.'
  if (isBlank(doForm.mode)) next.mode = 'Moda kirim wajib diisi.'
  if (!doForm.qtyKg || doForm.qtyKg <= 0) next.qtyKg = 'Qty harus lebih dari 0.'
  if (isBlank(doForm.address)) next.address = 'Alamat kirim wajib diisi.'
  errors.do = next
  return Object.keys(next).length === 0
}

const resetSo = () => {
  Object.assign(soForm, { id: '', date: '', buyer: '', farmer: '', qtyKg: null, pricePerKg: null, note: '' })
  errors.so = {}
}

const resetStb = () => {
  Object.assign(stbForm, { id: '', date: '', farmer: '', quality: '', qtyKg: null, destination: '' })
  errors.stb = {}
}

const resetDo = () => {
  Object.assign(doForm, { id: '', date: '', customer: '', mode: '', qtyKg: null, address: '' })
  errors.do = {}
}

const submitSo = async () => {
  if (!validateSo()) {
    showNotice('Form Sale Order belum lengkap.', 'error')
    return
  }
  submitting.so = true
  try {
    await mockErpService.submitSaleOrder({
      id: soForm.id,
      date: soForm.date,
      buyer: soForm.buyer,
      farmer: soForm.farmer,
      qtyKg: Number(soForm.qtyKg),
      pricePerKg: Number(soForm.pricePerKg),
      note: soForm.note,
    })
    showNotice('Sale Order berhasil disimpan.')
    resetSo()
    await refresh()
  } catch (err) {
    showNotice(err instanceof Error ? err.message : 'Gagal menyimpan Sale Order.', 'error')
  } finally {
    submitting.so = false
  }
}

const submitStb = async () => {
  if (!validateStb()) {
    showNotice('Form Serah Terima belum lengkap.', 'error')
    return
  }
  submitting.stb = true
  try {
    await mockErpService.submitTransferNote({
      id: stbForm.id,
      date: stbForm.date,
      farmer: stbForm.farmer,
      quality: stbForm.quality,
      qtyKg: Number(stbForm.qtyKg),
      destination: stbForm.destination,
    })
    showNotice('Serah terima barang berhasil dicatat.')
    resetStb()
    await refresh()
  } catch (err) {
    showNotice(err instanceof Error ? err.message : 'Gagal menyimpan STB.', 'error')
  } finally {
    submitting.stb = false
  }
}

const submitDo = async () => {
  if (!validateDo()) {
    showNotice('Form Delivery Order belum lengkap.', 'error')
    return
  }
  submitting.do = true
  try {
    await mockErpService.submitDeliveryOrder({
      id: doForm.id,
      date: doForm.date,
      customer: doForm.customer,
      mode: doForm.mode,
      qtyKg: Number(doForm.qtyKg),
      address: doForm.address,
    })
    showNotice('Delivery Order berhasil dibuat.')
    resetDo()
    await refresh()
  } catch (err) {
    showNotice(err instanceof Error ? err.message : 'Gagal menyimpan DO.', 'error')
  } finally {
    submitting.do = false
  }
}

onMounted(async () => {
  await refresh()
  if (qrCanvas.value) {
    await QRCode.toCanvas(qrCanvas.value, traceCode, {
      width: 220,
      margin: 1,
      color: { dark: '#103b35', light: '#f0fff9' },
    })
  }
})

const salesOrders = computed(() => data.value?.salesOrders ?? [])
const transferNotes = computed(() => data.value?.transferNotes ?? [])
const deliveryOrders = computed(() => data.value?.deliveryOrders ?? [])
</script>

<template>
  <section class="space-y-6">
    <NotificationStack :items="notices" />

    <SectionHeader eyebrow="Operasional" title="Sale Order, Serah Terima, Delivery, Traceability" />

    <p v-if="loading" class="text-sm text-emerald-100/80">Memuat data operasional...</p>
    <div v-else-if="error" class="rounded-xl border border-red-300/40 bg-red-500/10 px-4 py-3 text-sm text-red-100">
      {{ error }}
    </div>

    <template v-else>
      <div class="grid gap-5 xl:grid-cols-2">
        <GlassPanel title="Form Sale Order">
          <form class="mt-4 grid gap-3 md:grid-cols-2" @submit.prevent="submitSo">
            <div>
              <input v-model="soForm.id" class="field" :class="{ 'field-invalid': errors.so.id }" placeholder="Nomor SO" />
              <p v-if="errors.so.id" class="field-error">{{ errors.so.id }}</p>
            </div>
            <div>
              <input v-model="soForm.date" class="field" :class="{ 'field-invalid': errors.so.date }" type="date" />
              <p v-if="errors.so.date" class="field-error">{{ errors.so.date }}</p>
            </div>
            <div>
              <input v-model="soForm.buyer" class="field" :class="{ 'field-invalid': errors.so.buyer }" placeholder="Customer" />
              <p v-if="errors.so.buyer" class="field-error">{{ errors.so.buyer }}</p>
            </div>
            <div>
              <input v-model="soForm.farmer" class="field" :class="{ 'field-invalid': errors.so.farmer }" placeholder="Petani" />
              <p v-if="errors.so.farmer" class="field-error">{{ errors.so.farmer }}</p>
            </div>
            <div>
              <input v-model.number="soForm.qtyKg" class="field" :class="{ 'field-invalid': errors.so.qtyKg }" placeholder="Qty (kg)" type="number" />
              <p v-if="errors.so.qtyKg" class="field-error">{{ errors.so.qtyKg }}</p>
            </div>
            <div>
              <input
                v-model.number="soForm.pricePerKg"
                class="field"
                :class="{ 'field-invalid': errors.so.pricePerKg }"
                placeholder="Harga per Kg"
                type="number"
              />
              <p v-if="errors.so.pricePerKg" class="field-error">{{ errors.so.pricePerKg }}</p>
            </div>
            <textarea v-model="soForm.note" class="field md:col-span-2" rows="3" placeholder="Catatan order" />
            <button :disabled="submitting.so" type="submit" class="btn-primary w-full md:col-span-2 disabled:cursor-not-allowed disabled:opacity-70">
              {{ submitting.so ? 'Menyimpan Sale Order...' : 'Simpan Draft Sale Order' }}
            </button>
          </form>
        </GlassPanel>

        <GlassPanel title="Traceability Produk (QR)">
          <div class="mt-4 grid items-center gap-4 sm:grid-cols-[auto_1fr]">
            <canvas ref="qrCanvas" class="mx-auto rounded-lg bg-emerald-50 p-2 sm:mx-0" />
            <div class="space-y-2 text-sm text-emerald-50/90">
              <p><strong>Trace Code:</strong> {{ traceCode }}</p>
              <p><strong>Asal:</strong> Diterima dari petani -> Distilasi -> Gudang FG -> Delivery</p>
              <p><strong>Status:</strong> Siap audit mutu & batch recall</p>
              <RouterLink :to="`/traceability/${quickLotId}`" class="inline-flex w-full items-center justify-center rounded-lg bg-emerald-400/20 px-3 py-2 text-emerald-50 sm:w-auto">
                Buka Detail Timeline Lot
              </RouterLink>
            </div>
          </div>
        </GlassPanel>
      </div>

      <div class="grid gap-5 xl:grid-cols-2">
        <GlassPanel title="Form Serah Terima Barang">
          <form class="mt-4 grid gap-3 md:grid-cols-2" @submit.prevent="submitStb">
            <div>
              <input v-model="stbForm.id" class="field" :class="{ 'field-invalid': errors.stb.id }" placeholder="Nomor STB" />
              <p v-if="errors.stb.id" class="field-error">{{ errors.stb.id }}</p>
            </div>
            <div>
              <input v-model="stbForm.date" class="field" :class="{ 'field-invalid': errors.stb.date }" type="date" />
              <p v-if="errors.stb.date" class="field-error">{{ errors.stb.date }}</p>
            </div>
            <div>
              <input v-model="stbForm.farmer" class="field" :class="{ 'field-invalid': errors.stb.farmer }" placeholder="Nama Petani" />
              <p v-if="errors.stb.farmer" class="field-error">{{ errors.stb.farmer }}</p>
            </div>
            <div>
              <input v-model="stbForm.quality" class="field" :class="{ 'field-invalid': errors.stb.quality }" placeholder="Kualitas (A/B/C)" />
              <p v-if="errors.stb.quality" class="field-error">{{ errors.stb.quality }}</p>
            </div>
            <div>
              <input v-model.number="stbForm.qtyKg" class="field" :class="{ 'field-invalid': errors.stb.qtyKg }" placeholder="Qty diterima (kg)" type="number" />
              <p v-if="errors.stb.qtyKg" class="field-error">{{ errors.stb.qtyKg }}</p>
            </div>
            <div>
              <input v-model="stbForm.destination" class="field" :class="{ 'field-invalid': errors.stb.destination }" placeholder="Gudang tujuan" />
              <p v-if="errors.stb.destination" class="field-error">{{ errors.stb.destination }}</p>
            </div>
            <button :disabled="submitting.stb" type="submit" class="btn-primary w-full md:col-span-2 disabled:cursor-not-allowed disabled:opacity-70">
              {{ submitting.stb ? 'Menyimpan Serah Terima...' : 'Catat Serah Terima' }}
            </button>
          </form>
        </GlassPanel>

        <GlassPanel title="Form Delivery Order">
          <form class="mt-4 grid gap-3 md:grid-cols-2" @submit.prevent="submitDo">
            <div>
              <input v-model="doForm.id" class="field" :class="{ 'field-invalid': errors.do.id }" placeholder="Nomor DO" />
              <p v-if="errors.do.id" class="field-error">{{ errors.do.id }}</p>
            </div>
            <div>
              <input v-model="doForm.date" class="field" :class="{ 'field-invalid': errors.do.date }" type="date" />
              <p v-if="errors.do.date" class="field-error">{{ errors.do.date }}</p>
            </div>
            <div>
              <input v-model="doForm.customer" class="field" :class="{ 'field-invalid': errors.do.customer }" placeholder="Customer" />
              <p v-if="errors.do.customer" class="field-error">{{ errors.do.customer }}</p>
            </div>
            <div>
              <input v-model="doForm.mode" class="field" :class="{ 'field-invalid': errors.do.mode }" placeholder="Moda kirim" />
              <p v-if="errors.do.mode" class="field-error">{{ errors.do.mode }}</p>
            </div>
            <div>
              <input v-model.number="doForm.qtyKg" class="field" :class="{ 'field-invalid': errors.do.qtyKg }" placeholder="Qty (kg)" type="number" />
              <p v-if="errors.do.qtyKg" class="field-error">{{ errors.do.qtyKg }}</p>
            </div>
            <div>
              <input v-model="doForm.address" class="field" :class="{ 'field-invalid': errors.do.address }" placeholder="Alamat kirim" />
              <p v-if="errors.do.address" class="field-error">{{ errors.do.address }}</p>
            </div>
            <button :disabled="submitting.do" type="submit" class="btn-primary w-full md:col-span-2 disabled:cursor-not-allowed disabled:opacity-70">
              {{ submitting.do ? 'Menyimpan Delivery Order...' : 'Buat Delivery Order' }}
            </button>
          </form>
        </GlassPanel>
      </div>

      <div class="grid gap-5 xl:grid-cols-3">
        <GlassPanel title="Ringkasan Sale Order" class="xl:col-span-2">
          <ul class="space-y-2 text-sm text-emerald-50/90">
            <li v-for="order in salesOrders" :key="order.id" class="flex flex-col gap-1 rounded-lg bg-black/20 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
              <span>{{ order.id }} - {{ order.buyer }}</span>
              <span>{{ fmtNumber(order.qtyKg) }} kg / {{ fmtCurrency(order.total) }}</span>
            </li>
          </ul>
        </GlassPanel>

        <GlassPanel title="Status Operasional">
          <ul class="space-y-2 text-sm text-emerald-50/90">
            <li class="rounded-lg bg-black/20 px-3 py-2">STB masuk: {{ transferNotes.length }} dokumen</li>
            <li class="rounded-lg bg-black/20 px-3 py-2">DO aktif: {{ deliveryOrders.length }} dokumen</li>
            <li class="rounded-lg bg-black/20 px-3 py-2">SO aktif: {{ salesOrders.length }} dokumen</li>
          </ul>
        </GlassPanel>
      </div>
    </template>
  </section>
</template>
