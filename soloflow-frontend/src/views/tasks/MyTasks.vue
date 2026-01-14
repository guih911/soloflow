<template>
  <div>
    <!-- Header -->
    <div class="d-flex align-center justify-space-between mb-6">
      <div>
        <h1 class="text-h4 font-weight-bold">Minhas Tarefas</h1>
        <p class="text-subtitle-1 text-medium-emphasis">
          Tarefas pendentes de sua ação
        </p>
      </div>
      <!-- Botão flutuante de atualizar -->
      <v-btn variant="text" right @click="refreshTasks" :loading="loading">
        <v-icon start>mdi-refresh</v-icon>
        Atualizar
      </v-btn>
    </div>

    <!-- Filtros -->
    <v-card class="mb-6">
      <v-card-text>
        <v-row>
          <v-col cols="12" md="4">
            <v-text-field v-model="filters.search" label="Buscar tarefa" prepend-inner-icon="mdi-magnify" clearable
              hide-details />
          </v-col>
          <v-col cols="12" md="4">
            <v-select v-model="filters.processType" :items="processTypes" item-title="name" item-value="id"
              label="Tipo de Processo" clearable hide-details />
          </v-col>
          <v-col cols="12" md="4">
            <v-select v-model="filters.priority" :items="priorityOptions" label="Prioridade" clearable hide-details />
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <!-- Lista de Tarefas -->
    <v-row v-if="!loading && paginatedTasks.length > 0">
      <v-col v-for="task in paginatedTasks" :key="task.id" cols="12">
        <v-card class="task-card" :class="{ 'border-warning': isUrgent(task) }">
          <v-card-text>
            <v-row align="center">
              <v-col cols="auto">
                <v-avatar :color="getStepTypeColor(task.step.type)" size="56">
                  <v-icon :icon="getStepTypeIcon(task.step.type)" size="28" />
                </v-avatar>
              </v-col>

              <v-col>
                <div class="d-flex align-center mb-1">
                  <h3 class="text-h6 mr-2">
                    {{ task.processInstance.title || task.processInstance.code }}
                  </h3>
                  <v-chip size="small" :color="isUrgent(task) ? 'warning' : 'info'" variant="tonal">
                    {{ task.processInstance.code }}
                  </v-chip>
                  <v-chip v-if="task.step.requiresSignature" size="small" color="error" variant="tonal" class="ml-2">
                    <v-icon start size="16">mdi-draw-pen</v-icon>
                    Requer Assinatura
                  </v-chip>
                </div>

                <p class="text-body-2 text-grey mb-2">
                  <v-icon size="16">mdi-file-document-outline</v-icon>
                  {{ task.processInstance.processType.name }}
                  <span class="mx-2">•</span>
                  <v-icon size="16">mdi-debug-step-over</v-icon>
                  {{ task.step.name }}
                </p>

                <div class="text-caption text-grey">
                  <v-icon size="16">mdi-account</v-icon>
                  Solicitado por: {{ task.processInstance.createdBy.name }}
                  <span class="mx-2">•</span>
                  <v-icon size="16">mdi-clock-outline</v-icon>
                  {{ getTimeAgo(task.createdAt) }}
                  <span v-if="task.processInstance.description" class="mx-2">•</span>
                  <span v-if="task.processInstance.description">
                    {{ task.processInstance.description }}
                  </span>
                </div>
              </v-col>

              <v-col cols="auto">
                <v-btn color="primary" @click="executeTask(task)">
                  <v-icon start>mdi-play</v-icon>
                  Executar
                </v-btn>
              </v-col>
            </v-row>
          </v-card-text>

          <v-divider v-if="task.step.description" />

          <v-card-text v-if="task.step.description" class="pt-2">
            <v-alert type="info" variant="tonal" density="compact">
              {{ task.step.description }}
            </v-alert>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Estado vazio -->
    <v-card v-else-if="!loading && filteredTasks.length === 0" class="text-center py-12">
      <v-icon size="64" color="grey-lighten-1">
        mdi-checkbox-marked-circle-outline
      </v-icon>
      <p class="text-h6 mt-4 text-grey">
        Nenhuma tarefa pendente
      </p>
      <p class="text-body-2 text-grey">
        {{ filters.search || filters.processType || filters.priority
          ? 'Tente ajustar os filtros'
          : 'Todas as suas tarefas foram concluídas!' }}
      </p>
    </v-card>

    <!-- Loading -->
    <div v-if="loading" class="text-center py-12">
      <v-progress-circular indeterminate color="primary" size="64" />
    </div>

    <!-- Paginação -->
    <PaginationControls
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

// Estado
const filters = ref({
  search: '',
  processType: null,
  priority: null
})

// Estado de paginação
const currentPage = ref(1)
const itemsPerPage = ref(12)
const itemsPerPageOptions = [6, 12, 24, 48]

// Computed
const loading = computed(() => processStore.loading)
const myTasks = computed(() => processStore.myTasks)
const processTypes = computed(() => processTypeStore.processTypes)

const filteredTasks = computed(() => {
  let tasks = myTasks.value

  // Filtro de busca
  if (filters.value.search) {
    const search = filters.value.search.toLowerCase()
    tasks = tasks.filter(t =>
      t.processInstance.code.toLowerCase().includes(search) ||
      t.processInstance.title?.toLowerCase().includes(search) ||
      t.step.name.toLowerCase().includes(search)
    )
  }

  // Filtro por tipo de processo
  if (filters.value.processType) {
    tasks = tasks.filter(t =>
      t.processInstance.processType.id === filters.value.processType
    )
  }

  // Filtro por prioridade
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

  // Ordenar por data de criação (mais antigas primeiro)
  return tasks.sort((a, b) =>
    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  )
})

const paginatedTasks = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value
  const end = start + itemsPerPage.value
  return filteredTasks.value.slice(start, end)
})

// Watchers para resetar página quando filtros mudarem
watch(filters, () => {
  currentPage.value = 1
}, { deep: true })

watch(itemsPerPage, () => {
  currentPage.value = 1
})

// Opções
const priorityOptions = [
  { title: 'Urgente (> 3 dias)', value: 'urgent' },
  { title: 'Alta (2-3 dias)', value: 'high' },
  { title: 'Normal (< 2 dias)', value: 'normal' }
]

// Métodos auxiliares
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

function getTimeAgo(date) {
  return dayjs(date).fromNow()
}

function isUrgent(task) {
  const daysOpen = dayjs().diff(dayjs(task.createdAt), 'day')
  return daysOpen > 3
}

// Métodos
async function refreshTasks() {
  await Promise.all([
    processStore.fetchMyTasks(),
    processTypeStore.fetchProcessTypes()
  ])
}

function executeTask(task) {
  router.push(`/processos/${task.processInstance.id}`)
}

onMounted(() => {
  refreshTasks()
})
</script>

<style scoped>
.task-card {
  transition: all 0.3s ease;
}

.task-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.border-warning {
  border-left: 4px solid #ff9800 !important;
}

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