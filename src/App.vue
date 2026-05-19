<script setup>
import { watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppToast from '@/components/AppToast.vue'
import TopNav from '@/components/TopNav.vue'
import { useToast } from '@/composables/useToast'
import { useAuthSession } from '@/services/authSession'

const route = useRoute()
const router = useRouter()
const toast = useToast()
const { isAuthenticated, sessionExpiredAt, clearSessionExpired } = useAuthSession()

watch(
  () => isAuthenticated.value,
  (loggedIn) => {
    const isProtectedRealRoute = route.path.startsWith('/real') && route.path !== '/real/login'
    if (!loggedIn && isProtectedRealRoute) {
      router.replace({
        path: '/real/login',
        query: { redirect: route.fullPath },
      })
    }
  },
)

watch(
  () => sessionExpiredAt.value,
  (expiredAt) => {
    if (!expiredAt) return
    toast.error('Sesi login real API berakhir. Silakan login kembali.')
    clearSessionExpired()
  },
)
</script>

<template>
  <div class="app-bg min-h-screen">
    <TopNav />
    <AppToast />
    <main class="mx-auto max-w-7xl px-3 py-5 sm:px-4 sm:py-6 lg:px-8 lg:py-8">
      <RouterView />
    </main>
  </div>
</template>
