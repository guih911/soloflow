<template>
  <div>
    <!-- Header -->
    <div class="mb-6">
      <h1 class="text-h4 font-weight-bold mb-2">
        Bem-vindo(a), {{ user?.name }}!
      </h1>
      <p class="text-subtitle-1 text-medium-emphasis">
        {{ greeting }} Aqui está um resumo das suas atividades pessoais em <strong>{{ activeCompany?.name }}</strong>.
      </p>
    </div>

    <!-- Cards de estatísticas do usuário -->
    <v-row class="mb-6">
      <v-col
        v-for="stat in userStats"
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

            <!-- Progress bar para alguns cards -->
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
      <!-- Minhas Tarefas Pendentes -->
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

      <!-- Painel lateral com ações rápidas e atividades -->
      <v-col cols="12" lg="4">
       
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
              :disabled="userPendingSignatures === 0"
            >
              <v-icon start>mdi-draw-pen</v-icon>
              Assinar Documentos
              <v-chip v-if="userPendingSignatures > 0" size="x-small" color="error" class="ml-2">
                {{ userPendingSignatures }}
              </v-chip>
            </v-btn>
            
            <v-btn
              block
              variant="outlined"
              @click="goToMyProcesses"
            >
              <v-icon start>mdi-folder-account</v-icon>
              Meus Processos
            </v-btn>
          </v-card-text>
        </v-card>

        <!-- Atividade Recente dos Meus Processos -->
        <v-card>
          <v-card-title class="d-flex align-center justify-space-between">
            <div class="d-flex align-center">
              <v-icon class="mr-2">mdi-history</v-icon>
              <span>Meus Processos Recentes</span>
            </div>
            <v-btn
              variant="text"
              size="small"
              color="primary"
              @click="goToMyProcesses"
            >
              Ver todos
            </v-btn>
          </v-card-title>
          
          <v-divider />

          <!-- Loading -->
          <v-progress-linear
            v-if="loadingMyProcesses"
            indeterminate
            color="primary"
          />

          <v-list
            v-if="!loadingMyProcesses && myRecentProcesses.length > 0"
            density="comfortable"
            lines="three"
          >
            <v-list-item
              v-for="(process, index) in myRecentProcesses.slice(0, 6)"
              :key="process.id"
              @click="viewProcess(process)"
              class="cursor-pointer"
            >
              <template v-slot:prepend>
                <v-avatar
                  :color="getProcessStatusColor(process.status)"
                  size="32"
                >
                  <v-icon
                    :icon="getProcessStatusIcon(process.status)"
                    size="16"
                    color="white"
                  />
                </v-avatar>
              </template>

              <v-list-item-title class="text-body-2 font-weight-medium">
                {{ process.title || process.code }}
              </v-list-item-title>
              
              <v-list-item-subtitle class="text-caption">
                <div>
                  <v-icon size="12">mdi-file-document-outline</v-icon>
                  {{ process.processType.name }}
                </div>
                <div class="mt-1">
                  <v-icon size="12">mdi-calendar</v-icon>
                  {{ getTimeAgo(process.createdAt) }}
                  <span class="mx-1">•</span>
                  <v-icon size="12">mdi-progress-check</v-icon>
                  {{ getCurrentStepName(process) }}
                </div>
              </v-list-item-subtitle>

              <template v-slot:append>
                <v-chip
                  :color="getProcessStatusColor(process.status)"
                  size="x-small"
                  variant="flat"
                  class="text-white"
                >
                  {{ getProcessStatusText(process.status) }}
                </v-chip>
              </template>
            </v-list-item>
          </v-list>

          <v-card-text
            v-else-if="!loadingMyProcesses && myRecentProcesses.length === 0"
            class="text-center py-6"
          >
            <v-icon size="48" color="grey-lighten-1">
              mdi-folder-outline
            </v-icon>
            <p class="text-body-2 text-grey mt-2">
              Nenhum processo criado ainda
            </p>
            <v-btn
              size="small"
              color="primary"
              variant="text"
              @click="createNewProcess"
              class="mt-2"
            >
              Criar primeiro processo
            </v-btn>
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
const loadingMyProcesses = ref(false)
const myRecentProcesses = ref([])

// Computed
const user = computed(() => authStore.user)
const activeCompany = computed(() => authStore.activeCompany)
const myTasks = computed(() => processStore.myTasks)

// Saudação baseada no horário
const greeting = computed(() => {
  const hour = new Date().getHours()
  if (hour < 12) return 'Bom dia!'
  if (hour < 18) return 'Boa tarde!'
  return 'Boa noite!'
})

// ✅ DADOS ESPECÍFICOS DO USUÁRIO - CORRIGIDOS
const userPendingTasks = computed(() => {
  return myTasks.value?.length || 0
})

const userPendingSignatures = computed(() => {
  if (!myTasks.value) return 0
  return myTasks.value.filter(task => task.step?.requiresSignature === true).length
})

const userActiveProcesses = computed(() => {
  return myRecentProcesses.value.filter(p => p.status === 'IN_PROGRESS').length
})

const userCompletedProcesses = computed(() => {
  return myRecentProcesses.value.filter(p => p.status === 'COMPLETED').length
})

// ✅ ESTATÍSTICAS FOCADAS NO USUÁRIO
const userStats = computed(() => [
  {
    title: 'Minhas Tarefas',
    value: userPendingTasks.value,
    subtitle: userPendingSignatures.value > 0 
      ? `${userPendingSignatures.value} requerem assinatura`
      : 'Tarefas aguardando sua ação',
    icon: 'mdi-clipboard-account',
    color: userPendingTasks.value > 5 ? 'warning' : 'info',
    action: () => router.push('/mytasks'),
  },
  {
    title: 'Assinaturas Pendentes',
    value: userPendingSignatures.value,
    subtitle: userPendingSignatures.value === 0 
      ? 'Nenhuma assinatura pendente' 
      : 'Documentos aguardando assinatura',
    icon: 'mdi-draw-pen',
    color: userPendingSignatures.value > 0 ? 'error' : 'success',
    action: () => router.push('/signatures/pending'),
  },
  {
    title: 'Processos Ativos',
    value: userActiveProcesses.value,
    subtitle: 'Processos criados por você em andamento',
    icon: 'mdi-rocket-launch',
    color: 'primary',
    action: () => router.push('/processes/my?status=IN_PROGRESS'),
    progress: userActiveProcesses.value > 0 ? Math.min((userActiveProcesses.value / 10) * 100, 100) : 0,
  },
  {
    title: 'Processos Concluídos',
    value: userCompletedProcesses.value,
    subtitle: getCompletionInsight(),
    icon: 'mdi-check-circle',
    color: 'success',
    action: () => router.push('/processes/my?status=COMPLETED'),
  }
])

// Métodos auxiliares
function getCompletionInsight() {
  const total = myRecentProcesses.value.length
  const completed = userCompletedProcesses.value
  if (total === 0) return 'Nenhum processo criado ainda'
  const percentage = Math.round((completed / total) * 100)
  return `${percentage}% dos seus processos`
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

function getProcessStatusColor(status) {
  const colors = {
    'DRAFT': 'grey',
    'IN_PROGRESS': 'info',
    'COMPLETED': 'success',
    'CANCELLED': 'warning',
    'REJECTED': 'error'
  }
  return colors[status] || 'grey'
}

function getProcessStatusIcon(status) {
  const icons = {
    'DRAFT': 'mdi-file-outline',
    'IN_PROGRESS': 'mdi-play-circle',
    'COMPLETED': 'mdi-check-circle',
    'CANCELLED': 'mdi-cancel',
    'REJECTED': 'mdi-close-circle'
  }
  return icons[status] || 'mdi-help-circle'
}

function getProcessStatusText(status) {
  const texts = {
    'DRAFT': 'Rascunho',
    'IN_PROGRESS': 'Em Andamento',
    'COMPLETED': 'Concluído',
    'CANCELLED': 'Cancelado',
    'REJECTED': 'Rejeitado'
  }
  return texts[status] || status
}

function getCurrentStepName(process) {
  const currentStep = process.stepExecutions?.find(se => se.status === 'IN_PROGRESS')
  return currentStep?.step?.name || 'Concluído'
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

function goToMyProcesses() {
  router.push('/processes/my')
}

function openTask(task) {
  router.push(`/processes/${task.processInstance.id}/execute/${task.id}`)
}

function viewProcess(process) {
  router.push(`/processes/${process.id}`)
}

// ✅ CARREGAR DADOS - USANDO ENDPOINTS CORRETOS
async function refreshTasks() {
  loadingTasks.value = true
  try {
    await processStore.fetchMyTasks()
  } finally {
    loadingTasks.value = false
  }
}

async function loadMyProcesses() {
  loadingMyProcesses.value = true
  try {
    // ✅ USANDO ENDPOINT CORRETO DO SEU BACKEND
    const response = await fetch('/api/processes/my/created', {
      headers: {
        'Authorization': `Bearer ${authStore.token}`,
        'Content-Type': 'application/json'
      }
    })
    
    if (response.ok) {
      const data = await response.json()
      myRecentProcesses.value = data
    } else {
      // ✅ FALLBACK: Extrair processos únicos das tarefas do usuário
      if (myTasks.value && myTasks.value.length > 0) {
        const processesFromTasks = myTasks.value.map(task => task.processInstance)
        const uniqueProcesses = processesFromTasks.filter((process, index, self) => 
          self.findIndex(p => p.id === process.id) === index
        ).filter(process => process.createdBy?.id === user.value?.id)
        
        myRecentProcesses.value = uniqueProcesses
      } else {
        myRecentProcesses.value = []
      }
    }
  } catch (error) {
    // Fallback: extrair de tarefas existentes
    if (myTasks.value && myTasks.value.length > 0) {
      const processesFromTasks = myTasks.value.map(task => task.processInstance)
      const uniqueProcesses = processesFromTasks.filter((process, index, self) => 
        self.findIndex(p => p.id === process.id) === index
      ).filter(process => process.createdBy?.id === user.value?.id)
      
      myRecentProcesses.value = uniqueProcesses
    } else {
      myRecentProcesses.value = []
    }
  } finally {
    loadingMyProcesses.value = false
  }
}

async function loadDashboardData() {
  try {
    await refreshTasks()
    await loadMyProcesses()
  } catch (error) {
    // Falha silenciosa
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