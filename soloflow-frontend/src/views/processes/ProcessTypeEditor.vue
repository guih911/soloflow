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
                <v-list-item
                  class="px-4 py-3 draggable-field"
                  :class="{ 'dragging-over': dragOverFieldIndex === index }"
                  draggable="true"
                  @dragstart="onFieldDragStart($event, index)"
                  @dragend="onFieldDragEnd"
                  @dragover="onFieldDragOver($event, index)"
                  @dragleave="onFieldDragLeave"
                  @drop="onFieldDrop($event, index)"
                >
                  <template #prepend>
                    <v-icon class="mr-3 drag-handle" color="grey" style="cursor: grab;">mdi-drag-vertical</v-icon>
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
                <v-list-item
                  class="px-4 py-3 draggable-step"
                  :class="{ 'dragging-over': dragOverStepIndex === index }"
                  draggable="true"
                  @dragstart="onStepDragStart($event, index)"
                  @dragend="onStepDragEnd"
                  @dragover="onStepDragOver($event, index)"
                  @dragleave="onStepDragLeave"
                  @drop="onStepDrop($event, index)"
                >
                  <template #prepend>
                    <v-icon class="mr-3 drag-handle" color="grey" style="cursor: grab;">mdi-drag-vertical</v-icon>
                    <v-avatar :color="getStepTypeColor(step.type)" size="40">
                      <span class="text-h6">{{ index + 1 }}</span>
                    </v-avatar>
                  </template>

                  <v-list-item-title class="font-weight-medium">
                    {{ step.name }}
                    <v-chip size="x-small" class="ml-2" variant="tonal">
                      {{ getStepTypeText(step.type) }}
                    </v-chip>
                    <v-chip v-if="step.assignedToCreator" size="x-small" color="purple" class="ml-2" variant="tonal">
                      <v-icon start size="12">mdi-account-plus</v-icon>
                      Criador
                    </v-chip>
                  </v-list-item-title>

                  <v-list-item-subtitle>
                    <div v-if="!step.assignedToCreator && (step.assignedToSectorId || step.assignedToUserId)">
                      <v-icon size="16">mdi-account-check</v-icon>
                      Responsável: {{ getResponsibleName(step) }}
                    </div>
                    <div v-if="step.assignmentConditions">
                      <v-icon size="16">mdi-code-braces</v-icon>
                      Atribuição condicional configurada
                    </div>
                    <div v-if="step.slaDays" class="mt-1">
                      <v-icon size="16">mdi-clock-outline</v-icon>
                      SLA: {{ step.slaDays }} dia(s)
                    </div>
                    <div v-if="step.instructions" class="mt-1">
                      <v-icon size="16">mdi-text-box</v-icon>
                      Instruções: {{ step.instructions.substring(0, 50) }}{{ step.instructions.length > 50 ? '...' : '' }}
                    </div>
                    <div v-if="step.type === 'INPUT'" class="mt-1">
                      <v-icon size="16">mdi-form-textbox</v-icon>
                      {{ getInputFieldsCount(step) }}
                    </div>
                    <div v-if="step.reuseData" class="mt-1">
                      <v-icon size="16">mdi-refresh</v-icon>
                      Reutiliza dados de {{ getReuseDataCount(step.reuseData) }} campo(s)
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
                      <v-chip v-if="step.flowConditions" size="x-small" color="info" class="ml-1">
                        <v-icon start size="12">mdi-arrow-decision</v-icon>
                        Fluxo condicional
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

    <!-- Dialog de Campo -->
    <v-dialog v-model="fieldDialog" max-width="800" persistent>
      <v-card>
        <v-card-title>
          {{ editingFieldIndex !== null ? 'Editar' : 'Novo' }} Campo do Formulário
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

    <!-- StepDialog Component Integration -->
    <StepDialog
      v-model="stepDialog"
      :step-data="editingStepData"
      :editing-index="editingStepIndex"
      :sectors="sectors"
      :users="users"
      :steps="formData.steps"
      :form-fields="formData.formFields"
      @save="handleStepSave"
      @close="handleStepClose"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useProcessTypeStore } from '@/stores/processTypes'
import { useSectorStore } from '@/stores/sectors'
import { useUserStore } from '@/stores/users'
import { useAuthStore } from '@/stores/auth'
import StepDialog from '@/components/StepDialog.vue'

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
const editingStepData = ref(null)

const form = ref(null)
const fieldForm = ref(null)

// Drag and drop state
const draggedFieldIndex = ref(null)
const dragOverFieldIndex = ref(null)
const draggedStepIndex = ref(null)
const dragOverStepIndex = ref(null)

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

const isEditing = computed(() => !!route.params.id && route.params.id !== 'new')
const sectors = computed(() => sectorStore.sectors || [])
const users = computed(() => userStore.users || [])

const nameRules = [
  v => !!v || 'Nome é obrigatório',
  v => (v?.length ?? 0) >= 3 || 'Nome deve ter no mínimo 3 caracteres'
]

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

function getFieldTypeColor(type) {
  const colors = { TEXT: 'blue', NUMBER: 'green', DATE: 'orange', EMAIL: 'purple', DROPDOWN: 'teal', FILE: 'red' }
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

function getStepTypeColor(type) {
  const colors = { INPUT: 'blue', APPROVAL: 'orange', UPLOAD: 'purple', REVIEW: 'teal', SIGNATURE: 'red' }
  return colors[type] || 'grey'
}

function getStepTypeText(type) {
  const stepTypes = [
    { title: 'Entrada de Dados', value: 'INPUT' }, 
    { title: 'Aprovação', value: 'APPROVAL' }, 
    { title: 'Upload de Arquivo', value: 'UPLOAD' }, 
    { title: 'Revisão', value: 'REVIEW' }, 
    { title: 'Assinatura', value: 'SIGNATURE' }
  ]
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

function getReuseDataCount(reuseData) {
  if (!reuseData || !Array.isArray(reuseData)) return 0
  return reuseData.length
}

// Field management functions
function addField() {
  resetFieldData()
  fieldDialog.value = true
}

function editField(index) {
  const field = formData.value.formFields[index]
  editingFieldIndex.value = index
  fieldData.value = { ...field }
  fieldDialog.value = true
}

function removeField(index) {
  formData.value.formFields.splice(index, 1)
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

function saveField() {
  if (!fieldValid.value) {
    window.showSnackbar?.('Por favor, corrija os erros no campo', 'error')
    return
  }
  
  const isEditingField = editingFieldIndex.value !== null

  const field = {
    name: fieldData.value.name.trim(),
    label: fieldData.value.label.trim(),
    type: fieldData.value.type,
    placeholder: fieldData.value.placeholder?.trim() || null,
    required: Boolean(fieldData.value.required),
    defaultValue: fieldData.value.defaultValue?.trim() || null,
    helpText: fieldData.value.helpText?.trim() || null,
    tempId: isEditingField ? formData.value.formFields[editingFieldIndex.value].tempId : Date.now() + Math.random(),
    order: isEditingField ? formData.value.formFields[editingFieldIndex.value].order : (formData.value.formFields.length + 1),
    options: fieldData.value.options || [],
    validations: fieldData.value.validations || {}
  }
  
  if (isEditingField) {
    formData.value.formFields[editingFieldIndex.value] = field
  } else {
    formData.value.formFields.push(field)
  }

  window.showSnackbar?.(`Campo "${field.label}" ${isEditingField ? 'atualizado' : 'adicionado'}`, 'success')
  closeFieldDialog()
}

// Step management functions using StepDialog
function addStep() {
  editingStepIndex.value = null
  editingStepData.value = null
  stepDialog.value = true
}

function editStep(index) {
  editingStepIndex.value = index
  editingStepData.value = { ...formData.value.steps[index] }
  stepDialog.value = true
}

function removeStep(index) {
  formData.value.steps.splice(index, 1)
  window.showSnackbar?.('Etapa removida', 'success')
}

function handleStepSave(stepData) {
  const isEditingStep = editingStepIndex.value !== null
  
  // Ensure step has the required structure for the backend
  const processedStep = {
    ...stepData,
    tempId: isEditingStep ? formData.value.steps[editingStepIndex.value].tempId : Date.now() + Math.random(),
    order: isEditingStep ? formData.value.steps[editingStepIndex.value].order : (formData.value.steps.length + 1),
    actions: Array.isArray(stepData.actions) ? [...stepData.actions] : [],
    allowedFileTypes: Array.isArray(stepData.allowedFileTypes) ? [...stepData.allowedFileTypes] : [],
    flowConditions: Array.isArray(stepData.flowConditions)
      ? stepData.flowConditions.map(condition => ({ ...condition }))
      : [],
    reuseData: Array.isArray(stepData.reuseData)
      ? stepData.reuseData.map(item => ({ ...item }))
      : [],
    signatureRequirements: Array.isArray(stepData.signatureRequirements)
      ? stepData.signatureRequirements.map(req => ({ ...req }))
      : [],
    reviewSettings: stepData.reviewSettings
      ? { ...stepData.reviewSettings }
      : null
  }

  if (isEditingStep) {
    formData.value.steps[editingStepIndex.value] = processedStep
  } else {
    formData.value.steps.push(processedStep)
  }

  window.showSnackbar?.(`Etapa "${stepData.name}" ${isEditingStep ? 'atualizada' : 'adicionada'}`, 'success')
  handleStepClose()
}

function handleStepClose() {
  stepDialog.value = false
  editingStepIndex.value = null
  editingStepData.value = null
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
        
        // Ensure all new fields are included in the payload
        return {
          ...stepPayload,
          order: stepPayload.order ?? (idx + 1),
          slaDays: stepPayload.slaDays || null,
          assignedToCreator: Boolean(stepPayload.assignedToCreator),
          assignmentConditions: stepPayload.assignmentConditions || null,
          actions: Array.isArray(stepPayload.actions) ? [...stepPayload.actions] : [],
          allowedFileTypes: Array.isArray(stepPayload.allowedFileTypes) ? [...stepPayload.allowedFileTypes] : [],
          flowConditions: Array.isArray(stepPayload.flowConditions)
            ? stepPayload.flowConditions.map(condition => ({ ...condition }))
            : [],
          reuseData: Array.isArray(stepPayload.reuseData)
            ? stepPayload.reuseData.map(item => ({ ...item }))
            : [],
          signatureRequirements: Array.isArray(stepPayload.signatureRequirements)
            ? stepPayload.signatureRequirements.map(req => ({ ...req }))
            : [],
          reviewSettings: stepPayload.reviewSettings
            ? { ...stepPayload.reviewSettings }
            : null
        }
      })
    }

    console.log('Saving payload:', payload)

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
    console.error('Save error:', e)
    window.showSnackbar?.(e.response?.data?.message || 'Erro ao salvar', 'error')
  } finally {
    saving.value = false
  }
}

function goBack() {
  router.back()
}

// Drag and drop functions for fields
function onFieldDragStart(event, index) {
  draggedFieldIndex.value = index
  event.dataTransfer.effectAllowed = 'move'
  event.dataTransfer.setData('text/html', event.target)
  event.target.style.opacity = '0.4'
}

function onFieldDragEnd(event) {
  event.target.style.opacity = '1'
  dragOverFieldIndex.value = null
}

function onFieldDragOver(event, index) {
  event.preventDefault()
  event.dataTransfer.dropEffect = 'move'
  dragOverFieldIndex.value = index
}

function onFieldDragLeave() {
  // Opcional: pode remover o highlight
}

function onFieldDrop(event, dropIndex) {
  event.preventDefault()
  const dragIndex = draggedFieldIndex.value

  if (dragIndex !== null && dragIndex !== dropIndex) {
    const fields = [...formData.value.formFields]
    const draggedItem = fields[dragIndex]

    // Remove o item da posição original
    fields.splice(dragIndex, 1)

    // Insere na nova posição
    fields.splice(dropIndex, 0, draggedItem)

    // Atualiza as ordens
    formData.value.formFields = fields.map((field, idx) => ({
      ...field,
      order: idx + 1
    }))

    window.showSnackbar?.('Ordem dos campos atualizada', 'success')
  }

  draggedFieldIndex.value = null
  dragOverFieldIndex.value = null
}

// Drag and drop functions for steps
function onStepDragStart(event, index) {
  draggedStepIndex.value = index
  event.dataTransfer.effectAllowed = 'move'
  event.dataTransfer.setData('text/html', event.target)
  event.target.style.opacity = '0.4'
}

function onStepDragEnd(event) {
  event.target.style.opacity = '1'
  dragOverStepIndex.value = null
}

function onStepDragOver(event, index) {
  event.preventDefault()
  event.dataTransfer.dropEffect = 'move'
  dragOverStepIndex.value = index
}

function onStepDragLeave() {
  // Opcional: pode remover o highlight
}

function onStepDrop(event, dropIndex) {
  event.preventDefault()
  const dragIndex = draggedStepIndex.value

  if (dragIndex !== null && dragIndex !== dropIndex) {
    const steps = [...formData.value.steps]
    const draggedItem = steps[dragIndex]

    // Remove o item da posição original
    steps.splice(dragIndex, 1)

    // Insere na nova posição
    steps.splice(dropIndex, 0, draggedItem)

    // Atualiza as ordens
    formData.value.steps = steps.map((step, idx) => ({
      ...step,
      order: idx + 1
    }))

    window.showSnackbar?.('Ordem das etapas atualizada', 'success')
  }

  draggedStepIndex.value = null
  dragOverStepIndex.value = null
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

<style scoped>
.draggable-field,
.draggable-step {
  transition: all 0.3s ease;
  cursor: move;
}

.draggable-field:hover,
.draggable-step:hover {
  background-color: rgba(0, 0, 0, 0.02);
}

.dragging-over {
  border-top: 3px solid #1976d2 !important;
  background-color: rgba(25, 118, 210, 0.08) !important;
}

.drag-handle {
  cursor: grab !important;
}

.drag-handle:active {
  cursor: grabbing !important;
}

/* Animação de arrastar */
.draggable-field[draggable="true"],
.draggable-step[draggable="true"] {
  cursor: grab;
}

.draggable-field[draggable="true"]:active,
.draggable-step[draggable="true"]:active {
  cursor: grabbing;
}
</style>
