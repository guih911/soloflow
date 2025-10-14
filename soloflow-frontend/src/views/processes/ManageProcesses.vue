<template>
  <div>
    <!-- Header -->
    <div class="d-flex align-center justify-space-between mb-6">
      <div>
        <h1 class="text-h4 font-weight-bold">Gerenciar Processos</h1>
        <p class="text-subtitle-1 text-medium-emphasis">
          Visualize e acompanhe todos os processos da empresa
        </p>
      </div>
      <v-btn
        color="primary"
        @click="createProcess"
        prepend-icon="mdi-plus"
      >
        Novo Processo
      </v-btn>
    </div>

    <!-- Filtros -->
    <v-card class="mb-6">
      <v-card-text>
        <v-row>
          <v-col cols="12" md="4">
            <v-text-field
              v-model="filters.search"
              label="Buscar processo"
              prepend-inner-icon="mdi-magnify"
              clearable
              hide-details
            />
          </v-col>
          <v-col cols="12" md="4">
            <v-select
              v-model="filters.processTypeId"
              :items="processTypes"
              item-title="name"
              item-value="id"
              label="Tipo de Processo"
              clearable
              hide-details
            />
          </v-col>
          <v-col cols="12" md="4">
            <v-select
              v-model="filters.status"
              :items="statusOptions"
              label="Status"
              clearable
              hide-details
            />
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <!-- Lista de Processos em Cartões -->
    <v-row v-if="!loading">
      <v-col
        v-for="process in paginatedProcesses"
        :key="process.id"
        cols="12"
        md="6"
        lg="4"
      >
        <v-hover v-slot="{ isHovering, props }">
          <v-card
            v-bind="props"
            :elevation="isHovering ? 8 : 2"
            class="h-100 d-flex flex-column"
            @click="viewProcess(process)"
          >
            <!-- Status Badge -->
            <v-sheet
              :color="getStatusColor(process.status)"
              class="pa-2 d-flex align-center justify-space-between"
            >
              <v-chip
                size="small"
                color="white"
                variant="tonal"
              >
                {{ process.code }}
              </v-chip>
              <span class="text-caption text-white">
                {{ getStatusText(process.status) }}
              </span>
            </v-sheet>

            <v-card-title class="pb-1">
              {{ process.title || process.processType.name }}
            </v-card-title>

            <v-card-subtitle>
              <v-icon size="16">mdi-file-document-outline</v-icon>
              {{ process.processType.name }}
            </v-card-subtitle>

            <v-card-text class="flex-grow-1">
              <div v-if="process.description" class="text-body-2 mb-3">
                {{ process.description }}
              </div>

              <!-- Informações do Processo -->
              <div class="text-caption">
                <div class="d-flex align-center mb-2">
                  <v-icon size="16" class="mr-1">mdi-account</v-icon>
                  <span>Criado por: {{ process.createdBy.name }}</span>
                </div>
                <div class="d-flex align-center mb-2">
                  <v-icon size="16" class="mr-1">mdi-calendar</v-icon>
                  <span>Iniciado: {{ formatDate(process.createdAt) }}</span>
                </div>
                <div v-if="process.completedAt" class="d-flex align-center mb-2">
                  <v-icon size="16" class="mr-1">mdi-calendar-check</v-icon>
                  <span>Concluído: {{ formatDate(process.completedAt) }}</span>
                </div>
              </div>

              <!-- Progress -->
              <div class="mt-3">
                <div class="d-flex justify-space-between text-caption mb-1">
                  <span>Progresso</span>
                  <span>{{ getProgress(process) }}%</span>
                </div>
                <v-progress-linear
                  :model-value="getProgress(process)"
                  :color="getProgressColor(process)"
                  height="6"
                  rounded
                />
              </div>

              <!-- Etapa Atual -->
              <div v-if="getCurrentStep(process)" class="mt-3">
                <v-chip
                  size="small"
                  variant="tonal"
                  :color="getStepTypeColor(getCurrentStep(process).step.type)"
                >
                  <v-icon start size="16">
                    {{ getStepTypeIcon(getCurrentStep(process).step.type) }}
                  </v-icon>
                  {{ getCurrentStep(process).step.name }}
                </v-chip>
              </div>
            </v-card-text>

            <v-divider />

            <v-card-actions>
              <v-btn
                variant="text"
                size="small"
                @click.stop="viewProcess(process)"
              >
                <v-icon start>mdi-eye</v-icon>
                Visualizar
              </v-btn>
              <v-spacer />
              <v-chip
                size="x-small"
                variant="text"
              >
                <v-icon start size="16">mdi-attachment</v-icon>
                {{ getAttachmentCount(process) }}
              </v-chip>
              <v-chip
                size="x-small"
                variant="text"
              >
                <v-icon start size="16">mdi-comment-outline</v-icon>
                {{ getCommentCount(process) }}
              </v-chip>
            </v-card-actions>
          </v-card>
        </v-hover>
      </v-col>
    </v-row>

    <!-- Estado vazio -->
    <v-card
      v-if="!loading && filteredProcesses.length === 0"
      class="text-center py-12"
    >
      <v-icon size="64" color="grey-lighten-1">
        mdi-file-document-multiple-outline
      </v-icon>
      <p class="text-h6 mt-4 text-grey">
        Nenhum processo encontrado
      </p>
      <p class="text-body-2 text-grey mb-4">
        {{ hasFilters ? 'Tente ajustar os filtros' : 'Comece criando um novo processo' }}
      </p>
      <v-btn
        v-if="!hasFilters"
        color="primary"
        @click="createProcess"
      >
        <v-icon start>mdi-plus</v-icon>
        Criar Primeiro Processo
      </v-btn>
    </v-card>

    <!-- Loading -->
    <div v-if="loading" class="text-center py-12">
      <v-progress-circular
        indeterminate
        color="primary"
        size="64"
      />
    </div>

    <!-- Paginação -->
    <div v-if="!loading && filteredProcesses.length > 0" class="pagination-section">
      <v-card class="pagination-card">
        <v-card-text>
          <v-row align="center" justify="space-between">
            <!-- Informação de registros -->
            <v-col cols="12" md="4">
              <div class="pagination-info text-body-2">
                Mostrando {{ startItem }} - {{ endItem }} de {{ totalItems }} processos
              </div>
            </v-col>

            <!-- Controles de paginação -->
            <v-col cols="12" md="8">
              <div class="d-flex align-center justify-end pagination-controls">
                <!-- Itens por página -->
                <div class="d-flex align-center mr-4">
                  <span class="text-body-2 mr-2">Por pág.:</span>
                  <v-select
                    v-model="itemsPerPage"
                    :items="itemsPerPageOptions"
                    density="compact"
                    variant="outlined"
                    hide-details
                    class="items-per-page-select"
                    style="width: 80px;"
                  />
                </div>

                <!-- Componente de paginação -->
                <v-pagination
                  v-model="currentPage"
                  :length="totalPages"
                  :total-visible="5"
                  class="pagination-component"
                  density="comfortable"
                />
              </div>
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useProcessStore } from '@/stores/processes'
import { useProcessTypeStore } from '@/stores/processTypes'
import dayjs from 'dayjs'

const router = useRouter()
const processStore = useProcessStore()
const processTypeStore = useProcessTypeStore()

// Estado
const filters = ref({
  search: '',
  processTypeId: null,
  status: null
})

// Estado de paginação
const currentPage = ref(1)
const itemsPerPage = ref(12)
const itemsPerPageOptions = [6, 12, 24, 48]

// Computed
const loading = computed(() => processStore.loading)
const processes = computed(() => processStore.processes)
const processTypes = computed(() => processTypeStore.processTypes)

const hasFilters = computed(() => {
  return filters.value.search || filters.value.processTypeId || filters.value.status
})

const filteredProcesses = computed(() => {
  let result = processes.value

  if (filters.value.search) {
    const search = filters.value.search.toLowerCase()
    result = result.filter(p => 
      p.code.toLowerCase().includes(search) ||
      p.title?.toLowerCase().includes(search) ||
      p.processType.name.toLowerCase().includes(search) ||
      p.description?.toLowerCase().includes(search)
    )
  }

  if (filters.value.processTypeId) {
    result = result.filter(p => p.processTypeId === filters.value.processTypeId)
  }

  if (filters.value.status) {
    result = result.filter(p => p.status === filters.value.status)
  }

  return result
})

// Computed de paginação
const totalItems = computed(() => filteredProcesses.value.length)

const totalPages = computed(() => {
  return Math.ceil(totalItems.value / itemsPerPage.value)
})

const startItem = computed(() => {
  if (totalItems.value === 0) return 0
  return (currentPage.value - 1) * itemsPerPage.value + 1
})

const endItem = computed(() => {
  const end = currentPage.value * itemsPerPage.value
  return end > totalItems.value ? totalItems.value : end
})

const paginatedProcesses = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value
  const end = start + itemsPerPage.value
  return filteredProcesses.value.slice(start, end)
})

// Watchers para resetar página quando filtros mudarem
watch(filters, () => {
  currentPage.value = 1
}, { deep: true })

watch(itemsPerPage, () => {
  currentPage.value = 1
})

// Opções
const statusOptions = [
  { title: 'Rascunho', value: 'DRAFT' },
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
  router.push('/processes')
}

function viewProcess(process) {
  router.push(`/processes/${process.id}`)
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
/* ✨ Paginação */
.pagination-section {
  margin-top: 32px;
}

.pagination-card {
  border-radius: 0;
  border: none;
  background: transparent;
  box-shadow: none;
}

.pagination-info {
  font-weight: 400;
  color: rgba(0, 0, 0, 0.6);
}

.pagination-controls {
  flex-wrap: wrap;
  gap: 16px;
}

.items-per-page-select :deep(.v-field) {
  border-radius: 4px;
}

.pagination-component :deep(.v-pagination__item) {
  border-radius: 4px;
  font-weight: 500;
  min-width: 36px;
  height: 36px;
}

.pagination-component :deep(.v-pagination__item--is-active) {
  background: #1976D2;
  color: #fff;
  box-shadow: none;
}
</style>