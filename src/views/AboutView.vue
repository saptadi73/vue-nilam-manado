<script setup>
import SectionHeader from '@/components/SectionHeader.vue'
</script>

<template>
  <section class="space-y-6">
    <SectionHeader
      eyebrow="2. Tentang Kita"
      title="Artikel Existing"
      description="Ringkasan singkat mengenai platform ERP budidaya nilam dan ruang lingkup modulnya."
    />

    <article class="rounded-2xl border border-white/10 bg-black/20 p-5">
      <h3 class="text-lg font-semibold text-white">Apa itu Portal Ekosistem Nilam?</h3>
      <p class="mt-3 text-sm leading-6 text-emerald-100/85">
        Portal ini membantu tim operasional mencatat aktivitas budidaya nilam secara terstruktur mulai dari master data,
        proses produksi, biaya operasional, hingga analitik performa. Seluruh modul terhubung dengan backend Real API
        sehingga data yang ditampilkan konsisten antar halaman.
      </p>
    </article>

    <div class="grid gap-4 md:grid-cols-3">
      <article class="rounded-2xl border border-white/10 bg-white/5 p-4">
        <p class="text-xs uppercase tracking-[0.15em] text-emerald-100/65">Visi</p>
        <p class="mt-2 text-sm text-emerald-50/90">Digitalisasi alur budidaya nilam dari hulu hingga hilir.</p>
      </article>
      <article class="rounded-2xl border border-white/10 bg-white/5 p-4">
        <p class="text-xs uppercase tracking-[0.15em] text-emerald-100/65">Misi</p>
        <p class="mt-2 text-sm text-emerald-50/90">Menyediakan data operasional yang akurat, cepat, dan mudah dipantau.</p>
      </article>
      <article class="rounded-2xl border border-white/10 bg-white/5 p-4">
        <p class="text-xs uppercase tracking-[0.15em] text-emerald-100/65">Fokus</p>
        <p class="mt-2 text-sm text-emerald-50/90">Produktivitas petani, efisiensi biaya, dan kualitas keputusan berbasis data.</p>
      </article>
    </div>
  </section>
</template>
