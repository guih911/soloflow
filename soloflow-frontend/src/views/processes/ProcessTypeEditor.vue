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
          Campos do Formulário Principal
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
              <span>Campos do Formulário Principal</span>
              <v-btn color="primary" size="small" @click="addField(false)" prepend-icon="mdi-plus">
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
                    <v-btn icon="mdi-pencil" size="small" variant="text" @click="editField(index, false)" />
                    <v-btn icon="mdi-delete" size="small" variant="text" color="error" @click="removeField(index, false)" />
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
                      Instruções: {{ step.instructions.substring(0, 50) }}{{ step.instructions.length > 50 ? '...' : '' }}
                    </div>
                    <div v-if="step.type === 'INPUT'" class="mt-1">
                      <v-icon size="16">mdi-form-textbox</v-icon>
                      {{ getInputFieldsCount(step) }}
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
        <v-btn color="primary" variant="elevated" :loading="saving" :disabled="!valid || formData.steps.length === 0" @click="save">
          {{ isEditing ? 'Salvar Alterações' : 'Criar Tipo de Processo' }}
        </v-btn>
      </div>
    </v-form>

    <v-dialog v-model="fieldDialog" max-width="800" persistent>
      <v-card>
        <v-card-title>
          {{ editingFieldIndex !== null ? 'Editar' : 'Novo' }} Campo {{ isFieldForStep ? 'da Etapa' : 'do Formulário' }}
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

    <v-dialog v-model="stepDialog" max-width="800" persistent scrollable>
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
              <v-switch v-model="stepData.allowAttachment" label="Permitir Anexos" color="primary" />
              <v-switch v-model="stepData.requireAttachment" :disabled="!stepData.allowAttachment" label="Anexo Obrigatório" color="primary" class="mt-n4"/>
            </v-col>
            <v-col cols="12" md="6">
              <v-switch v-model="stepData.requiresSignature" label="Requer Assinatura" color="primary" />
            </v-col>

            <v-col cols="12">
              <v-textarea v-model="stepData.instructions" label="Instruções" rows="3"
                hint="Orientações para execução da etapa" persistent-hint />
            </v-col>

            <v-col v-if="stepData.type === 'INPUT'" cols="12">
              <v-divider class="my-4" />
              <div class="d-flex align-center justify-space-between mb-4">
                <h4 class="text-subtitle-1">
                  <v-icon start color="primary">mdi-form-textbox</v-icon>
                  Campos Dinâmicos da Etapa INPUT
                </h4>
                <v-btn color="primary" size="small" @click="addField(true)" prepend-icon="mdi-plus">
                  Adicionar Campo
                </v-btn>
              </div>

              <v-card variant="outlined">
                <v-card-text v-if="inputConfig.fields.length === 0" class="text-center py-6">
                  <v-icon size="32" color="grey-lighten-1">
                    mdi-form-select
                  </v-icon>
                  <p class="text-body-2 text-grey mt-2">
                    Nenhum campo específico para esta etapa INPUT.
                  </p>
                  <p class="text-caption text-grey">
                    Estes campos serão exibidos APENAS nesta etapa de entrada de dados.
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

                      <v-list-item-title class="font-weight-medium text-body-2">
                        {{ field.label }}
                        <v-chip v-if="field.required" size="x-small" color="error" class="ml-2">
                          Obrigatório
                        </v-chip>
                      </v-list-item-title>

                      <v-list-item-subtitle class="text-caption">
                        Nome: {{ field.name }} • Tipo: {{ getFieldTypeText(field.type) }}
                      </v-list-item-subtitle>

                      <template #append>
                        <v-btn icon="mdi-pencil" size="x-small" variant="text" @click="editField(index, true)" />
                        <v-btn icon="mdi-delete" size="x-small" variant="text" color="error" @click="removeField(index, true)" />
                      </template>
                    </v-list-item>
                    <v-divider v-if="index < inputConfig.fields.length - 1" />
                  </template>
                </v-list>
              </v-card>
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
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const route = useRoute()
const processTypeStore = useProcessTypeStore()
const sectorStore = useSectorStore()
const userStore = useUserStore()
const authStore = useAuthStore()

const valid = ref(false)
const fieldValid = ref(false)
const saving = ref(false)
const activeTab = ref('basic')
const fieldDialog = ref(false)
const stepDialog = ref(false)
const editingFieldIndex = ref(null)
const editingStepIndex = ref(null)
const isFieldForStep = ref(false)

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
  name: '', label: '', type: 'TEXT', placeholder: '', required: false, defaultValue: '', helpText: '', options: [], validations: {}
})

const stepData = ref({
  name: '', description: '', type: 'INPUT', instructions: '', slaHours: null, allowAttachment: false, requiresSignature: false, requireAttachment: false, actions: [], assignedToUserId: null, assignedToSectorId: null
})

const inputConfig = ref({
  fields: []
})

const isEditing = computed(() => !!route.params.id && route.params.id !== 'new')
const sectors = computed(() => sectorStore.sectors || [])
const users = computed(() => userStore.users || [])

const nameRules = [
  v => !!v || 'Nome é obrigatório',
  v => (v?.length ?? 0) >= 3 || 'Nome deve ter no mínimo 3 caracteres'
]

const fieldTypes = [
  { title: 'Texto', value: 'TEXT' }, { title: 'Número', value: 'NUMBER' }, { title: 'Data', value: 'DATE' }, { title: 'E-mail', value: 'EMAIL' }, { title: 'CPF', value: 'CPF' }, { title: 'CNPJ', value: 'CNPJ' }, { title: 'Telefone', value: 'PHONE' }, { title: 'Lista Suspensa', value: 'DROPDOWN' }, { title: 'Caixa de Seleção', value: 'CHECKBOX' }, { title: 'Área de Texto', value: 'TEXTAREA' }, { title: 'Moeda', value: 'CURRENCY' }, { title: 'Arquivo', value: 'FILE' }
]

const stepTypes = [
  { title: 'Entrada de Dados', value: 'INPUT' }, { title: 'Aprovação', value: 'APPROVAL' }, { title: 'Upload de Arquivo', value: 'UPLOAD' }, { title: 'Revisão', value: 'REVIEW' }, { title: 'Assinatura', value: 'SIGNATURE' }
]

watch(() => stepData.value.allowAttachment, (newValue) => {
  if (!newValue) {
    stepData.value.requireAttachment = false
  }
})

watch(() => stepData.value.type, (newType) => {
  if (newType !== 'INPUT') {
    inputConfig.value.fields = []
  }
})

function getFieldTypeColor(type) {
  const colors = { TEXT: 'blue', NUMBER: 'green', DATE: 'orange', EMAIL: 'purple', DROPDOWN: 'teal', FILE: 'red' }
  return colors[type] || 'grey'
}

function getFieldTypeIcon(type) {
  const icons = { TEXT: 'mdi-format-text', NUMBER: 'mdi-numeric', DATE: 'mdi-calendar', EMAIL: 'mdi-email', CPF: 'mdi-card-account-details', CNPJ: 'mdi-domain', PHONE: 'mdi-phone', DROPDOWN: 'mdi-menu-down', CHECKBOX: 'mdi-checkbox-marked', TEXTAREA: 'mdi-text-long', CURRENCY: 'mdi-currency-brl', FILE: 'mdi-paperclip' }
  return icons[type] || 'mdi-help-circle'
}

function getFieldTypeText(type) {
  const field = fieldTypes.find(f => f.value === type)
  return field?.title || type
}

function getStepTypeColor(type) {
  const colors = { INPUT: 'blue', APPROVAL: 'orange', UPLOAD: 'purple', REVIEW: 'teal', SIGNATURE: 'red' }
  return colors[type] || 'grey'
}

function getStepTypeText(type) {
  const step = stepTypes.find(s => s.value === type)
  return step?.title || type
}

function getResponsibleName(step) {
  if (step.assignedToUser?.name) return step.assignedToUser.name
  if (step.assignedToSector?.name) return step.assignedToSector.name
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
    const count = conditions?.fields?.length || 0
    return count > 0 ? `${count} campo(s) dinâmico(s)` : 'Nenhum campo dinâmico'
  } catch {
    return '0 campos dinâmicos'
  }
}

function addField(isForStep) {
  resetFieldData()
  isFieldForStep.value = isForStep
  fieldDialog.value = true
}

function editField(index, isForStep) {
  const fieldList = isForStep ? inputConfig.value.fields : formData.value.formFields
  const field = fieldList[index]
  editingFieldIndex.value = index
  isFieldForStep.value = isForStep
  fieldData.value = { ...field }
  fieldDialog.value = true
}

function removeField(index, isForStep) {
  const fieldList = isForStep ? inputConfig.value.fields : formData.value.formFields
  fieldList.splice(index, 1)
}

function resetFieldData() {
  editingFieldIndex.value = null
  fieldData.value = { name: '', label: '', type: 'TEXT', placeholder: '', required: false, defaultValue: '', helpText: '', options: [], validations: {} }
}

function closeFieldDialog() {
  fieldDialog.value = false
  resetFieldData()
}

function saveField() {
  if (!fieldValid.value) {
    window.showSnackbar?.('Por favor, corrija os erros no campo', 'error')
    return
  }
  
  const targetList = isFieldForStep.value ? inputConfig.value.fields : formData.value.formFields
  const isEditingField = editingFieldIndex.value !== null

  const field = {
    name: fieldData.value.name.trim(),
    label: fieldData.value.label.trim(),
    type: fieldData.value.type,
    placeholder: fieldData.value.placeholder?.trim() || null,
    required: Boolean(fieldData.value.required),
    defaultValue: fieldData.value.defaultValue?.trim() || null,
    helpText: fieldData.value.helpText?.trim() || null,
    tempId: isEditingField ? targetList[editingFieldIndex.value].tempId : Date.now() + Math.random(),
    order: isEditingField ? targetList[editingFieldIndex.value].order : (targetList.length + 1),
    options: fieldData.value.options || [],
    validations: fieldData.value.validations || {}
  }
  
  if (isEditingField) {
    targetList[editingFieldIndex.value] = field
  } else {
    targetList.push(field)
  }

  window.showSnackbar?.(`Campo "${field.label}" ${isEditingField ? 'atualizado' : 'adicionado'}`, 'success')
  closeFieldDialog()
}

function openStepDialog(index = null) {
  if (index !== null) {
    const step = formData.value.steps[index]
    editingStepIndex.value = index
    stepData.value = { ...step }

    if (step.type === 'INPUT' && step.conditions) {
      try {
        const conditions = typeof step.conditions === 'string'
          ? JSON.parse(step.conditions)
          : step.conditions
        inputConfig.value = {
          fields: conditions.fields || []
        }
      } catch {
        inputConfig.value = { fields: [] }
      }
    } else {
      inputConfig.value = { fields: [] }
    }
  } else {
    resetStepData()
  }
  stepDialog.value = true
}

function addStep() { openStepDialog() }
function editStep(index) { openStepDialog(index) }

function removeStep(index) {
  formData.value.steps.splice(index, 1)
}

function resetStepData() {
  editingStepIndex.value = null
  stepData.value = { name: '', description: '', instructions: '', slaHours: null, type: 'INPUT', allowAttachment: false, requiresSignature: false, requireAttachment: false, actions: [], assignedToUserId: null, assignedToSectorId: null }
  inputConfig.value = { fields: [] }
}

function closeStepDialog() {
  stepDialog.value = false
}

function saveStep() {
  const step = { ...stepData.value }
  
  if (step.type === 'INPUT' && inputConfig.value.fields.length > 0) {
    step.conditions = {
      fields: inputConfig.value.fields.map(field => ({
        name: field.name,
        label: field.label,
        type: field.type,
        placeholder: field.placeholder || undefined,
        required: Boolean(field.required),
        helpText: field.helpText || undefined,
        defaultValue: field.defaultValue || undefined,
        options: field.options || [],
        validations: field.validations || {}
      }))
    }
  } else if (step.type === 'APPROVAL') {
    step.actions = ['aprovar', 'reprovar']
    step.conditions = { requireJustification: true }
  }

  step.actions = Array.isArray(step.actions) ? step.actions : []
  step.allowedFileTypes = Array.isArray(step.allowedFileTypes) ? step.allowedFileTypes : []
  
  const isEditingStep = editingStepIndex.value !== null

  if (isEditingStep) {
    formData.value.steps[editingStepIndex.value] = { ...formData.value.steps[editingStepIndex.value], ...step }
  } else {
    formData.value.steps.push({ ...step, tempId: Date.now() + Math.random(), order: (formData.value.steps.length + 1) })
  }
  window.showSnackbar?.(`Etapa "${step.name}" ${isEditingStep ? 'atualizada' : 'adicionada'}`, 'success')
  closeStepDialog()
}

async function save() {
  saving.value = true
  try {
    const payload = {
      name: formData.value.name,
      description: formData.value.description,
      companyId: authStore.activeCompanyId,
      formFields: formData.value.formFields.map((f, idx) => ({ ...f, order: f.order ?? (idx + 1) })),
      steps: formData.value.steps.map((s, idx) => {
        const stepPayload = { ...s }
        return { ...stepPayload, order: stepPayload.order ?? (idx + 1) }
      })
    }

    if (isEditing.value) {
      await processTypeStore.updateProcessType(formData.value.id, payload)
      window.showSnackbar?.('Tipo de processo atualizado com sucesso!', 'success')
    } else {
      if (!payload.companyId) {
        window.showSnackbar?.('Erro: ID da empresa não encontrado.', 'error')
        saving.value = false
        return
      }
      await processTypeStore.createProcessType(payload)
      window.showSnackbar?.('Tipo de processo criado com sucesso!', 'success')
    }
    router.push({ name: 'ProcessTypes' })
  } catch (e) {
    console.error(e)
    window.showSnackbar?.(e.response?.data?.message || 'Erro ao salvar', 'error')
  } finally {
    saving.value = false
  }
}

function goBack() {
  router.back()
}

onMounted(async () => {
  try {
    await Promise.all([
      sectorStore.fetchSectors?.(),
      userStore.fetchUsers?.()
    ])

    if (isEditing.value) {
      await processTypeStore.fetchProcessType(route.params.id)
      const current = processTypeStore.currentProcessType
      if (current) {
        formData.value = {
          id: current.id,
          name: current.name || '',
          description: current.description || '',
          steps: Array.isArray(current.steps) ? [...current.steps] : [],
          formFields: Array.isArray(current.formFields) ? [...current.formFields] : []
        }
      }
    }
  } catch (e) {
    console.error(e)
    window.showSnackbar?.('Erro ao carregar dados', 'error')
  }
})
</script>