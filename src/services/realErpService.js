import { clearAccessToken, getAccessToken, getLoggedInUserId, markSessionExpired } from '@/services/authSession'
import { appConfig } from '@/config/env'

const API_BASE_URL = appConfig.apiBaseUrl

const isWrappedResponse = (payload) => {
  if (!payload || typeof payload !== 'object') return false
  return 'status' in payload && 'message' in payload && 'data' in payload
}

const unwrapData = (payload) => {
  if (isWrappedResponse(payload)) return payload.data
  return payload
}

const getErrorMessage = (payload, fallback) => {
  if (!payload) return fallback
  if (typeof payload === 'string') return payload
  if (typeof payload === 'object' && typeof payload.message === 'string') return payload.message
  return fallback
}

const toAbsoluteUrl = (urlOrPath) => {
  if (!urlOrPath) return ''
  if (/^https?:\/\//i.test(urlOrPath)) return urlOrPath
  const normalized = urlOrPath.startsWith('/') ? urlOrPath : `/${urlOrPath}`
  return `${API_BASE_URL}${normalized}`
}

const buildUrl = (path, query = {}) => {
  const baseOrigin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost'
  const url = new URL(`${API_BASE_URL}${path}`, baseOrigin)
  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return
    url.searchParams.set(key, value)
  })
  return url.toString()
}

const withUserUpdate = (payload) => {
  if (!payload || typeof payload !== 'object') return payload

  const userId = getLoggedInUserId()
  if (!userId) return payload
  if (payload.user_update) return payload

  return {
    ...payload,
    user_update: userId,
  }
}

const withUserUpdateId = (payload) => {
  if (!payload || typeof payload !== 'object') return payload

  const userId = getLoggedInUserId()
  if (!userId) return payload
  if (payload.user_update_id) return payload

  return {
    ...payload,
    user_update_id: userId,
  }
}

const withUserUpdateQuery = (query = {}) => {
  const userId = getLoggedInUserId()
  if (!userId) return query
  if (query.user_update) return query

  return {
    ...query,
    user_update: userId,
  }
}

const request = async (path, options = {}) => {
  const { query, body, isFormData = false, headers = {}, ...rest } = options
  const token = getAccessToken()
  const isStringBody = typeof body === 'string'

  const response = await fetch(buildUrl(path, query), {
    ...rest,
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body
      ? isFormData
        ? body
        : isStringBody
          ? body
          : JSON.stringify(body)
      : undefined,
  })

  const rawText = await response.text()
  let payload = null
  if (rawText) {
    try {
      payload = JSON.parse(rawText)
    } catch {
      payload = rawText
    }
  }

  if (!response.ok) {
    if (response.status === 401) {
      if (token) {
        clearAccessToken()
        markSessionExpired()
      }
      throw new Error('Sesi login berakhir. Silakan login kembali.')
    }
    throw new Error(getErrorMessage(payload, `Request gagal (${response.status})`))
  }

  return unwrapData(payload)
}

export const realErpService = {
  // Pembiayaan (Expense)
  async getFinancings(query = {}) {
    return request('/financings', { query })
  },
  async createFinancing(payload) {
    return request('/financings', { method: 'POST', body: withUserUpdateId(payload) })
  },
  async updateFinancing(id, payload) {
    return request(`/financings/${id}`, { method: 'PUT', body: withUserUpdateId(payload) })
  },
  async deleteFinancing(id) {
    return request(`/financings/${id}`, { method: 'DELETE', query: withUserUpdateQuery() })
  },
  async getFinancingProducts(query = {}) {
    return request('/financing-products', { query })
  },
  async getFinancingProductById(id) {
    return request(`/financing-products/${id}`)
  },
  async createFinancingProduct(payload) {
    return request('/financing-products', { method: 'POST', body: withUserUpdateId(payload) })
  },
  async updateFinancingProduct(id, payload) {
    return request(`/financing-products/${id}`, { method: 'PUT', body: withUserUpdateId(payload) })
  },
  async deleteFinancingProduct(id) {
    return request(`/financing-products/${id}`, { method: 'DELETE', query: withUserUpdateQuery() })
  },

  async getSalesProducts(query = {}) {
    return request('/sales-products', { query })
  },
  async getSalesProductById(id) {
    return request(`/sales-products/${id}`)
  },
  async createSalesProduct(payload) {
    return request('/sales-products', { method: 'POST', body: withUserUpdateId(payload) })
  },
  async updateSalesProduct(id, payload) {
    return request(`/sales-products/${id}`, { method: 'PUT', body: withUserUpdateId(payload) })
  },
  async deleteSalesProduct(id) {
    return request(`/sales-products/${id}`, { method: 'DELETE', query: withUserUpdateQuery() })
  },

  async getPartners(query = {}) {
    return request('/partners', { query })
  },
  async getPartnerById(id) {
    return request(`/partners/${id}`)
  },
  async createPartner(payload) {
    return request('/partners', { method: 'POST', body: withUserUpdateId(payload) })
  },
  async updatePartner(id, payload) {
    return request(`/partners/${id}`, { method: 'PUT', body: withUserUpdateId(payload) })
  },
  async deletePartner(id) {
    return request(`/partners/${id}`, { method: 'DELETE', query: withUserUpdateQuery() })
  },

  async login(email, password) {
    const payload = new URLSearchParams({
      username: String(email ?? '').trim(),
      password: String(password ?? ''),
    })

    return request('/auth/login', {
      method: 'POST',
      body: payload.toString(),
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    })
  },

  async register(payload) {
    return request('/auth/register', { method: 'POST', body: payload })
  },

  async getFarmers(search = '') {
    return request('/farmers', { query: { search } })
  },

  async getLands(query = {}) {
    return request('/lands', { query })
  },

  async createLand(payload) {
    return request('/lands', {
      method: 'POST',
      body: withUserUpdate(payload),
    })
  },

  async getLandById(id) {
    return request(`/lands/${id}`)
  },

  async updateLand(id, payload) {
    return request(`/lands/${id}`, {
      method: 'PUT',
      body: withUserUpdate(payload),
    })
  },

  async deleteLand(id) {
    return request(`/lands/${id}`, {
      method: 'DELETE',
      query: withUserUpdateQuery(),
    })
  },

  async createPlantingProduction(payload) {
    return request('/planting-productions', {
      method: 'POST',
      body: withUserUpdateId(payload),
    })
  },

  async getPlantingProductions(query = {}) {
    return request('/planting-productions', { query })
  },

  async getPlantingProductionById(id) {
    return request(`/planting-productions/${id}`)
  },

  async updatePlantingProduction(id, payload) {
    return request(`/planting-productions/${id}`, {
      method: 'PUT',
      body: withUserUpdateId(payload),
    })
  },

  async deletePlantingProduction(id) {
    return request(`/planting-productions/${id}`, {
      method: 'DELETE',
      query: withUserUpdateQuery(),
    })
  },
  async getPlantingProductionNotes(productionId, query = {}) {
    return request(`/planting-productions/${productionId}/notes`, { query })
  },
  async createPlantingProductionNote(productionId, payload) {
    return request(`/planting-productions/${productionId}/notes`, {
      method: 'POST',
      body: withUserUpdateId(payload),
    })
  },
  async updatePlantingProductionNote(productionId, noteId, payload) {
    return request(`/planting-productions/${productionId}/notes/${noteId}`, {
      method: 'PUT',
      body: withUserUpdateId(payload),
    })
  },
  async deletePlantingProductionNote(productionId, noteId) {
    return request(`/planting-productions/${productionId}/notes/${noteId}`, {
      method: 'DELETE',
      query: withUserUpdateQuery(),
    })
  },

  async createOilProduction(payload) {
    return request('/oil-productions', {
      method: 'POST',
      body: withUserUpdateId(payload),
    })
  },

  async getOilProductions(query = {}) {
    return request('/oil-productions', { query })
  },

  async getOilProductionById(id) {
    return request(`/oil-productions/${id}`)
  },

  async updateOilProduction(id, payload) {
    return request(`/oil-productions/${id}`, {
      method: 'PUT',
      body: withUserUpdateId(payload),
    })
  },

  async deleteOilProduction(id) {
    return request(`/oil-productions/${id}`, {
      method: 'DELETE',
      query: withUserUpdateQuery(),
    })
  },
  async getOilProductionNotes(productionId, query = {}) {
    return request(`/oil-productions/${productionId}/notes`, { query })
  },
  async createOilProductionNote(productionId, payload) {
    return request(`/oil-productions/${productionId}/notes`, {
      method: 'POST',
      body: withUserUpdateId(payload),
    })
  },
  async updateOilProductionNote(productionId, noteId, payload) {
    return request(`/oil-productions/${productionId}/notes/${noteId}`, {
      method: 'PUT',
      body: withUserUpdateId(payload),
    })
  },
  async deleteOilProductionNote(productionId, noteId) {
    return request(`/oil-productions/${productionId}/notes/${noteId}`, {
      method: 'DELETE',
      query: withUserUpdateQuery(),
    })
  },

  async uploadLandPhoto(id, file) {
    const formData = new FormData()
    formData.append('foto', file)
    return request(`/lands/${id}/foto`, {
      method: 'POST',
      body: formData,
      isFormData: true,
      query: withUserUpdateQuery(),
    })
  },

  async getFarmerById(id) {
    return request(`/farmers/${id}`)
  },

  async createFarmer(payload) {
    return request('/farmers', { method: 'POST', body: withUserUpdate(payload) })
  },

  async updateFarmer(id, payload) {
    return request(`/farmers/${id}`, { method: 'PUT', body: withUserUpdate(payload) })
  },

  async deleteFarmer(id) {
    return request(`/farmers/${id}`, {
      method: 'DELETE',
      query: withUserUpdateQuery(),
    })
  },

  async uploadFarmerPhoto(id, file) {
    const formData = new FormData()
    formData.append('foto', file)
    return request(`/farmers/${id}/foto`, {
      method: 'POST',
      body: formData,
      isFormData: true,
      query: withUserUpdateQuery(),
    })
  },

  async deleteFarmerPhoto(id) {
    return request(`/farmers/${id}/foto`, {
      method: 'DELETE',
      query: withUserUpdateQuery(),
    })
  },

  async getProvinsi(search = '') {
    return request('/wilayah/provinsi', { query: { search } })
  },

  async getKabupatenKota(provinsiKode, search = '') {
    return request('/wilayah/kabupaten-kota', {
      query: {
        provinsi_kode: provinsiKode,
        search,
      },
    })
  },

  async getKecamatan(kabupatenKotaKode, search = '') {
    return request('/wilayah/kecamatan', {
      query: {
        kabupaten_kota_kode: kabupatenKotaKode,
        search,
      },
    })
  },

  async getDesaKelurahan(kecamatanKode, search = '') {
    return request('/wilayah/desa-kelurahan', {
      query: {
        kecamatan_kode: kecamatanKode,
        search,
      },
    })
  },

  async getDashboardSalesVsExpensesByFarmer(query = {}) {
    return request('/dashboard/sales-vs-expenses/by-farmer', { query })
  },

  async getDashboardSalesMonthly(query = {}) {
    return request('/dashboard/sales/monthly', { query })
  },

  async getDashboardExpensesMonthly(query = {}) {
    return request('/dashboard/expenses/monthly', { query })
  },

  async getDashboardPlantingProductionsMonthly(query = {}) {
    return request('/dashboard/planting-productions/monthly', { query })
  },

  async getDashboardOilProductionsMonthly(query = {}) {
    return request('/dashboard/oil-productions/monthly', { query })
  },

  async getDashboardSalesByFarmer(query = {}) {
    return request('/dashboard/sales/by-farmer', { query })
  },

  async getDashboardSalesByFarmerRegency(query = {}) {
    return request('/dashboard/sales/by-farmer-regency', { query })
  },

  async getDashboardSalesMonthlyByFarmer(query = {}) {
    return request('/dashboard/sales/monthly-by-farmer', { query })
  },

  async getDashboardExpensesMonthlyByFarmer(query = {}) {
    return request('/dashboard/expenses/monthly-by-farmer', { query })
  },

  async getDashboardSalesVsExpensesMonthly(query = {}) {
    return request('/dashboard/sales-vs-expenses/monthly', { query })
  },

  async getDashboardFarmerNetProfit(query = {}) {
    return request('/dashboard/farmer-net-profit', { query })
  },
}

export { API_BASE_URL, toAbsoluteUrl }
