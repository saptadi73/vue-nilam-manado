<script setup>
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import SectionHeader from '@/components/SectionHeader.vue'
import { useToast } from '@/composables/useToast'
import { useAuthSession } from '@/services/authSession'
import { realErpService } from '@/services/realErpService'
import erpImage from '@/assets/images/erp.png'

const router = useRouter()
const route = useRoute()
const toast = useToast()
const { isAuthenticated, setAccessToken, setUserEmail, setUserId, clearAccessToken } = useAuthSession()

const authMode = ref('login')
const name = ref('')
const email = ref('')
const password = ref('')
const showPassword = ref(false)
const loading = ref(false)
const error = ref('')

const featureItems = [
  {
    title: 'Master Data Terpusat',
    description: 'Kelola petani, lahan, produksi tanam, produksi minyak, dan expense dari satu portal real API.',
  },
  {
    title: 'Dashboard Agregat',
    description: 'Pantau penjualan, expense, dan produktivitas petani dengan chart yang langsung mengambil data backend.',
  },
  {
    title: 'Akses Cepat CRUD',
    description: 'Setelah login, menu utama langsung menampilkan halaman list yang berisi tombol create, edit, detail, dan hapus.',
  },
]

const registerBenefits = [
  'Buat akun baru untuk mulai memakai Real API.',
  'Registrasi tersedia langsung dari halaman awal tanpa pindah route.',
  'Setelah akun dibuat, kamu bisa langsung login dan masuk ke dashboard real.',
]

const authTitle = computed(() => (authMode.value === 'register' ? 'Buat Akun Baru' : 'Masuk ke Portal Real API'))
const authDescription = computed(() =>
  authMode.value === 'register'
    ? 'Lengkapi nama, email, dan password untuk registrasi akun baru.'
    : 'Masukkan email dan password akun yang sudah terdaftar untuk mengakses sistem.',
)
const switchPrompt = computed(() =>
  authMode.value === 'register' ? 'Sudah punya akun?' : 'Belum punya akun?',
)
const switchLabel = computed(() => (authMode.value === 'register' ? 'Kembali ke Login' : 'Buka Register'))

const trimmedName = computed(() => name.value.trim())
const trimmedEmail = computed(() => email.value.trim())
const trimmedPassword = computed(() => password.value.trim())
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const fieldErrors = computed(() => {
  const nextErrors = {
    name: '',
    email: '',
    password: '',
  }

  if (authMode.value === 'register' && !trimmedName.value) {
    nextErrors.name = 'Nama wajib diisi untuk registrasi.'
  } else if (authMode.value === 'register' && trimmedName.value.length < 3) {
    nextErrors.name = 'Nama minimal 3 karakter.'
  }

  if (!trimmedEmail.value) {
    nextErrors.email = 'Email wajib diisi.'
  } else if (!emailPattern.test(trimmedEmail.value)) {
    nextErrors.email = 'Format email belum valid.'
  }

  if (!trimmedPassword.value) {
    nextErrors.password = 'Password wajib diisi.'
  } else if (trimmedPassword.value.length < 8) {
    nextErrors.password = 'Password minimal 8 karakter.'
  }

  return nextErrors
})

const hasValidationErrors = computed(() =>
  Object.values(fieldErrors.value).some(Boolean),
)

const redirectTarget = computed(() => {
  const redirect = route.query.redirect
  if (typeof redirect === 'string' && redirect.startsWith('/')) return redirect
  return '/real/dashboard'
})

const parseJwtPayload = (token) => {
  try {
    const parts = String(token ?? '').split('.')
    if (parts.length < 2) return null
    const normalized = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=')
    const decoded = atob(padded)
    return JSON.parse(decoded)
  } catch {
    return null
  }
}

const extractUserId = (authData, token) => {
  const directId =
    authData?.id_user ??
    authData?.user_id ??
    authData?.id ??
    authData?.user?.id ??
    authData?.user?.id_user ??
    ''

  if (directId) return String(directId)

  const jwtPayload = parseJwtPayload(token)
  if (!jwtPayload || typeof jwtPayload !== 'object') return ''

  return String(jwtPayload.user_id ?? jwtPayload.id_user ?? jwtPayload.sub ?? jwtPayload.uid ?? '')
}

const submitLogin = async () => {
  if (hasValidationErrors.value) {
    error.value = fieldErrors.value.email || fieldErrors.value.password
    return
  }

  loading.value = true
  error.value = ''
  try {
    const auth = await realErpService.login(trimmedEmail.value, trimmedPassword.value)
    const token = auth?.access_token ?? ''

    if (!token) {
      throw new Error('Access token tidak ditemukan dari response login.')
    }

    const resolvedUserId = extractUserId(auth, token)

    setAccessToken(token)
    setUserEmail(trimmedEmail.value)
    setUserId(resolvedUserId)
    toast.success('Login berhasil. Selamat datang di mode Real API.')
    router.push(redirectTarget.value)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Login gagal. Periksa email dan password.'
    error.value = message
    toast.error(message)
  } finally {
    loading.value = false
  }
}

const submitRegister = async () => {
  if (hasValidationErrors.value) {
    error.value = fieldErrors.value.name || fieldErrors.value.email || fieldErrors.value.password
    return
  }

  loading.value = true
  error.value = ''

  try {
    await realErpService.register({
      name: trimmedName.value,
      email: trimmedEmail.value,
      password: trimmedPassword.value,
    })
    toast.success('Registrasi berhasil. Silakan login menggunakan akun baru.')
    authMode.value = 'login'
    password.value = ''
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Registrasi gagal. Silakan coba lagi.'
    error.value = message
    toast.error(message)
  } finally {
    loading.value = false
  }
}

const submitAuth = () => {
  if (authMode.value === 'register') {
    return submitRegister()
  }
  return submitLogin()
}

const logout = () => {
  clearAccessToken()
  toast.info('Sesi real API diakhiri.')
}

const switchMode = (mode) => {
  authMode.value = mode
  error.value = ''
  showPassword.value = false
}
</script>

<template>
  <section class="mx-auto max-w-6xl space-y-6">
    <div class="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <article class="overflow-hidden rounded-4xl border border-white/10 bg-linear-to-br from-emerald-500/20 via-cyan-500/10 to-black/20 p-6 sm:p-7 lg:p-8">
        <div class="max-w-2xl space-y-6">
          <SectionHeader
            eyebrow="Portal Masuk"
            title="ERP Nilam untuk Operasional Real API"
            description="Halaman pertama aplikasi kini difokuskan untuk autentikasi, sehingga pengguna bisa login atau register sebelum masuk ke modul operasional."
          />

          <div class="grid gap-3 sm:grid-cols-3">
            <article
              v-for="item in featureItems"
              :key="item.title"
              class="rounded-2xl border border-white/10 bg-black/20 p-4"
            >
              <p class="text-sm font-semibold text-white">{{ item.title }}</p>
              <p class="mt-2 text-xs leading-relaxed text-emerald-100/80">{{ item.description }}</p>
            </article>
          </div>

          <div class="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
            <div class="rounded-2xl border border-emerald-300/20 bg-emerald-500/10 p-5">
              <p class="text-xs uppercase tracking-[0.18em] text-emerald-100/70">Untuk Pengguna Baru</p>
              <h3 class="mt-2 text-xl font-bold text-white">Register langsung dari halaman ini</h3>
              <ul class="mt-4 space-y-3 text-sm text-emerald-50/85">
                <li v-for="benefit in registerBenefits" :key="benefit" class="flex items-start gap-3">
                  <span class="mt-1 inline-block h-2 w-2 rounded-full bg-emerald-300" />
                  <span>{{ benefit }}</span>
                </li>
              </ul>
              <button type="button" class="btn-primary mt-5 w-full sm:w-auto" @click="switchMode('register')">
                Buka Form Register
              </button>
            </div>

            <div class="rounded-2xl border border-white/10 bg-black/20 p-5">
              <p class="text-xs uppercase tracking-[0.18em] text-emerald-100/70">Akses Setelah Login</p>
              <div class="mt-4 space-y-3 text-sm text-emerald-50/85">
                <div class="rounded-xl bg-white/6 px-4 py-3">1. Dashboard Real API</div>
                <div class="rounded-xl bg-white/6 px-4 py-3">2. List Petani dan Lahan</div>
                <div class="rounded-xl bg-white/6 px-4 py-3">3. List Produksi Tanam dan Minyak</div>
                <div class="rounded-xl bg-white/6 px-4 py-3">4. List Expense dan menu pendukung</div>
              </div>
            </div>
          </div>

          <div class="overflow-hidden rounded-3xl border border-white/10 bg-black/20 p-3">
            <div class="relative overflow-hidden rounded-[1.4rem] bg-linear-to-br from-emerald-500/20 via-cyan-500/10 to-black/20 p-3">
              <div class="absolute inset-0 bg-radial from-white/12 via-transparent to-transparent opacity-70" />
              <img :src="erpImage" alt="ERP Patchouli Illustration" class="relative z-10 h-64 w-full rounded-[1.1rem] object-cover object-center" />
            </div>
          </div>
        </div>
      </article>

      <article class="rounded-4xl border border-white/10 bg-black/25 p-4 sm:p-5 lg:p-6">
        <div v-if="isAuthenticated" class="space-y-4">
          <div class="rounded-2xl border border-emerald-300/30 bg-emerald-500/10 p-5">
            <p class="text-xs uppercase tracking-[0.16em] text-emerald-100/70">Sesi Aktif</p>
            <h3 class="mt-2 text-xl font-bold text-white">Kamu sudah login ke Real API</h3>
            <p class="mt-2 text-sm text-emerald-100/80">Lanjutkan ke dashboard untuk mengelola data operasional, produksi, dan expense.</p>
          </div>

          <div class="grid gap-2 sm:grid-cols-2">
            <button type="button" class="btn-primary w-full" @click="router.push('/real/dashboard')">Buka Dashboard Real</button>
            <button type="button" class="btn-muted w-full" @click="logout">Logout</button>
          </div>
        </div>

        <div v-else class="space-y-5">
          <div>
            <p class="text-xs uppercase tracking-[0.16em] text-emerald-100/70">Autentikasi</p>
            <h3 class="mt-2 text-2xl font-bold text-white">{{ authTitle }}</h3>
            <p class="mt-2 text-sm text-emerald-100/80">{{ authDescription }}</p>
          </div>

          <div class="grid grid-cols-1 gap-2 rounded-2xl border border-white/10 bg-black/20 p-1 sm:grid-cols-2">
            <button
              type="button"
              class="rounded-xl px-3 py-2.5 text-sm transition"
              :class="authMode === 'login' ? 'bg-emerald-500/30 text-white' : 'text-emerald-100/75 hover:bg-white/8'"
              @click="switchMode('login')"
            >
              Login
            </button>
            <button
              type="button"
              class="rounded-xl px-3 py-2.5 text-sm transition"
              :class="authMode === 'register' ? 'bg-emerald-500/30 text-white' : 'text-emerald-100/75 hover:bg-white/8'"
              @click="switchMode('register')"
            >
              Register
            </button>
          </div>

          <div class="rounded-2xl border border-cyan-300/20 bg-cyan-500/10 p-4">
            <p class="text-sm text-cyan-50/90">
              {{ switchPrompt }}
              <button type="button" class="ml-2 font-semibold text-cyan-200 underline underline-offset-4" @click="switchMode(authMode === 'register' ? 'login' : 'register')">
                {{ switchLabel }}
              </button>
            </p>
          </div>

          <form class="space-y-4" @submit.prevent="submitAuth">
            <div v-if="error" class="rounded-xl border border-red-300/40 bg-red-500/10 px-4 py-3 text-sm text-red-100">
              {{ error }}
            </div>

            <label v-if="authMode === 'register'" class="block space-y-1 text-sm text-emerald-100/85">
              <span>Nama Lengkap</span>
              <input v-model="name" class="field w-full" type="text" placeholder="Admin Nilam" required />
              <p v-if="fieldErrors.name" class="field-error">{{ fieldErrors.name }}</p>
            </label>

            <label class="block space-y-1 text-sm text-emerald-100/85">
              <span>Email</span>
              <input v-model="email" class="field w-full" type="email" placeholder="admin@nilam.local" required />
              <p v-if="fieldErrors.email" class="field-error">{{ fieldErrors.email }}</p>
            </label>

            <label class="block space-y-1 text-sm text-emerald-100/85">
              <span>Password</span>
              <div class="relative">
                <input v-model="password" class="field w-full pr-24" :type="showPassword ? 'text' : 'password'" placeholder="password123" required />
                <button
                  type="button"
                  class="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-3 py-1 text-xs font-semibold text-emerald-100/75 transition hover:bg-white/8 hover:text-white"
                  @click="showPassword = !showPassword"
                >
                  {{ showPassword ? 'Sembunyikan' : 'Tampilkan' }}
                </button>
              </div>
              <p v-if="fieldErrors.password" class="field-error">{{ fieldErrors.password }}</p>
            </label>

            <button type="submit" class="btn-primary w-full" :disabled="loading || hasValidationErrors">
              <span v-if="loading" class="inline-flex items-center gap-2">
                <span class="inline-block h-4 w-4 animate-spin rounded-full border-2 border-[#05221d]/30 border-t-[#05221d]" />
                Memproses...
              </span>
              <span v-else>{{ authMode === 'register' ? 'Register Akun' : 'Login Real API' }}</span>
            </button>
          </form>
        </div>
      </article>
    </div>
  </section>
</template>
