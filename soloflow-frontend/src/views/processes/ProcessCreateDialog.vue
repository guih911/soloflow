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
            <div class="text-h6">Criar Novo Processo</div>
            <div v-if="selectedProcessType" class="text-caption text-medium-emphasis">
              {{ selectedProcessType.name }}
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

      <v-stepper 
        v-model="currentStep" 
        :items="stepperItems"
        class="elevation-0"
      >
        <!-- Step 1: Seleção do Tipo (se não foi pré-selecionado) -->
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

        <!-- Step 2: Informações Básicas -->
        <v-stepper-window-item :value="selectedProcessType ? 1 : 2">
          <v-card-text>
            <div v-if="selectedProcessType" class="mb-4">
              <v-alert type="info" variant="tonal">
                <div class="d-flex align-center">
                  <v-icon start>mdi-information</v-icon>
                  <div>
                    <strong>Tipo selecionado:</strong> {{ selectedProcessType.name }}<br>
                    <span class="text-caption">{{ selectedProcessType.description }}</span>
                  </div>
                </div>
              </v-alert>
            </div>

            <h3 class="text-h6 mb-4">Informações do processo</h3>
            
            <v-row>
              <v-col cols="12">
                <v-text-field
                  v-model="processData.title"
                  label="Título do processo"
                  hint="Deixe vazio para usar o nome do tipo de processo"
                  persistent-hint
                  :placeholder="getProcessType()?.name"
                />
              </v-col>
              <v-col cols="12">
                <v-textarea
                  v-model="processData.description"
                  label="Descrição"
                  rows="3"
                  counter="500"
                  :rules="[v => !v || v.length <= 500 || 'Máximo 500 caracteres']"
                />
              </v-col>
            </v-row>
          </v-card-text>

          <v-card-actions>
            <v-btn 
              v-if="!selectedProcessType" 
              variant="text" 
              @click="previousStep"
            >
              Voltar
            </v-btn>
            <v-spacer />
            <v-btn variant="text" @click="close">Cancelar</v-btn>
            <v-btn
              color="primary"
              @click="hasFormFields ? nextStep() : createProcess()"
              :loading="creating"
            >
              {{ hasFormFields ? 'Próximo' : 'Criar Processo' }}
            </v-btn>
          </v-card-actions>
        </v-stepper-window-item>

        <!-- Step 3: Formulário Dinâmico -->
        <v-stepper-window-item :value="selectedProcessType ? 2 : 3" v-if="hasFormFields">
          <v-card-text>
            <h3 class="text-h6 mb-4">Preencha os dados específicos</h3>
            
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
                  />

                  <!-- Checkbox -->
                  <div v-else-if="field.type === 'CHECKBOX'">
                    <p class="text-subtitle-2 mb-2">{{ field.label }}</p>
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
                  />
                </v-col>
              </v-row>
            </v-form>
          </v-card-text>

          <v-card-actions>
            <v-btn variant="text" @click="previousStep">Voltar</v-btn>
            <v-spacer />
            <v-btn variant="text" @click="close">Cancelar</v-btn>
            <v-btn
              color="primary"
              @click="createProcess"
              :loading="creating"
              :disabled="!formValid"
            >
              <v-icon start>mdi-check</v-icon>
              Criar Processo
            </v-btn>
          </v-card-actions>
        </v-stepper-window-item>
      </v-stepper>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useProcessStore } from '@/stores/processes'
import { useProcessTypeStore } from '@/stores/processTypes'

const props = defineProps({
  modelValue: Boolean,
  selectedProcessType: Object // Tipo de processo pré-selecionado
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

    console.log('Creating process with data:', data)

    const created = await processStore.createProcess(data)
    
    window.showSnackbar?.('Processo criado com sucesso!', 'success')
    
    emit('created', created)
    close()
  } catch (error) {
    console.error('Error creating process:', error)
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
    
    // Se há um tipo pré-selecionado
    if (props.selectedProcessType) {
      selectedProcessTypeId.value = props.selectedProcessType.id
      initializeFormData(props.selectedProcessType)
      currentStep.value = 1
    } else {
      currentStep.value = 1
    }
  }
})

watch(() => props.selectedProcessType, (newProcessType) => {
  if (newProcessType) {
    selectedProcessTypeId.value = newProcessType.id
    initializeFormData(newProcessType)
  }
})
</script>

<style scoped>
.v-stepper {
  box-shadow: none;
}
</style>