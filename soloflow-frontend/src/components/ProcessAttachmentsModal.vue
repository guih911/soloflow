<template>
  <v-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    max-width="1200"
    scrollable
    class="process-attachments-modal"
  >
    <v-card class="attachments-modal-card">
      <v-card-title class="d-flex align-center justify-space-between pa-6">
        <div class="d-flex align-center">
          <v-avatar color="primary" size="48" class="mr-4">
            <v-icon size="24" color="white">mdi-paperclip</v-icon>
          </v-avatar>
          <div>
            <h3 class="text-h5 font-weight-bold">Todos os Anexos do Processo</h3>
            <p class="text-body-2 text-medium-emphasis mt-1">
              {{ processCode }} - {{ allAttachments.length }} arquivo(s) anexado(s)
            </p>
          </div>
        </div>
        <v-btn
          icon="mdi-close"
          variant="text"
          @click="close"
        />
      </v-card-title>

      <v-divider />

      <!-- Filtros e Controles -->
      <div class="attachments-controls pa-4">
        <v-row align="center">
          <v-col cols="12" md="4">
            <v-text-field
              v-model="searchQuery"
              label="Buscar arquivos"
              prepend-inner-icon="mdi-magnify"
              variant="outlined"
              density="compact"
              clearable
              hide-details
            />
          </v-col>
          
          <v-col cols="12" md="3">
            <v-select
              v-model="filterBySource"
              :items="sourceOptions"
              label="Filtrar por origem"
              variant="outlined"
              density="compact"
              clearable
              hide-details
            />
          </v-col>
          
          <v-col cols="12" md="3">
            <v-select
              v-model="filterByType"
              :items="typeOptions"
              label="Filtrar por tipo"
              variant="outlined"
              density="compact"
              clearable
              hide-details
            />
          </v-col>
          
          <v-col cols="12" md="2">
            <v-btn
              color="primary"
              variant="outlined"
              @click="downloadAllAttachments"
              :loading="downloadingAll"
              block
            >
              <v-icon start>mdi-download-multiple</v-icon>
              Baixar Todos
            </v-btn>
          </v-col>
        </v-row>
      </div>

      <v-divider />

      <!-- Lista de Anexos -->
      <div class="attachments-content">
        <div v-if="loading" class="loading-state pa-6 text-center">
          <v-progress-circular indeterminate color="primary" size="64" />
          <p class="text-body-2 text-grey mt-4">Carregando anexos...</p>
        </div>

        <div v-else-if="filteredAttachments.length === 0" class="empty-state pa-6 text-center">
          <v-icon size="64" color="grey-lighten-1">mdi-file-outline</v-icon>
          <h3 class="text-h6 mt-4 text-grey">
            {{ searchQuery || filterBySource || filterByType ? 'Nenhum anexo encontrado' : 'Nenhum anexo no processo' }}
          </h3>
          <p class="text-body-2 text-grey mt-2">
            {{ searchQuery || filterBySource || filterByType ? 
                'Tente ajustar os filtros de busca' : 
                'Anexos serão exibidos aqui conforme forem adicionados nas etapas' }}
          </p>
        </div>

        <div v-else class="attachments-list">
          <!-- Agrupamento por Origem -->
          <div 
            v-for="group in groupedAttachments" 
            :key="group.source"
            class="attachment-group mb-4"
          >
            <div class="group-header pa-4">
              <div class="d-flex align-center">
                <v-avatar 
                  :color="getSourceColor(group.sourceType)" 
                  size="40" 
                  class="mr-3"
                >
                  <v-icon size="20" color="white">
                    {{ getSourceIcon(group.sourceType) }}
                  </v-icon>
                </v-avatar>
                <div>
                  <h4 class="text-subtitle-1 font-weight-bold">{{ group.source }}</h4>
                  <p class="text-caption text-medium-emphasis">
                    {{ group.attachments.length }} arquivo(s) • 
                    {{ formatTotalSize(group.attachments) }}
                  </p>
                </div>
                <v-spacer />
                <v-btn
                  icon="mdi-download-multiple"
                  variant="text"
                  size="small"
                  @click="downloadGroupAttachments(group.attachments)"
                  :loading="downloadingGroup === group.source"
                >
                  <v-tooltip activator="parent">
                    Baixar todos desta origem
                  </v-tooltip>
                </v-btn>
              </div>
            </div>

            <v-divider />

            <div class="group-attachments">
              <v-list lines="two" class="py-0">
                <template v-for="(attachment, index) in group.attachments" :key="attachment.id">
                  <v-list-item
                    class="attachment-item pa-4"
                    @click="selectAttachment(attachment)"
                    :class="{ 'attachment-selected': selectedAttachment?.id === attachment.id }"
                  >
                    <template #prepend>
                      <v-avatar
                        :color="getFileTypeColor(attachment.mimeType)"
                        size="48"
                        class="attachment-avatar"
                      >
                        <v-icon
                          :icon="getFileIcon(attachment.mimeType)"
                          color="white"
                          size="24"
                        />
                      </v-avatar>
                    </template>

                    <v-list-item-title class="font-weight-medium">
                      {{ attachment.displayName || attachment.originalName }}
                      <v-chip
                        v-if="attachment.isSigned"
                        size="x-small"
                        color="success"
                        variant="tonal"
                        class="ml-2"
                      >
                        <v-icon start size="12">mdi-check-decagram</v-icon>
                        Assinado
                      </v-chip>
                    </v-list-item-title>

                    <v-list-item-subtitle>
                      <div class="d-flex align-center flex-wrap gap-2 mt-1">
                        <span>{{ formatFileSize(attachment.size) }}</span>
                        <v-divider vertical />
                        <span>{{ getFileTypeName(attachment.mimeType) }}</span>
                        <v-divider vertical />
                        <span>{{ formatDate(attachment.createdAt) }}</span>
                        
                        <!-- Badges adicionais -->
                        <v-chip
                          size="x-small"
                          :color="getSourceColor(attachment.attachmentType)"
                          variant="tonal"
                        >
                          <v-icon start size="12">{{ getSourceIcon(attachment.attachmentType) }}</v-icon>
                          {{ attachment.attachmentSource }}
                        </v-chip>
                        
                        <v-chip
                          v-if="canPreview(attachment)"
                          size="x-small"
                          color="info"
                          variant="tonal"
                        >
                          <v-icon start size="12">mdi-eye</v-icon>
                          Visualizável
                        </v-chip>
                      </div>
                    </v-list-item-subtitle>

                    <template #append>
                      <div class="attachment-actions d-flex align-center gap-1">
                        <v-btn
                          v-if="canPreview(attachment)"
                          icon="mdi-eye"
                          variant="text"
                          size="small"
                          color="info"
                          @click.stop="previewAttachment(attachment)"
                        >
                          <v-tooltip activator="parent">Visualizar</v-tooltip>
                        </v-btn>
                        
                        <v-btn
                          icon="mdi-open-in-new"
                          variant="text"
                          size="small"
                          @click.stop="openInNewTab(attachment)"
                        >
                          <v-tooltip activator="parent">Abrir</v-tooltip>
                        </v-btn>
                        
                        <v-btn
                          icon="mdi-download"
                          variant="text"
                          size="small"
                          color="primary"
                          @click.stop="downloadAttachment(attachment)"
                          :loading="downloadingItem === attachment.id"
                        >
                          <v-tooltip activator="parent">Download</v-tooltip>
                        </v-btn>
                      </div>
                    </template>
                  </v-list-item>
                  
                  <v-divider v-if="index < group.attachments.length - 1" />
                </template>
              </v-list>
            </div>
          </div>
        </div>
      </div>

      <v-divider />

      <!-- Rodapé com Resumo -->
      <v-card-actions class="pa-6">
        <div class="d-flex align-center text-caption text-medium-emphasis">
          <v-icon size="16" class="mr-1">mdi-chart-box</v-icon>
          Total: {{ allAttachments.length }} arquivo(s) • 
          {{ formatTotalSize(allAttachments) }} • 
          {{ uniqueSourcesCount }} origem(ns)
        </div>
        
        <v-spacer />
        
        <div class="actions-container">
          <v-btn variant="text" @click="close" class="mr-3">
            Fechar
          </v-btn>
          
          <v-btn
            v-if="selectedAttachment"
            color="info"
            variant="elevated"
            @click="previewAttachment(selectedAttachment)"
            class="mr-3"
          >
            <v-icon start>mdi-eye</v-icon>
            Visualizar Selecionado
          </v-btn>
          
          <v-btn
            color="primary"
            variant="elevated"
            @click="downloadSelectedOrAll"
            :loading="downloadingAll"
          >
            <v-icon start>mdi-download</v-icon>
            {{ selectedAttachment ? 'Baixar Selecionado' : 'Baixar Todos' }}
          </v-btn>
        </div>
      </v-card-actions>
    </v-card>

    <!-- Preview Modal -->
    <AttachmentPreviewModal
      v-model="previewModal"
      :attachment="attachmentToPreview"
    />
  </v-dialog>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import dayjs from 'dayjs'
import AttachmentPreviewModal from './AttachmentPreviewModal.vue'

const props = defineProps({
  modelValue: Boolean,
  process: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['update:modelValue'])

// Estado
const loading = ref(true)
const downloadingAll = ref(false)
const downloadingGroup = ref('')
const downloadingItem = ref('')
const searchQuery = ref('')
const filterBySource = ref('')
const filterByType = ref('')
const selectedAttachment = ref(null)
const previewModal = ref(false)
const attachmentToPreview = ref(null)

// Computed
const processCode = computed(() => props.process?.code || '')

const allAttachments = computed(() => {
  if (!props.process) return []
  
  const attachments = []
  
  // 1. Anexos do formulário inicial (campos FILE)
  if (props.process.formData && props.process.processType?.formFields) {
    props.process.processType.formFields
      .filter(field => field.type === 'FILE')
      .forEach(field => {
        const fieldData = props.process.formData[field.name]
        if (fieldData) {
          const processFieldAttachments = Array.isArray(fieldData) ? fieldData : [fieldData]
          processFieldAttachments.forEach((item, index) => {
            if (item && item.attachmentId) {
              attachments.push({
                ...item,
                id: item.attachmentId,
                attachmentType: 'form',
                attachmentSource: 'Formulário Inicial',
                stepName: 'Solicitação Inicial',
                stepOrder: 0,
                fieldLabel: field.label,
                displayName: `${field.label}${Array.isArray(fieldData) ? ` (${index + 1})` : ''}`,
                createdAt: props.process.createdAt
              })
            }
          })
        }
      })
  }
  
  // 2. Anexos das etapas (step executions)
  if (props.process.stepExecutions) {
    props.process.stepExecutions.forEach(execution => {
      if (execution.attachments && execution.attachments.length > 0) {
        execution.attachments.forEach(attachment => {
          attachments.push({
            ...attachment,
            attachmentType: 'step',
            attachmentSource: `${execution.step.order}. ${execution.step.name}`,
            stepName: execution.step.name,
            stepOrder: execution.step.order,
            displayName: attachment.originalName
          })
        })
      }
      
      // 3. Campos dinâmicos da etapa (se houver campos FILE)
      if (execution.step.type === 'INPUT' && execution.metadata) {
        try {
          const metadata = typeof execution.metadata === 'string' ? 
            JSON.parse(execution.metadata) : execution.metadata
          
          // Buscar campos FILE na configuração da etapa
          const stepConditions = execution.step.conditions
          if (stepConditions) {
            const conditions = typeof stepConditions === 'string' ? 
              JSON.parse(stepConditions) : stepConditions
            
            if (conditions.fields) {
              conditions.fields
                .filter(field => field.type === 'FILE')
                .forEach(field => {
                  const fieldData = metadata[field.name]
                  if (fieldData) {
                    const stepFieldAttachments = Array.isArray(fieldData) ? fieldData : [fieldData]
                    stepFieldAttachments.forEach((item, index) => {
                      if (item && item.attachmentId) {
                        attachments.push({
                          ...item,
                          id: item.attachmentId,
                          attachmentType: 'step-field',
                          attachmentSource: `${execution.step.order}. ${execution.step.name}`,
                          stepName: execution.step.name,
                          stepOrder: execution.step.order,
                          fieldLabel: field.label,
                          displayName: `${field.label}${Array.isArray(fieldData) ? ` (${index + 1})` : ''}`,
                          createdAt: execution.completedAt || execution.createdAt
                        })
                      }
                    })
                  }
                })
            }
          }
        } catch (error) {
          console.error('Error parsing step metadata:', error)
        }
      }
    })
  }
  
  return attachments.sort((a, b) => a.stepOrder - b.stepOrder)
})

const sourceOptions = computed(() => {
  const sources = [...new Set(allAttachments.value.map(a => a.attachmentSource))]
  return sources.map(source => ({ title: source, value: source }))
})

const typeOptions = computed(() => {
  const types = [...new Set(allAttachments.value.map(a => getFileTypeName(a.mimeType)))]
  return types.map(type => ({ title: type, value: type }))
})

const filteredAttachments = computed(() => {
  let filtered = allAttachments.value
  
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(attachment => 
      attachment.originalName.toLowerCase().includes(query) ||
      attachment.displayName?.toLowerCase().includes(query) ||
      attachment.attachmentSource.toLowerCase().includes(query)
    )
  }
  
  if (filterBySource.value) {
    filtered = filtered.filter(attachment => 
      attachment.attachmentSource === filterBySource.value
    )
  }
  
  if (filterByType.value) {
    filtered = filtered.filter(attachment => 
      getFileTypeName(attachment.mimeType) === filterByType.value
    )
  }
  
  return filtered
})

const groupedAttachments = computed(() => {
  const groups = {}
  
  filteredAttachments.value.forEach(attachment => {
    const source = attachment.attachmentSource
    if (!groups[source]) {
      groups[source] = {
        source,
        sourceType: attachment.attachmentType,
        attachments: []
      }
    }
    groups[source].attachments.push(attachment)
  })
  
  return Object.values(groups).sort((a, b) => {
    // Ordenar: Formulário Inicial primeiro, depois por ordem das etapas
    if (a.source === 'Formulário Inicial') return -1
    if (b.source === 'Formulário Inicial') return 1
    
    const aOrder = a.attachments[0]?.stepOrder || 999
    const bOrder = b.attachments[0]?.stepOrder || 999
    return aOrder - bOrder
  })
})

const uniqueSourcesCount = computed(() => {
  return new Set(allAttachments.value.map(a => a.attachmentSource)).size
})

// Métodos auxiliares
function getFileIcon(mimeType) {
  if (!mimeType) return 'mdi-file'
  if (mimeType.includes('pdf')) return 'mdi-file-pdf-box'
  if (mimeType.includes('image')) return 'mdi-file-image'
  if (mimeType.includes('word') || mimeType.includes('document')) return 'mdi-file-word'
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'mdi-file-excel'
  if (mimeType.includes('text')) return 'mdi-file-document'
  if (mimeType.includes('zip') || mimeType.includes('rar')) return 'mdi-folder-zip'
  return 'mdi-file'
}

function getFileTypeColor(mimeType) {
  if (!mimeType) return 'grey'
  if (mimeType.includes('pdf')) return 'red'
  if (mimeType.includes('image')) return 'blue'
  if (mimeType.includes('word')) return 'indigo'
  if (mimeType.includes('excel')) return 'green'
  if (mimeType.includes('text')) return 'orange'
  return 'grey'
}

function getFileTypeName(mimeType) {
  if (!mimeType) return 'Arquivo'
  if (mimeType.includes('pdf')) return 'PDF'
  if (mimeType.includes('jpeg') || mimeType.includes('jpg')) return 'JPEG'
  if (mimeType.includes('png')) return 'PNG'
  if (mimeType.includes('gif')) return 'GIF'
  if (mimeType.includes('word')) return 'Word'
  if (mimeType.includes('excel')) return 'Excel'
  return mimeType.split('/')[1]?.toUpperCase() || 'Arquivo'
}

function getSourceIcon(sourceType) {
  const icons = {
    form: 'mdi-form-textbox',
    step: 'mdi-debug-step-over',
    'step-field': 'mdi-form-textbox-hint'
  }
  return icons[sourceType] || 'mdi-file'
}

function getSourceColor(sourceType) {
  const colors = {
    form: 'purple',
    step: 'blue',
    'step-field': 'teal'
  }
  return colors[sourceType] || 'grey'
}

function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}

function formatTotalSize(attachments) {
  const totalBytes = attachments.reduce((sum, att) => sum + (att.size || 0), 0)
  return formatFileSize(totalBytes)
}

function formatDate(date) {
  return dayjs(date).format('DD/MM/YYYY HH:mm')
}

function canPreview(attachment) {
  return isImage(attachment) || isPdf(attachment)
}

function isImage(attachment) {
  return attachment.mimeType?.includes('image')
}

function isPdf(attachment) {
  return attachment.mimeType?.includes('pdf')
}

// Métodos de interação
function selectAttachment(attachment) {
  selectedAttachment.value = selectedAttachment.value?.id === attachment.id ? null : attachment
}

function previewAttachment(attachment) {
  attachmentToPreview.value = attachment
  previewModal.value = true
}

async function openInNewTab(attachment) {
  try {
    const response = await fetch(`/api/processes/attachment/${attachment.id}/view`)
    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    window.open(url, '_blank')
    
    setTimeout(() => {
      URL.revokeObjectURL(url)
    }, 60000)
  } catch (error) {
    console.error('Error opening attachment:', error)
    window.showSnackbar?.('Erro ao abrir arquivo', 'error')
  }
}

async function downloadAttachment(attachment) {
  downloadingItem.value = attachment.id
  
  try {
    const response = await fetch(`/api/processes/attachment/${attachment.id}/download`)
    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    
    const a = document.createElement('a')
    a.href = url
    a.download = attachment.originalName
    document.body.appendChild(a)
    a.click()
    a.remove()
    window.URL.revokeObjectURL(url)

    window.showSnackbar?.(`Download de "${attachment.originalName}" iniciado`, 'success')
  } catch (error) {
    console.error('Error downloading attachment:', error)
    window.showSnackbar?.('Erro ao baixar arquivo', 'error')
  } finally {
    downloadingItem.value = ''
  }
}

async function downloadGroupAttachments(attachments) {
  downloadingGroup.value = attachments[0].attachmentSource
  
  try {
    for (const attachment of attachments) {
      await downloadAttachment(attachment)
      // Pequena pausa entre downloads
      await new Promise(resolve => setTimeout(resolve, 500))
    }
    
    window.showSnackbar?.(`${attachments.length} arquivo(s) baixado(s)`, 'success')
  } catch (error) {
    console.error('Error downloading group:', error)
    window.showSnackbar?.('Erro ao baixar arquivos', 'error')
  } finally {
    downloadingGroup.value = ''
  }
}

async function downloadAllAttachments() {
  downloadingAll.value = true
  
  try {
    for (const attachment of filteredAttachments.value) {
      await downloadAttachment(attachment)
      // Pequena pausa entre downloads
      await new Promise(resolve => setTimeout(resolve, 300))
    }
    
    window.showSnackbar?.(`${filteredAttachments.value.length} arquivo(s) baixado(s)`, 'success')
  } catch (error) {
    console.error('Error downloading all:', error)
    window.showSnackbar?.('Erro ao baixar arquivos', 'error')
  } finally {
    downloadingAll.value = false
  }
}

function downloadSelectedOrAll() {
  if (selectedAttachment.value) {
    downloadAttachment(selectedAttachment.value)
  } else {
    downloadAllAttachments()
  }
}

function close() {
  selectedAttachment.value = null
  searchQuery.value = ''
  filterBySource.value = ''
  filterByType.value = ''
  emit('update:modelValue', false)
}

// Lifecycle
watch(() => props.modelValue, (newVal) => {
  if (newVal) {
    loading.value = true
    // Simular carregamento
    setTimeout(() => {
      loading.value = false
    }, 500)
  }
})
</script>

<style scoped>
.process-attachments-modal {
  z-index: 2000;
}

.attachments-modal-card {
  height: 80vh;
  display: flex;
  flex-direction: column;
}

.attachments-controls {
  background: rgba(var(--v-theme-surface), 0.5);
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

.attachments-content {
  flex: 1;
  overflow-y: auto;
}

.loading-state,
.empty-state {
  min-height: 300px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.attachment-group {
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 12px;
  margin: 16px;
  overflow: hidden;
}

.group-header {
  background: rgba(var(--v-theme-primary), 0.04);
  border-bottom: 1px solid rgba(var(--v-theme-primary), 0.1);
}

.attachment-item {
  cursor: pointer;
  transition: all 0.2s ease;
  border-radius: 0;
}

.attachment-item:hover {
  background-color: rgba(var(--v-theme-primary), 0.04);
}

.attachment-item.attachment-selected {
  background-color: rgba(var(--v-theme-primary), 0.08);
  border-left: 4px solid rgb(var(--v-theme-primary));
}

.attachment-avatar {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.attachment-actions {
  opacity: 0.7;
  transition: opacity 0.2s ease;
}

.attachment-item:hover .attachment-actions {
  opacity: 1;
}

.actions-container {
  display: flex;
  align-items: center;
  gap: 12px;
}

/* Scrollbar customizada */
.attachments-content::-webkit-scrollbar {
  width: 6px;
}

.attachments-content::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.05);
  border-radius: 3px;
}

.attachments-content::-webkit-scrollbar-thumb {
  background: rgba(var(--v-theme-primary), 0.3);
  border-radius: 3px;
}

.attachments-content::-webkit-scrollbar-thumb:hover {
  background: rgba(var(--v-theme-primary), 0.5);
}
</style>