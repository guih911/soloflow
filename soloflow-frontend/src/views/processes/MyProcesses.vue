<template>
  <div class="my-processes">
    <div class="d-flex align-center justify-space-between mb-6">
      <div>
        <h1 class="text-h4 font-weight-bold">Meus Processos</h1>
        <p class="text-subtitle-1 text-medium-emphasis">
          Processos que você criou ou nos quais está participando.
        </p>
      </div>
      <v-btn color="primary" variant="text" prepend-icon="mdi-refresh" :loading="loading" @click="loadData">
        Atualizar
      </v-btn>
    </div>

    <v-row class="mb-6" dense>
      <v-col cols="12" sm="6" md="3" v-for="card in summaryCards" :key="card.title">
        <v-card variant="tonal" :color="card.color" class="pa-4 summary-card">
          <div class="d-flex align-center justify-space-between">
            <div>
              <p class="text-subtitle-2 text-medium-emphasis mb-1">{{ card.title }}</p>
              <p class="text-h4 font-weight-bold">{{ card.value }}</p>
              <p v-if="card.subtitle" class="text-caption text-medium-emphasis">{{ card.subtitle }}</p>
            </div>
            <v-avatar :color="card.color" size="48">
              <v-icon color="white" size="24">{{ card.icon }}</v-icon>
            </v-avatar>
          </div>
        </v-card>
      </v-col>
    </v-row>

    <v-card class="mb-6">
      <v-card-text>
        <v-row>
          <v-col cols="12" md="4">
            <v-text-field
              v-model="filters.search"
              label="Buscar"
              prepend-inner-icon="mdi-magnify"
              clearable
            />
          </v-col>
          <v-col cols="12" md="4">
            <v-select
              v-model="filters.status"
              :items="statusOptions"
              label="Status"
              clearable
            />
          </v-col>
          <v-col cols="12" md="4">
            <v-select
              v-model="filters.role"
              :items="roleOptions"
              label="Meu papel"
              clearable
            />
          </v-col>
          <v-col cols="12">
            <v-switch
              v-model="filters.onlyPending"
              label="Mostrar apenas processos com ação pendente"
              color="primary"
              hide-details
              class="mt-2"
            />
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <v-data-table
      :headers="headers"
      :items="tableItems"
      :loading="loading"
      item-key="id"
      class="elevation-2"
      :items-per-page="10"
      density="comfortable"
      :no-data-text="filtersActive ? 'Nenhum processo encontrado com os filtros selecionados.' : 'Nenhum processo disponível.'"
    >
      <template #item.status="{ value }">
        <v-chip size="small" :color="getStatusColor(value)" variant="tonal">
          {{ getStatusLabel(value) }}
        </v-chip>
      </template>

      <template #item.involvement="{ value }">
        <div class="d-flex flex-wrap gap-1">
          <v-chip
            v-for="role in value"
            :key="role"
            size="x-small"
            color="primary"
            variant="outlined"
          >
            {{ role }}
          </v-chip>
        </div>
      </template>

      <template #item.pendingTasks="{ value }">
        <div class="d-flex flex-wrap gap-1">
          <v-chip
            v-for="task in value"
            :key="task.id"
            size="x-small"
            :color="task.requiresSignature ? 'error' : 'warning'"
            variant="tonal"
          >
            <v-icon start size="14">{{ task.requiresSignature ? 'mdi-draw-pen' : 'mdi-play' }}</v-icon>
            {{ task.name }}
          </v-chip>
          <span v-if="value.length === 0" class="text-caption text-medium-emphasis">Nenhuma ação pendente</span>
        </div>
      </template>

      <template #item.createdAt="{ value }">{{ formatDate(value) }}</template>
      <template #item.lastActivityAt="{ value }">{{ formatDate(value) }}</template>

      <template #item.actions="{ item }">
        <div class="d-flex align-center justify-center">
          <v-btn size="small" variant="outlined" color="primary" @click="viewProcess(item)">
            <v-icon start size="16">mdi-eye</v-icon>
            Detalhes
          </v-btn>
        </div>
      </template>

      <template #loading>
        <div class="text-center py-6">
          <v-progress-circular indeterminate color="primary" size="48" />
        </div>
      </template>
    </v-data-table>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import dayjs from 'dayjs'
import 'dayjs/locale/pt-br'

import { useAuthStore } from '@/stores/auth'
import { useProcessStore } from '@/stores/processes'

const router = useRouter()
const authStore = useAuthStore()
const processStore = useProcessStore()

const loading = ref(false)
const processes = ref([])

const filters = ref({
  search: '',
  status: null,
  role: null,
  onlyPending: false,
})

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
  { title: 'Código', key: 'code', width: '120px', align: 'start' },
  { title: 'Título', key: 'title', width: '280px', align: 'start' },
  { title: 'Tipo', key: 'processType', width: '220px', align: 'start' },
  { title: 'Status', key: 'status', width: '150px', align: 'center' },
  { title: 'Meu Papel', key: 'involvement', width: '140px', align: 'center', sortable: false },
  { title: 'Ações Pendentes', key: 'pendingTasks', width: '200px', align: 'start', sortable: false },
  { title: 'Iniciado em', key: 'createdAt', width: '150px', align: 'center' },
  { title: 'Última Atividade', key: 'lastActivityAt', width: '150px', align: 'center' },
  { title: 'Ações', key: 'actions', width: '220px', align: 'center', sortable: false },
]

const filtersActive = computed(() => {
  const f = filters.value
  return !!(f.search || f.status || f.role || f.onlyPending)
})

const tableItems = computed(() => {
  return processes.value
    .filter(proc => {
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
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()

        if (!haystack.includes(term)) return false
      }

      return true
    })
})

const summaryCards = computed(() => {
  const totalParticipating = processes.value.filter(proc => proc.involvement.includes('Executor')).length
  const totalCreated = processes.value.filter(proc => proc.involvement.includes('Criador')).length
  const totalActive = processes.value.filter(proc => proc.status === 'IN_PROGRESS').length
  const totalCompleted = processes.value.filter(proc => proc.status === 'COMPLETED').length

  return [
    {
      title: 'Participando',
      value: totalParticipating,
      icon: 'mdi-account-check',
      color: 'info',
    },
    {
      title: 'Criados por mim',
      value: totalCreated,
      icon: 'mdi-account-tie',
      color: 'primary',
    },
    {
      title: 'Em andamento',
      value: totalActive,
      icon: 'mdi-rocket-launch',
      color: 'warning',
    },
    {
      title: 'Concluídos',
      value: totalCompleted,
      icon: 'mdi-check-circle',
      color: 'success',
      subtitle: totalCompleted > 0 ? 'Bom trabalho!' : 'Nenhum processo concluído ainda',
    },
  ]
})

function formatDate(date) {
  return date ? dayjs(date).format('DD/MM/YYYY HH:mm') : '-'
}

function getStatusColor(status) {
  return {
    IN_PROGRESS: 'primary',
    COMPLETED: 'success',
    REJECTED: 'error',
    CANCELLED: 'grey',
  }[status] || 'info'
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
  router.push({ name: 'ProcessDetail', params: { id: proc.id } })
}

function continueProcess(proc) {
  const nextTask = proc.pendingTasks[0]
  if (!nextTask) return
  router.push({ name: 'StepExecution', params: { id: proc.id, stepId: nextTask.id } })
}

function normalizeProcesses() {
  const map = new Map()
  const userId = authStore.user?.id

  const ensureEntry = process => {
    if (!process || !process.id) return null
    if (!map.has(process.id)) {
      const processTypeName =
        process.processType?.name ||
        process.processTypeVersion?.processType?.name ||
        'Processo'

      map.set(process.id, {
        id: process.id,
        code: process.code || '-',
        title: process.title || processTypeName,
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
  })).sort((a, b) => dayjs(b.lastActivityAt || b.createdAt).valueOf() - dayjs(a.lastActivityAt || a.createdAt).valueOf())
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
  min-height: 100%;
}

.summary-card {
  height: 100%;
}

.gap-1 {
  gap: 4px;
}

.gap-2 {
  gap: 8px;
}

/* Melhorias na tabela */
:deep(.v-data-table) {
  border-radius: 8px;
}

:deep(.v-data-table th) {
  font-weight: 600 !important;
  background-color: rgb(var(--v-theme-surface-light)) !important;
  white-space: nowrap;
}

:deep(.v-data-table td) {
  padding: 12px 16px !important;
  vertical-align: middle !important;
}

:deep(.v-data-table .v-data-table__tr:hover) {
  background-color: rgba(var(--v-theme-primary), 0.04) !important;
}


:deep(.v-chip) {
  font-weight: 500;
}


:deep(.v-switch .v-selection-control__wrapper) {
  height: 24px;
}
</style>