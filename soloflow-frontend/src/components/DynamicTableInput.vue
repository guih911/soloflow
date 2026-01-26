<template>
  <div class="dynamic-list-input">
    <!-- Header com título e botão + -->
    <div class="list-header">
      <label class="list-label">
        <v-icon color="primary" size="18" class="mr-2">mdi-format-list-bulleted</v-icon>
        {{ field.label }}
        <span v-if="field.required" class="text-error ml-1">*</span>
      </label>

      <v-btn
        color="primary"
        variant="tonal"
        size="small"
        prepend-icon="mdi-plus"
        :disabled="isMaxRowsReached"
        @click="addRow"
      >
        Adicionar
      </v-btn>
    </div>

    <p v-if="field.helpText" class="list-hint">{{ field.helpText }}</p>

    <!-- Linhas de inputs -->
    <div class="list-rows">
      <TransitionGroup name="list-row">
        <div
          v-for="(row, rowIndex) in rows"
          :key="row._id"
          class="list-row-item"
        >
          <div class="row-fields">
            <div
              v-for="column in columns"
              :key="`${row._id}-${column.name || column.key}`"
              class="row-field"
              :class="{ 'row-field--full': columns.length === 1 }"
            >
              <!-- TEXT -->
              <v-text-field
                v-if="isTextType(column.type)"
                :model-value="row[column.name || column.key]"
                @update:model-value="updateCellByRowId(row._id, column.name || column.key, $event)"
                :label="column.label || column.name || column.key"
                variant="outlined"
                density="compact"
                hide-details="auto"
                :rules="column.required ? [v => !!v || 'Obrigatório'] : []"
              />

              <!-- NUMBER -->
              <v-text-field
                v-else-if="isNumberType(column.type)"
                :model-value="row[column.name || column.key]"
                @update:model-value="updateCellByRowId(row._id, column.name || column.key, $event ? Number($event) : null)"
                :label="column.label || column.name || column.key"
                type="number"
                variant="outlined"
                density="compact"
                hide-details="auto"
                :rules="column.required ? [v => v !== '' && v !== null || 'Obrigatório'] : []"
              />

              <!-- DATE -->
              <v-text-field
                v-else-if="isDateType(column.type)"
                :model-value="row[column.name || column.key]"
                @update:model-value="updateCellByRowId(row._id, column.name || column.key, $event)"
                :label="column.label || column.name || column.key"
                type="date"
                variant="outlined"
                density="compact"
                hide-details="auto"
                :rules="column.required ? [v => !!v || 'Obrigatório'] : []"
              />

              <!-- CURRENCY -->
              <v-text-field
                v-else-if="isCurrencyType(column.type)"
                :model-value="row[column.name || column.key]"
                @update:model-value="updateCellByRowId(row._id, column.name || column.key, $event ? formatCurrency($event) : '')"
                :label="column.label || column.name || column.key"
                variant="outlined"
                density="compact"
                hide-details="auto"
                placeholder="R$ 0,00"
                prepend-inner-icon="mdi-currency-brl"
                :rules="column.required ? [v => !!v || 'Obrigatório'] : []"
              />

              <!-- EMAIL -->
              <v-text-field
                v-else-if="isEmailType(column.type)"
                :model-value="row[column.name || column.key]"
                @update:model-value="updateCellByRowId(row._id, column.name || column.key, $event)"
                :label="column.label || column.name || column.key"
                type="email"
                variant="outlined"
                density="compact"
                hide-details="auto"
                :rules="getEmailRules(column)"
              />

              <!-- CPF -->
              <v-text-field
                v-else-if="isCpfType(column.type)"
                :model-value="row[column.name || column.key]"
                @update:model-value="updateCellByRowId(row._id, column.name || column.key, $event)"
                v-mask="'###.###.###-##'"
                :label="column.label || column.name || column.key"
                variant="outlined"
                density="compact"
                hide-details="auto"
                maxlength="14"
                placeholder="000.000.000-00"
                prepend-inner-icon="mdi-card-account-details-outline"
                :rules="column.required ? [v => !!v || 'Obrigatório'] : []"
              />

              <!-- CNPJ -->
              <v-text-field
                v-else-if="isCnpjType(column.type)"
                :model-value="row[column.name || column.key]"
                @update:model-value="updateCellByRowId(row._id, column.name || column.key, $event)"
                v-mask="'##.###.###/####-##'"
                :label="column.label || column.name || column.key"
                variant="outlined"
                density="compact"
                hide-details="auto"
                maxlength="18"
                placeholder="00.000.000/0000-00"
                prepend-inner-icon="mdi-domain"
                :rules="column.required ? [v => !!v || 'Obrigatório'] : []"
              />

              <!-- DROPDOWN / LISTA -->
              <v-select
                v-else-if="isDropdownType(column.type)"
                :model-value="row[column.name || column.key]"
                @update:model-value="updateCellByRowId(row._id, column.name || column.key, $event)"
                :label="column.label || column.name || column.key"
                :items="column.options || []"
                variant="outlined"
                density="compact"
                hide-details="auto"
                :rules="column.required ? [v => !!v || 'Obrigatório'] : []"
              />

              <!-- Fallback -->
              <v-text-field
                v-else
                :model-value="row[column.name || column.key]"
                @update:model-value="updateCellByRowId(row._id, column.name || column.key, $event)"
                :label="column.label || column.name || column.key"
                variant="outlined"
                density="compact"
                hide-details="auto"
              />
            </div>

            <!-- Botão remover -->
            <v-btn
              v-if="rows.length > 1 || !(field.minRows >= 1)"
              icon
              size="x-small"
              variant="text"
              color="error"
              class="row-remove-btn"
              @click="removeRow(rowIndex)"
            >
              <v-icon size="18">mdi-close</v-icon>
              <v-tooltip activator="parent" location="top">Remover</v-tooltip>
            </v-btn>
          </div>
        </div>
      </TransitionGroup>
    </div>

    <!-- Validação -->
    <div v-if="hasValidationError" class="list-validation-error">
      <v-icon size="14" color="error" class="mr-1">mdi-alert-circle</v-icon>
      {{ validationErrorMessage }}
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { formatCurrency } from '@/utils/formatters'

const props = defineProps({
  field: {
    type: Object,
    required: true
  },
  modelValue: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['update:modelValue'])

const componentId = `list_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
let rowCounter = 0

const rows = ref([])

const columns = computed(() => props.field.tableColumns || [])

const isMaxRowsReached = computed(() => {
  if (!props.field.maxRows) return false
  return rows.value.length >= props.field.maxRows
})

const hasValidationError = computed(() => {
  if (props.field.required && rows.value.length === 0) return true
  if (props.field.minRows && rows.value.length < props.field.minRows) return true
  return false
})

const validationErrorMessage = computed(() => {
  if (props.field.required && rows.value.length === 0) return 'Adicione pelo menos uma linha'
  if (props.field.minRows && rows.value.length < props.field.minRows) return `Mínimo de ${props.field.minRows} linha(s)`
  return ''
})

function isTextType(type) {
  const t = (type || '').toString().toUpperCase()
  return t === 'TEXT' || t === 'TEXTO' || !type
}
function isNumberType(type) {
  const t = (type || '').toString().toUpperCase()
  return t === 'NUMBER' || t === 'NÚMERO' || t === 'NUMERO'
}
function isDateType(type) {
  const t = (type || '').toString().toUpperCase()
  return t === 'DATE' || t === 'DATA'
}
function isCurrencyType(type) {
  const t = (type || '').toString().toUpperCase()
  return t === 'CURRENCY' || t === 'DINHEIRO'
}
function isEmailType(type) {
  const t = (type || '').toString().toUpperCase()
  return t === 'EMAIL'
}
function isCpfType(type) {
  const t = (type || '').toString().toUpperCase()
  return t === 'CPF'
}
function isCnpjType(type) {
  const t = (type || '').toString().toUpperCase()
  return t === 'CNPJ'
}
function isDropdownType(type) {
  const t = (type || '').toString().toUpperCase()
  return t === 'DROPDOWN' || t === 'LISTA' || t === 'LIST'
}

function createEmptyRow() {
  rowCounter++
  const row = { _id: `${componentId}_row_${rowCounter}_${Date.now()}` }

  columns.value.forEach(col => {
    const colType = (col.type || '').toString().toUpperCase()
    const colKey = col.name || col.key

    if (colType === 'NUMBER' || colType === 'NÚMERO' || colType === 'NUMERO') {
      row[colKey] = null
    } else if (colType === 'CHECKBOX') {
      row[colKey] = []
    } else {
      row[colKey] = ''
    }
  })

  return row
}

function updateCellByRowId(rowId, columnName, value) {
  const rowIndex = rows.value.findIndex(r => r._id === rowId)
  if (rowIndex === -1) return
  rows.value[rowIndex][columnName] = value
  nextTick(() => emitValue())
}

function addRow() {
  if (isMaxRowsReached.value) return
  rows.value = [...rows.value, createEmptyRow()]
  emitValue()
}

function removeRow(index) {
  if (rows.value.length <= 1 && props.field.minRows >= 1) return
  rows.value = rows.value.filter((_, idx) => idx !== index)
  emitValue()
}

function emitValue() {
  const valuesToEmit = rows.value.map(row => {
    const { _id, ...cleanRow } = row
    const deepCopy = {}
    Object.keys(cleanRow).forEach(key => {
      const value = cleanRow[key]
      if (Array.isArray(value)) {
        deepCopy[key] = [...value]
      } else if (value !== null && typeof value === 'object') {
        deepCopy[key] = { ...value }
      } else {
        deepCopy[key] = value
      }
    })
    return deepCopy
  })
  emit('update:modelValue', valuesToEmit)
}

function getEmailRules(column) {
  const rules = []
  if (column.required) rules.push(v => !!v || 'Obrigatório')
  rules.push(v => !v || /.+@.+\..+/.test(v) || 'E-mail inválido')
  return rules
}

watch(() => props.modelValue, (newVal) => {
  const currentClean = rows.value.map(r => { const { _id, ...rest } = r; return rest })
  if (JSON.stringify(newVal) !== JSON.stringify(currentClean)) {
    if (newVal && newVal.length > 0) {
      rows.value = newVal.map((row, idx) => {
        rowCounter++
        const newRow = { _id: `${componentId}_row_${rowCounter}_${Date.now()}_${idx}` }
        Object.keys(row).forEach(key => {
          const value = row[key]
          if (Array.isArray(value)) newRow[key] = [...value]
          else if (value !== null && typeof value === 'object') newRow[key] = { ...value }
          else newRow[key] = value
        })
        return newRow
      })
    } else {
      rows.value = []
    }
  }
}, { deep: true })

onMounted(() => {
  if (props.modelValue && props.modelValue.length > 0) {
    rows.value = props.modelValue.map((row, idx) => {
      rowCounter++
      const newRow = { _id: `${componentId}_row_${rowCounter}_${Date.now()}_${idx}` }
      Object.keys(row).forEach(key => {
        const value = row[key]
        if (Array.isArray(value)) newRow[key] = [...value]
        else if (value !== null && typeof value === 'object') newRow[key] = { ...value }
        else newRow[key] = value
      })
      return newRow
    })
  } else {
    const initialCount = Math.max(1, props.field.minRows || 0)
    const newRows = []
    for (let i = 0; i < initialCount; i++) newRows.push(createEmptyRow())
    rows.value = newRows
    emitValue()
  }
})
</script>

<style scoped>
.dynamic-list-input {
  width: 100%;
}

.list-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.list-label {
  display: flex;
  align-items: center;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-neutral-700, #374151);
}

.list-hint {
  font-size: 0.8125rem;
  color: var(--color-neutral-500, #6b7280);
  margin: 0 0 12px 0;
}

.list-rows {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.list-row-item {
  width: 100%;
}

.row-fields {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.row-field {
  flex: 1 1 0;
  min-width: 0;
}

.row-field--full {
  flex: 1 1 100%;
}

.row-remove-btn {
  margin-top: 6px;
  flex-shrink: 0;
}

.list-validation-error {
  display: flex;
  align-items: center;
  margin-top: 8px;
  font-size: 0.75rem;
  color: rgb(var(--v-theme-error));
}

/* Transições */
.list-row-enter-active {
  transition: all 0.25s ease;
}
.list-row-leave-active {
  transition: all 0.2s ease;
}
.list-row-enter-from {
  opacity: 0;
  transform: translateY(-8px);
}
.list-row-leave-to {
  opacity: 0;
  transform: translateX(16px);
}

@media (max-width: 600px) {
  .row-fields {
    flex-wrap: wrap;
  }
  .row-field {
    flex: 1 1 100%;
  }
}
</style>
