<template>
  <v-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    max-width="1400"
    scrollable
    class="field-file-modal-wrapper"
  >
    <v-card v-if="fileData && fieldInfo" class="field-file-modal-card">
      <!-- Header com nome do campo -->
      <v-card-title class="d-flex align-center justify-space-between pa-6">
        <div class="d-flex align-center">
          <v-avatar
            :color="getFileTypeColor(fileData.mimeType)"
            size="48"
            class="mr-4"
          >
            <v-icon
              :icon="getFileIcon(fileData.mimeType)"
              color="white"
              size="24"
            />
          </v-avatar>
          <div>
            <!-- Nome do campo como título principal -->
            <h3 class="text-h5 font-weight-bold">{{ fieldInfo.label }}</h3>
            <div class="d-flex align-center text-body-2 text-medium-emphasis mt-1">
              <span>{{ getFileTypeName(fileData.mimeType) }} • {{ formatFileSize(fileData.size) }}</span>
              <!-- Badge de origem -->
              <v-chip
                size="x-small"
                color="purple"
                variant="tonal"
                class="ml-2"
              >
                <v-icon start size="10">mdi-form-textbox</v-icon>
                Solicitação Inicial
              </v-chip>
            </div>
          </div>
        </div>
        <v-btn
          icon="mdi-close"
          variant="text"
          @click="close"
        />
      </v-card-title>

      <v-divider />

      <!-- ✅ CONTENT WRAPPER COM FUNDO BRANCO FIXO -->
      <div class="field-modal-content-wrapper">
        <!-- Loading state -->
        <div v-if="loading" class="preview-state-overlay">
          <div class="text-center py-12">
            <v-progress-circular indeterminate color="primary" size="64" />
            <p class="text-body-2 text-grey mt-4">Carregando {{ fieldInfo.label }}...</p>
          </div>
        </div>

        <!-- Error state -->
        <div v-else-if="error" class="preview-state-overlay">
          <div class="text-center py-12">
            <v-icon size="64" color="error">mdi-alert-circle</v-icon>
            <h3 class="text-h6 mt-4">Erro ao carregar {{ fieldInfo.label }}</h3>
            <p class="text-body-2 text-grey mt-2">{{ error }}</p>
            <v-btn color="primary" @click="loadPreview" class="mt-4">
              <v-icon start>mdi-refresh</v-icon>
              Tentar novamente
            </v-btn>
          </div>
        </div>

        <!-- ✅ PREVIEW COM FUNDO BRANCO GARANTIDO -->
        <div v-else-if="previewUrl" class="preview-content-fixed">
          <!-- PDF Preview -->
          <iframe
            v-if="isPdf"
            :src="previewUrl"
            class="pdf-viewer-fixed"
            frameborder="0"
            @load="onLoad"
            @error="onError"
          />
          
          <!-- Image Preview -->
          <div v-else-if="isImage" class="image-container-fixed">
            <img
              :src="previewUrl"
              :alt="fieldInfo.label"
              class="image-viewer-fixed"
              @load="onLoad"
              @error="onError"
            />
          </div>
        </div>

        <!-- Não suportado -->
        <div v-else class="preview-state-overlay">
          <div class="text-center py-12">
            <v-icon size="80" color="grey-lighten-2">
              {{ getFileIcon(fileData.mimeType) }}
            </v-icon>
            <h3 class="text-h6 mt-4">Visualização não disponível</h3>
            <p class="text-body-2 text-grey mt-2">
              Este tipo de arquivo não pode ser visualizado diretamente.
            </p>
            <v-btn
              color="primary"
              variant="elevated"
              @click="downloadFile"
              class="mt-4"
            >
              <v-icon start>mdi-download</v-icon>
              Baixar {{ fieldInfo.label }}
            </v-btn>
          </div>
        </div>
      </div>

      <v-divider />

      <!-- Actions com nome do campo no download -->
      <v-card-actions class="pa-6">
        <div class="d-flex align-center text-caption text-medium-emphasis">
          <v-icon size="16" class="mr-1">mdi-information</v-icon>
          Arquivo do campo "{{ fieldInfo.label }}" da solicitação inicial
        </div>
        
        <v-spacer />
        
        <div class="actions-container">
          <v-btn variant="text" @click="close" class="mr-3">
            Fechar
          </v-btn>
          
          <v-btn
            v-if="canPreview"
            color="info"
            variant="elevated"
            @click="openPreviewInNewTab"
            class="mr-3"
          >
            <v-icon start>mdi-open-in-new</v-icon>
            Abrir
          </v-btn>
          
          <v-btn
            color="primary"
            variant="elevated"
            @click="downloadFile"
            :loading="downloading"
          >
            <v-icon start>mdi-download</v-icon>
            Baixar
          </v-btn>
        </div>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import api from '@/services/api'

const props = defineProps({
  modelValue: Boolean,
  fileData: {
    type: Object,
    default: null
  },
  fieldInfo: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['update:modelValue'])

// Estado
const downloading = ref(false)
const loading = ref(false)
const error = ref('')
const previewUrl = ref('')

// Computed
const canPreview = computed(() => {
  return isImage.value || isPdf.value
})

const isImage = computed(() => {
  return props.fileData?.mimeType?.includes('image')
})

const isPdf = computed(() => {
  return props.fileData?.mimeType?.includes('pdf')
})

// Watch para carregar preview quando modal abre
watch(() => props.modelValue, (newVal) => {
  if (newVal && props.fileData?.attachmentId && canPreview.value) {
    console.log('🔍 FieldFileModal: Loading preview for field file')
    loadPreview()
  } else {
    cleanup()
  }
})

// Método de carregamento usando blob
async function loadPreview() {
  if (!props.fileData?.attachmentId || !canPreview.value) return
  
  loading.value = true
  error.value = ''
  
  try {
    console.log('🔍 Loading FIELD file preview:', {
      fieldLabel: props.fieldInfo.label,
      attachmentId: props.fileData.attachmentId,
      mimeType: props.fileData.mimeType
    })
    
    // Usar método blob para evitar problemas de autenticação
    const response = await api.get(`/processes/attachment/${props.fileData.attachmentId}/view`, {
      responseType: 'blob'
    })
    
    console.log('✅ Field file blob loaded successfully')
    
    // Limpar URL anterior se existir
    cleanup()
    
    // Criar URL blob
    const blob = new Blob([response.data], { 
      type: props.fileData.mimeType || 'application/pdf' 
    })
    
    previewUrl.value = URL.createObjectURL(blob)
    
    console.log('🎯 Field file preview URL created:', previewUrl.value)
    
  } catch (err) {
    console.error('❌ Error loading field file preview:', err)
    error.value = 'Erro ao carregar visualização: ' + (err.response?.data?.message || err.message)
  } finally {
    loading.value = false
  }
}

function onLoad() {
  loading.value = false
  error.value = ''
  console.log('✅ Field file preview loaded successfully')
}

function onError() {
  loading.value = false
  error.value = 'Não foi possível carregar o arquivo'
  console.error('❌ Field file preview load error')
}

async function openPreviewInNewTab() {
  try {
    const response = await api.get(`/processes/attachment/${props.fileData.attachmentId}/download`, {
      responseType: 'blob'
    })
    
    const blob = new Blob([response.data], { 
      type: props.fileData.mimeType || 'application/pdf' 
    })
    const url = URL.createObjectURL(blob)
    
    window.open(url, '_blank')
    
    setTimeout(() => {
      URL.revokeObjectURL(url)
    }, 60000)
    
  } catch (error) {
    console.error('Error opening field file in new tab:', error)
    window.showSnackbar?.('Erro ao abrir arquivo', 'error')
  }
}

async function downloadFile() {
  if (!props.fileData?.attachmentId) return
  
  downloading.value = true
  
  try {
    const response = await api.get(`/processes/attachment/${props.fileData.attachmentId}/download`, {
      responseType: 'blob'
    })

    const blob = new Blob([response.data], { 
      type: props.fileData.mimeType || 'application/octet-stream' 
    })
    const url = window.URL.createObjectURL(blob)
    
    const a = document.createElement('a')
    a.href = url
    a.download = `${props.fieldInfo.label}${getFileExtension(props.fileData.originalName)}`
    document.body.appendChild(a)
    a.click()
    a.remove()
    window.URL.revokeObjectURL(url)

    window.showSnackbar?.(`Download de "${props.fieldInfo.label}" iniciado`, 'success')
  } catch (error) {
    console.error('Error downloading field file:', error)
    window.showSnackbar?.('Erro ao baixar arquivo', 'error')
  } finally {
    downloading.value = false
  }
}

function cleanup() {
  if (previewUrl.value && previewUrl.value.startsWith('blob:')) {
    URL.revokeObjectURL(previewUrl.value)
  }
  previewUrl.value = ''
  error.value = ''
  loading.value = false
}

// Métodos auxiliares
function getFileExtension(filename) {
  if (!filename) return '.pdf'
  const parts = filename.split('.')
  return parts.length > 1 ? '.' + parts.pop() : '.pdf'
}

function getFileIcon(mimeType) {
  if (!mimeType) return 'mdi-file'
  if (mimeType.includes('pdf')) return 'mdi-file-pdf-box'
  if (mimeType.includes('image')) return 'mdi-file-image'
  if (mimeType.includes('word') || mimeType.includes('document')) return 'mdi-file-word'
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'mdi-file-excel'
  if (mimeType.includes('text')) return 'mdi-file-document'
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

function close() {
  cleanup()
  emit('update:modelValue', false)
}


import { onUnmounted } from 'vue'
onUnmounted(() => {
  cleanup()
})
</script>

<style scoped>

.field-file-modal-wrapper {
  background: transparent;
}

.field-file-modal-card {
  overflow: hidden;
  background: white;
}

.field-modal-content-wrapper {
  height: 700px;
  width: 100%;
  background: white !important;
  position: relative;
  overflow: hidden;
}


.preview-content-fixed {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: white !important;
  display: flex;
  align-items: center;
  justify-content: center;
}


.pdf-viewer-fixed {
  width: 100% !important;
  height: 100% !important;
  border: none !important;
  background: white !important;
  position: absolute;
  top: 0;
  left: 0;
  z-index: 1;
}


.image-container-fixed {
  width: 100%;
  height: 100%;
  background: white !important;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.image-viewer-fixed {
  max-width: 90%;
  max-height: 90%;
  object-fit: contain;
  background: white !important;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}


.preview-state-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: white !important;
  z-index: 2;
}


.actions-container {
  display: flex;
  align-items: center;
  gap: 12px;
}

.actions-container .v-btn {
  margin: 0;
}


.field-file-modal-wrapper .v-card,
.field-file-modal-wrapper .v-card-text,
.field-modal-content-wrapper,
.preview-content-fixed,
.pdf-viewer-fixed,
.image-container-fixed,
.preview-state-overlay {
  background: white !important;
  background-color: white !important;
}





.pdf-viewer-fixed {
  background: white !important;
  background-color: white !important;
}


.field-file-modal-card {
  border-radius: 16px;
}
</style>