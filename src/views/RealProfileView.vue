<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import SectionHeader from '@/components/SectionHeader.vue'
import { useToast } from '@/composables/useToast'
import { useAuthSession } from '@/services/authSession'

const router = useRouter()
const toast = useToast()
const { token, userEmail, userId, isAuthenticated, clearAccessToken } = useAuthSession()

const maskedToken = computed(() => {
  const value = token.value ?? ''
  if (!value) return '-'
  if (value.length <= 16) return value
  return `${value.slice(0, 8)}...${value.slice(-8)}`
})

const logout = () => {
  clearAccessToken()
  toast.info('Sesi real API diakhiri.')
  router.push('/real/login')
}
</script>

<template>
  <section class="mx-auto max-w-3xl space-y-6">
    <SectionHeader
      eyebrow="Real API"
      title="Profil Sesi"
      description="Ringkasan status login aktif dan identitas akun yang digunakan untuk modul real backend."
    />

    <article class="rounded-2xl border border-white/10 bg-black/20 p-4 sm:p-5">
      <div class="grid gap-3 sm:grid-cols-2">
        <div class="rounded-xl border border-white/10 bg-black/20 px-4 py-3">
          <p class="text-xs uppercase tracking-[0.16em] text-emerald-100/65">Status</p>
          <p class="mt-1 text-sm font-semibold text-white">{{ isAuthenticated ? 'Authenticated' : 'Not Authenticated' }}</p>
        </div>

        <div class="rounded-xl border border-white/10 bg-black/20 px-4 py-3">
          <p class="text-xs uppercase tracking-[0.16em] text-emerald-100/65">Email</p>
          <p class="mt-1 text-sm font-semibold text-white">{{ userEmail || '-' }}</p>
        </div>

        <div class="rounded-xl border border-white/10 bg-black/20 px-4 py-3">
          <p class="text-xs uppercase tracking-[0.16em] text-emerald-100/65">ID User Login</p>
          <p class="mt-1 text-sm font-semibold text-white">{{ userId || '-' }}</p>
        </div>

        <div class="rounded-xl border border-white/10 bg-black/20 px-4 py-3 sm:col-span-2">
          <p class="text-xs uppercase tracking-[0.16em] text-emerald-100/65">Bearer Token</p>
          <p class="mt-1 break-all font-mono text-xs text-emerald-50/90">{{ maskedToken }}</p>
        </div>
      </div>

      <div class="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <button type="button" class="btn-primary w-full sm:w-auto" @click="router.push('/real/petani')">Buka Master Petani</button>
        <button type="button" class="btn-muted w-full sm:w-auto" @click="router.push('/real/wilayah')">Buka Master Wilayah</button>
        <button type="button" class="btn-muted w-full sm:w-auto" @click="logout">Logout</button>
      </div>
    </article>
  </section>
</template>
