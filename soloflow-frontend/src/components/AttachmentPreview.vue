<template>
  <div class="attachment-preview">
    <!-- Header do preview com informações do arquivo -->
    <div class="preview-header pa-4">
      <div class="d-flex align-center justify-space-between">
        <div class="d-flex align-center">
          <v-avatar
            :color="getFileTypeColor(attachment.mimeType)"
            size="40"
            class="mr-3"
          >
            <v-icon :icon="getFileIcon(attachment.mimeType)" color="white" size="20" />
          </v-avatar>
          <div>
            <h3 class="text-h6 font-weight-bold">{{ getDisplayName(attachment) }}</h3>
            <p class="text-caption text-medium-emphasis">
              {{ formatFileSize(attachment.size) }} • {{ getFileTypeName(attachment.mimeType) }}
            </p>
          </div>
        </div>
        
        <div class="d-flex gap-2">
          <!-- Zoom controls para PDF -->
          <div v-if="isPdf && previewUrl" class="zoom-controls mr-3">
            <v-btn-group variant="outlined" density="compact">
              <v-btn size="small" @click="zoomOut" :disabled="zoomLevel <= 50">
                <v-icon>mdi-magnify-minus</v-icon>
              </v-btn>
              <v-btn size="small" disabled>
                {{ zoomLevel }}%
              </v-btn>
              <v-btn size="small" @click="zoomIn" :disabled="zoomLevel >= 200">
                <v-icon>mdi-magnify-plus</v-icon>
              </v-btn>
            </v-btn-group>
          </div>
          
          <v-btn
            color="info"
            variant="elevated"
            size="small"
            @click="openInNewTab"
          >
            <v-icon start>mdi-open-in-new</v-icon>
            Abrir
          </v-btn>
          
          <v-btn
            color="primary"
            variant="elevated"
            size="small"
            @click="$emit('download', attachment)"
            :loading="downloading"
          >
            <v-icon start>mdi-download</v-icon>
            Baixar
          </v-btn>
        </div>
      </div>
    </div>

    <!-- Loading state -->
    <div v-if="loading" class="preview-loading">
      <div class="text-center py-12">
        <v-progress-circular indeterminate color="primary" size="64" />
        <p class="text-body-2 text-grey mt-4">Carregando visualização...</p>
      </div>
    </div>

    <!-- Error state -->
    <div v-else-if="error" class="preview-error">
      <div class="text-center py-12">
        <v-icon size="64" color="error">mdi-alert-circle</v-icon>
        <h3 class="text-h6 mt-4">Erro ao carregar arquivo</h3>
        <p class="text-body-2 text-grey mt-2">{{ error }}</p>
        <v-btn color="primary" @click="loadPreview" class="mt-4">
          <v-icon start>mdi-refresh</v-icon>
          Tentar novamente
        </v-btn>
      </div>
    </div>

    <!-- Preview content -->
    <div v-else-if="previewUrl" class="preview-content">
      <!-- PDF Preview -->
      <div v-if="isPdf" class="pdf-preview-container">
        <iframe
          :src="previewUrl"
          class="pdf-viewer"
          frameborder="0"
          @load="onLoad"
          @error="onError"
        />
      </div>
      
      <!-- Image Preview -->
      <div v-else-if="isImage" class="image-preview">
        <div class="image-container">
          <img
            :src="previewUrl"
            :alt="attachment.originalName"
            class="preview-image"
            :style="{ transform: `scale(${imageZoom / 100})` }"
            @load="onLoad"
            @error="onError"
          />
        </div>
        
        <!-- Image zoom controls -->
        <div class="image-controls">
          <v-btn-group variant="outlined" density="compact">
            <v-btn size="small" @click="imageZoomOut" :disabled="imageZoom <= 25">
              <v-icon>mdi-magnify-minus</v-icon>
            </v-btn>
            <v-btn size="small" disabled>
              {{ imageZoom }}%
            </v-btn>
            <v-btn size="small" @click="imageZoomIn" :disabled="imageZoom >= 300">
              <v-icon>mdi-magnify-plus</v-icon>
            </v-btn>
            <v-btn size="small" @click="resetImageZoom">
              <v-icon>mdi-fit-to-page</v-icon>
            </v-btn>
          </v-btn-group>
        </div>
      </div>
    </div>

    <!-- Não suportado -->
    <div v-else class="preview-not-supported">
      <div class="text-center py-12">
        <v-icon size="80" color="grey-lighten-2">
          {{ getFileIcon(attachment.mimeType) }}
        </v-icon>
        <h3 class="text-h6 mt-4">Visualização não disponível</h3>
        <p class="text-body-2 text-grey mt-2">
          Este tipo de arquivo não pode ser visualizado diretamente.
        </p>
        <v-btn
          color="primary"
          @click="$emit('download', attachment)"
          class="mt-4"
        >
          <v-icon start>mdi-download</v-icon>
          Baixar arquivo
        </v-btn>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import api from '@/services/api'

const props = defineProps({
  attachment: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['download'])

// Estado
const loading = ref(false)
const error = ref('')
const previewUrl = ref('')
const downloading = ref(false)
const zoomLevel = ref(100)
const imageZoom = ref(100)

// Computed
const isPdf = computed(() => {
  return props.attachment.mimeType?.includes('pdf')
})

const isImage = computed(() => {
  return props.attachment.mimeType?.includes('image')
})

const canPreview = computed(() => {
  return isPdf.value || isImage.value
})

// Watch para carregar preview quando attachment muda
watch(() => props.attachment, (newAttachment) => {
  if (newAttachment && canPreview.value) {
    loadPreview()
  } else {
    previewUrl.value = ''
  }
}, { immediate: true })

// ✅ SOLUÇÃO PRINCIPAL: Carregar arquivo como blob para evitar problemas de CORS
async function loadPreview() {
  if (!props.attachment?.id || !canPreview.value) return
  
  loading.value = true
  error.value = ''
  
  try {
    console.log('🔍 Loading preview for attachment:', props.attachment.id)
    
    // ✅ Usar endpoint de view com autenticação automática via axios
    const response = await api.get(`/processes/attachment/${props.attachment.id}/view`, {
      responseType: 'blob'
    })
    
    console.log('✅ Preview blob loaded successfully')
    
    // Limpar URL anterior se existir
    if (previewUrl.value && previewUrl.value.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl.value)
    }
    
    // Criar URL blob
    const blob = new Blob([response.data], { 
      type: props.attachment.mimeType || 'application/pdf' 
    })
    
    previewUrl.value = URL.createObjectURL(blob)
    
    // Resetar zoom
    zoomLevel.value = 100
    imageZoom.value = 100
    
    console.log('🎯 Preview URL created:', previewUrl.value)
    
  } catch (err) {
    console.error('❌ Error loading preview:', err)
    error.value = 'Erro ao carregar visualização: ' + (err.response?.data?.message || err.message)
  } finally {
    loading.value = false
  }
}

function onLoad() {
  loading.value = false
  error.value = ''
  console.log('✅ Preview loaded successfully')
}

function onError() {
  loading.value = false
  error.value = 'Não foi possível carregar o arquivo'
  console.error('❌ Preview load error')
}

async function openInNewTab() {
  try {
    // Baixar arquivo e abrir em nova aba
    const response = await api.get(`/processes/attachment/${props.attachment.id}/download`, {
      responseType: 'blob'
    })
    
    const blob = new Blob([response.data], { 
      type: props.attachment.mimeType || 'application/pdf' 
    })
    const url = URL.createObjectURL(blob)
    
    window.open(url, '_blank')
    
    // Limpar URL após um tempo
    setTimeout(() => {
      URL.revokeObjectURL(url)
    }, 60000)
    
  } catch (error) {
    console.error('Error opening in new tab:', error)
    window.showSnackbar?.('Erro ao abrir arquivo', 'error')
  }
}

// Zoom controls para PDF
function zoomIn() {
  if (zoomLevel.value < 200) {
    zoomLevel.value += 25
  }
}

function zoomOut() {
  if (zoomLevel.value > 50) {
    zoomLevel.value -= 25
  }
}

// Zoom controls para imagem
function imageZoomIn() {
  if (imageZoom.value < 300) {
    imageZoom.value += 25
  }
}

function imageZoomOut() {
  if (imageZoom.value > 25) {
    imageZoom.value -= 25
  }
}

function resetImageZoom() {
  imageZoom.value = 100
}

// Métodos auxiliares
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

function getDisplayName(attachment) {
  // Se é campo do formulário, usar o nome do campo
  if (attachment.isFormField && attachment.fieldLabel) {
    return attachment.fieldLabel
  }
  
  // Senão usar nome original
  return attachment.originalName
}

onMounted(() => {
  if (props.attachment && canPreview.value) {
    loadPreview()
  }
})

// ✅ CLEANUP: Limpar blob URLs quando componente é desmontado
onUnmounted(() => {
  if (previewUrl.value && previewUrl.value.startsWith('blob:')) {
    URL.revokeObjectURL(previewUrl.value)
  }
})
</script>

<style scoped>
.attachment-preview {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #f8f9fa;
}

.preview-header {
  flex-shrink: 0;
  background: #ffffff;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
}

.preview-content {
  flex: 1;
  overflow: hidden;
  position: relative;
  background: #f8f9fa;
}

/* ✅ CORRIGIDO: Estilos para visualização de PDF sem fundo preto */
.pdf-preview-container {
  height: 100%;
  width: 100%;
  background: #f8f9fa;
  padding: 0;
  margin: 0;
}

.pdf-viewer {
  width: 100%;
  height: 100%;
  border: none;
  background: #ffffff !important;
  margin: 0;
  padding: 0;
}

/* ✅ Forçar fundo branco para PDFs */
.pdf-viewer::-webkit-scrollbar {
  width: 8px;
}

.pdf-viewer::-webkit-scrollbar-track {
  background: #f1f1f1;
}

.pdf-viewer::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 4px;
}

.image-preview {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #f8f9fa;
}

.image-container {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: auto;
  padding: 20px;
  background: #ffffff;
}

.preview-image {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s ease;
}

.image-controls {
  flex-shrink: 0;
  padding: 16px;
  display: flex;
  justify-content: center;
  background: #ffffff;
  border-top: 1px solid rgba(0, 0, 0, 0.08);
}

.preview-loading,
.preview-error,
.preview-not-supported {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #ffffff;
}

.zoom-controls {
  display: flex;
  align-items: center;
}
</style>