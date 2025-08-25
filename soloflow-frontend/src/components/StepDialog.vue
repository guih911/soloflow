<template>
  <v-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)" max-width="900"
    persistent>
    <v-card>
      <v-card-title>
        {{ editingIndex !== null ? 'Editar' : 'Nova' }} Etapa
      </v-card-title>
      <v-divider />

      <v-form ref="stepForm" v-model="stepValid">
        <v-card-text>
          <v-tabs v-model="tab" class="mb-4">
            <v-tab value="basic">Informações Básicas</v-tab>
            <v-tab value="instructions">Instruções e Prazo</v-tab>
            <v-tab value="attachment">Anexos</v-tab>
            <v-tab value="flow">Fluxo e Condições</v-tab>
            <v-tab v-if="localStepData.type === 'INPUT'" value="input-config">
              Formulário da Etapa
            </v-tab>
          </v-tabs>

          <v-window v-model="tab">
            <v-window-item value="basic">
              <v-row>
                <v-col cols="12" md="6">
                  <v-text-field v-model="localStepData.name" label="Nome da Etapa"
                    :rules="[v => !!v || 'Nome é obrigatório']" required />
                </v-col>
                <v-col cols="12" md="6">
                  <v-select v-model="localStepData.type" :items="[
                    { title: 'Entrada de Dados', value: 'INPUT' },
                    { title: 'Aprovação', value: 'APPROVAL' },
                    { title: 'Upload de Arquivo', value: 'UPLOAD' },
                    { title: 'Revisão', value: 'REVIEW' },
                    { title: 'Assinatura', value: 'SIGNATURE' }
                  ]" item-title="title" item-value="value" label="Tipo de Etapa" :rules="[v => !!v || 'Tipo é obrigatório']"
                    required />
                </v-col>
                <v-col cols="12">
                  <v-textarea v-model="localStepData.description" label="Descrição" rows="2" />
                </v-col>
                <v-col cols="12" md="6">
                  <v-select v-model="responsibleType" :items="['user', 'sector']" label="Tipo de Responsável"
                    @update:modelValue="onResponsibleTypeChange">
                    <template v-slot:item="{ item, props }">
                      <v-list-item v-bind="props">
                        <template v-slot:prepend>
                          <v-icon>
                            {{ item === 'user' ? 'mdi-account' : 'mdi-office-building' }}
                          </v-icon>
                        </template>
                        <v-list-item-title>
                          {{ item === 'user' ? 'Usuário' : 'Setor' }}
                        </v-list-item-title>
                      </v-list-item>
                    </template>
                  </v-select>
                </v-col>
                <v-col cols="12" md="6">
                  <v-select v-if="responsibleType === 'user'" v-model="localStepData.assignedToUserId" :items="users"
                    item-title="name" item-value="id" label="Usuário Responsável" />
                  <v-select v-else-if="responsibleType === 'sector'" v-model="localStepData.assignedToSectorId"
                    :items="sectors" item-title="name" item-value="id" label="Setor Responsável" />
                </v-col>
                <v-col cols="12">
                  <v-switch v-model="localStepData.requiresSignature" label="Requer assinatura digital" color="primary"
                    hint="O usuário deverá assinar digitalmente os documentos" persistent-hint />
                </v-col>
              </v-row>
            </v-window-item>

            <v-window-item value="instructions">
              <v-row>
                <v-col cols="12">
                  <h3 class="text-h6 mb-4 d-flex align-center">
                    <v-icon color="primary" class="mr-2">mdi-text-box</v-icon>
                    Instruções para Execução
                  </h3>
                  <v-textarea v-model="localStepData.instructions" label="Instruções detalhadas"
                    placeholder="Descreva como executar esta etapa, quais informações são importantes, critérios de aprovação, etc."
                    rows="4" counter="2000" :rules="[v => !v || v.length <= 2000 || 'Máximo 2000 caracteres']"
                    hint="Texto que será exibido ao executar esta etapa para orientar o usuário" persistent-hint />
                </v-col>

                <v-col cols="12" md="6">
                  <h3 class="text-h6 mb-4 d-flex align-center">
                    <v-icon color="warning" class="mr-2">mdi-calendar-clock</v-icon>
                    Prazo (SLA)
                  </h3>
                  <v-text-field v-model.number="localStepData.slaDays" label="Prazo em dias" type="number" min="1"
                    max="365" :rules="slaRules" hint="Tempo limite para conclusão desta etapa (1 a 365 dias)"
                    persistent-hint suffix="dias" />
                </v-col>

                <v-col cols="12" md="6">
                  <v-alert v-if="localStepData.slaDays" type="info" variant="tonal" density="compact">
                    <v-icon start>mdi-information</v-icon>
                    Prazo: {{ formatSlaDescription(localStepData.slaDays) }}
                  </v-alert>
                </v-col>
              </v-row>
            </v-window-item>

            <v-window-item value="attachment">
              <v-row>
                <v-col cols="12">
                  <v-switch v-model="localStepData.allowAttachment" label="Permitir anexos" color="primary" />
                </v-col>

                <template v-if="localStepData.allowAttachment">
                  <v-col cols="12">
                    <v-switch v-model="localStepData.requireAttachment" label="Anexo obrigatório" color="error"
                      hint="Etapa não poderá ser concluída sem anexos" persistent-hint />
                  </v-col>

                  <v-col cols="12" md="6">
                    <v-text-field v-model.number="localStepData.minAttachments" label="Número mínimo de anexos"
                      type="number" min="0" :rules="attachmentRules" />
                  </v-col>

                  <v-col cols="12" md="6">
                    <v-text-field v-model.number="localStepData.maxAttachments" label="Número máximo de anexos"
                      type="number" min="1" :rules="attachmentRules" />
                  </v-col>

                  <v-col cols="12">
                    <v-select v-model="localStepData.allowedFileTypes" :items="fileTypes"
                      label="Tipos de arquivo permitidos" multiple chips closable-chips
                      hint="Deixe vazio para permitir todos os tipos" persistent-hint />
                  </v-col>
                </template>
              </v-row>
            </v-window-item>

            <v-window-item value="flow">
              <v-row>
                <v-col cols="12">
                  <v-combobox v-model="localStepData.actions" label="Ações disponíveis" multiple chips closable-chips
                    hint="Digite e pressione Enter para adicionar (ex: aprovar, rejeitar, devolver)" persistent-hint
                    class="mb-4" />
                </v-col>

                <v-col cols="12">
                  <v-card variant="outlined" v-if="localStepData.actions.length > 0">
                    <v-card-title class="text-subtitle-1">
                      Condições de Fluxo
                    </v-card-title>
                    <v-card-text>
                      <p class="text-body-2 text-grey mb-4">
                        Configure o que acontece após cada ação
                      </p>

                      <div v-for="action in localStepData.actions" :key="action" class="mb-4">
                        <v-row align="center">
                          <v-col cols="12" md="4">
                            <v-chip color="primary" label>
                              {{ action }}
                            </v-chip>
                          </v-col>
                          <v-col cols="12" md="8">
                            <v-select v-model="localStepData.conditions[action]" :items="getFlowOptions()"
                              label="Vai para..." density="compact">
                              <template v-slot:item="{ item, props }">
                                <v-list-item v-bind="props">
                                  <template v-slot:prepend>
                                    <v-icon>{{ item.icon }}</v-icon>
                                  </template>
                                </v-list-item>
                              </template>
                            </v-select>
                          </v-col>
                        </v-row>
                      </div>
                    </v-card-text>
                  </v-card>
                </v-col>
              </v-row>
            </v-window-item>

            <v-window-item value="input-config">
              <v-row>
                <v-col cols="12">
                  <h3 class="text-h6 mb-4">Formulário Específico da Etapa</h3>
                  <p class="text-body-2 text-medium-emphasis mb-4">
                    Configure campos específicos que serão exibidos apenas nesta etapa de entrada de dados.
                    Estes campos são independentes do formulário principal do processo.
                  </p>

                  <v-card variant="outlined" class="mb-4">
                    <v-card-title class="text-subtitle-1 d-flex align-center justify-space-between">
                      <span>
                        <v-icon start color="primary">mdi-form-textbox</v-icon>
                        Campos da Etapa ({{ inputConfig.fields.length }})
                      </span>
                      <v-btn color="primary" size="small" @click="addInputField" prepend-icon="mdi-plus">
                        Adicionar Campo
                      </v-btn>
                    </v-card-title>
                    
                    <v-card-text v-if="inputConfig.fields.length === 0" class="text-center py-6">
                      <v-icon size="48" color="grey-lighten-1">mdi-form-select</v-icon>
                      <p class="text-body-1 text-grey mt-2">Nenhum campo específico</p>
                      <p class="text-body-2 text-grey">
                        Adicione campos que aparecerão apenas nesta etapa
                      </p>
                    </v-card-text>

                    <v-list v-else lines="two" class="py-0">
                      <template v-for="(field, index) in inputConfig.fields" :key="field.tempId || index">
                        <v-list-item>
                          <template #prepend>
                            <v-avatar :color="getFieldTypeColor(field.type)" size="36">
                              <v-icon :icon="getFieldTypeIcon(field.type)" size="18" />
                            </v-avatar>
                          </template>

                          <v-list-item-title class="font-weight-medium">
                            {{ field.label }}
                            <v-chip v-if="field.required" size="x-small" color="error" class="ml-2">
                              Obrigatório
                            </v-chip>
                          </v-list-item-title>

                          <v-list-item-subtitle>
                            Nome: {{ field.name }} • Tipo: {{ getFieldTypeText(field.type) }}
                            <span v-if="field.placeholder"> • Placeholder: {{ field.placeholder }}</span>
                          </v-list-item-subtitle>

                          <template #append>
                            <v-btn icon="mdi-pencil" size="small" variant="text" @click="editInputField(index)" />
                            <v-btn icon="mdi-delete" size="small" variant="text" color="error" @click="removeInputField(index)" />
                          </template>
                        </v-list-item>
                        <v-divider v-if="index < inputConfig.fields.length - 1" />
                      </template>
                    </v-list>
                  </v-card>
                </v-col>
              </v-row>
            </v-window-item>
          </v-window>
        </v-card-text>

        <v-divider />

        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="close">
            Cancelar
          </v-btn>
          <v-btn color="primary" variant="elevated" :disabled="!stepValid" @click="save">
            {{ editingIndex !== null ? 'Salvar' : 'Adicionar' }}
          </v-btn>
        </v-card-actions>
      </v-form>
    </v-card>

    <v-dialog v-model="fieldDialog" max-width="600" persistent>
      <v-card>
        <v-card-title>
          {{ editingFieldIndex !== null ? 'Editar' : 'Novo' }} Campo do Formulário
        </v-card-title>
        <v-divider />

        <v-form ref="fieldForm" v-model="fieldValid">
          <v-card-text>
            <v-row>
              <v-col cols="12" md="6">
                <v-text-field 
                  v-model="fieldData.name" 
                  label="Nome do Campo" 
                  :rules="[
                    v => !!v || 'Nome é obrigatório',
                    v => /^[a-zA-Z][a-zA-Z0-9_]*$/.test(v) || 'Use apenas letras, números e _'
                  ]"
                  hint="Ex: valor_total, data_vencimento"
                  persistent-hint
                  required 
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field 
                  v-model="fieldData.label" 
                  label="Rótulo" 
                  :rules="[v => !!v || 'Rótulo é obrigatório']"
                  required 
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-select 
                  v-model="fieldData.type" 
                  :items="fieldTypes" 
                  label="Tipo do Campo"
                  :rules="[v => !!v || 'Tipo é obrigatório']"
                  required 
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-switch v-model="fieldData.required" label="Campo Obrigatório" color="primary" />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field v-model="fieldData.placeholder" label="Placeholder" />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field v-model="fieldData.defaultValue" label="Valor Padrão" />
              </v-col>
              <v-col cols="12">
                <v-textarea v-model="fieldData.helpText" label="Texto de Ajuda" rows="2" />
              </v-col>
            </v-row>
          </v-card-text>

          <v-divider />

          <v-card-actions>
            <v-spacer />
            <v-btn variant="text" @click="closeFieldDialog">Cancelar</v-btn>
            <v-btn color="primary" variant="elevated" :disabled="!fieldValid" @click="saveInputField">
              {{ editingFieldIndex !== null ? 'Salvar' : 'Adicionar' }}
            </v-btn>
          </v-card-actions>
        </v-form>
      </v-card>
    </v-dialog>
  </v-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'

const props = defineProps({
  modelValue: Boolean,
  stepData: Object,
  editingIndex: Number,
  sectors: Array,
  users: Array,
  steps: Array,
  formFields: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['update:modelValue', 'save', 'close'])

const stepValid = ref(false)
const fieldValid = ref(false)
const tab = ref('basic')
const responsibleType = ref('sector')
const fieldDialog = ref(false)
const editingFieldIndex = ref(null)

const localStepData = ref({
  name: '',
  description: '',
  type: 'INPUT',
  instructions: '',
  slaDays: null,
  allowAttachment: false,
  requiresSignature: false,
  requireAttachment: false,
  minAttachments: null,
  maxAttachments: null,
  allowedFileTypes: [],
  actions: [],
  assignedToUserId: null,
  assignedToSectorId: null,
  conditions: {}
})

const inputConfig = ref({
  fields: []
})

const fieldData = ref({
  name: '',
  label: '',
  type: 'TEXT',
  required: false,
  placeholder: '',
  defaultValue: '',
  helpText: ''
})

const fieldTypes = [
  { title: 'Texto', value: 'TEXT' },
  { title: 'Número', value: 'NUMBER' },
  { title: 'Data', value: 'DATE' },
  { title: 'E-mail', value: 'EMAIL' },
  { title: 'CPF', value: 'CPF' },
  { title: 'CNPJ', value: 'CNPJ' },
  { title: 'Telefone', value: 'PHONE' },
  { title: 'Lista Suspensa', value: 'DROPDOWN' },
  { title: 'Área de Texto', value: 'TEXTAREA' },
  { title: 'Moeda', value: 'CURRENCY' }
]

const fileTypes = [
  { title: 'PDF', value: 'application/pdf' },
  { title: 'Imagens (JPG, PNG)', value: 'image/*' },
  { title: 'Word', value: '.doc,.docx' },
  { title: 'Excel', value: '.xls,.xlsx' },
  { title: 'Texto', value: 'text/plain' }
]

const slaRules = computed(() => {
  return [
    v => !v || (v >= 1 && v <= 365) || 'Prazo deve estar entre 1 e 365 dias',
    v => !v || Number.isInteger(Number(v)) || 'Prazo deve ser um número inteiro'
  ]
})

const attachmentRules = computed(() => {
  return [
    () => {
      const min = localStepData.value.minAttachments
      const max = localStepData.value.maxAttachments
      if (min && max && min > max) {
        return 'Mínimo não pode ser maior que máximo'
      }
      return true
    }
  ]
})

function formatSlaDescription(days) {
  if (!days) return ''
  if (days === 1) return '1 dia'
  if (days <= 7) return `${days} dias`
  if (days <= 30) {
    const weeks = Math.floor(days / 7)
    const remainingDays = days % 7
    let result = `${weeks} semana${weeks > 1 ? 's' : ''}`
    if (remainingDays > 0) {
      result += ` e ${remainingDays} dia${remainingDays > 1 ? 's' : ''}`
    }
    return result
  }
  const months = Math.floor(days / 30)
  const remainingDays = days % 30
  let result = `${months} mês${months > 1 ? 'es' : ''}`
  if (remainingDays > 0) {
    result += ` e ${remainingDays} dia${remainingDays > 1 ? 's' : ''}`
  }
  return result
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
    CPF: 'mdi-card-account-details',
    CNPJ: 'mdi-domain',
    PHONE: 'mdi-phone',
    DROPDOWN: 'mdi-menu-down',
    TEXTAREA: 'mdi-text-long',
    CURRENCY: 'mdi-currency-brl'
  }
  return icons[type] || 'mdi-help-circle'
}

function getFieldTypeText(type) {
  const field = fieldTypes.find(f => f.value === type)
  return field?.title || type
}

function onResponsibleTypeChange() {
  localStepData.value.assignedToUserId = null
  localStepData.value.assignedToSectorId = null
}

function getFlowOptions() {
  const options = [
    { title: 'Próxima etapa', value: null, icon: 'mdi-arrow-right' },
    { title: 'Finalizar processo', value: 'END', icon: 'mdi-flag-checkered' },
    { title: 'Voltar para etapa anterior', value: 'PREVIOUS', icon: 'mdi-arrow-left' }
  ]

  props.steps.forEach((step, index) => {
    if (props.editingIndex === null || index !== props.editingIndex) {
      options.push({
        title: `Ir para: ${step.name}`,
        value: index + 1,
        icon: 'mdi-debug-step-into'
      })
    }
  })

  return options
}

function addInputField() {
  resetFieldData()
  fieldDialog.value = true
}

function editInputField(index) {
  editingFieldIndex.value = index
  fieldData.value = { ...inputConfig.value.fields[index] }
  fieldDialog.value = true
}

function removeInputField(index) {
  inputConfig.value.fields.splice(index, 1)
}

function resetFieldData() {
  editingFieldIndex.value = null
  fieldData.value = {
    name: '',
    label: '',
    type: 'TEXT',
    required: false,
    placeholder: '',
    defaultValue: '',
    helpText: ''
  }
}

function closeFieldDialog() {
  fieldDialog.value = false
  resetFieldData()
}

function saveInputField() {
  if (!fieldValid.value) return

  const field = {
    ...fieldData.value,
    tempId: editingFieldIndex.value !== null 
      ? inputConfig.value.fields[editingFieldIndex.value].tempId 
      : Date.now() + Math.random()
  }

  if (editingFieldIndex.value !== null) {
    inputConfig.value.fields[editingFieldIndex.value] = field
  } else {
    inputConfig.value.fields.push(field)
  }

  closeFieldDialog()
}

function close() {
  emit('close')
  emit('update:modelValue', false)
}

function save() {
  if (!stepValid.value) return

  if (!localStepData.value.allowAttachment) {
    localStepData.value.requireAttachment = false
    localStepData.value.minAttachments = null
    localStepData.value.maxAttachments = null
    localStepData.value.allowedFileTypes = []
  }

  const stepToSave = { ...localStepData.value }

  if (stepToSave.slaDays) {
    stepToSave.slaHours = stepToSave.slaDays * 24
    delete stepToSave.slaDays
  }

  if (stepToSave.type === 'INPUT' && inputConfig.value.fields.length > 0) {
    stepToSave.conditions = {
      fields: inputConfig.value.fields
    }
  } else if (stepToSave.type === 'APPROVAL') {
    stepToSave.actions = ['aprovar', 'reprovar']
    stepToSave.conditions = {
      requireJustification: true
    }
  }

  emit('save', stepToSave)
}

watch(() => props.modelValue, (newVal) => {
  if (newVal) {
    if (props.stepData) {
      localStepData.value = { ...props.stepData }
      
      if (props.stepData.slaHours) {
        localStepData.value.slaDays = Math.ceil(props.stepData.slaHours / 24)
      }
      
      responsibleType.value = props.stepData.assignedToUserId ? 'user' : 'sector'

      if (props.stepData.type === 'INPUT' && props.stepData.conditions) {
        try {
          const conditions = typeof props.stepData.conditions === 'string'
            ? JSON.parse(props.stepData.conditions)
            : props.stepData.conditions

          inputConfig.value = {
            fields: conditions.fields || []
          }
        } catch (e) {
          console.error('Error loading INPUT conditions:', e)
          inputConfig.value = { fields: [] }
        }
      } else {
        inputConfig.value = { fields: [] }
      }
    } else {
      localStepData.value = {
        name: '',
        description: '',
        type: 'INPUT',
        instructions: '',
        slaDays: null,
        allowAttachment: false,
        requiresSignature: false,
        requireAttachment: false,
        minAttachments: null,
        maxAttachments: null,
        allowedFileTypes: [],
        actions: [],
        assignedToUserId: null,
        assignedToSectorId: null,
        conditions: {}
      }
      responsibleType.value = 'sector'
      inputConfig.value = { fields: [] }
    }
    tab.value = 'basic'
  }
})

watch(() => localStepData.value.allowAttachment, (newValue) => {
  if (!newValue) {
    localStepData.value.requireAttachment = false
  }
})

watch(() => localStepData.value.type, (newType) => {
  if (newType !== 'INPUT') {
    inputConfig.value.fields = []
  }
})
</script>

<style scoped>
.v-expansion-panel-title {
  font-size: 0.875rem;
}

.v-card-title {
  font-size: 1rem;
  font-weight: 500;
}
</style>