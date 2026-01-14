<template>
  <v-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    max-width="700"
    scrollable
  >
    <v-card v-if="execution" class="step-detail-card">
      <!-- Header -->
      <div class="step-header" :class="getHeaderClass()">
        <div class="d-flex align-center justify-space-between pa-4">
          <div class="d-flex align-center">
            <v-avatar :color="getStepTypeColor()" size="48" class="mr-3">
              <v-icon color="white" size="24">{{ getStepTypeIcon() }}</v-icon>
            </v-avatar>
            <div>
              <v-chip size="x-small" :color="getStepTypeColor()" variant="flat" class="mb-1">
                {{ getStepTypeLabel() }}
              </v-chip>
              <h3 class="text-h6 font-weight-bold" :class="{ 'text-white': execution.status === 'IN_PROGRESS' }">
                {{ execution.step?.name || 'Etapa' }}
              </h3>
            </div>
          </div>
          <v-chip
            :color="getStatusColor()"
            :variant="execution.status === 'IN_PROGRESS' ? 'flat' : 'tonal'"
          >
            <v-icon start size="16">{{ getStatusIcon() }}</v-icon>
            {{ getStatusLabel() }}
          </v-chip>
        </div>
      </div>

      <v-divider />

      <v-card-text class="pa-6" style="max-height: 70vh; overflow-y: auto;">
        <!-- Descrição/Instruções -->
        <div v-if="execution.step?.description || execution.step?.instructions" class="mb-6">
          <h4 class="text-subtitle-2 font-weight-medium mb-2 d-flex align-center">
            <v-icon size="18" class="mr-2" color="info">mdi-clipboard-text</v-icon>
            Instruções
          </h4>
          <v-alert type="info" variant="tonal" density="compact">
            {{ execution.step?.instructions || execution.step?.description }}
          </v-alert>
        </div>

        <!-- Informações Básicas -->
        <div class="info-grid mb-6">
          <div v-if="getResponsibleName()" class="info-card">
            <v-icon size="20" color="primary">mdi-account-check</v-icon>
            <div>
              <span class="info-label">Responsável</span>
              <span class="info-value">{{ getResponsibleName() }}</span>
            </div>
          </div>

          <div v-if="execution.executor" class="info-card">
            <v-icon size="20" color="success">mdi-account-edit</v-icon>
            <div>
              <span class="info-label">Executado por</span>
              <span class="info-value">{{ execution.executor.name }}</span>
            </div>
          </div>

          <div v-if="execution.dueAt" class="info-card" :class="{ 'error-bg': isOverdue }">
            <v-icon size="20" :color="isOverdue ? 'error' : 'warning'">
              {{ isOverdue ? 'mdi-clock-alert' : 'mdi-clock-outline' }}
            </v-icon>
            <div>
              <span class="info-label">Prazo</span>
              <span class="info-value" :class="{ 'text-error': isOverdue }">
                {{ formatDate(execution.dueAt) }}
              </span>
            </div>
          </div>

          <div v-if="execution.completedAt" class="info-card">
            <v-icon size="20" color="success">mdi-check-circle</v-icon>
            <div>
              <span class="info-label">Concluído em</span>
              <span class="info-value">{{ formatDate(execution.completedAt) }}</span>
            </div>
          </div>
        </div>

        <!-- Ação Executada (Aprovação) -->
        <div v-if="execution.action" class="mb-6">
          <h4 class="text-subtitle-2 font-weight-medium mb-2 d-flex align-center">
            <v-icon size="18" class="mr-2" color="warning">mdi-gesture-tap</v-icon>
            Decisão
          </h4>
          <v-chip
            :color="getActionColor(execution.action)"
            variant="flat"
            size="large"
          >
            <v-icon start>{{ getActionIcon(execution.action) }}</v-icon>
            {{ getActionLabel(execution.action) }}
          </v-chip>
        </div>

        <!-- Comentário -->
        <div v-if="execution.comment" class="mb-6">
          <h4 class="text-subtitle-2 font-weight-medium mb-2 d-flex align-center">
            <v-icon size="18" class="mr-2" color="secondary">mdi-comment-text</v-icon>
            Comentário
          </h4>
          <v-card variant="tonal" color="secondary" class="pa-3">
            <p class="text-body-2 mb-0">{{ execution.comment }}</p>
          </v-card>
        </div>

        <!-- Dados Preenchidos (INPUT / REVIEW) - não exibir para APPROVAL -->
        <div v-if="hasMetadata && stepType !== 'APPROVAL'" class="mb-6">
          <h4 class="text-subtitle-2 font-weight-medium mb-3 d-flex align-center">
            <v-icon size="18" class="mr-2" color="primary">mdi-form-textbox</v-icon>
            Dados Preenchidos
          </h4>
          <div class="metadata-list">
            <div 
              v-for="(value, key, index) in parsedMetadata" 
              :key="key"
              class="metadata-item"
            >
              <v-icon size="18" color="grey" class="metadata-icon">{{ getFieldIcon(key) }}</v-icon>
              <div class="metadata-content">
                <span class="metadata-label">{{ formatFieldLabel(key) }}</span>
                <span class="metadata-value">{{ formatFieldValue(value, key) }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Anexos -->
        <div v-if="hasAttachments" class="mb-6">
          <h4 class="text-subtitle-2 font-weight-medium mb-3 d-flex align-center">
            <v-icon size="18" class="mr-2" color="info">mdi-paperclip</v-icon>
            Anexos ({{ execution.attachments.length }})
          </h4>
          <div class="attachments-list">
            <div
              v-for="attachment in execution.attachments"
              :key="attachment.id"
              class="attachment-item"
              @click="openAttachmentPreview(attachment)"
            >
              <div class="attachment-icon">
                <v-icon :color="getAttachmentColor(attachment)" size="28">
                  {{ getAttachmentIcon(attachment) }}
                </v-icon>
              </div>
              <div class="attachment-info">
                <span class="attachment-name">{{ attachment.originalName }}</span>
                <div class="attachment-meta">
                  <span class="attachment-size">{{ formatFileSize(attachment.size) }}</span>
                  <v-chip v-if="attachment.isSigned" size="x-small" color="success" variant="tonal" class="ml-2">
                    <v-icon start size="10">mdi-check-decagram</v-icon>
                    Assinado
                  </v-chip>
                </div>
              </div>
              <v-btn
                icon="mdi-download"
                size="small"
                variant="tonal"
                color="primary"
                class="download-btn"
                @click.stop="downloadAttachment(attachment)"
              />
            </div>
          </div>
        </div>

        <!-- Revisão Específica -->
        <div v-if="isReviewStep && reviewData" class="mb-6">
          <h4 class="text-subtitle-2 font-weight-medium mb-3 d-flex align-center">
            <v-icon size="18" class="mr-2" color="teal">mdi-text-box-check</v-icon>
            Revisão
          </h4>
          <div class="review-container">
            <div v-if="reviewData.approved !== undefined" class="review-status-item">
              <v-chip
                :color="reviewData.approved ? 'success' : 'error'"
                variant="flat"
                size="large"
              >
                <v-icon start>{{ reviewData.approved ? 'mdi-check-decagram' : 'mdi-close-octagon' }}</v-icon>
                {{ reviewData.approved ? 'Aprovado' : 'Reprovado' }}
              </v-chip>
            </div>
            <div v-if="reviewData.comments" class="review-comments-item">
              <v-icon size="18" color="grey" class="mr-3">mdi-comment-text</v-icon>
              <div class="review-comments-content">
                <span class="review-comments-label">Observações da Revisão</span>
                <span class="review-comments-value">{{ reviewData.comments }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Assinaturas -->
        <div v-if="hasSignatures" class="mb-6">
          <h4 class="text-subtitle-2 font-weight-medium mb-3 d-flex align-center">
            <v-icon size="18" class="mr-2" color="error">mdi-draw-pen</v-icon>
            Assinaturas
          </h4>
          <div class="signatures-list">
            <div 
              v-for="(record, index) in signatureRecords" 
              :key="record.id"
              class="signature-item"
            >
              <v-icon 
                :color="record.status === 'SIGNED' ? 'success' : 'warning'" 
                size="28"
                class="signature-icon"
              >
                {{ record.status === 'SIGNED' ? 'mdi-check-decagram' : 'mdi-clock-outline' }}
              </v-icon>
              <div class="signature-content">
                <span class="signature-name">{{ record.signer?.name || 'Assinante' }}</span>
                <div class="signature-meta">
                  <v-chip 
                    size="x-small" 
                    :color="record.status === 'SIGNED' ? 'success' : 'warning'" 
                    variant="tonal"
                  >
                    {{ record.status === 'SIGNED' ? 'Assinado' : 'Pendente' }}
                  </v-chip>
                  <span v-if="record.signedAt" class="signature-date">
                    em {{ formatDate(record.signedAt) }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Etapa Pendente/Em Progresso -->
        <div v-if="execution.status === 'PENDING' || execution.status === 'IN_PROGRESS'" class="text-center py-4">
          <v-icon size="48" color="grey-lighten-1" class="mb-2">
            {{ execution.status === 'IN_PROGRESS' ? 'mdi-progress-clock' : 'mdi-clock-outline' }}
          </v-icon>
          <p class="text-body-2 text-grey">
            {{ execution.status === 'IN_PROGRESS' ? 'Esta etapa está em andamento' : 'Esta etapa ainda não foi iniciada' }}
          </p>
        </div>
      </v-card-text>

      <v-divider />

      <v-card-actions class="pa-4">
        <v-spacer />
        <v-btn
          variant="text"
          @click="$emit('update:modelValue', false)"
        >
          Fechar
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- Modal de Visualização de Anexo -->
  <v-dialog v-model="attachmentPreviewDialog" max-width="900" scrollable>
    <v-card v-if="selectedAttachment" class="attachment-preview-card">
      <v-card-title class="d-flex align-center justify-space-between pa-4">
        <div class="d-flex align-center">
          <v-icon :color="getAttachmentColor(selectedAttachment)" size="28" class="mr-3">
            {{ getAttachmentIcon(selectedAttachment) }}
          </v-icon>
          <div>
            <span class="text-h6 font-weight-bold">{{ selectedAttachment.originalName }}</span>
            <div class="text-caption text-grey">{{ formatFileSize(selectedAttachment.size) }}</div>
          </div>
        </div>
        <div class="d-flex ga-2">
          <v-btn
            v-if="isPdfAttachment || isImageAttachment"
            variant="tonal"
            color="secondary"
            @click="openInNewTab(selectedAttachment)"
          >
            <v-icon start>mdi-open-in-new</v-icon>
            Abrir
          </v-btn>
          <v-btn
            variant="tonal"
            color="primary"
            @click="downloadAttachment(selectedAttachment)"
          >
            <v-icon start>mdi-download</v-icon>
            Baixar
          </v-btn>
          <v-btn
            icon="mdi-close"
            variant="text"
            @click="attachmentPreviewDialog = false"
          />
        </div>
      </v-card-title>

      <v-divider />

      <v-card-text class="pa-0" style="height: 70vh; overflow: hidden;">
        <!-- Loading -->
        <div v-if="loadingPreview" class="loading-preview-container">
          <v-progress-circular indeterminate color="primary" size="48" />
          <p class="text-body-1 text-grey mt-4">Carregando visualização...</p>
        </div>

        <!-- Preview de PDF -->
        <iframe
          v-else-if="isPdfAttachment && attachmentPreviewUrl"
          :src="attachmentPreviewUrl"
          width="100%"
          height="100%"
          style="border: none;"
        />

        <!-- Preview de Imagem -->
        <div v-else-if="isImageAttachment && attachmentPreviewUrl" class="image-preview-container">
          <img
            :src="attachmentPreviewUrl"
            :alt="selectedAttachment.originalName"
            class="image-preview"
          />
        </div>

        <!-- Outros tipos - não suportado preview -->
        <div v-else-if="!loadingPreview" class="no-preview-container">
          <v-icon size="80" color="grey-lighten-1">mdi-file-document-outline</v-icon>
          <p class="text-h6 text-grey mt-4">Pré-visualização não disponível</p>
          <p class="text-body-2 text-grey">Este tipo de arquivo não pode ser visualizado diretamente.</p>
          <v-btn
            color="primary"
            variant="elevated"
            class="mt-4"
            @click="downloadAttachment(selectedAttachment)"
          >
            <v-icon start>mdi-download</v-icon>
            Baixar Arquivo
          </v-btn>
        </div>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, computed } from 'vue'
import dayjs from 'dayjs'
import api from '@/services/api'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  execution: {
    type: Object,
    default: null
  }
})

defineEmits(['update:modelValue'])

// State para preview de anexo
const attachmentPreviewDialog = ref(false)
const selectedAttachment = ref(null)
const attachmentPreviewUrl = ref('')
const loadingPreview = ref(false)

// Computed
const stepType = computed(() => props.execution?.step?.type || 'INPUT')

const isReviewStep = computed(() => stepType.value === 'REVIEW')

const isOverdue = computed(() => {
  if (!props.execution?.dueAt) return false
  return dayjs().isAfter(dayjs(props.execution.dueAt))
})

const parsedMetadata = computed(() => {
  if (!props.execution?.metadata) return {}
  try {
    let metadata = {}
    if (typeof props.execution.metadata === 'string') {
      metadata = JSON.parse(props.execution.metadata)
    } else {
      metadata = props.execution.metadata
    }
    
    // Filtrar para remover fieldsUpdated e timestamp
    const filtered = {}
    for (const [key, value] of Object.entries(metadata)) {
      if (key !== 'fieldsUpdated' && key !== 'timestamp') {
        filtered[key] = value
      }
    }
    return filtered
  } catch {
    return {}
  }
})

const hasMetadata = computed(() => {
  return Object.keys(parsedMetadata.value).length > 0
})

const hasAttachments = computed(() => {
  return props.execution?.attachments?.length > 0
})

const reviewData = computed(() => {
  if (!isReviewStep.value) return null
  return parsedMetadata.value.review || parsedMetadata.value
})

const signatureRecords = computed(() => {
  // Coletar assinaturas de anexos
  const records = []
  if (props.execution?.attachments) {
    props.execution.attachments.forEach(att => {
      if (att.signatureRecords) {
        records.push(...att.signatureRecords)
      }
    })
  }
  return records
})

const hasSignatures = computed(() => signatureRecords.value.length > 0)

// Computed para preview de anexo
const isPdfAttachment = computed(() => {
  return selectedAttachment.value?.mimeType?.includes('pdf')
})

const isImageAttachment = computed(() => {
  return selectedAttachment.value?.mimeType?.includes('image')
})

// Methods
function getHeaderClass() {
  switch (props.execution?.status) {
    case 'IN_PROGRESS':
      return 'header-in-progress'
    case 'COMPLETED':
      return 'header-completed'
    case 'SKIPPED':
      return 'header-skipped'
    default:
      return 'header-pending'
  }
}

function getStepTypeColor() {
  const colors = {
    INPUT: 'blue',
    APPROVAL: 'orange',
    UPLOAD: 'purple',
    REVIEW: 'teal',
    SIGNATURE: 'red'
  }
  return colors[stepType.value] || 'grey'
}

function getStepTypeIcon() {
  const icons = {
    INPUT: 'mdi-form-textbox',
    APPROVAL: 'mdi-check-decagram',
    UPLOAD: 'mdi-upload',
    REVIEW: 'mdi-text-box-check',
    SIGNATURE: 'mdi-draw-pen'
  }
  return icons[stepType.value] || 'mdi-cog'
}

function getStepTypeLabel() {
  const labels = {
    INPUT: 'Entrada de Dados',
    APPROVAL: 'Aprovação',
    UPLOAD: 'Upload',
    REVIEW: 'Revisão',
    SIGNATURE: 'Assinatura'
  }
  return labels[stepType.value] || 'Etapa'
}

function getStatusColor() {
  const colors = {
    PENDING: 'grey',
    IN_PROGRESS: 'primary',
    COMPLETED: 'success',
    SKIPPED: 'warning',
    REJECTED: 'error'
  }
  return colors[props.execution?.status] || 'grey'
}

function getStatusIcon() {
  const icons = {
    PENDING: 'mdi-clock-outline',
    IN_PROGRESS: 'mdi-progress-clock',
    COMPLETED: 'mdi-check-circle',
    SKIPPED: 'mdi-skip-next',
    REJECTED: 'mdi-close-circle'
  }
  return icons[props.execution?.status] || 'mdi-help-circle'
}

function getStatusLabel() {
  const labels = {
    PENDING: 'Pendente',
    IN_PROGRESS: 'Em Progresso',
    COMPLETED: 'Concluído',
    SKIPPED: 'Pulado',
    REJECTED: 'Rejeitado'
  }
  return labels[props.execution?.status] || 'Desconhecido'
}

function getResponsibleName() {
  const step = props.execution?.step
  if (step?.assignedToUser?.name) return step.assignedToUser.name
  if (step?.assignedToSector?.name) return step.assignedToSector.name
  if (step?.assignedToCreator) return 'Criador do processo'
  return null
}

function getActionColor(action) {
  const actionUpper = action?.toUpperCase() || ''
  if (actionUpper.includes('APPROV') || actionUpper.includes('APROVAR') || actionUpper.includes('APROVAD')) {
    return 'success'
  }
  if (actionUpper.includes('REJECT') || actionUpper.includes('REPROVA') || actionUpper.includes('RECUSA')) {
    return 'error'
  }
  if (actionUpper.includes('RETURN') || actionUpper.includes('DEVOLV')) {
    return 'warning'
  }
  if (actionUpper.includes('FORWARD') || actionUpper.includes('ENCAMINH')) {
    return 'info'
  }
  return 'grey'
}

function getActionIcon(action) {
  const actionUpper = action?.toUpperCase() || ''
  if (actionUpper.includes('APPROV') || actionUpper.includes('APROVAR') || actionUpper.includes('APROVAD')) {
    return 'mdi-check-decagram'
  }
  if (actionUpper.includes('REJECT') || actionUpper.includes('REPROVA') || actionUpper.includes('RECUSA')) {
    return 'mdi-close-octagon'
  }
  if (actionUpper.includes('RETURN') || actionUpper.includes('DEVOLV')) {
    return 'mdi-undo'
  }
  if (actionUpper.includes('FORWARD') || actionUpper.includes('ENCAMINH')) {
    return 'mdi-arrow-right'
  }
  return 'mdi-gesture-tap'
}

function getActionLabel(action) {
  const actionUpper = action?.toUpperCase() || ''
  if (actionUpper.includes('APPROV') || actionUpper.includes('APROVAR') || actionUpper.includes('APROVAD')) {
    return 'Aprovado'
  }
  if (actionUpper.includes('REJECT') || actionUpper.includes('REPROVA') || actionUpper.includes('RECUSA')) {
    return 'Reprovado'
  }
  if (actionUpper.includes('RETURN') || actionUpper.includes('DEVOLV')) {
    return 'Devolvido'
  }
  if (actionUpper.includes('FORWARD') || actionUpper.includes('ENCAMINH')) {
    return 'Encaminhado'
  }
  return action || 'Ação'
}

function formatDate(date) {
  if (!date) return '-'
  return dayjs(date).format('DD/MM/YYYY [às] HH:mm')
}

function formatFieldLabel(key) {
  // Converter camelCase/snake_case para formato legível
  return key
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim()
}

function formatFieldValue(value, key) {
  if (value === null || value === undefined) return '-'
  if (typeof value === 'boolean') return value ? 'Sim' : 'Não'
  if (typeof value === 'object') return JSON.stringify(value)
  
  // Detectar datas
  if (key.toLowerCase().includes('date') || key.toLowerCase().includes('data')) {
    const date = dayjs(value)
    if (date.isValid()) return date.format('DD/MM/YYYY')
  }
  
  return String(value)
}

function getFieldIcon(key) {
  const keyLower = key.toLowerCase()
  if (keyLower.includes('date') || keyLower.includes('data')) return 'mdi-calendar'
  if (keyLower.includes('email')) return 'mdi-email'
  if (keyLower.includes('phone') || keyLower.includes('telefone')) return 'mdi-phone'
  if (keyLower.includes('valor') || keyLower.includes('value') || keyLower.includes('preco')) return 'mdi-currency-brl'
  if (keyLower.includes('cpf')) return 'mdi-card-account-details'
  if (keyLower.includes('cnpj')) return 'mdi-domain'
  return 'mdi-text'
}

function getAttachmentIcon(attachment) {
  const mimeType = attachment?.mimeType || ''
  if (mimeType.includes('pdf')) return 'mdi-file-pdf-box'
  if (mimeType.includes('image')) return 'mdi-file-image'
  if (mimeType.includes('word') || mimeType.includes('document')) return 'mdi-file-word'
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'mdi-file-excel'
  return 'mdi-file-document'
}

function getAttachmentColor(attachment) {
  const mimeType = attachment?.mimeType || ''
  if (mimeType.includes('pdf')) return 'red'
  if (mimeType.includes('image')) return 'green'
  if (mimeType.includes('word')) return 'blue'
  if (mimeType.includes('excel')) return 'green-darken-2'
  return 'grey'
}

function formatFileSize(bytes) {
  if (!bytes) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

function openAttachmentPreview(attachment) {
  selectedAttachment.value = attachment
  attachmentPreviewUrl.value = ''
  attachmentPreviewDialog.value = true
  loadPreviewContent(attachment)
}

async function loadPreviewContent(attachment) {
  const mimeType = attachment?.mimeType || ''
  // Só carregar preview para PDF e imagens
  if (!mimeType.includes('pdf') && !mimeType.includes('image')) {
    return
  }
  
  loadingPreview.value = true
  try {
    const response = await api.get(`/attachments/${attachment.id}/download`, {
      responseType: 'blob'
    })
    
    // Revogar URL anterior se existir
    if (attachmentPreviewUrl.value) {
      window.URL.revokeObjectURL(attachmentPreviewUrl.value)
    }
    
    const blob = new Blob([response.data], { type: mimeType })
    attachmentPreviewUrl.value = window.URL.createObjectURL(blob)
  } catch (error) {
    console.error('Erro ao carregar preview:', error)
    window.showSnackbar?.('Erro ao carregar visualização', 'error')
  } finally {
    loadingPreview.value = false
  }
}

function openInNewTab() {
  if (attachmentPreviewUrl.value) {
    window.open(attachmentPreviewUrl.value, '_blank')
  }
}

async function downloadAttachment(attachment) {
  try {
    const response = await api.get(`/attachments/${attachment.id}/download`, {
      responseType: 'blob'
    })
    
    const url = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', attachment.originalName)
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
  } catch (error) {
    console.error('Erro ao baixar anexo:', error)
    window.showSnackbar?.('Erro ao baixar anexo', 'error')
  }
}
</script>

<style scoped>
.step-detail-card {
  border-radius: 16px;
  overflow: hidden;
}

.step-header {
  transition: all 0.3s ease;
}

.header-pending {
  background: linear-gradient(135deg, #f5f5f5 0%, #e0e0e0 100%);
}

.header-in-progress {
  background: linear-gradient(135deg, #1976d2 0%, #1565c0 100%);
  color: white;
}

.header-completed {
  background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%);
}

.header-skipped {
  background: linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%);
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
}

.info-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: #f5f5f5;
  border-radius: 8px;
}

.info-card.error-bg {
  background: #ffebee;
}

.info-label {
  display: block;
  font-size: 0.75rem;
  color: #757575;
  margin-bottom: 2px;
}

.info-value {
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  color: #212121;
}

.cursor-pointer {
  cursor: pointer;
}

.cursor-pointer:hover {
  background-color: rgba(0, 0, 0, 0.04);
}

/* Estilos para anexos modernizados */
.attachments-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.attachment-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: linear-gradient(135deg, #f8f9fa 0%, #f1f3f4 100%);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.attachment-item:hover {
  background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
  transform: translateX(4px);
}

.attachment-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  background: white;
  border-radius: 10px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.attachment-info {
  flex: 1;
  min-width: 0;
}

.attachment-name {
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  color: #1a1a1a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.attachment-meta {
  display: flex;
  align-items: center;
  margin-top: 2px;
}

.attachment-size {
  font-size: 0.75rem;
  color: #757575;
}

.download-btn {
  flex-shrink: 0;
}

/* Estilos do modal de preview de anexo */
.attachment-preview-card {
  border-radius: 16px;
  overflow: hidden;
}

.image-preview-container {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  background: #1a1a1a;
  padding: 16px;
}

.image-preview {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

.no-preview-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 32px;
  background: #fafafa;
  text-align: center;
}

.loading-preview-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  background: #fafafa;
}

/* Estilos para lista de metadados sem bordas */
.metadata-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.metadata-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 16px;
  background: linear-gradient(135deg, #f8f9fa 0%, #f1f3f4 100%);
  border-radius: 12px;
  transition: all 0.2s ease;
}

.metadata-item:hover {
  background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
}

.metadata-icon {
  margin-top: 2px;
  flex-shrink: 0;
}

.metadata-content {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.metadata-label {
  font-size: 0.75rem;
  color: #757575;
  margin-bottom: 2px;
}

.metadata-value {
  font-size: 0.875rem;
  font-weight: 500;
  color: #1a1a1a;
  word-break: break-word;
}

/* Estilos para seção de revisão */
.review-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.review-status-item {
  padding: 16px;
  background: linear-gradient(135deg, #f8f9fa 0%, #f1f3f4 100%);
  border-radius: 12px;
  text-align: center;
}

.review-comments-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  background: linear-gradient(135deg, #f8f9fa 0%, #f1f3f4 100%);
  border-radius: 12px;
}

.review-comments-content {
  display: flex;
  flex-direction: column;
}

.review-comments-label {
  font-size: 0.75rem;
  color: #757575;
  margin-bottom: 4px;
}

.review-comments-value {
  font-size: 0.875rem;
  color: #1a1a1a;
}

/* Estilos para lista de assinaturas */
.signatures-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.signature-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: linear-gradient(135deg, #f8f9fa 0%, #f1f3f4 100%);
  border-radius: 12px;
  transition: all 0.2s ease;
}

.signature-item:hover {
  background: linear-gradient(135deg, #fce4ec 0%, #f8bbd0 100%);
}

.signature-icon {
  flex-shrink: 0;
}

.signature-content {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.signature-name {
  font-size: 0.875rem;
  font-weight: 500;
  color: #1a1a1a;
}

.signature-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
}

.signature-date {
  font-size: 0.75rem;
  color: #757575;
}
</style>
