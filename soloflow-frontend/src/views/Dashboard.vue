<template>
  <div>
    <!-- Header -->
    <div class="mb-6">
      <h1 class="text-h4 font-weight-bold mb-2">
        Bem-vindo(a), {{ user?.name }}!
      </h1>
      <p class="text-subtitle-1 text-medium-emphasis">
        {{ greeting }} Aqui está um resumo das suas atividades.
      </p>
    </div>

    <!-- Cards de estatísticas -->
    <v-row class="mb-6">
      <v-col
        v-for="stat in stats"
        :key="stat.title"
        cols="12"
        sm="6"
        lg="3"
      >
        <v-hover v-slot="{ isHovering, props }">
          <v-card
            v-bind="props"
            :elevation="isHovering ? 8 : 2"
            class="pa-4 transition-swing"
            :color="stat.color"
            variant="tonal"
          >
            <div class="d-flex align-center justify-space-between">
              <div>
                <p class="text-subtitle-2 text-medium-emphasis mb-1">
                  {{ stat.title }}
                </p>
                <p class="text-h4 font-weight-bold">
                  {{ stat.value }}
                </p>
              </div>
              <v-avatar
                :color="stat.color"
                size="48"
              >
                <v-icon
                  :icon="stat.icon"
                  size="24"
                />
              </v-avatar>
            </div>
          </v-card>
        </v-hover>
      </v-col>
    </v-row>

    <!-- Minhas Tarefas Pendentes -->
    <v-row>
      <v-col cols="12">
        <v-card>
          <v-card-title class="d-flex align-center justify-space-between">
            <div>
              <span class="text-h6">Minhas Tarefas Pendentes</span>
              <v-chip
                v-if="myTasks.length > 0"
                size="small"
                color="primary"
                class="ml-2"
              >
                {{ myTasks.length }}
              </v-chip>
            </div>
            <v-btn
              variant="text"
              size="small"
              @click="refreshTasks"
              :loading="loading"
            >
              <v-icon start>mdi-refresh</v-icon>
              Atualizar
            </v-btn>
          </v-card-title>
          
          <v-divider />

          <!-- Loading -->
          <v-progress-linear
            v-if="loading"
            indeterminate
            color="primary"
          />

          <!-- Lista de tarefas -->
          <v-list
            v-if="!loading && myTasks.length > 0"
            lines="three"
          >
            <template v-for="(task, index) in myTasks" :key="task.id">
              <v-list-item
                @click="openTask(task)"
                class="py-4"
              >
                <template v-slot:prepend>
                  <v-avatar
                    :color="getStepTypeColor(task.step.type)"
                    size="40"
                  >
                    <v-icon
                      :icon="getStepTypeIcon(task.step.type)"
                      size="20"
                    />
                  </v-avatar>
                </template>

                <v-list-item-title class="font-weight-medium">
                  {{ task.processInstance.title }}
                </v-list-item-title>
                
                <v-list-item-subtitle>
                  <div>
                    <v-icon size="16">mdi-file-document-outline</v-icon>
                    {{ task.processInstance.processType.name }}
                    <span class="mx-2">•</span>
                    <v-icon size="16">mdi-debug-step-over</v-icon>
                    {{ task.step.name }}
                  </div>
                  <div class="mt-1">
                    <v-icon size="16">mdi-account</v-icon>
                    Solicitado por: {{ task.processInstance.createdBy.name }}
                    <span class="mx-2">•</span>
                    <v-icon size="16">mdi-clock-outline</v-icon>
                    {{ formatDate(task.createdAt) }}
                  </div>
                </v-list-item-subtitle>

                <template v-slot:append>
                  <div class="text-center">
                    <v-chip
                      size="small"
                      :color="getPriorityColor(task)"
                      variant="tonal"
                    >
                      {{ task.processInstance.code }}
                    </v-chip>
                    <div class="text-caption mt-1">
                      {{ getTimeAgo(task.createdAt) }}
                    </div>
                  </div>
                </template>
              </v-list-item>
              
              <v-divider v-if="index < myTasks.length - 1" />
            </template>
          </v-list>

          <!-- Estado vazio -->
          <v-card-text
            v-else-if="!loading && myTasks.length === 0"
            class="text-center py-12"
          >
            <v-icon
              size="64"
              color="grey-lighten-1"
            >
              mdi-checkbox-marked-circle-outline
            </v-icon>
            <p class="text-h6 mt-4 text-grey">
              Nenhuma tarefa pendente
            </p>
            <p class="text-body-2 text-grey">
              Todas as suas tarefas foram concluídas!
            </p>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Processos Recentes -->
    <v-row class="mt-6">
      <v-col cols="12">
        <v-card>
          <v-card-title class="d-flex align-center justify-space-between">
            <span>Processos Recentes</span>
            <v-btn
              variant="text"
              size="small"
              color="primary"
              to="/processes"
            >
              Ver todos
              <v-icon end>mdi-arrow-right</v-icon>
            </v-btn>
          </v-card-title>
          
          <v-divider />

          <v-data-table
            :headers="processHeaders"
            :items="recentProcesses"
            :items-per-page="5"
            :loading="loadingProcesses"
            class="elevation-0"
          >
            <template v-slot:item.status="{ item }">
              <v-chip
                :color="getStatusColor(item.status)"
                size="small"
                label
              >
                {{ getStatusText(item.status) }}
              </v-chip>
            </template>
            
            <template v-slot:item.createdAt="{ item }">
              {{ formatDate(item.createdAt) }}
            </template>
            
            <template v-slot:item.actions="{ item }">
              <v-btn
                icon="mdi-eye"
                size="small"
                variant="text"
                @click="viewProcess(item)"
              />
            </template>
          </v-data-table>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useProcessStore } from '@/stores/processes'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/pt-br'

dayjs.extend(relativeTime)
dayjs.locale('pt-br')

const router = useRouter()
const authStore = useAuthStore()
const processStore = useProcessStore()

const user = computed(() => authStore.user)
const myTasks = computed(() => processStore.myTasks)
const loading = computed(() => processStore.loading)

const loadingProcesses = ref(false)
const recentProcesses = ref([])

// Saudação baseada no horário
const greeting = computed(() => {
  const hour = new Date().getHours()
  if (hour < 12) return 'Bom dia!'
  if (hour < 18) return 'Boa tarde!'
  return 'Boa noite!'
})

// Estatísticas
const stats = computed(() => [
  {
    title: 'Tarefas Pendentes',
    value: myTasks.value.length,
    icon: 'mdi-clock-alert-outline',
    color: 'warning',
  },
  {
    title: 'Processos Ativos',
    value: recentProcesses.value.filter(p => p.status === 'IN_PROGRESS').length,
    icon: 'mdi-file-document-multiple',
    color: 'primary',
  },
  {
    title: 'Concluídos Hoje',
    value: recentProcesses.value.filter(p => 
      p.status === 'COMPLETED' && 
      dayjs(p.completedAt).isSame(dayjs(), 'day')
    ).length,
    icon: 'mdi-check-circle',
    color: 'success',
  },
  {
    title: 'Total do Mês',
    value: recentProcesses.value.filter(p => 
      dayjs(p.createdAt).isSame(dayjs(), 'month')
    ).length,
    icon: 'mdi-chart-line',
    color: 'info',
  }
])

// Headers da tabela
const processHeaders = [
  { title: 'Código', key: 'code', width: '130' },
  { title: 'Título', key: 'title' },
  { title: 'Tipo', key: 'processType.name' },
  { title: 'Criado em', key: 'createdAt' },
  { title: 'Status', key: 'status', align: 'center' },
  { title: 'Ações', key: 'actions', align: 'center', sortable: false }
]

// Funções auxiliares
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

function getPriorityColor(task) {
  const daysOpen = dayjs().diff(dayjs(task.createdAt), 'day')
  if (daysOpen > 3) return 'error'
  if (daysOpen > 1) return 'warning'
  return 'info'
}

function formatDate(date) {
  return dayjs(date).format('DD/MM/YYYY HH:mm')
}

function getTimeAgo(date) {
  return dayjs(date).fromNow()
}

async function refreshTasks() {
  await processStore.fetchMyTasks()
}

async function loadRecentProcesses() {
  loadingProcesses.value = true
  try {
    recentProcesses.value = await processStore.fetchProcesses()
  } finally {
    loadingProcesses.value = false
  }
}

function openTask(task) {
  router.push(`/processes/${task.processInstance.id}/execute/${task.id}`)
}

function viewProcess(process) {
  router.push(`/processes/${process.id}`)
}

onMounted(async () => {
  await Promise.all([
    refreshTasks(),
    loadRecentProcesses()
  ])
})
</script>

<style scoped>
.transition-swing {
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.5, 1);
}

.v-list-item {
  cursor: pointer;
  transition: background-color 0.2s;
}

.v-list-item:hover {
  background-color: rgba(0, 0, 0, 0.04);
}
</style>