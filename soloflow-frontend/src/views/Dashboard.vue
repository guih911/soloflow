<template>
  <div class="dashboard">
    <!-- Page Header -->
    <div class="page-header">
      <div class="header-content">
        <h1 class="page-title">{{ greeting }}, {{ user?.name?.split(' ')[0] }}!</h1>
        <p class="page-subtitle">
          Aqui está o resumo das suas atividades em <span class="company-name">{{ activeCompany?.name }}</span>
        </p>
      </div>
      <div class="header-actions">
        <v-btn
          color="primary"
          variant="flat"
          @click="createNewProcess"
          class="new-process-btn"
        >
          <v-icon start>mdi-plus</v-icon>
          Novo Processo
        </v-btn>
      </div>
    </div>

    <!-- Stats Cards -->
    <div class="stats-grid" role="list" aria-label="Estatísticas do usuário">
      <div
        v-for="stat in userStats"
        :key="stat.title"
        class="stat-card"
        :class="[`stat-card--${stat.colorClass}`, { 'stat-card--clickable': stat.action }]"
        role="listitem"
        :aria-label="`${stat.title}: ${stat.value}`"
        :tabindex="stat.action ? 0 : -1"
        @click="stat.action && stat.action()"
        @keydown.enter="stat.action && stat.action()"
      >
        <div class="stat-card__content">
          <div class="stat-card__icon" :class="`stat-card__icon--${stat.colorClass}`">
            <v-icon :icon="stat.icon" size="24" />
          </div>
          <div class="stat-card__info">
            <span class="stat-card__label">{{ stat.title }}</span>
            <span class="stat-card__value">{{ stat.value }}</span>
          </div>
          <v-icon
            v-if="stat.action"
            class="stat-card__arrow"
            size="20"
            aria-hidden="true"
          >
            mdi-chevron-right
          </v-icon>
        </div>
        <div v-if="stat.progress !== undefined" class="stat-card__progress">
          <div
            class="stat-card__progress-bar"
            :class="`stat-card__progress-bar--${stat.colorClass}`"
            :style="{ width: `${stat.progress}%` }"
            role="progressbar"
            :aria-valuenow="stat.progress"
            aria-valuemin="0"
            aria-valuemax="100"
          ></div>
        </div>
      </div>
    </div>

    <!-- Main Content Grid -->
    <div class="content-grid">
      <!-- Tasks Section -->
      <div class="content-card tasks-card">
        <div class="card-header">
          <div class="card-header__left">
            <v-icon color="primary" class="mr-2">mdi-checkbox-marked-circle-outline</v-icon>
            <h2 class="card-title">Minhas Tarefas</h2>
            <v-chip v-if="myTasks.length > 0" size="small" color="primary" variant="tonal" class="ml-2">
              {{ myTasks.length }}
            </v-chip>
          </div>
          <div class="card-header__right">
            <v-btn
              variant="text"
              size="small"
              @click="refreshTasks"
              :loading="loadingTasks"
            >
              <v-icon start size="18">mdi-refresh</v-icon>
              Atualizar
            </v-btn>
            <v-btn
              variant="text"
              size="small"
              color="primary"
              @click="goToTasks"
            >
              Ver todas
              <v-icon end size="18">mdi-arrow-right</v-icon>
            </v-btn>
          </div>
        </div>

        <!-- Loading State - Skeleton -->
        <div v-if="loadingTasks" class="loading-state" aria-label="Carregando tarefas">
          <v-skeleton-loader
            type="list-item-avatar-two-line@3"
            class="skeleton-tasks"
          />
        </div>

        <!-- Tasks List -->
        <div v-else-if="myTasks.length > 0" class="tasks-list" role="list" aria-label="Lista de tarefas pendentes">
          <div
            v-for="task in myTasks.slice(0, 5)"
            :key="task.id"
            class="task-item"
            :class="{ 'task-item--urgent': isUrgentTask(task) }"
            role="listitem"
            :aria-label="`Tarefa ${task.processInstance.code}: ${task.step.name}`"
            tabindex="0"
            @click="openTask(task)"
            @keydown.enter="openTask(task)"
          >
            <div class="task-item__avatar">
              <v-avatar :color="getStepTypeColor(task.step.type)" size="42">
                <v-icon :icon="getStepTypeIcon(task.step.type)" size="20" color="white" />
              </v-avatar>
            </div>
            <div class="task-item__content">
              <div class="task-item__header">
                <span class="task-item__title">
                  {{ task.processInstance.title || task.processInstance.code }}
                </span>
                <div class="task-item__badges">
                  <v-chip
                    v-if="task.step.requiresSignature"
                    size="x-small"
                    color="error"
                    variant="flat"
                  >
                    <v-icon start size="12">mdi-draw-pen</v-icon>
                    Assinatura
                  </v-chip>
                  <v-chip
                    size="x-small"
                    :color="getTaskPriorityColor(task)"
                    variant="tonal"
                  >
                    {{ task.processInstance.code }}
                  </v-chip>
                </div>
              </div>
              <div class="task-item__meta">
                <span class="meta-item">
                  <v-icon size="14">mdi-file-document-outline</v-icon>
                  {{ task.processInstance.processType.name }}
                </span>
                <span class="meta-divider">•</span>
                <span class="meta-item">
                  <v-icon size="14">mdi-arrow-right-circle-outline</v-icon>
                  {{ task.step.name }}
                </span>
                <span class="meta-divider">•</span>
                <span class="meta-item">
                  <v-icon size="14">mdi-clock-outline</v-icon>
                  {{ getTimeAgo(task.createdAt) }}
                </span>
              </div>
            </div>
            <div class="task-item__action">
              <v-btn
                variant="tonal"
                color="primary"
                size="small"
                @click.stop="openTask(task)"
              >
                Executar
              </v-btn>
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <div v-else class="empty-state">
          <div class="empty-state__icon">
            <v-icon size="40">mdi-checkbox-marked-circle-outline</v-icon>
          </div>
          <h3 class="empty-state__title">Tudo em dia!</h3>
          <p class="empty-state__description">
            Você não tem tarefas pendentes no momento.
          </p>
        </div>
      </div>

      <!-- Sidebar -->
      <div class="sidebar-content">
        <!-- Quick Actions -->
        <div class="content-card quick-actions-card">
          <div class="card-header">
            <v-icon color="primary" class="mr-2">mdi-lightning-bolt</v-icon>
            <h2 class="card-title">Ações Rápidas</h2>
          </div>
          <div class="quick-actions">
            <v-btn
              block
              color="primary"
              variant="flat"
              class="quick-action-btn"
              @click="createNewProcess"
            >
              <v-icon start>mdi-plus</v-icon>
              Novo Processo
            </v-btn>
            <v-btn
              block
              variant="outlined"
              class="quick-action-btn"
              @click="goToSignatures"
              :disabled="userPendingSignatures === 0"
            >
              <v-icon start>mdi-draw-pen</v-icon>
              Assinar Documentos
              <v-chip
                v-if="userPendingSignatures > 0"
                size="x-small"
                color="error"
                variant="flat"
                class="ml-2"
              >
                {{ userPendingSignatures }}
              </v-chip>
            </v-btn>
            <v-btn
              block
              variant="outlined"
              class="quick-action-btn"
              @click="goToMyProcesses"
            >
              <v-icon start>mdi-folder-account-outline</v-icon>
              Meus Processos
            </v-btn>
          </div>
        </div>

        <!-- Recent Processes -->
        <div class="content-card recent-processes-card">
          <div class="card-header">
            <div class="card-header__left">
              <v-icon color="primary" class="mr-2">mdi-history</v-icon>
              <h2 class="card-title">Processos Recentes</h2>
            </div>
            <v-btn
              variant="text"
              size="small"
              color="primary"
              @click="goToMyProcesses"
            >
              Ver todos
            </v-btn>
          </div>

          <!-- Loading State - Skeleton -->
          <div v-if="loadingMyProcesses" class="loading-state loading-state--small" aria-label="Carregando processos">
            <v-skeleton-loader
              type="list-item-avatar@4"
              class="skeleton-recent"
            />
          </div>

          <!-- Processes List -->
          <div v-else-if="myRecentProcesses.length > 0" class="recent-list">
            <div
              v-for="process in myRecentProcesses.slice(0, 4)"
              :key="process.id"
              class="recent-item"
              @click="viewProcess(process)"
            >
              <v-avatar
                :color="getProcessStatusColor(process.status)"
                size="36"
                class="recent-item__avatar"
              >
                <v-icon :icon="getProcessStatusIcon(process.status)" size="18" color="white" />
              </v-avatar>
              <div class="recent-item__content">
                <span class="recent-item__title">
                  {{ process.code }}{{ process.title ? ` - ${process.title}` : '' }}
                </span>
                <span class="recent-item__meta">
                  {{ process.processType.name }} • {{ getTimeAgo(process.createdAt) }}
                </span>
              </div>
              <v-chip
                :color="getProcessStatusColor(process.status)"
                size="x-small"
                variant="flat"
              >
                {{ getProcessStatusText(process.status) }}
              </v-chip>
            </div>
          </div>

          <!-- Empty State -->
          <div v-else class="empty-state empty-state--small">
            <v-icon size="32" color="grey-lighten-1">mdi-folder-outline</v-icon>
            <p class="empty-state__description">Nenhum processo criado</p>
            <v-btn
              size="small"
              color="primary"
              variant="text"
              @click="createNewProcess"
            >
              Criar primeiro processo
            </v-btn>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
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

// State
const loadingTasks = ref(false)
const loadingMyProcesses = ref(false)
const myRecentProcesses = ref([])

// Computed
const user = computed(() => authStore.user)
const activeCompany = computed(() => authStore.activeCompany)
const myTasks = computed(() => processStore.myTasks || [])

const greeting = computed(() => {
  const hour = new Date().getHours()
  if (hour < 12) return 'Bom dia'
  if (hour < 18) return 'Boa tarde'
  return 'Boa noite'
})

const userPendingTasks = computed(() => myTasks.value.length)

const userPendingSignatures = computed(() => {
  if (!myTasks.value) return 0
  return myTasks.value.filter(task => {
    if (!task.hasValidSignatureRequirements) return false
    const hasPdfAttachments = task.attachments?.some(att =>
      att.mimeType === 'application/pdf' && !att.isSigned
    )
    return hasPdfAttachments
  }).length
})

const userActiveProcesses = computed(() =>
  myRecentProcesses.value.filter(p => p.status === 'IN_PROGRESS').length
)

const userCompletedProcesses = computed(() =>
  myRecentProcesses.value.filter(p => p.status === 'COMPLETED').length
)

const userStats = computed(() => [
  {
    title: 'Minhas Tarefas',
    value: userPendingTasks.value,
    subtitle: userPendingSignatures.value > 0
      ? `${userPendingSignatures.value} requerem assinatura`
      : 'Tarefas aguardando ação',
    icon: 'mdi-checkbox-marked-circle-outline',
    colorClass: userPendingTasks.value > 5 ? 'warning' : 'info',
    action: () => router.push('/minhas-tarefas'),
  },
  {
    title: 'Assinaturas',
    value: userPendingSignatures.value,
    subtitle: userPendingSignatures.value === 0 ? 'Nenhuma pendente' : 'Documentos para assinar',
    icon: 'mdi-draw-pen',
    colorClass: userPendingSignatures.value > 0 ? 'error' : 'success',
    action: () => router.push('/assinaturas/pendentes'),
  },
  {
    title: 'Em Andamento',
    value: userActiveProcesses.value,
    subtitle: 'Processos ativos',
    icon: 'mdi-rocket-launch-outline',
    colorClass: 'primary',
    action: () => router.push('/meus-processos?status=IN_PROGRESS'),
    progress: userActiveProcesses.value > 0 ? Math.min((userActiveProcesses.value / 10) * 100, 100) : 0,
  },
  {
    title: 'Concluídos',
    value: userCompletedProcesses.value,
    subtitle: getCompletionInsight(),
    icon: 'mdi-check-circle-outline',
    colorClass: 'success',
    action: () => router.push('/meus-processos?status=COMPLETED'),
  }
])

// Methods
function getCompletionInsight() {
  const total = myRecentProcesses.value.length
  const completed = userCompletedProcesses.value
  if (total === 0) return 'Nenhum processo'
  const percentage = Math.round((completed / total) * 100)
  return `${percentage}% concluídos`
}

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

function getTaskPriorityColor(task) {
  const daysOpen = dayjs().diff(dayjs(task.createdAt), 'day')
  if (daysOpen > 3) return 'error'
  if (daysOpen > 1) return 'warning'
  return 'info'
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

// Navigation
function createNewProcess() {
  router.push('/processos')
}

function goToTasks() {
  router.push('/minhas-tarefas')
}

function goToSignatures() {
  router.push('/assinaturas/pendentes')
}

function goToMyProcesses() {
  router.push({ name: 'MeusProcessos' })
}

function openTask(task) {
  router.push(`/processos/${task.processInstance.id}`)
}

function viewProcess(process) {
  router.push(`/processos/${process.id}`)
}

// Data Loading
async function refreshTasks() {
  loadingTasks.value = true
  try {
    await processStore.fetchMyTasks()
  } finally {
    loadingTasks.value = false
  }
}

function extractProcessesFromTasks() {
  if (!myTasks.value?.length || !user.value?.id) return []
  const seen = new Set()
  return myTasks.value
    .map(task => task.processInstance)
    .filter(process => {
      if (!process?.id || process.createdBy?.id !== user.value.id) return false
      if (seen.has(process.id)) return false
      seen.add(process.id)
      return true
    })
}

async function loadMyProcesses() {
  loadingMyProcesses.value = true
  try {
    const data = await processStore.fetchMyCreatedProcesses()
    myRecentProcesses.value = Array.isArray(data) ? data : []
  } catch (error) {
    myRecentProcesses.value = extractProcessesFromTasks()
  } finally {
    if (!myRecentProcesses.value.length) {
      myRecentProcesses.value = extractProcessesFromTasks()
    }
    loadingMyProcesses.value = false
  }
}

async function loadDashboardData() {
  try {
    await refreshTasks()
    await loadMyProcesses()
  } catch (error) {
    // Silent error
  }
}

onMounted(() => {
  loadDashboardData()
})

watch(
  () => activeCompany.value?.companyId,
  (newCompanyId, oldCompanyId) => {
    if (newCompanyId && newCompanyId !== oldCompanyId) {
      loadDashboardData()
    }
  }
)
</script>

<style scoped>
.dashboard {
  max-width: 1400px;
  margin: 0 auto;
}

/* Page Header */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 32px;
  gap: 24px;
  flex-wrap: wrap;
}

.page-title {
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--color-neutral-900);
  margin: 0 0 4px 0;
  line-height: 1.3;
}

.page-subtitle {
  font-size: 0.9375rem;
  color: var(--color-neutral-500);
  margin: 0;
}

.company-name {
  font-weight: 600;
  color: var(--color-primary-600);
}

.new-process-btn {
  font-weight: 600;
}

/* Stats Grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 32px;
}

@media (max-width: 1200px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 600px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }
}

.stat-card {
  background: var(--color-surface);
  border: 1px solid var(--color-surface-border);
  border-radius: 16px;
  padding: 20px;
  transition: all 0.2s ease;
  position: relative;
  overflow: hidden;
}

.stat-card--clickable {
  cursor: pointer;
}

.stat-card--clickable:hover {
  border-color: var(--color-primary-200);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  transform: translateY(-2px);
}

.stat-card__content {
  display: flex;
  align-items: flex-start;
  gap: 16px;
}

.stat-card__icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.stat-card__icon--primary {
  background: var(--color-primary-100);
  color: var(--color-primary-600);
}

.stat-card__icon--info {
  background: var(--color-info-50);
  color: var(--color-info-600);
}

.stat-card__icon--success {
  background: var(--color-success-50);
  color: var(--color-success-600);
}

.stat-card__icon--warning {
  background: var(--color-warning-50);
  color: var(--color-warning-600);
}

.stat-card__icon--error {
  background: var(--color-error-50);
  color: var(--color-error-600);
}

.stat-card__info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.stat-card__label {
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--color-neutral-500);
}

.stat-card__value {
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--color-neutral-900);
  line-height: 1.2;
}

.stat-card__arrow {
  color: var(--color-neutral-300);
  transition: all 0.2s ease;
  flex-shrink: 0;
  margin-left: auto;
}

.stat-card--clickable:hover .stat-card__arrow {
  color: var(--color-primary-500);
  transform: translateX(2px);
}

.stat-card--clickable:focus {
  outline: 2px solid var(--color-primary-300);
  outline-offset: 2px;
}

.stat-card__subtitle {
  font-size: 0.75rem;
  color: var(--color-neutral-400);
}

.stat-card__progress {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: var(--color-neutral-100);
}

.stat-card__progress-bar {
  height: 100%;
  border-radius: 0 2px 0 0;
  transition: width 0.3s ease;
}

.stat-card__progress-bar--primary {
  background: var(--color-primary-500);
}

/* Content Grid */
.content-grid {
  display: grid;
  grid-template-columns: 1fr 380px;
  gap: 24px;
}

@media (max-width: 1100px) {
  .content-grid {
    grid-template-columns: 1fr;
  }
}

/* Content Card */
.content-card {
  background: var(--color-surface);
  border: 1px solid var(--color-surface-border);
  border-radius: 16px;
  overflow: hidden;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid var(--color-surface-border);
}

.card-header__left {
  display: flex;
  align-items: center;
}

.card-header__right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.card-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-neutral-800);
  margin: 0;
}

/* Tasks List */
.tasks-list {
  padding: 8px;
}

.task-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.task-item:hover {
  background: var(--color-neutral-50);
}

.task-item--urgent {
  background: var(--color-error-50);
  border-left: 3px solid var(--color-error-500);
}

.task-item__avatar {
  flex-shrink: 0;
}

.task-item__content {
  flex: 1;
  min-width: 0;
}

.task-item__header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
  flex-wrap: wrap;
}

.task-item__title {
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--color-neutral-800);
}

.task-item__badges {
  display: flex;
  gap: 6px;
}

.task-item__meta {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
  font-size: 0.8125rem;
  color: var(--color-neutral-500);
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.meta-divider {
  color: var(--color-neutral-300);
}

.task-item__action {
  flex-shrink: 0;
}

/* Quick Actions */
.quick-actions-card {
  margin-bottom: 16px;
}

.quick-actions {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.quick-action-btn {
  justify-content: flex-start;
  font-weight: 500;
}

/* Recent Processes */
.recent-list {
  padding: 8px;
}

.recent-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.recent-item:hover {
  background: var(--color-neutral-50);
}

.recent-item__avatar {
  flex-shrink: 0;
}

.recent-item__content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.recent-item__title {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-neutral-800);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.recent-item__meta {
  font-size: 0.75rem;
  color: var(--color-neutral-500);
}

/* Loading State */
.loading-state {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 48px;
}

.loading-state--small {
  padding: 32px;
}

.skeleton-tasks {
  width: 100%;
  padding: 0 16px;
}

.skeleton-tasks :deep(.v-skeleton-loader__bone) {
  margin-bottom: 8px;
}

.skeleton-recent {
  width: 100%;
  padding: 0 8px;
}

/* Empty State */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  text-align: center;
}

.empty-state--small {
  padding: 32px 16px;
}

.empty-state__icon {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: var(--color-neutral-100);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-neutral-400);
  margin-bottom: 16px;
}

.empty-state__title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-neutral-700);
  margin: 0 0 4px 0;
}

.empty-state__description {
  font-size: 0.875rem;
  color: var(--color-neutral-500);
  margin: 0;
}

/* Sidebar Content */
.sidebar-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

@media (max-width: 600px) {
  .page-header {
    flex-direction: column;
    align-items: stretch;
  }

  .header-actions {
    width: 100%;
  }

  .new-process-btn {
    width: 100%;
  }

  .task-item {
    flex-wrap: wrap;
  }

  .task-item__action {
    width: 100%;
    margin-top: 8px;
  }

  .task-item__action .v-btn {
    width: 100%;
  }
}
</style>