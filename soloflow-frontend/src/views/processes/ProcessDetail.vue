<!-- Adicionando botão "Ver Anexos" junto aos controles existentes -->
<template>
  <div v-if="process">
    <div class="d-flex align-center mb-6">
      <v-btn icon="mdi-arrow-left" variant="text" @click="goBack" />
      <div class="ml-4 flex-grow-1">
        <div class="d-flex align-center">
          <h1 class="text-h4 font-weight-bold">
            {{ process.title || process.code }}
          </h1>
        </div>
        <p class="text-subtitle-1 text-medium-emphasis">
          {{ process.processType.name }}
        </p>
      </div>

      <div class="d-flex gap-2">
        <v-chip :color="getStatusColor(process.status)" class="ml-3" label>
          {{ getStatusText(process.status) }}
        </v-chip>

        <!-- Novo botão para ver todos os anexos -->
        <v-btn 
          variant="outlined" 
          @click="openAllAttachmentsModal"
          v-if="hasAnyAttachments"
        >
          <v-icon start>mdi-paperclip</v-icon>
          Ver Anexos ({{ totalAttachmentsCount }})
        </v-btn>

        <v-btn variant="text" @click="refreshProcess" :loading="loading">
          <v-icon start>mdi-refresh</v-icon>
          Atualizar
        </v-btn>

        <v-btn v-if="currentStepExecution" color="primary" variant="elevated" @click="executeCurrentStep"
          :disabled="!canExecuteCurrentStep">
          <v-icon start>mdi-play</v-icon>
          Executar Etapa
        </v-btn>
      </div>
    </div>

    <!-- Resto do template permanece igual até o final -->
    <v-card class="mb-6">
      <v-card-text>
        <div class="d-flex align-center justify-space-between mb-2">
          <span class="text-subtitle-2">Progresso do Processo</span>
          <span class="text-caption">{{ progressPercentage }}% concluído</span>
        </div>
        <v-progress-linear :model-value="progressPercentage" :color="getProgressColor()" height="8" rounded
          class="mb-2" />
        <div class="text-caption text-medium-emphasis">
          {{ completedSteps }} de {{ totalSteps }} etapas concluídas
        </div>
      </v-card-text>
    </v-card>

    <v-row>
      <v-col cols="12" md="4">
        <v-card class="mb-4">
          <v-card-title>
            <v-icon class="mr-2">mdi-information</v-icon>
            Informações
          </v-card-title>
          <v-divider />
          <v-list density="comfortable">
            <v-list-item>
              <template v-slot:prepend>
                <v-icon>mdi-identifier</v-icon>
              </template>
              <v-list-item-title>Código</v-list-item-title>
              <v-list-item-subtitle>{{ process.code }}</v-list-item-subtitle>
            </v-list-item>

            <v-list-item>
              <template v-slot:prepend>
                <v-icon>mdi-account</v-icon>
              </template>
              <v-list-item-title>Solicitante</v-list-item-title>
              <v-list-item-subtitle>{{ process.createdBy.name }}</v-list-item-subtitle>
            </v-list-item>

            <v-list-item>
              <template v-slot:prepend>
                <v-icon>mdi-email</v-icon>
              </template>
              <v-list-item-title>E-mail</v-list-item-title>
              <v-list-item-subtitle>{{ process.createdBy.email }}</v-list-item-subtitle>
            </v-list-item>

            <v-list-item>
              <template v-slot:prepend>
                <v-icon>mdi-calendar</v-icon>
              </template>
              <v-list-item-title>Criado em</v-list-item-title>
              <v-list-item-subtitle>{{ formatDate(process.createdAt) }}</v-list-item-subtitle>
            </v-list-item>

            <v-list-item v-if="process.completedAt">
              <template v-slot:prepend>
                <v-icon>mdi-calendar-check</v-icon>
              </template>
              <v-list-item-title>Concluído em</v-list-item-title>
              <v-list-item-subtitle>{{ formatDate(process.completedAt) }}</v-list-item-subtitle>
            </v-list-item>

            <v-list-item v-if="estimatedCompletion">
              <template v-slot:prepend>
                <v-icon>mdi-clock-outline</v-icon>
              </template>
              <v-list-item-title>Previsão</v-list-item-title>
              <v-list-item-subtitle>{{ estimatedCompletion }}</v-list-item-subtitle>
            </v-list-item>
          </v-list>

          <v-divider v-if="process.description" />

          <v-card-text v-if="process.description">
            <p class="text-caption text-medium-emphasis mb-1">Descrição</p>
            <p class="text-body-2">{{ process.description }}</p>
          </v-card-text>
        </v-card>

        <v-card v-if="process.formData || hasFormFieldFiles">
          <v-card-title>
            <v-icon class="mr-2">mdi-form-textbox</v-icon>
            Dados Informados
          </v-card-title>
          <v-divider />
          <v-list density="compact">
            <v-list-item v-for="(value, key) in formattedFormData" :key="key">
              <v-list-item-title class="text-caption">{{ key }}</v-list-item-title>
              <v-list-item-subtitle>{{ value }}</v-list-item-subtitle>
            </v-list-item>
            
            <template v-for="field in fileFields" :key="field.name">
              <v-list-item v-if="getFieldFileData(field) && !Array.isArray(getFieldFileData(field))">
                <v-list-item-title class="text-caption">
                  {{ field.label }}
                </v-list-item-title>
                <v-list-item-subtitle>
                  <div class="d-flex align-center">
                    <v-icon size="16" class="mr-2" :color="getFileTypeColor(getFieldFileData(field).mimeType)">
                      {{ getFileIcon(getFieldFileData(field).mimeType) }}
                    </v-icon>
                    <span class="file-link" @click="openFieldFileModal(field, 0)">
                      {{ field.label }}
                    </span>
                    <v-btn icon variant="text" size="x-small" class="ml-1" @click.stop="downloadFieldFile(field, 0)">
                      <v-icon size="16">mdi-download</v-icon>
                    </v-btn>
                    <v-chip size="x-small" class="ml-2" variant="tonal">
                      {{ formatFileSize(getFieldFileData(field).size) }}
                    </v-chip>
                  </div>
                </v-list-item-subtitle>
              </v-list-item>
              
              <template v-else-if="Array.isArray(getFieldFileData(field))">
                <v-list-item v-for="(fileItem, index) in getFieldFileData(field)" :key="`${field.name}-${index}`">
                  <v-list-item-title class="text-caption">
                    {{ field.label }} ({{ index + 1 }})
                  </v-list-item-title>
                  <v-list-item-subtitle>
                    <div class="d-flex align-center">
                      <v-icon size="16" class="mr-2" :color="getFileTypeColor(fileItem.mimeType)">
                        {{ getFileIcon(fileItem.mimeType) }}
                      </v-icon>
                      <span class="file-link" @click="openFieldFileModal(field, index)">
                        {{ field.label }} ({{ index + 1 }})
                      </span>
                      <v-btn icon variant="text" size="x-small" class="ml-1" @click.stop="downloadFieldFile(field, index)">
                        <v-icon size="16">mdi-download</v-icon>
                      </v-btn>
                      <v-chip size="x-small" class="ml-2" variant="tonal">
                        {{ formatFileSize(fileItem.size) }}
                      </v-chip>
                    </div>
                  </v-list-item-subtitle>
                </v-list-item>
              </template>
            </template>

            <v-list-item v-if="!process.formData && !hasFormFieldFiles">
              <v-list-item-title class="text-center text-medium-emphasis">
                <v-icon class="mr-2">mdi-information-outline</v-icon>
                Nenhum dado informado
              </v-list-item-title>
            </v-list-item>
          </v-list>
        </v-card>
      </v-col>

      <!-- A seção do workflow permanece a mesma do original -->
      <v-col cols="12" md="8">
        <v-card class="workflow-timeline-card">
          <v-card-title class="d-flex align-center pa-6">
            <v-icon class="mr-3" color="primary" size="28">mdi-timeline-clock</v-icon>
            <div>
              <h3 class="text-h5 font-weight-bold">Fluxo do Processo</h3>
              <p class="text-body-2 text-medium-emphasis mt-1">
                Acompanhe o progresso e histórico de execução das etapas
              </p>
            </div>
          </v-card-title>
          
          <v-divider />

          <div class="workflow-container pa-6">
            <div class="workflow-steps">
              <div 
                v-for="(execution, index) in process.stepExecutions" 
                :key="execution.id"
                class="workflow-step"
                :class="getStepClass(execution, index)"
              >
                <div class="step-indicator">
                  <div class="step-number" :class="getStepIndicatorClass(execution)">
                    <v-icon v-if="execution.status === 'COMPLETED'" size="20" color="white">
                      mdi-check
                    </v-icon>
                    <v-icon v-else-if="execution.status === 'IN_PROGRESS'" size="20" color="white">
                      mdi-play
                    </v-icon>
                    <v-icon v-else-if="execution.status === 'REJECTED'" size="20" color="white">
                      mdi-close
                    </v-icon>
                    <span v-else class="step-text">{{ index + 1 }}</span>
                  </div>
                  
                  <div 
                    v-if="index < process.stepExecutions.length - 1"
                    class="step-connector"
                    :class="getConnectorClass(execution)"
                  />
                </div>

                <div class="step-content">
                  <v-card 
                    class="step-card"
                    :class="getStepCardClass(execution)"
                    :elevation="execution.status === 'IN_PROGRESS' ? 8 : 2"
                  >
                    <div class="step-card-header" :class="getStepHeaderClass(execution)">
                      <div class="d-flex align-center justify-space-between">
                        <div class="d-flex align-center">
                          <v-icon 
                            :color="execution.status === 'IN_PROGRESS' ? 'white' : getStepTypeColor(execution.step.type)" 
                            class="mr-3" 
                            size="24"
                          >
                            {{ getStepTypeIcon(execution.step.type) }}
                          </v-icon>
                          
                          <div>
                            <h4 class="step-title" :class="execution.status === 'IN_PROGRESS' ? 'text-white' : ''">
                              {{ execution.step.name }}
                            </h4>
                            <p v-if="execution.step.description" class="step-subtitle" :class="execution.status === 'IN_PROGRESS' ? 'text-white' : 'text-medium-emphasis'">
                              {{ execution.step.description }}
                            </p>
                          </div>
                        </div>

                        <div class="step-status-badge">
                          <v-chip 
                            size="small" 
                            :color="getExecutionColor(execution)" 
                            :variant="execution.status === 'IN_PROGRESS' ? 'flat' : 'tonal'"
                          >
                            <v-icon start size="16">{{ getExecutionIcon(execution) }}</v-icon>
                            {{ getExecutionStatusText(execution.status) }}
                          </v-chip>
                        </div>
                      </div>
                    </div>

                    <div class="step-card-body pa-4">
                      <div class="step-info-grid">
                        <div class="info-item">
                          <v-icon size="18" color="primary" class="mr-2">mdi-account-check</v-icon>
                          <div>
                            <span class="info-label">Responsável</span>
                            <span class="info-value">{{ getResponsibleName(execution) }}</span>
                          </div>
                        </div>

                        <div v-if="execution.executor" class="info-item">
                          <v-icon size="18" color="success" class="mr-2">mdi-account-edit</v-icon>
                          <div>
                            <span class="info-label">Executado por</span>
                            <span class="info-value">{{ execution.executor.name }}</span>
                          </div>
                        </div>

                        <div v-if="execution.completedAt" class="info-item">
                          <v-icon size="18" color="info" class="mr-2">mdi-clock-check</v-icon>
                          <div>
                            <span class="info-label">Concluído em</span>
                            <span class="info-value">{{ formatDate(execution.completedAt) }}</span>
                          </div>
                        </div>

                        <div v-if="execution.action" class="info-item">
                          <v-icon size="18" color="warning" class="mr-2">mdi-gesture-tap</v-icon>
                          <div>
                            <span class="info-label">Ação</span>
                            <v-chip size="x-small" class="ml-1" variant="tonal">{{ execution.action }}</v-chip>
                          </div>
                        </div>
                      </div>

                      <div v-if="getExecutionSlaStatus(execution).hasDeadline" class="step-sla-info mt-3">
                        <v-alert
                          v-if="getExecutionSlaStatus(execution).isOverdue"
                          type="error"
                          variant="tonal"
                          density="compact"
                        >
                          <v-icon start size="16">mdi-clock-alert</v-icon>
                          Atrasado: {{ getExecutionSlaStatus(execution).overdueText }}
                        </v-alert>
                        <v-alert
                          v-else-if="getExecutionSlaStatus(execution).isNearDeadline"
                          type="warning"
                          variant="tonal"
                          density="compact"
                        >
                          <v-icon start size="16">mdi-clock-outline</v-icon>
                          Prazo: {{ getExecutionSlaStatus(execution).remainingText }}
                        </v-alert>
                      </div>

                      <div v-if="execution.comment" class="step-comment mt-4">
                        <div class="comment-header mb-2">
                          <v-icon size="16" color="primary" class="mr-1">mdi-comment-text</v-icon>
                          <span class="text-caption font-weight-medium">Comentário</span>
                        </div>
                        <div class="comment-body">
                          {{ execution.comment }}
                        </div>
                      </div>

                      <div v-if="execution.step.requiresSignature || execution.step.allowAttachment || hasStepAttachments(execution)" class="step-features mt-4">
                        <div class="d-flex flex-wrap gap-2">
                          <v-chip v-if="execution.step.requiresSignature" size="x-small" color="error" variant="tonal">
                            <v-icon start size="12">mdi-draw-pen</v-icon>
                            Requer Assinatura
                          </v-chip>
                          <v-chip v-if="execution.step.allowAttachment" size="x-small" color="info" variant="tonal">
                            <v-icon start size="12">mdi-paperclip</v-icon>
                            Permite Anexos
                          </v-chip>
                          <v-chip v-if="hasStepAttachments(execution)" size="x-small" color="success" variant="tonal">
                            <v-icon start size="12">mdi-attachment</v-icon>
                            {{ getStepAttachmentsCount(execution) }} anexo(s)
                          </v-chip>
                        </div>
                      </div>
                    </div>

                    <div v-if="canExecuteStep(execution)" class="step-card-actions pa-4 pt-0">
                      <v-btn 
                        color="primary" 
                        variant="elevated" 
                        block
                        size="large"
                        @click="executeStep(execution)"
                        class="execute-button"
                      >
                        <v-icon start>mdi-play-circle</v-icon>
                        Executar Esta Etapa
                      </v-btn>
                    </div>
                  </v-card>
                </div>
              </div>
            </div>
          </div>
        </v-card>
      </v-col>
    </v-row>

    <!-- Modal de Campo de Arquivo -->
    <FieldFileModal
      v-model="fieldFileModal"
      :file-data="selectedFieldFile"
      :field-info="selectedField"
    />

    <!-- Novo Modal de Todos os Anexos -->
    <ProcessAttachmentsModal
      v-model="allAttachmentsModal"
      :process="process"
    />
  </div>

  <!-- Estados de loading e erro permanecem iguais -->
  <div v-else-if="loading" class="text-center py-12">
    <v-progress-circular indeterminate color="primary" size="64" />
    <p class="text-body-2 text-grey mt-4">Carregando processo...</p>
  </div>

  <div v-else class="text-center py-12">
    <v-icon size="64" color="error">mdi-alert-circle</v-icon>
    <p class="text-h6 mt-4 text-error">Processo não encontrado</p>
    <v-btn color="primary" @click="goBack" class="mt-4">
      <v-icon start>mdi-arrow-left</v-icon>
      Voltar
    </v-btn>
  </div>
</template>
<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useProcessStore } from '@/stores/processes'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/pt-br'

import FieldFileModal from '@/components/FieldFileModal.vue'
import ProcessAttachmentsModal from '@/components/ProcessAttachmentsModal.vue'

dayjs.extend(relativeTime)
dayjs.locale('pt-br')

const router = useRouter()
const route = useRoute()
const processStore = useProcessStore()

const process = ref(null)
const loading = ref(true)
const fieldFileModal = ref(false)
const selectedFieldFile = ref(null)
const selectedField = ref(null)
const allAttachmentsModal = ref(false)

const currentStepExecution = computed(() => {
  if (!process.value?.stepExecutions) return null
  return process.value.stepExecutions.find(se => se.status === 'IN_PROGRESS')
})

const progressPercentage = computed(() => {
  if (!process.value?.stepExecutions) return 0
  const total = process.value.stepExecutions.length
  const completed = process.value.stepExecutions.filter(
    se => se.status === 'COMPLETED'
  ).length
  return Math.round((completed / total) * 100)
})

const completedSteps = computed(() => {
  if (!process.value?.stepExecutions) return 0
  return process.value.stepExecutions.filter(
    se => se.status === 'COMPLETED'
  ).length
})

const totalSteps = computed(() => {
  return process.value?.stepExecutions?.length || 0
})

const estimatedCompletion = computed(() => {
  if (!currentStepExecution.value?.dueAt) return null
  return dayjs(currentStepExecution.value.dueAt).format('DD/MM/YYYY')
})

const formattedFormData = computed(() => {
  if (!process.value?.formData) return {}
  const formatted = {}
  const formFields = process.value.processType?.formFields || []
  
  Object.keys(process.value.formData).forEach(key => {
    const field = formFields.find(f => f.name === key)
    if (field && field.type !== 'FILE') {
      const label = field.label || key
      formatted[label] = process.value.formData[key]
    }
  })
  
  return formatted
})

const fileFields = computed(() => {
  if (!process.value?.processType?.formFields) return []
  return process.value.processType.formFields.filter(f => f.type === 'FILE')
})

const hasFormFieldFiles = computed(() => {
  if (!process.value?.formData) return false
  return fileFields.value.some(field => {
    const data = process.value.formData[field.name]
    return data && (data.attachmentId || (Array.isArray(data) && data.length > 0))
  })
})

const hasAnyAttachments = computed(() => {
  // Verifica anexos do formulário
  if (hasFormFieldFiles.value) return true
  
  // Verifica anexos das etapas
  if (process.value?.stepExecutions) {
    return process.value.stepExecutions.some(se => 
      se.attachments && se.attachments.length > 0
    )
  }
  
  return false
})

const totalAttachmentsCount = computed(() => {
  let count = 0
  
  // Conta anexos do formulário
  fileFields.value.forEach(field => {
    const data = process.value?.formData?.[field.name]
    if (data) {
      if (Array.isArray(data)) {
        count += data.length
      } else if (data.attachmentId) {
        count += 1
      }
    }
  })
  
  // Conta anexos das etapas
  process.value?.stepExecutions?.forEach(se => {
    if (se.attachments) {
      count += se.attachments.length
    }
  })
  
  return count
})

const canExecuteCurrentStep = computed(() => {
  if (!currentStepExecution.value) return false
  return currentStepExecution.value.status === 'IN_PROGRESS'
})

function getFieldFileData(field) {
  return process.value?.formData?.[field.name]
}

function getStatusColor(status) {
  const colors = {
    DRAFT: 'grey',
    IN_PROGRESS: 'primary',
    COMPLETED: 'success',
    CANCELLED: 'warning',
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

function getProgressColor() {
  if (progressPercentage.value === 100) return 'success'
  if (progressPercentage.value >= 75) return 'info'
  if (progressPercentage.value >= 50) return 'primary'
  if (progressPercentage.value >= 25) return 'warning'
  return 'error'
}

function formatDate(date) {
  return dayjs(date).format('DD/MM/YYYY HH:mm')
}

function formatFileSize(bytes) {
  if (!bytes) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}

function getFileIcon(mimeType) {
  if (!mimeType) return 'mdi-file'
  if (mimeType.includes('pdf')) return 'mdi-file-pdf-box'
  if (mimeType.includes('image')) return 'mdi-file-image'
  if (mimeType.includes('word')) return 'mdi-file-word'
  if (mimeType.includes('excel')) return 'mdi-file-excel'
  return 'mdi-file'
}

function getFileTypeColor(mimeType) {
  if (!mimeType) return 'grey'
  if (mimeType.includes('pdf')) return 'red'
  if (mimeType.includes('image')) return 'blue'
  if (mimeType.includes('word')) return 'indigo'
  if (mimeType.includes('excel')) return 'green'
  return 'grey'
}

function getStepClass(execution, index) {
  const classes = ['workflow-step']
  if (execution.status === 'COMPLETED') classes.push('step-completed')
  if (execution.status === 'IN_PROGRESS') classes.push('step-active')
  if (execution.status === 'REJECTED') classes.push('step-rejected')
  return classes.join(' ')
}

function getStepIndicatorClass(execution) {
  if (execution.status === 'COMPLETED') return 'step-completed'
  if (execution.status === 'IN_PROGRESS') return 'step-active'
  if (execution.status === 'REJECTED') return 'step-rejected'
  return ''
}

function getConnectorClass(execution) {
  if (execution.status === 'COMPLETED') return 'connector-completed'
  return ''
}

function getStepCardClass(execution) {
  if (execution.status === 'IN_PROGRESS') return 'step-card-active'
  if (execution.status === 'REJECTED') return 'step-card-rejected'
  return ''
}

function getStepHeaderClass(execution) {
  if (execution.status === 'IN_PROGRESS') return 'step-header-active'
  return ''
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

function getExecutionIcon(execution) {
  if (execution.status === 'COMPLETED') return 'mdi-check'
  if (execution.status === 'IN_PROGRESS') return 'mdi-play'
  if (execution.status === 'REJECTED') return 'mdi-close'
  return 'mdi-clock-outline'
}

function getExecutionColor(execution) {
  if (execution.status === 'COMPLETED') return 'success'
  if (execution.status === 'IN_PROGRESS') return 'primary'
  if (execution.status === 'REJECTED') return 'error'
  return 'grey'
}

function getExecutionStatusText(status) {
  const texts = {
    PENDING: 'Pendente',
    IN_PROGRESS: 'Em Execução',
    COMPLETED: 'Concluído',
    REJECTED: 'Rejeitado',
    SKIPPED: 'Pulado'
  }
  return texts[status] || status
}

function getResponsibleName(execution) {
  if (execution.step.assignedToUser) {
    return execution.step.assignedToUser.name
  }
  if (execution.step.assignedToSector) {
    return `Setor ${execution.step.assignedToSector.name}`
  }
  if (execution.step.assignedToCreator) {
    return process.value?.createdBy?.name || 'Criador do Processo'
  }
  return 'Não definido'
}

function getExecutionSlaStatus(execution) {
  if (!execution.dueAt) {
    return { hasDeadline: false }
  }
  
  const now = dayjs()
  const dueAt = dayjs(execution.dueAt)
  const isOverdue = now.isAfter(dueAt)
  const diff = dueAt.diff(now)
  const duration = dayjs.duration(Math.abs(diff))
  
  return {
    hasDeadline: true,
    isOverdue,
    isNearDeadline: !isOverdue && duration.asHours() <= 24,
    remainingText: duration.humanize(),
    overdueText: duration.humanize()
  }
}

function hasStepAttachments(execution) {
  return execution.attachments && execution.attachments.length > 0
}

function getStepAttachmentsCount(execution) {
  return execution.attachments?.length || 0
}

function canExecuteStep(execution) {
  return execution.status === 'IN_PROGRESS'
}

function executeStep(execution) {
  router.push(`/processes/${process.value.id}/execute/${execution.id}`)
}

function executeCurrentStep() {
  if (currentStepExecution.value) {
    executeStep(currentStepExecution.value)
  }
}

function openFieldFileModal(field, index) {
  const data = getFieldFileData(field)
  if (data) {
    if (Array.isArray(data)) {
      selectedFieldFile.value = data[index]
    } else {
      selectedFieldFile.value = data
    }
    selectedField.value = field
    fieldFileModal.value = true
  }
}

async function downloadFieldFile(field, index) {
  const data = getFieldFileData(field)
  if (data) {
    let attachmentId
    if (Array.isArray(data)) {
      attachmentId = data[index]?.attachmentId
    } else {
      attachmentId = data.attachmentId
    }
    
    if (attachmentId) {
      try {
        await processStore.downloadAttachment(attachmentId)
        window.showSnackbar?.('Download iniciado', 'success')
      } catch (error) {
        console.error('Error downloading file:', error)
        window.showSnackbar?.('Erro ao baixar arquivo', 'error')
      }
    }
  }
}

function openAllAttachmentsModal() {
  allAttachmentsModal.value = true
}

async function refreshProcess() {
  loading.value = true
  try {
    await processStore.fetchProcess(route.params.id)
    process.value = processStore.currentProcess
    window.showSnackbar?.('Processo atualizado', 'success')
  } catch (error) {
    console.error('Error refreshing process:', error)
    window.showSnackbar?.('Erro ao atualizar processo', 'error')
  } finally {
    loading.value = false
  }
}

function goBack() {
  router.push('/processes')
}

onMounted(async () => {
  try {
    loading.value = true
    await processStore.fetchProcess(route.params.id)
    process.value = processStore.currentProcess
  } catch (error) {
    console.error('Error loading process:', error)
    window.showSnackbar?.('Erro ao carregar processo', 'error')
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.cursor-pointer {
  cursor: pointer;
}

.gap-1 {
  gap: 4px;
}

.gap-2 {
  gap: 8px;
}

.max-width{
  max-width: 610px;
}


.file-link {
  cursor: pointer;
  color: rgb(var(--v-theme-primary));
  text-decoration: underline;
  text-decoration-color: transparent;
  transition: text-decoration-color 0.2s ease;
}

.file-link:hover {
  text-decoration-color: rgb(var(--v-theme-primary));
}


.workflow-timeline-card {
  border-radius: 16px;
  border: 1px solid rgba(0, 0, 0, 0.06);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
}

.workflow-container {
  background: linear-gradient(135deg, rgba(25, 118, 210, 0.02), rgba(66, 165, 245, 0.01));
  border-radius: 0 0 16px 16px;
}

.workflow-steps {
  position: relative;
}

.workflow-step {
  display: flex;
  margin-bottom: 32px;
  position: relative;
}

.workflow-step.step-last {
  margin-bottom: 0;
}


.step-indicator {
  position: relative;
  margin-right: 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  z-index: 2;
}

.step-number {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transition: all 0.3s ease;
}

.step-text {
  color: white;
  font-weight: 700;
}

.indicator-completed {
  background: linear-gradient(135deg, #4CAF50, #45a049);
  border: 3px solid #e8f5e8;
}

.indicator-active {
  background: linear-gradient(135deg, #FF9800, #f57c00);
  border: 3px solid #fff3e0;
  animation: pulse 2s infinite;
}

.indicator-rejected {
  background: linear-gradient(135deg, #f44336, #d32f2f);
  border: 3px solid #ffebee;
}

.indicator-pending {
  background: linear-gradient(135deg, #9E9E9E, #757575);
  border: 3px solid #f5f5f5;
}

@keyframes pulse {
  0% {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15), 0 0 0 0 rgba(255, 152, 0, 0.7);
  }
  70% {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15), 0 0 0 10px rgba(255, 152, 0, 0);
  }
  100% {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15), 0 0 0 0 rgba(255, 152, 0, 0);
  }
}


.step-connector {
  position: absolute;
  top: 48px;
  left: 50%;
  transform: translateX(-50%);
  width: 4px;
  height: 32px;
  border-radius: 2px;
  transition: all 0.3s ease;
}

.connector-completed {
  background: linear-gradient(180deg, #4CAF50, #45a049);
}

.connector-pending {
  background: linear-gradient(180deg, #e0e0e0, #bdbdbd);
}


.step-content {
  flex: 1;
  max-width: calc(100% - 72px);
}

.step-card {
  border-radius: 16px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  transition: all 0.3s ease;
  overflow: hidden;
}

.card-active {
  border-color: rgba(255, 152, 0, 0.3);
  box-shadow: 0 8px 24px rgba(255, 152, 0, 0.15);
}

.card-completed {
  border-color: rgba(76, 175, 80, 0.3);
  background: rgba(76, 175, 80, 0.02);
}

.step-card-header {
  padding: 20px 24px;
  background: white;
  transition: all 0.3s ease;
}

.header-active {
  background: linear-gradient(135deg, #FF9800, #f57c00);
  color: white;
}

.step-title {
  font-size: 1.125rem;
  font-weight: 600;
  margin: 0;
  line-height: 1.4;
}

.step-subtitle {
  font-size: 0.875rem;
  margin: 4px 0 0 0;
  line-height: 1.4;
  opacity: 0.8;
}

.step-status-badge {
  flex-shrink: 0;
}

.step-card-body {
  background: white;
}

.step-info-grid {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
}

.info-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 12px;
  background: rgba(25, 118, 210, 0.04);
  border-radius: 12px;
  border: 1px solid rgba(25, 118, 210, 0.1);
}

.info-label {
  display: block;
  font-size: 0.75rem;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.6);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.info-value {
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  color: rgba(0, 0, 0, 0.87);
  margin-top: 2px;
}


.step-comment {
  background: rgba(33, 150, 243, 0.04);
  border: 1px solid rgba(33, 150, 243, 0.12);
  border-radius: 12px;
  padding: 16px;
}

.comment-header {
  display: flex;
  align-items: center;
}

.comment-body {
  background: white;
  padding: 12px 16px;
  border-radius: 8px;
  border-left: 4px solid rgb(var(--v-theme-primary));
  font-size: 0.875rem;
  line-height: 1.5;
  color: rgba(0, 0, 0, 0.8);
}


.step-features {
  border-top: 1px solid rgba(0, 0, 0, 0.06);
  padding-top: 16px;
}

.step-card-actions {
  background: rgba(25, 118, 210, 0.02);
  border-top: 1px solid rgba(25, 118, 210, 0.1);
}

.execute-button {
  border-radius: 12px;
  font-weight: 600;
  text-transform: none;
  letter-spacing: 0.25px;
  box-shadow: 0 4px 12px rgba(25, 118, 210, 0.3);
}

.execute-button:hover {
  box-shadow: 0 6px 16px rgba(25, 118, 210, 0.4);
  transform: translateY(-1px);
}


@media (max-width: 768px) {
  .workflow-step {
    flex-direction: column;
    margin-bottom: 24px;
  }
  
  .step-indicator {
    margin-right: 0;
    margin-bottom: 16px;
    flex-direction: row;
    justify-content: center;
  }
  
  .step-connector {
    display: none;
  }
  
  .step-content {
    max-width: 100%;
  }
  
  .step-info-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }
  
  .info-item {
    padding: 10px;
  }
  
  .step-number {
    width: 40px;
    height: 40px;
    font-size: 14px;
  }
  
  .step-title {
    font-size: 1rem;
  }
}

@media (max-width: 480px) {
  .workflow-container {
    padding: 16px;
  }
  
  .step-card-header {
    padding: 16px;
  }
  
  .step-card-body {
    padding: 16px;
  }
  
  .step-card-actions {
    padding: 16px;
  }
}


.elevation-transition {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.step-card:hover {
  transform: translateY(-2px);
}

.card-active:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 32px rgba(255, 152, 0, 0.2);
}


.workflow-container::-webkit-scrollbar {
  width: 6px;
}

.workflow-container::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.05);
  border-radius: 3px;
}

.workflow-container::-webkit-scrollbar-thumb {
  background: rgba(25, 118, 210, 0.3);
  border-radius: 3px;
}

.workflow-container::-webkit-scrollbar-thumb:hover {
  background: rgba(25, 118, 210, 0.5);
}
</style>