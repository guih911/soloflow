<template>
  <div class="create-process-container">
    <!-- ✨ Header Dinâmico -->
    <div class="header-section mb-6">
      <div class="d-flex align-center">
        <v-btn
          icon="mdi-arrow-left"
          variant="text"
          @click="goBack"
          class="mr-3"
        />
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

    <!-- ✨ Step 1: Seleção do Tipo (se não foi pré-selecionado) -->
    <div v-if="!selectedProcessType">
      <v-card class="selection-card mb-4" elevation="2">
        <v-card-title class="d-flex align-center pa-6">
          <v-icon color="primary" size="28" class="mr-3">mdi-file-tree</v-icon>
          <div>
            <h3 class="text-h5 font-weight-bold">Selecione o tipo de processo</h3>
            <p class="text-body-2 text-medium-emphasis mt-1">
              Escolha entre os workflows disponíveis na sua empresa
            </p>
          </div>
        </v-card-title>
        
        <v-divider />
        
        <v-card-text class="pa-6">
          <v-text-field
            v-model="searchType"
            label="🔍 Buscar tipo de processo..."
            prepend-inner-icon="mdi-magnify"
            clearable
            variant="outlined"
            class="mb-4"
          />

          <div class="process-type-grid">
            <v-row>
              <v-col
                v-for="processType in filteredProcessTypes"
                :key="processType.id"
                cols="12"
                md="6"
              >
                <v-card
                  :color="selectedProcessTypeId === processType.id ? 'primary' : ''"
                  :variant="selectedProcessTypeId === processType.id ? 'tonal' : 'outlined'"
                  class="process-type-option"
                  @click="selectProcessType(processType)"
                  :class="{ 'selected': selectedProcessTypeId === processType.id }"
                >
                  <v-card-text class="pa-4">
                    <div class="d-flex align-center mb-3">
                      <v-avatar
                        :color="selectedProcessTypeId === processType.id ? 'primary' : 'grey-lighten-2'"
                        size="40"
                        class="mr-3"
                      >
                        <v-icon
                          :color="selectedProcessTypeId === processType.id ? 'white' : 'grey'"
                        >
                          mdi-file-document-multiple-outline
                        </v-icon>
                      </v-avatar>
                      
                      <div class="flex-grow-1">
                        <h4 class="text-h6 font-weight-medium">{{ processType.name }}</h4>
                      </div>
                      
                      <v-radio
                        :model-value="selectedProcessTypeId"
                        :value="processType.id"
                        color="primary"
                        hide-details
                      />
                    </div>
                    
                    <p v-if="processType.description" class="text-body-2 text-medium-emphasis">
                      {{ processType.description }}
                    </p>
                  </v-card-text>
                </v-card>
              </v-col>
            </v-row>
          </div>

          <v-alert
            v-if="filteredProcessTypes.length === 0"
            type="info"
            variant="tonal"
            class="mt-4"
          >
            <v-icon start>mdi-information</v-icon>
            Nenhum tipo de processo encontrado. Tente ajustar sua busca.
          </v-alert>
        </v-card-text>

        <v-divider />

        <v-card-actions class="pa-6">
          <v-spacer />
          <v-btn variant="text" @click="goBack">Cancelar</v-btn>
          <v-btn
            color="primary"
            variant="elevated"
            :disabled="!selectedProcessTypeId"
            @click="proceedToForm"
          >
            Próximo
            <v-icon end>mdi-arrow-right</v-icon>
          </v-btn>
        </v-card-actions>
      </v-card>
    </div>

    <!-- ✨ Formulário do Processo -->
    <div v-else>
      <v-card class="form-card" elevation="2">
        <!-- ✨ Header do Processo Selecionado -->
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
            
            <v-btn
              variant="text"
              size="small"
              @click="changeProcessType"
              v-if="!preselectedType"
            >
              <v-icon start>mdi-pencil</v-icon>
              Trocar tipo
            </v-btn>
          </div>
        </div>

        <v-divider />

        <!-- ✨ Formulário Principal -->
        <v-form ref="processForm" v-model="formValid">
          <div class="form-content pa-6">
            
            <!-- ✨ Campos Específicos do Formulário -->
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
                  <!-- ✨ Campo de Texto -->
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

                  <!-- ✨ Campo Numérico -->
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

                  <!-- ✨ Campo de Data -->
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

                  <!-- ✨ Campo de Email -->
                  <v-text-field
                    v-else-if="field.type === 'EMAIL'"
                    v-model="formData[field.name]"
                    :label="field.label"
                    :placeholder="field.placeholder || 'email@exemplo.com'"
                    type="email"
                    :required="field.required"
                    :rules="getFieldRules(field)"
                    :hint="field.helpText"
                    persistent-hint
                    variant="outlined"
                    prepend-inner-icon="mdi-email"
                    class="mb-3"
                  />

                  <!-- ✨ Campo de CPF -->
                  <v-text-field
                    v-else-if="field.type === 'CPF'"
                    v-model="formData[field.name]"
                    :label="field.label"
                    :placeholder="field.placeholder || '000.000.000-00'"
                    v-mask="'###.###.###-##'"
                    :required="field.required"
                    :rules="getFieldRules(field)"
                    :hint="field.helpText"
                    persistent-hint
                    variant="outlined"
                    prepend-inner-icon="mdi-card-account-details"
                    class="mb-3"
                  />

                  <!-- ✨ Campo de CNPJ -->
                  <v-text-field
                    v-else-if="field.type === 'CNPJ'"
                    v-model="formData[field.name]"
                    :label="field.label"
                    :placeholder="field.placeholder || '00.000.000/0000-00'"
                    v-mask="'##.###.###/####-##'"
                    :required="field.required"
                    :rules="getFieldRules(field)"
                    :hint="field.helpText"
                    persistent-hint
                    variant="outlined"
                    prepend-inner-icon="mdi-domain"
                    class="mb-3"
                  />

                  <!-- ✨ Campo de Telefone -->
                  <v-text-field
                    v-else-if="field.type === 'PHONE'"
                    v-model="formData[field.name]"
                    :label="field.label"
                    :placeholder="field.placeholder || '(00) 00000-0000'"
                    v-mask="['(##) ####-####', '(##) #####-####']"
                    :required="field.required"
                    :rules="getFieldRules(field)"
                    :hint="field.helpText"
                    persistent-hint
                    variant="outlined"
                    prepend-inner-icon="mdi-phone"
                    class="mb-3"
                  />

                  <!-- ✨ Campo de Moeda -->
                  <v-text-field
                    v-else-if="field.type === 'CURRENCY'"
                    v-model="formData[field.name]"
                    :label="field.label"
                    :placeholder="field.placeholder"
                    prefix="R$"
                    type="number"
                    step="0.01"
                    :required="field.required"
                    :rules="getFieldRules(field)"
                    :hint="field.helpText"
                    persistent-hint
                    variant="outlined"
                    prepend-inner-icon="mdi-currency-brl"
                    class="mb-3"
                  />

                  <!-- ✨ Dropdown -->
                  <v-select
                    v-else-if="field.type === 'DROPDOWN'"
                    v-model="formData[field.name]"
                    :label="field.label"
                    :items="getFieldOptions(field)"
                    :required="field.required"
                    :rules="getFieldRules(field)"
                    :hint="field.helpText"
                    persistent-hint
                    variant="outlined"
                    prepend-inner-icon="mdi-menu-down"
                    class="mb-3"
                  />

                  <!-- ✨ Checkbox -->
                  <div v-else-if="field.type === 'CHECKBOX'" class="checkbox-field mb-3">
                    <p class="text-subtitle-2 mb-3 d-flex align-center">
                      <v-icon color="primary" size="20" class="mr-2">mdi-checkbox-marked</v-icon>
                      {{ field.label }}
                      <span v-if="field.required" class="text-error ml-1">*</span>
                    </p>
                    
                    <v-card variant="outlined" class="pa-3">
                      <v-checkbox
                        v-for="option in getFieldOptions(field)"
                        :key="option.value"
                        v-model="formData[field.name]"
                        :label="option.label"
                        :value="option.value"
                        multiple
                        hide-details
                        density="comfortable"
                        color="primary"
                      />
                    </v-card>
                    
                    <p v-if="field.helpText" class="text-caption text-grey mt-2">
                      <v-icon size="16" class="mr-1">mdi-information</v-icon>
                      {{ field.helpText }}
                    </p>
                  </div>

                  <!-- ✨ Textarea -->
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

                  <!-- ✨ NOVO: Campo de Arquivo com Componente Integrado -->
                  <FileUploadField
                    v-else-if="field.type === 'FILE'"
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
                </v-col>
              </v-row>
            </div>

            <!-- ✨ Seção de Observações (sempre visível na mesma tela) -->
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

        <!-- ✨ Actions Simplificadas -->
        <v-card-actions class="pa-6">
          <v-btn
            variant="text"
            @click="changeProcessType"
            v-if="!preselectedType"
          >
            <v-icon start>mdi-arrow-left</v-icon>
            Trocar Tipo
          </v-btn>
          
          <v-btn
            variant="text"
            @click="goBack"
            v-else
          >
            Cancelar
          </v-btn>
          
          <v-spacer />
          
          <!-- ✨ Preview Button -->
          <v-btn
            variant="outlined"
            color="info"
            @click="showPreview = true"
            class="mr-3"
          >
            <v-icon start>mdi-eye</v-icon>
            Visualizar
          </v-btn>
          
          <!-- ✨ Create Button -->
          <v-btn
            color="primary"
            variant="elevated"
            size="large"
            :loading="creating"
            :disabled="!formValid"
            @click="createProcess"
          >
            <v-icon start>mdi-rocket-launch</v-icon>
            Criar Processo
          </v-btn>
        </v-card-actions>
      </v-card>
    </div>

    <!-- ✨ Loading Overlay -->
    <v-overlay
      :model-value="loadingTypes"
      contained
      class="align-center justify-center"
    >
      <div class="text-center">
        <v-progress-circular
          indeterminate
          size="64"
          color="primary"
          width="6"
        />
        <p class="text-h6 mt-4">Carregando tipos de processo...</p>
      </div>
    </v-overlay>

    <!-- ✨ Preview Dialog -->
    <v-dialog v-model="showPreview" max-width="800">
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon color="info" class="mr-2">mdi-eye</v-icon>
          Visualizar Processo
        </v-card-title>
        
        <v-divider />
        
        <v-card-text class="pa-6">
          <div class="preview-content">
            <h4 class="text-h6 mb-3">{{ generateProcessTitle() }}</h4>
            
            <v-list density="comfortable">
              <v-list-item>
                <v-list-item-title>Tipo de Processo</v-list-item-title>
                <v-list-item-subtitle>{{ selectedProcessType?.name }}</v-list-item-subtitle>
              </v-list-item>
              
              <v-list-item v-if="processData.observations">
                <v-list-item-title>Observações</v-list-item-title>
                <v-list-item-subtitle>{{ processData.observations }}</v-list-item-subtitle>
              </v-list-item>
              
              <v-list-item v-for="(value, key) in filledFormData" :key="key">
                <v-list-item-title>{{ getFieldLabel(key) }}</v-list-item-title>
                <v-list-item-subtitle>{{ formatFieldValue(value) }}</v-list-item-subtitle>
              </v-list-item>
            </v-list>
          </div>
        </v-card-text>
        
        <v-divider />
        
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showPreview = false">Fechar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useProcessStore } from '@/stores/processes'
import { useProcessTypeStore } from '@/stores/processTypes'

// ✨ Importar o componente de upload
import FileUploadField from '@/components/FileUploadField.vue'

const router = useRouter()
const route = useRoute()
const processStore = useProcessStore()
const processTypeStore = useProcessTypeStore()

// ✨ Props para tipo pré-selecionado
const props = defineProps({
  typeId: String
})

// ✨ Estado
const searchType = ref('')
const selectedProcessTypeId = ref(null)
const formValid = ref(true)
const creating = ref(false)
const showPreview = ref(false)

const processForm = ref(null)
const processData = ref({
  observations: ''
})
const formData = ref({})

// ✨ Computed
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

const filteredProcessTypes = computed(() => {
  if (!searchType.value) return processTypes.value.filter(pt => pt.isActive)
  
  const search = searchType.value.toLowerCase()
  return processTypes.value.filter(pt => 
    pt.isActive &&
    (pt.name.toLowerCase().includes(search) ||
    pt.description?.toLowerCase().includes(search))
  )
})

const filledFormData = computed(() => {
  const filled = {}
  Object.keys(formData.value).forEach(key => {
    const value = formData.value[key]
    if (value !== null && value !== undefined && value !== '') {
      // Se é arquivo, mostrar info resumida
      if (Array.isArray(value) && value.length > 0 && value[0].file) {
        filled[key] = `${value.length} arquivo(s) selecionado(s)`
      } else {
        filled[key] = value
      }
    }
  })
  return filled
})

// ✨ Métodos auxiliares aprimorados
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
    case 'FILE': // Campo de arquivo ocupa largura total
      return 12
    default:
      return { cols: 12, md: 6 }
  }
}

function getFieldOptions(field) {
  try {
    const options = Array.isArray(field.options) ? field.options : JSON.parse(field.options || '[]')
    return options.map(opt => ({
      title: opt.label || opt.value,
      value: opt.value,
      label: opt.label || opt.value
    }))
  } catch {
    return []
  }
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

  if (field.validations) {
    try {
      const validations = typeof field.validations === 'object' ? 
        field.validations : JSON.parse(field.validations)
      
      if (validations.minLength && field.type !== 'FILE') {
        rules.push(v => !v || v.length >= validations.minLength || 
          validations.customMessage || `Mínimo ${validations.minLength} caracteres`)
      }
      
      if (validations.maxLength && field.type !== 'FILE') {
        rules.push(v => !v || v.length <= validations.maxLength || 
          validations.customMessage || `Máximo ${validations.maxLength} caracteres`)
      }
      
      if (validations.min !== undefined) {
        rules.push(v => !v || Number(v) >= validations.min || 
          validations.customMessage || `Valor mínimo: ${validations.min}`)
      }
      
      if (validations.max !== undefined) {
        rules.push(v => !v || Number(v) <= validations.max || 
          validations.customMessage || `Valor máximo: ${validations.max}`)
      }
      
      if (validations.pattern) {
        rules.push(v => !v || new RegExp(validations.pattern).test(v) || 
          validations.customMessage || 'Formato inválido')
      }
    } catch (e) {
      console.error('Erro ao parsear validações:', e)
    }
  }

  return rules
}

function getFieldLabel(fieldName) {
  const field = selectedProcessType.value?.formFields?.find(f => f.name === fieldName)
  return field?.label || fieldName
}

function formatFieldValue(value) {
  if (Array.isArray(value)) {
    return value.join(', ')
  }
  return String(value)
}

// ✨ Configuração de arquivo por campo
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

// ✨ Manipuladores de eventos de arquivo
function handleFieldFilesChanged(field, files) {
  console.log(`Files changed for field ${field.name}:`, files)
  // O v-model já cuida da atualização
}

function handleFileError(errors) {
  console.error('File upload errors:', errors)
  errors.forEach(error => {
    window.showSnackbar?.(error, 'error')
  })
}

// ✨ Método para gerar título automaticamente
function generateProcessTitle() {
  const now = new Date()
  const dateStr = now.toLocaleDateString('pt-BR')
  const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  
  return `${selectedProcessType.value?.name} - ${dateStr} ${timeStr}`
}

// ✨ Métodos principais
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

async function createProcess() {
  if (!formValid.value || !selectedProcessType.value) {
    window.showSnackbar?.('Por favor, corrija os erros no formulário', 'error')
    return
  }

  creating.value = true
  try {
    // ✨ Preparar dados do formulário incluindo arquivos
    const processFormData = { ...formData.value }
    
    // Converter dados de arquivo para o formato esperado pelo backend
    Object.keys(formData.value).forEach(fieldName => {
      const fieldValue = formData.value[fieldName]
      if (Array.isArray(fieldValue) && fieldValue.length > 0 && fieldValue[0].file) {
        processFormData[fieldName] = fieldValue.map(fileItem => ({
          name: fileItem.name,
          size: fileItem.size,
          type: fileItem.type,
          file: fileItem.file
        }))
      }
    })

    const data = {
      processTypeId: selectedProcessType.value.id,
      title: generateProcessTitle(),
      description: processData.value.observations?.trim() || null,
      formData: hasFormFields.value ? processFormData : undefined
    }

    console.log('✨ Creating process with data:', data)

    const created = await processStore.createProcess(data)
    
    window.showSnackbar?.('Processo criado com sucesso! 🎉', 'success')
    
    // ✨ Navegar para o processo criado
    setTimeout(() => {
      router.push(`/processes/${created.id}`)
    }, 500)
    
  } catch (error) {
    console.error('Error creating process:', error)
    window.showSnackbar?.(error.message || 'Erro ao criar processo', 'error')
  } finally {
    creating.value = false
  }
}

// ✨ Watchers
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

// ✨ Lifecycle
onMounted(async () => {
  console.log('🚀 CreateProcess mounted, typeId:', preselectedType.value)
  
  // Carregar tipos se necessário
  if (processTypes.value.length === 0) {
    await processTypeStore.fetchProcessTypes()
  }
  
  // Se tipo foi pré-selecionado via route
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
/* ✨ Estilos Elegantes */
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

.selection-card,
.form-card {
  border-radius: 16px;
  overflow: hidden;
}

.process-type-option {
  cursor: pointer;
  transition: all 0.3s ease;
  border-radius: 12px;
}

.process-type-option:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
}

.process-type-option.selected {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(25, 118, 210, 0.2);
}

.selected-process-header {
  background: linear-gradient(135deg, rgba(25, 118, 210, 0.05), rgba(66, 165, 245, 0.02));
  border-bottom: 1px solid rgba(25, 118, 210, 0.1);
}

.form-section {
  position: relative;
}

.form-section h4 {
  border-left: 4px solid rgb(var(--v-theme-primary));
  padding-left: 16px;
}

.checkbox-field .v-card {
  border-radius: 8px;
}

.preview-content {
  max-height: 400px;
  overflow-y: auto;
}

/* ✨ Responsividade */
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