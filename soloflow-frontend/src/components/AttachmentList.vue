<template>
  <div class="attachment-list">
    <div
      v-for="(attachment, index) in attachments"
      :key="attachment.id"
      class="attachment-item"
      :class="{ 'selected': selectedAttachment?.id === attachment.id }"
      @click="$emit('select', attachment)"
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
            <!-- ✅ NOVO: Nome baseado na origem -->
            <h4 class="text-subtitle-1 font-weight-medium">
              {{ getDisplayName(attachment) }}
            </h4>
            
            <div class="d-flex align-center text-caption text-medium-emphasis mt-1">
              <span>{{ formatFileSize(attachment.size) }}</span>
              <v-divider vertical class="mx-2" />
              <span>{{ getFileTypeName(attachment.mimeType) }}</span>
              <v-divider vertical class="mx-2" />
              <span>{{ formatDate(attachment.createdAt) }}</span>
            </div>

            <!-- ✅ NOVO: Badges com informação de origem -->
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
                class="mr-2"
              >
                <v-icon start size="12">mdi-eye</v-icon>
                Visualizável
              </v-chip>

              <!-- ✅ NOVO: Badge de origem melhorado -->
              <v-chip
                :size="'x-small'"
                :color="getOriginColor(attachment)"
                variant="tonal"
                class="mr-2"
              >
                <v-icon start size="12">{{ getOriginIcon(attachment) }}</v-icon>
                {{ attachment.attachmentSource || 'Processo' }}
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
              size="small"
              @click.stop="$emit('preview', attachment)"
            >
              <v-tooltip activator="parent">Visualizar</v-tooltip>
            </v-btn>
            
            <v-btn
              icon="mdi-download"
              variant="text"
              color="primary"
              size="small"
              @click.stop="$emit('download', attachment)"
            >
              <v-tooltip activator="parent">Download</v-tooltip>
            </v-btn>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import dayjs from 'dayjs'

const props = defineProps({
  attachments: {
    type: Array,
    default: () => []
  },
  selectedAttachment: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['select', 'download', 'preview'])

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

// ✅ NOVO: Nome de exibição baseado na origem
function getDisplayName(attachment) {
  // Se tem displayName (definido no AttachmentButton), usar ele
  if (attachment.displayName) {
    return attachment.displayName
  }
  
  // Se é campo do formulário, usar o nome do campo
  if (attachment.isFormField && attachment.fieldLabel) {
    return attachment.fieldLabel
  }
  
  // Se é anexo de etapa, usar nome original + contexto
  if (attachment.attachmentType === 'step' && attachment.stepName) {
    return `${attachment.originalName} (${attachment.stepName})`
  }
  
  // Senão usar nome original
  return attachment.originalName
}

// ✅ NOVO: Cor baseada na origem
function getOriginColor(attachment) {
  switch (attachment.attachmentType) {
    case 'form':
      return 'purple'
    case 'step':
      return 'blue'
    default:
      return 'grey'
  }
}

// ✅ NOVO: Ícone baseado na origem
function getOriginIcon(attachment) {
  switch (attachment.attachmentType) {
    case 'form':
      return 'mdi-form-textbox'
    case 'step':
      return 'mdi-debug-step-over'
    default:
      return 'mdi-file'
  }
}
</script>

<style scoped>
.attachment-list {
  padding: 16px;
}

.attachment-item {
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  cursor: pointer;
  transition: all 0.2s ease;
  border-radius: 8px;
  margin-bottom: 8px;
}

.attachment-item:hover {
  background-color: rgba(var(--v-theme-primary), 0.04);
}

.attachment-item.selected {
  background-color: rgba(var(--v-theme-primary), 0.08);
  border: 2px solid rgb(var(--v-theme-primary));
}

.attachment-card {
  position: relative;
}

.attachment-actions {
  display: flex;
  gap: 4px;
  opacity: 0.7;
  transition: opacity 0.2s ease;
}

.attachment-item:hover .attachment-actions {
  opacity: 1;
}
</style>