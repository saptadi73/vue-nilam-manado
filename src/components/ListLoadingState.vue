<script setup>
defineProps({
  variant: { type: String, default: 'cards' },
  cardCount: { type: Number, default: 6 },
  rowCount: { type: Number, default: 6 },
  columnCount: { type: Number, default: 6 },
})
</script>

<template>
  <div class="space-y-4" aria-live="polite" aria-busy="true">
    <div class="rounded-2xl border border-white/10 bg-black/20 p-4 animate-pulse">
      <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div v-for="item in 4" :key="item" class="h-11 rounded-xl bg-white/8" />
      </div>
    </div>

    <template v-if="variant === 'table'">
      <div class="grid gap-4 md:grid-cols-3">
        <div v-for="item in 3" :key="`metric-${item}`" class="rounded-2xl border border-white/10 bg-white/4 p-4 animate-pulse">
          <div class="h-3 w-24 rounded-full bg-white/10" />
          <div class="mt-3 h-7 w-32 rounded-full bg-white/12" />
        </div>
      </div>

      <div class="overflow-hidden rounded-2xl border border-white/10 bg-black/20 p-3 animate-pulse">
        <div class="space-y-3">
          <div class="grid gap-3" :style="{ gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))` }">
            <div v-for="col in columnCount" :key="`head-${col}`" class="h-4 rounded-full bg-white/10" />
          </div>
          <div
            v-for="row in rowCount"
            :key="`row-${row}`"
            class="grid gap-3 border-t border-white/8 pt-3"
            :style="{ gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))` }"
          >
            <div v-for="col in columnCount" :key="`cell-${row}-${col}`" class="h-4 rounded-full bg-white/8" />
          </div>
        </div>
      </div>
    </template>

    <template v-else>
      <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <article
          v-for="card in cardCount"
          :key="`card-${card}`"
          class="overflow-hidden rounded-2xl border border-white/10 bg-linear-to-br from-white/8 to-white/3 p-4 animate-pulse"
        >
          <div class="h-36 rounded-2xl bg-white/10" />
          <div class="mt-4 space-y-3">
            <div class="h-4 w-24 rounded-full bg-white/10" />
            <div class="h-6 w-40 rounded-full bg-white/12" />
            <div class="space-y-2">
              <div class="h-3 w-full rounded-full bg-white/8" />
              <div class="h-3 w-5/6 rounded-full bg-white/8" />
            </div>
            <div class="grid grid-cols-2 gap-2">
              <div v-for="item in 4" :key="`metric-${card}-${item}`" class="h-14 rounded-xl bg-black/20" />
            </div>
            <div class="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <div v-for="item in 6" :key="`action-${card}-${item}`" class="h-10 rounded-xl bg-white/8" />
            </div>
          </div>
        </article>
      </div>
    </template>
  </div>
</template>
