<template>
  <div class="condition-builder">
    <div v-if="conditions.length === 0" class="empty-state">
      <v-alert type="info" variant="tonal">
        <v-icon start>mdi-information</v-icon>
        <div>
          <div class="font-weight-medium">Nenhuma condição configurada</div>
          <div class="mt-1">Adicione condições para controlar quando esta regra deve ser aplicada.</div>
        </div>
      </v-alert>
    </div>

    <div v-else class="conditions-list">
      <div 
        v-for="(condition, index) in conditions" 
        :key="condition.tempId || index"
        class="condition-item"
      >
        <v-card variant="outlined" class="mb-3">
          <v-card-text class="pa-4">
            <!-- Cabeçalho da condição -->
            <div class="d-flex align-center justify-space-between mb-3">
              <v-chip 
                size="small" 
                :color="getConditionTypeColor(condition.type)"
                variant="tonal"
              >
                {{ getConditionTypeText(condition.type) }}
              </v-chip>
              
              <div class="d-flex align-center gap-2">
                <!-- Operador lógico entre condições -->
                <v-select
                  v-if="index > 0"
                  v-model="condition.logicalOperator"
                  :items="[
                    { title: 'E (AND)', value: 'AND' },
                    { title: 'OU (OR)', value: 'OR' }
                  ]"
                  density="compact"
                  variant="outlined"
                  style="width: 100px"
                  hide-details
                />
                
                <v-btn
                  icon="mdi-pencil"
                  variant="text"
                  size="small"
                  @click="editCondition(index)"
                />
                <v-btn
                  icon="mdi-delete"
                  variant="text"
                  size="small"
                  color="error"
                  @click="removeCondition(index)"
                />
              </div>
            </div>

            <!-- Preview da condição -->
            <div class="condition-preview">
              <div class="d-flex align-center flex-wrap gap-2">
                <v-chip size="small" variant="outlined">
                  {{ getFieldLabel(condition.field) }}
                </v-chip>
                <v-icon size="16">mdi-arrow-right</v-icon>
                <v-chip size="small" variant="outlined">
                  {{ getOperatorText(condition.operator) }}
                </v-chip>
                <v-icon size="16">mdi-arrow-right</v-icon>
                <v-chip size="small" variant="outlined" color="primary">
                  {{ getValuePreview(condition) }}
                </v-chip>
              </div>
            </div>
          </v-card-text>
        </v-card>
      </div>
    </div>

    <!-- Botões de ação -->
    <div class="actions-section">
      <v-btn
        color="primary"
        variant="elevated"
        @click="openConditionDialog()"
        prepend-icon="mdi-plus"
      >
        Adicionar Condição
      </v-btn>
      
      <v-menu v-if="conditions.length > 1">
        <template #activator="{ props }">
          <v-btn
            v-bind="props"
            variant="outlined"
            append-icon="mdi-chevron-down"
            class="ml-2"
          >
            Operações
          </v-btn>
        </template>
        
        <v-list>
          <v-list-item @click="groupConditions('AND')">
            <v-list-item-title>Agrupar com E (AND)</v-list-item-title>
          </v-list-item>
          <v-list-item @click="groupConditions('OR')">
            <v-list-item-title>Agrupar com OU (OR)</v-list-item-title>
          </v-list-item>
          <v-divider />
          <v-list-item @click="clearAllConditions">
            <v-list-item-title class="text-error">Limpar Todas</v-list-item-title>
          </v-list-item>
        </v-list>
      </v-menu>
    </div>

    <!-- Dialog de configuração -->
    <v-dialog v-model="conditionDialog" max-width="600" persistent>
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon start color="primary">mdi-filter-cog</v-icon>
          {{ editingIndex !== null ? 'Editar' : 'Nova' }} Condição
        </v-card-title>
        
        <v-divider />

        <v-form ref="conditionForm" v-model="conditionValid">
          <v-card-text>
            <v-row>
              <!-- Campo -->
              <v-col cols="12">
                <v-select
                  v-model="conditionData.field"
                  :items="fieldOptions"
                  label="Campo"
                  :rules="[v => !!v || 'Selecione um campo']"
                  @update:model-value="onFieldChange"
                >
                  <template #item="{ props, item }">
                    <v-list-item v-bind="props">
                      <template #prepend>
                        <v-icon :color="getFieldTypeColor(item.raw.type)">
                          {{ getFieldTypeIcon(item.raw.type) }}
                        </v-icon>
                      </template>
                      <v-list-item-title>{{ item.title }}</v-list-item-title>
                      <v-list-item-subtitle>{{ item.raw.type }} - {{ item.raw.description }}</v-list-item-subtitle>
                    </v-list-item>
                  </template>
                </v-select>
              </v-col>

              <!-- Operador -->
              <v-col cols="12" md="6">
                <v-select
                  v-model="conditionData.operator"
                  :items="availableOperators"
                  label="Operador"
                  :rules="[v => !!v || 'Selecione um operador']"
                >
                  <template #item="{ props, item }">
                    <v-list-item v-bind="props">
                      <v-list-item-title>{{ item.title }}</v-list-item-title>
                      <v-list-item-subtitle>{{ item.description }}</v-list-item-subtitle>
                    </v-list-item>
                  </template>
                </v-select>
              </v-col>

              <!-- Tipo de valor -->
              <v-col cols="12" md="6">
                <v-select
                  v-model="conditionData.valueType"
                  :items="valueTypeOptions"
                  label="Tipo de Valor"
                  @update:model-value="onValueTypeChange"
                >
                  <template #item="{ props, item }">
                    <v-list-item v-bind="props">
                      <template #prepend>
                        <v-icon>{{ item.icon }}</v-icon>
                      </template>
                      <v-list-item-title>{{ item.title }}</v-list-item-title>
                      <v-list-item-subtitle>{{ item.description }}</v-list-item-subtitle>
                    </v-list-item>
                  </template>
                </v-select>
              </v-col>

              <!-- Valor -->
              <v-col cols="12">
                <!-- Valor fixo -->
                <div v-if="conditionData.valueType === 'fixed'">
                  <!-- Texto -->
                  <v-text-field
                    v-if="selectedFieldType === 'TEXT' || selectedFieldType === 'EMAIL' || selectedFieldType === 'CPF' || selectedFieldType === 'CNPJ'"
                    v-model="conditionData.value"
                    label="Valor"
                    :rules="[v => v !== null && v !== undefined && v !== '' || 'Valor é obrigatório']"
                  />
                  
                  <!-- Número -->
                  <v-text-field
                    v-else-if="selectedFieldType === 'NUMBER' || selectedFieldType === 'CURRENCY'"
                    v-model.number="conditionData.value"
                    label="Valor"
                    type="number"
                    :rules="[v => v !== null && v !== undefined && v !== '' || 'Valor é obrigatório']"
                  />
                  
                  <!-- Data -->
                  <v-text-field
                    v-else-if="selectedFieldType === 'DATE'"
                    v-model="conditionData.value"
                    label="Valor"
                    type="date"
                    :rules="[v => !!v || 'Data é obrigatória']"
                  />
                  
                  <!-- Dropdown -->
                  <v-select
                    v-else-if="selectedFieldType === 'DROPDOWN'"
                    v-model="conditionData.value"
                    :items="getFieldOptions(conditionData.field)"
                    label="Valor"
                    :rules="[v => !!v || 'Selecione um valor']"
                  />
                  
                  <!-- Checkbox (múltiplos valores) -->
                  <v-select
                    v-else-if="selectedFieldType === 'CHECKBOX'"
                    v-model="conditionData.value"
                    :items="getFieldOptions(conditionData.field)"
                    label="Valores"
                    multiple
                    chips
                    :rules="[v => v && v.length > 0 || 'Selecione pelo menos um valor']"
                  />
                  
                  <!-- Padrão: texto -->
                  <v-text-field
                    v-else
                    v-model="conditionData.value"
                    label="Valor"
                    :rules="[v => v !== null && v !== undefined && v !== '' || 'Valor é obrigatório']"
                  />
                </div>

                <!-- Campo do formulário -->
                <v-select
                  v-else-if="conditionData.valueType === 'field'"
                  v-model="conditionData.compareField"
                  :items="fieldOptions"
                  label="Campo para Comparação"
                  :rules="[v => !!v || 'Selecione um campo']"
                >
                  <template #item="{ props, item }">
                    <v-list-item v-bind="props">
                      <template #prepend>
                        <v-icon :color="getFieldTypeColor(item.raw.type)">
                          {{ getFieldTypeIcon(item.raw.type) }}
                        </v-icon>
                      </template>
                      <v-list-item-title>{{ item.title }}</v-list-item-title>
                    </v-list-item>
                  </template>
                </v-select>

                <!-- Fórmula -->
                <div v-else-if="conditionData.valueType === 'formula'">
                  <v-text-field
                    v-model="conditionData.formula"
                    label="Fórmula"
                    placeholder="valor_total * 1.1"
                    :rules="[v => !!v || 'Fórmula é obrigatória']"
                    hint="Use nomes de campos e operações matemáticas básicas"
                    persistent-hint
                  />
                </div>

                <!-- Data atual -->
                <v-alert
                  v-else-if="conditionData.valueType === 'current_date'"
                  type="info"
                  variant="tonal"
                >
                  <v-icon start>mdi-calendar-today</v-icon>
                  Será comparado com a data/hora atual no momento da execução
                </v-alert>

                <!-- Usuário atual -->
                <v-alert
                  v-else-if="conditionData.valueType === 'current_user'"
                  type="info"
                  variant="tonal"
                >
                  <v-icon start>mdi-account</v-icon>
                  Será comparado com o usuário que está executando a etapa
                </v-alert>
              </v-col>

              <!-- Configurações avançadas -->
              <v-col cols="12">
                <v-expansion-panels variant="accordion">
                  <v-expansion-panel title="Configurações Avançadas">
                    <v-expansion-panel-text>
                      <v-row>
                        <v-col cols="12" md="6">
                          <v-switch
                            v-model="conditionData.caseSensitive"
                            label="Sensível a maiúsculas/minúsculas"
                            color="primary"
                            :disabled="!isTextOperation"
                          />
                        </v-col>
                        
                        <v-col cols="12" md="6">
                          <v-switch
                            v-model="conditionData.negate"
                            label="Negar condição (NÃO)"
                            color="primary"
                          />
                        </v-col>
                        
                        <v-col cols="12">
                          <v-text-field
                            v-model="conditionData.errorMessage"
                            label="Mensagem de Erro Personalizada"
                            placeholder="Esta condição não foi atendida"
                            hint="Mensagem exibida quando a condição falha"
                            persistent-hint
                          />
                        </v-col>
                      </v-row>
                    </v-expansion-panel-text>
                  </v-expansion-panel>
                </v-expansion-panels>
              </v-col>
            </v-row>
          </v-card-text>

          <v-divider />

          <v-card-actions>
            <v-btn
              variant="text"
              color="info"
              @click="testCondition"
              :disabled="!conditionValid"
            >
              <v-icon start>mdi-play</v-icon>
              Testar
            </v-btn>
            
            <v-spacer />
            
            <v-btn variant="text" @click="closeConditionDialog">
              Cancelar
            </v-btn>
            <v-btn
              color="primary"
              variant="elevated"
              :disabled="!conditionValid"
              @click="saveCondition"
            >
              {{ editingIndex !== null ? 'Salvar' : 'Adicionar' }}
            </v-btn>
          </v-card-actions>
        </v-form>
      </v-card>
    </v-dialog>

    <!-- Dialog de teste -->
    <v-dialog v-model="testDialog" max-width="500">
      <v-card>
        <v-card-title>
          <v-icon start color="info">mdi-play-circle</v-icon>
          Testar Condição
        </v-card-title>
        
        <v-divider />
        
        <v-card-text>
          <v-text-field
            v-model="testValue"
            :label="`Valor de teste para '${getFieldLabel(conditionData.field)}'`"
            :type="getTestInputType()"
          />
          
          <v-btn
            color="primary"
            variant="elevated"
            @click="runConditionTest"
            block
            class="mt-3"
          >
            Executar Teste
          </v-btn>
          
          <v-alert
            v-if="testResult !== null"
            :type="testResult ? 'success' : 'error'"
            variant="tonal"
            class="mt-3"
          >
            <v-icon start>{{ testResult ? 'mdi-check-circle' : 'mdi-close-circle' }}</v-icon>
            <div class="font-weight-medium">
              {{ testResult ? 'Condição ATENDIDA' : 'Condição NÃO ATENDIDA' }}
            </div>
            <div class="mt-1">
              {{ getTestResultMessage() }}
            </div>
          </v-alert>
        </v-card-text>
        
        <v-divider />
        
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="testDialog = false">Fechar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'

const props = defineProps({
  modelValue: {
    type: Array,
    default: () => []
  },
  availableFields: {
    type: Array,
    default: () => []
  },
  allowMultiple: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['update:modelValue'])

// Estado
const conditionDialog = ref(false)
const conditionValid = ref(false)
const editingIndex = ref(null)
const conditions = ref([...props.modelValue])
const conditionForm = ref(null)
const testDialog = ref(false)
const testValue = ref('')
const testResult = ref(null)

// Dados da condição
const conditionData = ref({
  field: '',
  operator: '',
  value: '',
  valueType: 'fixed',
  compareField: '',
  formula: '',
  caseSensitive: false,
  negate: false,
  errorMessage: '',
  type: 'simple',
  logicalOperator: 'AND'
})

// Opções de campos
const fieldOptions = computed(() => {
  return props.availableFields.map(field => ({
    title: field.label || field.name,
    value: field.name,
    ...field
  }))
})

// Campo selecionado
const selectedField = computed(() => {
  return props.availableFields.find(f => f.name === conditionData.value.field)
})

const selectedFieldType = computed(() => {
  return selectedField.value?.type || 'TEXT'
})

// Operadores disponíveis baseados no tipo do campo
const availableOperators = computed(() => {
  const fieldType = selectedFieldType.value
  const baseOperators = [
    {
      title: 'É igual a',
      value: 'equals',
      description: 'Valor exatamente igual'
    },
    {
      title: 'É diferente de',
      value: 'not_equals',
      description: 'Valor diferente'
    }
  ]

  if (['TEXT', 'EMAIL', 'CPF', 'CNPJ', 'TEXTAREA'].includes(fieldType)) {
    return [
      ...baseOperators,
      {
        title: 'Contém',
        value: 'contains',
        description: 'Texto contém o valor'
      },
      {
        title: 'Não contém',
        value: 'not_contains',
        description: 'Texto não contém o valor'
      },
      {
        title: 'Começa com',
        value: 'starts_with',
        description: 'Texto inicia com o valor'
      },
      {
        title: 'Termina com',
        value: 'ends_with',
        description: 'Texto termina com o valor'
      },
      {
        title: 'Está vazio',
        value: 'is_empty',
        description: 'Campo vazio ou nulo'
      },
      {
        title: 'Não está vazio',
        value: 'is_not_empty',
        description: 'Campo preenchido'
      }
    ]
  }

  if (['NUMBER', 'CURRENCY'].includes(fieldType)) {
    return [
      ...baseOperators,
      {
        title: 'Maior que',
        value: 'greater_than',
        description: 'Valor numérico maior'
      },
      {
        title: 'Menor que',
        value: 'less_than',
        description: 'Valor numérico menor'
      },
      {
        title: 'Maior ou igual',
        value: 'greater_or_equal',
        description: 'Valor maior ou igual'
      },
      {
        title: 'Menor ou igual',
        value: 'less_or_equal',
        description: 'Valor menor ou igual'
      },
      {
        title: 'Entre',
        value: 'between',
        description: 'Valor dentro de um intervalo'
      }
    ]
  }

  if (fieldType === 'DATE') {
    return [
      ...baseOperators,
      {
        title: 'Anterior a',
        value: 'before',
        description: 'Data anterior'
      },
      {
        title: 'Posterior a',
        value: 'after',
        description: 'Data posterior'
      },
      {
        title: 'Nos últimos X dias',
        value: 'last_days',
        description: 'Dentro dos últimos dias'
      }
    ]
  }

  if (['DROPDOWN', 'CHECKBOX'].includes(fieldType)) {
    return [
      ...baseOperators,
      {
        title: 'Está em',
        value: 'in',
        description: 'Valor está na lista'
      },
      {
        title: 'Não está em',
        value: 'not_in',
        description: 'Valor não está na lista'
      }
    ]
  }

  return baseOperators
})

// Tipos de valor
const valueTypeOptions = [
  {
    title: 'Valor Fixo',
    value: 'fixed',
    icon: 'mdi-numeric',
    description: 'Valor específico definido'
  },
  {
    title: 'Outro Campo',
    value: 'field',
    icon: 'mdi-form-textbox',
    description: 'Comparar com outro campo do formulário'
  },
  {
    title: 'Fórmula',
    value: 'formula',
    icon: 'mdi-calculator',
    description: 'Resultado de uma fórmula'
  },
  {
    title: 'Data Atual',
    value: 'current_date',
    icon: 'mdi-calendar-today',
    description: 'Data/hora atual'
  },
  {
    title: 'Usuário Atual',
    value: 'current_user',
    icon: 'mdi-account',
    description: 'ID do usuário executando'
  }
]

// Computed
const isTextOperation = computed(() => {
  const op = conditionData.value.operator
  return ['contains', 'not_contains', 'starts_with', 'ends_with'].includes(op)
})

// Métodos auxiliares
function getFieldLabel(fieldName) {
  const field = props.availableFields.find(f => f.name === fieldName)
  return field?.label || fieldName
}

function getFieldTypeColor(type) {
  const colors = {
    TEXT: 'blue',
    NUMBER: 'green',
    DATE: 'orange',
    EMAIL: 'purple',
    DROPDOWN: 'teal',
    CURRENCY: 'amber'
  }
  return colors[type] || 'grey'
}

function getFieldTypeIcon(type) {
  const icons = {
    TEXT: 'mdi-format-text',
    NUMBER: 'mdi-numeric',
    DATE: 'mdi-calendar',
    EMAIL: 'mdi-email',
    DROPDOWN: 'mdi-menu-down',
    CURRENCY: 'mdi-currency-brl'
  }
  return icons[type] || 'mdi-help-circle'
}

function getConditionTypeColor(type) {
  return type === 'group' ? 'warning' : 'primary'
}

function getConditionTypeText(type) {
  return type === 'group' ? 'Grupo' : 'Condição'
}

function getOperatorText(operator) {
  const op = availableOperators.value.find(o => o.value === operator)
  return op?.title || operator
}

function getValuePreview(condition) {
  if (!condition.value) return 'Vazio'
  
  if (condition.valueType === 'field') {
    return `Campo: ${getFieldLabel(condition.compareField)}`
  }
  
  if (condition.valueType === 'formula') {
    return `Fórmula: ${condition.formula}`
  }
  
  if (condition.valueType === 'current_date') {
    return 'Data Atual'
  }
  
  if (condition.valueType === 'current_user') {
    return 'Usuário Atual'
  }
  
  if (Array.isArray(condition.value)) {
    return condition.value.join(', ')
  }
  
  return String(condition.value)
}

function getFieldOptions(fieldName) {
  const field = props.availableFields.find(f => f.name === fieldName)
  if (!field?.options) return []
  
  try {
    const options = Array.isArray(field.options) ? field.options : JSON.parse(field.options)
    return options.map(opt => ({
      title: opt.label || opt.value || opt,
      value: opt.value || opt
    }))
  } catch {
    return []
  }
}

// Métodos principais
function openConditionDialog(index = null) {
  editingIndex.value = index
  
  if (index !== null) {
    // Editar condição existente
    const condition = conditions.value[index]
    conditionData.value = { ...condition }
  } else {
    // Nova condição
    conditionData.value = {
      field: '',
      operator: '',
      value: '',
      valueType: 'fixed',
      compareField: '',
      formula: '',
      caseSensitive: false,
      negate: false,
      errorMessage: '',
      type: 'simple',
      logicalOperator: conditions.value.length > 0 ? 'AND' : ''
    }
  }
  
  conditionDialog.value = true
}

function editCondition(index) {
  openConditionDialog(index)
}

function removeCondition(index) {
  conditions.value.splice(index, 1)
  updateModelValue()
}

function closeConditionDialog() {
  conditionDialog.value = false
  editingIndex.value = null
}

function onFieldChange() {
  // Limpar operador e valor ao mudar campo
  conditionData.value.operator = ''
  conditionData.value.value = ''
}

function onValueTypeChange() {
  // Limpar valor ao mudar tipo
  conditionData.value.value = ''
  conditionData.value.compareField = ''
  conditionData.value.formula = ''
}

function saveCondition() {
  if (!conditionValid.value) return

  const condition = {
    ...conditionData.value,
    tempId: editingIndex.value !== null 
      ? conditions.value[editingIndex.value].tempId 
      : Date.now() + Math.random()
  }

  if (editingIndex.value !== null) {
    conditions.value[editingIndex.value] = condition
  } else {
    conditions.value.push(condition)
  }

  updateModelValue()
  closeConditionDialog()
}

function groupConditions(operator) {
  if (conditions.value.length < 2) return
  
  // Criar um grupo com todas as condições atuais
  const groupedCondition = {
    type: 'group',
    operator: operator,
    conditions: [...conditions.value],
    tempId: Date.now() + Math.random()
  }
  
  conditions.value = [groupedCondition]
  updateModelValue()
}

function clearAllConditions() {
  conditions.value = []
  updateModelValue()
}

function testCondition() {
  testValue.value = ''
  testResult.value = null
  testDialog.value = true
}

function getTestInputType() {
  const fieldType = selectedFieldType.value
  
  if (fieldType === 'NUMBER' || fieldType === 'CURRENCY') {
    return 'number'
  }
  
  if (fieldType === 'DATE') {
    return 'date'
  }
  
  if (fieldType === 'EMAIL') {
    return 'email'
  }
  
  return 'text'
}

function runConditionTest() {
  if (!conditionData.value.field || !conditionData.value.operator) {
    testResult.value = false
    return
  }
  
  try {
    const result = evaluateCondition(conditionData.value, { [conditionData.value.field]: testValue.value })
    testResult.value = result
  } catch (error) {
    console.error('Error testing condition:', error)
    testResult.value = false
  }
}

function getTestResultMessage() {
  const condition = conditionData.value
  const field = getFieldLabel(condition.field)
  const operator = getOperatorText(condition.operator)
  const value = condition.valueType === 'fixed' ? condition.value : getValuePreview(condition)
  
  return `${field} ${operator} ${value}`
}

function evaluateCondition(condition, data) {
  const fieldValue = data[condition.field]
  const compareValue = condition.valueType === 'fixed' 
    ? condition.value 
    : data[condition.compareField] || condition.value
  
  let result = false
  
  switch (condition.operator) {
    case 'equals':
      result = fieldValue == compareValue
      break
    case 'not_equals':
      result = fieldValue != compareValue
      break
    case 'greater_than':
      result = Number(fieldValue) > Number(compareValue)
      break
    case 'less_than':
      result = Number(fieldValue) < Number(compareValue)
      break
    case 'contains':
      result = String(fieldValue).toLowerCase().includes(String(compareValue).toLowerCase())
      break
    case 'starts_with':
      result = String(fieldValue).toLowerCase().startsWith(String(compareValue).toLowerCase())
      break
    case 'is_empty':
      result = !fieldValue || fieldValue === ''
      break
    case 'is_not_empty':
      result = fieldValue && fieldValue !== ''
      break
    default:
      result = false
  }
  
  return condition.negate ? !result : result
}

function updateModelValue() {
  emit('update:modelValue', [...conditions.value])
}

// Watchers
watch(() => props.modelValue, (newVal) => {
  conditions.value = [...newVal]
}, { deep: true })

watch(conditions, () => {
  updateModelValue()
}, { deep: true })
</script>

<style scoped>
.condition-builder {
  width: 100%;
}

.empty-state {
  margin-bottom: 16px;
}

.condition-item {
  position: relative;
}

.condition-preview {
  font-size: 0.875rem;
  color: rgba(0, 0, 0, 0.7);
}

.actions-section {
  margin-top: 16px;
}

.gap-2 {
  gap: 8px;
}
</style>