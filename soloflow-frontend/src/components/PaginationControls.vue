<template>
  <div v-if="totalItems > 0" class="pagination-section">
    <div class="pagination-wrapper">
      <div class="pagination-info">
        <span class="info-text">
          Mostrando <strong>{{ paginationStart }}</strong> - <strong>{{ paginationEnd }}</strong> de <strong>{{ totalItems }}</strong> {{ itemLabel }}
        </span>
      </div>

      <div class="pagination-controls">
        <v-select
          :model-value="itemsPerPage"
          @update:model-value="$emit('update:itemsPerPage', $event)"
          :items="itemsPerPageOptions"
          density="compact"
          variant="outlined"
          hide-details
          class="items-per-page-select"
        >
          <template #prepend-inner>
            <v-icon size="16" color="grey">mdi-format-list-numbered</v-icon>
          </template>
        </v-select>

        <div class="pagination-nav">
          <v-btn
            icon
            variant="text"
            size="small"
            :disabled="currentPage <= 1"
            @click="$emit('update:currentPage', 1)"
            class="nav-btn"
          >
            <v-icon size="18">mdi-chevron-double-left</v-icon>
          </v-btn>

          <v-btn
            icon
            variant="text"
            size="small"
            :disabled="currentPage <= 1"
            @click="$emit('update:currentPage', currentPage - 1)"
            class="nav-btn"
          >
            <v-icon size="18">mdi-chevron-left</v-icon>
          </v-btn>

          <div class="page-numbers">
            <button
              v-for="page in visiblePages"
              :key="page"
              class="page-btn"
              :class="{ 'page-btn--active': page === currentPage }"
              @click="$emit('update:currentPage', page)"
            >
              {{ page }}
            </button>
          </div>

          <v-btn
            icon
            variant="text"
            size="small"
            :disabled="currentPage >= totalPages"
            @click="$emit('update:currentPage', currentPage + 1)"
            class="nav-btn"
          >
            <v-icon size="18">mdi-chevron-right</v-icon>
          </v-btn>

          <v-btn
            icon
            variant="text"
            size="small"
            :disabled="currentPage >= totalPages"
            @click="$emit('update:currentPage', totalPages)"
            class="nav-btn"
          >
            <v-icon size="18">mdi-chevron-double-right</v-icon>
          </v-btn>
        </div>
      </div>
    </div>
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

const itemsPerPageOptions = [
  { title: '6 por página', value: 6 },
  { title: '12 por página', value: 12 },
  { title: '24 por página', value: 24 },
  { title: '48 por página', value: 48 }
]

const totalPages = computed(() => Math.ceil(props.totalItems / props.itemsPerPage))

const paginationStart = computed(() => {
  if (props.totalItems === 0) return 0
  return (props.currentPage - 1) * props.itemsPerPage + 1
})

const paginationEnd = computed(() => {
  const end = props.currentPage * props.itemsPerPage
  return end > props.totalItems ? props.totalItems : end
})

const visiblePages = computed(() => {
  const pages = []
  const total = totalPages.value
  const current = props.currentPage
  const maxVisible = 5

  if (total <= maxVisible) {
    for (let i = 1; i <= total; i++) {
      pages.push(i)
    }
  } else {
    let start = Math.max(1, current - Math.floor(maxVisible / 2))
    let end = Math.min(total, start + maxVisible - 1)

    if (end - start < maxVisible - 1) {
      start = Math.max(1, end - maxVisible + 1)
    }

    for (let i = start; i <= end; i++) {
      pages.push(i)
    }
  }

  return pages
})
</script>

<style scoped>
.pagination-section {
  margin-top: 24px;
}

.pagination-wrapper {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px 20px;
  background: var(--color-surface);
  border: 1px solid var(--color-surface-border);
  border-radius: 12px;
  flex-wrap: wrap;
}

.pagination-info {
  display: flex;
  align-items: center;
}

.info-text {
  font-size: 0.875rem;
  color: var(--color-neutral-500);
}

.info-text strong {
  color: var(--color-neutral-700);
  font-weight: 600;
}

.pagination-controls {
  display: flex;
  align-items: center;
  gap: 16px;
}

.items-per-page-select {
  max-width: 160px;
}

.items-per-page-select :deep(.v-field) {
  border-radius: 8px;
  font-size: 0.8125rem;
}

.pagination-nav {
  display: flex;
  align-items: center;
  gap: 4px;
}

.nav-btn {
  width: 32px;
  height: 32px;
  border-radius: 8px !important;
}

.nav-btn:hover:not(:disabled) {
  background: var(--color-neutral-100);
}

.page-numbers {
  display: flex;
  align-items: center;
  gap: 4px;
  margin: 0 4px;
}

.page-btn {
  min-width: 32px;
  height: 32px;
  padding: 0 8px;
  border: none;
  background: transparent;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-neutral-600);
  cursor: pointer;
  transition: all 0.2s ease;
}

.page-btn:hover {
  background: var(--color-neutral-100);
  color: var(--color-neutral-800);
}

.page-btn--active {
  background: var(--color-primary-500);
  color: white;
}

.page-btn--active:hover {
  background: var(--color-primary-600);
  color: white;
}

/* Responsive */
@media (max-width: 600px) {
  .pagination-wrapper {
    flex-direction: column;
    gap: 12px;
  }

  .pagination-info {
    width: 100%;
    justify-content: center;
  }

  .pagination-controls {
    width: 100%;
    justify-content: center;
    flex-wrap: wrap;
  }

  .items-per-page-select {
    width: 100%;
    max-width: none;
  }
}
</style>
