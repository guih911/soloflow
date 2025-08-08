<template>
  <div>
    <!-- Header -->
    <div class="d-flex align-center mb-6">
      <v-btn
        icon="mdi-arrow-left"
        variant="text"
        @click="goBack"
      />
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
      <!-- Tabs para organizar as configurações -->
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
        <!-- Tab: Informações Básicas -->
        <v-window-item value="basic">
          <v-card>
            <v-card-text>
              <v-row>
                <v-col cols="12" md="6">
                  <v-text-field
                    v-model="formData.name"
                    label="Nome do Processo"
                    :rules="nameRules"
                    required
                  />
                </v-col>
                <v-col cols="12">
                  <v-textarea
                    v-model="formData.description"
                    label="Descrição"
                    rows="3"
                    counter="500"
                  />
                </v-col>
              </v-row>
            </v-card-text>
          </v-card>
        </v-window-item>

        <!-- Tab: Campos do Formulário -->
        <v-window-item value="fields">
          <v-card>
            <v-card-title class="d-flex align-center justify-space-between">
              <span>Campos do Formulário</span>
              <v-btn
                color="primary"
                size="small"
                @click="addField"
                prepend-icon="mdi-plus"
              >
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
              <draggable
                v-model="formData.formFields"
                item-key="tempId"
                handle=".drag-handle"
                @end="updateFieldOrders"
              >
                <template #item="{ element: field, index }">
                  <v-list-item class="px-4 py-3">
                    <template v-slot:prepend>
                      <v-icon
                        class="drag-handle cursor-move mr-3"
                        color="grey"
                      >
                        mdi-drag
                      </v-icon>
                      <v-avatar
                        :color="getFieldTypeColor(field.type)"
                        size="40"
                      >
                        <v-icon :icon="getFieldTypeIcon(field.type)" size="20" />
                      </v-avatar>
                    </template>

                    <v-list-item-title class="font-weight-medium">
                      {{ field.label }}
                      <v-chip
                        v-if="field.required"
                        size="x-small"
                        color="error"
                        class="ml-2"
                      >
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

                    <template v-slot:append>
                      <v-btn
                        icon="mdi-pencil"
                        size="small"
                        variant="text"
                        @click="editField(index)"
                      />
                      <v-btn
                        icon="mdi-delete"
                        size="small"
                        variant="text"
                        color="error"
                        @click="removeField(index)"
                      />
                    </template>
                  </v-list-item>
                  <v-divider v-if="index < formData.formFields.length - 1" />
                </template>
              </draggable>
            </v-list>
          </v-card>
        </v-window-item>

        <!-- Tab: Etapas do Processo -->
        <v-window-item value="steps">
          <v-card>
            <v-card-title class="d-flex align-center justify-space-between">
              <span>Etapas do Processo</span>
              <v-btn
                color="primary"
                size="small"
                @click="addStep"
                prepend-icon="mdi-plus"
              >
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
              <draggable
                v-model="formData.steps"
                item-key="tempId"
                handle=".drag-handle"
                @end="updateStepOrders"
              >
                <template #item="{ element: step, index }">
                  <v-list-item class="px-4 py-3">
                    <template v-slot:prepend>
                      <v-icon
                        class="drag-handle cursor-move mr-3"
                        color="grey"
                      >
                        mdi-drag
                      </v-icon>
                      <v-avatar
                        :color="getStepTypeColor(step.type)"
                        size="40"
                      >
                        <span class="text-h6">{{ index + 1 }}</span>
                      </v-avatar>
                    </template>

                    <v-list-item-title class="font-weight-medium">
                      {{ step.name }}
                      <v-chip
                        size="x-small"
                        class="ml-2"
                        variant="tonal"
                      >
                        {{ getStepTypeText(step.type) }}
                      </v-chip>
                    </v-list-item-title>

                    <v-list-item-subtitle>
                      <div v-if="step.assignedToSectorId || step.assignedToUserId">
                        <v-icon size="16">mdi-account-check</v-icon>
                        Responsável: 
                        {{ getResponsibleName(step) }}
                      </div>
                      <div class="mt-1">
                        <v-chip
                          v-if="step.allowAttachment"
                          size="x-small"
                          class="mr-1"
                        >
                          <v-icon start size="12">mdi-paperclip</v-icon>
                          Anexos{{ step.requireAttachment ? ' (obrigatório)' : '' }}
                        </v-chip>
                        <v-chip
                          v-if="step.requiresSignature"
                          size="x-small"
                          class="mr-1"
                        >
                          <v-icon start size="12">mdi-draw-pen</v-icon>
                          Assinatura
                        </v-chip>
                        <v-chip
                          v-if="step.actions?.length > 0"
                          size="x-small"
                        >
                          {{ step.actions.length }} ações
                        </v-chip>
                      </div>
                    </v-list-item-subtitle>

                    <template v-slot:append>
                      <v-btn
                        icon="mdi-pencil"
                        size="small"
                        variant="text"
                        @click="editStep(index)"
                      />
                      <v-btn
                        icon="mdi-delete"
                        size="small"
                        variant="text"
                        color="error"
                        @click="removeStep(index)"
                      />
                    </template>
                  </v-list-item>
                  <v-divider v-if="index < formData.steps.length - 1" />
                </template>
              </draggable>
            </v-list>
          </v-card>
        </v-window-item>
      </v-window>

      <!-- Ações -->
      <div class="d-flex justify-end mt-6 gap-2">
        <v-btn
          variant="text"
          @click="goBack"
        >
          Cancelar
        </v-btn>
        <v-btn
          color="primary"
          variant="elevated"
          :loading="saving"
          :disabled="!valid || formData.steps.length === 0"
          @click="save"
        >
          {{ isEditing ? 'Salvar' : 'Criar' }}
        </v-btn>
      </div>
    </v-form>

    <!-- Dialog de Campo de Formulário -->
    <v-dialog
      v-model="fieldDialog"
      max-width="800"
      persistent
    >
      <v-card>
        <v-card-title>
          {{ editingFieldIndex !== null ? 'Editar' : 'Novo' }} Campo
        </v-card-title>
        <v-divider />
        
        <v-form ref="fieldForm" v-model="fieldValid">
          <v-card-text>
            <v-row>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="fieldData.name"
                  label="Nome do Campo (identificador)"
                  :rules="[v => !!v || 'Nome é obrigatório', v => /^[a-zA-Z][a-zA-Z0-9_]*$/.test(v) || 'Use apenas letras, números e underscore']"
                  hint="Ex: data_nascimento, valor_total"
                  persistent-hint
                  required
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="fieldData.label"
                  label="Rótulo (exibido ao usuário)"
                  :rules="[v => !!v || 'Rótulo é obrigatório']"
                  required
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-select
                  v-model="fieldData.type"
                  :items="fieldTypes"
                  label="Tipo de Campo"
                  :rules="[v => !!v || 'Tipo é obrigatório']"
                  required
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="fieldData.placeholder"
                  label="Placeholder"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="fieldData.defaultValue"
                  label="Valor Padrão"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-switch
                  v-model="fieldData.required"
                  label="Campo Obrigatório"
                  color="primary"
                />
              </v-col>
              <v-col cols="12">
                <v-textarea
                  v-model="fieldData.helpText"
                  label="Texto de Ajuda"
                  rows="2"
                />
              </v-col>
              
              <!-- Opções para dropdown/checkbox -->
              <v-col v-if="['DROPDOWN', 'CHECKBOX'].includes(fieldData.type)" cols="12">
                <v-card variant="outlined">
                  <v-card-title class="text-subtitle-1">
                    Opções
                    <v-btn
                      icon="mdi-plus"
                      size="small"
                      variant="text"
                      @click="addOption"
                      class="ml-2"
                    />
                  </v-card-title>
                  <v-card-text>
                    <div
                      v-for="(option, idx) in fieldData.options"
                      :key="idx"
                      class="d-flex align-center gap-2 mb-2"
                    >
                      <v-text-field
                        v-model="option.value"
                        label="Valor"
                        density="compact"
                        hide-details
                      />
                      <v-text-field
                        v-model="option.label"
                        label="Rótulo"
                        density="compact"
                        hide-details
                      />
                      <v-btn
                        icon="mdi-delete"
                        size="small"
                        variant="text"
                        color="error"
                        @click="removeOption(idx)"
                      />
                    </div>
                  </v-card-text>
                </v-card>
              </v-col>

              <!-- Validações -->
              <v-col cols="12">
                <v-expansion-panels>
                  <v-expansion-panel>
                    <v-expansion-panel-title>
                      <v-icon start>mdi-shield-check</v-icon>
                      Validações Avançadas
                    </v-expansion-panel-title>
                    <v-expansion-panel-text>
                      <v-row>
                        <v-col v-if="['TEXT', 'TEXTAREA'].includes(fieldData.type)" cols="12" md="6">
                          <v-text-field
                            v-model.number="fieldData.validations.minLength"
                            label="Comprimento Mínimo"
                            type="number"
                            min="0"
                          />
                        </v-col>
                        <v-col v-if="['TEXT', 'TEXTAREA'].includes(fieldData.type)" cols="12" md="6">
                          <v-text-field
                            v-model.number="fieldData.validations.maxLength"
                            label="Comprimento Máximo"
                            type="number"
                            min="0"
                          />
                        </v-col>
                        <v-col v-if="fieldData.type === 'NUMBER'" cols="12" md="6">
                          <v-text-field
                            v-model.number="fieldData.validations.min"
                            label="Valor Mínimo"
                            type="number"
                          />
                        </v-col>
                        <v-col v-if="fieldData.type === 'NUMBER'" cols="12" md="6">
                          <v-text-field
                            v-model.number="fieldData.validations.max"
                            label="Valor Máximo"
                            type="number"
                          />
                        </v-col>
                        <v-col cols="12">
                          <v-text-field
                            v-model="fieldData.validations.pattern"
                            label="Expressão Regular (RegEx)"
                            hint="Para validação customizada"
                          />
                        </v-col>
                        <v-col cols="12">
                          <v-text-field
                            v-model="fieldData.validations.customMessage"
                            label="Mensagem de Erro Customizada"
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
            <v-spacer />
            <v-btn
              variant="text"
              @click="closeFieldDialog"
            >
              Cancelar
            </v-btn>
            <v-btn
              color="primary"
              variant="elevated"
              :disabled="!fieldValid"
              @click="saveField"
            >
              {{ editingFieldIndex !== null ? 'Salvar' : 'Adicionar' }}
            </v-btn>
          </v-card-actions>
        </v-form>
      </v-card>
    </v-dialog>

    <!-- Dialog de Etapa (mantém o existente mas vou adicionar as melhorias) -->
    <StepDialog
      v-model="stepDialog"
      :step-data="stepData"
      :editing-index="editingStepIndex"
      :sectors="sectors"
      :users="users"
      :steps="formData.steps"
      @save="saveStep"
      @close="closeStepDialog"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useProcessTypeStore } from '@/stores/processTypes'
import { useSectorStore } from '@/stores/sectors'
import { useUserStore } from '@/stores/users'
import { VueDraggableNext as draggable } from 'vue-draggable-next'
import StepDialog from '@/components/StepDialog.vue'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
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
  validations: {
    minLength: null,
    maxLength: null,
    min: null,
    max: null,
    pattern: '',
    customMessage: ''
  }
})

const stepData = ref({
  name: '',
  description: '',
  type: 'INPUT',
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

// Computed
const isEditing = computed(() => !!route.params.id && route.params.id !== 'new')
const sectors = computed(() => sectorStore.sectors)
const users = computed(() => userStore.users)

// Regras
const nameRules = [
  v => !!v || 'Nome é obrigatório',
  v => v.length >= 3 || 'Nome deve ter no mínimo 3 caracteres'
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
  // : Verificar se as propriedades existem antes de acessar
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

// : Carregar dados com verificações de segurança


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
    required: field.required,
    defaultValue: field.defaultValue || '',
    helpText: field.helpText || '',
    options: field.options ? [...field.options] : [],
    validations: field.validations ? { ...field.validations } : {
      minLength: null,
      maxLength: null,
      min: null,
      max: null,
      pattern: '',
      customMessage: ''
    }
  }
  
  fieldDialog.value = true
}

function removeField(index) {
  formData.value.formFields.splice(index, 1)
  updateFieldOrders()
}

function updateFieldOrders() {
  formData.value.formFields.forEach((field, index) => {
    field.order = index + 1
  })
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
    validations: {
      minLength: null,
      maxLength: null,
      min: null,
      max: null,
      pattern: '',
      customMessage: ''
    }
  }
}

function closeFieldDialog() {
  fieldDialog.value = false
  resetFieldData()
}

function addOption() {
  fieldData.value.options.push({ value: '', label: '' })
}

function removeOption(index) {
  fieldData.value.options.splice(index, 1)
}

function saveField() {
  if (!fieldValid.value) {
    window.showSnackbar?.('Por favor, corrija os erros no campo', 'error')
    return
  }

  //  CORRIGIDO: Validar nome do campo único
  const existingField = formData.value.formFields.find((field, index) => 
    field.name === fieldData.value.name && index !== editingFieldIndex.value
  )
  
  if (existingField) {
    window.showSnackbar?.(`Nome do campo "${fieldData.value.name}" já está em uso`, 'error')
    return
  }

  //  Criar objeto do campo com validações
  const field = {
    name: fieldData.value.name.trim(),
    label: fieldData.value.label.trim(),
    type: fieldData.value.type,
    placeholder: fieldData.value.placeholder?.trim() || null,
    required: Boolean(fieldData.value.required),
    defaultValue: fieldData.value.defaultValue?.trim() || null,
    helpText: fieldData.value.helpText?.trim() || null,
    
    //  Metadados temporários
    tempId: editingFieldIndex.value !== null 
      ? formData.value.formFields[editingFieldIndex.value].tempId 
      : Date.now() + Math.random(),
    order: editingFieldIndex.value !== null 
      ? formData.value.formFields[editingFieldIndex.value].order 
      : formData.value.formFields.length + 1,
    
    //  CORRIGIDO: Processar opções e validações
    options: fieldData.value.options?.filter(opt => 
      opt.value && opt.value.trim() && opt.label && opt.label.trim()
    ) || [],
    
    validations: Object.fromEntries(
      Object.entries(fieldData.value.validations || {}).filter(([key, value]) => 
        value !== null && value !== undefined && value !== '' && value !== 0
      )
    )
  }

  console.log('💾 Saving field:', field)

  if (editingFieldIndex.value !== null) {
    formData.value.formFields[editingFieldIndex.value] = field
    window.showSnackbar?.(`Campo "${field.label}" atualizado`, 'success')
  } else {
    formData.value.formFields.push(field)
    window.showSnackbar?.(`Campo "${field.label}" adicionado`, 'success')
  }

  closeFieldDialog()
}

// Métodos - Etapas
function addStep() {
  resetStepData()
  stepDialog.value = true
}

function editStep(index) {
  const step = formData.value.steps[index]
  editingStepIndex.value = index
  
  stepData.value = {
    name: step.name,
    description: step.description || '',
    type: step.type,
    allowAttachment: step.allowAttachment,
    requiresSignature: step.requiresSignature,
    requireAttachment: step.requireAttachment || false,
    minAttachments: step.minAttachments || null,
    maxAttachments: step.maxAttachments || null,
    allowedFileTypes: step.allowedFileTypes || [],
    actions: step.actions || [],
    assignedToUserId: step.assignedToUserId,
    assignedToSectorId: step.assignedToSectorId,
    conditions: step.conditions || {}
  }
  
  stepDialog.value = true
}

function removeStep(index) {
  formData.value.steps.splice(index, 1)
  updateStepOrders()
}

function updateStepOrders() {
  formData.value.steps.forEach((step, index) => {
    step.order = index + 1
  })
}

function resetStepData() {
  editingStepIndex.value = null
  stepData.value = {
    name: '',
    description: '',
    type: 'INPUT',
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
}

function closeStepDialog() {
  stepDialog.value = false
  resetStepData()
}

function saveStep(stepData) {
  console.log('💾 Saving step:', stepData)
  
  //  Validações antes de salvar
  if (!stepData.name || stepData.name.trim().length < 2) {
    window.showSnackbar?.('Nome da etapa deve ter pelo menos 2 caracteres', 'error')
    return
  }
  
  if (!stepData.assignedToUserId && !stepData.assignedToSectorId) {
    window.showSnackbar?.('Etapa deve ter um responsável definido', 'error')
    return
  }

  const processedStep = {
    ...stepData,
    name: stepData.name.trim(),
    description: stepData.description?.trim() || null,
    
    //  Metadados temporários
    tempId: editingStepIndex.value !== null
      ? formData.value.steps[editingStepIndex.value].tempId
      : Date.now() + Math.random(),
    order: editingStepIndex.value !== null
      ? formData.value.steps[editingStepIndex.value].order
      : formData.value.steps.length + 1,
    
    //  Processar arrays corretamente
    actions: Array.isArray(stepData.actions) ? 
      stepData.actions.filter(Boolean) : [],
    conditions: stepData.conditions && typeof stepData.conditions === 'object' ? 
      stepData.conditions : {},
    allowedFileTypes: Array.isArray(stepData.allowedFileTypes) ? 
      stepData.allowedFileTypes.filter(Boolean) : []
  }

  if (editingStepIndex.value !== null) {
    formData.value.steps[editingStepIndex.value] = processedStep
    window.showSnackbar?.(`Etapa "${processedStep.name}" atualizada`, 'success')
  } else {
    formData.value.steps.push(processedStep)
    window.showSnackbar?.(`Etapa "${processedStep.name}" adicionada`, 'success')
  }

  closeStepDialog()
}

// Métodos principais
function goBack() {
  router.push('/process-types')
}

async function save() {
  if (!valid.value) {
    window.showSnackbar?.('Por favor, corrija os erros no formulário', 'error')
    return
  }

  if (formData.value.steps.length === 0) {
    window.showSnackbar?.('É necessário adicionar pelo menos uma etapa', 'warning')
    activeTab.value = 'steps' // Ir para aba de etapas
    return
  }

  //  Validar se todas as etapas têm responsável
  const stepsWithoutResponsible = formData.value.steps.filter(step => 
    !step.assignedToUserId && !step.assignedToSectorId
  )
  
  if (stepsWithoutResponsible.length > 0) {
    window.showSnackbar?.(`Etapas sem responsável: ${stepsWithoutResponsible.map(s => s.name).join(', ')}`, 'error')
    activeTab.value = 'steps'
    return
  }

  saving.value = true
  try {
    //  CORRIGIDO: Estrutura de dados aprimorada
    const data = {
      name: formData.value.name.trim(),
      description: formData.value.description?.trim() || null,
      companyId: authStore.activeCompanyId, //  Usar companyId correto
      
      //  CORRIGIDO: Processar etapas
      steps: formData.value.steps.map((step, index) => {
        //  Limpar dados temporários
        const cleanStep = { ...step }
        delete cleanStep.tempId
        
        return {
          ...cleanStep,
          order: index + 1,
          //  Garantir que arrays são válidos
          actions: Array.isArray(cleanStep.actions) ? 
            cleanStep.actions.filter(Boolean) : [],
          conditions: cleanStep.conditions && typeof cleanStep.conditions === 'object' ? 
            cleanStep.conditions : {},
          allowedFileTypes: Array.isArray(cleanStep.allowedFileTypes) ? 
            cleanStep.allowedFileTypes.filter(Boolean) : []
        }
      }),
      
      //  CORRIGIDO: Processar campos de formulário
      formFields: formData.value.formFields.map((field, index) => {
        //  Limpar dados temporários
        const cleanField = { ...field }
        delete cleanField.tempId
        
        return {
          ...cleanField,
          order: index + 1,
          //  Garantir que arrays/objetos são válidos
          options: Array.isArray(cleanField.options) ? 
            cleanField.options.filter(opt => opt.value && opt.label) : [],
          validations: cleanField.validations && typeof cleanField.validations === 'object' ? 
            Object.fromEntries(
              Object.entries(cleanField.validations).filter(([key, value]) => 
                value !== null && value !== undefined && value !== ''
              )
            ) : {}
        }
      })
    }

    console.log('📤 Saving process type with data:', JSON.stringify(data, null, 2))

    let result
    if (isEditing.value) {
      result = await processTypeStore.updateProcessType(route.params.id, data)
      window.showSnackbar?.('Tipo de processo atualizado com sucesso!', 'success')
    } else {
      result = await processTypeStore.createProcessType(data)
      window.showSnackbar?.('Tipo de processo criado com sucesso!', 'success')
    }

    console.log('🎉 Process type saved successfully:', result)

    //  IMPORTANTE: Aguardar um momento para garantir que o backend processou
    setTimeout(() => {
      goBack()
    }, 500)

  } catch (error) {
    console.error('❌ Error saving process type:', error)
    
    let errorMessage = 'Erro ao salvar tipo de processo'
    
    if (error.message) {
      errorMessage = error.message
    } else if (error.response?.data?.message) {
      errorMessage = error.response.data.message
    }
    
    window.showSnackbar?.(errorMessage, 'error')
    
    //  Se erro de validação, ir para aba relevante
    if (errorMessage.includes('etapa') || errorMessage.includes('responsável')) {
      activeTab.value = 'steps'
    } else if (errorMessage.includes('campo')) {
      activeTab.value = 'fields'
    }
  } finally {
    saving.value = false
  }
}


async function loadData() {
  try {
    //  Carregar dados auxiliares primeiro
    await Promise.all([
      sectorStore.fetchSectors(),
      userStore.fetchUsers()
    ])

    if (isEditing.value && route.params.id !== 'new') {
      console.log('📋 Loading process type for editing:', route.params.id)
      
      const processType = await processTypeStore.fetchProcessType(route.params.id)
      
      console.log(' Process type loaded:', processType)
      
      //  CORRIGIDO: Processar dados para edição
      formData.value = {
        name: processType.name,
        description: processType.description || '',
        
        //  Processar etapas com parsing JSON adequado
        steps: processType.steps?.map((step, index) => ({
          ...step,
          tempId: Date.now() + index,
          //  Parse JSON fields corretamente
          actions: (() => {
            try {
              return Array.isArray(step.actions) ? step.actions : JSON.parse(step.actions || '[]')
            } catch {
              return []
            }
          })(),
          conditions: (() => {
            try {
              return typeof step.conditions === 'object' && step.conditions !== null ? 
                step.conditions : JSON.parse(step.conditions || '{}')
            } catch {
              return {}
            }
          })(),
          allowedFileTypes: (() => {
            try {
              return Array.isArray(step.allowedFileTypes) ? step.allowedFileTypes : JSON.parse(step.allowedFileTypes || '[]')
            } catch {
              return []
            }
          })()
        })) || [],
        
        //  Processar campos de formulário com parsing JSON adequado
        formFields: processType.formFields?.map((field, index) => ({
          ...field,
          tempId: Date.now() + index + 1000,
          //  Parse JSON fields corretamente
          options: (() => {
            try {
              return Array.isArray(field.options) ? field.options : JSON.parse(field.options || '[]')
            } catch {
              return []
            }
          })(),
          validations: (() => {
            try {
              return typeof field.validations === 'object' && field.validations !== null ? 
                field.validations : JSON.parse(field.validations || '{}')
            } catch {
              return {}
            }
          })()
        })) || []
      }
      
      console.log('📋 Form data set for editing:', {
        steps: formData.value.steps.length,
        formFields: formData.value.formFields.length
      })
    } else {
      //  Dados para novo processo type
      formData.value = {
        name: '',
        description: '',
        steps: [],
        formFields: []
      }
    }
  } catch (error) {
    console.error('❌ Error loading data:', error)
    window.showSnackbar?.('Erro ao carregar dados', 'error')
    
    //  Se erro crítico, voltar para lista
    if (error.response?.status === 404) {
      window.showSnackbar?.('Tipo de processo não encontrado', 'error')
      setTimeout(() => goBack(), 1500)
    }
  }
}

function validateForm() {
  const errors = []
  
  if (!formData.value.name?.trim()) {
    errors.push('Nome do processo é obrigatório')
  }
  
  if (formData.value.steps.length === 0) {
    errors.push('Pelo menos uma etapa é obrigatória')
  }
  
  formData.value.steps.forEach((step, index) => {
    if (!step.name?.trim()) {
      errors.push(`Etapa ${index + 1}: nome é obrigatório`)
    }
    if (!step.assignedToUserId && !step.assignedToSectorId) {
      errors.push(`Etapa "${step.name || index + 1}": responsável é obrigatório`)
    }
  })
  
  formData.value.formFields.forEach((field, index) => {
    if (!field.name?.trim()) {
      errors.push(`Campo ${index + 1}: nome é obrigatório`)
    }
    if (!field.label?.trim()) {
      errors.push(`Campo ${index + 1}: rótulo é obrigatório`)
    }
  })
  
  return errors
}

// ADICIONAR: Watch para auto-validação
watch(() => [formData.value.name, formData.value.steps.length], () => {
  if (formData.value.name || formData.value.steps.length > 0) {
    const errors = validateForm()
    if (errors.length > 0 && errors.length <= 2) {
      // Mostrar apenas erros críticos
      const criticalErrors = errors.filter(error => 
        error.includes('obrigatório') && !error.includes('responsável')
      )
      if (criticalErrors.length > 0 && Math.random() < 0.3) { // Mostrar esporadicamente
        console.log('⚠️ Validation warnings:', criticalErrors)
      }
    }
  }
}, { deep: true })


onMounted(() => {
  loadData()
})
</script>

<style scoped>
.cursor-move {
  cursor: move;
}

.gap-2 {
  gap: 8px;
}
</style>