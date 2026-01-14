<template>
  <div v-if="tables.length > 0" class="tables-section">
    <div class="d-flex align-center flex-wrap ga-2">
      <v-icon size="20" color="indigo" class="mr-1">mdi-table-multiple</v-icon>
      <span class="text-body-2 font-weight-medium text-medium-emphasis mr-2">Tabelas:</span>
      
      <v-chip
        v-for="table in tables"
        :key="table.fieldName"
        color="indigo"
        variant="tonal"
        size="small"
        class="table-chip"
        @click="openTableModal(table)"
      >
        <v-icon start size="16">mdi-table</v-icon>
        {{ table.label }}
        <span class="ml-1 text-caption">({{ table.rows.length }})</span>
      </v-chip>
    </div>

    <!-- Modal de Visualização da Tabela Completa -->
    <v-dialog v-model="tableModal" max-width="900" scrollable>
      <v-card v-if="selectedTable">
        <v-card-title class="d-flex align-center py-4 px-6" style="background: linear-gradient(135deg, #3f51b5, #3949ab);">
          <v-avatar color="white" size="40" class="mr-3">
            <v-icon color="indigo">mdi-table</v-icon>
          </v-avatar>
          <div class="flex-grow-1">
            <div class="text-h6 text-white">{{ selectedTable.label }}</div>
            <div class="text-caption text-white" style="opacity: 0.8;">
              {{ selectedTable.rows.length }} linha(s) • {{ selectedTable.columns.length }} coluna(s)
            </div>
          </div>
          <v-btn icon variant="text" color="white" @click="tableModal = false">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-card-title>
        
        <v-card-text class="pa-0">
          <v-table class="full-table" fixed-header height="500">
            <thead>
              <tr>
                <th class="text-center bg-grey-lighten-4" style="width: 60px;">#</th>
                <th 
                  v-for="col in selectedTable.columns" 
                  :key="col.key || col.name"
                  class="font-weight-bold bg-grey-lighten-4"
                >
                  {{ col.label || col.key || col.name }}
                  <v-chip v-if="col.required" size="x-small" color="error" variant="flat" class="ml-1">
                    *
                  </v-chip>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, idx) in selectedTable.rows" :key="idx" class="table-data-row">
                <td class="text-center">
                  <v-chip size="x-small" color="indigo" variant="flat">
                    {{ idx + 1 }}
                  </v-chip>
                </td>
                <td 
                  v-for="col in selectedTable.columns" 
                  :key="`${idx}-${col.key || col.name}`"
                >
                  <span :class="getCellClass(row[col.key || col.name], col.type)">
                    {{ formatCellValue(row[col.key || col.name], col.type) || '-' }}
                  </span>
                </td>
              </tr>
            </tbody>
          </v-table>
        </v-card-text>

        <v-divider />

        <v-card-actions class="pa-4">
          <v-chip size="small" color="indigo" variant="tonal">
            <v-icon start size="16">mdi-information</v-icon>
            Total: {{ selectedTable.rows.length }} linha(s)
          </v-chip>
          <v-spacer />
          <v-btn variant="text" @click="tableModal = false">
            Fechar
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'

const props = defineProps({
  process: {
    type: Object,
    required: true
  }
})

const tableModal = ref(false)
const selectedTable = ref(null)

// Computed para extrair tabelas do formData
const tables = computed(() => {
  const result = []
  
  console.log('🔍 ProcessTablesCard - process:', props.process)
  console.log('🔍 ProcessTablesCard - formData:', props.process?.formData)
  console.log('🔍 ProcessTablesCard - processType:', props.process?.processType)
  console.log('🔍 ProcessTablesCard - formFields:', props.process?.processType?.formFields)

  if (!props.process?.formData) {
    console.log('❌ No formData found')
    return result
  }

  const formData = props.process.formData
  
  // Verificar se formFields está no processType ou diretamente no process
  const formFields = props.process?.processType?.formFields || props.process?.formFields || []
  
  console.log('🔍 formFields to check:', formFields)

  // Encontrar campos do tipo TABLE
  formFields.forEach(field => {
    console.log(`🔍 Checking field: ${field.name}, type: ${field.type}`)
    
    if (field.type === 'TABLE') {
      const data = formData[field.name]
      console.log(`🔍 TABLE field "${field.name}" data:`, data)
      console.log(`🔍 TABLE field "${field.name}" columns:`, field.tableColumns)
      
      // Verificar se é um array de objetos (linhas da tabela)
      if (Array.isArray(data) && data.length > 0) {
        result.push({
          fieldName: field.name,
          label: field.label || field.name,
          columns: field.tableColumns || [],
          rows: data,
          minRows: field.minRows || 0,
          maxRows: field.maxRows || null
        })
      }
    }
  })

  console.log('✅ Tables found:', result)
  return result
})

// Funções
function openTableModal(table) {
  selectedTable.value = table
  tableModal.value = true
}

function formatCellValue(value, type) {
  if (value === null || value === undefined || value === '') {
    return null
  }

  // Normalizar tipo para uppercase
  const normalizedType = type?.toString().toUpperCase()

  switch (normalizedType) {
    case 'DROPDOWN':
    case 'SELECT':
      // Se for um objeto, tentar pegar a propriedade 'label'
      if (typeof value === 'object' && value !== null) {
        return value.label || value.value || JSON.stringify(value)
      }
      return value

    case 'DATE':
    case 'DATA':
      try {
        const date = new Date(value)
        if (!isNaN(date.getTime())) {
          return date.toLocaleDateString('pt-BR')
        }
      } catch (e) {
        return value
      }
      break

    case 'CURRENCY':
    case 'DINHEIRO':
      try {
        const num = typeof value === 'string' ? parseFloat(value.replace(/[^\d.,]/g, '').replace(',', '.')) : value
        if (!isNaN(num)) {
          return num.toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL'
          })
        }
      } catch (e) {
        return value
      }
      break

    case 'NUMBER':
    case 'NÚMERO':
      return typeof value === 'number' ? value.toLocaleString('pt-BR') : value

    default:
      return value
  }

  return value
}

function getCellClass(value, type) {
  if (!value) return 'text-medium-emphasis'
  
  const normalizedType = type?.toString().toUpperCase()
  
  switch (normalizedType) {
    case 'CURRENCY':
    case 'DINHEIRO':
      return 'font-weight-medium text-success'
    case 'NUMBER':
    case 'NÚMERO':
      return 'font-weight-medium'
    case 'EMAIL':
      return 'text-primary'
    default:
      return ''
  }
}

onMounted(() => {
  console.log('🚀 ProcessTablesCard mounted')
  console.log('🚀 Props process:', props.process)
})
</script>

<style scoped>
.tables-section {
  padding: 12px 0;
}

.table-chip {
  cursor: pointer;
  transition: all 0.2s ease;
}

.table-chip:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(63, 81, 181, 0.3);
}

.full-table thead th {
  font-size: 0.875rem;
  white-space: nowrap;
}

.full-table tbody td {
  font-size: 0.875rem;
}

.table-data-row:hover {
  background: rgba(63, 81, 181, 0.04);
}

.bg-indigo {
  background: linear-gradient(135deg, rgb(var(--v-theme-indigo)), #3949ab) !important;
}
</style>
