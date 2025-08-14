<template>
  <div class="file-upload-field">
    <!-- Label do campo -->
    <label v-if="label" class="field-label">
      {{ label }}
      <span v-if="required" class="text-error">*</span>
    </label>

    <!-- Área de upload principal -->
    <v-card
      :class="[
        'upload-area',
        { 
          'upload-area--dragover': isDragOver,
          'upload-area--has-files': selectedFiles.length > 0,
          'upload-area--disabled': disabled,
          'upload-area--error': hasError
        }
      ]"
      :variant="variant"
      @drop="handleDrop"
      @dragover="handleDragOver"
      @dragleave="handleDragLeave"
      @click="!disabled && triggerFileInput()"
    >
      <!-- Input oculto -->
      <input
        ref="fileInput"
        type="file"
        :multiple="multiple"
        :accept="accept"
        :disabled="disabled"
        @change="handleFileSelect"
        style="display: none;"
      />

      <!-- Conteúdo da área de upload -->
      <v-card-text class="upload-content pa-6">
        <!-- Estado vazio/inicial -->
        <div v-if="selectedFiles.length === 0" class="upload-placeholder">
          <div class="upload-icon-container">
            <v-icon
              :size="iconSize"
              :color="disabled ? 'grey-lighten-1' : 'primary'"
            >
              {{ uploadIcon }}
            </v-icon>
          </div>

          <h4 class="upload-title mt-3">
            {{ uploadTitle }}
          </h4>

          <p class="upload-description text-medium-emphasis">
            {{ uploadDescription }}
          </p>

          <v-btn
            v-if="!hideButton"
            :color="disabled ? 'grey' : 'primary'"
            :disabled="disabled"
            :size="buttonSize"
            variant="elevated"
            @click.stop="triggerFileInput"
            class="mt-3"
          >
            <v-icon start>{{ buttonIcon }}</v-icon>
            {{ buttonText }}
          </v-btn>

          <!-- Informações de ajuda -->
          <div v-if="helpText || maxSize || allowedTypes.length > 0" class="upload-help mt-4">
            <p v-if="helpText" class="text-caption">{{ helpText }}</p>
            
            <div class="upload-limits text-caption text-medium-emphasis">
              <span v-if="maxSize">
                Tamanho máx: {{ formatFileSize(maxSize) }}
              </span>
              <span v-if="maxSize && allowedTypes.length > 0"> • </span>
              <span v-if="allowedTypes.length > 0">
                Tipos: {{ formatAllowedTypes() }}
              </span>
            </div>
          </div>
        </div>

        <!-- Lista de arquivos selecionados -->
        <div v-else class="files-list">
          <div class="files-header mb-3">
            <h4 class="text-subtitle-1">
              {{ selectedFiles.length }} arquivo(s) selecionado(s)
            </h4>
            <v-btn
              v-if="multiple"
              size="small"
              variant="text"
              color="primary"
              @click.stop="triggerFileInput"
            >
              <v-icon start>mdi-plus</v-icon>
              Adicionar mais
            </v-btn>
          </div>

          <v-list density="compact" class="files-list-container">
            <v-list-item
              v-for="(file, index) in selectedFiles"
              :key="index"
              class="file-item"
            >
              <template v-slot:prepend>
                <v-avatar :color="getFileTypeColor(file.type)" size="32">
                  <v-icon size="16" color="white">
                    {{ getFileIcon(file.type) }}
                  </v-icon>
                </v-avatar>
              </template>

              <v-list-item-title class="file-name">
                {{ file.name }}
              </v-list-item-title>
              
              <v-list-item-subtitle class="file-details">
                {{ formatFileSize(file.size) }} • {{ getFileTypeName(file.type) }}
                <span v-if="file.uploadProgress !== undefined" class="upload-progress">
                  • {{ Math.round(file.uploadProgress) }}%
                </span>
              </v-list-item-subtitle>

              <!-- Progress bar durante upload -->
              <v-progress-linear
                v-if="file.uploadProgress !== undefined && file.uploadProgress < 100"
                :model-value="file.uploadProgress"
                color="primary"
                height="2"
                class="mt-1"
              />

              <template v-slot:append>
                <v-btn
                  icon="mdi-close"
                  size="x-small"
                  variant="text"
                  color="error"
                  @click.stop="removeFile(index)"
                  :disabled="disabled || file.uploading"
                />
              </template>
            </v-list-item>
          </v-list>

          <!-- Botão para limpar todos -->
          <div class="files-actions mt-3">
            <v-btn
              v-if="selectedFiles.length > 1"
              size="small"
              variant="text"
              color="error"
              @click="clearAllFiles"
              :disabled="disabled"
            >
              <v-icon start>mdi-delete-sweep</v-icon>
              Limpar todos
            </v-btn>
          </div>
        </div>
      </v-card-text>
    </v-card>

    <!-- Mensagens de erro -->
    <div v-if="errorMessages.length > 0" class="error-messages mt-2">
      <v-alert
        v-for="(error, index) in errorMessages"
        :key="index"
        type="error"
        variant="tonal"
        density="compact"
        class="mb-1"
      >
        {{ error }}
      </v-alert>
    </div>

    <!-- Resumo dos arquivos (quando minimizado) -->
    <div v-if="compact && selectedFiles.length > 0" class="files-summary mt-2">
      <v-chip-group>
        <v-chip
          v-for="(file, index) in selectedFiles"
          :key="index"
          size="small"
          closable
          @click:close="removeFile(index)"
        >
          <v-icon start size="16">{{ getFileIcon(file.type) }}</v-icon>
          {{ file.name }}
        </v-chip>
      </v-chip-group>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'

const props = defineProps({
  // Valor (array de arquivos)
  modelValue: {
    type: Array,
    default: () => []
  },
  
  // Configurações básicas
  label: {
    type: String,
    default: ''
  },
  required: {
    type: Boolean,
    default: false
  },
  disabled: {
    type: Boolean,
    default: false
  },
  multiple: {
    type: Boolean,
    default: true
  },
  
  // Validações
  accept: {
    type: String,
    default: ''
  },
  maxSize: {
    type: Number,
    default: 10 * 1024 * 1024 // 10MB
  },
  maxFiles: {
    type: Number,
    default: 10
  },
  
  // Tipos permitidos (array de extensões ou mime types)
  allowedTypes: {
    type: Array,
    default: () => ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx', '.xls', '.xlsx']
  },
  
  // Textos personalizáveis
  uploadTitle: {
    type: String,
    default: 'Clique ou arraste arquivos aqui'
  },
  uploadDescription: {
    type: String,
    default: 'Selecione um ou mais arquivos do seu computador'
  },
  buttonText: {
    type: String,
    default: 'Selecionar Arquivos'
  },
  helpText: {
    type: String,
    default: ''
  },
  
  // Aparência
  variant: {
    type: String,
    default: 'outlined'
  },
  compact: {
    type: Boolean,
    default: false
  },
  hideButton: {
    type: Boolean,
    default: false
  },
  
  // Ícones
  uploadIcon: {
    type: String,
    default: 'mdi-cloud-upload'
  },
  buttonIcon: {
    type: String,
    default: 'mdi-file-plus'
  },
  
  // Tamanhos
  iconSize: {
    type: [String, Number],
    default: 48
  },
  buttonSize: {
    type: String,
    default: 'default'
  }
})

const emit = defineEmits(['update:modelValue', 'files-changed', 'upload-progress', 'error'])

// Estado
const fileInput = ref(null)
const selectedFiles = ref([])
const isDragOver = ref(false)
const errorMessages = ref([])

// Computed
const hasError = computed(() => errorMessages.value.length > 0)

// Watchers
watch(() => props.modelValue, (newValue) => {
  selectedFiles.value = newValue || []
}, { immediate: true })

watch(selectedFiles, (newFiles) => {
  emit('update:modelValue', newFiles)
  emit('files-changed', newFiles)
}, { deep: true })

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

function formatAllowedTypes() {
  return props.allowedTypes
    .slice(0, 4)
    .map(type => type.replace('.', '').toUpperCase())
    .join(', ') + (props.allowedTypes.length > 4 ? '...' : '')
}

function validateFile(file) {
  const errors = []
  
  // Validar tamanho
  if (file.size > props.maxSize) {
    errors.push(`Arquivo "${file.name}" muito grande (máx: ${formatFileSize(props.maxSize)})`)
  }
  
  // Validar tipo
  if (props.allowedTypes.length > 0) {
    const fileExtension = '.' + file.name.split('.').pop().toLowerCase()
    const mimeType = file.type
    
    const isAllowed = props.allowedTypes.some(type => {
      return type === mimeType || type === fileExtension || 
             (type.includes('/*') && mimeType.startsWith(type.replace('/*', '')))
    })
    
    if (!isAllowed) {
      errors.push(`Tipo de arquivo "${file.name}" não permitido`)
    }
  }
  
  // Validar quantidade máxima
  if (selectedFiles.value.length >= props.maxFiles) {
    errors.push(`Máximo ${props.maxFiles} arquivo(s) permitido(s)`)
  }
  
  return errors
}

// Métodos de manipulação de arquivos
function triggerFileInput() {
  if (fileInput.value) {
    fileInput.value.click()
  }
}

function handleFileSelect(event) {
  const files = Array.from(event.target.files)
  processFiles(files)
  // Limpar input
  event.target.value = ''
}

function handleDrop(event) {
  event.preventDefault()
  isDragOver.value = false
  
  if (props.disabled) return
  
  const files = Array.from(event.dataTransfer.files)
  processFiles(files)
}

function handleDragOver(event) {
  event.preventDefault()
  if (!props.disabled) {
    isDragOver.value = true
  }
}

function handleDragLeave(event) {
  event.preventDefault()
  isDragOver.value = false
}

function processFiles(files) {
  errorMessages.value = []
  
  for (const file of files) {
    const errors = validateFile(file)
    
    if (errors.length > 0) {
      errorMessages.value.push(...errors)
      emit('error', errors)
      continue
    }
    
    // Se não é múltiplo, substituir arquivo existente
    if (!props.multiple) {
      selectedFiles.value = []
    }
    
    // Adicionar arquivo com metadata
    const fileWithMeta = {
      file,
      name: file.name,
      size: file.size,
      type: file.type,
      id: Date.now() + Math.random(),
      uploadProgress: undefined,
      uploading: false
    }
    
    selectedFiles.value.push(fileWithMeta)
  }
}

function removeFile(index) {
  selectedFiles.value.splice(index, 1)
  errorMessages.value = []
}

function clearAllFiles() {
  selectedFiles.value = []
  errorMessages.value = []
}

// Método para simular upload com progress
function simulateUpload(fileIndex) {
  const file = selectedFiles.value[fileIndex]
  if (!file) return
  
  file.uploading = true
  file.uploadProgress = 0
  
  const interval = setInterval(() => {
    file.uploadProgress += Math.random() * 30
    
    if (file.uploadProgress >= 100) {
      file.uploadProgress = 100
      file.uploading = false
      clearInterval(interval)
      emit('upload-progress', { fileIndex, progress: 100, completed: true })
    } else {
      emit('upload-progress', { fileIndex, progress: file.uploadProgress, completed: false })
    }
  }, 200)
}

// Expor métodos para o componente pai
defineExpose({
  triggerFileInput,
  clearAllFiles,
  simulateUpload,
  validate: () => errorMessages.value.length === 0
})
</script>

<style scoped>
.file-upload-field {
  width: 100%;
}

.field-label {
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  color: rgba(var(--v-theme-on-surface), 0.87);
  margin-bottom: 8px;
}

.upload-area {
  border: 2px dashed rgba(var(--v-theme-primary), 0.3);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.upload-area:hover:not(.upload-area--disabled) {
  border-color: rgba(var(--v-theme-primary), 0.6);
  background-color: rgba(var(--v-theme-primary), 0.02);
}

.upload-area--dragover {
  border-color: rgb(var(--v-theme-primary));
  background-color: rgba(var(--v-theme-primary), 0.08);
  transform: scale(1.01);
}

.upload-area--has-files {
  border-style: solid;
  border-color: rgba(var(--v-theme-success), 0.5);
}

.upload-area--disabled {
  cursor: not-allowed;
  opacity: 0.6;
  border-color: rgba(var(--v-theme-on-surface), 0.2);
}

.upload-area--error {
  border-color: rgba(var(--v-theme-error), 0.6);
}

.upload-content {
  text-align: center;
  position: relative;
}

.upload-placeholder {
  padding: 20px 0;
}

.upload-icon-container {
  margin-bottom: 16px;
}

.upload-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: rgba(var(--v-theme-on-surface), 0.87);
  margin-bottom: 8px;
}

.upload-description {
  font-size: 0.875rem;
  margin-bottom: 16px;
}

.upload-help {
  border-top: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  padding-top: 12px;
}

.upload-limits {
  margin-top: 4px;
}

.files-list {
  text-align: left;
}

.files-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.files-list-container {
  background: rgba(var(--v-theme-surface), 0.5);
  border-radius: 8px;
  max-height: 200px;
  overflow-y: auto;
}

.file-item {
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.05);
}

.file-item:last-child {
  border-bottom: none;
}

.file-name {
  font-weight: 500;
  font-size: 0.875rem;
}

.file-details {
  font-size: 0.75rem;
}

.upload-progress {
  color: rgb(var(--v-theme-primary));
  font-weight: 500;
}

.files-actions {
  display: flex;
  justify-content: flex-end;
}

.error-messages {
  max-height: 150px;
  overflow-y: auto;
}

.files-summary {
  max-height: 100px;
  overflow-y: auto;
}

/* Responsividade */
@media (max-width: 600px) {
  .upload-placeholder {
    padding: 16px 0;
  }
  
  .upload-title {
    font-size: 1rem;
  }
  
  .upload-description {
    font-size: 0.8rem;
  }
  
  .files-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
}

/* Scrollbar personalizada */
.files-list-container::-webkit-scrollbar,
.error-messages::-webkit-scrollbar,
.files-summary::-webkit-scrollbar {
  width: 4px;
}

.files-list-container::-webkit-scrollbar-track,
.error-messages::-webkit-scrollbar-track,
.files-summary::-webkit-scrollbar-track {
  background: transparent;
}

.files-list-container::-webkit-scrollbar-thumb,
.error-messages::-webkit-scrollbar-thumb,
.files-summary::-webkit-scrollbar-thumb {
  background: rgba(var(--v-theme-on-surface), 0.2);
  border-radius: 2px;
}
</style>