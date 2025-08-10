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
              ? `Configurando: ${selectedProcessType.name}` 
              : 'Selecione o tipo de processo e preencha as informações necessárias'
            }}
          </p>
        </div>
        
        <!-- ✨ Indicador de Progresso -->
        <div v-if="selectedProcessType" class="progress-indicator">
          <v-chip color="primary" variant="tonal" size="small">
            <v-icon start size="16">mdi-progress-clock</v-icon>
            Etapa {{ currentStep }} de {{ totalSteps }}
          </v-chip>
        </div>
      </div>
    </div>

    <!-- ✨ Stepper Linear Elegante -->
    <v-card v-if="selectedProcessType" class="stepper-card mb-6" elevation="2">
      <v-stepper
        v-model="currentStep"
        :items="stepperItems"
        class="elevation-0"
        color="primary"
        hide-actions
      >
        <template v-slot:item.1>
          <div class="d-flex align-center">
            <v-icon class="mr-2">mdi-information</v-icon>
            Informações Básicas
          </div>
        </template>
        <template v-slot:item.2 v-if="hasFormFields">
          <div class="d-flex align-center">
            <v-icon class="mr-2">mdi-form-textbox</v-icon>
            Formulário Específico
          </div>
        </template>
      </v-stepper>
    </v-card>

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
                        <div class="d-flex align-center mt-1">
                          <v-chip size="x-small" class="mr-1">
                            {{ processType.steps?.length || 0 }} etapas
                          </v-chip>
                          <v-chip v-if="processType.formFields?.length > 0" size="x-small">
                            {{ processType.formFields.length }} campos
                          </v-chip>
                        </div>
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

    <!-- ✨ Step 2: Formulário do Processo -->
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
              
              <div class="d-flex align-center mt-2">
                <v-chip size="small" color="info" variant="tonal" class="mr-2">
                  <v-icon start size="16">mdi-debug-step-over</v-icon>
                  {{ selectedProcessType.steps?.length || 0 }} etapas
                </v-chip>
                
                <v-chip v-if="hasFormFields" size="small" color="purple" variant="tonal" class="mr-2">
                  <v-icon start size="16">mdi-form-textbox</v-icon>
                  {{ selectedProcessType.formFields?.length }} campos
                </v-chip>
                
                <v-chip size="small" color="warning" variant="tonal">
                  <v-icon start size="16">mdi-clock-outline</v-icon>
                  ~{{ getEstimatedTime() }}
                </v-chip>
              </div>
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
            <!-- ✨ Informações Básicas -->
            <div class="form-section mb-6">
              <h4 class="text-h6 font-weight-medium mb-4 d-flex align-center">
                <v-icon color="primary" class="mr-2">mdi-information</v-icon>
                Informações Básicas
              </h4>
              
              <v-row>
                <v-col cols="12">
                  <v-text-field
                    v-model="processData.title"
                    label="Título do processo"
                    :placeholder="`Ex: ${selectedProcessType.name} - ${new Date().toLocaleDateString()}`"
                    hint="Deixe vazio para usar o nome do tipo + data atual"
                    persistent-hint
                    variant="outlined"
                    prepend-inner-icon="mdi-text"
                    class="mb-3"
                  />
                </v-col>
                
                <v-col cols="12">
                  <v-textarea
                    v-model="processData.description"
                    label="Descrição (opcional)"
                    placeholder="Descreva o motivo ou detalhes específicos deste processo..."
                    rows="3"
                    counter="500"
                    :rules="[v => !v || v.length <= 500 || 'Máximo 500 caracteres']"
                    variant="outlined"
                    prepend-inner-icon="mdi-text-long"
                  />
                </v-col>
              </v-row>
            </div>

            <!-- ✨ Campos Personalizados -->
            <div v-if="hasFormFields" class="form-section">
              <v-divider class="mb-6" />
              
              <h4 class="text-h6 font-weight-medium mb-4 d-flex align-center">
                <v-icon color="purple" class="mr-2">mdi-form-textbox</v-icon>
                Informações Específicas
                <v-chip size="small" color="purple" variant="tonal" class="ml-2">
                  {{ selectedProcessType.formFields.length }} campos
                </v-chip>
              </h4>
              
              <v-row>
                <v-col
                  v-for="field in selectedProcessType.formFields"
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
                  />

                  <!-- ✨ Checkbox -->
                  <div v-else-if="field.type === 'CHECKBOX'" class="checkbox-field">
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
                  />
                </v-col>
              </v-row>
            </div>
          </div>
        </v-form>

        <v-divider />

        <!-- ✨ Actions Elegantes -->
        <v-card-actions class="pa-6">
          <v-btn
            variant="text"
            @click="goBackStep"
            v-if="!preselectedType"
          >
            <v-icon start>mdi-arrow-left</v-icon>
            Voltar
          </v-btn>
          
          <v-btn
            variant="text"
            @click="goBack"
            v-if="preselectedType"
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
            <h4 class="text-h6 mb-3">{{ processData.title || selectedProcessType?.name }}</h4>
            
            <v-list density="comfortable">
              <v-list-item>
                <v-list-item-title>Tipo de Processo</v-list-item-title>
                <v-list-item-subtitle>{{ selectedProcessType?.name }}</v-list-item-subtitle>
              </v-list-item>
              
              <v-list-item v-if="processData.description">
                <v-list-item-title>Descrição</v-list-item-title>
                <v-list-item-subtitle>{{ processData.description }}</v-list-item-subtitle>
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
const currentStep = ref(1)

const processForm = ref(null)
const processData = ref({
  title: '',
  description: ''
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
  return selectedProcessType.value?.formFields?.length > 0
})

const totalSteps = computed(() => {
  return hasFormFields.value ? 2 : 1
})

const stepperItems = computed(() => {
  const items = ['Informações Básicas']
  if (hasFormFields.value) {
    items.push('Formulário Específico')
  }
  return items
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
      filled[key] = value
    }
  })
  return filled
})

// ✨ Métodos auxiliares
function getFieldCols(field) {
  switch (field.type) {
    case 'TEXTAREA':
      return 12
    case 'CHECKBOX':
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
      
      if (validations.minLength) {
        rules.push(v => !v || v.length >= validations.minLength || 
          validations.customMessage || `Mínimo ${validations.minLength} caracteres`)
      }
      
      if (validations.maxLength) {
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

function getEstimatedTime() {
  const stepCount = selectedProcessType.value?.steps?.length || 0
  const hasComplex = selectedProcessType.value?.steps?.some(s => 
    s.requiresSignature || s.type === 'APPROVAL' || s.allowAttachment
  )
  
  if (stepCount <= 2) return '5-10 min'
  if (stepCount <= 4) return hasComplex ? '30-60 min' : '15-30 min'
  return hasComplex ? '1-2 horas' : '30-60 min'
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

// ✨ Métodos principais
function goBack() {
  router.push('/processes')
}

function goBackStep() {
  selectedProcessTypeId.value = null
  formData.value = {}
  currentStep.value = 1
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
    currentStep.value = 2
  }
}

function initializeFormData(processType) {
  formData.value = {}
  
  if (processType?.formFields) {
    processType.formFields.forEach(field => {
      if (field.defaultValue) {
        formData.value[field.name] = field.defaultValue
      } else if (field.type === 'CHECKBOX') {
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
    const data = {
      processTypeId: selectedProcessType.value.id,
      title: processData.value.title?.trim() || null,
      description: processData.value.description?.trim() || null,
      formData: hasFormFields.value ? formData.value : undefined
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
}

.progress-indicator {
  text-align: right;
}

.stepper-card {
  border-radius: 12px;
  overflow: hidden;
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

/* ✨ Animações */
.v-stepper {
  background: transparent !important;
}

.v-card {
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.5, 1);
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
  
  .progress-indicator {
    text-align: left;
    width: 100%;
  }
}
</style>