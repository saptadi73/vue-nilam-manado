import {
  farmerPerformance,
  months,
  productionSeries,
  productionSummary,
  qualityByRegion,
  paPatchouliAlcoholSeriesByFarmer,
  salesOrders,
  salesSeries,
  transferNotes,
  deliveryOrders,
  inventoryFlow,
} from '@/data/mockData'

const wait = (ms = 120) => new Promise((resolve) => setTimeout(resolve, ms))

let salesOrdersState = [...salesOrders]
let transferNotesState = [...transferNotes]
let deliveryOrdersState = [...deliveryOrders]
let invoicesState = [
  {
    id: 'INV-2602-001',
    soId: 'SO-2602-001',
    buyer: 'PT Aroma Nusantara',
    date: '2026-02-05',
    total: 116400000,
    status: 'Posted',
  },
]
const extractRegion = (address = '') => address.split(',')[0].replace('Kab. ', '').trim()
const farmerRegionMap = Object.fromEntries(farmerPerformance.map((item) => [item.name, extractRegion(item.address)]))

const traceabilityLotsState = [
  {
    lotId: 'LOT-NILAM-ACEH-2602-1138',
    farmer: 'Deni Maulana',
    region: 'Kuningan',
    receivedKg: 520,
    fgKg: 410,
    soldKg: 410,
    qualityGrade: 'A',
    currentStage: 'Delivered',
    timeline: [
      {
        date: '2026-02-10 08:30',
        stage: 'Penerimaan Petani',
        actor: 'Gudang Aceh',
        docRef: 'STB-2602-018',
        qtyKg: 520,
        note: 'Diterima dengan kualitas A, kadar air sesuai standar.',
      },
      {
        date: '2026-02-11 13:20',
        stage: 'Distilasi Batch',
        actor: 'Unit Distilasi 02',
        docRef: 'PRD-2602-040',
        qtyKg: 472,
        note: 'Loss normal 9.2%, redaman rata-rata 90.3%.',
      },
      {
        date: '2026-02-13 09:10',
        stage: 'Quality Check',
        actor: 'Lab Quality',
        docRef: 'QC-2602-122',
        qtyKg: 468,
        note: 'Lolos parameter warna, aroma, dan densitas.',
      },
      {
        date: '2026-02-15 16:40',
        stage: 'Finished Goods',
        actor: 'Gudang FG',
        docRef: 'INV-2602-301',
        qtyKg: 410,
        note: 'Dipindahkan ke tangki FG untuk order ekspor.',
      },
      {
        date: '2026-02-19 07:50',
        stage: 'Delivery',
        actor: 'Logistik',
        docRef: 'DO-2602-022',
        qtyKg: 410,
        note: 'Dikirim ke PT Export Oils via kontainer 20ft.',
      },
    ],
  },
  {
    lotId: 'LOT-NILAM-ACEH-2602-1105',
    farmer: 'Rahman Siregar',
    region: 'Aceh Jaya',
    receivedKg: 340,
    fgKg: 240,
    soldKg: 240,
    qualityGrade: 'A-',
    currentStage: 'On Delivery',
    timeline: [
      {
        date: '2026-02-08 09:45',
        stage: 'Penerimaan Petani',
        actor: 'Gudang Aceh',
        docRef: 'STB-2602-012',
        qtyKg: 340,
        note: 'Batch diterima dari mitra petani.',
      },
      {
        date: '2026-02-09 14:10',
        stage: 'Distilasi Batch',
        actor: 'Unit Distilasi 01',
        docRef: 'PRD-2602-031',
        qtyKg: 292,
        note: 'Stabil pada suhu proses target.',
      },
      {
        date: '2026-02-10 11:00',
        stage: 'Quality Check',
        actor: 'Lab Quality',
        docRef: 'QC-2602-109',
        qtyKg: 286,
        note: 'Grade A- karena aroma borderline namun masih acceptable.',
      },
      {
        date: '2026-02-12 08:15',
        stage: 'Delivery',
        actor: 'Logistik',
        docRef: 'DO-2602-021',
        qtyKg: 240,
        note: 'Pengiriman ke PT Aroma Nusantara.',
      },
    ],
  },
]

const clone = (payload) => JSON.parse(JSON.stringify(payload))

export const mockErpService = {
  async getDashboard() {
    await wait()
    return {
      farmerPerformance,
      productionSummary,
      salesSeries,
      months,
    }
  },

  async getFarmerPerformance() {
    await wait()
    return farmerPerformance
  },

  async getProductionReport() {
    await wait()
    return { months, productionSeries, productionSummary, farmerPerformance: clone(farmerPerformance) }
  },

  async getSalesReport() {
    await wait()
    return {
      months,
      salesSeries,
      salesOrders: clone(salesOrdersState),
      invoices: clone(invoicesState),
      farmerPerformance: clone(farmerPerformance),
    }
  },

  async getOperational() {
    await wait()
    return {
      salesOrders: clone(salesOrdersState),
      transferNotes: clone(transferNotesState),
      deliveryOrders: clone(deliveryOrdersState),
    }
  },

  async submitSaleOrder(payload) {
    await wait(260)
    const exists = salesOrdersState.some((item) => item.id === payload.id)
    if (exists) {
      throw new Error('Nomor SO sudah digunakan, silakan pakai nomor lain.')
    }
    const next = {
      id: payload.id,
      buyer: payload.buyer,
      farmer: payload.farmer,
      region: farmerRegionMap[payload.farmer] ?? payload.region ?? 'Unknown',
      date: payload.date,
      qtyKg: payload.qtyKg,
      total: payload.qtyKg * payload.pricePerKg,
      status: 'Draft',
    }
    salesOrdersState = [next, ...salesOrdersState]
    return clone(next)
  },

  async submitTransferNote(payload) {
    await wait(220)
    const exists = transferNotesState.some((item) => item.id === payload.id)
    if (exists) {
      throw new Error('Nomor STB sudah ada.')
    }
    const next = {
      id: payload.id,
      farmer: payload.farmer,
      date: payload.date,
      qtyKg: payload.qtyKg,
      quality: payload.quality,
      destination: payload.destination,
    }
    transferNotesState = [next, ...transferNotesState]
    return clone(next)
  },

  async submitReceiptOrder(payload) {
    await wait(220)
    const exists = transferNotesState.some((item) => item.id === payload.id)
    if (exists) {
      throw new Error('Nomor RO sudah ada.')
    }
    const next = {
      id: payload.id,
      farmer: payload.farmer,
      date: payload.date,
      qtyKg: payload.qtyKg,
      quality: payload.quality,
      destination: payload.destination ?? 'Gudang Utama',
    }
    transferNotesState = [next, ...transferNotesState]
    return clone(next)
  },

  async submitDeliveryOrder(payload) {
    await wait(220)
    const exists = deliveryOrdersState.some((item) => item.id === payload.id)
    if (exists) {
      throw new Error('Nomor DO sudah ada.')
    }
    const next = {
      id: payload.id,
      customer: payload.customer,
      date: payload.date,
      qtyKg: payload.qtyKg,
      mode: payload.mode,
      status: 'Ready',
    }
    deliveryOrdersState = [next, ...deliveryOrdersState]
    return clone(next)
  },

  async submitInvoice(payload) {
    await wait(220)
    const exists = invoicesState.some((item) => item.id === payload.id)
    if (exists) {
      throw new Error('Nomor invoice sudah ada.')
    }
    const next = {
      id: payload.id,
      soId: payload.soId,
      buyer: payload.buyer,
      date: payload.date,
      total: payload.total,
      status: 'Posted',
    }
    invoicesState = [next, ...invoicesState]
    return clone(next)
  },

  async getInventoryReport() {
    await wait()
    return { inventoryFlow, transferNotes: clone(transferNotesState) }
  },

  async getQualityReport() {
    await wait()
    return {
      months,
      productionSeries,
      qualityByRegion,
      farmerPerformance: clone(farmerPerformance),
      paPatchouliAlcoholSeriesByFarmer: clone(paPatchouliAlcoholSeriesByFarmer),
    }
  },

  async getTraceabilityLots() {
    await wait()
    return clone(
      traceabilityLotsState.map((item) => ({
        lotId: item.lotId,
        farmer: item.farmer,
        region: item.region,
        receivedKg: item.receivedKg,
        fgKg: item.fgKg,
        soldKg: item.soldKg,
        qualityGrade: item.qualityGrade,
        currentStage: item.currentStage,
      })),
    )
  },

  async getTraceabilityByLot(lotId) {
    await wait()
    const lot = traceabilityLotsState.find((item) => item.lotId === lotId)
    if (!lot) {
      throw new Error('Lot tidak ditemukan.')
    }
    return clone(lot)
  },
}
