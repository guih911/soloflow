<template>
  <div class="manage-processes-page">
    <!-- Modern Header -->
    <div class="page-header">
      <div class="header-content">
        <div class="header-icon">
          <v-icon size="28" color="white">mdi-folder-multiple</v-icon>
        </div>
        <div class="header-text">
          <h1 class="page-title">Gerenciar Processos</h1>
          <p class="page-subtitle">Visualize e acompanhe todos os processos da empresa</p>
        </div>
      </div>
      <v-btn
        variant="flat"
        color="white"
        @click="createProcess"
        prepend-icon="mdi-plus"
        class="action-btn"
      >
        Novo Processo
      </v-btn>
    </div>

    <!-- Loading State - Skeleton -->
    <div v-if="loading && processes.length === 0" class="loading-state" aria-label="Carregando processos">
      <v-skeleton-loader type="table-heading, table-row@5" class="skeleton-table" />
    </div>

    <!-- Tabela de Processos -->
    <v-card v-if="!loading || processes.length > 0" flat class="table-card">
      <v-data-table
        :headers="headers"
        :items="filteredProcesses"
        :loading="loading"
        :search="filters.search"
        class="elevation-0 processes-table"
        items-per-page-text="Itens por página"
        :items-per-page-options="[
          { value: 10, title: '10' },
          { value: 25, title: '25' },
          { value: 50, title: '50' },
          { value: -1, title: 'Todos' }
        ]"
        no-data-text="Nenhum processo encontrado"
        loading-text="Carregando..."
        page-text="{0}-{1} de {2}"
        hover
        @click:row="(event, { item }) => viewProcess(item)"
      >
        <template v-slot:top>
          <v-card-title class="table-header">
            <div class="table-header-left">
              <v-icon icon="mdi-folder-multiple" class="mr-2" aria-hidden="true"></v-icon>
              Lista de Processos
              <v-chip size="small" color="primary" variant="tonal" class="ml-2">
                {{ filteredProcesses.length }}
              </v-chip>
            </div>
            <div class="table-header-right">
              <v-text-field
                v-model="filters.search"
                density="compact"
                placeholder="Buscar..."
                prepend-inner-icon="mdi-magnify"
                variant="outlined"
                hide-details
                single-line
                class="search-field"
                aria-label="Buscar processos"
              ></v-text-field>
              <v-select
                v-model="filters.processTypeId"
                :items="processTypes"
                item-title="name"
                item-value="id"
                label="Tipo"
                variant="outlined"
                density="compact"
                clearable
                hide-details
                class="filter-select"
              />
              <v-select
                v-model="filters.status"
                :items="statusOptions"
                label="Status"
                variant="outlined"
                density="compact"
                clearable
                hide-details
                class="filter-select filter-select--small"
              />
            </div>
          </v-card-title>
        </template>

        <!-- Código -->
        <template v-slot:item.code="{ item }">
          <div class="code-cell">
            <span class="process-code">{{ item.code }}</span>
            <span v-if="item.isChildProcess" class="subprocess-indicator">
              <v-icon size="12">mdi-source-branch</v-icon>
            </span>
          </div>
        </template>

        <!-- Título/Tipo -->
        <template v-slot:item.title="{ item }">
          <div class="title-cell">
            <span class="process-title">{{ item.title || item.processType.name }}</span>
            <span class="process-type-label">{{ item.processType.name }}</span>
          </div>
        </template>

        <!-- Status -->
        <template v-slot:item.status="{ item }">
          <v-chip
            :color="getStatusColor(item.status)"
            size="small"
            variant="flat"
            class="status-chip"
          >
            {{ getStatusText(item.status) }}
          </v-chip>
        </template>

        <!-- Progresso -->
        <template v-slot:item.progress="{ item }">
          <div class="progress-cell">
            <div class="progress-bar-mini">
              <div
                class="progress-fill-mini"
                :class="`fill-${getProgressColor(item)}`"
                :style="{ width: `${getProgress(item)}%` }"
              ></div>
            </div>
            <span class="progress-text">{{ getProgress(item) }}%</span>
          </div>
        </template>

        <!-- Etapa Atual -->
        <template v-slot:item.currentStep="{ item }">
          <div v-if="getCurrentStep(item)" class="step-cell">
            <v-chip
              size="small"
              :color="getStepTypeColor(getCurrentStep(item).step.type)"
              variant="tonal"
            >
              <v-icon start size="14">{{ getStepTypeIcon(getCurrentStep(item).step.type) }}</v-icon>
              {{ truncateText(getCurrentStep(item).step.name, 20) }}
            </v-chip>
          </div>
          <span v-else class="text-grey">-</span>
        </template>

        <!-- Criado por -->
        <template v-slot:item.createdBy="{ item }">
          <span class="creator-text">{{ item.createdBy.name }}</span>
        </template>

        <!-- Data -->
        <template v-slot:item.createdAt="{ item }">
          <span class="date-text">{{ formatDate(item.createdAt) }}</span>
        </template>

        <!-- Ações -->
        <template v-slot:item.actions="{ item }">
          <div class="actions-cell">
            <v-btn
              icon
              size="small"
              variant="text"
              color="primary"
              @click.stop="viewProcess(item)"
            >
              <v-icon size="20">mdi-eye</v-icon>
              <v-tooltip activator="parent" location="top">Visualizar</v-tooltip>
            </v-btn>
          </div>
        </template>
      </v-data-table>
    </v-card>

    <!-- Empty State -->
    <div v-if="!loading && filteredProcesses.length === 0 && processes.length > 0" class="empty-state">
      <v-icon size="48" color="grey-lighten-1">mdi-file-search-outline</v-icon>
      <h3 class="empty-state-title">Nenhum processo encontrado</h3>
      <p class="empty-state-text">Tente ajustar os filtros de busca</p>
      <v-btn
        variant="outlined"
        color="primary"
        @click="filters.search = ''; filters.processTypeId = null; filters.status = null"
      >
        <v-icon start>mdi-filter-remove</v-icon>
        Limpar Filtros
      </v-btn>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useProcessStore } from '@/stores/processes'
import { useProcessTypeStore } from '@/stores/processTypes'
import { useAuthStore } from '@/stores/auth'
import dayjs from 'dayjs'

const router = useRouter()
const route = useRoute()
const processStore = useProcessStore()
const processTypeStore = useProcessTypeStore()
const authStore = useAuthStore()

// Estado
const filters = ref({
  search: route.query.search || '',
  processTypeId: null,
  status: null
})

// Sincronizar query param 'search' com o filtro
watch(() => route.query.search, (newSearch) => {
  if (newSearch !== undefined) {
    filters.value.search = newSearch
  }
})

// Headers da tabela
const headers = [
  { title: 'Código', key: 'code', width: '140px' },
  { title: 'Título / Tipo', key: 'title' },
  { title: 'Status', key: 'status', width: '140px', align: 'center' },
  { title: 'Progresso', key: 'progress', width: '130px', align: 'center', sortable: false },
  { title: 'Etapa Atual', key: 'currentStep', width: '180px', sortable: false },
  { title: 'Criado por', key: 'createdBy', width: '160px' },
  { title: 'Data', key: 'createdAt', width: '110px' },
  { title: 'Ações', key: 'actions', width: '80px', align: 'center', sortable: false }
]

// Computed
const loading = computed(() => processStore.loading)
const processes = computed(() => processStore.processes)
const processTypes = computed(() => {
  // Filtrar apenas tipos que o usuário tem permissão para visualizar
  return processTypeStore.processTypes.filter(pt =>
    authStore.canAccessProcessType(pt.id, 'view')
  )
})

const hasFilters = computed(() => {
  return filters.value.search || filters.value.processTypeId || filters.value.status
})

const filteredProcesses = computed(() => {
  let result = processes.value

  // Filtrar apenas processos de tipos que o usuário tem permissão para visualizar
  // O processTypeId pode estar direto no objeto ou dentro de processType.id
  // EXCEÇÃO: Sub-processos herdam permissão do processo pai
  result = result.filter(p => {
    // Se é sub-processo, verificar se o pai está na lista (herdar permissão)
    if (p.isChildProcess && p.parentProcess) {
      const parentInList = processes.value.some(parent =>
        parent.id === p.parentProcess.id || parent.code === p.parentProcess.code
      )
      if (parentInList) {
        return true
      }
    }

    const typeId = p.processTypeId || p.processType?.id
    const hasAccess = typeId ? authStore.canAccessProcessType(typeId, 'view') : true
    return hasAccess
  })

  if (filters.value.processTypeId) {
    result = result.filter(p => {
      const typeId = p.processTypeId || p.processType?.id
      return typeId === filters.value.processTypeId
    })
  }

  if (filters.value.status) {
    result = result.filter(p => p.status === filters.value.status)
  }

  return result
})

// Função auxiliar para truncar texto
function truncateText(text, maxLength) {
  if (!text) return ''
  return text.length > maxLength ? text.substring(0, maxLength) + '...' : text
}

// Opções
const statusOptions = [
  { title: 'Em Andamento', value: 'IN_PROGRESS' },
  { title: 'Concluído', value: 'COMPLETED' },
  { title: 'Cancelado', value: 'CANCELLED' },
  { title: 'Rejeitado', value: 'REJECTED' }
]

// Métodos auxiliares
function getStatusColor(status) {
  const colors = {
    DRAFT: 'grey',
    IN_PROGRESS: 'info',
    COMPLETED: 'success',
    CANCELLED: 'error',
    REJECTED: 'error'
  }
  return colors[status] || 'grey'
}

function getStatusText(status) {
  const texts = {
    DRAFT: 'Rascunho',
    IN_PROGRESS: 'Em Andamento',
    COMPLETED: 'Concluído',
    CANCELLED: 'Cancelado',
    REJECTED: 'Rejeitado'
  }
  return texts[status] || status
}

function getStepTypeColor(type) {
  const colors = {
    INPUT: 'blue',
    APPROVAL: 'orange',
    UPLOAD: 'purple',
    REVIEW: 'teal',
    SIGNATURE: 'red'
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

function formatDate(date) {
  return dayjs(date).format('DD/MM/YYYY')
}

function getCurrentStep(process) {
  return process.stepExecutions?.find(se => se.status === 'IN_PROGRESS')
}

function getProgress(process) {
  if (!process.stepExecutions?.length) return 0
  
  const completed = process.stepExecutions.filter(se => 
    se.status === 'COMPLETED' || se.status === 'SKIPPED'
  ).length
  
  return Math.round((completed / process.stepExecutions.length) * 100)
}

function getProgressColor(process) {
  const progress = getProgress(process)
  if (progress === 100) return 'success'
  if (progress > 50) return 'info'
  if (progress > 0) return 'warning'
  return 'grey'
}

function getAttachmentCount(process) {
  return process.stepExecutions?.reduce((count, se) => 
    count + (se.attachments?.length || 0), 0
  ) || 0
}

function getCommentCount(process) {
  return process.stepExecutions?.filter(se => se.comment).length || 0
}

// Métodos
function createProcess() {
  router.push('/processos')
}

function viewProcess(process) {
  router.push(`/processos/${process.id}`)
}

async function loadData() {
  await Promise.all([
    processStore.fetchProcesses(),
    processTypeStore.fetchProcessTypes()
  ])
}

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.manage-processes-page {
  max-width: 1600px;
  margin: 0 auto;
}

/* Modern Page Header */
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

/* Loading State */
.loading-state {
  padding: 0;
}

.skeleton-table {
  width: 100%;
  border-radius: 16px;
  overflow: hidden;
  background: var(--color-surface);
  border: 1px solid var(--color-surface-border);
}

/* Table Card */
.table-card {
  background: var(--color-surface);
  border: 1px solid var(--color-surface-border);
  border-radius: 16px;
  overflow: hidden;
}

/* Table Header */
.table-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 16px;
  padding: 16px 20px !important;
}

.table-header-left {
  display: flex;
  align-items: center;
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-neutral-800);
}

.table-header-right {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.search-field {
  width: 220px;
}

.search-field :deep(.v-field) {
  border-radius: 10px;
}

.filter-select {
  width: 180px;
}

.filter-select--small {
  width: 140px;
}

.filter-select :deep(.v-field) {
  border-radius: 10px;
}

/* Table Styles */
.processes-table {
  border-radius: 0;
}

.processes-table :deep(.v-data-table__tr) {
  cursor: pointer;
}

.processes-table :deep(.v-data-table__tr:hover) {
  background: var(--color-primary-50) !important;
}

/* Cell Styles */
.code-cell {
  display: flex;
  align-items: center;
  gap: 6px;
}

.process-code {
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--color-neutral-700);
}

.subprocess-indicator {
  display: inline-flex;
  align-items: center;
  color: var(--color-secondary-500);
}

.title-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.process-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-neutral-800);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 280px;
}

.process-type-label {
  font-size: 0.75rem;
  color: var(--color-neutral-500);
}

.status-chip {
  font-size: 0.75rem !important;
  font-weight: 600;
}

/* Progress Cell */
.progress-cell {
  display: flex;
  align-items: center;
  gap: 10px;
}

.progress-bar-mini {
  flex: 1;
  height: 6px;
  background: var(--color-neutral-200);
  border-radius: 3px;
  overflow: hidden;
  min-width: 50px;
}

.progress-fill-mini {
  height: 100%;
  border-radius: 3px;
  transition: width 0.3s ease;
}

.fill-success { background: linear-gradient(90deg, var(--color-success-400), var(--color-success-500)); }
.fill-info { background: linear-gradient(90deg, var(--color-info-400), var(--color-info-500)); }
.fill-warning { background: linear-gradient(90deg, var(--color-warning-400), var(--color-warning-500)); }
.fill-grey { background: var(--color-neutral-400); }

.progress-text {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-neutral-600);
  min-width: 32px;
  text-align: right;
}

/* Step Cell */
.step-cell .v-chip {
  font-size: 0.75rem !important;
}

/* Creator & Date */
.creator-text {
  font-size: 0.8125rem;
  color: var(--color-neutral-600);
}

.date-text {
  font-size: 0.8125rem;
  color: var(--color-neutral-500);
}

/* Actions */
.actions-cell {
  display: flex;
  justify-content: center;
}

/* Empty State */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 64px 24px;
  background: var(--color-surface);
  border: 1px dashed var(--color-surface-border);
  border-radius: 16px;
  text-align: center;
  margin-top: 24px;
}

.empty-state-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--color-neutral-700);
  margin: 16px 0 8px 0;
}

.empty-state-text {
  font-size: 0.875rem;
  color: var(--color-neutral-500);
  margin: 0 0 20px 0;
}

/* Responsive */
@media (max-width: 1024px) {
  .table-header {
    flex-direction: column;
    align-items: stretch;
  }

  .table-header-left {
    justify-content: center;
  }

  .table-header-right {
    justify-content: center;
  }

  .search-field {
    width: 100%;
    max-width: 300px;
  }

  .filter-select,
  .filter-select--small {
    width: 140px;
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

  .table-header-right {
    flex-direction: column;
    width: 100%;
  }

  .search-field,
  .filter-select,
  .filter-select--small {
    width: 100%;
    max-width: none;
  }

  .process-title {
    max-width: 180px;
  }
}
</style>