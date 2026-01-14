<template>
  <div class="dynamic-table-input">
    <!-- Header com título e botão de adicionar -->
    <div class="table-header d-flex align-center justify-space-between mb-4">
      <div>
        <label class="text-body-1 font-weight-medium d-flex align-center">
          <v-icon color="indigo" class="mr-2" size="20">mdi-table</v-icon>
          {{ field.label }}
          <span v-if="field.required" class="text-error ml-1">*</span>
        </label>
        <p v-if="field.helpText" class="text-caption text-medium-emphasis mt-1">
          {{ field.helpText }}
        </p>
      </div>
      <v-btn
        color="indigo"
        variant="tonal"
        size="small"
        prepend-icon="mdi-plus"
        @click="addRow"
        :disabled="isMaxRowsReached"
      >
        Adicionar Linha
      </v-btn>
    </div>

    <!-- Tabela dinâmica -->
    <div class="table-container" v-if="rows.length > 0">
      <v-table density="comfortable" class="dynamic-table">
        <thead>
          <tr>
            <th class="text-center column-index" style="width: 60px;">#</th>
            <th 
              v-for="column in columns" 
              :key="column.key"
              class="text-left column-header"
            >
              {{ column.label || column.key }}
              <span v-if="column.required" class="text-error">*</span>
            </th>
            <th class="text-center column-actions" style="width: 80px;">Ações</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, rowIndex) in rows" :key="row._id" class="table-row">
            <td class="text-center">
              <v-chip size="x-small" color="indigo" variant="flat">
                {{ rowIndex + 1 }}
              </v-chip>
            </td>
            <td v-for="column in columns" :key="`${row._id}-${column.key}`" class="pa-2">
              <!-- TEXT ou fallback -->
              <v-text-field
                v-if="column.type === 'TEXT' || column.type === 'Texto' || column.type === 'text' || !column.type"
                :key="`field-${row._id}-${column.key}`"
                :model-value="row[column.key]"
                @update:model-value="updateCellByRowId(row._id, column.key, $event)"
                variant="outlined"
                density="compact"
                hide-details="auto"
                :placeholder="column.label"
                :rules="column.required ? [v => !!v || 'Obrigatório'] : []"
              />
              
              <!-- NUMBER -->
              <v-text-field
                v-else-if="column.type === 'NUMBER' || column.type === 'Número' || column.type === 'number'"
                :key="`field-${row._id}-${column.key}`"
                :model-value="row[column.key]"
                @update:model-value="updateCellByRowId(row._id, column.key, $event ? Number($event) : null)"
                type="number"
                variant="outlined"
                density="compact"
                hide-details="auto"
                :placeholder="column.label"
                :rules="column.required ? [v => v !== '' && v !== null || 'Obrigatório'] : []"
              />

              <!-- DATE -->
              <v-text-field
                v-else-if="column.type === 'DATE' || column.type === 'Data' || column.type === 'date'"
                :key="`field-${row._id}-${column.key}`"
                :model-value="row[column.key]"
                @update:model-value="updateCellByRowId(row._id, column.key, $event)"
                type="date"
                variant="outlined"
                density="compact"
                hide-details="auto"
                :rules="column.required ? [v => !!v || 'Obrigatório'] : []"
              />

              <!-- CURRENCY -->
              <v-text-field
                v-else-if="column.type === 'CURRENCY' || column.type === 'Dinheiro' || column.type === 'currency'"
                :key="`field-${row._id}-${column.key}`"
                :model-value="row[column.key]"
                @update:model-value="updateCellByRowId(row._id, column.key, $event)"
                variant="outlined"
                density="compact"
                hide-details="auto"
                prefix="R$"
                :placeholder="column.label"
                :rules="column.required ? [v => !!v || 'Obrigatório'] : []"
              />

              <!-- EMAIL -->
              <v-text-field
                v-else-if="column.type === 'EMAIL' || column.type === 'email'"
                :key="`field-${row._id}-${column.key}`"
                :model-value="row[column.key]"
                @update:model-value="updateCellByRowId(row._id, column.key, $event)"
                type="email"
                variant="outlined"
                density="compact"
                hide-details="auto"
                :placeholder="column.label"
                :rules="getEmailRules(column)"
              />

              <!-- Fallback para qualquer outro tipo -->
              <v-text-field
                v-else
                :key="`field-${row._id}-${column.key}`"
                :model-value="row[column.key]"
                @update:model-value="updateCellByRowId(row._id, column.key, $event)"
                variant="outlined"
                density="compact"
                hide-details="auto"
                :placeholder="column.label || 'Digite...'"
              />
            </td>
            <td class="text-center">
              <v-btn
                icon="mdi-delete"
                size="small"
                color="error"
                variant="text"
                :disabled="isMinRowsReached && rows.length <= (field.minRows || 0)"
                @click="removeRow(rowIndex)"
              >
                <v-icon size="18">mdi-delete</v-icon>
                <v-tooltip activator="parent" location="top">Remover linha</v-tooltip>
              </v-btn>
            </td>
          </tr>
        </tbody>
      </v-table>
    </div>

    <!-- Estado vazio -->
    <v-card v-else variant="outlined" class="empty-state pa-8 text-center">
      <v-icon size="48" color="grey-lighten-1">mdi-table-off</v-icon>
      <p class="text-body-1 text-grey mt-3 mb-4">Nenhuma linha adicionada</p>
      <v-btn
        color="indigo"
        variant="elevated"
        prepend-icon="mdi-plus"
        @click="addRow"
      >
        Adicionar Primeira Linha
      </v-btn>
    </v-card>

    <!-- Info de linhas -->
    <div class="d-flex justify-space-between align-center mt-3">
      <span class="text-caption text-medium-emphasis">
        {{ rows.length }} linha(s)
        <template v-if="field.minRows > 0">
          • Mínimo: {{ field.minRows }}
        </template>
        <template v-if="field.maxRows">
          • Máximo: {{ field.maxRows }}
        </template>
      </span>
      <v-chip 
        v-if="hasValidationError" 
        size="small" 
        color="error" 
        variant="tonal"
      >
        <v-icon start size="14">mdi-alert</v-icon>
        {{ validationErrorMessage }}
      </v-chip>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, nextTick } from 'vue'

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

const rows = ref([])

// Computed para colunas
const columns = computed(() => {
  const cols = props.field.tableColumns || []
  console.log('🔍 DynamicTableInput - field:', props.field)
  console.log('🔍 DynamicTableInput - tableColumns:', cols)
  console.log('🔍 DynamicTableInput - FULL columns structure:', JSON.stringify(cols, null, 2))
  console.log('🔍 DynamicTableInput - column keys:', cols.map(c => c.key))
  return cols
})

// Computed para verificar limite máximo
const isMaxRowsReached = computed(() => {
  if (!props.field.maxRows) return false
  return rows.value.length >= props.field.maxRows
})

// Computed para verificar limite mínimo
const isMinRowsReached = computed(() => {
  if (!props.field.minRows) return false
  return rows.value.length <= props.field.minRows
})

// Validação
const hasValidationError = computed(() => {
  if (props.field.required && rows.value.length === 0) return true
  if (props.field.minRows && rows.value.length < props.field.minRows) return true
  return false
})

const validationErrorMessage = computed(() => {
  if (props.field.required && rows.value.length === 0) {
    return 'Adicione pelo menos uma linha'
  }
  if (props.field.minRows && rows.value.length < props.field.minRows) {
    return `Mínimo de ${props.field.minRows} linha(s) necessária(s)`
  }
  return ''
})

// Funções
function createEmptyRow() {
  const row = {
    _id: `row_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
  // Criar uma cópia profunda para cada coluna
  columns.value.forEach(col => {
    // Garantir que cada propriedade seja única e não compartilhada
    if (col.type === 'NUMBER' || col.type === 'Número' || col.type === 'number') {
      row[col.key] = null
    } else {
      // Usar String() para garantir novo valor primitivo
      row[col.key] = String('')
    }
  })
  console.log('🆕 Criando nova linha:', JSON.stringify(row))
  return row
}

// Funções para acessar/modificar valores de células de forma segura
function getCellValue(rowIndex, columnName) {
  if (!rows.value[rowIndex]) return ''
  return rows.value[rowIndex][columnName] ?? ''
}

// Nova função que usa row._id para garantir atualização correta
function updateCellByRowId(rowId, columnName, value) {
  console.log(`📝 updateCellByRowId [${rowId}][${columnName}] = "${value}"`)
  
  // Encontrar o índice da linha pelo _id
  const rowIndex = rows.value.findIndex(r => r._id === rowId)
  
  if (rowIndex === -1) {
    console.error('❌ Row não encontrada com _id:', rowId)
    return
  }
  
  // ABORDAGEM DIRETA: Modificar diretamente o objeto reativo
  rows.value[rowIndex][columnName] = value
  
  console.log(`✅ Célula atualizada [${rowIndex}][${columnName}]:`, value)
  console.log(`📊 Linha completa após update:`, JSON.stringify(rows.value[rowIndex]))
  
  // Usar nextTick para garantir que a atualização foi processada antes de emitir
  nextTick(() => {
    emitValue()
  })
}

function setCellValue(rowIndex, columnName, value) {
  console.log(`📝 setCellValue [${rowIndex}][${columnName}] = "${value}"`)
  
  if (!rows.value[rowIndex]) {
    console.error('❌ Row não existe:', rowIndex)
    return
  }
  
  // Usar a nova função com _id
  const rowId = rows.value[rowIndex]._id
  updateCellByRowId(rowId, columnName, value)
}

function updateCellValue(rowIndex, columnName, value) {
  setCellValue(rowIndex, columnName, value)
}

function addRow() {
  if (isMaxRowsReached.value) return
  const newRow = createEmptyRow()
  rows.value = [...rows.value, newRow]
  console.log('➕ Linha adicionada. Total:', rows.value.length)
  emitValue()
}

function removeRow(index) {
  if (isMinRowsReached.value && rows.value.length <= (props.field.minRows || 0)) return
  rows.value = rows.value.filter((_, idx) => idx !== index)
  console.log('➖ Linha removida. Total:', rows.value.length)
  emitValue()
}

function emitValue() {
  // Fazer deep copy para garantir que não há referências compartilhadas
  // Remover o _id interno antes de emitir
  const valuesToEmit = rows.value.map(row => {
    const { _id, ...cleanRow } = row
    return cleanRow
  })
  emit('update:modelValue', valuesToEmit)
}

function getEmailRules(column) {
  const rules = []
  if (column.required) {
    rules.push(v => !!v || 'Obrigatório')
  }
  rules.push(v => !v || /.+@.+\..+/.test(v) || 'E-mail inválido')
  return rules
}

// Watchers
watch(() => props.modelValue, (newVal) => {
  console.log('👁️ modelValue changed:', newVal)
  if (JSON.stringify(newVal) !== JSON.stringify(rows.value.map(r => { const { _id, ...rest } = r; return rest }))) {
    // Fazer deep copy para evitar referências compartilhadas e adicionar _id
    rows.value = newVal && newVal.length > 0 
      ? newVal.map(row => ({ 
          _id: `row_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          ...row 
        })) 
      : []
    console.log('✅ Rows atualizadas do modelValue:', rows.value)
  }
}, { deep: true })

// Lifecycle
onMounted(() => {
  console.log('🎬 DynamicTableInput montado')
  console.log('📦 Props field:', props.field)
  console.log('📦 Props modelValue:', props.modelValue)
  console.log('📦 Colunas:', columns.value)
  
  if (props.modelValue && props.modelValue.length > 0) {
    // Fazer deep copy de cada linha para evitar referências compartilhadas e adicionar _id
    rows.value = props.modelValue.map(row => ({ 
      _id: `row_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...row 
    }))
    console.log('✅ Linhas carregadas do modelValue:', rows.value)
  } else if (props.field.minRows && props.field.minRows > 0) {
    // Adicionar linhas mínimas
    const newRows = []
    for (let i = 0; i < props.field.minRows; i++) {
      newRows.push(createEmptyRow())
    }
    rows.value = newRows
    console.log(`✅ ${props.field.minRows} linha(s) mínima(s) criada(s)`)
    emitValue()
  }
})
</script>

<style scoped>
.dynamic-table-input {
  width: 100%;
}

.table-container {
  overflow-x: auto;
  border-radius: 12px;
  background: #fff;
  border: 1px solid #e5e7eb;
}

.dynamic-table {
  min-width: 100%;
  table-layout: fixed;
}

.dynamic-table thead th {
  background: linear-gradient(135deg, rgba(63, 81, 181, 0.08), rgba(63, 81, 181, 0.04));
  font-weight: 600;
  font-size: 0.875rem;
  white-space: nowrap;
  padding: 12px 16px;
  border-bottom: 1px solid #e5e7eb;
}

.dynamic-table thead th.column-index {
  width: 60px;
  min-width: 60px;
  max-width: 60px;
}

.dynamic-table thead th.column-actions {
  width: 80px;
  min-width: 80px;
  max-width: 80px;
}

.dynamic-table thead th.column-header {
  min-width: 180px;
  width: auto;
}

.dynamic-table tbody tr:hover {
  background: rgba(63, 81, 181, 0.04);
}

.dynamic-table tbody tr {
  border-bottom: 1px solid #f3f4f6;
}

.dynamic-table tbody tr:last-child {
  border-bottom: none;
}

.dynamic-table tbody td {
  padding: 12px 16px;
  vertical-align: middle;
}

.dynamic-table tbody td:first-child {
  text-align: center;
  vertical-align: middle;
}

.empty-state {
  border-radius: 12px;
  border-style: dashed;
  background: linear-gradient(135deg, rgba(0, 0, 0, 0.01), rgba(0, 0, 0, 0.02));
}

.table-row td {
  vertical-align: middle;
}

.table-header {
  padding: 0 4px;
}

/* Estilização dos campos de input dentro da tabela */
.dynamic-table :deep(.v-field) {
  font-size: 0.875rem;
  border-radius: 6px;
}

.dynamic-table :deep(.v-field__input) {
  min-height: 40px;
  padding-top: 8px;
  padding-bottom: 8px;
}

.dynamic-table :deep(.v-messages) {
  font-size: 0.75rem;
  padding-left: 4px;
}
</style>
