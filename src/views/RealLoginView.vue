<script setup>
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from '@/composables/useToast'
import { useAuthSession } from '@/services/authSession'
import { realErpService } from '@/services/realErpService'

const router = useRouter()
const route = useRoute()
const toast = useToast()
const { setAccessToken, setUserEmail, setUserId, setUserRole, setUserName } = useAuthSession()

const email = ref('')
const password = ref('')
const showPassword = ref(false)
const loading = ref(false)
const error = ref('')

const authTitle = 'Masuk ke Portal Real API'
const authDescription = 'Masukkan email dan password akun yang sudah terdaftar untuk mengakses sistem.'

const trimmedEmail = computed(() => email.value.trim())
const trimmedPassword = computed(() => password.value.trim())
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const fieldErrors = computed(() => {
  const nextErrors = {
    email: '',
    password: '',
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
    setUserRole(auth?.user?.role ?? auth?.role ?? '')
    setUserName(auth?.user?.name ?? '')
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

</script>

<template>
  <section class="mx-auto flex max-w-lg items-center py-4 sm:min-h-[70vh]">
    <article class="w-full rounded-4xl border border-white/10 bg-black/25 p-5 sm:p-7">
        <div class="space-y-5">
          <div>
            <p class="text-xs uppercase tracking-[0.16em] text-emerald-100/70">Autentikasi</p>
            <h3 class="mt-2 text-2xl font-bold text-white">{{ authTitle }}</h3>
            <p class="mt-2 text-sm text-emerald-100/80">{{ authDescription }}</p>
          </div>

          <form class="space-y-4" @submit.prevent="submitLogin">
            <div v-if="error" class="rounded-xl border border-red-300/40 bg-red-500/10 px-4 py-3 text-sm text-red-100">
              {{ error }}
            </div>

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
              <span v-else>Login Real API</span>
            </button>
          </form>
        </div>
    </article>
  </section>
</template>
