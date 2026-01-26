<template>
  <v-dialog
    v-model="dialog"
    max-width="800"
    persistent
    aria-labelledby="process-create-title"
  >
    <template v-slot:activator="{ props }">
      <v-btn
        v-bind="props"
        color="primary"
        prepend-icon="mdi-plus"
        aria-label="Criar novo processo"
      >
        Novo Processo
      </v-btn>
    </template>

    <v-card class="process-create-card" role="dialog" aria-modal="true">
      <!-- Modern Header -->
      <div class="dialog-header">
        <div class="header-icon" aria-hidden="true">
          <v-icon size="28" color="white">mdi-plus-circle</v-icon>
        </div>
        <div class="header-text">
          <h2 id="process-create-title" class="header-title">Novo Processo</h2>
          <p class="header-subtitle">Crie um novo processo em poucos passos</p>
        </div>
        <v-btn icon variant="text" class="close-btn" @click="close">
          <v-icon color="white">mdi-close</v-icon>
        </v-btn>
      </div>

      <!-- Progress Steps -->
      <div class="stepper-progress">
        <div
          v-for="(s, index) in stepsList"
          :key="index"
          class="progress-step"
          :class="{
            'progress-step--active': step === index + 1,
            'progress-step--completed': step > index + 1
          }"
        >
          <div class="step-indicator">
            <v-icon v-if="step > index + 1" size="16" color="white">mdi-check</v-icon>
            <span v-else>{{ index + 1 }}</span>
          </div>
          <span class="step-label">{{ s }}</span>
        </div>
      </div>

      <v-stepper v-model="step" class="modern-stepper" flat>
        <v-stepper-header class="d-none">
          <v-stepper-item :complete="step > 1" :value="1" title="Tipo" />
          <v-stepper-item :complete="step > 2" :value="2" title="Info" />
          <v-stepper-item v-if="hasFormFields" :value="3" title="Formulário" />
        </v-stepper-header>

        <v-stepper-window>
          <!-- Step 1: Selecionar Tipo de Processo -->
          <v-stepper-window-item :value="1">
            <div class="step-content">
              <v-text-field
                v-model="searchType"
                placeholder="Buscar tipo de processo..."
                prepend-inner-icon="mdi-magnify"
                variant="outlined"
                density="comfortable"
                clearable
                hide-details
                class="search-field mb-6"
                aria-label="Buscar tipo de processo"
              />

              <div class="process-types-list" role="listbox" aria-label="Tipos de processo disponíveis">
                <div
                  v-for="processType in filteredProcessTypes"
                  :key="processType.id"
                  class="process-type-card"
                  :class="{ 'process-type-card--selected': selectedProcessTypeId === processType.id }"
                  role="option"
                  :aria-selected="selectedProcessTypeId === processType.id"
                  tabindex="0"
                  @click="selectedProcessTypeId = processType.id"
                  @keydown.enter="selectedProcessTypeId = processType.id"
                  @keydown.space.prevent="selectedProcessTypeId = processType.id"
                >
                  <div class="type-card-radio">
                    <div class="radio-indicator">
                      <v-icon v-if="selectedProcessTypeId === processType.id" size="14" color="white">
                        mdi-check
                      </v-icon>
                    </div>
                  </div>
                  <div class="type-card-content">
                    <h4 class="type-card-title">{{ processType.name }}</h4>
                    <p v-if="processType.description" class="type-card-description">
                      {{ processType.description }}
                    </p>
                    <div class="type-card-meta">
                      <span class="meta-badge">
                        <v-icon size="14">mdi-debug-step-over</v-icon>
                        {{ processType.steps?.length || 0 }} etapas
                      </span>
                      <span v-if="processType.formFields?.length > 0" class="meta-badge">
                        <v-icon size="14">mdi-form-textbox</v-icon>
                        {{ processType.formFields.length }} campos
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div v-if="filteredProcessTypes.length === 0" class="empty-state">
                <v-icon size="48" color="grey-lighten-1">mdi-file-search-outline</v-icon>
                <p class="empty-text">Nenhum tipo de processo encontrado</p>
              </div>
            </div>

            <div class="step-actions">
              <v-btn variant="text" color="grey" @click="close">
                Cancelar
              </v-btn>
              <v-btn
                color="primary"
                variant="flat"
                :disabled="!selectedProcessTypeId"
                @click="nextStep"
                append-icon="mdi-arrow-right"
              >
                Próximo
              </v-btn>
            </div>
          </v-stepper-window-item>

          <!-- Step 2: Informações Básicas -->
          <v-stepper-window-item :value="2">
            <div class="step-content">
              <div class="form-section">
                <label class="form-label" id="title-label">Título do processo</label>
                <v-text-field
                  v-model="processData.title"
                  placeholder="Ex: Solicitação de compra de materiais"
                  variant="outlined"
                  density="comfortable"
                  hide-details="auto"
                  class="modern-field"
                  aria-labelledby="title-label"
                  aria-describedby="title-hint"
                />
                <span id="title-hint" class="field-hint">Deixe vazio para usar o título padrão do tipo de processo</span>
              </div>

              <div class="form-section">
                <label class="form-label" id="description-label">Descrição</label>
                <v-textarea
                  v-model="processData.description"
                  placeholder="Descreva brevemente o objetivo deste processo..."
                  variant="outlined"
                  rows="3"
                  hide-details
                  class="modern-field"
                  aria-labelledby="description-label"
                />
              </div>
            </div>

            <div class="step-actions">
              <v-btn variant="text" color="grey" prepend-icon="mdi-arrow-left" @click="step--">
                Voltar
              </v-btn>
              <v-btn
                color="primary"
                variant="flat"
                @click="hasFormFields ? nextStep() : createProcess()"
                :loading="creating"
                :append-icon="hasFormFields ? 'mdi-arrow-right' : 'mdi-check'"
              >
                {{ hasFormFields ? 'Próximo' : 'Criar Processo' }}
              </v-btn>
            </div>
          </v-stepper-window-item>

          <!-- Step 3: Formulário Dinâmico -->
          <v-stepper-window-item v-if="hasFormFields" :value="3">
            <div class="step-content">
              <v-form ref="dynamicForm" v-model="formValid">
                <v-row class="form-grid">
                  <v-col
                    v-for="field in selectedProcessType?.formFields"
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
                      @input="handleCPFInput(field.name, $event.target.value)"
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
                      @input="handleCNPJInput(field.name, $event.target.value)"
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
                      :placeholder="field.placeholder || 'R$ 0,00'"
                      @input="handleCurrencyInput(field.name, $event.target.value)"
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
            </div>

            <div class="step-actions">
              <v-btn variant="text" color="grey" prepend-icon="mdi-arrow-left" @click="step--">
                Voltar
              </v-btn>
              <v-btn
                color="primary"
                variant="flat"
                @click="createProcess"
                :loading="creating"
                :disabled="!formValid"
                prepend-icon="mdi-check"
              >
                Criar Processo
              </v-btn>
            </div>
          </v-stepper-window-item>
        </v-stepper-window>
      </v-stepper>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useProcessStore } from '@/stores/processes'
import { useProcessTypeStore } from '@/stores/processTypes'
import { 
  formatCPF, formatCNPJ, formatCurrency,
  validateCPF, validateCNPJ, validateEmail, validateNumber, validatePhone
} from '@/utils/formatters'

const router = useRouter()
const processStore = useProcessStore()
const processTypeStore = useProcessTypeStore()

// Estado
const dialog = ref(false)
const step = ref(1)
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

// Lista de steps para o indicador
const stepsList = computed(() => {
  const steps = ['Tipo de Processo', 'Informações']
  if (hasFormFields.value) steps.push('Formulário')
  return steps
})

const filteredProcessTypes = computed(() => {
  if (!searchType.value) return processTypes.value
  
  const search = searchType.value.toLowerCase()
  return processTypes.value.filter(pt => 
    pt.name.toLowerCase().includes(search) ||
    pt.description?.toLowerCase().includes(search)
  )
})

const selectedProcessType = computed(() => {
  return processTypes.value.find(pt => pt.id === selectedProcessTypeId.value)
})

const hasFormFields = computed(() => {
  return selectedProcessType.value?.formFields?.length > 0
})

// Watch
watch(selectedProcessTypeId, () => {
  // Resetar dados do formulário ao mudar tipo
  formData.value = {}
  
  // Definir valores padrão
  if (selectedProcessType.value?.formFields) {
    selectedProcessType.value.formFields.forEach(field => {
      if (field.defaultValue) {
        formData.value[field.name] = field.defaultValue
      } else if (field.type === 'CHECKBOX') {
        formData.value[field.name] = []
      }
    })
  }
})

// Métodos
function nextStep() {
  step.value++
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
    const options = JSON.parse(field.options || '[]')
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
      rules.push(v => validateEmail(v) || 'E-mail inválido')
      break
    case 'CPF':
      rules.push(v => validateCPF(v) || 'CPF inválido')
      break
    case 'CNPJ':
      rules.push(v => validateCNPJ(v) || 'CNPJ inválido')
      break
    case 'NUMBER':
      rules.push(v => !v || validateNumber(v) || 'Apenas números são permitidos')
      break
    case 'CURRENCY':
      rules.push(v => !v || /^R\$\s?[\d.,]+$/.test(v) || 'Valor monetário inválido')
      break
    case 'PHONE':
      rules.push(v => validatePhone(v) || 'Telefone inválido')
      break
    case 'DATE':
      rules.push(v => !v || !isNaN(Date.parse(v)) || 'Data inválida')
      break
  }

  // Validações customizadas
  if (field.validations) {
    try {
      const validations = JSON.parse(field.validations)
      
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
    }
  }

  return rules
}

// Métodos de formatação para campos
function handleCPFInput(fieldName, value) {
  formData.value[fieldName] = formatCPF(value)
}

function handleCNPJInput(fieldName, value) {
  formData.value[fieldName] = formatCNPJ(value)
}

function handleCurrencyInput(fieldName, value) {
  formData.value[fieldName] = formatCurrency(value)
}

async function createProcess() {
  if (hasFormFields.value && !formValid.value) return

  creating.value = true
  try {
    const data = {
      processTypeId: selectedProcessTypeId.value,
      title: processData.value.title,
      description: processData.value.description,
      formData: hasFormFields.value ? formData.value : undefined
    }

    const created = await processStore.createProcess(data)
    window.showSnackbar('Processo criado com sucesso!', 'success')
    
    close()
    
    // Ir para o processo criado
    router.push(`/processes/${created.id}`)
  } catch (error) {
    window.showSnackbar(error.message || 'Erro ao criar processo', 'error')
  } finally {
    creating.value = false
  }
}

function close() {
  dialog.value = false
  step.value = 1
  selectedProcessTypeId.value = null
  processData.value = {
    title: '',
    description: ''
  }
  formData.value = {}
  searchType.value = ''
}

// Carregar tipos de processo ao abrir
watch(dialog, (newVal) => {
  if (newVal) {
    processTypeStore.fetchProcessTypes()
  }
})
</script>

<style scoped>
.process-create-card {
  border-radius: 20px !important;
  overflow: hidden;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.15) !important;
}

/* Dialog Header */
.dialog-header {
  display: flex;
  align-items: center;
  gap: 16px;
  background: linear-gradient(135deg, var(--color-primary-500), var(--color-primary-600));
  padding: 24px;
  position: relative;
}

.header-icon {
  width: 56px;
  height: 56px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.header-text {
  flex: 1;
}

.header-title {
  font-size: 1.375rem;
  font-weight: 600;
  color: white;
  margin: 0;
}

.header-subtitle {
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.8);
  margin: 4px 0 0 0;
}

.close-btn {
  position: absolute;
  right: 16px;
  top: 16px;
}

/* Stepper Progress */
.stepper-progress {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 20px 24px;
  background: var(--color-neutral-50);
  border-bottom: 1px solid var(--color-neutral-200);
}

.progress-step {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: 20px;
  background: transparent;
  transition: all 0.2s ease;
}

.progress-step--active {
  background: var(--color-primary-50);
}

.progress-step--completed .step-indicator {
  background: var(--color-success-500);
}

.step-indicator {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--color-neutral-300);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 600;
  color: white;
  transition: all 0.2s ease;
}

.progress-step--active .step-indicator {
  background: var(--color-primary-500);
}

.step-label {
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--color-neutral-500);
}

.progress-step--active .step-label {
  color: var(--color-primary-600);
}

.progress-step--completed .step-label {
  color: var(--color-success-600);
}

/* Modern Stepper */
.modern-stepper {
  background: transparent !important;
}

.modern-stepper :deep(.v-stepper-header) {
  display: none !important;
}

.modern-stepper :deep(.v-stepper-window) {
  margin: 0;
}

/* Step Content */
.step-content {
  padding: 24px;
  min-height: 300px;
}

/* Search Field */
.search-field :deep(.v-field) {
  border-radius: 12px;
  background: var(--color-neutral-50);
}

/* Process Types List */
.process-types-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 400px;
  overflow-y: auto;
  padding-right: 8px;
}

.process-type-card {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 16px;
  border: 2px solid var(--color-neutral-200);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  background: white;
}

.process-type-card:hover {
  border-color: var(--color-primary-300);
  background: var(--color-primary-50);
}

.process-type-card--selected {
  border-color: var(--color-primary-500);
  background: var(--color-primary-50);
}

.process-type-card:focus {
  outline: 2px solid var(--color-primary-300);
  outline-offset: 2px;
}

.process-type-card:focus-visible {
  outline: 2px solid var(--color-primary-400);
  outline-offset: 2px;
}

.type-card-radio {
  flex-shrink: 0;
  padding-top: 2px;
}

.radio-indicator {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 2px solid var(--color-neutral-300);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.process-type-card--selected .radio-indicator {
  background: var(--color-primary-500);
  border-color: var(--color-primary-500);
}

.type-card-content {
  flex: 1;
  min-width: 0;
}

.type-card-title {
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--color-neutral-800);
  margin: 0 0 4px 0;
}

.type-card-description {
  font-size: 0.8125rem;
  color: var(--color-neutral-500);
  margin: 0 0 8px 0;
  line-height: 1.4;
}

.type-card-meta {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.meta-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: var(--color-neutral-100);
  border-radius: 6px;
  font-size: 0.75rem;
  color: var(--color-neutral-600);
}

.process-type-card--selected .meta-badge {
  background: var(--color-primary-100);
  color: var(--color-primary-700);
}

/* Form Section */
.form-section {
  margin-bottom: 24px;
}

.form-label {
  display: block;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-neutral-700);
  margin-bottom: 8px;
}

.field-hint {
  display: block;
  font-size: 0.75rem;
  color: var(--color-neutral-500);
  margin-top: 6px;
}

.modern-field :deep(.v-field) {
  border-radius: 10px;
}

.form-grid {
  gap: 16px;
}

/* Empty State */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  text-align: center;
}

.empty-text {
  font-size: 0.9375rem;
  color: var(--color-neutral-500);
  margin-top: 12px;
}

/* Step Actions */
.step-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  background: var(--color-neutral-50);
  border-top: 1px solid var(--color-neutral-200);
}

.step-actions :deep(.v-btn) {
  text-transform: none;
  font-weight: 500;
  border-radius: 10px;
}

/* Custom Scrollbar */
.process-types-list::-webkit-scrollbar {
  width: 6px;
}

.process-types-list::-webkit-scrollbar-track {
  background: transparent;
}

.process-types-list::-webkit-scrollbar-thumb {
  background: var(--color-neutral-300);
  border-radius: 3px;
}

.process-types-list::-webkit-scrollbar-thumb:hover {
  background: var(--color-neutral-400);
}

/* Responsive */
@media (max-width: 600px) {
  .dialog-header {
    padding: 20px;
  }

  .header-icon {
    width: 48px;
    height: 48px;
  }

  .stepper-progress {
    flex-wrap: wrap;
    gap: 4px;
    padding: 16px;
  }

  .progress-step {
    padding: 6px 12px;
  }

  .step-label {
    display: none;
  }

  .step-content {
    padding: 16px;
  }
}
</style>