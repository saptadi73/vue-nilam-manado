<script setup>
const props = defineProps({
  summary: { type: String, default: '' },
  page: { type: Number, required: true },
  totalPages: { type: Number, required: true },
  pageSize: { type: Number, default: 0 },
  pageSizeOptions: { type: Array, default: () => [] },
  showPageSize: { type: Boolean, default: false },
})

const emit = defineEmits(['prev', 'next', 'update:pageSize'])
</script>

<template>
  <div class="flex flex-col gap-3 rounded-2xl border border-white/10 bg-black/20 p-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
    <p class="text-sm text-emerald-100/85">{{ summary }}</p>

    <div class="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
      <template v-if="showPageSize">
        <label class="text-sm text-emerald-100/85" for="pagination-page-size">Per halaman</label>
        <select
          id="pagination-page-size"
          class="field"
          :value="pageSize"
          @change="emit('update:pageSize', Number($event.target.value))"
        >
          <option v-for="option in pageSizeOptions" :key="option" :value="option">{{ option }}</option>
        </select>
      </template>

      <button type="button" class="btn-muted" :disabled="page <= 1" @click="emit('prev')">Sebelumnya</button>
      <span class="px-2 text-sm text-emerald-100/85">Halaman {{ page }} / {{ totalPages }}</span>
      <button type="button" class="btn-muted" :disabled="page >= totalPages" @click="emit('next')">Berikutnya</button>
    </div>
  </div>
</template>
