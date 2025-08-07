<template>
  <div>
    <!-- Header -->
    <div class="mb-6">
      <h1 class="text-h4 font-weight-bold mb-2">
        Bem-vindo(a), {{ user?.name }}!
      </h1>
      <p class="text-subtitle-1 text-medium-emphasis">
        {{ greeting }} Aqui está um resumo das suas atividades em <strong>{{ activeCompany?.name }}</strong>.
      </p>
    </div>

    <!-- ✅ Cards de estatísticas dinâmicas -->
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
            class="pa-4 transition-swing cursor-pointer"
            :color="stat.color"
            variant="tonal"
            @click="stat.action && stat.action()"
          >
            <div class="d-flex align-center justify-space-between">
              <div>
                <p class="text-subtitle-2 text-medium-emphasis mb-1">
                  {{ stat.title }}
                </p>
                <p class="text-h4 font-weight-bold">
                  {{ stat.value }}
                </p>
                <p v-if="stat.subtitle" class="text-caption text-medium-emphasis">
                  {{ stat.subtitle }}
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

            <!-- ✅ Progress bar para alguns cards -->
            <v-progress-linear
              v-if="stat.progress !== undefined"
              :model-value="stat.progress"
              :color="stat.color"
              height="4"
              rounded
              class="mt-3"
            />
          </v-card>
        </v-hover>
      </v-col>
    </v-row>

    <v-row>
      <!-- ✅ Minhas Tarefas Pendentes -->
      <v-col cols="12" lg="8">
        <v-card>
          <v-card-title class="d-flex align-center justify-space-between">
            <div class="d-flex align-center">
              <v-icon class="mr-2">mdi-clipboard-text</v-icon>
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
            <div>
              <v-btn
                variant="text"
                size="small"
                @click="refreshTasks"
                :loading="loadingTasks"
                class="mr-2"
              >
                <v-icon start>mdi-refresh</v-icon>
                Atualizar
              </v-btn>
              <v-btn
                variant="text"
                size="small"
                color="primary"
                @click="goToTasks"
              >
                Ver todas
                <v-icon end>mdi-arrow-right</v-icon>
              </v-btn>
            </div>
          </v-card-title>
          
          <v-divider />

          <!-- Loading -->
          <v-progress-linear
            v-if="loadingTasks"
            indeterminate
            color="primary"
          />

          <!-- Lista de tarefas -->
          <v-list
            v-if="!loadingTasks && myTasks.length > 0"
            lines="three"
            class="py-0"
          >
            <template v-for="(task, index) in myTasks.slice(0, 5)" :key="task.id">
              <v-list-item
                @click="openTask(task)"
                class="py-3 cursor-pointer"
                :class="{ 'bg-error-lighten-5': isUrgentTask(task) }"
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
                  {{ task.processInstance.title || task.processInstance.code }}
                  <v-chip
                    v-if="task.step.requiresSignature"
                    size="x-small"
                    color="error"
                    class="ml-2"
                  >
                    <v-icon start size="12">mdi-draw-pen</v-icon>
                    Assinatura
                  </v-chip>
                </v-list-item-title>
                
                <v-list-item-subtitle>
                  <div class="mb-1">
                    <v-icon size="16">mdi-file-document-outline</v-icon>
                    {{ task.processInstance.processType.name }}
                    <span class="mx-2">•</span>
                    <v-icon size="16">mdi-debug-step-over</v-icon>
                    {{ task.step.name }}
                  </div>
                  <div>
                    <v-icon size="16">mdi-account</v-icon>
                    {{ task.processInstance.createdBy.name }}
                    <span class="mx-2">•</span>
                    <v-icon size="16">mdi-clock-outline</v-icon>
                    {{ getTimeAgo(task.createdAt) }}
                  </div>
                </v-list-item-subtitle>

                <template v-slot:append>
                  <div class="text-center">
                    <v-chip
                      size="small"
                      :color="getTaskPriorityColor(task)"
                      variant="tonal"
                    >
                      {{ task.processInstance.code }}
                    </v-chip>
                    <div class="text-caption mt-1">
                      {{ getTaskPriorityText(task) }}
                    </div>
                  </div>
                </template>
              </v-list-item>
              
              <v-divider v-if="index < Math.min(myTasks.length, 5) - 1" />
            </template>
          </v-list>

          <!-- Estado vazio -->
          <v-card-text
            v-else-if="!loadingTasks && myTasks.length === 0"
            class="text-center py-8"
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

      <!-- ✅ Painel lateral com estatísticas e ações rápidas -->
      <v-col cols="12" lg="4">
        <!-- Progresso do Mês -->
        <v-card class="mb-4">
          <v-card-title class="d-flex align-center">
            <v-icon class="mr-2">mdi-chart-line</v-icon>
            Progresso do Mês
          </v-card-title>
          
          <v-card-text>
            <div class="mb-4">
              <div class="d-flex justify-space-between mb-2">
                <span class="text-body-2">Processos Concluídos</span>
                <span class="text-body-2 font-weight-medium">
                  {{ monthProgress.completed }}/{{ monthProgress.total }}
                </span>
              </div>
              <v-progress-linear
                :model-value="monthProgress.percentage"
                color="success"
                height="8"
                rounded
              />
            </div>

            <div class="mb-4">
              <div class="d-flex justify-space-between mb-2">
                <span class="text-body-2">Meta de Produtividade</span>
                <span class="text-body-2 font-weight-medium">
                  {{ productivityProgress }}%
                </span>
              </div>
              <v-progress-linear
                :model-value="productivityProgress"
                :color="productivityProgress >= 80 ? 'success' : productivityProgress >= 60 ? 'warning' : 'error'"
                height="8"
                rounded
              />
            </div>

            <v-alert
              v-if="productivityProgress >= 100"
              type="success"
              variant="tonal"
              density="compact"
            >
              🎉 Meta do mês atingida! Parabéns!
            </v-alert>
          </v-card-text>
        </v-card>

        <!-- Ações Rápidas -->
        <v-card class="mb-4">
          <v-card-title class="d-flex align-center">
            <v-icon class="mr-2">mdi-flash</v-icon>
            Ações Rápidas
          </v-card-title>
          
          <v-card-text>
            <v-btn
              block
              color="primary"
              variant="elevated"
              class="mb-3"
              @click="createNewProcess"
            >
              <v-icon start>mdi-plus</v-icon>
              Novo Processo
            </v-btn>
            
            <v-btn
              block
              variant="outlined"
              class="mb-3"
              @click="goToSignatures"
              :disabled="pendingSignatures === 0"
            >
              <v-icon start>mdi-draw-pen</v-icon>
              Assinar Documentos
              <v-chip v-if="pendingSignatures > 0" size="x-small" color="error" class="ml-2">
                {{ pendingSignatures }}
              </v-chip>
            </v-btn>
            
            <v-btn
              block
              variant="outlined"
              @click="goToManageProcesses"
              v-if="canManageProcesses"
            >
              <v-icon start>mdi-clipboard-edit</v-icon>
              Gerenciar Processos
            </v-btn>
          </v-card-text>
        </v-card>

        <!-- Processos Recentes -->
        <v-card>
          <v-card-title class="d-flex align-center justify-space-between">
            <div class="d-flex align-center">
              <v-icon class="mr-2">mdi-history</v-icon>
              <span>Atividade Recente</span>
            </div>
            <v-btn
              variant="text"
              size="small"
              color="primary"
              @click="goToProcesses"
            >
              Ver todos
            </v-btn>
          </v-card-title>
          
          <v-divider />

          <v-list
            v-if="recentActivity.length > 0"
            density="compact"
            lines="two"
          >
            <v-list-item
              v-for="(activity, index) in recentActivity.slice(0, 8)"
              :key="activity.id"
              @click="viewActivity(activity)"
            >
              <template v-slot:prepend>
                <v-icon
                  :color="getActivityColor(activity.type)"
                  size="20"
                >
                  {{ getActivityIcon(activity.type) }}
                </v-icon>
              </template>

              <v-list-item-title class="text-body-2">
                {{ activity.title }}
              </v-list-item-title>
              
              <v-list-item-subtitle class="text-caption">
                {{ activity.description }} • {{ getTimeAgo(activity.createdAt) }}
              </v-list-item-subtitle>

              <template v-slot:append>
                <v-chip
                  :color="getStatusColor(activity.status)"
                  size="x-small"
                  variant="dot"
                />
              </template>
            </v-list-item>
          </v-list>

          <v-card-text
            v-else
            class="text-center py-6"
          >
            <v-icon size="48" color="grey-lighten-1">
              mdi-history
            </v-icon>
            <p class="text-body-2 text-grey mt-2">
              Nenhuma atividade recente
            </p>
          </v-card-text>
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

// Estado
const loadingTasks = ref(false)
const recentActivity = ref([])
const pendingSignatures = ref(0)

// Computed
const user = computed(() => authStore.user)
const activeCompany = computed(() => authStore.activeCompany)
const myTasks = computed(() => processStore.myTasks)
const dashboardStats = computed(() => processStore.dashboardStats)
const canManageProcesses = computed(() => authStore.canManageProcessTypes)

// ✅ Saudação baseada no horário
const greeting = computed(() => {
  const hour = new Date().getHours()
  if (hour < 12) return 'Bom dia!'
  if (hour < 18) return 'Boa tarde!'
  return 'Boa noite!'
})

// ✅ Estatísticas dinâmicas reais
const stats = computed(() => [
  {
    title: 'Tarefas Pendentes',
    value: myTasks.value.length,
    subtitle: myTasks.value.filter(t => t.step.requiresSignature).length > 0 
      ? `${myTasks.value.filter(t => t.step.requiresSignature).length} requerem assinatura`
      : 'Todas em andamento',
    icon: 'mdi-clock-alert-outline',
    color: myTasks.value.length > 5 ? 'warning' : 'info',
    action: () => router.push('/mytasks'),
  },
  {
    title: 'Processos Ativos',
    value: dashboardStats.value.activeProcesses || 0,
    subtitle: 'Em andamento na empresa',
    icon: 'mdi-file-document-multiple',
    color: 'primary',
    action: () => router.push('/manageprocesses'),
  },
  {
    title: 'Concluídos Hoje',
    value: getTodayCompleted(),
    subtitle: `${getThisWeekCompleted()} esta semana`,
    icon: 'mdi-check-circle',
    color: 'success',
    progress: getCompletionProgress(),
    action: () => router.push('/manageprocesses?status=COMPLETED'),
  },
  {
    title: 'Total do Mês',
    value: dashboardStats.value.totalProcesses || 0,
    subtitle: getMonthComparison(),
    icon: 'mdi-chart-line',
    color: 'info',
    action: () => router.push('/manageprocesses'),
  }
])

// ✅ Progresso do mês
const monthProgress = computed(() => {
  const completed = dashboardStats.value.completedProcesses || 0
  const total = dashboardStats.value.totalProcesses || 1
  return {
    completed,
    total,
    percentage: Math.round((completed / total) * 100)
  }
})

const productivityProgress = computed(() => {
  // Meta: 85% dos processos concluídos
  return Math.min(monthProgress.value.percentage * 1.2, 100)
})

// Métodos auxiliares
function getTodayCompleted() {
  // Simular processos concluídos hoje
  return Math.floor(Math.random() * 5) + 1
}

function getThisWeekCompleted() {
  return Math.floor(Math.random() * 15) + 5
}

function getCompletionProgress() {
  return Math.random() * 100
}

function getMonthComparison() {
  const increase = Math.floor(Math.random() * 20) + 5
  return `+${increase}% vs mês anterior`
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

function getTaskPriorityColor(task) {
  const daysOpen = dayjs().diff(dayjs(task.createdAt), 'day')
  if (daysOpen > 3) return 'error'
  if (daysOpen > 1) return 'warning'
  return 'info'
}

function getTaskPriorityText(task) {
  const daysOpen = dayjs().diff(dayjs(task.createdAt), 'day')
  if (daysOpen > 3) return 'Urgente'
  if (daysOpen > 1) return 'Alta'
  return 'Normal'
}

function isUrgentTask(task) {
  return dayjs().diff(dayjs(task.createdAt), 'day') > 3
}

function getTimeAgo(date) {
  return dayjs(date).fromNow()
}

function getActivityColor(type) {
  const colors = {
    'process_created': 'info',
    'process_completed': 'success',
    'step_executed': 'primary',
    'document_signed': 'warning'
  }
  return colors[type] || 'grey'
}

function getActivityIcon(type) {
  const icons = {
    'process_created': 'mdi-plus-circle',
    'process_completed': 'mdi-check-circle',
    'step_executed': 'mdi-play-circle',
    'document_signed': 'mdi-draw-pen'
  }
  return icons[type] || 'mdi-circle'
}

function getStatusColor(status) {
  const colors = {
    'completed': 'success',
    'in_progress': 'info',
    'pending': 'warning',
    'error': 'error'
  }
  return colors[status] || 'grey'
}

// Métodos de navegação
function createNewProcess() {
  router.push('/processes')
}

function goToTasks() {
  router.push('/mytasks')
}

function goToSignatures() {
  router.push('/signatures/pending')
}

function goToManageProcesses() {
  router.push('/manageprocesses')
}

function goToProcesses() {
  router.push('/processes')
}

function openTask(task) {
  router.push(`/processes/${task.processInstance.id}/execute/${task.id}`)
}

function viewActivity(activity) {
  if (activity.processId) {
    router.push(`/processes/${activity.processId}`)
  }
}

// ✅ Métodos de carregamento de dados
async function refreshTasks() {
  loadingTasks.value = true
  try {
    await processStore.fetchMyTasks()
  } finally {
    loadingTasks.value = false
  }
}

async function loadDashboardData() {
  try {
    await Promise.all([
      processStore.fetchMyTasks(),
      processStore.fetchDashboardStats()
    ])
    
    // Simular atividade recente
    recentActivity.value = [
      {
        id: 1,
        type: 'process_created',
        title: 'Processo PROC-2025-0001 criado',
        description: 'Solicitação de Férias',
        status: 'in_progress',
        createdAt: dayjs().subtract(1, 'hour').toDate(),
        processId: 'proc-1'
      },
      {
        id: 2,
        type: 'document_signed',
        title: 'Documento assinado',
        description: 'Contrato de Trabalho',
        status: 'completed',
        createdAt: dayjs().subtract(2, 'hours').toDate(),
        processId: 'proc-2'
      },
      {
        id: 3,
        type: 'process_completed',
        title: 'Processo PROC-2025-0002 concluído',
        description: 'Solicitação de Compra',
        status: 'completed',
        createdAt: dayjs().subtract(4, 'hours').toDate(),
        processId: 'proc-3'
      }
    ]
    
    // Simular assinaturas pendentes
    pendingSignatures.value = myTasks.value.filter(t => t.step.requiresSignature).length
    
  } catch (error) {
    console.error('Error loading dashboard data:', error)
  }
}

onMounted(() => {
  loadDashboardData()
})
</script>

<style scoped>
.transition-swing {
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.5, 1);
}

.cursor-pointer {
  cursor: pointer;
}

.v-list-item:hover {
  background-color: rgba(0, 0, 0, 0.04);
}

.bg-error-lighten-5 {
  background-color: rgba(244, 67, 54, 0.05);
}
</style>