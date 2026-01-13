<template>
  <v-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    max-width="1000"
    scrollable
  >
    <v-card class="step-preview-modal">
      <!-- Header -->
      <v-card-title class="modal-header d-flex align-center pa-0">
        <div class="header-content d-flex align-center justify-space-between w-100 pa-4">
          <div class="d-flex align-center">
            <v-icon size="24" color="white" class="mr-3">mdi-view-list</v-icon>
            <div>
              <h2 class="text-h6 font-weight-bold text-white">
                Etapas do Processo
              </h2>
              <p class="text-caption text-white-70 mb-0">
                {{ completedSteps }} de {{ steps.length }} concluídas
              </p>
            </div>
          </div>

          <v-btn
            icon
            variant="text"
            color="white"
            size="small"
            @click="$emit('update:modelValue', false)"
          >
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </div>
      </v-card-title>

      <v-divider />

      <!-- Conteúdo principal - layout dividido -->
      <div class="modal-content">
        <!-- Lista de etapas (esquerda) -->
        <div class="steps-sidebar">
          <v-list density="compact" nav class="pa-2">
            <v-list-item
              v-for="(step, index) in steps"
              :key="step.id"
              :active="selectedStepId === step.id"
              :class="getStepListItemClass(step)"
              @click="selectStep(step)"
              rounded="lg"
              class="mb-1"
            >
              <template v-slot:prepend>
                <v-avatar
                  :color="getStatusColor(step.status)"
                  size="28"
                >
                  <v-icon v-if="step.status === 'COMPLETED'" size="16" color="white">
                    mdi-check
                  </v-icon>
                  <v-icon v-else-if="step.status === 'IN_PROGRESS'" size="16" color="white">
                    mdi-play
                  </v-icon>
                  <v-icon v-else-if="step.status === 'REJECTED'" size="16" color="white">
                    mdi-close
                  </v-icon>
                  <v-icon v-else-if="step.status === 'SKIPPED'" size="16" color="white">
                    mdi-skip-next
                  </v-icon>
                  <span v-else class="text-caption text-white font-weight-bold">
                    {{ index + 1 }}
                  </span>
                </v-avatar>
              </template>

              <v-list-item-title class="text-body-2 font-weight-medium">
                {{ step.step?.name || 'Etapa sem nome' }}
              </v-list-item-title>

              <v-list-item-subtitle class="text-caption">
                {{ getStatusText(step.status) }}
              </v-list-item-subtitle>
            </v-list-item>
          </v-list>
        </div>

        <!-- Detalhes da etapa (direita) -->
        <div class="step-details">
          <div v-if="!selectedStep" class="empty-state">
            <v-icon size="64" color="grey-lighten-1">mdi-cursor-default-click</v-icon>
            <p class="text-body-2 text-grey mt-3">Selecione uma etapa para ver os detalhes</p>
          </div>

          <div v-else class="step-detail-content">
            <!-- Cabeçalho da etapa -->
            <div class="step-detail-header" :class="{ 'header-active': selectedStep.status === 'IN_PROGRESS' }">
              <div class="d-flex align-center justify-space-between flex-wrap gap-2">
                <div class="d-flex align-center">
                  <v-icon
                    :color="selectedStep.status === 'IN_PROGRESS' ? 'white' : getStepTypeColor(selectedStep.step?.type)"
                    class="mr-3"
                    size="28"
                  >
                    {{ getStepTypeIcon(selectedStep.step?.type) }}
                  </v-icon>
                  <div>
                    <h3 class="text-h6 font-weight-bold" :class="{ 'text-white': selectedStep.status === 'IN_PROGRESS' }">
                      {{ selectedStep.step?.name || 'Etapa sem nome' }}
                    </h3>
                    <p
                      v-if="selectedStep.step?.description"
                      class="text-body-2 mb-0"
                      :class="selectedStep.status === 'IN_PROGRESS' ? 'text-white-70' : 'text-medium-emphasis'"
                    >
                      {{ selectedStep.step.description }}
                    </p>
                  </div>
                </div>

                <v-chip
                  size="small"
                  :color="getStatusColor(selectedStep.status)"
                  :variant="selectedStep.status === 'IN_PROGRESS' ? 'flat' : 'tonal'"
                >
                  <v-icon start size="14">{{ getStatusIcon(selectedStep.status) }}</v-icon>
                  {{ getStatusText(selectedStep.status) }}
                </v-chip>
              </div>
            </div>

            <!-- Informações da etapa -->
            <div class="step-detail-body">
              <!-- Grid de informações -->
              <div class="info-grid">
                <div class="info-item">
                  <v-icon size="18" color="primary" class="mr-2">mdi-tag</v-icon>
                  <div>
                    <span class="info-label">Tipo</span>
                    <span class="info-value">{{ getStepTypeName(selectedStep.step?.type) }}</span>
                  </div>
                </div>

                <div class="info-item">
                  <v-icon size="18" color="primary" class="mr-2">mdi-account-check</v-icon>
                  <div>
                    <span class="info-label">Responsável</span>
                    <span class="info-value">{{ getResponsibleName(selectedStep) }}</span>
                  </div>
                </div>

                <div v-if="selectedStep.executor" class="info-item">
                  <v-icon size="18" color="success" class="mr-2">mdi-account-edit</v-icon>
                  <div>
                    <span class="info-label">Executado por</span>
                    <span class="info-value">{{ selectedStep.executor.name }}</span>
                  </div>
                </div>

                <div v-if="selectedStep.completedAt" class="info-item">
                  <v-icon size="18" color="info" class="mr-2">mdi-calendar-check</v-icon>
                  <div>
                    <span class="info-label">Concluído em</span>
                    <span class="info-value">{{ formatDate(selectedStep.completedAt) }}</span>
                  </div>
                </div>

                <div v-if="selectedStep.dueAt" class="info-item">
                  <v-icon
                    size="18"
                    :color="isSlaOverdue(selectedStep) ? 'error' : 'warning'"
                    class="mr-2"
                  >
                    mdi-clock-alert
                  </v-icon>
                  <div>
                    <span class="info-label">Prazo</span>
                    <span class="info-value" :class="{ 'text-error': isSlaOverdue(selectedStep) }">
                      {{ formatDate(selectedStep.dueAt) }}
                    </span>
                  </div>
                </div>

                <div v-if="selectedStep.action" class="info-item">
                  <v-icon size="18" color="warning" class="mr-2">mdi-gesture-tap</v-icon>
                  <div>
                    <span class="info-label">Ação</span>
                    <v-chip size="x-small" variant="tonal" class="mt-1">
                      {{ selectedStep.action }}
                    </v-chip>
                  </div>
                </div>
              </div>

              <!-- Instruções -->
              <div v-if="selectedStep.step?.instructions" class="section-box mt-4">
                <div class="section-header">
                  <v-icon size="18" color="primary" class="mr-2">mdi-text-box-outline</v-icon>
                  <span class="font-weight-bold">Instruções</span>
                </div>
                <div class="section-content">
                  {{ selectedStep.step.instructions }}
                </div>
              </div>

              <!-- Comentário -->
              <div v-if="selectedStep.comment" class="section-box mt-4 comment-box">
                <div class="section-header">
                  <v-icon size="18" color="info" class="mr-2">mdi-comment-text</v-icon>
                  <span class="font-weight-bold">Comentário</span>
                </div>
                <div class="section-content comment-content">
                  {{ selectedStep.comment }}
                </div>
              </div>

              <!-- Features -->
              <div v-if="hasFeatures(selectedStep)" class="mt-4">
                <div class="d-flex flex-wrap gap-2">
                  <v-chip
                    v-if="selectedStep.step?.requiresSignature"
                    size="small"
                    color="error"
                    variant="tonal"
                  >
                    <v-icon start size="14">mdi-draw-pen</v-icon>
                    Requer Assinatura
                  </v-chip>
                  <v-chip
                    v-if="selectedStep.step?.allowAttachment"
                    size="small"
                    color="info"
                    variant="tonal"
                  >
                    <v-icon start size="14">mdi-paperclip</v-icon>
                    Permite Anexos
                  </v-chip>
                  <v-chip
                    v-if="selectedStep.attachments?.length"
                    size="small"
                    color="success"
                    variant="tonal"
                  >
                    <v-icon start size="14">mdi-attachment</v-icon>
                    {{ selectedStep.attachments.length }} anexo(s)
                  </v-chip>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <v-divider />

      <!-- Footer -->
      <v-card-actions class="pa-3 justify-end">
        <v-btn
          variant="elevated"
          color="primary"
          @click="$emit('update:modelValue', false)"
        >
          Fechar
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import dayjs from 'dayjs'
import 'dayjs/locale/pt-br'

dayjs.locale('pt-br')

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  steps: {
    type: Array,
    default: () => []
  },
  process: {
    type: Object,
    default: null
  }
})

defineEmits(['update:modelValue'])

// Estado
const selectedStepId = ref(null)

// Computed
const selectedStep = computed(() => {
  if (!selectedStepId.value) return null
  return props.steps.find(s => s.id === selectedStepId.value)
})

const completedSteps = computed(() => {
  return props.steps.filter(s =>
    s.status === 'COMPLETED' || s.status === 'SKIPPED'
  ).length
})

// Ao abrir o modal, selecionar a primeira etapa IN_PROGRESS ou a primeira
watch(() => props.modelValue, (newVal) => {
  if (newVal && props.steps.length > 0) {
    const inProgressStep = props.steps.find(s => s.status === 'IN_PROGRESS')
    selectedStepId.value = inProgressStep?.id || props.steps[0]?.id
  }
})

// Métodos
function selectStep(step) {
  selectedStepId.value = step.id
}

function getStepListItemClass(step) {
  if (step.status === 'IN_PROGRESS') return 'step-item-active'
  if (step.status === 'COMPLETED') return 'step-item-completed'
  if (step.status === 'REJECTED') return 'step-item-rejected'
  return ''
}

function getStatusColor(status) {
  const colors = {
    PENDING: 'grey',
    IN_PROGRESS: 'warning',
    COMPLETED: 'success',
    REJECTED: 'error',
    SKIPPED: 'grey'
  }
  return colors[status] || 'grey'
}

function getStatusIcon(status) {
  const icons = {
    PENDING: 'mdi-clock-outline',
    IN_PROGRESS: 'mdi-progress-clock',
    COMPLETED: 'mdi-check',
    REJECTED: 'mdi-close',
    SKIPPED: 'mdi-skip-next'
  }
  return icons[status] || 'mdi-help'
}

function getStatusText(status) {
  const texts = {
    PENDING: 'Pendente',
    IN_PROGRESS: 'Em Progresso',
    COMPLETED: 'Concluída',
    REJECTED: 'Rejeitada',
    SKIPPED: 'Pulada'
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

function getStepTypeName(type) {
  const names = {
    INPUT: 'Entrada de Dados',
    APPROVAL: 'Aprovação',
    UPLOAD: 'Upload de Arquivo',
    REVIEW: 'Revisão',
    SIGNATURE: 'Assinatura'
  }
  return names[type] || type
}

function getResponsibleName(step) {
  if (step.step?.assignedToCreator) {
    if (props.process?.createdBy?.name) {
      return `${props.process.createdBy.name} (Criador)`
    }
    return 'Criador do Processo'
  }
  if (step.step?.assignedToUser) {
    return step.step.assignedToUser.name
  }
  if (step.step?.assignedToSector) {
    return `Setor ${step.step.assignedToSector.name}`
  }
  return 'Não definido'
}

function formatDate(date) {
  return dayjs(date).format('DD/MM/YYYY HH:mm')
}

function isSlaOverdue(step) {
  if (!step.dueAt) return false
  return dayjs().isAfter(dayjs(step.dueAt))
}

function hasFeatures(step) {
  return step.step?.requiresSignature ||
         step.step?.allowAttachment ||
         step.attachments?.length
}
</script>

<style scoped>
.step-preview-modal {
  border-radius: 12px !important;
  overflow: hidden;
}

.modal-header {
  background: linear-gradient(135deg, #1976D2, #1565C0);
}

.header-content {
  position: relative;
  z-index: 1;
}

.text-white-70 {
  color: rgba(255, 255, 255, 0.7) !important;
}

/* Layout principal */
.modal-content {
  display: flex;
  min-height: 400px;
  max-height: 60vh;
}

/* Sidebar com lista de etapas */
.steps-sidebar {
  width: 280px;
  min-width: 280px;
  border-right: 1px solid rgba(0, 0, 0, 0.08);
  background: #FAFAFA;
  overflow-y: auto;
}

.step-item-active {
  background: rgba(255, 152, 0, 0.1) !important;
  border-left: 3px solid #FF9800;
}

.step-item-completed {
  opacity: 0.85;
}

.step-item-rejected {
  background: rgba(244, 67, 54, 0.05) !important;
}

/* Área de detalhes */
.step-details {
  flex: 1;
  overflow-y: auto;
  background: white;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 40px;
}

.step-detail-content {
  height: 100%;
}

.step-detail-header {
  padding: 20px 24px;
  background: #F5F5F5;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

.step-detail-header.header-active {
  background: linear-gradient(135deg, #FF9800, #f57c00);
}

.step-detail-body {
  padding: 24px;
}

/* Grid de informações */
.info-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.info-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px 14px;
  background: rgba(25, 118, 210, 0.04);
  border-radius: 10px;
  border: 1px solid rgba(25, 118, 210, 0.08);
}

.info-label {
  display: block;
  font-size: 0.7rem;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.5);
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.info-value {
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  color: rgba(0, 0, 0, 0.85);
  margin-top: 2px;
}

/* Seções */
.section-box {
  background: rgba(25, 118, 210, 0.04);
  border: 1px solid rgba(25, 118, 210, 0.1);
  border-radius: 10px;
  padding: 16px;
}

.section-box.comment-box {
  background: rgba(33, 150, 243, 0.04);
  border-color: rgba(33, 150, 243, 0.1);
}

.section-header {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
}

.section-content {
  font-size: 0.9rem;
  line-height: 1.6;
  color: rgba(0, 0, 0, 0.75);
  white-space: pre-wrap;
}

.comment-content {
  background: white;
  padding: 12px 16px;
  border-radius: 8px;
  border-left: 3px solid rgb(var(--v-theme-info));
}

/* Responsivo */
@media (max-width: 768px) {
  .modal-content {
    flex-direction: column;
    max-height: 70vh;
  }

  .steps-sidebar {
    width: 100%;
    min-width: 100%;
    max-height: 200px;
    border-right: none;
    border-bottom: 1px solid rgba(0, 0, 0, 0.08);
  }

  .info-grid {
    grid-template-columns: 1fr;
  }
}
</style>
