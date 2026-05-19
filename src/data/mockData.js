export const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']

export const farmerPerformance = [
  {
    id: 'PTN-001',
    name: 'Rahman Siregar',
    photoUrl: 'https://i.pravatar.cc/240?img=12',
    address: 'Kab. Aceh Jaya, Aceh',
    areaPolygon: [
      [4.669, 95.566],
      [4.675, 95.594],
      [4.657, 95.617],
      [4.633, 95.603],
      [4.639, 95.572],
    ],
    areaHa: 8.6,
    harvestKg: 12800,
    salesIdr: 345600000,
    targetAchievement: 93,
    plantedHa: 6.2,
    readyKg: 1850,
  },
  {
    id: 'PTN-002',
    name: 'Murniati B.',
    photoUrl: 'https://i.pravatar.cc/240?img=47',
    address: 'Kab. Gayo Lues, Aceh',
    areaPolygon: [
      [3.976, 97.367],
      [3.992, 97.384],
      [3.973, 97.408],
      [3.951, 97.391],
      [3.957, 97.365],
    ],
    areaHa: 5.4,
    harvestKg: 8450,
    salesIdr: 229500000,
    targetAchievement: 88,
    plantedHa: 4.8,
    readyKg: 1220,
  },
  {
    id: 'PTN-003',
    name: 'Deni Maulana',
    photoUrl: 'https://i.pravatar.cc/240?img=14',
    address: 'Kab. Kuningan, Jawa Barat',
    areaPolygon: [
      [-6.995, 108.459],
      [-6.982, 108.481],
      [-7.004, 108.497],
      [-7.021, 108.473],
      [-7.013, 108.451],
    ],
    areaHa: 11.2,
    harvestKg: 16550,
    salesIdr: 451800000,
    targetAchievement: 97,
    plantedHa: 8.9,
    readyKg: 2510,
  },
  {
    id: 'PTN-004',
    name: 'Sulastri Dewi',
    photoUrl: 'https://i.pravatar.cc/240?img=45',
    address: 'Kab. Pasaman, Sumatera Barat',
    areaPolygon: [
      [0.188, 100.093],
      [0.204, 100.116],
      [0.182, 100.139],
      [0.161, 100.122],
      [0.167, 100.096],
    ],
    areaHa: 7.1,
    harvestKg: 10620,
    salesIdr: 298200000,
    targetAchievement: 91,
    plantedHa: 5.5,
    readyKg: 1490,
  },
]

export const productionSeries = {
  produksiKg: [4200, 4650, 4890, 5100, 5400, 5580, 5920, 6180, 6400, 6680, 6990, 7240],
  tanamHa: [22, 23.5, 24.2, 25.1, 26, 27.4, 28, 29.3, 30.1, 30.8, 31.5, 32.2],
  redamanPct: [84, 85, 85.5, 86, 86.8, 87.2, 87.5, 88, 88.6, 89.1, 89.4, 90],
}

export const productionSummary = {
  totalRangeKg: 72230,
  byFarmerKg: {
    'Rahman Siregar': 19200,
    'Murniati B.': 12640,
    'Deni Maulana': 24300,
    'Sulastri Dewi': 16090,
  },
  byRegionKg: {
    'Aceh Jaya': 21420,
    'Gayo Lues': 13840,
    Kuningan: 20760,
    Pasaman: 16210,
  },
}

export const salesSeries = [
  128000000,
  136500000,
  141800000,
  152400000,
  165700000,
  171300000,
  178900000,
  186100000,
  193500000,
  201700000,
  214500000,
  225400000,
]

export const salesOrders = [
  { id: 'SO-2602-001', buyer: 'PT Aroma Nusantara', farmer: 'Rahman Siregar', region: 'Aceh Jaya', date: '2026-02-04', qtyKg: 480, total: 116400000, status: 'Terkonfirmasi' },
  { id: 'SO-2602-002', buyer: 'CV Atsiri Global', farmer: 'Deni Maulana', region: 'Kuningan', date: '2026-02-10', qtyKg: 350, total: 87850000, status: 'Diproses' },
  { id: 'SO-2602-003', buyer: 'PT Export Oils', farmer: 'Sulastri Dewi', region: 'Pasaman', date: '2026-02-17', qtyKg: 520, total: 132600000, status: 'Selesai' },
]

export const transferNotes = [
  { id: 'STB-2602-011', farmer: 'Murniati B.', date: '2026-02-08', qtyKg: 290, quality: 'A-', destination: 'Gudang Utama Aceh' },
  { id: 'STB-2602-012', farmer: 'Rahman Siregar', date: '2026-02-14', qtyKg: 340, quality: 'A', destination: 'Gudang Utama Aceh' },
]

export const deliveryOrders = [
  { id: 'DO-2602-021', customer: 'PT Aroma Nusantara', date: '2026-02-12', qtyKg: 240, mode: 'Truk Pendingin', status: 'On Delivery' },
  { id: 'DO-2602-022', customer: 'PT Export Oils', date: '2026-02-19', qtyKg: 410, mode: 'Kontainer 20ft', status: 'Ready' },
]

export const inventoryFlow = [
  { stage: 'Diterima dari Petani', qtyKg: 3480 },
  { stage: 'Proses Distilasi', qtyKg: 3110 },
  { stage: 'Semi Finished', qtyKg: 2860 },
  { stage: 'Finished Goods', qtyKg: 2540 },
  { stage: 'Terjual', qtyKg: 1930 },
]

export const qualityByRegion = [
  { region: 'Aceh Jaya', avgRedaman: 89.2, targetPct: 94 },
  { region: 'Gayo Lues', avgRedaman: 87.8, targetPct: 90 },
  { region: 'Kuningan', avgRedaman: 90.4, targetPct: 96 },
  { region: 'Pasaman', avgRedaman: 88.1, targetPct: 91 },
]

export const paPatchouliAlcoholSeriesByFarmer = {
  'Rahman Siregar': [33.2, 33.5, 33.8, 34.1, 34.4, 34.7, 35.1, 35.4, 35.7, 36.0, 36.2, 36.5],
  'Murniati B.': [31.4, 31.8, 32.0, 32.4, 32.7, 33.0, 33.3, 33.7, 34.0, 34.3, 34.6, 34.9],
  'Deni Maulana': [34.6, 35.0, 35.3, 35.7, 36.1, 36.5, 36.8, 37.1, 37.4, 37.6, 37.8, 38.0],
  'Sulastri Dewi': [32.1, 32.4, 32.7, 33.0, 33.4, 33.7, 34.0, 34.2, 34.5, 34.8, 35.1, 35.4],
}

export const fmtCurrency = (value) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value)

export const fmtNumber = (value) => new Intl.NumberFormat('id-ID').format(value)
