<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from '@/composables/useToast'
import { realErpService } from '@/services/realErpService'

const router = useRouter()
const toast = useToast()
const name = ref('')
const email = ref('')
const password = ref('')
const role = ref('USER')
const loading = ref(false)
const error = ref('')
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const fieldErrors = computed(() => ({
  name: name.value.trim().length < 3 ? 'Nama minimal 3 karakter.' : '',
  email: !emailPattern.test(email.value.trim()) ? 'Format email belum valid.' : '',
  password: password.value.length < 8 ? 'Password minimal 8 karakter.' : '',
}))

const hasErrors = computed(() => Object.values(fieldErrors.value).some(Boolean))

const submitRegister = async () => {
  if (hasErrors.value) {
    error.value = Object.values(fieldErrors.value).find(Boolean)
    return
  }

  loading.value = true
  error.value = ''
  try {
    await realErpService.register({
      name: name.value.trim(),
      email: email.value.trim(),
      password: password.value,
      role: role.value,
    })
    toast.success('User berhasil diregistrasikan.')
    router.push('/real/dashboard')
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Registrasi user gagal.'
    toast.error(error.value)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <section class="mx-auto max-w-2xl py-6">
    <article class="rounded-4xl border border-white/10 bg-black/25 p-5 sm:p-8">
      <div class="mb-6">
        <p class="text-xs uppercase tracking-[0.16em] text-emerald-100/70">Manajemen User</p>
        <h2 class="mt-2 text-2xl font-bold text-white">Registrasi User Baru</h2>
        <p class="mt-2 text-sm text-emerald-100/80">Halaman ini hanya dapat diakses oleh ADMIN.</p>
      </div>

      <form class="space-y-4" @submit.prevent="submitRegister">
        <div v-if="error" class="rounded-xl border border-red-300/40 bg-red-500/10 px-4 py-3 text-sm text-red-100">{{ error }}</div>
        <label class="block space-y-1 text-sm text-emerald-100/85">
          <span>Nama Lengkap</span>
          <input v-model="name" class="field w-full" type="text" placeholder="Nama user" required />
          <p v-if="fieldErrors.name" class="field-error">{{ fieldErrors.name }}</p>
        </label>
        <label class="block space-y-1 text-sm text-emerald-100/85">
          <span>Email</span>
          <input v-model="email" class="field w-full" type="email" placeholder="user@nilam.local" required />
          <p v-if="fieldErrors.email" class="field-error">{{ fieldErrors.email }}</p>
        </label>
        <label class="block space-y-1 text-sm text-emerald-100/85">
          <span>Password</span>
          <input v-model="password" class="field w-full" type="password" placeholder="Minimal 8 karakter" required />
          <p v-if="fieldErrors.password" class="field-error">{{ fieldErrors.password }}</p>
        </label>
        <label class="block space-y-1 text-sm text-emerald-100/85">
          <span>Role</span>
          <select v-model="role" class="field w-full" required>
            <option value="ADMIN">ADMIN — seluruh akses + registrasi user</option>
            <option value="OFFICER">OFFICER — master data, produksi, pembiayaan</option>
            <option value="USER">USER — input produksi dan pembiayaan</option>
          </select>
        </label>
        <div class="flex flex-col gap-3 pt-2 sm:flex-row">
          <button type="submit" class="btn-primary flex-1" :disabled="loading || hasErrors">{{ loading ? 'Menyimpan...' : 'Registrasikan User' }}</button>
          <button type="button" class="btn-muted flex-1" @click="router.push('/real/dashboard')">Batal</button>
        </div>
      </form>
    </article>
  </section>
</template>
