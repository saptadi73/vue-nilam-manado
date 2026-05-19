import { ref } from 'vue'
import { mockErpService } from '@/services/mockErpService'

export const useErpData = (loader) => {
  const data = ref(null)
  const loading = ref(false)
  const error = ref('')

  const refresh = async () => {
    loading.value = true
    error.value = ''
    try {
      data.value = await loader(mockErpService)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Terjadi kesalahan saat memuat data'
    } finally {
      loading.value = false
    }
  }

  return {
    data,
    loading,
    error,
    refresh,
  }
}
