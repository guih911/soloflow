<template>
  <v-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    max-width="1000"
    class="attachment-preview-modal"
  >
    <v-card class="preview-card">
      <!-- Modern Header -->
      <div class="preview-header">
        <div class="header-info">
          <div class="file-icon-badge" :class="getFileColorClass(attachment?.mimeType)">
            <v-icon size="20" color="white">{{ getFileIcon(attachment?.mimeType) }}</v-icon>
          </div>
          <div class="file-details">
            <span class="file-name">{{ attachment?.originalName || attachment?.displayName }}</span>
            <span class="file-meta">{{ formatFileSize(attachment?.size) }} • {{ getFileTypeName(attachment?.mimeType) }}</span>
          </div>
        </div>
        <div class="header-actions">
          <v-btn
            icon
            variant="text"
            size="small"
            @click="downloadFile"
            :loading="downloading"
            class="action-btn"
          >
            <v-icon>mdi-download</v-icon>
            <v-tooltip activator="parent" location="bottom">Download</v-tooltip>
          </v-btn>
          <v-btn
            icon
            variant="text"
            size="small"
            @click="openInNewTab"
            class="action-btn"
          >
            <v-icon>mdi-open-in-new</v-icon>
            <v-tooltip activator="parent" location="bottom">Abrir em nova aba</v-tooltip>
          </v-btn>
          <v-btn
            icon
            variant="text"
            size="small"
            @click="close"
            class="action-btn close-action"
          >
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </div>
      </div>
      
      <!-- Preview Content -->
      <div class="preview-body">
        <!-- Loading State -->
        <div v-if="loading" class="loading-state">
          <v-progress-circular indeterminate color="primary" size="48" />
          <p class="loading-text">Carregando visualização...</p>
        </div>

        <!-- Image Preview -->
        <div v-else-if="isImage" class="image-preview">
          <img
            :src="previewUrl"
            :alt="attachment?.originalName"
            class="preview-image"
          />
        </div>

        <!-- PDF Preview -->
        <div v-else-if="isPdf" class="pdf-preview">
          <iframe
            :src="previewUrl"
            class="pdf-iframe"
            frameborder="0"
          />
        </div>

        <!-- No Preview -->
        <div v-else class="no-preview-state">
          <div class="no-preview-icon">
            <v-icon size="48" color="grey">{{ getFileIcon(attachment?.mimeType) }}</v-icon>
          </div>
          <h3 class="no-preview-title">Visualização não disponível</h3>
          <p class="no-preview-text">Este tipo de arquivo não pode ser visualizado no navegador.</p>
          <v-btn
            color="primary"
            variant="flat"
            @click="downloadFile"
            :loading="downloading"
            prepend-icon="mdi-download"
            class="download-btn"
          >
            Baixar Arquivo
          </v-btn>
        </div>
      </div>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useAttachment } from '@/composables/useAttachment'

const props = defineProps({
  modelValue: Boolean,
  attachment: Object
})

const emit = defineEmits(['update:modelValue'])

const { getPreviewUrl, downloadAttachment } = useAttachment()

const loading = ref(false)
const downloading = ref(false)
const previewUrl = ref('')

const isImage = computed(() => {
  return props.attachment?.mimeType?.includes('image')
})

const isPdf = computed(() => {
  return props.attachment?.mimeType?.includes('pdf')
})

function getFileIcon(mimeType) {
  if (!mimeType) return 'mdi-file'
  if (mimeType.includes('pdf')) return 'mdi-file-pdf-box'
  if (mimeType.includes('image')) return 'mdi-file-image'
  if (mimeType.includes('word')) return 'mdi-file-word'
  if (mimeType.includes('excel')) return 'mdi-file-excel'
  return 'mdi-file'
}

function getFileColorClass(mimeType) {
  if (!mimeType) return 'file-grey'
  if (mimeType.includes('pdf')) return 'file-red'
  if (mimeType.includes('image')) return 'file-blue'
  if (mimeType.includes('word')) return 'file-indigo'
  if (mimeType.includes('excel')) return 'file-green'
  return 'file-grey'
}

function getFileTypeName(mimeType) {
  if (!mimeType) return 'Arquivo'
  if (mimeType.includes('pdf')) return 'PDF'
  if (mimeType.includes('jpeg') || mimeType.includes('jpg')) return 'JPEG'
  if (mimeType.includes('png')) return 'PNG'
  if (mimeType.includes('word')) return 'Word'
  if (mimeType.includes('excel')) return 'Excel'
  return mimeType.split('/')[1]?.toUpperCase() || 'Arquivo'
}

function formatFileSize(bytes) {
  if (!bytes) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}

async function loadPreview() {
  if (!props.attachment?.id) return

  loading.value = true
  try {
    previewUrl.value = await getPreviewUrl(props.attachment.id)
  } catch (error) {
    window.showSnackbar?.('Erro ao carregar visualização', 'error')
  } finally {
    loading.value = false
  }
}

async function downloadFile() {
  if (!props.attachment?.id) return

  downloading.value = true
  try {
    await downloadAttachment(
      props.attachment.id,
      props.attachment.originalName || 'arquivo'
    )
    window.showSnackbar?.('Download iniciado', 'success')
  } catch (error) {
    window.showSnackbar?.('Erro ao baixar arquivo', 'error')
  } finally {
    downloading.value = false
  }
}

async function openInNewTab() {
  if (!props.attachment?.id) return

  try {
    const url = await getPreviewUrl(props.attachment.id)
    window.open(url, '_blank')

    setTimeout(() => {
      URL.revokeObjectURL(url)
    }, 60000)
  } catch (error) {
    window.showSnackbar?.('Erro ao abrir arquivo', 'error')
  }
}

function close() {
  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value)
    previewUrl.value = ''
  }
  emit('update:modelValue', false)
}

watch(() => props.modelValue, (newVal) => {
  if (newVal && (isImage.value || isPdf.value)) {
    loadPreview()
  }
})

watch(() => props.attachment, () => {
  if (props.modelValue && (isImage.value || isPdf.value)) {
    loadPreview()
  }
})
</script>

<style scoped>
.attachment-preview-modal {
  z-index: 2100;
}

.preview-card {
  border-radius: 16px !important;
  overflow: hidden;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.2) !important;
}

/* Header */
.preview-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  background: var(--color-neutral-50);
  border-bottom: 1px solid var(--color-neutral-200);
}

.header-info {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
}

.file-icon-badge {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.file-icon-badge.file-red { background: var(--color-error-500); }
.file-icon-badge.file-blue { background: var(--color-info-500); }
.file-icon-badge.file-indigo { background: var(--color-primary-500); }
.file-icon-badge.file-green { background: var(--color-success-500); }
.file-icon-badge.file-grey { background: var(--color-neutral-400); }

.file-details {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.file-name {
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--color-neutral-800);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.file-meta {
  font-size: 0.75rem;
  color: var(--color-neutral-500);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.action-btn {
  width: 36px;
  height: 36px;
  border-radius: 8px !important;
}

.action-btn:hover {
  background: var(--color-neutral-200);
}

.close-action:hover {
  background: var(--color-error-50);
  color: var(--color-error-500);
}

/* Preview Body */
.preview-body {
  min-height: 400px;
  max-height: 70vh;
  overflow: auto;
  background: var(--color-neutral-100);
}

/* Loading State */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  gap: 16px;
}

.loading-text {
  font-size: 0.9375rem;
  color: var(--color-neutral-500);
  margin: 0;
}

/* Image Preview */
.image-preview {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
  padding: 24px;
}

.preview-image {
  max-width: 100%;
  max-height: 65vh;
  object-fit: contain;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

/* PDF Preview */
.pdf-preview {
  height: 70vh;
}

.pdf-iframe {
  width: 100%;
  height: 100%;
  border: none;
}

/* No Preview State */
.no-preview-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  padding: 48px 24px;
  text-align: center;
}

.no-preview-icon {
  width: 96px;
  height: 96px;
  border-radius: 50%;
  background: var(--color-neutral-200);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24px;
}

.no-preview-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--color-neutral-700);
  margin: 0 0 8px 0;
}

.no-preview-text {
  font-size: 0.9375rem;
  color: var(--color-neutral-500);
  margin: 0 0 24px 0;
}

.download-btn {
  text-transform: none;
  font-weight: 500;
  border-radius: 10px;
}
</style>