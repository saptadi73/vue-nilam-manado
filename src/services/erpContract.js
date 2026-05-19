// Data contract for future Odoo API integration.
// Keep keys stable so UI layers remain unchanged when source switches from mock to backend.

export const erpContract = {
  farmerPerformance: {
    id: 'string',
    name: 'string',
    photoUrl: 'string',
    address: 'string',
    areaPolygon: 'number[][]',
    areaHa: 'number',
    harvestKg: 'number',
    salesIdr: 'number',
    targetAchievement: 'number',
    plantedHa: 'number',
    readyKg: 'number',
  },
  salesOrder: {
    id: 'string',
    buyer: 'string',
    farmer: 'string',
    date: 'YYYY-MM-DD',
    qtyKg: 'number',
    total: 'number',
    status: 'string',
  },
  transferNote: {
    id: 'string',
    farmer: 'string',
    date: 'YYYY-MM-DD',
    qtyKg: 'number',
    quality: 'string',
    destination: 'string',
  },
  deliveryOrder: {
    id: 'string',
    customer: 'string',
    date: 'YYYY-MM-DD',
    qtyKg: 'number',
    mode: 'string',
    status: 'string',
  },
}

export const mapOdooFarmerRecord = (record) => ({
  id: String(record.id),
  name: record.name,
  photoUrl: record.photo_url ?? '',
  address: record.address,
  areaPolygon: Array.isArray(record.area_polygon) ? record.area_polygon : [],
  areaHa: Number(record.area_ha ?? 0),
  harvestKg: Number(record.total_harvest_kg ?? 0),
  salesIdr: Number(record.total_sales_idr ?? 0),
  targetAchievement: Number(record.target_achievement_pct ?? 0),
  plantedHa: Number(record.active_planting_ha ?? 0),
  readyKg: Number(record.ready_production_kg ?? 0),
})
