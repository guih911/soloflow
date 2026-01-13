<template>
  <div class="attachment-preview">
    <!-- ✅ NOVO: Header melhorado com informações de origem -->
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
            <div class="d-flex align-center text-caption text-medium-emphasis">
              <span>{{ formatFileSize(attachment.size) }} • {{ getFileTypeName(attachment.mimeType) }}</span>
              <!-- ✅ NOVO: Indicador de origem -->
              <v-chip
                size="x-small"
                :color="getOriginColor(attachment)"
                variant="tonal"
                class="ml-2"
              >
                <v-icon start size="10">{{ getOriginIcon(attachment) }}</v-icon>
                {{ attachment.attachmentSource || 'Processo' }}
              </v-chip>
            </div>
          </div>
        </div>
        
        <div class="d-flex align-center gap-3">
          <!-- Zoom controls para PDF -->
          <div v-if="isPdf && previewUrl" class="zoom-controls">
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

    <!-- ✅ CORRIGIDO: Preview content com fundo baseado na origem -->
    <div v-else-if="previewUrl" class="preview-content" :class="getPreviewContentClass()">
      <!-- PDF Preview -->
      <div v-if="isPdf" class="pdf-preview-container" :class="getPdfContainerClass()">
        <iframe
          :src="previewUrl"
          class="pdf-viewer"
          frameborder="0"
          @load="onLoad"
          @error="onError"
        />
      </div>
      
      <!-- Image Preview -->
      <div v-else-if="isImage" class="image-preview" :class="getImagePreviewClass()">
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

async function loadPreview() {
  if (!props.attachment?.id || !canPreview.value) return

  loading.value = true
  error.value = ''

  try {
    const response = await api.get(`/processes/attachment/${props.attachment.id}/view`, {
      responseType: 'blob'
    })

    if (previewUrl.value && previewUrl.value.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl.value)
    }

    const blob = new Blob([response.data], {
      type: props.attachment.mimeType || 'application/pdf'
    })

    previewUrl.value = URL.createObjectURL(blob)

    zoomLevel.value = 100
    imageZoom.value = 100
  } catch (err) {
    error.value = 'Erro ao carregar visualização: ' + (err.response?.data?.message || err.message)
  } finally {
    loading.value = false
  }
}

function onLoad() {
  loading.value = false
  error.value = ''
}

function onError() {
  loading.value = false
  error.value = 'Não foi possível carregar o arquivo'
}

async function openInNewTab() {
  try {
    const response = await api.get(`/processes/attachment/${props.attachment.id}/download`, {
      responseType: 'blob'
    })

    const blob = new Blob([response.data], {
      type: props.attachment.mimeType || 'application/pdf'
    })
    const url = URL.createObjectURL(blob)

    window.open(url, '_blank')

    setTimeout(() => {
      URL.revokeObjectURL(url)
    }, 60000)
  } catch (error) {
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

// ✅ NOVO: Classes baseadas na origem do arquivo
function getPreviewContentClass() {
  const baseClass = 'preview-content'
  
  // Diferentes estilos baseados na origem
  switch (props.attachment.attachmentType) {
    case 'form':
      return `${baseClass} preview-content--form`
    case 'step':
      return `${baseClass} preview-content--step`
    default:
      return `${baseClass} preview-content--default`
  }
}

function getPdfContainerClass() {
  // Fundo baseado na origem
  switch (props.attachment.attachmentType) {
    case 'form':
      return 'pdf-container--form'
    case 'step':
      return 'pdf-container--step'
    default:
      return 'pdf-container--default'
  }
}

function getImagePreviewClass() {
  // Fundo baseado na origem
  switch (props.attachment.attachmentType) {
    case 'form':
      return 'image-preview--form'
    case 'step':
      return 'image-preview--step'
    default:
      return 'image-preview--default'
  }
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
  background: #ffffff;
}

.preview-header {
  flex-shrink: 0;
  background: #ffffff;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
}

/* ✅ NOVO: Classes base para diferentes origens */
.preview-content {
  flex: 1;
  overflow: hidden;
  position: relative;
  display: flex;
  flex-direction: column;
}

/* ✅ Arquivos de formulário (solicitação inicial) - fundo transparente */
.preview-content--form {
  background: transparent;
}

/* ✅ Arquivos de etapa (processo) - fundo branco */
.preview-content--step {
  background: #ffffff;
}

/* ✅ Padrão - fundo branco */
.preview-content--default {
  background: #ffffff;
}

/* ✅ PDF Containers com fundos diferentes */
.pdf-preview-container {
  height: 100%;
  width: 100%;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  flex: 1;
}

/* ✅ PDF de formulário - fundo transparente */
.pdf-container--form {
  background: transparent !important;
}

/* ✅ PDF de etapa - fundo branco */
.pdf-container--step {
  background: #ffffff !important;
}

/* ✅ PDF padrão - fundo branco */
.pdf-container--default {
  background: #ffffff !important;
}

.pdf-viewer {
  width: 100%;
  height: 100%;
  border: none;
  margin: 0;
  padding: 0;
  flex: 1;
  min-height: 600px;
}

/* ✅ Forçar fundo transparente para PDFs de formulário */
.pdf-container--form .pdf-viewer {
  background: transparent !important;
}

/* ✅ Forçar fundo branco para PDFs de etapa */
.pdf-container--step .pdf-viewer,
.pdf-container--default .pdf-viewer {
  background: #ffffff !important;
}

/* ✅ Scrollbar personalizada */
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

/* ✅ Image Preview com fundos diferentes */
.image-preview {
  height: 100%;
  display: flex;
  flex-direction: column;
  flex: 1;
}

.image-preview--form {
  background: transparent;
}

.image-preview--step,
.image-preview--default {
  background: #ffffff;
}

.image-container {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: auto;
  padding: 20px;
}

.image-preview--form .image-container {
  background: transparent;
}

.image-preview--step .image-container,
.image-preview--default .image-container {
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
  flex: 1;
}

.zoom-controls {
  display: flex;
  align-items: center;
}

/* ✅ Espaçamento entre botões */
.gap-3 {
  gap: 12px;
}

.gap-3 > * + * {
  margin-left: 12px;
}
</style>