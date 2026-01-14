<template>
  <v-card>
    <v-card-title class="d-flex align-center">
      <v-icon start color="primary">mdi-form-textbox</v-icon>
      {{ step.name }}
    </v-card-title>
    
    <v-divider />
    
    <v-card-text>
      <!-- Instruções da etapa -->
      <v-alert
        v-if="step.instructions"
        type="info"
        variant="tonal"
        class="mb-4"
      >
        {{ step.instructions }}
      </v-alert>

      <!-- SLA/Prazo -->
      <v-alert
        v-if="stepExecution.dueAt"
        :type="isOverdue ? 'warning' : 'info'"
        variant="tonal"
        density="compact"
        class="mb-4"
      >
        <v-icon start>mdi-clock-outline</v-icon>
        Prazo: {{ formatDueDate(stepExecution.dueAt) }}
        <span v-if="!isOverdue" class="ml-2">
          ({{ remainingTime }})
        </span>
      </v-alert>

      <!-- Formulário dinâmico -->
      <v-form ref="inputForm" v-model="formValid">
        <v-row>
          <v-col
            v-for="field in visibleFields"
            :key="field.name"
            :cols="getFieldCols(field)"
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
            />

            <!-- Campo de CPF -->
            <v-text-field
              v-else-if="field.type === 'CPF'"
              v-model="formData[field.name]"
              :label="getFieldLabel(field)"
              :placeholder="field.placeholder || '000.000.000-00'"
              @input="handleCPFInput(field.name, $event.target.value)"
              :required="isFieldRequired(field)"
              :rules="getFieldRules(field)"
              :hint="getFieldHint(field)"
              persistent-hint
              variant="outlined"
            />

            <!-- Campo de CNPJ -->
            <v-text-field
              v-else-if="field.type === 'CNPJ'"
              v-model="formData[field.name]"
              :label="getFieldLabel(field)"
              :placeholder="field.placeholder || '00.000.000/0000-00'"
              @input="handleCNPJInput(field.name, $event.target.value)"
              :required="isFieldRequired(field)"
              :rules="getFieldRules(field)"
              :hint="getFieldHint(field)"
              persistent-hint
              variant="outlined"
            />

            <!-- Campo de Telefone -->
            <v-text-field
              v-else-if="field.type === 'PHONE'"
              v-model="formData[field.name]"
              :label="getFieldLabel(field)"
              :placeholder="field.placeholder || '(00) 00000-0000'"
              v-mask="['(##) ####-####', '(##) #####-####']"
              :required="isFieldRequired(field)"
              :rules="getFieldRules(field)"
              :hint="getFieldHint(field)"
              persistent-hint
              variant="outlined"
            />

            <!-- Campo de Moeda -->
            <v-text-field
              v-else-if="field.type === 'CURRENCY'"
              v-model="formData[field.name]"
              :label="getFieldLabel(field)"
              :placeholder="field.placeholder || 'R$ 0,00'"
              @input="handleCurrencyInput(field.name, $event.target.value)"
              :required="isFieldRequired(field)"
              :rules="getFieldRules(field)"
              :hint="getFieldHint(field)"
              persistent-hint
              variant="outlined"
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
            />

            <!-- Checkbox -->
            <div v-else-if="field.type === 'CHECKBOX'">
              <p class="text-subtitle-2 mb-2">
                {{ getFieldLabel(field) }}
                <span v-if="isFieldRequired(field)" class="text-error">*</span>
              </p>
              <v-checkbox
                v-for="option in getFieldOptions(field)"
                :key="option.value"
                v-model="formData[field.name]"
                :label="option.label"
                :value="option.value"
                multiple
                hide-details
              />
              <p v-if="getFieldHint(field)" class="text-caption text-grey mt-1">
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
            />
          </v-col>
        </v-row>
      </v-form>

      <!-- Área de anexos se permitido -->
      <div v-if="step.allowAttachment" class="mt-4">
        <v-divider class="mb-4" />
        <h4 class="text-subtitle-1 mb-2">
          Anexos
          <span v-if="step.requireAttachment" class="text-error">*</span>
        </h4>
        <FileUploadField
          v-model="attachments"
          :required="step.requireAttachment"
          :max-files="step.maxAttachments"
          :allowed-types="step.allowedFileTypes"
          label=""
          upload-title="Clique ou arraste arquivos aqui"
          upload-description="Adicione documentos relacionados a esta etapa"
        />
      </div>
    </v-card-text>

    <v-divider />

    <v-card-actions>
      <v-spacer />
      <v-btn
        variant="text"
        @click="$emit('cancel')"
      >
        Cancelar
      </v-btn>
      <v-btn
        color="primary"
        variant="elevated"
        :loading="loading"
        :disabled="!formValid || (step.requireAttachment && attachments.length === 0)"
        @click="executeStep"
      >
        <v-icon start>mdi-check</v-icon>
        Concluir Etapa
      </v-btn>
    </v-card-actions>
  </v-card>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useProcessStore } from '@/stores/processes'
import FileUploadField from './FileUploadField.vue'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { 
  formatCPF, formatCNPJ, formatCurrency,
  validateCPF, validateCNPJ, validateEmail, validateNumber, validatePhone
} from '@/utils/formatters'
import 'dayjs/locale/pt-br'

dayjs.extend(relativeTime)
dayjs.locale('pt-br')

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
const attachments = ref([])
const inputForm = ref(null)

// Parse das configurações da etapa
const stepConditions = computed(() => {
  if (!props.step.conditions) return {}
  
  try {
    return typeof props.step.conditions === 'string'
      ? JSON.parse(props.step.conditions)
      : props.step.conditions
  } catch (e) {
    console.error('Error parsing step conditions:', e)
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

// Verificações de prazo
const isOverdue = computed(() => {
  if (!props.stepExecution.dueAt) return false
  return dayjs().isAfter(dayjs(props.stepExecution.dueAt))
})

const remainingTime = computed(() => {
  if (!props.stepExecution.dueAt) return ''
  return dayjs(props.stepExecution.dueAt).fromNow()
})

// Funções auxiliares
function formatDueDate(date) {
  return dayjs(date).format('DD/MM/YYYY HH:mm')
}

function isFieldRequired(field) {
  const requiredFields = stepConditions.value.requiredFields || []
  return requiredFields.includes(field.name) || field.required
}

function getFieldLabel(field) {
  const override = stepConditions.value.overrides?.[field.name]
  const label = override?.label || field.label
  return isFieldRequired(field) ? `${label} *` : label
}

function getFieldHint(field) {
  const override = stepConditions.value.overrides?.[field.name]
  return override?.hint || field.helpText
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
    const options = typeof field.options === 'string' 
      ? JSON.parse(field.options) 
      : field.options || []
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
  const override = stepConditions.value.overrides?.[field.name]
  
  // Regra de obrigatoriedade
  if (isFieldRequired(field)) {
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
    case 'CNPJ':
      rules.push(v => !v || /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/.test(v) || 'CNPJ inválido')
      break
  }

  // Validações de override
  if (override) {
    if (override.regex) {
      rules.push(v => !v || new RegExp(override.regex).test(v) || 
        override.errorMessage || 'Formato inválido')
    }
    
    if (override.min !== undefined && override.min !== null) {
      rules.push(v => !v || Number(v) >= override.min || 
        `Valor mínimo: ${override.min}`)
    }
    
    if (override.max !== undefined && override.max !== null) {
      rules.push(v => !v || Number(v) <= override.max || 
        `Valor máximo: ${override.max}`)
    }
  }

  // Validações customizadas do campo original
  if (field.validations) {
    try {
      const validations = typeof field.validations === 'string'
        ? JSON.parse(field.validations)
        : field.validations
      
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
      console.error('Error parsing validations:', e)
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
  const valid = await inputForm.value?.validate()
  if (!valid?.valid) return
  
  loading.value = true
  
  try {
    // Upload de anexos se houver
    if (attachments.value.length > 0) {
      for (const file of attachments.value) {
        await processStore.uploadAttachment(file.file || file, props.stepExecution.id)
      }
    }
    
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
    console.error('Error executing step:', error)
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

<style scoped>
.v-card-title {
  font-weight: 500;
}
</style>