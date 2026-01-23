<template>
  <v-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    max-width="640"
    scrollable
    aria-labelledby="step-detail-title"
  >
    <v-card v-if="execution" class="step-detail-card" role="dialog" aria-modal="true">
      <!-- Header Minimalista -->
      <div class="step-header" id="step-detail-title">
        <div class="header-top">
          <div class="step-type-badge" :class="`type-${stepType.toLowerCase()}`">
            <v-icon size="16">{{ getStepTypeIcon() }}</v-icon>
            <span>{{ getStepTypeLabel() }}</span>
          </div>
          <v-btn
            icon
            variant="text"
            size="small"
            @click="$emit('update:modelValue', false)"
            class="close-btn"
          >
            <v-icon size="20">mdi-close</v-icon>
          </v-btn>
        </div>
        <h2 class="step-title">{{ execution.step?.name || 'Etapa' }}</h2>
        <div class="status-badge" :class="`status-${execution.status?.toLowerCase()}`">
          <v-icon size="14">{{ getStatusIcon() }}</v-icon>
          <span>{{ getStatusLabel() }}</span>
        </div>
      </div>

      <v-card-text class="modal-content">
        <!-- Descrição/Instruções -->
        <div v-if="execution.step?.description || execution.step?.instructions" class="section instructions-section">
          <p class="instructions-text">
            {{ execution.step?.instructions || execution.step?.description }}
          </p>
        </div>

        <!-- Informações Básicas -->
        <div class="section info-section">
          <div class="info-row" v-if="getResponsibleName()">
            <span class="info-label">Responsável</span>
            <span class="info-value">{{ getResponsibleName() }}</span>
          </div>

          <div class="info-row" v-if="execution.executor">
            <span class="info-label">Executado por</span>
            <span class="info-value">{{ execution.executor.name }}</span>
          </div>

          <div class="info-row" v-if="execution.dueAt">
            <span class="info-label">Prazo</span>
            <span class="info-value" :class="{ 'overdue': isOverdue }">
              {{ formatDate(execution.dueAt) }}
              <v-icon v-if="isOverdue" size="14" color="error" class="ml-1">mdi-alert-circle</v-icon>
            </span>
          </div>

          <div class="info-row" v-if="execution.completedAt">
            <span class="info-label">Concluído em</span>
            <span class="info-value">{{ formatDate(execution.completedAt) }}</span>
          </div>
        </div>

        <!-- Ação Executada (Aprovação) - apenas para etapas de APPROVAL -->
        <div v-if="execution.action && stepType === 'APPROVAL'" class="section">
          <h4 class="section-title">Decisão</h4>
          <div class="decision-badge" :class="`decision-${getActionColor(execution.action)}`">
            <v-icon size="18">{{ getActionIcon(execution.action) }}</v-icon>
            <span>{{ getActionLabel(execution.action) }}</span>
          </div>
        </div>

        <!-- Comentário -->
        <div v-if="execution.comment" class="section">
          <h4 class="section-title">Comentário</h4>
          <div class="comment-box">
            <p>{{ execution.comment }}</p>
          </div>
        </div>

        <!-- Dados Preenchidos (INPUT / REVIEW) - não exibir para APPROVAL -->
        <div v-if="hasMetadata && stepType !== 'APPROVAL'" class="section">
          <h4 class="section-title">Dados Preenchidos</h4>
          <div class="data-list">
            <template v-for="(value, key) in nonReviewMetadata" :key="key">
              <!-- Campo Tabela -->
              <div v-if="Array.isArray(value) && value.length > 0 && typeof value[0] === 'object'" class="table-container">
                <span class="table-label">{{ formatFieldLabel(key) }}</span>
                <v-table density="compact" class="data-table">
                  <thead>
                    <tr>
                      <th v-for="column in Object.keys(value[0])" :key="column">
                        {{ formatFieldLabel(column) }}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(row, rowIndex) in value" :key="rowIndex">
                      <td v-for="column in Object.keys(value[0])" :key="column">
                        {{ formatFieldValue(row[column], column) }}
                      </td>
                    </tr>
                  </tbody>
                </v-table>
              </div>

              <!-- Campo Normal -->
              <div v-else class="data-row">
                <span class="data-label">{{ formatFieldLabel(key) }}</span>
                <span class="data-value">{{ formatFieldValue(value, key) }}</span>
              </div>
            </template>
          </div>
        </div>

        <!-- Anexos -->
        <div v-if="hasStepAttachments" class="section">
          <h4 class="section-title">
            Anexos
            <span class="count-badge">{{ stepAttachments.length }}</span>
          </h4>
          <div class="files-list">
            <div
              v-for="attachment in stepAttachments"
              :key="attachment.id"
              class="file-item"
              @click="openAttachmentPreview(attachment)"
            >
              <div class="file-icon" :class="`file-${getFileTypeClass(attachment)}`">
                <v-icon size="18">{{ getAttachmentIcon(attachment) }}</v-icon>
              </div>
              <div class="file-info">
                <span class="file-name">{{ attachment.originalName }}</span>
                <span class="file-meta">
                  {{ formatFileSize(attachment.size) }}
                  <span v-if="attachment.isSigned" class="signed-badge">
                    <v-icon size="12">mdi-check-decagram</v-icon>
                    Assinado
                  </span>
                </span>
              </div>
              <button
                class="file-action"
                @click.stop="downloadAttachment(attachment)"
                title="Baixar"
              >
                <v-icon size="18">mdi-download</v-icon>
              </button>
            </div>
          </div>
        </div>

        <!-- Revisão Específica -->
        <div v-if="isReviewStep && reviewData" class="section">
          <h4 class="section-title">Revisão</h4>
          <div class="data-list">
            <div
              v-for="(value, key) in reviewData"
              :key="key"
              class="data-row"
            >
              <span class="data-label">{{ formatFieldLabel(key) }}</span>
              <span class="data-value">{{ formatFieldValue(value, key) }}</span>
            </div>
          </div>
        </div>

        <!-- Assinaturas -->
        <div v-if="hasSignatures" class="section">
          <h4 class="section-title">
            Assinaturas
            <span class="count-badge">{{ signatureRecords.length }}</span>
          </h4>
          <div class="signatures-list">
            <div
              v-for="record in signatureRecords"
              :key="record.id"
              class="signer-item"
              :class="{ 'signed': record.status === 'COMPLETED' }"
            >
              <div class="signer-avatar" :class="record.status === 'COMPLETED' ? 'avatar-signed' : 'avatar-pending'">
                <v-icon size="16">{{ record.status === 'COMPLETED' ? 'mdi-check' : 'mdi-clock-outline' }}</v-icon>
              </div>
              <div class="signer-info">
                <span class="signer-name">{{ record.signer?.name || record.signerName || 'Assinante' }}</span>
                <span class="signer-status">
                  {{ record.status === 'COMPLETED' ? 'Assinado' : 'Aguardando assinatura' }}
                  <template v-if="record.signedAt"> · {{ formatDate(record.signedAt) }}</template>
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Etapa Pendente/Em Progresso -->
        <div v-if="execution.status === 'PENDING' || execution.status === 'IN_PROGRESS'" class="empty-state">
          <div class="empty-icon" :class="execution.status === 'IN_PROGRESS' ? 'in-progress' : ''">
            <v-icon size="24">
              {{ execution.status === 'IN_PROGRESS' ? 'mdi-progress-clock' : 'mdi-clock-outline' }}
            </v-icon>
          </div>
          <p class="empty-text">
            {{ execution.status === 'IN_PROGRESS' ? 'Esta etapa está em andamento' : 'Esta etapa ainda não foi iniciada' }}
          </p>
        </div>
      </v-card-text>
    </v-card>
  </v-dialog>

  <!-- Modal de Visualização de Anexo -->
  <v-dialog
    v-model="attachmentPreviewDialog"
    max-width="1100"
    scrollable
    :z-index="2100"
    :attach="false"
    aria-labelledby="attachment-preview-title"
  >
    <v-card v-if="selectedAttachment" class="attachment-preview-card" role="dialog" aria-modal="true">
      <v-card-title class="pa-0">
        <div id="attachment-preview-title" class="preview-header d-flex align-center justify-space-between px-6 py-3" style="background: linear-gradient(135deg, #1976d2 0%, #1565c0 100%);">
          <div class="d-flex align-center flex-grow-1" style="min-width: 0; gap: 16px;">
            <v-icon color="white" size="40" aria-hidden="true">
              {{ getAttachmentIcon(selectedAttachment) }}
            </v-icon>
            <div class="flex-grow-1" style="min-width: 0;">
              <div class="text-subtitle-1 font-weight-bold text-white text-truncate" :title="selectedAttachment.originalName">
                {{ selectedAttachment.originalName }}
              </div>
              <div class="text-caption d-flex align-center" style="color: rgba(255,255,255,0.9); margin-top: 2px;">
                <v-icon size="14" color="white" class="mr-1">mdi-file-document</v-icon>
                {{ formatFileSize(selectedAttachment.size) }}
              </div>
            </div>
          </div>
          <div class="d-flex align-center flex-shrink-0" style="gap: 12px;">
            <v-btn
              v-if="isPdfAttachment || isImageAttachment"
              variant="elevated"
              color="white"
              class="text-primary font-weight-medium"
              @click="openInNewTab(selectedAttachment)"
            >
              <v-icon start size="20">mdi-open-in-new</v-icon>
              Abrir
            </v-btn>
            <v-btn
              variant="elevated"
              color="white"
              class="text-primary font-weight-medium"
              @click="downloadAttachment(selectedAttachment)"
            >
              <v-icon start size="20">mdi-download</v-icon>
              Baixar
            </v-btn>
            <v-btn
              icon
              variant="text"
              color="white"
              size="small"
              @click="attachmentPreviewDialog = false"
            >
              <v-icon size="24">mdi-close</v-icon>
            </v-btn>
          </div>
        </div>
      </v-card-title>

      <v-divider />

      <v-card-text class="pa-0" style="height: 80vh; overflow: hidden;">
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
          style="border: none; display: block; min-height: 80vh;"
          loading="lazy"
          title="Visualização de PDF"
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
  console.log('🔍 StepExecutionDetailDialog - execution:', props.execution)
  console.log('🔍 StepExecutionDetailDialog - metadata:', props.execution?.metadata)
  console.log('🔍 StepExecutionDetailDialog - stepType:', stepType.value)
  
  if (!props.execution?.metadata) {
    console.log('❌ No metadata found')
    return {}
  }
  try {
    let metadata = {}
    if (typeof props.execution.metadata === 'string') {
      metadata = JSON.parse(props.execution.metadata)
    } else {
      metadata = props.execution.metadata
    }
    
    console.log('📦 Parsed metadata:', metadata)
    
    // Filtrar campos técnicos que não devem ser exibidos
    const filtered = {}
    for (const [key, value] of Object.entries(metadata)) {
      // Remover campos técnicos: fieldsUpdated, timestamp, e campos *_files (IDs de arquivos)
      if (key !== 'fieldsUpdated' && key !== 'timestamp' && !key.endsWith('_files')) {
        filtered[key] = value
      }
    }
    
    console.log('✅ Filtered metadata:', filtered)
    console.log('📊 Has metadata:', Object.keys(filtered).length > 0)
    
    return filtered
  } catch (e) {
    console.error('❌ Error parsing metadata:', e)
    return {}
  }
})

// Para etapas REVIEW, separar dados de revisão dos dados normais
const nonReviewMetadata = computed(() => {
  if (!isReviewStep.value) return parsedMetadata.value
  
  // Para REVIEW, filtrar campos que começam com 'review' do metadata normal
  const filtered = {}
  for (const [key, value] of Object.entries(parsedMetadata.value)) {
    if (!key.toLowerCase().includes('review')) {
      filtered[key] = value
    }
  }
  return filtered
})

const hasMetadata = computed(() => {
  return Object.keys(nonReviewMetadata.value).length > 0
})

const hasAttachments = computed(() => {
  return props.execution?.attachments?.length > 0
})

// Filtrar apenas anexos desta etapa específica
const stepAttachments = computed(() => {
  if (!props.execution?.attachments) return []
  
  // Filtrar anexos que:
  // 1. NÃO são do formulário principal (isFormField !== true)
  // 2. NÃO são de campos da etapa (isStepFormField !== true) - esses já aparecem nos dados
  // 3. SÃO anexos gerais adicionados na etapa
  return props.execution.attachments.filter(att => {
    return !att.isFormField && !att.isStepFormField
  })
})

const hasStepAttachments = computed(() => {
  return stepAttachments.value.length > 0
})

const reviewData = computed(() => {
  if (!isReviewStep.value) return null
  
  // Extrair campos de revisão do metadata
  const reviewFields = {}
  for (const [key, value] of Object.entries(parsedMetadata.value)) {
    if (key.toLowerCase().includes('review')) {
      reviewFields[key] = value
    }
  }
  
  return Object.keys(reviewFields).length > 0 ? reviewFields : null
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

function getFileTypeClass(attachment) {
  const mimeType = attachment?.mimeType || ''
  if (mimeType.includes('pdf')) return 'pdf'
  if (mimeType.includes('image')) return 'image'
  if (mimeType.includes('word')) return 'word'
  if (mimeType.includes('excel')) return 'excel'
  return 'default'
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

function openInNewTab(attachment = null) {
  // Se não tiver URL preview carregada mas tiver o attachment, abrir direto da API
  if (!attachmentPreviewUrl.value && attachment) {
    const url = `${import.meta.env.VITE_API_URL}/attachments/${attachment.id}/download`
    window.open(url, '_blank')
  } else if (attachmentPreviewUrl.value) {
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
/* ========================================
   MODAL DESIGN SYSTEM - CLEAN & MODERN
   ======================================== */

.step-detail-card {
  border-radius: 16px !important;
  overflow: hidden;
  box-shadow: 0 20px 40px -12px rgba(0, 0, 0, 0.12) !important;
  border: 1px solid var(--color-neutral-200);
}

/* Header Minimalista */
.step-header {
  padding: 20px 24px;
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-neutral-200);
}

.header-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.step-type-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.02em;
}

.step-type-badge.type-input {
  background: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
}

.step-type-badge.type-approval {
  background: rgba(245, 158, 11, 0.1);
  color: #f59e0b;
}

.step-type-badge.type-upload {
  background: rgba(139, 92, 246, 0.1);
  color: #8b5cf6;
}

.step-type-badge.type-review {
  background: rgba(20, 184, 166, 0.1);
  color: #14b8a6;
}

.step-type-badge.type-signature {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

.close-btn {
  color: var(--color-neutral-400) !important;
}

.close-btn:hover {
  background: var(--color-neutral-100) !important;
  color: var(--color-neutral-600) !important;
}

.step-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-neutral-900);
  margin: 0 0 8px 0;
  line-height: 1.3;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 0.8125rem;
  font-weight: 500;
}

.status-badge.status-pending {
  background: var(--color-neutral-100);
  color: var(--color-neutral-600);
}

.status-badge.status-in_progress {
  background: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
}

.status-badge.status-completed {
  background: rgba(34, 197, 94, 0.1);
  color: #16a34a;
}

.status-badge.status-skipped {
  background: rgba(245, 158, 11, 0.1);
  color: #d97706;
}

.status-badge.status-rejected {
  background: rgba(239, 68, 68, 0.1);
  color: #dc2626;
}

/* Modal Content */
.modal-content {
  padding: 0 !important;
  max-height: 65vh;
  overflow-y: auto;
}

/* Sections */
.section {
  padding: 20px 24px;
  border-bottom: 1px solid var(--color-neutral-100);
}

.section:last-child {
  border-bottom: none;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--color-neutral-500);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin: 0 0 12px 0;
}

.count-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  background: var(--color-neutral-200);
  color: var(--color-neutral-600);
  border-radius: 10px;
  font-size: 0.6875rem;
  font-weight: 600;
}

/* Instructions */
.instructions-section {
  background: var(--color-neutral-50);
}

.instructions-text {
  margin: 0;
  font-size: 0.875rem;
  color: var(--color-neutral-700);
  line-height: 1.6;
}

/* Info Section */
.info-section {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid var(--color-neutral-100);
}

.info-row:last-child {
  border-bottom: none;
}

.info-row .info-label {
  font-size: 0.8125rem;
  color: var(--color-neutral-500);
}

.info-row .info-value {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-neutral-800);
  display: flex;
  align-items: center;
}

.info-row .info-value.overdue {
  color: #dc2626;
}

/* Decision Badge */
.decision-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 600;
}

.decision-badge.decision-success {
  background: rgba(34, 197, 94, 0.1);
  color: #16a34a;
}

.decision-badge.decision-error {
  background: rgba(239, 68, 68, 0.1);
  color: #dc2626;
}

.decision-badge.decision-warning {
  background: rgba(245, 158, 11, 0.1);
  color: #d97706;
}

.decision-badge.decision-info {
  background: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
}

.decision-badge.decision-grey {
  background: var(--color-neutral-100);
  color: var(--color-neutral-600);
}

/* Comment Box */
.comment-box {
  padding: 14px 16px;
  background: var(--color-neutral-50);
  border-radius: 8px;
  border-left: 3px solid var(--color-neutral-300);
}

.comment-box p {
  margin: 0;
  font-size: 0.875rem;
  color: var(--color-neutral-700);
  line-height: 1.5;
}

/* Data List */
.data-list {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.data-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 10px 0;
  border-bottom: 1px solid var(--color-neutral-100);
}

.data-row:last-child {
  border-bottom: none;
}

.data-label {
  font-size: 0.8125rem;
  color: var(--color-neutral-500);
  flex-shrink: 0;
  margin-right: 16px;
}

.data-value {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-neutral-800);
  text-align: right;
  word-break: break-word;
}

/* Table Container */
.table-container {
  margin-bottom: 16px;
}

.table-container:last-child {
  margin-bottom: 0;
}

.table-label {
  display: block;
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--color-neutral-600);
  margin-bottom: 8px;
}

.data-table {
  border: 1px solid var(--color-neutral-200);
  border-radius: 8px;
  overflow: hidden;
}

.data-table thead {
  background: var(--color-neutral-100);
}

.data-table thead th {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-neutral-600);
  text-transform: uppercase;
  letter-spacing: 0.02em;
  padding: 10px 12px;
  text-align: left;
}

.data-table tbody td {
  font-size: 0.8125rem;
  color: var(--color-neutral-700);
  padding: 10px 12px;
  border-bottom: 1px solid var(--color-neutral-100);
}

.data-table tbody tr:last-child td {
  border-bottom: none;
}

/* Files List */
.files-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.file-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  background: var(--color-neutral-50);
  border: 1px solid var(--color-neutral-200);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.file-item:hover {
  background: white;
  border-color: var(--color-primary-300);
}

.file-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  flex-shrink: 0;
}

.file-icon.file-pdf {
  background: rgba(239, 68, 68, 0.1);
  color: #dc2626;
}

.file-icon.file-image {
  background: rgba(34, 197, 94, 0.1);
  color: #16a34a;
}

.file-icon.file-word {
  background: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
}

.file-icon.file-excel {
  background: rgba(34, 197, 94, 0.1);
  color: #16a34a;
}

.file-icon.file-default {
  background: var(--color-neutral-100);
  color: var(--color-neutral-500);
}

.file-info {
  flex: 1;
  min-width: 0;
}

.file-name {
  display: block;
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--color-neutral-800);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.file-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.75rem;
  color: var(--color-neutral-500);
  margin-top: 2px;
}

.signed-badge {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  color: #16a34a;
  font-weight: 500;
}

.file-action {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  color: var(--color-neutral-400);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.file-action:hover {
  background: var(--color-primary-100);
  color: var(--color-primary-600);
}

/* Signatures List */
.signatures-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.signer-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 0;
  border-bottom: 1px solid var(--color-neutral-100);
}

.signer-item:last-child {
  border-bottom: none;
}

.signer-avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  flex-shrink: 0;
}

.signer-avatar.avatar-signed {
  background: rgba(34, 197, 94, 0.1);
  color: #16a34a;
}

.signer-avatar.avatar-pending {
  background: var(--color-neutral-100);
  color: var(--color-neutral-500);
}

.signer-info {
  flex: 1;
  min-width: 0;
}

.signer-name {
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-neutral-800);
}

.signer-status {
  font-size: 0.75rem;
  color: var(--color-neutral-500);
}

.signer-item.signed .signer-status {
  color: #16a34a;
}

/* Empty State */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 24px;
  text-align: center;
}

.empty-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: var(--color-neutral-100);
  color: var(--color-neutral-400);
  margin-bottom: 12px;
}

.empty-icon.in-progress {
  background: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
}

.empty-text {
  margin: 0;
  font-size: 0.875rem;
  color: var(--color-neutral-500);
}

/* Attachment Preview Modal */
.attachment-preview-card {
  display: flex;
  flex-direction: column;
  max-height: 95vh;
  border-radius: 16px !important;
  overflow: hidden;
}

.attachment-preview-card .v-card-title {
  flex-shrink: 0;
}

.attachment-preview-card .v-card-text {
  flex: 1;
  overflow: hidden;
  position: relative;
  min-height: 0;
  background: var(--color-neutral-100);
}

.loading-preview-container,
.no-preview-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 32px;
}

.image-preview-container {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  overflow: auto;
  background: var(--color-neutral-900);
  padding: 16px;
}

.image-preview {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  border-radius: 8px;
}

/* Global Overrides */
:deep(.v-btn) {
  text-transform: none;
  font-weight: 500;
}
</style>
