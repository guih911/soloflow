<template>
  <div v-if="subTasks.length > 0 || canCreateSubTask" class="sub-steps-container">
    <!-- Botão de adicionar sub-etapa -->
    <div v-if="canCreateSubTask" class="add-substep-wrapper">
      <v-btn
        variant="tonal"
        color="secondary"
        size="small"
        class="add-substep-btn"
        @click="$emit('create')"
      >
        <v-icon start size="18">mdi-plus-circle-outline</v-icon>
        Adicionar Sub-etapa
      </v-btn>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="text-center py-4">
      <v-progress-circular indeterminate size="24" color="primary" />
    </div>

    <!-- Lista de sub-etapas -->
    <div v-else-if="subTasks.length > 0" class="sub-steps-list">
      <div
        v-for="(subTask, index) in subTasks"
        :key="subTask.id"
        class="sub-step-item"
      >
        <!-- Conector visual -->
        <div class="sub-step-indicator">
          <div class="sub-step-connector-line" />
          <div
            class="sub-step-dot"
            :class="getSubStepDotClass(subTask)"
          >
            <v-icon v-if="subTask.status === 'COMPLETED'" size="14" color="white">
              mdi-check
            </v-icon>
            <v-icon v-else-if="subTask.status === 'IN_PROGRESS'" size="14" color="white">
              mdi-play
            </v-icon>
            <v-icon v-else-if="subTask.status === 'SKIPPED'" size="14" color="white">
              mdi-skip-next
            </v-icon>
          </div>
          <div
            v-if="index < subTasks.length - 1"
            class="sub-step-connector-bottom"
            :class="getConnectorClass(subTask)"
          />
        </div>

        <!-- Card da sub-etapa -->
        <v-card
          class="sub-step-card flex-grow-1 cursor-pointer"
          :class="getSubStepCardClass(subTask)"
          :elevation="subTask.status === 'IN_PROGRESS' ? 4 : 1"
          @click="openExecuteDialog(subTask)"
        >
          <div class="sub-step-header" :class="getSubStepHeaderClass(subTask)">
            <div class="d-flex align-center justify-space-between">
              <div class="d-flex align-center">
                <v-icon
                  :color="subTask.status === 'IN_PROGRESS' ? 'white' : 'secondary'"
                  class="mr-2"
                  size="20"
                >
                  mdi-subdirectory-arrow-right
                </v-icon>

                <div>
                  <div class="d-flex align-center gap-2">
                    <v-chip
                      size="x-small"
                      color="secondary"
                      variant="flat"
                      class="sub-step-badge"
                    >
                      Sub-etapa
                    </v-chip>
                    <h5
                      class="sub-step-title"
                      :class="{
                        'text-white': subTask.status === 'IN_PROGRESS',
                        'text-decoration-line-through': subTask.status === 'COMPLETED' || subTask.status === 'SKIPPED'
                      }"
                    >
                      {{ subTask.subTaskTemplate?.name || subTask.name || 'Sub-etapa' }}
                    </h5>
                  </div>
                  <p
                    v-if="subTask.subTaskTemplate?.description || subTask.description"
                    class="sub-step-description"
                    :class="subTask.status === 'IN_PROGRESS' ? 'text-white-secondary' : 'text-medium-emphasis'"
                  >
                    {{ subTask.subTaskTemplate?.description || subTask.description }}
                  </p>
                </div>
              </div>

              <div class="d-flex align-center gap-2">
                <v-chip
                  size="small"
                  :color="getStatusColor(subTask.status)"
                  :variant="subTask.status === 'IN_PROGRESS' ? 'flat' : 'tonal'"
                >
                  <v-icon start size="14">{{ getStatusIcon(subTask.status) }}</v-icon>
                  {{ getStatusLabel(subTask.status) }}
                </v-chip>
              </div>
            </div>
          </div>

          <div class="sub-step-body pa-3">
            <div class="d-flex align-center justify-space-between">
              <div class="sub-step-info-grid flex-grow-1">
                <!-- Responsável -->
                <div v-if="subTask.executor || subTask.executorId" class="info-item-small">
                  <v-icon size="14" color="primary" class="mr-1">mdi-account-check</v-icon>
                  <div>
                    <span class="info-label-small">Responsável</span>
                    <span class="info-value-small">{{ subTask.executor?.name || 'Atribuído' }}</span>
                  </div>
                </div>

                <!-- Prazo -->
                <div v-if="subTask.dueAt" class="info-item-small" :class="{ 'text-error': isOverdue(subTask) }">
                  <v-icon size="14" :color="isOverdue(subTask) ? 'error' : 'warning'" class="mr-1">
                    {{ isOverdue(subTask) ? 'mdi-clock-alert' : 'mdi-clock-outline' }}
                  </v-icon>
                  <div>
                    <span class="info-label-small">Prazo</span>
                    <span class="info-value-small">{{ formatDate(subTask.dueAt) }}</span>
                  </div>
                </div>

                <!-- Concluído em -->
                <div v-if="subTask.completedAt" class="info-item-small">
                  <v-icon size="14" color="success" class="mr-1">mdi-check-circle</v-icon>
                  <div>
                    <span class="info-label-small">Concluído em</span>
                    <span class="info-value-small">{{ formatDate(subTask.completedAt) }}</span>
                  </div>
                </div>
              </div>

              <!-- Indicador de clique -->
              <v-icon size="20" color="grey-lighten-1" class="ml-2">
                mdi-chevron-right
              </v-icon>
            </div>

            <!-- Menu de ações rápidas (para remover sub-etapa pendente) -->
            <div v-if="subTask.status === 'PENDING' && canManageSubTask(subTask)" class="sub-step-quick-actions mt-2">
              <v-btn
                size="x-small"
                variant="text"
                color="error"
                @click.stop="confirmDeleteSubTask(subTask)"
              >
                <v-icon start size="14">mdi-delete</v-icon>
                Remover
              </v-btn>
            </div>
          </div>
        </v-card>
      </div>
    </div>

    <!-- Diálogo de criar sub-etapa (interno - backup) -->
    <v-dialog v-model="showCreateDialog" max-width="500">
      <v-card>
        <v-card-title>Nova Sub-etapa</v-card-title>
        <v-card-text>
          <v-text-field
            v-model="newSubTask.name"
            label="Nome da sub-etapa"
            variant="outlined"
            density="comfortable"
            :rules="[v => !!v || 'Nome é obrigatório']"
          />
          <v-textarea
            v-model="newSubTask.description"
            label="Descrição (opcional)"
            variant="outlined"
            density="comfortable"
            rows="2"
          />
          <v-select
            v-model="newSubTask.assignedToUserId"
            :items="availableUsers"
            item-title="name"
            item-value="id"
            label="Responsável (opcional)"
            variant="outlined"
            density="comfortable"
            clearable
          />
          <v-text-field
            v-model.number="newSubTask.slaHours"
            label="Prazo em horas (opcional)"
            type="number"
            variant="outlined"
            density="comfortable"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showCreateDialog = false">Cancelar</v-btn>
          <v-btn
            color="primary"
            variant="elevated"
            :loading="creating"
            :disabled="!newSubTask.name"
            @click="createSubTask"
          >
            Criar
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Diálogo de confirmação de exclusão -->
    <v-dialog v-model="showDeleteDialog" max-width="400">
      <v-card>
        <v-card-title>Remover Sub-etapa</v-card-title>
        <v-card-text>
          Tem certeza que deseja remover esta sub-etapa?
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showDeleteDialog = false">Cancelar</v-btn>
          <v-btn color="error" variant="elevated" @click="deleteSubTask">
            Remover
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Diálogo de execução de sub-etapa -->
    <ExecuteSubStepDialog
      v-model="showExecuteDialog"
      :sub-step="selectedSubTask"
      :step-status="stepStatus"
      @executed="handleSubTaskExecuted"
    />
  </div>

  <!-- Container vazio quando não há sub-etapas e não pode criar (para manter os diálogos) -->
  <template v-else>
    <!-- Nada a mostrar -->
  </template>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import api from '@/services/api'
import dayjs from 'dayjs'
import ExecuteSubStepDialog from '@/components/ExecuteSubStepDialog.vue'

const props = defineProps({
  stepExecutionId: {
    type: String,
    required: true
  },
  stepStatus: {
    type: String,
    default: 'PENDING'
  },
  canUserManage: {
    type: Boolean,
    default: false
  },
  users: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['updated', 'create'])

const authStore = useAuthStore()

const loading = ref(false)
const creating = ref(false)
const showCreateDialog = ref(false)
const showDeleteDialog = ref(false)
const showExecuteDialog = ref(false)
const subTaskToDelete = ref(null)
const selectedSubTask = ref(null)

// Estado local de sub-tarefas (não compartilhado entre componentes)
const localSubTasks = ref([])

const newSubTask = ref({
  name: '',
  description: '',
  assignedToUserId: null,
  slaHours: null
})

const subTasks = computed(() => localSubTasks.value)
const availableUsers = computed(() => props.users)

const completedCount = computed(() => {
  return subTasks.value.filter(st =>
    st.status === 'COMPLETED' || st.status === 'SKIPPED'
  ).length
})

const allCompleted = computed(() => {
  if (subTasks.value.length === 0) return true
  return completedCount.value === subTasks.value.length
})

// Verifica se há sub-tarefas obrigatórias pendentes
const hasRequiredPendingSubTasks = computed(() => {
  return subTasks.value.some(st =>
    st.subTaskTemplate?.isRequired &&
    st.status !== 'COMPLETED' &&
    st.status !== 'SKIPPED'
  )
})

const canCreateSubTask = computed(() => {
  // Só pode criar se a etapa está em progresso
  if (props.stepStatus !== 'IN_PROGRESS') return false
  
  // Só pode criar se o usuário tem permissão para gerenciar a etapa
  if (!props.canUserManage) return false
  
  // Bloquear criação se houver sub-tarefas obrigatórias pendentes
  if (hasRequiredPendingSubTasks.value) return false
  
  return true
})

function canExecuteSubTask(subTask) {
  if (props.stepStatus !== 'IN_PROGRESS') return false
  if (subTask.status === 'COMPLETED' || subTask.status === 'CANCELLED') return false

  // Verificar se o usuário é o executor ou se não tem executor definido
  if (!subTask.executorId) return true
  return subTask.executorId === authStore.user?.id
}

function canManageSubTask(subTask) {
  return props.stepStatus === 'IN_PROGRESS' &&
    subTask.status !== 'COMPLETED' &&
    subTask.status !== 'CANCELLED'
}

function getSubStepDotClass(subTask) {
  const classes = ['sub-step-dot-inner']
  switch (subTask.status) {
    case 'COMPLETED':
      classes.push('dot-completed')
      break
    case 'IN_PROGRESS':
      classes.push('dot-active')
      break
    case 'SKIPPED':
      classes.push('dot-skipped')
      break
    default:
      classes.push('dot-pending')
  }
  return classes.join(' ')
}

function getConnectorClass(subTask) {
  return subTask.status === 'COMPLETED' || subTask.status === 'SKIPPED'
    ? 'connector-completed'
    : 'connector-pending'
}

function getSubStepCardClass(subTask) {
  const classes = []
  if (subTask.status === 'IN_PROGRESS') classes.push('card-active')
  if (subTask.status === 'COMPLETED') classes.push('card-completed')
  if (subTask.status === 'SKIPPED') classes.push('card-skipped')
  return classes.join(' ')
}

function getSubStepHeaderClass(subTask) {
  const classes = ['sub-step-header-inner']
  if (subTask.status === 'IN_PROGRESS') classes.push('header-active')
  return classes.join(' ')
}

function getStatusColor(status) {
  const colors = {
    PENDING: 'grey',
    IN_PROGRESS: 'warning',
    COMPLETED: 'success',
    SKIPPED: 'grey',
    CANCELLED: 'error'
  }
  return colors[status] || 'grey'
}

function getStatusIcon(status) {
  const icons = {
    PENDING: 'mdi-clock-outline',
    IN_PROGRESS: 'mdi-progress-clock',
    COMPLETED: 'mdi-check',
    SKIPPED: 'mdi-skip-next',
    CANCELLED: 'mdi-close'
  }
  return icons[status] || 'mdi-help'
}

function getStatusLabel(status) {
  const labels = {
    PENDING: 'Pendente',
    IN_PROGRESS: 'Em andamento',
    COMPLETED: 'Concluída',
    SKIPPED: 'Pulada',
    CANCELLED: 'Cancelada'
  }
  return labels[status] || status
}

function formatDate(date) {
  return dayjs(date).format('DD/MM HH:mm')
}

function isOverdue(subTask) {
  if (!subTask.dueAt) return false
  if (subTask.status === 'COMPLETED' || subTask.status === 'SKIPPED') return false
  return dayjs().isAfter(dayjs(subTask.dueAt))
}

async function loadSubTasks() {
  loading.value = true
  try {
    const response = await api.get(`/sub-tasks/step-execution/${props.stepExecutionId}`)
    localSubTasks.value = response.data || []
  } catch (err) {
    console.error('Erro ao carregar sub-etapas:', err)
    localSubTasks.value = []
  } finally {
    loading.value = false
  }
}

async function toggleSubTask(subTask) {
  const newStatus = subTask.status === 'COMPLETED' ? 'PENDING' : 'COMPLETED'
  try {
    const response = await api.post('/sub-tasks/execute', {
      subTaskId: subTask.id,
      status: newStatus
    })
    // Atualizar na lista local
    const index = localSubTasks.value.findIndex(st => st.id === subTask.id)
    if (index !== -1) {
      localSubTasks.value[index] = response.data
    }
    emit('updated')
  } catch (err) {
    window.showSnackbar?.('Erro ao atualizar sub-etapa', 'error')
  }
}

async function startSubTask(subTask) {
  try {
    const response = await api.post('/sub-tasks/execute', {
      subTaskId: subTask.id,
      status: 'IN_PROGRESS'
    })
    // Atualizar na lista local
    const index = localSubTasks.value.findIndex(st => st.id === subTask.id)
    if (index !== -1) {
      localSubTasks.value[index] = response.data
    }
    emit('updated')
  } catch (err) {
    window.showSnackbar?.('Erro ao iniciar sub-etapa', 'error')
  }
}

async function completeSubTask(subTask) {
  try {
    const response = await api.post('/sub-tasks/execute', {
      subTaskId: subTask.id,
      status: 'COMPLETED'
    })
    // Atualizar na lista local
    const index = localSubTasks.value.findIndex(st => st.id === subTask.id)
    if (index !== -1) {
      localSubTasks.value[index] = response.data
    }
    emit('updated')
    window.showSnackbar?.('Sub-etapa concluída!', 'success')
  } catch (err) {
    window.showSnackbar?.('Erro ao concluir sub-etapa', 'error')
  }
}

async function skipSubTask(subTask) {
  try {
    const response = await api.post('/sub-tasks/execute', {
      subTaskId: subTask.id,
      status: 'SKIPPED'
    })
    // Atualizar na lista local
    const index = localSubTasks.value.findIndex(st => st.id === subTask.id)
    if (index !== -1) {
      localSubTasks.value[index] = response.data
    }
    emit('updated')
  } catch (err) {
    window.showSnackbar?.('Erro ao pular sub-etapa', 'error')
  }
}

function confirmDeleteSubTask(subTask) {
  subTaskToDelete.value = subTask
  showDeleteDialog.value = true
}

async function deleteSubTask() {
  if (!subTaskToDelete.value) return

  try {
    await api.delete(`/sub-tasks/${subTaskToDelete.value.id}`)
    // Remover da lista local
    localSubTasks.value = localSubTasks.value.filter(st => st.id !== subTaskToDelete.value.id)
    showDeleteDialog.value = false
    subTaskToDelete.value = null
    emit('updated')
    window.showSnackbar?.('Sub-etapa removida', 'success')
  } catch (err) {
    window.showSnackbar?.('Erro ao remover sub-etapa', 'error')
  }
}

async function createSubTask() {
  if (!newSubTask.value.name) return

  creating.value = true
  try {
    const response = await api.post('/sub-tasks', {
      stepExecutionId: props.stepExecutionId,
      name: newSubTask.value.name,
      description: newSubTask.value.description || undefined,
      assignedToUserId: newSubTask.value.assignedToUserId || undefined,
      slaHours: newSubTask.value.slaHours || undefined
    })
    // Adicionar na lista local
    localSubTasks.value.push(response.data)

    showCreateDialog.value = false
    newSubTask.value = {
      name: '',
      description: '',
      assignedToUserId: null,
      slaHours: null
    }
    emit('updated')
    window.showSnackbar?.('Sub-etapa criada!', 'success')
  } catch (err) {
    window.showSnackbar?.('Erro ao criar sub-etapa', 'error')
  } finally {
    creating.value = false
  }
}

function openExecuteDialog(subTask) {
  selectedSubTask.value = subTask
  showExecuteDialog.value = true
}

function handleSubTaskExecuted(updatedSubTask) {
  // Atualizar na lista local
  const index = localSubTasks.value.findIndex(st => st.id === updatedSubTask.id)
  if (index !== -1) {
    localSubTasks.value[index] = updatedSubTask
  }
  emit('updated')
}

watch(() => props.stepExecutionId, (newId) => {
  if (newId) {
    loadSubTasks()
  }
}, { immediate: true })

onMounted(() => {
  if (props.stepExecutionId) {
    loadSubTasks()
  }
})
</script>

<style scoped>
.sub-steps-container {
  margin-top: 16px;
  margin-left: 72px;
  padding-left: 16px;
  border-left: 2px dashed rgba(156, 39, 176, 0.3);
}

.add-substep-wrapper {
  margin-bottom: 16px;
}

.add-substep-btn {
  border-radius: 8px;
  text-transform: none;
  font-weight: 500;
}

.sub-steps-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.sub-step-item {
  display: flex;
  gap: 12px;
}

.sub-step-indicator {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 24px;
}

.sub-step-connector-line {
  position: absolute;
  top: 0;
  width: 2px;
  height: 12px;
  background: rgba(156, 39, 176, 0.3);
}

.sub-step-dot {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1;
  margin-top: 12px;
}

.sub-step-dot-inner {
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
  transition: all 0.3s ease;
}

.dot-completed {
  background: linear-gradient(135deg, #4CAF50, #45a049);
}

.dot-active {
  background: linear-gradient(135deg, #FF9800, #f57c00);
  animation: pulse-small 2s infinite;
}

.dot-skipped {
  background: linear-gradient(135deg, #9E9E9E, #757575);
}

.dot-pending {
  background: linear-gradient(135deg, #BDBDBD, #9E9E9E);
}

@keyframes pulse-small {
  0% {
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15), 0 0 0 0 rgba(255, 152, 0, 0.5);
  }
  70% {
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15), 0 0 0 6px rgba(255, 152, 0, 0);
  }
  100% {
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15), 0 0 0 0 rgba(255, 152, 0, 0);
  }
}

.sub-step-connector-bottom {
  position: absolute;
  top: 36px;
  width: 2px;
  height: calc(100% - 24px);
  transition: all 0.3s ease;
}

.connector-completed {
  background: linear-gradient(180deg, #4CAF50, #45a049);
}

.connector-pending {
  background: rgba(156, 39, 176, 0.2);
}

.sub-step-card {
  border-radius: 12px;
  border: 1px solid rgba(156, 39, 176, 0.15);
  transition: all 0.3s ease;
  overflow: hidden;
}

.sub-step-card:hover {
  transform: translateY(-1px);
}

.card-active {
  border-color: rgba(255, 152, 0, 0.3);
  box-shadow: 0 4px 16px rgba(255, 152, 0, 0.15);
}

.card-completed {
  border-color: rgba(76, 175, 80, 0.3);
  background: rgba(76, 175, 80, 0.02);
}

.card-skipped {
  border-color: rgba(158, 158, 158, 0.3);
  background: rgba(158, 158, 158, 0.02);
  opacity: 0.8;
}

.sub-step-header {
  padding: 12px 16px;
  background: white;
  transition: all 0.3s ease;
}

.header-active {
  background: linear-gradient(135deg, #FF9800, #f57c00);
  color: white;
}

.sub-step-badge {
  font-size: 10px;
  height: 18px;
  padding: 0 6px;
}

.sub-step-title {
  font-size: 0.95rem;
  font-weight: 600;
  margin: 0;
  line-height: 1.3;
}

.sub-step-description {
  font-size: 0.8rem;
  margin: 2px 0 0 0;
  line-height: 1.3;
}

.text-white-secondary {
  color: rgba(255, 255, 255, 0.85);
}

.sub-step-body {
  background: white;
}

.sub-step-info-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.info-item-small {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 10px;
  background: rgba(156, 39, 176, 0.04);
  border-radius: 8px;
  border: 1px solid rgba(156, 39, 176, 0.1);
}

.info-label-small {
  display: block;
  font-size: 0.65rem;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.5);
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.info-value-small {
  display: block;
  font-size: 0.75rem;
  font-weight: 500;
  color: rgba(0, 0, 0, 0.8);
}

.sub-step-actions {
  border-top: 1px solid rgba(0, 0, 0, 0.06);
  padding-top: 12px;
}

.sub-step-quick-actions {
  border-top: 1px solid rgba(0, 0, 0, 0.06);
  padding-top: 8px;
}

.cursor-pointer {
  cursor: pointer;
}

.gap-2 {
  gap: 8px;
}

/* Responsivo */
@media (max-width: 768px) {
  .sub-steps-container {
    margin-left: 24px;
    padding-left: 12px;
  }

  .sub-step-info-grid {
    flex-direction: column;
    gap: 8px;
  }
}
</style>
