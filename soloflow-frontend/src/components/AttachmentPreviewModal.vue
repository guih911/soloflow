<template>
  <v-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    max-width="1000"
    class="attachment-preview-modal"
  >
    <v-card>
      <v-card-title class="d-flex align-center justify-space-between">
        <div>
          <v-icon color="primary" class="mr-2">{{ getFileIcon(attachment?.mimeType) }}</v-icon>
          {{ attachment?.originalName || attachment?.displayName }}
        </div>
        <div>
          <v-btn
            icon="mdi-download"
            variant="text"
            @click="downloadFile"
            :loading="downloading"
          />
          <v-btn
            icon="mdi-open-in-new"
            variant="text"
            @click="openInNewTab"
          />
          <v-btn
            icon="mdi-close"
            variant="text"
            @click="close"
          />
        </div>
      </v-card-title>
      
      <v-divider />
      
      <v-card-text class="preview-content">
        <div v-if="loading" class="text-center py-12">
          <v-progress-circular indeterminate color="primary" />
          <p class="mt-4">Carregando arquivo...</p>
        </div>
        
        <div v-else-if="isImage" class="image-preview">
          <img 
            :src="previewUrl" 
            :alt="attachment?.originalName"
            class="preview-image"
          />
        </div>
        
        <div v-else-if="isPdf" class="pdf-preview">
          <iframe
            :src="previewUrl"
            class="pdf-iframe"
            frameborder="0"
          />
        </div>
        
        <div v-else class="no-preview text-center py-12">
          <v-icon size="64" color="grey">{{ getFileIcon(attachment?.mimeType) }}</v-icon>
          <h3 class="mt-4">Visualização não disponível</h3>
          <p class="text-grey mt-2">
            Este tipo de arquivo não pode ser visualizado diretamente.
          </p>
          <v-btn
            color="primary"
            variant="elevated"
            class="mt-4"
            @click="downloadFile"
            :loading="downloading"
          >
            <v-icon start>mdi-download</v-icon>
            Baixar Arquivo
          </v-btn>
        </div>
      </v-card-text>
      
      <v-divider />
      
      <v-card-actions>
        <div class="text-caption text-grey">
          {{ formatFileSize(attachment?.size) }} • {{ attachment?.mimeType }}
        </div>
        <v-spacer />
        <v-btn variant="text" @click="close">Fechar</v-btn>
      </v-card-actions>
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
    console.error('Error loading preview:', error)
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
    console.error('Error downloading:', error)
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
    console.error('Error opening in new tab:', error)
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

.preview-content {
  min-height: 400px;
  max-height: 70vh;
  overflow: auto;
}

.image-preview {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
}

.preview-image {
  max-width: 100%;
  max-height: 60vh;
  object-fit: contain;
}

.pdf-preview {
  height: 60vh;
}

.pdf-iframe {
  width: 100%;
  height: 100%;
}

.no-preview {
  min-height: 300px;
}
</style>