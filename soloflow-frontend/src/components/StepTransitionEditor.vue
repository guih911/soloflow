<template>
  <v-card>
    <v-card-title class="d-flex align-center">
      <v-icon start color="primary">mdi-arrow-decision</v-icon>
      Configurar Transições da Etapa
    </v-card-title>
    
    <v-divider />
    
    <v-card-text>
      <p class="text-body-2 text-medium-emphasis mb-4">
        Configure como o processo deve fluir após a execução desta etapa. Você pode criar múltiplas transições condicionais.
      </p>

      <!-- Lista de transições existentes -->
      <div v-if="transitions.length > 0" class="transitions-list mb-4">
        <v-card
          v-for="(transition, index) in transitions"
          :key="transition.tempId || index"
          class="transition-item mb-3"
          variant="outlined"
          :color="transition.isActive ? 'primary' : 'default'"
        >
          <v-card-text class="pa-4">
            <div class="d-flex align-center justify-space-between mb-3">
              <div class="d-flex align-center gap-2">
                <v-chip
                  :color="getConditionTypeColor(transition.conditionType)"
                  variant="tonal"
                  size="small"
                >
                  <v-icon start size="16">{{ getConditionTypeIcon(transition.conditionType) }}</v-icon>
                  {{ getConditionTypeText(transition.conditionType) }}
                </v-chip>
                
                <v-chip
                  v-if="transition.name"
                  variant="outlined"
                  size="small"
                >
                  {{ transition.name }}
                </v-chip>
              </div>
              
              <div class="d-flex align-center gap-2">
                <v-chip size="small" variant="outlined">
                  Prioridade: {{ transition.priority }}
                </v-chip>
                <v-switch
                  v-model="transition.isActive"
                  density="compact"
                  color="primary"
                  hide-details
                />
                <v-btn
                  icon="mdi-pencil"
                  variant="text"
                  size="small"
                  @click="editTransition(index)"
                />
                <v-btn
                  icon="mdi-delete"
                  variant="text"
                  size="small"
                  color="error"
                  @click="removeTransition(index)"
                />
              </div>
            </div>

            <!-- Detalhes da transição -->
            <div class="transition-details">
              <div class="d-flex align-center mb-2">
                <v-icon start color="success" size="16">mdi-arrow-right-circle</v-icon>
                <span class="font-weight-medium">
                  {{ getDestinationText(transition.targetStepOrder) }}
                </span>
              </div>

              <!-- Condições -->
              <div v-if="transition.conditions && Object.keys(transition.conditions).length > 0" class="conditions-preview">
                <v-chip size="x-small" color="orange" variant="tonal" class="mr-2">
                  <v-icon start size="12">mdi-filter</v-icon>
                  {{ getConditionsPreview(transition.conditions) }}
                </v-chip>
              </div>

              <!-- Descrição -->
              <div v-if="transition.description" class="text-caption text-medium-emphasis mt-1">
                {{ transition.description }}
              </div>
            </div>
          </v-card-text>
        </v-card>
      </div>

      <!-- Estado vazio -->
      <v-alert v-else type="info" variant="tonal" class="mb-4">
        <v-icon start>mdi-information</v-icon>
        <div>
          <div class="font-weight-medium">Nenhuma transição configurada</div>
          <div class="mt-1">Adicione transições para definir o fluxo após esta etapa. Se não configurar, será criada uma transição automática para a próxima etapa.</div>
        </div>
      </v-alert>

      <!-- Templates rápidos -->
      <div v-if="transitionTemplates.length > 0" class="templates-section mb-4">
        <v-divider class="mb-3" />
        <h4 class="text-subtitle-2 mb-3">Templates Rápidos:</h4>
        <div class="d-flex flex-wrap gap-2">
          <v-btn
            v-for="template in transitionTemplates"
            :key="template.name"
            variant="outlined"
            size="small"
            :prepend-icon="template.icon"
            @click="addFromTemplate(template)"
          >
            {{ template.name }}
          </v-btn>
        </div>
      </div>

      <!-- Botão adicionar -->
      <v-btn
        color="primary"
        variant="elevated"
        @click="openTransitionDialog()"
        prepend-icon="mdi-plus"
      >
        Adicionar Transição
      </v-btn>
    </v-card-text>

    <!-- Dialog de configuração -->
    <v-dialog v-model="transitionDialog" max-width="800" persistent scrollable>
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon start color="primary">mdi-arrow-decision-auto</v-icon>
          {{ editingIndex !== null ? 'Editar' : 'Nova' }} Transição
        </v-card-title>
        
        <v-divider />

        <v-form ref="transitionForm" v-model="transitionValid">
          <v-card-text>
            <v-tabs v-model="configTab" class="mb-4">
              <v-tab value="basic">Informações Básicas</v-tab>
              <v-tab value="conditions">Condições</v-tab>
              <v-tab value="actions">Ações</v-tab>
            </v-tabs>

            <v-window v-model="configTab">
              <!-- Aba: Informações Básicas -->
              <v-window-item value="basic">
                <v-row>
                  <v-col cols="12" md="6">
                    <v-text-field
                      v-model="transitionData.name"
                      label="Nome da Transição"
                      placeholder="ex: Aprovado, Rejeitado, Continuar"
                      :rules="[v => !!v || 'Nome é obrigatório']"
                    />
                  </v-col>

                  <v-col cols="12" md="3">
                    <v-text-field
                      v-model.number="transitionData.priority"
                      label="Prioridade"
                      type="number"
                      min="1"
                      max="10"
                      :rules="[v => v > 0 || 'Prioridade deve ser maior que 0']"
                      hint="1 = maior prioridade"
                      persistent-hint
                    />
                  </v-col>

                  <v-col cols="12" md="3">
                    <v-switch
                      v-model="transitionData.isActive"
                      label="Ativo"
                      color="primary"
                      hide-details
                    />
                  </v-col>

                  <v-col cols="12">
                    <v-textarea
                      v-model="transitionData.description"
                      label="Descrição"
                      placeholder="Descreva quando esta transição deve ser executada"
                      rows="2"
                    />
                  </v-col>

                  <v-col cols="12" md="6">
                    <v-select
                      v-model="transitionData.conditionType"
                      :items="conditionTypes"
                      label="Tipo de Condição"
                      :rules="[v => !!v || 'Selecione um tipo']"
                      @update:model-value="onConditionTypeChange"
                    >
                      <template #item="{ props, item }">
                        <v-list-item v-bind="props">
                          <template #prepend>
                            <v-icon :color="getConditionTypeColor(item.value)">
                              {{ getConditionTypeIcon(item.value) }}
                            </v-icon>
                          </template>
                          <v-list-item-title>{{ item.title }}</v-list-item-title>
                          <v-list-item-subtitle>{{ item.description }}</v-list-item-subtitle>
                        </v-list-item>
                      </template>
                    </v-select>
                  </v-col>

                  <v-col cols="12" md="6">
                    <v-select
                      v-model="transitionData.targetStepOrder"
                      :items="destinationOptions"
                      label="Próximo Destino"
                      :rules="[v => v !== undefined || 'Selecione um destino']"
                      clearable
                    >
                      <template #item="{ props, item }">
                        <v-list-item v-bind="props">
                          <template #prepend>
                            <v-icon :color="item.raw.color">{{ item.raw.icon }}</v-icon>
                          </template>
                          <v-list-item-title>{{ item.title }}</v-list-item-title>
                          <v-list-item-subtitle>{{ item.raw.description }}</v-list-item-subtitle>
                        </v-list-item>
                      </template>
                    </v-select>
                  </v-col>
                </v-row>
              </v-window-item>

              <!-- Aba: Condições -->
              <v-window-item value="conditions">
                <div v-if="transitionData.conditionType === 'ALWAYS'">
                  <v-alert type="info" variant="tonal">
                    <v-icon start>mdi-check-circle</v-icon>
                    <div>
                      <div class="font-weight-medium">Transição Automática</div>
                      <div class="mt-1">Esta transição será sempre executada, sem condições específicas.</div>
                    </div>
                  </v-alert>
                </div>

                <div v-else-if="transitionData.conditionType === 'ACTION_BASED'">
                  <h4 class="text-subtitle-1 mb-3">Condições Baseadas em Ação</h4>
                  
                  <v-row>
                    <v-col cols="12" md="6">
                      <v-combobox
                        v-model="actionConditions.action"
                        :items="commonActions"
                        label="Ação Específica"
                        hint="Digite ou selecione uma ação"
                        persistent-hint
                      />
                    </v-col>
                    
                    <v-col cols="12" md="6">
                      <v-combobox
                        v-model="actionConditions.actions"
                        :items="commonActions"
                        label="Múltiplas Ações (OR)"
                        multiple
                        chips
                        hint="Qualquer uma destas ações"
                        persistent-hint
                      />
                    </v-col>
                  </v-row>

                  <!-- Condições adicionais -->
                  <v-expansion-panels variant="accordion" class="mt-4">
                    <v-expansion-panel title="Condições Adicionais (AND)">
                      <v-expansion-panel-text>
                        <ConditionBuilder 
                          v-model="actionConditions.additionalConditions"
                          :available-fields="availableFields"
                        />
                      </v-expansion-panel-text>
                    </v-expansion-panel>
                  </v-expansion-panels>
                </div>

                <div v-else-if="transitionData.conditionType === 'DATA_BASED'">
                  <h4 class="text-subtitle-1 mb-3">Condições Baseadas em Dados</h4>
                  
                  <ConditionBuilder 
                    v-model="dataConditions"
                    :available-fields="availableFields"
                    :allow-multiple="true"
                  />
                </div>

                <div v-else-if="transitionData.conditionType === 'USER_BASED'">
                  <h4 class="text-subtitle-1 mb-3">Condições Baseadas no Usuário</h4>
                  
                  <v-row>
                    <v-col cols="12" md="6">
                      <v-select
                        v-model="userConditions.executorRole"
                        :items="userRoles"
                        label="Papel do Executor"
                        clearable
                      />
                    </v-col>
                    
                    <v-col cols="12" md="6">
                      <v-select
                        v-model="userConditions.executorSector"
                        :items="sectors"
                        item-title="name"
                        item-value="id"
                        label="Setor do Executor"
                        clearable
                      />
                    </v-col>
                    
                    <v-col cols="12">
                      <v-switch
                        v-model="userConditions.mustBeCreator"
                        label="Deve ser o criador do processo"
                        color="primary"
                      />
                    </v-col>
                  </v-row>
                </div>

                <div v-else-if="transitionData.conditionType === 'CUSTOM'">
                  <h4 class="text-subtitle-1 mb-3">Condição Customizada</h4>
                  
                  <v-alert type="warning" variant="tonal" class="mb-4">
                    <v-icon start>mdi-code-braces</v-icon>
                    <div>
                      <div class="font-weight-medium">Condição Avançada</div>
                      <div class="mt-1">Use JavaScript para criar condições complexas. Tenha cuidado com a segurança!</div>
                    </div>
                  </v-alert>
                  
                  <v-textarea
                    v-model="customCondition.script"
                    label="Script da Condição"
                    placeholder="return context.formData.valor > 1000 && context.executionData.action === 'aprovar'"
                    rows="6"
                    hint="Retorne true/false. Contexto disponível: context.formData, context.executionData, context.processInstance"
                    persistent-hint
                  />
                  
                  <v-text-field
                    v-model="customCondition.description"
                    label="Descrição da Lógica"
                    placeholder="Aprovação automática para valores acima de R$ 1.000"
                    class="mt-3"
                  />
                </div>
              </v-window-item>

              <!-- Aba: Ações -->
              <v-window-item value="actions">
                <h4 class="text-subtitle-1 mb-3">Ações da Transição</h4>
                <p class="text-body-2 text-medium-emphasis mb-4">
                  Configure ações que devem ser executadas quando esta transição for ativada.
                </p>
                
                <v-row>
                  <v-col cols="12" md="6">
                    <v-switch
                      v-model="transitionActions.notify_assignees"
                      label="Notificar Próximos Responsáveis"
                      color="primary"
                    />
                  </v-col>
                  
                  <v-col cols="12" md="6">
                    <v-switch
                      v-model="transitionActions.notify_creator"
                      label="Notificar Criador do Processo"
                      color="primary"
                    />
                  </v-col>
                  
                  <v-col cols="12" md="6">
                    <v-switch
                      v-model="transitionActions.update_process_data"
                      label="Atualizar Dados do Processo"
                      color="primary"
                    />
                  </v-col>
                  
                  <v-col cols="12" md="6">
                    <v-switch
                      v-model="transitionActions.create_subtask"
                      label="Criar Subtarefa"
                      color="primary"
                    />
                  </v-col>
                </v-row>

                <v-textarea
                  v-if="transitionActions.update_process_data"
                  v-model="processDataUpdates"
                  label="Atualizações de Dados (JSON)"
                  placeholder='{"status": "aprovado", "data_aprovacao": "now()"}'
                  rows="3"
                  class="mt-3"
                />
                
                <v-textarea
                  v-model="customActionsJson"
                  label="Ações Customizadas (JSON)"
                  placeholder='{"webhook": {"url": "...", "data": {...}}, "email": {"template": "...", "to": [...]}}'
                  rows="4"
                  hint="Configure ações avançadas em formato JSON"
                  persistent-hint
                  class="mt-3"
                />
              </v-window-item>
            </v-window>
          </v-card-text>

          <v-divider />

          <v-card-actions>
            <v-btn
              v-if="editingIndex !== null"
              variant="text"
              color="warning"
              @click="duplicateTransition"
            >
              <v-icon start>mdi-content-copy</v-icon>
              Duplicar
            </v-btn>
            
            <v-spacer />
            
            <v-btn variant="text" @click="closeTransitionDialog">
              Cancelar
            </v-btn>
            <v-btn
              color="primary"
              variant="elevated"
              :disabled="!transitionValid"
              @click="saveTransition"
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
import ConditionBuilder from './ConditionBuilder.vue'

const props = defineProps({
  modelValue: {
    type: Array,
    default: () => []
  },
  sourceStepOrder: {
    type: Number,
    required: true
  },
  availableSteps: {
    type: Array,
    default: () => []
  },
  availableFields: {
    type: Array,
    default: () => []
  },
  stepType: {
    type: String,
    default: 'INPUT'
  },
  sectors: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['update:modelValue'])

// Estado
const transitionDialog = ref(false)
const transitionValid = ref(false)
const editingIndex = ref(null)
const transitions = ref([...props.modelValue])
const transitionForm = ref(null)
const configTab = ref('basic')

// Dados da transição
const transitionData = ref({
  name: '',
  description: '',
  conditionType: 'ALWAYS',
  priority: 1,
  isActive: true,
  targetStepOrder: null,
  conditions: {},
  actions: {}
})

// Condições específicas por tipo
const actionConditions = ref({
  action: '',
  actions: [],
  additionalConditions: []
})

const dataConditions = ref([])
const userConditions = ref({
  executorRole: null,
  executorSector: null,
  mustBeCreator: false
})

const customCondition = ref({
  script: '',
  description: ''
})

// Ações da transição
const transitionActions = ref({
  notify_assignees: true,
  notify_creator: false,
  update_process_data: false,
  create_subtask: false
})

const processDataUpdates = ref('')
const customActionsJson = ref('')

// Tipos de condição
const conditionTypes = [
  {
    title: 'Sempre',
    value: 'ALWAYS',
    description: 'Transição automática, sempre executada'
  },
  {
    title: 'Baseada em Ação',
    value: 'ACTION_BASED',
    description: 'Baseada na ação do usuário (aprovar, reprovar, etc.)'
  },
  {
    title: 'Baseada em Dados',
    value: 'DATA_BASED',
    description: 'Baseada nos valores dos campos do processo'
  },
  {
    title: 'Baseada no Usuário',
    value: 'USER_BASED',
    description: 'Baseada no perfil do usuário executor'
  },
  {
    title: 'Condição Customizada',
    value: 'CUSTOM',
    description: 'Lógica personalizada em JavaScript'
  }
]

// Ações comuns
const commonActions = [
  'aprovar',
  'reprovar',
  'concluir',
  'enviar',
  'devolver',
  'rejeitar',
  'aceitar',
  'recusar',
  'continuar',
  'finalizar',
  'cancelar',
  'pausar'
]

// Papéis de usuário
const userRoles = [
  { title: 'Administrador', value: 'ADMIN' },
  { title: 'Gerente', value: 'MANAGER' },
  { title: 'Usuário', value: 'USER' }
]

// Opções de destino
const destinationOptions = computed(() => {
  const options = [
    {
      title: 'Finalizar Processo',
      value: null,
      icon: 'mdi-flag-checkered',
      color: 'success',
      description: 'Encerra o processo aqui'
    }
  ]

  // Adicionar etapas disponíveis
  props.availableSteps.forEach(step => {
    if (step.order !== props.sourceStepOrder) {
      options.push({
        title: `${step.order}. ${step.name}`,
        value: step.order,
        icon: step.order > props.sourceStepOrder ? 'mdi-arrow-right' : 'mdi-arrow-left',
        color: step.order > props.sourceStepOrder ? 'primary' : 'warning',
        description: step.order > props.sourceStepOrder ? 'Avançar para esta etapa' : 'Voltar para esta etapa'
      })
    }
  })

  return options
})

// Templates de transição baseados no tipo da etapa
const transitionTemplates = computed(() => {
  const templates = []

  if (props.stepType === 'APPROVAL') {
    templates.push(
      {
        name: 'Aprovado',
        icon: 'mdi-check-circle',
        conditionType: 'ACTION_BASED',
        conditions: { action: 'aprovar' }
      },
      {
        name: 'Reprovado',
        icon: 'mdi-close-circle',
        conditionType: 'ACTION_BASED',
        conditions: { action: 'reprovar' }
      }
    )
  }

  templates.push(
    {
      name: 'Sempre Continuar',
      icon: 'mdi-arrow-right',
      conditionType: 'ALWAYS',
      conditions: {}
    },
    {
      name: 'Valor Alto',
      icon: 'mdi-currency-usd',
      conditionType: 'DATA_BASED',
      conditions: { field: 'valor', operator: 'greater_than', value: 1000 }
    }
  )

  return templates
})

// Métodos auxiliares
function getConditionTypeColor(type) {
  const colors = {
    ALWAYS: 'success',
    ACTION_BASED: 'primary',
    DATA_BASED: 'info',
    USER_BASED: 'warning',
    CUSTOM: 'purple'
  }
  return colors[type] || 'default'
}

function getConditionTypeIcon(type) {
  const icons = {
    ALWAYS: 'mdi-check-circle',
    ACTION_BASED: 'mdi-gesture-tap',
    DATA_BASED: 'mdi-database',
    USER_BASED: 'mdi-account',
    CUSTOM: 'mdi-code-braces'
  }
  return icons[type] || 'mdi-help-circle'
}

function getConditionTypeText(type) {
  const item = conditionTypes.find(t => t.value === type)
  return item?.title || type
}

function getDestinationText(targetStepOrder) {
  if (targetStepOrder === null) {
    return 'Finalizar Processo'
  }
  
  const step = props.availableSteps.find(s => s.order === targetStepOrder)
  return step ? `${step.order}. ${step.name}` : `Etapa ${targetStepOrder}`
}

function getConditionsPreview(conditions) {
  if (!conditions || Object.keys(conditions).length === 0) {
    return 'Sem condições'
  }

  if (conditions.action) {
    return `Ação: ${conditions.action}`
  }

  if (conditions.field) {
    return `${conditions.field} ${conditions.operator} ${conditions.value}`
  }

  return 'Condições customizadas'
}

// Métodos principais
function openTransitionDialog(index = null) {
  editingIndex.value = index
  configTab.value = 'basic'
  
  if (index !== null) {
    // Editar transição existente
    const transition = transitions.value[index]
    transitionData.value = { ...transition }
    
    // Carregar condições específicas
    loadConditionsByType(transition.conditionType, transition.conditions)
    
    // Carregar ações
    if (transition.actions) {
      Object.assign(transitionActions.value, transition.actions)
    }
  } else {
    // Nova transição
    resetTransitionData()
  }
  
  transitionDialog.value = true
}

function editTransition(index) {
  openTransitionDialog(index)
}

function removeTransition(index) {
  transitions.value.splice(index, 1)
  updateModelValue()
}

function closeTransitionDialog() {
  transitionDialog.value = false
  editingIndex.value = null
}

function resetTransitionData() {
  transitionData.value = {
    name: '',
    description: '',
    conditionType: 'ALWAYS',
    priority: getNextPriority(),
    isActive: true,
    targetStepOrder: null,
    conditions: {},
    actions: {}
  }
  
  // Reset condições
  actionConditions.value = {
    action: '',
    actions: [],
    additionalConditions: []
  }
  dataConditions.value = []
  userConditions.value = {
    executorRole: null,
    executorSector: null,
    mustBeCreator: false
  }
  customCondition.value = {
    script: '',
    description: ''
  }
  
  // Reset ações
  transitionActions.value = {
    notify_assignees: true,
    notify_creator: false,
    update_process_data: false,
    create_subtask: false
  }
  processDataUpdates.value = ''
  customActionsJson.value = ''
}

function loadConditionsByType(conditionType, conditions) {
  switch (conditionType) {
    case 'ACTION_BASED':
      actionConditions.value = {
        action: conditions.action || '',
        actions: conditions.actions || [],
        additionalConditions: conditions.additionalConditions || []
      }
      break
    case 'DATA_BASED':
      dataConditions.value = Array.isArray(conditions) ? conditions : [conditions].filter(Boolean)
      break
    case 'USER_BASED':
      userConditions.value = {
        executorRole: conditions.executorRole || null,
        executorSector: conditions.executorSector || null,
        mustBeCreator: conditions.mustBeCreator || false
      }
      break
    case 'CUSTOM':
      customCondition.value = {
        script: conditions.script || '',
        description: conditions.description || ''
      }
      break
  }
}

function onConditionTypeChange() {
  // Limpar condições ao mudar tipo
  transitionData.value.conditions = {}
}

function addFromTemplate(template) {
  const transition = {
    name: template.name,
    description: '',
    conditionType: template.conditionType,
    priority: getNextPriority(),
    isActive: true,
    targetStepOrder: null,
    conditions: template.conditions || {},
    actions: {},
    tempId: Date.now() + Math.random()
  }
  
  transitions.value.push(transition)
  updateModelValue()
}

function duplicateTransition() {
  if (editingIndex.value === null) return
  
  const original = transitions.value[editingIndex.value]
  const duplicate = {
    ...original,
    name: `${original.name} (Cópia)`,
    priority: getNextPriority(),
    tempId: Date.now() + Math.random()
  }
  
  transitions.value.push(duplicate)
  updateModelValue()
}

function saveTransition() {
  if (!transitionValid.value) return

  const transition = { ...transitionData.value }
  
  // Processar condições baseadas no tipo
  switch (transition.conditionType) {
    case 'ALWAYS':
      transition.conditions = {}
      break
    case 'ACTION_BASED':
      transition.conditions = { ...actionConditions.value }
      break
    case 'DATA_BASED':
      transition.conditions = dataConditions.value.length === 1 ? dataConditions.value[0] : dataConditions.value
      break
    case 'USER_BASED':
      transition.conditions = { ...userConditions.value }
      break
    case 'CUSTOM':
      transition.conditions = { ...customCondition.value }
      break
  }

  // Processar ações
  const actions = { ...transitionActions.value }
  
  if (processDataUpdates.value.trim()) {
    try {
      actions.processDataUpdates = JSON.parse(processDataUpdates.value)
    } catch (error) {
    }
  }
  
  if (customActionsJson.value.trim()) {
    try {
      Object.assign(actions, JSON.parse(customActionsJson.value))
    } catch (error) {
    }
  }
  
  transition.actions = actions

  // Gerar ID temporário se for nova transição
  if (editingIndex.value === null) {
    transition.tempId = Date.now() + Math.random()
    transitions.value.push(transition)
  } else {
    transitions.value[editingIndex.value] = transition
  }

  updateModelValue()
  closeTransitionDialog()
}

function getNextPriority() {
  const priorities = transitions.value.map(t => t.priority || 1)
  return priorities.length > 0 ? Math.max(...priorities) + 1 : 1
}

function updateModelValue() {
  emit('update:modelValue', [...transitions.value])
}

// Watchers
watch(() => props.modelValue, (newVal) => {
  transitions.value = [...newVal]
}, { deep: true })

watch(transitions, () => {
  updateModelValue()
}, { deep: true })
</script>

<style scoped>
.transition-item {
  transition: all 0.3s ease;
}

.transition-item:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.transition-details {
  font-size: 0.875rem;
}

.conditions-preview {
  margin-top: 8px;
}

.templates-section {
  border-top: 1px solid rgba(0, 0, 0, 0.12);
  padding-top: 16px;
}

.gap-2 {
  gap: 8px;
}
</style>