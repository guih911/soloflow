<template>
  <v-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    :max-width="selectedAttachment ? '1400' : '900'"
    scrollable
    class="attachment-modal"
  >
    <v-card>
      <!-- Header -->
      <v-card-title class="d-flex align-center justify-space-between pa-6">
        <div class="d-flex align-center">
          <v-icon color="primary" size="28" class="mr-3">mdi-paperclip</v-icon>
          <div>
            <h3 class="text-h5 font-weight-bold">
              {{ selectedAttachment ? getDisplayName(selectedAttachment) : (title || 'Anexos das Etapas') }}
            </h3>
            <p class="text-body-2 text-medium-emphasis mt-1">
              {{ selectedAttachment ? 
                `${getFileTypeName(selectedAttachment.mimeType)} • ${formatFileSize(selectedAttachment.size)}` : 
                `${attachments.length} arquivo(s) anexado(s) durante as etapas do processo` 
              }}
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

      <!-- ✅ Navegação de abas quando há anexo selecionado -->
      <v-tabs v-if="selectedAttachment" v-model="activeTab" class="px-6">
        <v-tab value="list">
          <v-icon start>mdi-format-list-bulleted</v-icon>
          Lista
        </v-tab>
        <v-tab value="preview" :disabled="!canPreviewSelected">
          <v-icon start>mdi-eye</v-icon>
          Visualizar
        </v-tab>
      </v-tabs>

      <!-- Content -->
      <v-card-text class="pa-0" :style="selectedAttachment ? 'height: 700px;' : 'height: 500px;'">
        <v-window v-if="selectedAttachment" v-model="activeTab">
          <!-- ✅ Aba da Lista -->
          <v-window-item value="list">
            <div class="attachment-list-container">
              <AttachmentList 
                :attachments="formattedAttachments"
                :selected-attachment="selectedAttachment"
                @select="selectAttachment"
                @download="downloadAttachment"
                @preview="previewAttachment"
              />
            </div>
          </v-window-item>
          
          <!-- ✅ Aba do Visualizador com fundo branco para etapas -->
          <v-window-item value="preview">
            <AttachmentPreview 
              :attachment="selectedAttachment"
              @download="downloadAttachment"
            />
          </v-window-item>
        </v-window>
        
        <!-- ✅ Lista simples quando não há seleção -->
        <div v-else-if="attachments.length > 0">
          <AttachmentList 
            :attachments="formattedAttachments"
            :selected-attachment="selectedAttachment"
            @select="selectAttachment"
            @download="downloadAttachment"
            @preview="previewAttachment"
          />
        </div>

        <!-- ✅ Estado vazio melhorado -->
        <div v-else class="empty-state">
          <v-icon size="80" color="grey-lighten-2">mdi-debug-step-over</v-icon>
          <h3 class="text-h6 mt-4 text-grey">Nenhum anexo de etapa encontrado</h3>
          <p class="text-body-2 text-grey">
            Ainda não foram anexados arquivos durante as etapas deste processo.
          </p>
        </div>
      </v-card-text>

      <!-- Footer com resumo -->
      <v-divider />
      
      <v-card-actions class="pa-4">
        <div class="d-flex align-center text-caption text-medium-emphasis">
          <v-icon size="16" class="mr-1">mdi-information</v-icon>
          {{ selectedAttachment ? 
            `Arquivo ${getCurrentIndex() + 1} de ${attachments.length}` :
            `Total: ${attachments.length} arquivo(s) de etapas • ${getTotalSize()} • ${getSignedCount()} assinado(s)`
          }}
        </div>
        
        <v-spacer />
        
        <div class="actions-footer">
          <v-btn variant="text" @click="close" class="mr-3">
            Fechar
          </v-btn>
          
          <v-btn
            v-if="attachments.length > 0 && !selectedAttachment"
            color="primary"
            variant="elevated"
            @click="downloadAll"
            :loading="loadingDownloadAll"
          >
            <v-icon start>mdi-download-multiple</v-icon>
            Baixar Todos
          </v-btn>
        </div>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, computed } from 'vue'
import api from '@/services/api'
import dayjs from 'dayjs'
import AttachmentList from './AttachmentList.vue'
import AttachmentPreview from './AttachmentPreview.vue'

const props = defineProps({
  modelValue: Boolean,
  attachments: {
    type: Array,
    default: () => []
  },
  title: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:modelValue'])

// Estado
const selectedAttachment = ref(null)
const activeTab = ref('list')
const loadingDownloadAll = ref(false)

// Computed
const canPreviewSelected = computed(() => {
  if (!selectedAttachment.value) return false
  return canPreview(selectedAttachment.value)
})

const formattedAttachments = computed(() => {
  return props.attachments.map(attachment => ({
    ...attachment,
    // Garantir que tem um ID único
    id: attachment.id || `temp-${Date.now()}-${Math.random()}`,
    // ✅ CORRIGIDO: Garantir que anexos de etapas sempre usam nome original
    displayName: attachment.originalName || attachment.filename || 'Arquivo',
    // Garantir campos obrigatórios
    originalName: attachment.originalName || attachment.filename || 'Arquivo sem nome',
    size: attachment.size || 0,
    mimeType: attachment.mimeType || 'application/octet-stream',
    createdAt: attachment.createdAt || new Date().toISOString(),
    isSigned: Boolean(attachment.isSigned),
    // ✅ Garantir que são marcados como anexos de etapa
    attachmentType: 'step',
    attachmentSource: 'Anexo de Etapa'
  }))
})

// Métodos auxiliares
function canPreview(attachment) {
  return isImage(attachment) || isPdf(attachment)
}

function isImage(attachment) {
  return attachment.mimeType?.includes('image')
}

function isPdf(attachment) {
  return attachment.mimeType?.includes('pdf')
}

function getDisplayName(attachment) {
  // Para anexos de etapas, sempre usar nome original
  return attachment.originalName || attachment.filename || 'Arquivo'
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

function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}

function getTotalSize() {
  const total = props.attachments.reduce((sum, att) => sum + (att.size || 0), 0)
  return formatFileSize(total)
}

function getSignedCount() {
  return props.attachments.filter(att => att.isSigned).length
}

function getCurrentIndex() {
  if (!selectedAttachment.value) return -1
  return formattedAttachments.value.findIndex(att => att.id === selectedAttachment.value.id)
}

// Métodos principais
function selectAttachment(attachment) {
  selectedAttachment.value = attachment
  
  // Se pode visualizar, mudar para aba de preview automaticamente
  if (canPreview(attachment)) {
    activeTab.value = 'preview'
  } else {
    activeTab.value = 'list'
  }
}

async function previewAttachment(attachment) {
  selectAttachment(attachment)
  activeTab.value = 'preview'
}

async function downloadAttachment(attachment) {
  try {
    const response = await api.get(`/processes/attachment/${attachment.id}/download`, {
      responseType: 'blob',
    })

    // Criar URL para download
    const blob = new Blob([response.data], { 
      type: attachment.mimeType || 'application/octet-stream' 
    })
    const url = window.URL.createObjectURL(blob)
    
    // Criar link temporário e fazer download
    const a = document.createElement('a')
    a.href = url
    a.download = getDisplayName(attachment) + getFileExtension(attachment.originalName)
    document.body.appendChild(a)
    a.click()
    a.remove()
    window.URL.revokeObjectURL(url)

    window.showSnackbar?.(`Download de "${getDisplayName(attachment)}" iniciado`, 'success')
  } catch (error) {
    console.error('Error downloading attachment:', error)
    window.showSnackbar?.('Erro ao baixar arquivo', 'error')
  }
}

function getFileExtension(filename) {
  if (!filename) return ''
  const parts = filename.split('.')
  return parts.length > 1 ? '.' + parts.pop() : ''
}

async function downloadAll() {
  if (props.attachments.length === 0) return
  
  loadingDownloadAll.value = true
  try {
    // Download sequencial para evitar sobrecarga
    for (const attachment of props.attachments) {
      await downloadAttachment(attachment)
      // Pequeno delay entre downloads
      await new Promise(resolve => setTimeout(resolve, 500))
    }
    
    window.showSnackbar?.('Download de todos os arquivos iniciado', 'success')
  } catch (error) {
    console.error('Error downloading all attachments:', error)
    window.showSnackbar?.('Erro ao baixar arquivos', 'error')
  } finally {
    loadingDownloadAll.value = false
  }
}

function close() {
  selectedAttachment.value = null
  activeTab.value = 'list'
  emit('update:modelValue', false)
}
</script>

<style scoped>
.attachment-modal .v-dialog {
  border-radius: 16px;
  overflow: hidden;
}

.attachment-list-container {
  height: 700px;
  overflow-y: auto;
  background: #ffffff;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 400px;
  text-align: center;
  background: #ffffff;
}

/* ✅ Espaçamento adequado nos botões do footer */
.actions-footer {
  display: flex;
  align-items: center;
  gap: 12px;
}

.actions-footer .v-btn {
  margin: 0;
}

/* Scrollbar personalizada */
.attachment-list-container::-webkit-scrollbar {
  width: 6px;
}

.attachment-list-container::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.attachment-list-container::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

.attachment-list-container::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}
</style>