<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from '@/composables/useToast'
import { useAuthSession } from '@/services/authSession'

const router = useRouter()
const toast = useToast()
const { isAuthenticated, clearAccessToken } = useAuthSession()
const mobileMenuOpen = ref(false)
const desktopMoreOpen = ref(false)
const desktopMoreContainerRef = ref(null)
const mobileMenuStorageKey = 'patchouli:mobile-menu-open'

const primaryCrudLinks = [
  {
    to: '/real/petani',
    label: '1. List Petani (CRUD)',
    badge: 'PT',
    toneClass: 'border-emerald-300/35 bg-emerald-500/15 hover:bg-emerald-500/25',
    badgeClass: 'bg-emerald-400/30 text-emerald-50',
  },
  {
    to: '/real/lahan',
    label: '2. List Lahan (CRUD)',
    badge: 'LH',
    toneClass: 'border-cyan-300/35 bg-cyan-500/15 hover:bg-cyan-500/25',
    badgeClass: 'bg-cyan-400/30 text-cyan-50',
  },
  {
    to: '/real/produksi-tanam',
    label: '3. List Produksi Tanam (CRUD)',
    badge: 'TN',
    toneClass: 'border-amber-300/35 bg-amber-500/15 hover:bg-amber-500/25',
    badgeClass: 'bg-amber-400/30 text-amber-50',
  },
  {
    to: '/real/produksi-minyak',
    label: '4. List Produksi Minyak (CRUD)',
    badge: 'MY',
    toneClass: 'border-fuchsia-300/35 bg-fuchsia-500/15 hover:bg-fuchsia-500/25',
    badgeClass: 'bg-fuchsia-400/30 text-fuchsia-50',
  },
]

const secondaryRealLinks = [
  { to: '/real/dashboard', label: 'Dashboard (Real)' },
  { to: '/real/expense', label: 'List Expense (Real)' },
  { to: '/real/wilayah', label: 'Master Wilayah (Real)' },
  { to: '/real/profile', label: 'Profil Sesi (Real)' },
]

const demoLinks = [
  { to: '/demo/dashboard', label: 'Dashboard Demo' },
  { to: '/petani', label: 'Performa Petani (Demo)' },
]

const primaryLinks = computed(() => {
  if (isAuthenticated.value) return primaryCrudLinks
  return [
    {
      to: '/real/login',
      label: 'Login Real API',
      badge: 'LG',
      toneClass: 'border-emerald-300/35 bg-emerald-500/15 hover:bg-emerald-500/25',
      badgeClass: 'bg-emerald-400/30 text-emerald-50',
    },
  ]
})

const extraLinks = computed(() => {
  if (isAuthenticated.value) return secondaryRealLinks
  return demoLinks
})

const navigate = () => {
  mobileMenuOpen.value = false
  desktopMoreOpen.value = false
}

const logoutReal = () => {
  clearAccessToken()
  toast.info('Sesi real API diakhiri.')
  mobileMenuOpen.value = false
  desktopMoreOpen.value = false
  router.push('/real/login')
}

const toggleDesktopMore = () => {
  desktopMoreOpen.value = !desktopMoreOpen.value
}

const onGlobalPointerDown = (event) => {
  if (!desktopMoreOpen.value) return

  const containerEl = desktopMoreContainerRef.value
  if (!containerEl) return

  if (containerEl.contains(event.target)) return
  desktopMoreOpen.value = false
}

onMounted(() => {
  const saved = sessionStorage.getItem(mobileMenuStorageKey)
  mobileMenuOpen.value = saved === '1'
  document.addEventListener('pointerdown', onGlobalPointerDown)
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onGlobalPointerDown)
})

watch(mobileMenuOpen, (isOpen) => {
  sessionStorage.setItem(mobileMenuStorageKey, isOpen ? '1' : '0')
})
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

      <div class="mt-4 hidden md:block">
        <p v-if="isAuthenticated" class="mb-2 text-xs uppercase tracking-[0.15em] text-emerald-100/70">Menu Utama CRUD</p>
        <div class="flex flex-wrap items-center gap-2">
          <RouterLink
            v-for="item in primaryLinks"
            :key="item.to"
            :to="item.to"
            class="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold text-emerald-50/90 transition hover:text-white"
            :class="item.toneClass"
            active-class="bg-emerald-400/35 text-white"
            @click="navigate"
          >
            <span class="inline-flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold tracking-[0.08em]" :class="item.badgeClass">
              {{ item.badge }}
            </span>
            {{ item.label }}
          </RouterLink>
        </div>

        <div v-if="extraLinks.length" ref="desktopMoreContainerRef" class="relative mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            class="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/8 px-4 py-2 text-sm font-medium text-emerald-50/80 transition hover:bg-emerald-400/20 hover:text-white"
            @click="toggleDesktopMore"
          >
            Lainnya
            <span class="text-xs">{{ desktopMoreOpen ? '▲' : '▼' }}</span>
          </button>
          <div v-if="desktopMoreOpen" class="absolute left-0 top-12 z-30 min-w-64 space-y-1 rounded-2xl border border-white/10 bg-[#0b2a25] p-2 shadow-xl">
            <RouterLink
              v-for="item in extraLinks"
              :key="item.to"
              :to="item.to"
              class="block rounded-xl px-3 py-2 text-sm font-medium text-emerald-50/85 transition hover:bg-emerald-400/20 hover:text-white"
              active-class="bg-emerald-400/20 text-white"
              @click="navigate"
            >
              {{ item.label }}
            </RouterLink>
          </div>
          <button v-if="isAuthenticated" type="button" class="btn-muted" @click="logoutReal">Logout Real</button>
        </div>
      </div>

      <transition name="fade">
        <div v-if="mobileMenuOpen" class="mt-4 space-y-2 md:hidden">
          <p v-if="isAuthenticated" class="px-2 text-xs uppercase tracking-[0.15em] text-emerald-100/70">Menu Utama CRUD</p>
          <RouterLink
            v-for="item in primaryLinks"
            :key="`mobile-${item.to}`"
            :to="item.to"
            class="flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold text-emerald-50/90 transition hover:text-white"
            :class="item.toneClass"
            active-class="border-emerald-400/30 bg-emerald-400/20 text-white"
            @click="navigate"
          >
            <span class="inline-flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold tracking-[0.08em]" :class="item.badgeClass">
              {{ item.badge }}
            </span>
            {{ item.label }}
          </RouterLink>

          <p v-if="extraLinks.length" class="px-2 pt-1 text-xs uppercase tracking-[0.15em] text-emerald-100/65">Menu Lainnya</p>
          <RouterLink
            v-for="item in extraLinks"
            :key="`mobile-extra-${item.to}`"
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
