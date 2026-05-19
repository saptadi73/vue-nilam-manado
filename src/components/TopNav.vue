<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from '@/composables/useToast'
import { useAuthSession } from '@/services/authSession'

const route = useRoute()
const router = useRouter()
const toast = useToast()
const { isAuthenticated, clearAccessToken } = useAuthSession()

const mobileMenuOpen = ref(false)
const desktopDropdownKey = ref('')
const navRef = ref(null)
const mobileMenuStorageKey = 'patchouli:mobile-menu-open'

const navItems = computed(() => [
  { key: 'home', label: 'Home', to: '/home' },
  { key: 'about', label: 'Tentang Kita', to: '/tentang' },
  {
    key: 'master',
    label: 'Master Data',
    children: [
      { label: 'Petani', to: '/real/petani' },
      { label: 'Lahan', to: '/real/lahan' },
      { label: 'Mitra', to: '/real/mitra' },
    ],
  },
  {
    key: 'produksi',
    label: 'Produksi',
    children: [
      { label: 'Produksi Tanam', to: '/real/produksi-tanam' },
      { label: 'Produksi Minyak', to: '/real/produksi-minyak' },
    ],
  },
  {
    key: 'produk',
    label: 'Produk',
    children: [
      { label: 'Produk Penjualan', to: '/real/produk-penjualan' },
      { label: 'Produk Biaya', to: '/real/produk-biaya' },
    ],
  },
  { key: 'dashboard', label: 'Dashboard', to: '/real/dashboard' },
  {
    key: 'user',
    label: 'User',
    children: [
      { label: 'Login', to: '/real/login' },
      { label: 'Logout', action: 'logout', authOnly: true },
      { label: 'Register', to: '/real/login?mode=register' },
      { label: 'Profil', to: '/real/profile', authOnly: true },
    ],
  },
])

const visibleChildren = (item) => {
  if (!item?.children) return []
  return item.children.filter((child) => {
    if (child.authOnly && !isAuthenticated.value) return false
    return true
  })
}

const closeAllMenus = () => {
  mobileMenuOpen.value = false
  desktopDropdownKey.value = ''
}

const toggleDesktopDropdown = (key) => {
  desktopDropdownKey.value = desktopDropdownKey.value === key ? '' : key
}

const logoutReal = () => {
  clearAccessToken()
  toast.info('Sesi real API diakhiri.')
  closeAllMenus()
  router.push('/real/login')
}

const onMenuItemClick = (item) => {
  if (item.action === 'logout') {
    logoutReal()
    return
  }
  closeAllMenus()
}

const onGlobalPointerDown = (event) => {
  if (!desktopDropdownKey.value) return
  if (!navRef.value) return
  if (navRef.value.contains(event.target)) return
  desktopDropdownKey.value = ''
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

watch(
  () => route.fullPath,
  () => {
    desktopDropdownKey.value = ''
  },
)
</script>

<template>
  <header class="sticky top-0 z-30 border-b border-white/10 bg-[#0d2f2a]/85 backdrop-blur-xl">
    <nav ref="navRef" class="mx-auto max-w-7xl px-4 py-3 lg:px-8">
      <div class="flex items-center justify-between gap-3">
        <RouterLink to="/home" class="flex min-w-0 items-center gap-3" @click="closeAllMenus">
          <img
            src="/logo_nilam.png"
            alt="Logo Nilam"
            class="h-11 w-11 rounded-xl border border-white/35 bg-white object-cover p-1 shadow-sm"
          >
          <div class="min-w-0">
            <p class="text-xs uppercase tracking-[0.2em] text-emerald-100/70">Patchouli ERP</p>
            <h1 class="truncate text-lg font-bold text-white">Nilam Sulut</h1>
          </div>
        </RouterLink>

        <button type="button" class="btn-muted md:hidden" @click="mobileMenuOpen = !mobileMenuOpen">
          {{ mobileMenuOpen ? 'Tutup Main Menu' : 'Main Menu' }}
        </button>
      </div>

      <ul class="mt-3 hidden items-center gap-1 md:flex">
        <li v-for="item in navItems" :key="`desktop-${item.key}`" class="relative">
          <RouterLink
            v-if="item.to"
            :to="item.to"
            class="inline-flex items-center rounded-lg px-3 py-2 text-sm font-medium text-emerald-100/90 transition hover:bg-emerald-500/20 hover:text-white"
            active-class="bg-emerald-500/25 text-white"
            @click="onMenuItemClick(item)"
          >
            {{ item.label }}
          </RouterLink>

          <button
            v-else
            type="button"
            class="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-emerald-100/90 transition hover:bg-emerald-500/20 hover:text-white"
            :class="desktopDropdownKey === item.key ? 'bg-emerald-500/25 text-white' : ''"
            @click="toggleDesktopDropdown(item.key)"
          >
            {{ item.label }}
            <span class="text-xs">{{ desktopDropdownKey === item.key ? '▲' : '▼' }}</span>
          </button>

          <div
            v-if="visibleChildren(item).length && desktopDropdownKey === item.key"
            class="absolute left-0 top-full mt-2 min-w-64 rounded-xl border border-white/12 bg-[#0b2a25] p-2 shadow-xl"
          >
            <template v-for="child in visibleChildren(item)" :key="`desktop-child-${item.key}-${child.label}`">
              <RouterLink
                v-if="child.to"
                :to="child.to"
                class="block rounded-lg px-3 py-2 text-sm text-emerald-100/90 transition hover:bg-emerald-500/20 hover:text-white"
                @click="onMenuItemClick(child)"
              >
                {{ child.label }}
              </RouterLink>
              <button
                v-else
                type="button"
                class="block w-full rounded-lg px-3 py-2 text-left text-sm text-emerald-100/90 transition hover:bg-emerald-500/20 hover:text-white"
                @click="onMenuItemClick(child)"
              >
                {{ child.label }}
              </button>
            </template>
          </div>
        </li>
      </ul>

      <transition name="fade">
        <div v-if="mobileMenuOpen" class="mt-3 space-y-2 md:hidden">
          <template v-for="item in navItems" :key="`mobile-${item.key}`">
            <RouterLink
              v-if="item.to"
              :to="item.to"
              class="block rounded-xl border border-white/12 bg-black/20 px-4 py-3 text-sm font-medium text-emerald-50/90"
              @click="onMenuItemClick(item)"
            >
              {{ item.label }}
            </RouterLink>

            <details v-else class="rounded-xl border border-white/12 bg-black/20 p-3">
              <summary class="cursor-pointer list-none text-sm font-semibold text-emerald-50">
                {{ item.label }}
              </summary>
              <div class="mt-2 space-y-1">
                <template v-for="child in visibleChildren(item)" :key="`mobile-child-${item.key}-${child.label}`">
                  <RouterLink
                    v-if="child.to"
                    :to="child.to"
                    class="block rounded-lg px-3 py-2 text-sm text-emerald-100/90 transition hover:bg-emerald-500/20 hover:text-white"
                    @click="onMenuItemClick(child)"
                  >
                    {{ child.label }}
                  </RouterLink>
                  <button
                    v-else
                    type="button"
                    class="block w-full rounded-lg px-3 py-2 text-left text-sm text-emerald-100/90 transition hover:bg-emerald-500/20 hover:text-white"
                    @click="onMenuItemClick(child)"
                  >
                    {{ child.label }}
                  </button>
                </template>
              </div>
            </details>
          </template>
        </div>
      </transition>
    </nav>
  </header>
</template>
