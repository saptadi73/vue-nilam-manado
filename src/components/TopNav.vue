<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from '@/composables/useToast'
import { useAuthSession } from '@/services/authSession'

const router = useRouter()
const toast = useToast()
const { isAuthenticated, clearAccessToken } = useAuthSession()
const mobileMenuOpen = ref(false)

const baseLinks = [
  { to: '/', label: 'Dashboard' },
  { to: '/petani', label: 'Performa Petani (Demo)' },
  { to: '/produksi', label: 'Produksi' },
  { to: '/penjualan', label: 'Penjualan' },
  { to: '/operasional', label: 'Operasional' },
  { to: '/traceability', label: 'Traceability' },
  { to: '/inventory', label: 'Inventory' },
  { to: '/kualitas', label: 'Kualitas' },
]

const realLinks = [
  { to: '/real/petani', label: 'Master Petani (Real)' },
  { to: '/real/lahan', label: 'Master Lahan (Real)' },
  { to: '/real/wilayah', label: 'Master Wilayah (Real)' },
  { to: '/real/produksi-tanam', label: 'List Tanam (Real)' },
  { to: '/real/produksi-tanam/new', label: 'Input Tanam (Real)' },
  { to: '/real/produksi-minyak', label: 'List Minyak (Real)' },
  { to: '/real/produksi-minyak/new', label: 'Input Minyak (Real)' },
  { to: '/real/profile', label: 'Profil Sesi (Real)' },
]

const links = computed(() => {
  if (isAuthenticated.value) {
    return [...baseLinks.slice(0, 2), ...realLinks, ...baseLinks.slice(2)]
  }
  return [{ to: '/real/login', label: 'Login Real API' }, ...baseLinks]
})

const navigate = () => {
  mobileMenuOpen.value = false
}

const logoutReal = () => {
  clearAccessToken()
  toast.info('Sesi real API diakhiri.')
  mobileMenuOpen.value = false
  router.push('/real/login')
}
</script>

<template>
  <header class="sticky top-0 z-20 border-b border-white/10 bg-[#0d2f2a]/80 backdrop-blur-xl">
    <nav class="mx-auto max-w-7xl px-4 py-4 lg:px-8">
      <div class="flex items-center justify-between gap-3">
        <div class="min-w-0">
          <p class="text-xs uppercase tracking-[0.2em] text-emerald-100/70">Patchouli ERP</p>
          <h1 class="truncate text-lg font-bold text-white">Portal Ekosistem Nilam</h1>
        </div>

        <button
          type="button"
          class="btn-muted md:hidden"
          @click="mobileMenuOpen = !mobileMenuOpen"
        >
          {{ mobileMenuOpen ? 'Tutup' : 'Menu' }}
        </button>
      </div>

      <div class="mt-4 hidden flex-wrap items-center gap-2 md:flex">
        <RouterLink
          v-for="item in links"
          :key="item.to"
          :to="item.to"
          class="rounded-full px-4 py-2 text-sm font-medium text-emerald-50/80 transition hover:bg-emerald-400/20 hover:text-white"
          active-class="bg-emerald-400/30 text-white"
          @click="navigate"
        >
          {{ item.label }}
        </RouterLink>
        <button v-if="isAuthenticated" type="button" class="btn-muted" @click="logoutReal">Logout Real</button>
      </div>

      <transition name="fade">
        <div v-if="mobileMenuOpen" class="mt-4 space-y-2 md:hidden">
          <RouterLink
            v-for="item in links"
            :key="item.to"
            :to="item.to"
            class="block rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm font-medium text-emerald-50/85 transition hover:bg-emerald-400/20 hover:text-white"
            active-class="border-emerald-400/30 bg-emerald-400/20 text-white"
            @click="navigate"
          >
            {{ item.label }}
          </RouterLink>

          <button v-if="isAuthenticated" type="button" class="btn-muted w-full" @click="logoutReal">Logout Real</button>
        </div>
      </transition>
    </nav>
  </header>
</template>
