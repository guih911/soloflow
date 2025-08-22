<template>
  <div>
    <div class="d-flex align-center mb-6">
      <v-btn icon="mdi-arrow-left" variant="text" @click="goBack" />
      <div class="ml-4">
        <h1 class="text-h4 font-weight-bold">
          {{ isEditing ? 'Editar' : 'Novo' }} Tipo de Processo
        </h1>
        <p class="text-subtitle-1 text-medium-emphasis">
          Configure o fluxo de trabalho, campos e etapas
        </p>
      </div>
    </div>

    <v-form ref="form" v-model="valid">
      <v-tabs v-model="activeTab" class="mb-6">
        <v-tab value="basic">
          <v-icon start>mdi-information</v-icon>
          Informações Básicas
        </v-tab>
        <v-tab value="fields">
          <v-icon start>mdi-form-textbox</v-icon>
          Campos do Formulário
          <v-chip v-if="formData.formFields.length > 0" size="small" class="ml-2">
            {{ formData.formFields.length }}
          </v-chip>
        </v-tab>
        <v-tab value="steps">
          <v-icon start>mdi-debug-step-over</v-icon>
          Etapas do Processo
          <v-chip v-if="formData.steps.length > 0" size="small" class="ml-2">
            {{ formData.steps.length }}
          </v-chip>
        </v-tab>
      </v-tabs>

      <v-window v-model="activeTab">
        <v-window-item value="basic">
          <v-card>
            <v-card-text>
              <v-row>
                <v-col cols="12" md="6">
                  <v-text-field v-model="formData.name" label="Nome do Processo" :rules="nameRules" required />
                </v-col>
                <v-col cols="12">
                  <v-textarea v-model="formData.description" label="Descrição" rows="3" counter="500" />
                </v-col>
              </v-row>
            </v-card-text>
          </v-card>
        </v-window-item>

        <v-window-item value="fields">
          <v-card>
            <v-card-title class="d-flex align-center justify-space-between">
              <span>Campos do Formulário</span>
              <v-btn color="primary" size="small" @click="addField" prepend-icon="mdi-plus">
                Adicionar Campo
              </v-btn>
            </v-card-title>
            <v-divider />

            <v-card-text v-if="formData.formFields.length === 0" class="text-center py-8">
              <v-icon size="48" color="grey-lighten-1">
                mdi-form-textbox
              </v-icon>
              <p class="text-body-1 text-grey mt-2">
                Nenhum campo adicionado
              </p>
              <p class="text-body-2 text-grey">
                Adicione campos que serão preenchidos ao iniciar o processo
              </p>
            </v-card-text>

            <v-list v-else lines="three">
              <template v-for="(field, index) in formData.formFields" :key="field.id || field.tempId || index">
                <v-list-item class="px-4 py-3">
                  <template #prepend>
                    <v-icon class="mr-3" color="grey">mdi-drag</v-icon>
                    <v-avatar :color="getFieldTypeColor(field.type)" size="40">
                      <v-icon :icon="getFieldTypeIcon(field.type)" size="20" />
                    </v-avatar>
                  </template>

                  <v-list-item-title class="font-weight-medium">
                    {{ field.label }}
                    <v-chip v-if="field.required" size="x-small" color="error" class="ml-2">
                      Obrigatório
                    </v-chip>
                  </v-list-item-title>

                  <v-list-item-subtitle>
                    <div>
                      <v-icon size="16">mdi-code-tags</v-icon>
                      Nome: {{ field.name }}
                      <span class="mx-2">•</span>
                      <v-icon size="16">mdi-format-list-bulleted-type</v-icon>
                      Tipo: {{ getFieldTypeText(field.type) }}
                    </div>
                    <div v-if="field.placeholder" class="mt-1">
                      <v-icon size="16">mdi-form-textbox-hint</v-icon>
                      {{ field.placeholder }}
                    </div>
                  </v-list-item-subtitle>

                  <template #append>
                    <v-btn icon="mdi-pencil" size="small" variant="text" @click="editField(index)" />
                    <v-btn icon="mdi-delete" size="small" variant="text" color="error" @click="removeField(index)" />
                  </template>
                </v-list-item>
                <v-divider v-if="index < formData.formFields.length - 1" />
              </template>
            </v-list>
          </v-card>
        </v-window-item>

        <v-window-item value="steps">
          <v-card>
            <v-card-title class="d-flex align-center justify-space-between">
              <span>Etapas do Processo</span>
              <v-btn color="primary" size="small" @click="addStep" prepend-icon="mdi-plus">
                Adicionar Etapa
              </v-btn>
            </v-card-title>
            <v-divider />

            <v-card-text v-if="formData.steps.length === 0" class="text-center py-8">
              <v-icon size="48" color="grey-lighten-1">
                mdi-debug-step-over
              </v-icon>
              <p class="text-body-1 text-grey mt-2">
                Nenhuma etapa adicionada
              </p>
              <p class="text-body-2 text-grey">
                Adicione as etapas que compõem o fluxo do processo
              </p>
            </v-card-text>

            <v-list v-else lines="three">
              <template v-for="(step, index) in formData.steps" :key="step.id || step.tempId || index">
                <v-list-item class="px-4 py-3">
                  <template #prepend>
                    <v-icon class="mr-3" color="grey">mdi-drag</v-icon>
                    <v-avatar :color="getStepTypeColor(step.type)" size="40">
                      <span class="text-h6">{{ index + 1 }}</span>
                    </v-avatar>
                  </template>

                  <v-list-item-title class="font-weight-medium">
                    {{ step.name }}
                    <v-chip size="x-small" class="ml-2" variant="tonal">
                      {{ getStepTypeText(step.type) }}
                    </v-chip>
                  </v-list-item-title>

                  <v-list-item-subtitle>
                    <div v-if="step.assignedToSectorId || step.assignedToUserId">
                      <v-icon size="16">mdi-account-check</v-icon>
                      Responsável: {{ getResponsibleName(step) }}
                    </div>
                    <div v-if="step.slaHours" class="mt-1">
                      <v-icon size="16">mdi-clock-outline</v-icon>
                      SLA: {{ formatSlaText(step.slaHours) }}
                    </div>
                    <div v-if="step.instructions" class="mt-1">
                      <v-icon size="16">mdi-text-box</v-icon>
                      Instruções: {{ step.instructions.substring(0, 50) }}{{ step.instructions.length > 50 ? '...' : ''
                      }}
                    </div>
                    <div v-if="step.type === 'INPUT' && step.conditions" class="mt-1">
                      <v-icon size="16">mdi-form-textbox</v-icon>
                      Campos configurados: {{ getInputFieldsCount(step) }}
                    </div>
                    <div class="mt-1">
                      <v-chip v-if="step.allowAttachment" size="x-small" class="mr-1">
                        <v-icon start size="12">mdi-paperclip</v-icon>
                        Anexos{{ step.requireAttachment ? ' (obrigatório)' : '' }}
                      </v-chip>
                      <v-chip v-if="step.requiresSignature" size="x-small" class="mr-1">
                        <v-icon start size="12">mdi-draw-pen</v-icon>
                        Assinatura
                      </v-chip>
                      <v-chip v-if="step.actions?.length > 0" size="x-small">
                        {{ step.actions.length }} ações
                      </v-chip>
                    </div>
                  </v-list-item-subtitle>

                  <template #append>
                    <v-btn icon="mdi-pencil" size="small" variant="text" @click="editStep(index)" />
                    <v-btn icon="mdi-delete" size="small" variant="text" color="error" @click="removeStep(index)" />
                  </template>
                </v-list-item>
                <v-divider v-if="index < formData.steps.length - 1" />
              </template>
            </v-list>
          </v-card>
        </v-window-item>
      </v-window>

      <div class="d-flex justify-end mt-6 gap-2">
        <v-btn variant="text" @click="goBack">
          Cancelar
        </v-btn>
        <v-btn color="primary" variant="elevated" :loading="saving" :disabled="!valid || formData.steps.length === 0"
          @click="save">
          {{ isEditing ? 'Salvar' : 'Criar' }}
        </v-btn>
      </div>
    </v-form>

    <!-- Dialog de Campo -->
    <v-dialog v-model="fieldDialog" max-width="800" persistent>
      <v-card>
        <v-card-title>
          {{ editingFieldIndex !== null ? 'Editar' : 'Novo' }} Campo
        </v-card-title>
        <v-divider />

        <v-form ref="fieldForm" v-model="fieldValid">
          <v-card-text>
            <v-row>
              <v-col cols="12" md="6">
                <v-text-field v-model="fieldData.name" label="Nome do Campo (identificador)"
                  :rules="[v => !!v || 'Nome é obrigatório', v => /^[a-zA-Z][a-zA-Z0-9_]*$/.test(v) || 'Use apenas letras, números e underscore']"
                  hint="Ex: data_nascimento, valor_total" persistent-hint required />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field v-model="fieldData.label" label="Rótulo (exibido ao usuário)"
                  :rules="[v => !!v || 'Rótulo é obrigatório']" required />
              </v-col>
              <v-col cols="12" md="6">
                <v-select v-model="fieldData.type" :items="fieldTypes" label="Tipo de Campo"
                  :rules="[v => !!v || 'Tipo é obrigatório']" required />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field v-model="fieldData.placeholder" label="Placeholder" />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field v-model="fieldData.defaultValue" label="Valor Padrão" />
              </v-col>
              <v-col cols="12" md="6">
                <v-switch v-model="fieldData.required" label="Campo Obrigatório" color="primary" />
              </v-col>
              <v-col cols="12">
                <v-textarea v-model="fieldData.helpText" label="Texto de Ajuda" rows="2" />
              </v-col>
            </v-row>
          </v-card-text>

          <v-divider />

          <v-card-actions>
            <v-spacer />
            <v-btn variant="text" @click="closeFieldDialog">
              Cancelar
            </v-btn>
            <v-btn color="primary" variant="elevated" :disabled="!fieldValid" @click="saveField">
              {{ editingFieldIndex !== null ? 'Salvar' : 'Adicionar' }}
            </v-btn>
          </v-card-actions>
        </v-form>
      </v-card>
    </v-dialog>

    <!-- Dialog de Etapa -->
    <v-dialog v-model="stepDialog" max-width="700" persistent>
      <v-card>
        <v-card-title>
          {{ editingStepIndex !== null ? 'Editar' : 'Nova' }} Etapa
        </v-card-title>
        <v-divider />

        <v-card-text>
          <v-row>
            <v-col cols="12">
              <v-text-field v-model="stepData.name" label="Nome da Etapa" required />
            </v-col>
            <v-col cols="12">
              <v-textarea v-model="stepData.description" label="Descrição" rows="2" />
            </v-col>
            <v-col cols="12" md="6">
              <v-select v-model="stepData.type" :items="stepTypes" label="Tipo de Etapa" required />
            </v-col>
            <v-col cols="12" md="6">
              <v-select v-model="stepData.assignedToSectorId" :items="sectors" item-title="name" item-value="id"
                label="Setor Responsável" clearable />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field v-model.number="stepData.slaHours" label="SLA (Prazo em horas)" type="number" min="1"
                max="8760" hint="Tempo limite para conclusão da etapa" persistent-hint />
            </v-col>
            <v-col cols="12" md="6">
              <v-textarea v-model="stepData.instructions" label="Instruções" rows="2"
                hint="Orientações para execução da etapa" persistent-hint />
            </v-col>

            <!-- Configuração de Entrada de Dados -->
            <v-col v-if="stepData.type === 'INPUT'" cols="12">
              <v-divider class="my-4" />
              <h4 class="text-subtitle-1 mb-4">
                <v-icon start color="primary">mdi-form-textbox</v-icon>
                Configuração de Entrada de Dados
              </h4>

              <!-- Campos Visíveis -->
              <v-select v-model="inputConfig.visibleFields" :items="availableFieldsForStep" item-title="title"
                item-value="value" label="Campos Visíveis" multiple chips closable-chips
                hint="Selecione os campos que serão exibidos nesta etapa" persistent-hint class="mb-4" />

              <!-- Campos Obrigatórios -->
              <v-select v-model="inputConfig.requiredFields" :items="selectedVisibleFields" item-title="title"
                item-value="value" label="Campos Obrigatórios" multiple chips closable-chips
                hint="Marque os campos que devem ser preenchidos obrigatoriamente" persistent-hint />
            </v-col>
          </v-row>
        </v-card-text>

        <v-divider />

        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="closeStepDialog">
            Cancelar
          </v-btn>
          <v-btn color="primary" variant="elevated" @click="saveStep">
            {{ editingStepIndex !== null ? 'Salvar' : 'Adicionar' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useProcessTypeStore } from '@/stores/processTypes'
import { useSectorStore } from '@/stores/sectors'
import { useUserStore } from '@/stores/users'

const router = useRouter()
const route = useRoute()
const processTypeStore = useProcessTypeStore()
const sectorStore = useSectorStore()
const userStore = useUserStore()

// Estado
const valid = ref(false)
const fieldValid = ref(false)
const saving = ref(false)
const activeTab = ref('basic')
const fieldDialog = ref(false)
const stepDialog = ref(false)
const editingFieldIndex = ref(null)
const editingStepIndex = ref(null)

const form = ref(null)
const fieldForm = ref(null)

const formData = ref({
  id: null,
  name: '',
  description: '',
  steps: [],
  formFields: []
})

const fieldData = ref({
  name: '',
  label: '',
  type: 'TEXT',
  placeholder: '',
  required: false,
  defaultValue: '',
  helpText: '',
  options: [],
  validations: {}
})

const stepData = ref({
  name: '',
  description: '',
  type: 'INPUT',
  instructions: '',
  slaHours: null,
  allowAttachment: false,
  requiresSignature: false,
  requireAttachment: false,
  actions: [],
  assignedToUserId: null,
  assignedToSectorId: null
})

// Configuração de INPUT
const inputConfig = ref({
  visibleFields: [],
  requiredFields: [],
  overrides: {},
  prefillFrom: []
})

// Computed
const isEditing = computed(() => !!route.params.id && route.params.id !== 'new')
const sectors = computed(() => sectorStore.sectors || [])
const users = computed(() => userStore.users || [])

// Campos disponíveis para etapa INPUT
const availableFieldsForStep = computed(() => {
  const fields =
    formData.value?.formFields ??
    formData.value?.fields ??
    formData.value?.form_fields ??
    [];

  return fields.map(f => ({
    title: f.label || f.name || f.fieldLabel || 'Campo',
    value: f.name || f.fieldName || f.key
  }));
});

// Campos visíveis selecionados
const selectedVisibleFields = computed(() => {
  return (inputConfig.value.visibleFields || []).map(fieldName => {
    const field = (formData.value.formFields || []).find(f => f.name === fieldName)
    return field ? {
      title: field.label,
      value: field.name
    } : null
  }).filter(Boolean)
})

// Regras
const nameRules = [
  v => !!v || 'Nome é obrigatório',
  v => (v?.length ?? 0) >= 3 || 'Nome deve ter no mínimo 3 caracteres'
]

// Opções
const fieldTypes = [
  { title: 'Texto', value: 'TEXT' },
  { title: 'Número', value: 'NUMBER' },
  { title: 'Data', value: 'DATE' },
  { title: 'E-mail', value: 'EMAIL' },
  { title: 'CPF', value: 'CPF' },
  { title: 'CNPJ', value: 'CNPJ' },
  { title: 'Telefone', value: 'PHONE' },
  { title: 'Lista Suspensa', value: 'DROPDOWN' },
  { title: 'Caixa de Seleção', value: 'CHECKBOX' },
  { title: 'Área de Texto', value: 'TEXTAREA' },
  { title: 'Moeda', value: 'CURRENCY' },
  { title: 'Arquivo', value: 'FILE' }
]

const stepTypes = [
  { title: 'Entrada de Dados', value: 'INPUT' },
  { title: 'Aprovação', value: 'APPROVAL' },
  { title: 'Upload de Arquivo', value: 'UPLOAD' },
  { title: 'Revisão', value: 'REVIEW' },
  { title: 'Assinatura', value: 'SIGNATURE' }
]

// Métodos auxiliares - Campos
function getFieldTypeColor(type) {
  const colors = {
    TEXT: 'blue',
    NUMBER: 'green',
    DATE: 'orange',
    EMAIL: 'purple',
    DROPDOWN: 'teal',
    FILE: 'red'
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
    CHECKBOX: 'mdi-checkbox-marked',
    TEXTAREA: 'mdi-text-long',
    CURRENCY: 'mdi-currency-brl',
    FILE: 'mdi-paperclip'
  }
  return icons[type] || 'mdi-help-circle'
}

function getFieldTypeText(type) {
  const field = fieldTypes.find(f => f.value === type)
  return field?.title || type
}

// Métodos auxiliares - Etapas
function getStepTypeColor(type) {
  const colors = {
    INPUT: 'blue',
    APPROVAL: 'orange',
    UPLOAD: 'purple',
    REVIEW: 'teal',
    SIGNATURE: 'red'
  }
  return colors[type] || 'grey'
}

function getStepTypeText(type) {
  const step = stepTypes.find(s => s.value === type)
  return step?.title || type
}

function getResponsibleName(step) {
  if (step.assignedToUser?.name) {
    return step.assignedToUser.name
  }
  if (step.assignedToSector?.name) {
    return step.assignedToSector.name
  }
  if (step.assignedToUserId) {
    const user = users.value.find(u => u.id === step.assignedToUserId)
    return user?.name || 'Usuário'
  }
  if (step.assignedToSectorId) {
    const sector = sectors.value.find(s => s.id === step.assignedToSectorId)
    return sector?.name || 'Setor'
  }
  return 'Não definido'
}

function formatSlaText(hours) {
  if (!hours) return ''
  if (hours <= 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  const remainingHours = hours % 24
  return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days} dia(s)`
}

function getInputFieldsCount(step) {
  try {
    const conditions = typeof step.conditions === 'string'
      ? JSON.parse(step.conditions)
      : step.conditions
    const visible = conditions?.visibleFields?.length || 0
    const required = conditions?.requiredFields?.length || 0
    return `${visible} visíveis, ${required} obrigatórios`
  } catch {
    return '0 campos'
  }
}

// Watch para limpar campos obrigatórios quando visíveis mudam
watch(() => inputConfig.value.visibleFields, (newFields) => {
  inputConfig.value.requiredFields = (inputConfig.value.requiredFields || []).filter(
    field => (newFields || []).includes(field)
  )
})

// Métodos - Campos
function addField() {
  resetFieldData()
  fieldDialog.value = true
}

function editField(index) {
  const field = formData.value.formFields[index]
  editingFieldIndex.value = index

  fieldData.value = {
    name: field.name,
    label: field.label,
    type: field.type,
    placeholder: field.placeholder || '',
    required: !!field.required,
    defaultValue: field.defaultValue || '',
    helpText: field.helpText || '',
    options: field.options ? [...field.options] : [],
    validations: field.validations ? { ...field.validations } : {}
  }

  fieldDialog.value = true
}

function removeField(index) {
  const removed = formData.value.formFields.splice(index, 1)
  // TODO: implementar remoção via API quando necessário
  if (removed[0]?.id) {
    console.warn('Remoção via API ainda não implementada no store.')
  }
}

function resetFieldData() {
  editingFieldIndex.value = null
  fieldData.value = {
    name: '',
    label: '',
    type: 'TEXT',
    placeholder: '',
    required: false,
    defaultValue: '',
    helpText: '',
    options: [],
    validations: {}
  }
}

function closeFieldDialog() {
  fieldDialog.value = false
  resetFieldData()
}

async function saveField() {
  if (!fieldValid.value) {
    window.showSnackbar?.('Por favor, corrija os erros no campo', 'error')
    return
  }

  const field = {
    name: fieldData.value.name.trim(),
    label: fieldData.value.label.trim(),
    type: fieldData.value.type,
    placeholder: fieldData.value.placeholder?.trim() || null,
    required: Boolean(fieldData.value.required),
    defaultValue: fieldData.value.defaultValue?.trim() || null,
    helpText: fieldData.value.helpText?.trim() || null,
    tempId: editingFieldIndex.value !== null
      ? formData.value.formFields[editingFieldIndex.value].tempId
      : Date.now() + Math.random(),
    order: editingFieldIndex.value !== null
      ? formData.value.formFields[editingFieldIndex.value].order
      : (formData.value.formFields.length + 1),
    options: fieldData.value.options || [],
    validations: fieldData.value.validations || {}
  }

  // Criação/edição local ou via API
  if (isEditing.value && formData.value.id) {
    if (editingFieldIndex.value !== null && formData.value.formFields[editingFieldIndex.value]?.id) {
      // Sem endpoint para update no store: apenas atualiza localmente
      formData.value.formFields[editingFieldIndex.value] = {
        ...formData.value.formFields[editingFieldIndex.value],
        ...field
      }
      window.showSnackbar?.(`Campo "${field.label}" atualizado (local)`, 'success')
    } else {
      // Adiciona via API
      try {
        await processTypeStore.addFormField(formData.value.id, field)
        formData.value = { ...processTypeStore.currentProcessType }
        window.showSnackbar?.(`Campo "${field.label}" adicionado`, 'success')
      } catch (e) {
        console.error(e)
        window.showSnackbar?.('Erro ao adicionar campo', 'error')
      }
    }
  } else {
    // Fluxo de criação (local)
    if (editingFieldIndex.value !== null) {
      formData.value.formFields[editingFieldIndex.value] = field
    } else {
      formData.value.formFields.push(field)
    }
    window.showSnackbar?.(`Campo "${field.label}" ${editingFieldIndex.value !== null ? 'atualizado' : 'adicionado'}`, 'success')
  }

  closeFieldDialog()
}

// Métodos - Etapas
function openStepDialog(index = null) {
  if (index !== null) {
    // Editando etapa existente
    const step = formData.value.steps[index]
    editingStepIndex.value = index

    stepData.value = {
      name: step.name,
      description: step.description || '',
      type: step.type,
      instructions: step.instructions || '',
      slaHours: step.slaHours || null,
      allowAttachment: !!step.allowAttachment,
      requiresSignature: !!step.requiresSignature,
      requireAttachment: !!step.requireAttachment,
      actions: step.actions || [],
      assignedToUserId: step.assignedToUserId || null,
      assignedToSectorId: step.assignedToSectorId || null
    }

    // Carregar configuração INPUT se existir
    if (step.type === 'INPUT' && step.conditions) {
      try {
        const conditions = typeof step.conditions === 'string'
          ? JSON.parse(step.conditions)
          : step.conditions

        inputConfig.value = {
          visibleFields: conditions.visibleFields || [],
          requiredFields: conditions.requiredFields || [],
          overrides: conditions.overrides || {},
          prefillFrom: conditions.prefillFrom || []
        }
      } catch {
        inputConfig.value = {
          visibleFields: [],
          requiredFields: [],
          overrides: {},
          prefillFrom: []
        }
      }
    } else {
      inputConfig.value = {
        visibleFields: [],
        requiredFields: [],
        overrides: {},
        prefillFrom: []
      }
    }
  } else {
    // Nova etapa
    resetStepData()
  }

  stepDialog.value = true
}

function addStep() {
  openStepDialog()
}

function editStep(index) {
  openStepDialog(index)
}

function removeStep(index) {
  const removed = formData.value.steps.splice(index, 1)
  if (removed[0]?.id) {
    console.warn('Remoção de etapa via API ainda não implementada no store.')
  }
}

function resetStepData() {
  editingStepIndex.value = null
  stepData.value = {
    name: '',
    description: '',
    instructions: '',
    slaHours: null,
    type: 'INPUT',
    allowAttachment: false,
    requiresSignature: false,
    requireAttachment: false,
    actions: [],
    assignedToUserId: null,
    assignedToSectorId: null
  }
  inputConfig.value = {
    visibleFields: [],
    requiredFields: [],
    overrides: {},
    prefillFrom: []
  }
}

function closeStepDialog() {
  stepDialog.value = false
}

function buildStepFromDialog() {
  const base = {
    name: stepData.value.name.trim(),
    description: stepData.value.description?.trim() || null,
    type: stepData.value.type,
    instructions: stepData.value.instructions?.trim() || null,
    slaHours: stepData.value.slaHours || null,
    allowAttachment: !!stepData.value.allowAttachment,
    requireAttachment: !!stepData.value.requireAttachment,
    requiresSignature: !!stepData.value.requiresSignature,
    assignedToUserId: stepData.value.assignedToUserId || null,
    assignedToSectorId: stepData.value.assignedToSectorId || null,
    actions: stepData.value.actions || []
  }
  if (base.type === 'INPUT') {
    base.conditions = {
      visibleFields: inputConfig.value.visibleFields || [],
      requiredFields: inputConfig.value.requiredFields || [],
      overrides: inputConfig.value.overrides || {},
      prefillFrom: inputConfig.value.prefillFrom || []
    }
  } else {
    base.conditions = {}
  }
  return base
}

async function saveStep() {
  const step = buildStepFromDialog()

  if (isEditing.value && formData.value.id) {
    const isExistingWithId = editingStepIndex.value !== null && formData.value.steps[editingStepIndex.value]?.id
    if (isExistingWithId) {
      // Sem endpoint de update: atualiza localmente
      formData.value.steps[editingStepIndex.value] = {
        ...formData.value.steps[editingStepIndex.value],
        ...step
      }
      window.showSnackbar?.(`Etapa "${step.name}" atualizada (local)`, 'success')
    } else {
      try {
        await processTypeStore.addStep(formData.value.id, step)
        formData.value = { ...processTypeStore.currentProcessType }
        window.showSnackbar?.(`Etapa "${step.name}" adicionada`, 'success')
      } catch (e) {
        console.error(e)
        window.showSnackbar?.('Erro ao adicionar etapa', 'error')
      }
    }
  } else {
    // Fluxo local (criação do processo)
    if (editingStepIndex.value !== null) {
      formData.value.steps[editingStepIndex.value] = {
        ...formData.value.steps[editingStepIndex.value],
        ...step
      }
    } else {
      formData.value.steps.push({
        ...step,
        tempId: Date.now() + Math.random(),
        order: (formData.value.steps.length + 1)
      })
    }
    window.showSnackbar?.(`Etapa "${step.name}" ${editingStepIndex.value !== null ? 'atualizada' : 'adicionada'}`, 'success')
  }

  closeStepDialog()
}

// Persistência
async function save() {
  saving.value = true
  try {
    if (isEditing.value && formData.value.id) {
      await processTypeStore.updateProcessType(formData.value.id, {
        name: formData.value.name,
        description: formData.value.description
      })
      window.showSnackbar?.('Tipo de processo atualizado', 'success')
    } else {
      // Criar novo tipo com campos e etapas
      const payload = {
        name: formData.value.name,
        description: formData.value.description,
        formFields: formData.value.formFields.map((f, idx) => ({
          ...f,
          order: f.order ?? (idx + 1)
        })),
        steps: formData.value.steps.map((s, idx) => ({
          ...s,
          order: s.order ?? (idx + 1),
          // garantir que conditions esteja em objeto
          conditions: s.conditions || {}
        }))
      }
      const created = await processTypeStore.createProcessType(payload)
      formData.value = { ...created }
      window.showSnackbar?.('Tipo de processo criado', 'success')
      // Redireciona para tela de edição
      router.replace({ name: route.name || 'process-type-edit', params: { id: created.id, action: 'edit' } })
    }
  } catch (e) {
    console.error(e)
    window.showSnackbar?.('Erro ao salvar', 'error')
  } finally {
    saving.value = false
  }
}

function goBack() {
  router.back()
}

// Bootstrap
onMounted(async () => {
  try {
    // Carregar setores e usuários (se as actions existirem)
    if (typeof sectorStore.fetchSectors === 'function') {
      await sectorStore.fetchSectors()
    }
    if (typeof userStore.fetchUsers === 'function') {
      await userStore.fetchUsers()
    }

    if (isEditing.value) {
      await processTypeStore.fetchProcessType(route.params.id)
      const current = processTypeStore.currentProcessType
      if (current) {
        formData.value = {
          id: current.id,
          name: current.name || '',
          description: current.description || '',
          steps: Array.isArray(current.steps) ? [...current.steps] : [],
          formFields: Array.isArray(current.formFields ?? current.fields ?? current.form_fields)
            ? [...(current.formFields ?? current.fields ?? current.form_fields)]
            : []
        }
      }
    }
  } catch (e) {
    console.error(e)
  }
})
</script>
