<script setup>
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import SectionHeader from '@/components/SectionHeader.vue'
import { useToast } from '@/composables/useToast'
import { useAuthSession } from '@/services/authSession'
import { realErpService } from '@/services/realErpService'

const router = useRouter()
const route = useRoute()
const toast = useToast()
const { isAuthenticated, setAccessToken, setUserEmail, setUserId, clearAccessToken } = useAuthSession()

const authMode = ref('login')
const name = ref('')
const email = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')

const redirectTarget = computed(() => {
  const redirect = route.query.redirect
  if (typeof redirect === 'string' && redirect.startsWith('/')) return redirect
  return '/real/profile'
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
  loading.value = true
  error.value = ''
  try {
    const auth = await realErpService.login(email.value, password.value)
    const token = auth?.access_token ?? ''

    if (!token) {
      throw new Error('Access token tidak ditemukan dari response login.')
    }

    const resolvedUserId = extractUserId(auth, token)

    setAccessToken(token)
    setUserEmail(email.value)
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
  loading.value = true
  error.value = ''

  try {
    await realErpService.register({
      name: name.value.trim(),
      email: email.value.trim(),
      password: password.value,
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
}
</script>

<template>
  <section class="mx-auto max-w-xl space-y-6">
    <SectionHeader
      eyebrow="Real API"
      title="Login ERP"
      description="Masuk untuk mengakses modul real backend seperti master petani dan master wilayah."
    />

    <article class="rounded-2xl border border-white/10 bg-black/20 p-4 sm:p-5">
      <div v-if="isAuthenticated" class="space-y-4">
        <p class="rounded-xl border border-emerald-300/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
          Sesi login real API aktif.
        </p>
        <div class="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <button type="button" class="btn-primary w-full sm:w-auto" @click="router.push('/real/petani')">Buka Master Petani</button>
          <button type="button" class="btn-muted w-full sm:w-auto" @click="logout">Logout</button>
        </div>
      </div>

      <form v-else class="space-y-4" @submit.prevent="submitAuth">
        <div class="grid grid-cols-1 gap-2 rounded-xl border border-white/10 bg-black/20 p-1 sm:grid-cols-2">
          <button
            type="button"
            class="rounded-lg px-3 py-2 text-sm transition"
            :class="authMode === 'login' ? 'bg-emerald-500/30 text-white' : 'text-emerald-100/75 hover:bg-white/8'"
            @click="switchMode('login')"
          >
            Login
          </button>
          <button
            type="button"
            class="rounded-lg px-3 py-2 text-sm transition"
            :class="authMode === 'register' ? 'bg-emerald-500/30 text-white' : 'text-emerald-100/75 hover:bg-white/8'"
            @click="switchMode('register')"
          >
            Register
          </button>
        </div>

        <div v-if="error" class="rounded-xl border border-red-300/40 bg-red-500/10 px-4 py-3 text-sm text-red-100">
          {{ error }}
        </div>

        <label v-if="authMode === 'register'" class="block space-y-1 text-sm text-emerald-100/85">
          <span>Nama</span>
          <input v-model="name" class="field w-full" type="text" placeholder="Admin Nilam" required />
        </label>

        <label class="block space-y-1 text-sm text-emerald-100/85">
          <span>Email</span>
          <input v-model="email" class="field w-full" type="email" placeholder="admin@nilam.local" required />
        </label>

        <label class="block space-y-1 text-sm text-emerald-100/85">
          <span>Password</span>
          <input v-model="password" class="field w-full" type="password" placeholder="password123" required />
        </label>

        <button type="submit" class="btn-primary w-full" :disabled="loading">
          {{ loading ? 'Memproses...' : authMode === 'register' ? 'Register Akun' : 'Login Real API' }}
        </button>
      </form>
    </article>
  </section>
</template>
