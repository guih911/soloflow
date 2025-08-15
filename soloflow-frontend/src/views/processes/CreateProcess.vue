<!-- src/views/processes/CreateProcess.vue - CORRIGIDO -->

<template>
  <div class="create-process-container">
    <!-- ✨ Header (mantido igual) -->
    <div class="header-section mb-6">
      <div class="d-flex align-center">
        <v-btn icon="mdi-arrow-left" variant="text" @click="goBack" class="mr-3" />
        <div class="flex-grow-1">
          <h1 class="text-h4 font-weight-bold mb-2">
            <v-icon size="32" class="mr-2" color="primary">
              {{ selectedProcessType ? 'mdi-rocket-launch' : 'mdi-file-document-plus' }}
            </v-icon>
            {{ selectedProcessType ? 'Iniciar Processo' : 'Criar Novo Processo' }}
          </h1>
          <p class="text-subtitle-1 text-medium-emphasis">
            {{ selectedProcessType 
              ? 'Preencha as informações necessárias para iniciar o processo' 
              : 'Selecione o tipo de processo e preencha as informações necessárias'
            }}
          </p>
        </div>
      </div>
    </div>

    <!-- Type Selection (mantido igual quando não pré-selecionado) -->
    <div v-if="!selectedProcessType">
      <!-- ... código de seleção mantido igual ... -->
    </div>

    <!-- ✅ FORMULÁRIO PRINCIPAL - CORRIGIDO -->
    <div v-else>
      <v-card class="form-card" elevation="2">
        <!-- Header do Processo (mantido) -->
        <div class="selected-process-header pa-6">
          <div class="d-flex align-center">
            <v-avatar color="primary" size="56" class="mr-4">
              <v-icon size="28" color="white">mdi-file-document-multiple</v-icon>
            </v-avatar>
            
            <div class="flex-grow-1">
              <h3 class="text-h5 font-weight-bold">{{ selectedProcessType.name }}</h3>
              <p v-if="selectedProcessType.description" class="text-body-1 text-medium-emphasis mt-1">
                {{ selectedProcessType.description }}
              </p>
            </div>
            
            <v-btn variant="text" size="small" @click="changeProcessType" v-if="!preselectedType">
              <v-icon start>mdi-pencil</v-icon>
              Trocar tipo
            </v-btn>
          </div>
        </div>

        <v-divider />

        <!-- ✅ FORMULÁRIO COM PROGRESSO DE UPLOAD -->
        <v-form ref="processForm" v-model="formValid">
          <div class="form-content pa-6">
            
            <!-- ✅ SEÇÃO: Campos do Formulário -->
            <div v-if="hasFormFields" class="form-section mb-6">
              <h4 class="text-h6 font-weight-medium mb-4 d-flex align-center">
                <v-icon color="purple" class="mr-2">mdi-form-textbox</v-icon>
                Dados do Processo
              </h4>
              
              <v-row>
                <v-col
                  v-for="field in getVisibleFormFields(selectedProcessType)"
                  :key="field.id"
                  :cols="getFieldCols(field)"
                >
                  <!-- Campos normais (mantidos iguais) -->
                  <v-text-field
                    v-if="field.type === 'TEXT'"
                    v-model="formData[field.name]"
                    :label="field.label"
                    :placeholder="field.placeholder"
                    :required="field.required"
                    :rules="getFieldRules(field)"
                    :hint="field.helpText"
                    persistent-hint
                    variant="outlined"
                    prepend-inner-icon="mdi-text"
                    class="mb-3"
                  />

                  <v-text-field
                    v-else-if="field.type === 'EMAIL'"
                    v-model="formData[field.name]"
                    :label="field.label"
                    :placeholder="field.placeholder"
                    :required="field.required"
                    :rules="getFieldRules(field)"
                    :hint="field.helpText"
                    persistent-hint
                    variant="outlined"
                    prepend-inner-icon="mdi-email"
                    class="mb-3"
                  />

                  <v-text-field
                    v-else-if="field.type === 'NUMBER'"
                    v-model.number="formData[field.name]"
                    :label="field.label"
                    :placeholder="field.placeholder"
                    type="number"
                    :required="field.required"
                    :rules="getFieldRules(field)"
                    :hint="field.helpText"
                    persistent-hint
                    variant="outlined"
                    prepend-inner-icon="mdi-numeric"
                    class="mb-3"
                  />

                  <v-text-field
                    v-else-if="field.type === 'DATE'"
                    v-model="formData[field.name]"
                    :label="field.label"
                    type="date"
                    :required="field.required"
                    :rules="getFieldRules(field)"
                    :hint="field.helpText"
                    persistent-hint
                    variant="outlined"
                    prepend-inner-icon="mdi-calendar"
                    class="mb-3"
                  />

                  <v-textarea
                    v-else-if="field.type === 'TEXTAREA'"
                    v-model="formData[field.name]"
                    :label="field.label"
                    :placeholder="field.placeholder"
                    rows="3"
                    :required="field.required"
                    :rules="getFieldRules(field)"
                    :hint="field.helpText"
                    persistent-hint
                    variant="outlined"
                    prepend-inner-icon="mdi-text-long"
                    class="mb-3"
                  />

                  <!-- ✅ CAMPO DE ARQUIVO - CORRIGIDO COMPLETAMENTE -->
                  <div v-else-if="field.type === 'FILE'" class="file-field-container mb-4">
                    <FileUploadField
                      v-model="formData[field.name]"
                      :label="field.label"
                      :required="field.required"
                      :help-text="field.helpText || getFileInputHelpText(field)"
                      :multiple="getFieldFileConfig(field).multiple"
                      :max-files="getFieldFileConfig(field).maxFiles"
                      :max-size="getFieldFileConfig(field).maxSize"
                      :allowed-types="getFieldFileConfig(field).allowedTypes"
                      :upload-title="field.placeholder || 'Clique ou arraste arquivos aqui'"
                      :upload-description="`Selecione ${getFieldFileConfig(field).multiple ? 'um ou mais arquivos' : 'um arquivo'} para ${field.label.toLowerCase()}`"
                      @files-changed="handleFieldFilesChanged(field, $event)"
                      @error="handleFileError"
                      class="mb-3"
                    />
                    
                    <!-- ✅ Indicador de progresso por campo -->
                    <div v-if="uploadProgress[field.name]" class="upload-progress-container mt-2">
                      <v-card variant="outlined" class="pa-3">
                        <div class="d-flex align-center mb-2">
                          <v-icon color="info" class="mr-2">mdi-upload</v-icon>
                          <span class="text-body-2 font-weight-medium">
                            Enviando arquivos para {{ field.label }}...
                          </span>
                        </div>
                        
                        <v-progress-linear
                          :model-value="uploadProgress[field.name].progress"
                          color="primary"
                          height="8"
                          rounded
                          class="mb-2"
                        />
                        
                        <div class="text-caption text-medium-emphasis">
                          {{ uploadProgress[field.name].current }} de {{ uploadProgress[field.name].total }} arquivo(s)
                          - {{ Math.round(uploadProgress[field.name].progress) }}%
                        </div>
                      </v-card>
                    </div>
                  </div>
                </v-col>
              </v-row>
            </div>

            <!-- Observações (mantido igual) -->
            <div class="form-section">
              <v-divider v-if="hasFormFields" class="mb-6" />
              
              <h4 class="text-h6 font-weight-medium mb-4 d-flex align-center">
                <v-icon color="info" class="mr-2">mdi-note-text</v-icon>
                Observações Adicionais
              </h4>
              
              <v-row>
                <v-col cols="12">
                  <v-textarea
                    v-model="processData.observations"
                    label="Observações sobre este processo"
                    placeholder="Adicione informações adicionais, contexto ou observações específicas sobre este processo..."
                    rows="4"
                    counter="1000"
                    :rules="[v => !v || v.length <= 1000 || 'Máximo 1000 caracteres']"
                    variant="outlined"
                    prepend-inner-icon="mdi-note-text"
                    hint="Campo opcional para informações complementares"
                    persistent-hint
                  />
                </v-col>
              </v-row>
            </div>
          </div>
        </v-form>

        <v-divider />

        <!-- ✅ ACTIONS COM FEEDBACK DE PROGRESSO -->
        <v-card-actions class="pa-6">
          <v-btn variant="text" @click="changeProcessType" v-if="!preselectedType">
            <v-icon start>mdi-arrow-left</v-icon>
            Trocar Tipo
          </v-btn>
          
          <v-btn variant="text" @click="goBack" v-else>
            Cancelar
          </v-btn>
          
          <v-spacer />
          
          <!-- Preview Button (mantido) -->
          <v-btn variant="outlined" color="info" @click="showPreview = true" class="mr-3">
            <v-icon start>mdi-eye</v-icon>
            Visualizar
          </v-btn>
          
          <!-- ✅ CREATE BUTTON - CORRIGIDO -->
          <v-btn
            color="primary"
            variant="elevated"
            size="large"
            :loading="creating"
            :disabled="!formValid || isUploading"
            @click="createProcessWithFiles"
          >
            <v-icon start>{{ isUploading ? 'mdi-upload' : 'mdi-rocket-launch' }}</v-icon>
            {{ isUploading ? 'Enviando arquivos...' : 'Criar Processo' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </div>

    <!-- ✅ Overlay de Progresso Global -->
    <v-overlay
      :model-value="creating && isUploading"
      contained
      class="align-center justify-center"
    >
      <v-card class="pa-6" min-width="400">
        <div class="text-center">
          <v-progress-circular
            :model-value="globalUploadProgress"
            size="80"
            width="8"
            color="primary"
            class="mb-4"
          >
            {{ Math.round(globalUploadProgress) }}%
          </v-progress-circular>
          
          <h3 class="text-h6 mb-2">{{ uploadStatusText }}</h3>
          
          <p class="text-body-2 text-medium-emphasis mb-4">
            {{ uploadDetailText }}
          </p>
          
          <div v-if="uploadErrors.length > 0" class="upload-errors">
            <v-alert type="warning" variant="tonal" density="compact">
              <v-icon start>mdi-alert</v-icon>
              {{ uploadErrors.length }} arquivo(s) com erro
            </v-alert>
          </div>
        </div>
      </v-card>
    </v-overlay>

    <!-- Dialogs mantidos iguais -->
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useProcessStore } from '@/stores/processes'
import { useProcessTypeStore } from '@/stores/processTypes'
import FileUploadField from '@/components/FileUploadField.vue'

const router = useRouter()
const route = useRoute()
const processStore = useProcessStore()
const processTypeStore = useProcessTypeStore()

// Props
const props = defineProps({
  typeId: String
})

// ✅ ESTADO REFATORADO
const searchType = ref('')
const selectedProcessTypeId = ref(null)
const formValid = ref(true)
const creating = ref(false)
const showPreview = ref(false)

// ✅ Estado de upload
const isUploading = ref(false)
const uploadProgress = ref({}) // Por campo
const globalUploadProgress = ref(0)
const uploadStatusText = ref('')
const uploadDetailText = ref('')
const uploadErrors = ref([])

const processForm = ref(null)
const processData = ref({
  observations: ''
})
const formData = ref({})

// Computed (mantidos iguais)
const loadingTypes = computed(() => processTypeStore.loading)
const processTypes = computed(() => processTypeStore.processTypes)
const preselectedType = computed(() => props.typeId || route.params.typeId)
const selectedProcessType = computed(() => {
  if (selectedProcessTypeId.value) {
    return processTypes.value.find(pt => pt.id === selectedProcessTypeId.value)
  }
  return null
})
const hasFormFields = computed(() => {
  return getVisibleFieldsCount(selectedProcessType.value) > 0
})

// ✅ MÉTODO PRINCIPAL COMPLETAMENTE REFATORADO
async function createProcessWithFiles() {
  if (!formValid.value || !selectedProcessType.value) {
    window.showSnackbar?.('Por favor, corrija os erros no formulário', 'error')
    return
  }

  creating.value = true
  isUploading.value = false
  uploadErrors.value = []
  
  try {
    // ✅ ETAPA 1: Separar dados limpos de arquivos
    console.log('📄 Step 1/2: Preparing clean data and file mapping...')
    
    const { sanitizedFormData, filesMap } = separateFormDataAndFiles()
    
    console.log('📝 Regular fields:', Object.keys(sanitizedFormData))
    console.log('📁 File fields:', Object.keys(filesMap))
    
    // ✅ ETAPA 1: Criar processo apenas com dados JSON
    uploadStatusText.value = 'Criando processo...'
    uploadDetailText.value = 'Salvando informações básicas'
    
    const basePayload = {
      processTypeId: selectedProcessType.value.id,
      title: generateProcessTitle(),
      description: processData.value.observations?.trim() || null,
      formData: sanitizedFormData // Dados limpos (sem arquivos)
    }

    console.log('📤 Creating process with base payload:', basePayload)
    const createdProcess = await processStore.createProcess(basePayload)
    console.log('✅ Process created (step 1/2):', createdProcess.code)

    // ✅ ETAPA 2: Upload de arquivos por campo (se existirem)
    if (Object.keys(filesMap).length > 0) {
      console.log('📄 Step 2/2: Uploading files by field...')
      isUploading.value = true
      
      uploadStatusText.value = 'Enviando arquivos...'
      uploadDetailText.value = 'Organizando anexos por campo'
      
      // Inicializar progresso por campo
      for (const [fieldName, fileList] of Object.entries(filesMap)) {
        uploadProgress.value[fieldName] = {
          progress: 0,
          current: 0,
          total: fileList.length
        }
      }

      // ✅ ETAPA 2: Upload usando método correto do store
      await processStore.uploadProcessFiles(createdProcess.id, filesMap)
      
      console.log('✅ All files uploaded successfully (step 2/2)')
      uploadStatusText.value = 'Arquivos enviados!'
      uploadDetailText.value = 'Processo criado com sucesso'
      globalUploadProgress.value = 100
    } else {
      console.log('ℹ️ No files to upload, skipping step 2/2')
    }

    // ✅ SUCESSO COMPLETO
    window.showSnackbar?.('Processo criado com sucesso! 🎉', 'success')
    
    // Navegar para o processo criado
    setTimeout(() => {
      router.push(`/processes/${createdProcess.id}`)
    }, 500)
    
  } catch (error) {
    console.error('❌ Error in createProcessWithFiles:', error)
    
    // ✅ TRATAMENTO DE ERRO ESPECÍFICO
    if (error.message?.includes('arquivo(s) falharam')) {
      // Erro parcial de upload - processo foi criado mas alguns arquivos falharam
      window.showSnackbar?.(
        'Processo criado, mas alguns arquivos não foram enviados: ' + error.message, 
        'warning'
      )
      
      // Ainda navegar para o processo (usuário pode tentar re-upload)
      setTimeout(() => {
        if (createdProcess?.id) {
          router.push(`/processes/${createdProcess.id}`)
        }
      }, 1000)
    } else {
      // Erro total
      window.showSnackbar?.(error.message || 'Erro ao criar processo', 'error')
    }
  } finally {
    creating.value = false
    isUploading.value = false
    uploadProgress.value = {}
    globalUploadProgress.value = 0
  }
}


// ✅ NOVO: Função para separar dados limpos de arquivos
function separateFormDataAndFiles() {
  const sanitizedFormData = {}
  const filesMap = {}
  
  // Processar formData separando arquivos de outros dados
  for (const [fieldName, fieldValue] of Object.entries(formData.value)) {
    if (Array.isArray(fieldValue) && fieldValue.length > 0 && fieldValue[0]?.file instanceof File) {
      // É campo de arquivo
      filesMap[fieldName] = fieldValue
      console.log(`🔍 File field detected: ${fieldName} with ${fieldValue.length} files`)
    } else if (fieldValue !== null && fieldValue !== undefined && fieldValue !== '') {
      // É campo normal (string, number, date, etc.) com valor válido
      sanitizedFormData[fieldName] = fieldValue
      console.log(`📝 Regular field: ${fieldName} = ${fieldValue}`)
    }
  }
  
  return { 
    sanitizedFormData: Object.keys(sanitizedFormData).length > 0 ? sanitizedFormData : undefined,
    filesMap 
  }
}


// ✅ Métodos de acompanhamento de progresso
function handleFieldFilesChanged(field, files) {
  console.log(`📝 Files changed for field ${field.name}:`, files.length)
  // O v-model já cuida da atualização automaticamente
}

function handleFileError(errors) {
  console.error('🚨 File validation errors:', errors)
  errors.forEach(error => {
    window.showSnackbar?.(error, 'error')
  })
}

// ✅ Método para gerar título automaticamente
function generateProcessTitle() {
  const now = new Date()
  const dateStr = now.toLocaleDateString('pt-BR')
  const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  
  return `${selectedProcessType.value?.name} - ${dateStr} ${timeStr}`
}

// Métodos auxiliares (mantidos iguais)
function getVisibleFormFields(processType) {
  if (!processType?.formFields) return []
  return processType.formFields
}

function getVisibleFieldsCount(processType) {
  return getVisibleFormFields(processType).length
}

function getFieldCols(field) {
  switch (field.type) {
    case 'TEXTAREA':
    case 'CHECKBOX':
    case 'FILE':
      return 12
    default:
      return { cols: 12, md: 6 }
  }
}

function getFieldFileConfig(field) {
  const defaultConfig = {
    multiple: false,
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx', '.xls', '.xlsx']
  }

  if (field.validations) {
    try {
      const validations = typeof field.validations === 'object' ? 
        field.validations : JSON.parse(field.validations)
      
      return {
        multiple: validations.maxFiles ? validations.maxFiles > 1 : defaultConfig.multiple,
        maxFiles: validations.maxFiles || defaultConfig.maxFiles,
        maxSize: validations.maxSize || defaultConfig.maxSize,
        allowedTypes: validations.allowedTypes || defaultConfig.allowedTypes
      }
    } catch {
      return defaultConfig
    }
  }

  return defaultConfig
}

function getFileInputHelpText(field) {
  const config = getFieldFileConfig(field)
  const maxSize = formatFileSize(config.maxSize)
  const types = config.allowedTypes.slice(0, 3).map(t => t.replace('.', '').toUpperCase()).join(', ')
  
  return `Máx: ${config.maxFiles} arquivo(s), ${maxSize} cada. Tipos: ${types}${config.allowedTypes.length > 3 ? '...' : ''}`
}

function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}

function getFieldRules(field) {
  const rules = []
  
  if (field.required) {
    rules.push(v => {
      if (field.type === 'CHECKBOX') {
        return (v && v.length > 0) || `${field.label} é obrigatório`
      }
      if (field.type === 'FILE') {
        return (v && v.length > 0) || `${field.label} é obrigatório`
      }
      return !!v || `${field.label} é obrigatório`
    })
  }

  // Validações específicas por tipo...
  switch (field.type) {
    case 'EMAIL':
      rules.push(v => !v || /.+@.+\..+/.test(v) || 'E-mail inválido')
      break
    case 'CPF':
      rules.push(v => !v || /^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(v) || 'CPF inválido')
      break
    case 'CNPJ':
      rules.push(v => !v || /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/.test(v) || 'CNPJ inválido')
      break
  }

  return rules
}

// Métodos de navegação (mantidos)
function goBack() {
  router.push('/processes')
}

function changeProcessType() {
  selectedProcessTypeId.value = null
  formData.value = {}
}

function selectProcessType(processType) {
  selectedProcessTypeId.value = processType.id
  initializeFormData(processType)
}

function proceedToForm() {
  const processType = processTypes.value.find(pt => pt.id === selectedProcessTypeId.value)
  if (processType) {
    initializeFormData(processType)
  }
}

function initializeFormData(processType) {
  formData.value = {}
  
  if (processType?.formFields) {
    getVisibleFormFields(processType).forEach(field => {
      if (field.defaultValue) {
        formData.value[field.name] = field.defaultValue
      } else if (field.type === 'CHECKBOX') {
        formData.value[field.name] = []
      } else if (field.type === 'FILE') {
        formData.value[field.name] = []
      }
    })
  }
}

// Watchers (mantidos)
watch(() => preselectedType.value, async (newTypeId) => {
  if (newTypeId && processTypes.value.length > 0) {
    const processType = processTypes.value.find(pt => pt.id === newTypeId)
    if (processType) {
      console.log('✨ Pre-selecting process type:', processType.name)
      selectedProcessTypeId.value = newTypeId
      initializeFormData(processType)
    }
  }
}, { immediate: true })

// Lifecycle (mantido)
onMounted(async () => {
  console.log('🚀 CreateProcess mounted, typeId:', preselectedType.value)
  
  if (processTypes.value.length === 0) {
    await processTypeStore.fetchProcessTypes()
  }
  
  if (preselectedType.value) {
    const processType = processTypes.value.find(pt => pt.id === preselectedType.value)
    if (processType) {
      selectedProcessTypeId.value = preselectedType.value
      initializeFormData(processType)
    }
  }
})
</script>

<style scoped>
/* Estilos mantidos iguais + novos para upload */
.create-process-container {
  max-width: 1200px;
  margin: 0 auto;
}

.header-section {
  background: linear-gradient(135deg, rgba(25, 118, 210, 0.1), rgba(66, 165, 245, 0.05));
  border-radius: 16px;
  padding: 24px;
  border: 1px solid rgba(25, 118, 210, 0.1);
  margin-bottom: 32px;
  backdrop-filter: blur(10px);
}

.form-card {
  border-radius: 16px;
  overflow: hidden;
}

.selected-process-header {
  background: linear-gradient(135deg, rgba(25, 118, 210, 0.05), rgba(66, 165, 245, 0.02));
  border-bottom: 1px solid rgba(25, 118, 210, 0.1);
}

.form-section h4 {
  border-left: 4px solid rgb(var(--v-theme-primary));
  padding-left: 16px;
}

/* ✅ NOVOS: Estilos para upload progress */
.file-field-container {
  position: relative;
}

.upload-progress-container {
  margin-top: 8px;
}

.upload-progress-container .v-card {
  border: 1px solid rgba(var(--v-theme-info), 0.3);
  background: rgba(var(--v-theme-info), 0.02);
}

/* Progress overlay */
.v-overlay .v-card {
  border-radius: 20px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.upload-errors {
  margin-top: 16px;
}

/* Responsividade */
@media (max-width: 768px) {
  .header-section {
    padding: 16px;
  }
  
  .selected-process-header .d-flex {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }
}
</style>