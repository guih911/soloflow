<template>
  <v-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    max-width="900"
    persistent
    scrollable
  >
    <v-card>
      <v-card-title class="d-flex align-center justify-space-between">
        <div class="d-flex align-center">
          <v-icon color="primary" class="mr-2">
            mdi-file-document-multiple-outline
          </v-icon>
          <div>
            <div class="text-h6">
              {{ selectedProcessType ? 'Criar Processo' : 'Criar Novo Processo' }}
            </div>
            <div v-if="selectedProcessType" class="text-caption text-success">
              ✓ Tipo: {{ selectedProcessType.name }}
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

      <!-- Indicador de tipo pré-selecionado -->
      <v-alert
        v-if="selectedProcessType"
        type="success"
        variant="tonal"
        class="ma-4 mb-0"
        density="compact"
      >
        <v-icon start>mdi-lightning-bolt</v-icon>
        <strong>Criação Rápida Ativada:</strong> 
        Tipo "{{ selectedProcessType.name }}" já selecionado
      </v-alert>

      <v-stepper 
        v-model="currentStep" 
        :items="stepperItems"
        class="elevation-0"
      >
        <!-- Step 1: Seleção do Tipo (apenas se não foi pré-selecionado) -->
        <v-stepper-window-item :value="1" v-if="!selectedProcessType">
          <v-card-text>
            <h3 class="text-h6 mb-4">Selecione o tipo de processo</h3>
            
            <v-text-field
              v-model="searchType"
              label="Buscar tipo de processo"
              prepend-inner-icon="mdi-magnify"
              clearable
              class="mb-4"
            />

            <v-list lines="two">
              <v-list-item
                v-for="processType in filteredProcessTypes"
                :key="processType.id"
                @click="selectProcessType(processType)"
                :active="selectedProcessTypeId === processType.id"
                class="rounded mb-2"
                border
              >
                <template v-slot:prepend>
                  <v-avatar color="primary" size="40">
                    <v-icon>mdi-file-document-multiple-outline</v-icon>
                  </v-avatar>
                </template>

                <v-list-item-title>{{ processType.name }}</v-list-item-title>
                <v-list-item-subtitle>
                  {{ processType.description }}
                  <div class="mt-1">
                    <v-chip size="x-small" class="mr-1">
                      {{ processType.steps?.length || 0 }} etapas
                    </v-chip>
                    <v-chip v-if="processType.formFields?.length > 0" size="x-small">
                      {{ processType.formFields.length }} campos
                    </v-chip>
                  </div>
                </v-list-item-subtitle>

                <template v-slot:append>
                  <v-radio
                    :model-value="selectedProcessTypeId"
                    :value="processType.id"
                    @click.stop="selectProcessType(processType)"
                  />
                </template>
              </v-list-item>
            </v-list>
          </v-card-text>

          <v-card-actions>
            <v-spacer />
            <v-btn variant="text" @click="close">Cancelar</v-btn>
            <v-btn
              color="primary"
              :disabled="!selectedProcessTypeId"
              @click="nextStep"
            >
              Próximo
            </v-btn>
          </v-card-actions>
        </v-stepper-window-item>

        <!-- Step 2: Informações Básicas (agora é o primeiro se tipo pré-selecionado) -->
        <v-stepper-window-item :value="selectedProcessType ? 1 : 2">
          <v-card-text>
            <!-- Resumo do tipo selecionado -->
            <div v-if="getProcessType()" class="mb-4">
              <v-card variant="outlined" color="primary">
                <v-card-text class="pa-3">
                  <div class="d-flex align-center">
                    <v-icon color="primary" class="mr-3">mdi-information</v-icon>
                    <div class="flex-grow-1">
                      <div class="text-subtitle-1 font-weight-medium">
                        {{ getProcessType().name }}
                      </div>
                      <div class="text-caption text-medium-emphasis">
                        {{ getProcessType().description }}
                      </div>
                      <div class="mt-1">
                        <v-chip size="x-small" class="mr-1" variant="tonal">
                          {{ getProcessType().steps?.length || 0 }} etapas
                        </v-chip>
                        <v-chip 
                          v-if="getProcessType().formFields?.length > 0" 
                          size="x-small" 
                          variant="tonal"
                        >
                          {{ getProcessType().formFields.length }} campos
                        </v-chip>
                      </div>
                    </div>
                    <v-btn
                      v-if="!selectedProcessType"
                      variant="text"
                      size="small"
                      @click="goBackToTypeSelection"
                    >
                      <v-icon start>mdi-pencil</v-icon>
                      Alterar
                    </v-btn>
                  </div>
                </v-card-text>
              </v-card>
            </div>

            <h3 class="text-h6 mb-4">Informações do processo</h3>
            
            <v-row>
              <v-col cols="12">
                <v-text-field
                  v-model="processData.title"
                  label="Título do processo"
                  :hint="`Deixe vazio para usar: ${getProcessType()?.name || 'nome padrão'}`"
                  persistent-hint
                  :placeholder="getProcessType()?.name"
                  variant="outlined"
                  class="mb-2"
                />
              </v-col>
              <v-col cols="12">
                <v-textarea
                  v-model="processData.description"
                  label="Descrição (opcional)"
                  rows="3"
                  counter="500"
                  :rules="[v => !v || v.length <= 500 || 'Máximo 500 caracteres']"
                  variant="outlined"
                  placeholder="Descreva o objetivo ou contexto deste processo..."
                />
              </v-col>
            </v-row>

            <!-- Preview do que vem a seguir -->
            <v-alert
              v-if="hasFormFields"
              type="info"
              variant="tonal"
              class="mt-3"
            >
              <v-icon start>mdi-information</v-icon>
              <strong>Próximo passo:</strong> Preencher {{ getProcessType()?.formFields?.length }} campos específicos
            </v-alert>
            <v-alert
              v-else
              type="success"
              variant="tonal"
              class="mt-3"
            >
              <v-icon start>mdi-check-circle</v-icon>
              <strong>Pronto para criar!</strong> Este processo não requer campos adicionais
            </v-alert>
          </v-card-text>

          <v-card-actions>
            <v-btn 
              v-if="!selectedProcessType" 
              variant="text" 
              @click="previousStep"
            >
              <v-icon start>mdi-arrow-left</v-icon>
              Voltar
            </v-btn>
            <v-spacer />
            <v-btn variant="text" @click="close">Cancelar</v-btn>
            <v-btn
              color="primary"
              @click="hasFormFields ? nextStep() : createProcess()"
              :loading="creating"
              variant="elevated"
            >
              <v-icon start>{{ hasFormFields ? 'mdi-arrow-right' : 'mdi-check' }}</v-icon>
              {{ hasFormFields ? 'Próximo' : 'Criar Processo' }}
            </v-btn>
          </v-card-actions>
        </v-stepper-window-item>

        <!-- Step 3: Formulário Dinâmico -->
        <v-stepper-window-item :value="selectedProcessType ? 2 : 3" v-if="hasFormFields">
          <v-card-text>
            <h3 class="text-h6 mb-4">
              Preencha os dados específicos
              <v-chip size="small" color="info" class="ml-2">
                {{ getProcessType()?.formFields?.length }} campos
              </v-chip>
            </h3>
            
            <v-form ref="dynamicForm" v-model="formValid">
              <v-row>
                <v-col
                  v-for="field in getProcessType()?.formFields"
                  :key="field.id"
                  :cols="getFieldCols(field)"
                >
                  <!-- Campo de Texto -->
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
                  />

                  <!-- Campo Numérico -->
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
                  />

                  <!-- Campo de Data -->
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
                  />

                  <!-- Campo de Email -->
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
                  />

                  <!-- Campo de CPF -->
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
                  />

                  <!-- Campo de CNPJ -->
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
                  />

                  <!-- Campo de Telefone -->
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
                  />

                  <!-- Campo de Moeda -->
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
                  />

                  <!-- Dropdown -->
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
                  />

                  <!-- Checkbox -->
                  <div v-else-if="field.type === 'CHECKBOX'">
                    <p class="text-subtitle-2 mb-2">{{ field.label }}</p>
                    <div class="border rounded pa-3">
                      <v-checkbox
                        v-for="option in getFieldOptions(field)"
                        :key="option.value"
                        v-model="formData[field.name]"
                        :label="option.label"
                        :value="option.value"
                        multiple
                        hide-details
                        density="compact"
                      />
                    </div>
                    <p v-if="field.helpText" class="text-caption text-grey mt-1">
                      {{ field.helpText }}
                    </p>
                  </div>

                  <!-- Textarea -->
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
                  />
                </v-col>
              </v-row>
            </v-form>
          </v-card-text>

          <v-card-actions>
            <v-btn variant="text" @click="previousStep">
              <v-icon start>mdi-arrow-left</v-icon>
              Voltar
            </v-btn>
            <v-spacer />
            <v-btn variant="text" @click="close">Cancelar</v-btn>
            <v-btn
              color="primary"
              @click="createProcess"
              :loading="creating"
              :disabled="!formValid"
              variant="elevated"
            >
              <v-icon start>mdi-rocket-launch</v-icon>
              Criar Processo
            </v-btn>
          </v-card-actions>
        </v-stepper-window-item>
      </v-stepper>

      <!-- Loading overlay -->
      <v-overlay
        :model-value="creating"
        contained
        class="align-center justify-center"
      >
        <div class="text-center">
          <v-progress-circular
            indeterminate
            size="64"
            color="primary"
          />
          <p class="text-h6 mt-4">Criando processo...</p>
          <p class="text-body-2 text-medium-emphasis">
            {{ selectedProcessType ? `Tipo: ${selectedProcessType.name}` : 'Aguarde...' }}
          </p>
        </div>
      </v-overlay>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useProcessStore } from '@/stores/processes'
import { useProcessTypeStore } from '@/stores/processTypes'

const props = defineProps({
  modelValue: Boolean,
  selectedProcessType: Object // ✅ Tipo de processo pré-selecionado
})

const emit = defineEmits(['update:modelValue', 'created', 'close'])

const processStore = useProcessStore()
const processTypeStore = useProcessTypeStore()

// Estado
const currentStep = ref(1)
const creating = ref(false)
const formValid = ref(true)
const searchType = ref('')
const selectedProcessTypeId = ref(null)

const dynamicForm = ref(null)
const processData = ref({
  title: '',
  description: ''
})
const formData = ref({})

// Computed
const processTypes = computed(() => processTypeStore.processTypes)

const filteredProcessTypes = computed(() => {
  if (!searchType.value) return processTypes.value.filter(pt => pt.isActive)
  
  const search = searchType.value.toLowerCase()
  return processTypes.value.filter(pt => 
    pt.isActive &&
    (pt.name.toLowerCase().includes(search) ||
    pt.description?.toLowerCase().includes(search))
  )
})

const stepperItems = computed(() => {
  const items = []
  
  if (!props.selectedProcessType) {
    items.push('Tipo de Processo')
  }
  
  items.push('Informações Básicas')
  
  if (hasFormFields.value) {
    items.push('Formulário')
  }
  
  return items
})

const hasFormFields = computed(() => {
  const processType = getProcessType()
  return processType?.formFields?.length > 0
})

// Métodos auxiliares
function getProcessType() {
  if (props.selectedProcessType) return props.selectedProcessType
  return processTypes.value.find(pt => pt.id === selectedProcessTypeId.value)
}

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
  
  // Regra de obrigatoriedade
  if (field.required) {
    rules.push(v => {
      if (field.type === 'CHECKBOX') {
        return (v && v.length > 0) || `${field.label} é obrigatório`
      }
      return !!v || `${field.label} é obrigatório`
    })
  }

  // Validações específicas por tipo
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

  // Validações customizadas
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

// Métodos de navegação
function nextStep() {
  currentStep.value++
}

function previousStep() {
  currentStep.value--
}

function goBackToTypeSelection() {
  currentStep.value = 1
}

// Métodos principais
function selectProcessType(processType) {
  selectedProcessTypeId.value = processType.id
  initializeFormData(processType)
}

function initializeFormData(processType) {
  formData.value = {}
  
  // Definir valores padrão dos campos
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
  if (hasFormFields.value && !formValid.value) {
    window.showSnackbar?.('Por favor, corrija os erros no formulário', 'error')
    return
  }

  creating.value = true
  try {
    const processType = getProcessType()
    
    if (!processType) {
      throw new Error('Tipo de processo não selecionado')
    }

    const data = {
      processTypeId: processType.id,
      title: processData.value.title?.trim() || null,
      description: processData.value.description?.trim() || null,
      formData: hasFormFields.value ? formData.value : undefined
    }

    console.log('✅ Creating process with FAST mode data:', data)

    const created = await processStore.createProcess(data)
    
    console.log('🚀 Process created successfully in FAST mode:', created.code)
    
    emit('created', created)
    close()
  } catch (error) {
    console.error('❌ Error creating process:', error)
    window.showSnackbar?.(error.message || 'Erro ao criar processo', 'error')
  } finally {
    creating.value = false
  }
}

function close() {
  emit('close')
  emit('update:modelValue', false)
  
  // Reset state
  currentStep.value = 1
  selectedProcessTypeId.value = null
  processData.value = { title: '', description: '' }
  formData.value = {}
  searchType.value = ''
}

// Watchers
watch(() => props.modelValue, (newVal) => {
  if (newVal) {
    // Carregar tipos de processo se necessário
    if (processTypes.value.length === 0) {
      processTypeStore.fetchProcessTypes()
    }
    
    // ✅ LÓGICA PRINCIPAL: Se há um tipo pré-selecionado
    if (props.selectedProcessType) {
      console.log('🎯 FAST mode activated with pre-selected type:', props.selectedProcessType.name)
      selectedProcessTypeId.value = props.selectedProcessType.id
      initializeFormData(props.selectedProcessType)
      currentStep.value = 1 // Começa na etapa de informações básicas
    } else {
      console.log('🔄 Standard mode - type selection required')
      currentStep.value = 1 // Começa na seleção de tipo
    }
  }
})

watch(() => props.selectedProcessType, (newProcessType) => {
  if (newProcessType) {
    console.log('🔄 Process type changed to:', newProcessType.name)
    selectedProcessTypeId.value = newProcessType.id
    initializeFormData(newProcessType)
  }
})
</script>

<style scoped>
.v-stepper {
  box-shadow: none;
}

.border {
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.rounded {
  border-radius: 4px;
}

.pa-3 {
  padding: 12px;
}

/* Animações suaves */
.v-stepper-window-item {
  transition: all 0.3s ease;
}

/* Melhorias visuais para campos */
.v-text-field,
.v-textarea,
.v-select {
  margin-bottom: 8px;
}
</style>