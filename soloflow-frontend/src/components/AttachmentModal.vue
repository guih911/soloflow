<template>
  <v-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    max-width="900"
    scrollable
    class="attachment-modal"
  >
    <v-card>
      <!-- Header -->
      <v-card-title class="d-flex align-center justify-space-between pa-6">
        <div class="d-flex align-center">
          <v-icon color="primary" size="28" class="mr-3">mdi-paperclip</v-icon>
          <div>
            <h3 class="text-h5 font-weight-bold">Anexos do Processo</h3>
            <p class="text-body-2 text-medium-emphasis mt-1">
              {{ attachments.length }} arquivo(s) anexado(s)
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

      <!-- Content -->
      <v-card-text class="pa-0" style="height: 500px;">
        <!-- Lista de Anexos -->
        <div v-if="attachments.length > 0" class="attachment-list">
          <div
            v-for="(attachment, index) in attachments"
            :key="attachment.id"
            class="attachment-item"
            :class="{ 'selected': selectedAttachment?.id === attachment.id }"
            @click="selectAttachment(attachment)"
          >
            <div class="attachment-card pa-4">
              <div class="d-flex align-center">
                <!-- Ícone do tipo de arquivo -->
                <v-avatar
                  :color="getFileTypeColor(attachment.mimeType)"
                  size="48"
                  class="mr-4"
                >
                  <v-icon
                    :icon="getFileIcon(attachment.mimeType)"
                    color="white"
                    size="24"
                  />
                </v-avatar>

                <!-- Informações do arquivo -->
                <div class="flex-grow-1">
                  <h4 class="text-subtitle-1 font-weight-medium">
                    {{ attachment.originalName }}
                  </h4>
                  
                  <div class="d-flex align-center text-caption text-medium-emphasis mt-1">
                    <span>{{ formatFileSize(attachment.size) }}</span>
                    <v-divider vertical class="mx-2" />
                    <span>{{ getFileTypeName(attachment.mimeType) }}</span>
                    <v-divider vertical class="mx-2" />
                    <span>{{ formatDate(attachment.createdAt) }}</span>
                  </div>

                  <!-- Badges -->
                  <div class="mt-2">
                    <v-chip
                      v-if="attachment.isSigned"
                      size="x-small"
                      color="success"
                      variant="tonal"
                      class="mr-2"
                    >
                      <v-icon start size="12">mdi-check-decagram</v-icon>
                      Assinado
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
                </div>

                <!-- Actions -->
                <div class="attachment-actions">
                  <v-btn
                    v-if="canPreview(attachment)"
                    icon="mdi-eye"
                    variant="text"
                    color="info"
                    @click.stop="previewAttachment(attachment)"
                    :loading="loadingPreview === attachment.id"
                  >
                    <v-tooltip activator="parent">Visualizar</v-tooltip>
                  </v-btn>
                  
                  <v-btn
                    icon="mdi-download"
                    variant="text"
                    color="primary"
                    @click.stop="downloadAttachment(attachment)"
                    :loading="loadingDownload === attachment.id"
                  >
                    <v-tooltip activator="parent">Download</v-tooltip>
                  </v-btn>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Estado vazio -->
        <div v-else class="empty-state">
          <v-icon size="80" color="grey-lighten-2">mdi-paperclip-off</v-icon>
          <h3 class="text-h6 mt-4 text-grey">Nenhum anexo encontrado</h3>
          <p class="text-body-2 text-grey">
            Este processo não possui arquivos anexados.
          </p>
        </div>
      </v-card-text>

      <!-- Footer com resumo -->
      <v-divider />
      
      <v-card-actions class="pa-4">
        <div class="d-flex align-center text-caption text-medium-emphasis">
          <v-icon size="16" class="mr-1">mdi-information</v-icon>
          Total: {{ attachments.length }} arquivo(s) • 
          {{ getTotalSize() }} • 
          {{ getSignedCount() }} assinado(s)
        </div>
        
        <v-spacer />
        
        <v-btn variant="text" @click="close">
          Fechar
        </v-btn>
        
        <v-btn
          v-if="attachments.length > 0"
          color="primary"
          variant="elevated"
          @click="downloadAll"
          :loading="loadingDownloadAll"
        >
          <v-icon start>mdi-download-multiple</v-icon>
          Baixar Todos
        </v-btn>
      </v-card-actions>
    </v-card>

    <!-- Preview Dialog -->
    <v-dialog
      v-model="previewDialog"
      max-width="1000"
      max-height="800"
    >
      <v-card v-if="previewFile">
        <v-card-title class="d-flex align-center justify-space-between">
          <div class="d-flex align-center">
            <v-icon class="mr-2">{{ getFileIcon(previewFile.mimeType) }}</v-icon>
            {{ previewFile.originalName }}
          </div>
          <v-btn
            icon="mdi-close"
            variant="text"
            @click="closePreview"
          />
        </v-card-title>
        
        <v-divider />
        
        <v-card-text class="pa-0">
          <!-- Preview de Imagem -->
          <div
            v-if="isImage(previewFile)"
            class="image-preview"
          >
            <img
              :src="previewUrl"
              :alt="previewFile.originalName"
              class="preview-image"
            />
          </div>
          
          <!-- Preview de PDF -->
          <div
            v-else-if="isPdf(previewFile)"
            class="pdf-preview"
          >
            <iframe
              :src="previewUrl"
              class="pdf-frame"
              frameborder="0"
            />
          </div>
          
          <!-- Outros tipos -->
          <div v-else class="other-preview">
            <div class="text-center py-12">
              <v-icon size="80" color="grey-lighten-2">
                {{ getFileIcon(previewFile.mimeType) }}
              </v-icon>
              <h3 class="text-h6 mt-4">
                {{ previewFile.originalName }}
              </h3>
              <p class="text-body-2 text-grey mb-4">
                Preview não disponível para este tipo de arquivo
              </p>
              <v-btn
                color="primary"
                @click="downloadAttachment(previewFile)"
              >
                <v-icon start>mdi-download</v-icon>
                Download
              </v-btn>
            </div>
          </div>
        </v-card-text>
        
        <v-divider />
        
        <v-card-actions>
          <div class="text-caption text-medium-emphasis">
            {{ formatFileSize(previewFile.size) }} • 
            {{ getFileTypeName(previewFile.mimeType) }}
            <span v-if="previewFile.isSigned" class="text-success ml-2">
              <v-icon size="16">mdi-check-decagram</v-icon>
              Assinado
            </span>
          </div>
          
          <v-spacer />
          
          <v-btn variant="text" @click="closePreview">
            Fechar
          </v-btn>
          
          <v-btn
            color="primary"
            @click="downloadAttachment(previewFile)"
          >
            <v-icon start>mdi-download</v-icon>
            Download
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-dialog>
</template>

<script setup>
import { ref, computed } from 'vue'
import api from '@/services/api'
import dayjs from 'dayjs'

const props = defineProps({
  modelValue: Boolean,
  attachments: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['update:modelValue'])

// Estado
const selectedAttachment = ref(null)
const previewDialog = ref(false)
const previewFile = ref(null)
const previewUrl = ref('')
const loadingPreview = ref(null)
const loadingDownload = ref(null)
const loadingDownloadAll = ref(false)

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
  if (mimeType.includes('text')) return 'Texto'
  
  return mimeType.split('/')[1]?.toUpperCase() || 'Arquivo'
}

function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
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

function getTotalSize() {
  const total = props.attachments.reduce((sum, att) => sum + (att.size || 0), 0)
  return formatFileSize(total)
}

function getSignedCount() {
  return props.attachments.filter(att => att.isSigned).length
}

// Métodos principais
function selectAttachment(attachment) {
  selectedAttachment.value = attachment
}

async function previewAttachment(attachment) {
  if (!canPreview(attachment)) return
  
  loadingPreview.value = attachment.id
  try {
    // Usar endpoint de view (inline) em vez de download
    const viewUrl = `/processes/attachment/${attachment.id}/view`
    previewUrl.value = `${api.defaults.baseURL}${viewUrl}`
    previewFile.value = attachment
    previewDialog.value = true
  } catch (error) {
    console.error('Error preparing preview:', error)
    window.showSnackbar?.('Erro ao preparar visualização', 'error')
  } finally {
    loadingPreview.value = null
  }
}

async function downloadAttachment(attachment) {
  loadingDownload.value = attachment.id
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
    a.download = attachment.originalName || 'arquivo'
    document.body.appendChild(a)
    a.click()
    a.remove()
    window.URL.revokeObjectURL(url)

    window.showSnackbar?.(`Download de "${attachment.originalName}" iniciado`, 'success')
  } catch (error) {
    console.error('Error downloading attachment:', error)
    window.showSnackbar?.('Erro ao baixar arquivo', 'error')
  } finally {
    loadingDownload.value = null
  }
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

function closePreview() {
  previewDialog.value = false
  previewFile.value = null
  previewUrl.value = ''
}

function close() {
  emit('update:modelValue', false)
  selectedAttachment.value = null
}
</script>

<style scoped>
.attachment-modal .v-dialog {
  border-radius: 16px;
  overflow: hidden;
}

.attachment-list {
  max-height: 500px;
  overflow-y: auto;
}

.attachment-item {
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  cursor: pointer;
  transition: all 0.2s ease;
}

.attachment-item:hover {
  background-color: rgba(var(--v-theme-primary), 0.04);
}

.attachment-item.selected {
  background-color: rgba(var(--v-theme-primary), 0.08);
  border-left: 4px solid rgb(var(--v-theme-primary));
}

.attachment-card {
  position: relative;
}

.attachment-actions {
  display: flex;
  gap: 8px;
  opacity: 0.7;
  transition: opacity 0.2s ease;
}

.attachment-item:hover .attachment-actions {
  opacity: 1;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 400px;
  text-align: center;
}

.image-preview {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px;
  background: #f5f5f5;
  min-height: 400px;
}

.preview-image {
  max-width: 100%;
  max-height: 600px;
  object-fit: contain;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.pdf-preview {
  height: 600px;
}

.pdf-frame {
  width: 100%;
  height: 100%;
}

.other-preview {
  min-height: 400px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Scrollbar personalizada */
.attachment-list::-webkit-scrollbar {
  width: 6px;
}

.attachment-list::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.attachment-list::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

.attachment-list::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}
</style>