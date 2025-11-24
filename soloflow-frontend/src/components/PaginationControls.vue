<template>
  <div v-if="totalItems > 0" class="pagination-section mt-8">
    <v-card elevation="0" class="pagination-card">
      <v-card-text class="d-flex align-center justify-space-between flex-wrap ga-4 py-4">
        <div class="pagination-info">
          <span class="text-body-2 text-medium-emphasis">
            Mostrando {{ paginationStart }} - {{ paginationEnd }} de {{ totalItems }} {{ itemLabel }}
          </span>
        </div>

        <div class="pagination-controls d-flex align-center ga-3">
          <v-select
            :model-value="itemsPerPage"
            @update:model-value="$emit('update:itemsPerPage', $event)"
            :items="itemsPerPageOptions"
            density="compact"
            variant="outlined"
            hide-details
            class="items-per-page-select"
            label="Por página"
            style="max-width: 130px;"
          />

          <v-pagination
            :model-value="currentPage"
            @update:model-value="$emit('update:currentPage', $event)"
            :length="totalPages"
            :total-visible="5"
            rounded="circle"
            density="comfortable"
            class="pagination-component"
          />
        </div>
      </v-card-text>
    </v-card>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  currentPage: {
    type: Number,
    required: true
  },
  itemsPerPage: {
    type: Number,
    required: true
  },
  totalItems: {
    type: Number,
    required: true
  },
  itemLabel: {
    type: String,
    default: 'itens'
  }
})

defineEmits(['update:currentPage', 'update:itemsPerPage'])

const itemsPerPageOptions = [6, 12, 24, 48]

const totalPages = computed(() => Math.ceil(props.totalItems / props.itemsPerPage))

const paginationStart = computed(() => {
  if (props.totalItems === 0) return 0
  return (props.currentPage - 1) * props.itemsPerPage + 1
})

const paginationEnd = computed(() => {
  const end = props.currentPage * props.itemsPerPage
  return end > props.totalItems ? props.totalItems : end
})
</script>

<style scoped>
.pagination-section {
  margin-top: 2rem;
}

.pagination-card {
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 8px;
}

.pagination-info {
  font-size: 0.875rem;
}

.items-per-page-select :deep(.v-field) {
  font-size: 0.875rem;
}

.pagination-component :deep(.v-pagination__item),
.pagination-component :deep(.v-pagination__prev),
.pagination-component :deep(.v-pagination__next) {
  min-width: 32px;
  height: 32px;
}
</style>
