<template>
  <v-card>
    <v-card-title>
      <v-icon start color="primary">mdi-form-textbox</v-icon>
      Entrada de Dados
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
        <div v-html="step.instructions"></div>
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
            />

            <!-- Campo de CPF -->
            <v-text-field
              v-else-if="field.type === 'CPF'"
              v-model="formData[field.name]"
              :label="getFieldLabel(field)"
              :placeholder="field.placeholder || '000.000.000-00'"
              v-mask="'###.###.###-##'"
              :required="isFieldRequired(field)"
              :rules="getFieldRules(field)"
              :hint="getFieldHint(field)"
              persistent-hint
            />

            <!-- Campo de CNPJ -->
            <v-text-field
              v-else-if="field.type === 'CNPJ'"
              v-model="formData[field.name]"
              :label="getFieldLabel(field)"
              :placeholder="field.placeholder || '00.000.000/0000-00'"
              v-mask="'##.###.###/####-##'"
              :required="isFieldRequired(field)"
              :rules="getFieldRules(field)"
              :hint="getFieldHint(field)"
              persistent-hint
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
            />

            <!-- Campo de Moeda -->
            <v-text-field
              v-else-if="field.type === 'CURRENCY'"
              v-model="formData[field.name]"
              :label="getFieldLabel(field)"
              :placeholder="field.placeholder"
              prefix="R$"
              type="number"
              step="0.01"
              :required="isFieldRequired(field)"
              :rules="getFieldRules(field)"
              :hint="getFieldHint(field)"
              persistent-hint
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
            />
          </v-col>
        </v-row>
      </v-form>
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
        :disabled="!formValid"
        @click="executeStep"
      >
        <v-icon start>mdi-check</v-icon>
        Concluir
      </v-btn>
    </v-card-actions>
  </v-card>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useProcessStore } from '@/stores/processes'

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
      rules.push(v => !v || /.+@.+\..+/.test(v) || 'E-mail inválido')
      break
    case 'CPF':
      rules.push(v => !v || /^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(v) || 'CPF inválido')
      break
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
      console.error('Error parsing validations:', e)
    }
  }

  return rules
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