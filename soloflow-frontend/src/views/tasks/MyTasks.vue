<template>
  <div class="my-tasks">
    <!-- Modern Page Header -->
    <div class="page-header">
      <div class="header-content">
        <div class="header-icon">
          <v-icon size="28" color="white">mdi-clipboard-check-outline</v-icon>
        </div>
        <div class="header-text">
          <h1 class="page-title">Minhas Tarefas</h1>
          <p class="page-subtitle">Tarefas aguardando sua ação</p>
        </div>
      </div>
      <v-btn
        variant="flat"
        color="white"
        @click="refreshTasks"
        :loading="loading"
        class="action-btn"
      >
        <v-icon start>mdi-refresh</v-icon>
        Atualizar
      </v-btn>
    </div>

    <!-- Filters Card -->
    <div class="filters-card">
       <div class="filters-header">
        <v-icon size="20" class="mr-2">mdi-filter-variant</v-icon>
        <span class="filters-title">Filtros</span>
      </div>
      <div class="filters-grid">
        <v-text-field
          v-model="filters.search"
          placeholder="Buscar tarefa..."
          prepend-inner-icon="mdi-magnify"
          variant="outlined"
          density="compact"
          hide-details
          clearable
          class="filter-input"
        />
        <v-select
          v-model="filters.processType"
          :items="processTypes"
          item-title="name"
          item-value="id"
          placeholder="Tipo de Processo"
          variant="outlined"
          density="compact"
          hide-details
          clearable
          class="filter-input"
        />
        <v-select
          v-model="filters.priority"
          :items="priorityOptions"
          placeholder="Prioridade"
          variant="outlined"
          density="compact"
          hide-details
          clearable
          class="filter-input"
        />
      </div>
    </div>

    <!-- Tasks List -->
    <div v-if="!loading && paginatedTasks.length > 0" class="tasks-list" role="list" aria-label="Lista de tarefas pendentes">
      <div
        v-for="task in paginatedTasks"
        :key="task.id"
        class="task-card"
        :class="{ 'task-card--urgent': isUrgent(task) }"
        role="listitem"
        :aria-label="`Tarefa ${task.processInstance.code}: ${task.step.name}`"
        tabindex="0"
        @click="executeTask(task)"
        @keydown.enter="executeTask(task)"
      >
        <div class="task-card__main">
          <div class="task-card__avatar">
            <v-avatar :color="getStepTypeColor(task.step.type)" size="52">
              <v-icon :icon="getStepTypeIcon(task.step.type)" size="26" color="white" />
            </v-avatar>
          </div>

          <div class="task-card__content">
            <div class="task-card__header">
              <h3 class="task-card__title">
                {{ task.processInstance.title || task.processInstance.code }}
              </h3>
              <div class="task-card__badges">
                <v-chip
                  size="small"
                  :color="isUrgent(task) ? 'error' : 'primary'"
                  variant="tonal"
                >
                  {{ task.processInstance.code }}
                </v-chip>
                <v-chip
                  v-if="task.step.requiresSignature"
                  size="small"
                  color="error"
                  variant="flat"
                >
                  <v-icon start size="14">mdi-draw-pen</v-icon>
                  Assinatura
                </v-chip>
              </div>
            </div>

            <div class="task-card__meta">
              <span class="meta-item">
                <v-icon size="16">mdi-file-document-outline</v-icon>
                {{ task.processInstance.processType.name }}
              </span>
              <span class="meta-divider">•</span>
              <span class="meta-item">
                <v-icon size="16">mdi-arrow-right-circle-outline</v-icon>
                {{ task.step.name }}
              </span>
            </div>

            <div class="task-card__footer">
              <span class="meta-item">
                <v-icon size="16">mdi-account-outline</v-icon>
                {{ task.processInstance.createdBy.name }}
              </span>
              <span class="meta-divider">•</span>
              <span class="meta-item">
                <v-icon size="16">mdi-clock-outline</v-icon>
                {{ getTimeAgo(task.createdAt) }}
              </span>
              <span v-if="task.processInstance.description" class="meta-divider">•</span>
              <span v-if="task.processInstance.description" class="meta-item task-description">
                {{ task.processInstance.description }}
              </span>
            </div>
          </div>

          <div class="task-card__action">
            <v-btn
              color="primary"
              variant="flat"
              @click.stop="executeTask(task)"
            >
              <v-icon start>mdi-play</v-icon>
              Executar
            </v-btn>
          </div>
        </div>

        <!-- Step Description -->
        <div v-if="task.step.description" class="task-card__description">
          <v-icon size="16" color="info" class="mr-2">mdi-information-outline</v-icon>
          <span>{{ task.step.description }}</span>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else-if="!loading && filteredTasks.length === 0" class="empty-state-card">
      <div class="empty-state">
        <div class="empty-state__icon">
          <v-icon size="48">mdi-checkbox-marked-circle-outline</v-icon>
        </div>
        <h3 class="empty-state__title">
          {{ hasFilters ? 'Nenhuma tarefa encontrada' : 'Tudo em dia!' }}
        </h3>
        <p class="empty-state__description">
          {{ hasFilters
            ? 'Tente ajustar os filtros para encontrar outras tarefas.'
            : 'Você não tem tarefas pendentes no momento. Aproveite!'
          }}
        </p>
        <v-btn
          v-if="hasFilters"
          variant="outlined"
          color="primary"
          @click="clearFilters"
        >
          Limpar Filtros
        </v-btn>
      </div>
    </div>

    <!-- Loading State - Skeleton -->
    <div v-if="loading" class="loading-state" aria-label="Carregando tarefas">
      <v-skeleton-loader
        type="card@3"
        class="skeleton-tasks"
      />
    </div>

    <!-- Pagination -->
    <PaginationControls
      v-if="filteredTasks.length > 0"
      v-model:current-page="currentPage"
      v-model:items-per-page="itemsPerPage"
      :total-items="filteredTasks.length"
      item-label="tarefas"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useProcessStore } from '@/stores/processes'
import { useProcessTypeStore } from '@/stores/processTypes'
import PaginationControls from '@/components/PaginationControls.vue'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/pt-br'

dayjs.extend(relativeTime)
dayjs.locale('pt-br')

const router = useRouter()
const processStore = useProcessStore()
const processTypeStore = useProcessTypeStore()

// State
const filters = ref({
  search: '',
  processType: null,
  priority: null
})

const currentPage = ref(1)
const itemsPerPage = ref(12)

// Computed
const loading = computed(() => processStore.loading)
const myTasks = computed(() => processStore.myTasks || [])
const processTypes = computed(() => processTypeStore.processTypes || [])

const hasFilters = computed(() =>
  filters.value.search || filters.value.processType || filters.value.priority
)

const filteredTasks = computed(() => {
  let tasks = myTasks.value

  if (filters.value.search) {
    const search = filters.value.search.toLowerCase()
    tasks = tasks.filter(t =>
      t.processInstance.code.toLowerCase().includes(search) ||
      t.processInstance.title?.toLowerCase().includes(search) ||
      t.step.name.toLowerCase().includes(search)
    )
  }

  if (filters.value.processType) {
    tasks = tasks.filter(t =>
      t.processInstance.processType.id === filters.value.processType
    )
  }

  if (filters.value.priority) {
    tasks = tasks.filter(t => {
      const daysOpen = dayjs().diff(dayjs(t.createdAt), 'day')
      switch (filters.value.priority) {
        case 'urgent': return daysOpen > 3
        case 'high': return daysOpen > 1 && daysOpen <= 3
        case 'normal': return daysOpen <= 1
        default: return true
      }
    })
  }

  return tasks.sort((a, b) =>
    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  )
})

const paginatedTasks = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value
  const end = start + itemsPerPage.value
  return filteredTasks.value.slice(start, end)
})

// Options
const priorityOptions = [
  { title: 'Urgente (> 3 dias)', value: 'urgent' },
  { title: 'Alta (2-3 dias)', value: 'high' },
  { title: 'Normal (< 2 dias)', value: 'normal' }
]

// Methods
function getStepTypeColor(type) {
  const colors = {
    INPUT: 'info',
    APPROVAL: 'warning',
    UPLOAD: 'secondary',
    REVIEW: 'info',
    SIGNATURE: 'error'
  }
  return colors[type] || 'grey'
}

function getStepTypeIcon(type) {
  const icons = {
    INPUT: 'mdi-form-textbox',
    APPROVAL: 'mdi-check-decagram',
    UPLOAD: 'mdi-upload',
    REVIEW: 'mdi-eye-check',
    SIGNATURE: 'mdi-draw-pen'
  }
  return icons[type] || 'mdi-help-circle'
}

function getTimeAgo(date) {
  return dayjs(date).fromNow()
}

function isUrgent(task) {
  return dayjs().diff(dayjs(task.createdAt), 'day') > 3
}

function clearFilters() {
  filters.value = {
    search: '',
    processType: null,
    priority: null
  }
}

async function refreshTasks() {
  await Promise.all([
    processStore.fetchMyTasks(),
    processTypeStore.fetchProcessTypes()
  ])
}

function executeTask(task) {
  router.push(`/processos/${task.processInstance.id}`)
}

// Watchers
watch(filters, () => {
  currentPage.value = 1
}, { deep: true })

watch(itemsPerPage, () => {
  currentPage.value = 1
})

// Lifecycle
onMounted(() => {
  refreshTasks()
})
</script>

<style scoped>
.my-tasks {
  max-width: 1200px;
  margin: 0 auto;
}

/* Modern Page Header with Gradient */
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24px 28px;
  background: linear-gradient(135deg, var(--color-primary-500), var(--color-primary-600));
  border-radius: 16px;
  margin-bottom: 24px;
  box-shadow: 0 4px 20px rgba(59, 130, 246, 0.25);
}

.header-content {
  display: flex;
  align-items: center;
  gap: 16px;
}

.header-icon {
  width: 56px;
  height: 56px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
}

.header-text {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.page-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: white !important;
  margin: 0;
  letter-spacing: -0.01em;
}

.page-subtitle {
  font-size: 0.9375rem;
  color: rgba(255, 255, 255, 0.75) !important;
  margin: 0;
}

.action-btn {
  text-transform: none;
  font-weight: 500;
  border-radius: 10px;
  color: var(--color-primary-600) !important;
}

/* Filters */
.filters-card {
  background: var(--color-surface);
  border: 1px solid var(--color-surface-border);
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 24px;
}

.filters-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 16px;
}

.filters-header {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
  color: var(--color-neutral-600);
}

.filters-title {
  font-size: 0.875rem;
  font-weight: 600;
}

@media (max-width: 900px) {
  .filters-grid {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 600px) {
  .filters-grid {
    grid-template-columns: 1fr;
  }
}

.filter-input :deep(.v-field) {
  border-radius: 10px;
}

/* Tasks List */
.tasks-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* Task Card */
.task-card {
  background: var(--color-surface);
  border: 1px solid var(--color-surface-border);
  border-radius: 16px;
  overflow: hidden;
  transition: all 0.2s ease;
  cursor: pointer;
}

.task-card:hover {
  border-color: var(--color-primary-200);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
  transform: translateY(-2px);
}

.task-card--urgent {
  border-left: 4px solid var(--color-warning-500);
}

.task-card__main {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 20px 24px;
}

.task-card__avatar {
  flex-shrink: 0;
}

.task-card__content {
  flex: 1;
  min-width: 0;
}

.task-card__header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
  flex-wrap: wrap;
}

.task-card__title {
  font-size: 1.0625rem;
  font-weight: 600;
  color: var(--color-neutral-800);
  margin: 0;
}

.task-card__badges {
  display: flex;
  gap: 8px;
}

.task-card__meta,
.task-card__footer {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  font-size: 0.8125rem;
  color: var(--color-neutral-500);
  margin-bottom: 6px;
}

.task-card__footer {
  margin-bottom: 0;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.meta-divider {
  color: var(--color-neutral-300);
}

.task-description {
  max-width: 300px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.task-card__action {
  flex-shrink: 0;
}

.task-card__description {
  display: flex;
  align-items: flex-start;
  padding: 12px 24px;
  background: var(--color-info-50);
  font-size: 0.8125rem;
  color: var(--color-neutral-600);
  border-top: 1px solid var(--color-surface-border);
}

/* Empty State */
.empty-state-card {
  background: var(--color-surface);
  border: 1px solid var(--color-surface-border);
  border-radius: 16px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 64px 24px;
  text-align: center;
}

.empty-state__icon {
  width: 96px;
  height: 96px;
  border-radius: 50%;
  background: var(--color-neutral-100);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-neutral-400);
  margin-bottom: 24px;
}

.empty-state__title {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-neutral-700);
  margin: 0 0 8px 0;
}

.empty-state__description {
  font-size: 0.9375rem;
  color: var(--color-neutral-500);
  margin: 0 0 24px 0;
  max-width: 360px;
}

/* Loading State - Skeleton */
.loading-state {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.skeleton-tasks {
  width: 100%;
  background: transparent;
}

.skeleton-tasks :deep(.v-skeleton-loader__bone) {
  border-radius: 16px;
  margin-bottom: 12px;
}

/* Focus state for keyboard navigation */
.task-card:focus {
  outline: 2px solid var(--color-primary-300);
  outline-offset: 2px;
}

.task-card:focus-visible {
  border-color: var(--color-primary-300);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
}

/* Responsive */
@media (max-width: 768px) {
  .task-card__main {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }

  .task-card__action {
    width: 100%;
  }

  .task-card__action .v-btn {
    width: 100%;
  }
}

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
    padding: 20px;
  }

  .header-content {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .action-btn {
    width: 100%;
  }
}
</style>