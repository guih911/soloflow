<template>
  <div class="my-processes">
    <!-- Modern Page Header -->
    <div class="page-header">
      <div class="header-content">
        <div class="header-icon">
          <v-icon size="28" color="white">mdi-folder-account</v-icon>
        </div>
        <div class="header-text">
          <h1 class="page-title">Meus Processos</h1>
          <p class="page-subtitle">Processos que você criou ou participa</p>
        </div>
      </div>
      <v-btn
        variant="flat"
        color="white"
        @click="loadData"
        :loading="loading"
        class="action-btn"
      >
        <v-icon start>mdi-refresh</v-icon>
        Atualizar
      </v-btn>
    </div>

    <!-- Filters -->
    <div class="filters-card">
      <div>
         <div class="filters-header">
        <v-icon size="20" class="mr-2">mdi-filter-variant</v-icon>
        <span class="filters-title">Filtros</span>
      </div>
      </div>
      <div class="filters-grid">
        <v-text-field
          v-model="filters.search"
          placeholder="Buscar processos..."
          prepend-inner-icon="mdi-magnify"
          variant="outlined"
          density="compact"
          hide-details
          clearable
          class="filter-input"
        />
        <v-select
          v-model="filters.status"
          :items="statusOptions"
          placeholder="Status"
          variant="outlined"
          density="compact"
          hide-details
          clearable
          class="filter-input"
        />
        <v-select
          v-model="filters.role"
          :items="roleOptions"
          placeholder="Meu papel"
          variant="outlined"
          density="compact"
          hide-details
          clearable
          class="filter-input"
        />
      </div>
      <div class="filters-toggle">
        <v-switch
          v-model="filters.onlyPending"
          label="Mostrar apenas processos com ação pendente"
          color="primary"
          hide-details
          density="compact"
        />
      </div>
    </div>

    <!-- Processes Table -->
    <div class="table-card">
      <v-data-table
        :headers="headers"
        :items="tableItems"
        :loading="loading"
        item-key="id"
        :items-per-page="10"
        density="comfortable"
        :no-data-text="filtersActive ? 'Nenhum processo encontrado com os filtros selecionados.' : 'Nenhum processo disponível.'"
        class="modern-table"
      >
        <!-- Process Title -->
        <template #item.title="{ value }">
          <span class="process-title">{{ value }}</span>
        </template>

        <!-- Status -->
        <template #item.status="{ value }">
          <v-chip
            size="small"
            :color="getStatusColor(value)"
            variant="flat"
          >
            <v-icon start size="14">{{ getStatusIcon(value) }}</v-icon>
            {{ getStatusLabel(value) }}
          </v-chip>
        </template>

        <!-- Involvement -->
        <template #item.involvement="{ value }">
          <div class="involvement-badges">
            <v-chip
              v-for="role in value"
              :key="role"
              size="x-small"
              color="primary"
              variant="tonal"
            >
              {{ role }}
            </v-chip>
          </div>
        </template>

        <!-- Pending Tasks -->
        <template #item.pendingTasks="{ value }">
          <div v-if="value.length > 0" class="pending-tasks">
            <v-chip
              v-for="task in value.slice(0, 2)"
              :key="task.id"
              size="x-small"
              :color="task.requiresSignature ? 'error' : 'warning'"
              variant="tonal"
            >
              <v-icon start size="12">{{ task.requiresSignature ? 'mdi-draw-pen' : 'mdi-play' }}</v-icon>
              {{ task.name }}
            </v-chip>
            <v-chip
              v-if="value.length > 2"
              size="x-small"
              color="grey"
              variant="tonal"
            >
              +{{ value.length - 2 }}
            </v-chip>
          </div>
          <span v-else class="no-pending">Nenhuma ação</span>
        </template>

        <!-- Dates -->
        <template #item.createdAt="{ value }">
          <span class="date-cell">{{ formatDate(value) }}</span>
        </template>

        <template #item.lastActivityAt="{ value }">
          <span class="date-cell">{{ formatDate(value) }}</span>
        </template>

        <!-- Actions -->
        <template #item.actions="{ item }">
          <v-btn
            size="small"
            variant="tonal"
            color="primary"
            @click="viewProcess(item)"
          >
            <v-icon start size="16">mdi-eye</v-icon>
            Ver
          </v-btn>
        </template>

        <!-- Loading - Skeleton -->
        <template #loading>
          <div class="table-loading" aria-label="Carregando processos">
            <v-skeleton-loader
              type="table-row@5"
              class="skeleton-table"
            />
          </div>
        </template>
      </v-data-table>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import dayjs from 'dayjs'
import 'dayjs/locale/pt-br'

import { useAuthStore } from '@/stores/auth'
import { useProcessStore } from '@/stores/processes'

dayjs.locale('pt-br')

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const processStore = useProcessStore()

// State
const loading = ref(false)
const processes = ref([])

const filters = ref({
  search: '',
  status: route.query.status || null,
  role: null,
  onlyPending: false,
})

// Options
const statusOptions = [
  { title: 'Em andamento', value: 'IN_PROGRESS' },
  { title: 'Concluído', value: 'COMPLETED' },
  { title: 'Rejeitado', value: 'REJECTED' },
  { title: 'Cancelado', value: 'CANCELLED' },
]

const roleOptions = [
  { title: 'Criados por mim', value: 'Criador' },
  { title: 'Participando', value: 'Executor' },
]

const headers = [
  { title: 'Processo', key: 'title', width: '350px', align: 'start' },
  { title: 'Status', key: 'status', width: '140px', align: 'center' },
  { title: 'Meu Papel', key: 'involvement', width: '140px', align: 'center', sortable: false },
  { title: 'Ações Pendentes', key: 'pendingTasks', width: '200px', align: 'start', sortable: false },
  { title: 'Iniciado', key: 'createdAt', width: '130px', align: 'center' },
  { title: 'Última Atividade', key: 'lastActivityAt', width: '130px', align: 'center' },
  { title: '', key: 'actions', width: '100px', align: 'center', sortable: false },
]

// Computed
const filtersActive = computed(() => {
  const f = filters.value
  return !!(f.search || f.status || f.role || f.onlyPending)
})

const tableItems = computed(() => {
  return processes.value.filter(proc => {
    if (filters.value.status && proc.status !== filters.value.status) return false
    if (filters.value.role && !proc.involvement.includes(filters.value.role)) return false
    if (filters.value.onlyPending && proc.pendingTasks.length === 0) return false

    if (filters.value.search) {
      const term = filters.value.search.toLowerCase()
      const haystack = [
        proc.code,
        proc.title,
        proc.processType,
        proc.createdBy,
        ...proc.involvement,
        ...proc.pendingTasks.map(t => t.name),
      ].filter(Boolean).join(' ').toLowerCase()

      if (!haystack.includes(term)) return false
    }

    return true
  })
})

// Methods
function formatDate(date) {
  return date ? dayjs(date).format('DD/MM/YY HH:mm') : '-'
}

function getStatusColor(status) {
  return {
    IN_PROGRESS: 'info',
    COMPLETED: 'success',
    REJECTED: 'error',
    CANCELLED: 'grey',
  }[status] || 'info'
}

function getStatusIcon(status) {
  return {
    IN_PROGRESS: 'mdi-play-circle-outline',
    COMPLETED: 'mdi-check-circle-outline',
    REJECTED: 'mdi-close-circle-outline',
    CANCELLED: 'mdi-cancel',
  }[status] || 'mdi-help-circle-outline'
}

function getStatusLabel(status) {
  return {
    IN_PROGRESS: 'Em andamento',
    COMPLETED: 'Concluído',
    REJECTED: 'Rejeitado',
    CANCELLED: 'Cancelado',
  }[status] || status
}

function viewProcess(proc) {
  router.push({ name: 'DetalhesDoProcesso', params: { id: proc.id } })
}

function normalizeProcesses() {
  const map = new Map()

  const ensureEntry = process => {
    if (!process || !process.id) return null
    if (!map.has(process.id)) {
      const processTypeName =
        process.processType?.name ||
        process.processTypeVersion?.processType?.name ||
        'Processo'

      const processCode = process.code || '-'
      const userTitle = process.title || processTypeName
      const processTitle = `${processCode} - ${userTitle}`

      map.set(process.id, {
        id: process.id,
        code: processCode,
        title: processTitle,
        processType: processTypeName,
        status: process.status || 'IN_PROGRESS',
        createdBy: process.createdBy?.name || 'Não informado',
        createdAt: process.createdAt || null,
        lastActivityAt: process.updatedAt || process.completedAt || process.createdAt || null,
        involvement: new Set(),
        pendingTasks: [],
      })
    }
    return map.get(process.id)
  }

  ;(processStore.myCreatedProcesses || []).forEach(process => {
    const entry = ensureEntry(process)
    if (!entry) return
    entry.involvement.add('Criador')
  })

  ;(processStore.myTasks || []).forEach(task => {
    const process = task.processInstance
    const entry = ensureEntry(process)
    if (!entry) return
    entry.involvement.add('Executor')

    entry.pendingTasks.push({
      id: task.id,
      name: task.step?.name || 'Etapa',
      requiresSignature: task.step?.requiresSignature || false,
    })

    const taskDate = task.updatedAt || task.createdAt
    if (taskDate && (!entry.lastActivityAt || dayjs(taskDate).isAfter(entry.lastActivityAt))) {
      entry.lastActivityAt = taskDate
    }
  })

  processes.value = Array.from(map.values()).map(entry => ({
    ...entry,
    involvement: Array.from(entry.involvement),
  })).sort((a, b) =>
    dayjs(b.lastActivityAt || b.createdAt).valueOf() - dayjs(a.lastActivityAt || a.createdAt).valueOf()
  )
}

async function loadData() {
  loading.value = true
  try {
    await Promise.all([
      processStore.fetchMyTasks(),
      processStore.fetchMyCreatedProcesses(),
    ])
  } catch (error) {
    console.error('Erro ao carregar processos do usuário:', error)
  } finally {
    normalizeProcesses()
    loading.value = false
  }
}

// Lifecycle
onMounted(() => {
  loadData()
})

watch(() => authStore.activeCompanyId, companyId => {
  if (companyId) {
    loadData()
  }
})

watch(
  () => [processStore.myTasks, processStore.myCreatedProcesses],
  () => normalizeProcesses(),
  { deep: true }
)
</script>

<style scoped>
.my-processes {
  max-width: 1400px;
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

.filters-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 16px;
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

.filters-toggle {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--color-surface-border);
}

/* Table Card */
.table-card {
  background: var(--color-surface);
  border: 1px solid var(--color-surface-border);
  border-radius: 16px;
  overflow: hidden;
}

.modern-table {
  border: none !important;
}

.modern-table :deep(th) {
  background: var(--color-neutral-50) !important;
  font-size: 0.75rem !important;
  font-weight: 600 !important;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--color-neutral-500) !important;
  border-bottom: 1px solid var(--color-surface-border) !important;
}

.modern-table :deep(td) {
  padding: 16px !important;
  border-bottom: 1px solid var(--color-surface-border) !important;
}

.modern-table :deep(tr:hover td) {
  background: var(--color-neutral-50) !important;
}

.process-title {
  font-weight: 500;
  color: var(--color-neutral-800);
}

.involvement-badges {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  justify-content: center;
}

.pending-tasks {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.no-pending {
  font-size: 0.8125rem;
  color: var(--color-neutral-400);
}

.date-cell {
  font-size: 0.8125rem;
  color: var(--color-neutral-600);
}

.table-loading {
  display: flex;
  justify-content: center;
  padding: 16px;
  width: 100%;
}

.skeleton-table {
  width: 100%;
}

.skeleton-table :deep(.v-skeleton-loader__bone) {
  margin-bottom: 8px;
}

/* Responsive */
@media (max-width: 600px) {
  .page-header {
    flex-direction: column;
  }

  .refresh-btn {
    width: 100%;
  }
}
</style>