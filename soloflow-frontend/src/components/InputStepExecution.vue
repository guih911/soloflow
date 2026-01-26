<template>
  <v-card class="step-execution-card">
    <!-- Header moderno -->
    <div class="step-card-header">
      <div class="header-icon">
        <v-icon size="24" color="white">mdi-form-textbox</v-icon>
      </div>
      <div class="header-content">
        <h3 class="header-title">Entrada de Dados</h3>
        <p class="header-subtitle">Preencha os campos abaixo para continuar</p>
      </div>
    </div>

    <!-- Instruções da etapa -->
    <div v-if="step.instructions" class="step-instructions">
      <div class="instructions-icon">
        <v-icon size="18" color="info">mdi-information-outline</v-icon>
      </div>
      <div class="instructions-content" v-html="step.instructions"></div>
    </div>

    <!-- Formulário dinâmico -->
    <v-form ref="inputForm" v-model="formValid" class="step-form">
      <div class="form-fields-container">
        <v-row>
          <v-col
            v-for="field in visibleFields"
            :key="field.name"
            :cols="getFieldCols(field).cols || 12"
            :md="getFieldCols(field).md || getFieldCols(field)"
          >
            <!-- Campo de Texto -->
            <v-text-field
              v-if="field.type === 'TEXT'"
              v-model="formData[field.name]"
              :label="getFieldLabel(field)"
              :placeholder="field.placeholder"
              :required="isFieldRequired(field)"
              :rules="getFieldRules(field)"
              :hint="getFieldHint(field)"
              persistent-hint
              variant="outlined"
              prepend-inner-icon="mdi-text"
              class="modern-field"
            />

            <!-- Campo Numérico -->
            <v-text-field
              v-else-if="field.type === 'NUMBER'"
              v-model.number="formData[field.name]"
              :label="getFieldLabel(field)"
              :placeholder="field.placeholder"
              type="number"
              :required="isFieldRequired(field)"
              :rules="getFieldRules(field)"
              :hint="getFieldHint(field)"
              persistent-hint
              variant="outlined"
              prepend-inner-icon="mdi-numeric"
              class="modern-field"
            />

            <!-- Campo de Data -->
            <v-text-field
              v-else-if="field.type === 'DATE'"
              v-model="formData[field.name]"
              :label="getFieldLabel(field)"
              type="date"
              :required="isFieldRequired(field)"
              :rules="getFieldRules(field)"
              :hint="getFieldHint(field)"
              persistent-hint
              variant="outlined"
              prepend-inner-icon="mdi-calendar"
              class="modern-field"
            />

            <!-- Campo de Email -->
            <v-text-field
              v-else-if="field.type === 'EMAIL'"
              v-model="formData[field.name]"
              :label="getFieldLabel(field)"
              :placeholder="field.placeholder || 'email@exemplo.com'"
              type="email"
              :required="isFieldRequired(field)"
              :rules="getFieldRules(field)"
              :hint="getFieldHint(field)"
              persistent-hint
              variant="outlined"
              prepend-inner-icon="mdi-email-outline"
              class="modern-field"
            />

            <!-- Campo de CPF -->
            <v-text-field
              v-else-if="field.type === 'CPF'"
              v-model="formData[field.name]"
              :label="getFieldLabel(field)"
              :placeholder="field.placeholder || '000.000.000-00'"
              v-mask="'###.###.###-##'"
              maxlength="14"
              :required="isFieldRequired(field)"
              :rules="getFieldRules(field)"
              :hint="getFieldHint(field)"
              persistent-hint
              variant="outlined"
              prepend-inner-icon="mdi-card-account-details-outline"
              class="modern-field"
            />

            <!-- Campo de CNPJ -->
            <v-text-field
              v-else-if="field.type === 'CNPJ'"
              v-model="formData[field.name]"
              :label="getFieldLabel(field)"
              :placeholder="field.placeholder || '00.000.000/0000-00'"
              v-mask="'##.###.###/####-##'"
              maxlength="18"
              :required="isFieldRequired(field)"
              :rules="getFieldRules(field)"
              :hint="getFieldHint(field)"
              persistent-hint
              variant="outlined"
              prepend-inner-icon="mdi-domain"
              class="modern-field"
            />

            <!-- Campo de Telefone -->
            <v-text-field
              v-else-if="field.type === 'PHONE'"
              v-model="formData[field.name]"
              :label="getFieldLabel(field)"
              :placeholder="field.placeholder || '(00) 00000-0000'"
              v-mask="['(##) ####-####', '(##) #####-####']"
              maxlength="15"
              :required="isFieldRequired(field)"
              :rules="getFieldRules(field)"
              :hint="getFieldHint(field)"
              persistent-hint
              variant="outlined"
              prepend-inner-icon="mdi-phone-outline"
              class="modern-field"
            />

            <!-- Campo de Moeda -->
            <v-text-field
              v-else-if="field.type === 'CURRENCY'"
              :model-value="formData[field.name]"
              @update:model-value="handleCurrencyInput(field.name, $event)"
              :label="getFieldLabel(field)"
              :placeholder="field.placeholder || 'R$ 0,00'"
              :required="isFieldRequired(field)"
              :rules="getFieldRules(field)"
              :hint="getFieldHint(field)"
              persistent-hint
              variant="outlined"
              prepend-inner-icon="mdi-currency-brl"
              class="modern-field"
            />

            <!-- Dropdown -->
            <v-select
              v-else-if="field.type === 'DROPDOWN'"
              v-model="formData[field.name]"
              :label="getFieldLabel(field)"
              :items="getFieldOptions(field)"
              :required="isFieldRequired(field)"
              :rules="getFieldRules(field)"
              :hint="getFieldHint(field)"
              persistent-hint
              variant="outlined"
              prepend-inner-icon="mdi-format-list-bulleted"
              class="modern-field"
            />

            <!-- Checkbox -->
            <div v-else-if="field.type === 'CHECKBOX'" class="checkbox-field-container">
              <label class="checkbox-field-label">
                {{ getFieldLabel(field) }}
                <span v-if="isFieldRequired(field)" class="required-mark">*</span>
              </label>
              <div class="checkbox-options">
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
                  class="checkbox-option"
                />
              </div>
              <p v-if="getFieldHint(field)" class="field-hint">
                {{ getFieldHint(field) }}
              </p>
            </div>

            <!-- Textarea -->
            <v-textarea
              v-else-if="field.type === 'TEXTAREA'"
              v-model="formData[field.name]"
              :label="getFieldLabel(field)"
              :placeholder="field.placeholder"
              rows="3"
              :required="isFieldRequired(field)"
              :rules="getFieldRules(field)"
              :hint="getFieldHint(field)"
              persistent-hint
              variant="outlined"
              prepend-inner-icon="mdi-text-long"
              class="modern-field"
            />
          </v-col>
        </v-row>
      </div>
    </v-form>

    <!-- Actions modernas -->
    <div class="step-actions">
      <v-btn
        variant="text"
        color="neutral"
        @click="$emit('cancel')"
        class="action-btn-cancel"
      >
        Cancelar
      </v-btn>
      <v-btn
        color="primary"
        variant="elevated"
        :loading="loading"
        :disabled="!formValid"
        @click="executeStep"
        class="action-btn-submit"
      >
        <v-icon start>mdi-check</v-icon>
        Concluir Etapa
      </v-btn>
    </div>
  </v-card>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useProcessStore } from '@/stores/processes'
import {
  formatCurrency,
  validateCPF, validateCNPJ, validateEmail, validateNumber, validatePhone
} from '@/utils/formatters'

const props = defineProps({
  stepExecution: {
    type: Object,
    required: true
  },
  step: {
    type: Object,
    required: true
  },
  process: {
    type: Object,
    required: true
  },
  formFields: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['success', 'error', 'cancel'])

const processStore = useProcessStore()

// Estado
const formValid = ref(false)
const loading = ref(false)
const formData = ref({})
const inputForm = ref(null)

// Parse das configurações da etapa
const stepConditions = computed(() => {
  if (!props.step.conditions) return {}
  
  try {
    return typeof props.step.conditions === 'string'
      ? JSON.parse(props.step.conditions)
      : props.step.conditions
  } catch (e) {
    return {}
  }
})

// Campos visíveis baseados na configuração
const visibleFields = computed(() => {
  const visibleFieldNames = stepConditions.value.visibleFields || []
  
  if (visibleFieldNames.length === 0) {
    // Se não há configuração, mostrar todos os campos
    return props.formFields
  }
  
  // Filtrar e ordenar campos baseado na configuração
  return visibleFieldNames
    .map(name => props.formFields.find(f => f.name === name))
    .filter(Boolean)
})

// Verificar se campo é obrigatório
function isFieldRequired(field) {
  const requiredFields = stepConditions.value.requiredFields || []
  return requiredFields.includes(field.name) || field.required
}

// Obter label do campo (com override se existir)
function getFieldLabel(field) {
  const override = stepConditions.value.overrides?.[field.name]
  return override?.label || field.label
}

// Obter hint do campo (com override se existir)
function getFieldHint(field) {
  const override = stepConditions.value.overrides?.[field.name]
  return override?.hint || field.helpText
}

// Obter colunas do campo
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

// Obter opções do campo
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

// Obter regras de validação do campo
function getFieldRules(field) {
  const rules = []
  const override = stepConditions.value.overrides?.[field.name]
  
  // Regra de obrigatoriedade
  if (isFieldRequired(field)) {
    rules.push(v => {
      if (field.type === 'CHECKBOX') {
        return (v && v.length > 0) || `${getFieldLabel(field)} é obrigatório`
      }
      return !!v || `${getFieldLabel(field)} é obrigatório`
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

  // Validações de override
  if (override) {
    if (override.regex) {
      rules.push(v => !v || new RegExp(override.regex).test(v) || 
        override.errorMessage || 'Formato inválido')
    }
    
    if (override.min !== undefined) {
      rules.push(v => !v || Number(v) >= override.min || 
        `Valor mínimo: ${override.min}`)
    }
    
    if (override.max !== undefined) {
      rules.push(v => !v || Number(v) <= override.max || 
        `Valor máximo: ${override.max}`)
    }
  }

  // Validações customizadas do campo original
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
      
      if (!override?.min && validations.min !== undefined) {
        rules.push(v => !v || Number(v) >= validations.min || 
          validations.customMessage || `Valor mínimo: ${validations.min}`)
      }
      
      if (!override?.max && validations.max !== undefined) {
        rules.push(v => !v || Number(v) <= validations.max || 
          validations.customMessage || `Valor máximo: ${validations.max}`)
      }
      
      if (!override?.regex && validations.pattern) {
        rules.push(v => !v || new RegExp(validations.pattern).test(v) || 
          validations.customMessage || 'Formato inválido')
      }
    } catch (e) {
    }
  }

  return rules
}

// Formatação de moeda (recebe valor diretamente do v-model update)
function handleCurrencyInput(fieldName, value) {
  if (!value) {
    formData.value[fieldName] = ''
    return
  }
  formData.value[fieldName] = formatCurrency(value)
}

// Pré-preencher dados
function prefillData() {
  const prefillFrom = stepConditions.value.prefillFrom || []
  
  prefillFrom.forEach(source => {
    if (source === 'formData' && props.process.formData) {
      // Preencher com dados do formulário do processo
      visibleFields.value.forEach(field => {
        if (props.process.formData[field.name] !== undefined) {
          formData.value[field.name] = props.process.formData[field.name]
        }
      })
    }
    // Adicionar outras fontes de prefill conforme necessário
  })
  
  // Definir valores padrão para campos vazios
  visibleFields.value.forEach(field => {
    if (formData.value[field.name] === undefined) {
      if (field.type === 'CHECKBOX') {
        formData.value[field.name] = []
      } else if (field.defaultValue) {
        formData.value[field.name] = field.defaultValue
      }
    }
  })
}

// Executar etapa
async function executeStep() {
  if (!formValid.value) return
  
  loading.value = true
  
  try {
    // Preparar apenas os dados dos campos visíveis
    const metadata = {}
    visibleFields.value.forEach(field => {
      if (formData.value[field.name] !== undefined) {
        metadata[field.name] = formData.value[field.name]
      }
    })
    
    await processStore.executeStep({
      stepExecutionId: props.stepExecution.id,
      action: 'concluir',
      metadata: metadata
    })
    
    window.showSnackbar?.('Etapa concluída com sucesso', 'success')
    emit('success')
  } catch (error) {
    window.showSnackbar?.(error.message || 'Erro ao executar etapa', 'error')
    emit('error', error)
  } finally {
    loading.value = false
  }
}

// Lifecycle
onMounted(() => {
  prefillData()
})
</script>

<style lang="scss" scoped>
.step-execution-card {
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid var(--color-neutral-200);
}

// Header moderno
.step-card-header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px 24px;
  background: linear-gradient(135deg, var(--color-primary-500), var(--color-primary-600));

  .header-icon {
    width: 48px;
    height: 48px;
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.2);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .header-content {
    flex: 1;
  }

  .header-title {
    font-size: 1.125rem;
    font-weight: 600;
    color: white;
    margin: 0;
    line-height: 1.3;
  }

  .header-subtitle {
    font-size: 0.875rem;
    color: rgba(255, 255, 255, 0.85);
    margin: 4px 0 0 0;
  }
}

// Instruções
.step-instructions {
  display: flex;
  gap: 12px;
  padding: 16px 24px;
  background: var(--color-info-50);
  border-bottom: 1px solid var(--color-info-100);

  .instructions-icon {
    flex-shrink: 0;
    margin-top: 2px;
  }

  .instructions-content {
    font-size: 0.875rem;
    color: var(--color-info-700);
    line-height: 1.5;

    :deep(p) {
      margin: 0;
    }

    :deep(ul), :deep(ol) {
      margin: 8px 0;
      padding-left: 20px;
    }
  }
}

// Formulário
.step-form {
  padding: 24px;
}

.form-fields-container {
  .modern-field {
    margin-bottom: 8px;
  }
}

// Checkbox customizado
.checkbox-field-container {
  padding: 16px;
  background: var(--color-neutral-50);
  border-radius: 12px;
  border: 1px solid var(--color-neutral-200);

  .checkbox-field-label {
    display: block;
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--color-neutral-700);
    margin-bottom: 12px;

    .required-mark {
      color: var(--color-error-500);
      margin-left: 4px;
    }
  }

  .checkbox-options {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .checkbox-option {
    flex: 0 0 auto;
    min-width: 150px;
  }

  .field-hint {
    font-size: 0.75rem;
    color: var(--color-neutral-500);
    margin-top: 8px;
    padding-left: 2px;
  }
}

// Ações
.step-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  background: var(--color-neutral-50);
  border-top: 1px solid var(--color-neutral-200);

  .action-btn-cancel {
    color: var(--color-neutral-600);
  }

  .action-btn-submit {
    min-width: 160px;
  }
}
</style>