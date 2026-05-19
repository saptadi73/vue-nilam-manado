<script setup>
import SectionHeader from '@/components/SectionHeader.vue'
import ActionButton from '@/components/ActionButton.vue'
</script>

<template>
  <section class="space-y-6">
    <SectionHeader
      eyebrow="1. Home"
      title="Artikel Existing"
      description="Halaman pembuka portal ERP Nilam dengan akses cepat ke modul utama operasional."
    />

    <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <article class="rounded-2xl border border-emerald-300/20 bg-emerald-500/10 p-5">
        <p class="text-xs uppercase tracking-[0.16em] text-emerald-100/70">Master Data</p>
        <h3 class="mt-2 text-lg font-semibold text-white">Kelola Entitas Utama</h3>
        <p class="mt-2 text-sm text-emerald-100/85">Petani, lahan, dan mitra kini tersedia dalam modul list + form CRUD terpisah.</p>
        <div class="mt-4">
          <RouterLink to="/real/petani">
            <ActionButton full-width>Lihat Master Data</ActionButton>
          </RouterLink>
        </div>
      </article>

      <article class="rounded-2xl border border-cyan-300/20 bg-cyan-500/10 p-5">
        <p class="text-xs uppercase tracking-[0.16em] text-cyan-100/70">Produksi</p>
        <h3 class="mt-2 text-lg font-semibold text-white">Pantau Produksi Tanam & Minyak</h3>
        <p class="mt-2 text-sm text-cyan-100/85">Pantau progres batch produksi secara periodik dan update data dari lapangan.</p>
        <div class="mt-4">
          <RouterLink to="/real/produksi-tanam">
            <ActionButton full-width>Masuk Modul Produksi</ActionButton>
          </RouterLink>
        </div>
      </article>

      <article class="rounded-2xl border border-amber-300/20 bg-amber-500/10 p-5 md:col-span-2 xl:col-span-1">
        <p class="text-xs uppercase tracking-[0.16em] text-amber-100/70">Analitik</p>
        <h3 class="mt-2 text-lg font-semibold text-white">Dashboard Real API</h3>
        <p class="mt-2 text-sm text-amber-100/85">Visualisasi penjualan, expense, dan net profit untuk mendukung keputusan operasional.</p>
        <div class="mt-4">
          <RouterLink to="/real/dashboard">
            <ActionButton full-width>Lihat Dashboard</ActionButton>
          </RouterLink>
        </div>
      </article>
    </div>
  </section>
</template>
