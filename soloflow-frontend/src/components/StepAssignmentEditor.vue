<template>
  <v-card>
    <v-card-title class="d-flex align-center">
      <v-icon start color="primary">mdi-account-multiple-check</v-icon>
      Configurar Responsáveis pela Etapa
    </v-card-title>
    
    <v-divider />
    
    <v-card-text>
      <p class="text-body-2 text-medium-emphasis mb-4">
        Configure quem será responsável por executar esta etapa. Você pode definir múltiplas atribuições com prioridades diferentes.
      </p>

      <!-- Lista de atribuições existentes -->
      <div v-if="assignments.length > 0" class="assignments-list mb-4">
        <v-card
          v-for="(assignment, index) in assignments"
          :key="assignment.tempId || index"
          class="assignment-item mb-3"
          variant="outlined"
          :color="assignment.isActive ? 'primary' : 'default'"
        >
          <v-card-text class="pa-4">
            <div class="d-flex align-center justify-space-between mb-3">
              <v-chip
                :color="getAssignmentTypeColor(assignment.type)"
                variant="tonal"
                size="small"
              >
                <v-icon start size="16">{{ getAssignmentTypeIcon(assignment.type) }}</v-icon>
                {{ getAssignmentTypeText(assignment.type) }}
              </v-chip>
              
              <div class="d-flex align-center gap-2">
                <v-chip size="small" variant="outlined">
                  Prioridade: {{ assignment.priority }}
                </v-chip>
                <v-switch
                  v-model="assignment.isActive"
                  density="compact"
                  color="primary"
                  hide-details
                />
                <v-btn
                  icon="mdi-pencil"
                  variant="text"
                  size="small"
                  @click="editAssignment(index)"
                />
                <v-btn
                  icon="mdi-delete"
                  variant="text"
                  size="small"
                  color="error"
                  @click="removeAssignment(index)"
                />
              </div>
            </div>

            <!-- Detalhes da atribuição -->
            <div class="assignment-details">
              <div v-if="assignment.type === 'USER'" class="d-flex align-center">
                <v-icon start color="primary">mdi-account</v-icon>
                <span class="font-weight-medium">
                  {{ getUserName(assignment.userId) || 'Usuário não encontrado' }}
                </span>
              </div>
              
              <div v-else-if="assignment.type === 'SECTOR'" class="d-flex align-center">
                <v-icon start color="info">mdi-office-building</v-icon>
                <span class="font-weight-medium">
                  Setor: {{ getSectorName(assignment.sectorId) || 'Setor não encontrado' }}
                </span>
              </div>
              
              <div v-else-if="assignment.type === 'ROLE'" class="d-flex align-center">
                <v-icon start color="warning">mdi-account-star</v-icon>
                <span class="font-weight-medium">
                  {{ getDynamicRoleText(assignment.dynamicRole) }}
                </span>
              </div>
              
              <div v-else-if="assignment.type === 'CONDITIONAL'" class="d-flex align-center">
                <v-icon start color="purple">mdi-code-braces</v-icon>
                <span class="font-weight-medium">Atribuição Condicional</span>
              </div>

              <!-- Condições adicionais -->
              <div v-if="assignment.conditions" class="mt-2">
                <v-chip size="x-small" color="orange" variant="tonal">
                  <v-icon start size="12">mdi-filter</v-icon>
                  Com condições
                </v-chip>
              </div>
            </div>
          </v-card-text>
        </v-card>
      </div>

      <!-- Estado vazio -->
      <v-alert v-else type="info" variant="tonal" class="mb-4">
        <v-icon start>mdi-information</v-icon>
        <div>
          <div class="font-weight-medium">Nenhuma atribuição configurada</div>
          <div class="mt-1">Adicione pelo menos uma atribuição para definir quem executará esta etapa.</div>
        </div>
      </v-alert>

      <!-- Botão adicionar -->
      <v-btn
        color="primary"
        variant="elevated"
        @click="openAssignmentDialog()"
        prepend-icon="mdi-plus"
      >
        Adicionar Responsável
      </v-btn>
    </v-card-text>

    <!-- Dialog de configuração -->
    <v-dialog v-model="assignmentDialog" max-width="700" persistent>
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon start color="primary">mdi-account-cog</v-icon>
          {{ editingIndex !== null ? 'Editar' : 'Nova' }} Atribuição
        </v-card-title>
        
        <v-divider />

        <v-form ref="assignmentForm" v-model="assignmentValid">
          <v-card-text>
            <v-row>
              <!-- Tipo de atribuição -->
              <v-col cols="12" md="6">
                <v-select
                  v-model="assignmentData.type"
                  :items="assignmentTypes"
                  label="Tipo de Atribuição"
                  :rules="[v => !!v || 'Selecione um tipo']"
                  @update:model-value="onAssignmentTypeChange"
                >
                  <template #item="{ props, item }">
                    <v-list-item v-bind="props">
                      <template #prepend>
                        <v-icon :color="getAssignmentTypeColor(item.value)">
                          {{ getAssignmentTypeIcon(item.value) }}
                        </v-icon>
                      </template>
                      <v-list-item-title>{{ item.title }}</v-list-item-title>
                      <v-list-item-subtitle>{{ item.description }}</v-list-item-subtitle>
                    </v-list-item>
                  </template>
                </v-select>
              </v-col>

              <!-- Prioridade -->
              <v-col cols="12" md="3">
                <v-text-field
                  v-model.number="assignmentData.priority"
                  label="Prioridade"
                  type="number"
                  min="1"
                  max="10"
                  :rules="[v => v > 0 || 'Prioridade deve ser maior que 0']"
                  hint="1 = maior prioridade"
                  persistent-hint
                />
              </v-col>

              <!-- Status ativo -->
              <v-col cols="12" md="3">
                <v-switch
                  v-model="assignmentData.isActive"
                  label="Ativo"
                  color="primary"
                  hide-details
                />
              </v-col>
            </v-row>

            <!-- Configuração específica por tipo -->
            <v-row>
              <!-- Usuário específico -->
              <v-col v-if="assignmentData.type === 'USER'" cols="12">
                <v-select
                  v-model="assignmentData.userId"
                  :items="users"
                  item-title="name"
                  item-value="id"
                  label="Selecionar Usuário"
                  :rules="[v => !!v || 'Selecione um usuário']"
                  clearable
                >
                  <template #item="{ props, item }">
                    <v-list-item v-bind="props">
                      <template #prepend>
                        <v-avatar size="32" color="primary">
                          <span class="text-caption">{{ getInitials(item.raw.name) }}</span>
                        </v-avatar>
                      </template>
                      <v-list-item-title>{{ item.raw.name }}</v-list-item-title>
                      <v-list-item-subtitle>{{ item.raw.email }}</v-list-item-subtitle>
                    </v-list-item>
                  </template>
                </v-select>
              </v-col>

              <!-- Setor -->
              <v-col v-else-if="assignmentData.type === 'SECTOR'" cols="12">
                <v-select
                  v-model="assignmentData.sectorId"
                  :items="sectors"
                  item-title="name"
                  item-value="id"
                  label="Selecionar Setor"
                  :rules="[v => !!v || 'Selecione um setor']"
                  clearable
                >
                  <template #item="{ props, item }">
                    <v-list-item v-bind="props">
                      <template #prepend>
                        <v-icon color="info">mdi-office-building</v-icon>
                      </template>
                      <v-list-item-title>{{ item.raw.name }}</v-list-item-title>
                      <v-list-item-subtitle>{{ item.raw.description }}</v-list-item-subtitle>
                    </v-list-item>
                  </template>
                </v-select>
              </v-col>

              <!-- Papel dinâmico -->
              <v-col v-else-if="assignmentData.type === 'ROLE'" cols="12">
                <v-select
                  v-model="assignmentData.dynamicRole"
                  :items="dynamicRoles"
                  label="Papel Dinâmico"
                  :rules="[v => !!v || 'Selecione um papel']"
                  clearable
                >
                  <template #item="{ props, item }">
                    <v-list-item v-bind="props">
                      <template #prepend>
                        <v-icon color="warning">{{ item.raw.icon }}</v-icon>
                      </template>
                      <v-list-item-title>{{ item.raw.title }}</v-list-item-title>
                      <v-list-item-subtitle>{{ item.raw.description }}</v-list-item-subtitle>
                    </v-list-item>
                  </template>
                </v-select>
              </v-col>

              <!-- Atribuição condicional -->
              <v-col v-else-if="assignmentData.type === 'CONDITIONAL'" cols="12">
                <v-alert type="info" variant="tonal" class="mb-4">
                  <div class="font-weight-medium">Atribuição Condicional</div>
                  <div class="mt-1">Configure regras que definem quem será o responsável baseado nos dados do processo.</div>
                </v-alert>
                
                <v-textarea
                  v-model="conditionalConfigText"
                  label="Configuração JSON"
                  placeholder='{"conditions": {"field": "valor", "operator": "greater_than", "value": 1000}, "then": {"type": "SECTOR", "sectorName": "Financeiro"}, "else": {"type": "ROLE", "role": "SECTOR_MANAGER"}}'
                  rows="6"
                  :rules="conditionalConfigRules"
                  hint="Configure as condições e ações em formato JSON"
                  persistent-hint
                />
              </v-col>
            </v-row>

            <!-- Condições adicionais -->
            <v-row v-if="assignmentData.type !== 'CONDITIONAL'">
              <v-col cols="12">
                <v-expansion-panels variant="accordion">
                  <v-expansion-panel title="Condições Adicionais (Opcional)">
                    <v-expansion-panel-text>
                      <p class="text-body-2 text-medium-emphasis mb-3">
                        Defina condições que devem ser atendidas para esta atribuição ser válida.
                      </p>
                      
                      <v-textarea
                        v-model="conditionsText"
                        label="Condições (JSON)"
                        placeholder='{"onlyIf": {"fieldName": "expectedValue"}}'
                        rows="3"
                        hint="Deixe vazio para que a atribuição seja sempre válida"
                        persistent-hint
                      />
                    </v-expansion-panel-text>
                  </v-expansion-panel>
                </v-expansion-panels>
              </v-col>
            </v-row>
          </v-card-text>

          <v-divider />

          <v-card-actions>
            <v-spacer />
            <v-btn variant="text" @click="closeAssignmentDialog">
              Cancelar
            </v-btn>
            <v-btn
              color="primary"
              variant="elevated"
              :disabled="!assignmentValid"
              @click="saveAssignment"
            >
              {{ editingIndex !== null ? 'Salvar' : 'Adicionar' }}
            </v-btn>
          </v-card-actions>
        </v-form>
      </v-card>
    </v-dialog>
  </v-card>
</template>

<script setup>
import { ref, computed, watch } from 'vue'

const props = defineProps({
  modelValue: {
    type: Array,
    default: () => []
  },
  users: {
    type: Array,
    default: () => []
  },
  sectors: {
    type: Array,
    default: () => []
  },
  stepType: {
    type: String,
    default: 'INPUT'
  }
})

const emit = defineEmits(['update:modelValue'])

// Estado
const assignmentDialog = ref(false)
const assignmentValid = ref(false)
const editingIndex = ref(null)
const assignments = ref([...props.modelValue])
const assignmentForm = ref(null)
const conditionsText = ref('')
const conditionalConfigText = ref('')

// Dados do formulário de atribuição
const assignmentData = ref({
  type: 'USER',
  priority: 1,
  isActive: true,
  userId: null,
  sectorId: null,
  dynamicRole: null,
  conditions: null,
  conditionalConfig: null
})

// Tipos de atribuição
const assignmentTypes = [
  {
    title: 'Usuário Específico',
    value: 'USER',
    description: 'Atribuir a um usuário específico'
  },
  {
    title: 'Setor',
    value: 'SECTOR',
    description: 'Atribuir a todos os usuários de um setor'
  },
  {
    title: 'Papel Dinâmico',
    value: 'ROLE',
    description: 'Atribuir baseado em papel (ex: criador, gerente)'
  },
  {
    title: 'Condicional',
    value: 'CONDITIONAL',
    description: 'Atribuir baseado em condições específicas'
  }
]

// Papéis dinâmicos
const dynamicRoles = [
  {
    title: 'Criador do Processo',
    value: 'PROCESS_CREATOR',
    description: 'Usuário que iniciou este processo',
    icon: 'mdi-account-plus'
  },
  {
    title: 'Gerente do Setor',
    value: 'SECTOR_MANAGER',
    description: 'Gerente do setor do criador',
    icon: 'mdi-account-tie'
  },
  {
    title: 'Admin da Empresa',
    value: 'COMPANY_ADMIN',
    description: 'Usuários administradores',
    icon: 'mdi-shield-account'
  },
  {
    title: 'Executor Anterior',
    value: 'PREVIOUS_EXECUTOR',
    description: 'Quem executou a etapa anterior',
    icon: 'mdi-account-arrow-left'
  },
  {
    title: 'Baseado nos Dados',
    value: 'DATA_OWNER',
    description: 'Baseado em campo do formulário',
    icon: 'mdi-database-account'
  }
]

// Regras de validação
const conditionalConfigRules = [
  v => {
    if (!v) return 'Configuração é obrigatória para tipo condicional'
    try {
      JSON.parse(v)
      return true
    } catch {
      return 'JSON inválido'
    }
  }
]

// Métodos auxiliares
function getAssignmentTypeColor(type) {
  const colors = {
    USER: 'primary',
    SECTOR: 'info',
    ROLE: 'warning',
    CONDITIONAL: 'purple'
  }
  return colors[type] || 'default'
}

function getAssignmentTypeIcon(type) {
  const icons = {
    USER: 'mdi-account',
    SECTOR: 'mdi-office-building',
    ROLE: 'mdi-account-star',
    CONDITIONAL: 'mdi-code-braces'
  }
  return icons[type] || 'mdi-help-circle'
}

function getAssignmentTypeText(type) {
  const item = assignmentTypes.find(t => t.value === type)
  return item?.title || type
}

function getDynamicRoleText(role) {
  const item = dynamicRoles.find(r => r.value === role)
  return item?.title || role
}

function getUserName(userId) {
  const user = props.users.find(u => u.id === userId)
  return user?.name
}

function getSectorName(sectorId) {
  const sector = props.sectors.find(s => s.id === sectorId)
  return sector?.name
}

function getInitials(name) {
  return name
    ?.split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '??'
}

// Métodos principais
function openAssignmentDialog(index = null) {
  editingIndex.value = index
  
  if (index !== null) {
    // Editar atribuição existente
    const assignment = assignments.value[index]
    assignmentData.value = { ...assignment }
    conditionsText.value = assignment.conditions ? JSON.stringify(assignment.conditions, null, 2) : ''
    conditionalConfigText.value = assignment.conditionalConfig ? JSON.stringify(assignment.conditionalConfig, null, 2) : ''
  } else {
    // Nova atribuição
    assignmentData.value = {
      type: 'USER',
      priority: getNextPriority(),
      isActive: true,
      userId: null,
      sectorId: null,
      dynamicRole: null,
      conditions: null,
      conditionalConfig: null
    }
    conditionsText.value = ''
    conditionalConfigText.value = ''
  }
  
  assignmentDialog.value = true
}

function editAssignment(index) {
  openAssignmentDialog(index)
}

function removeAssignment(index) {
  assignments.value.splice(index, 1)
  updateModelValue()
}

function closeAssignmentDialog() {
  assignmentDialog.value = false
  editingIndex.value = null
}

function onAssignmentTypeChange() {
  // Limpar campos específicos do tipo anterior
  assignmentData.value.userId = null
  assignmentData.value.sectorId = null
  assignmentData.value.dynamicRole = null
  assignmentData.value.conditionalConfig = null
}

function saveAssignment() {
  if (!assignmentValid.value) return

  const assignment = { ...assignmentData.value }
  
  // Processar condições
  if (conditionsText.value.trim()) {
    try {
      assignment.conditions = JSON.parse(conditionsText.value)
    } catch (error) {
      console.error('Invalid conditions JSON:', error)
      assignment.conditions = null
    }
  } else {
    assignment.conditions = null
  }

  // Processar configuração condicional
  if (assignment.type === 'CONDITIONAL' && conditionalConfigText.value.trim()) {
    try {
      assignment.conditionalConfig = JSON.parse(conditionalConfigText.value)
    } catch (error) {
      console.error('Invalid conditional config JSON:', error)
      assignment.conditionalConfig = null
    }
  }

  // Gerar ID temporário se for nova atribuição
  if (editingIndex.value === null) {
    assignment.tempId = Date.now() + Math.random()
    assignments.value.push(assignment)
  } else {
    assignments.value[editingIndex.value] = assignment
  }

  updateModelValue()
  closeAssignmentDialog()
}

function getNextPriority() {
  const priorities = assignments.value.map(a => a.priority || 1)
  return priorities.length > 0 ? Math.max(...priorities) + 1 : 1
}

function updateModelValue() {
  emit('update:modelValue', [...assignments.value])
}

// Watchers
watch(() => props.modelValue, (newVal) => {
  assignments.value = [...newVal]
}, { deep: true })

watch(assignments, () => {
  updateModelValue()
}, { deep: true })
</script>

<style scoped>
.assignment-item {
  transition: all 0.3s ease;
}

.assignment-item:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.assignment-details {
  font-size: 0.875rem;
}

.gap-2 {
  gap: 8px;
}
</style>