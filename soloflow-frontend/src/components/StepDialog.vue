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
            <v-tab value="instructions">Instruções e SLA</v-tab>
            <v-tab value="attachment">Anexos</v-tab>
            <v-tab value="flow">Fluxo e Condições</v-tab>
            <v-tab v-if="localStepData.type === 'INPUT'" value="input-config">
              Entrada de Dados
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
                  <template v-if="isInputType">
                    <v-divider class="my-4" />
                    <h3 class="text-subtitle-1 mb-2">Entrada de Dados</h3>

                    <v-autocomplete v-model="inputConfig.visibleFields" :items="formFields" item-title="label"
                      item-value="name" label="Campos visíveis" multiple chips closable-chips />

                    <v-autocomplete class="mt-4" v-model="inputConfig.requiredFields"
                      :items="formFields.filter(f => inputConfig.visibleFields.includes(f.name))" item-title="label"
                      item-value="name" label="Campos obrigatórios" multiple chips closable-chips />
                  </template>


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
                    <v-icon color="warning" class="mr-2">mdi-clock-alert</v-icon>
                    SLA (Prazo)
                  </h3>
                  <v-text-field v-model.number="localStepData.slaHours" label="Prazo em horas" type="number" min="1"
                    max="8760" :rules="slaRules" hint="Tempo limite para conclusão desta etapa (1 a 8760 horas)"
                    persistent-hint suffix="horas" />
                </v-col>

                <v-col cols="12" md="6">
                  <v-alert v-if="localStepData.slaHours" type="info" variant="tonal" density="compact">
                    <v-icon start>mdi-information</v-icon>
                    Prazo: {{ formatSlaDescription(localStepData.slaHours) }}
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

            <!-- Aba de configuração para etapa INPUT -->
            <v-window-item value="input-config">
              <v-row>
                <v-col cols="12">
                  <h3 class="text-h6 mb-4">Configuração de Campos da Entrada de Dados</h3>

                  <!-- Campos Visíveis -->
                  <v-card variant="outlined" class="mb-4">
                    <v-card-title class="text-subtitle-1">
                      <v-icon start color="primary">mdi-eye</v-icon>
                      Campos Visíveis nesta Etapa
                    </v-card-title>
                    <v-card-text>
                      <v-autocomplete v-model="inputConfig.visibleFields" :items="availableFormFields"
                        item-title="label" item-value="name" label="Selecione os campos que serão exibidos" multiple
                        chips closable-chips hint="Apenas estes campos serão visíveis ao executar esta etapa"
                        persistent-hint>
                        <template v-slot:chip="{ item, props }">
                          <v-chip v-bind="props" closable>
                            {{ item.raw.label }}
                          </v-chip>
                        </template>
                      </v-autocomplete>
                    </v-card-text>
                  </v-card>

                  <!-- Campos Obrigatórios -->
                  <v-card variant="outlined" class="mb-4">
                    <v-card-title class="text-subtitle-1">
                      <v-icon start color="error">mdi-asterisk</v-icon>
                      Campos Obrigatórios
                    </v-card-title>
                    <v-card-text>
                      <v-autocomplete v-model="inputConfig.requiredFields" :items="visibleFieldsOptions"
                        item-title="label" item-value="name" label="Marque os campos obrigatórios" multiple chips
                        closable-chips hint="Estes campos devem ser preenchidos para concluir a etapa" persistent-hint>
                        <template v-slot:chip="{ item, props }">
                          <v-chip v-bind="props" color="error" variant="tonal" closable>
                            {{ item.raw.label }} *
                          </v-chip>
                        </template>
                      </v-autocomplete>
                    </v-card-text>
                  </v-card>

                  <!-- Personalização de Campos -->
                  <v-card variant="outlined" class="mb-4">
                    <v-card-title class="text-subtitle-1">
                      <v-icon start color="info">mdi-pencil</v-icon>
                      Personalizar Campos
                    </v-card-title>
                    <v-card-text>
                      <v-expansion-panels variant="accordion">
                        <v-expansion-panel v-for="field in visibleFieldsOptions" :key="field.name">
                          <v-expansion-panel-title>
                            {{ field.label }}
                            <v-chip v-if="hasOverride(field.name)" size="x-small" color="info" class="ml-2">
                              Personalizado
                            </v-chip>
                          </v-expansion-panel-title>
                          <v-expansion-panel-text>
                            <v-row>
                              <v-col cols="12" md="6">
                                <v-text-field v-model="inputConfig.overrides[field.name].label"
                                  label="Label personalizado" :placeholder="field.label" density="compact" />
                              </v-col>
                              <v-col cols="12" md="6">
                                <v-text-field v-model="inputConfig.overrides[field.name].hint"
                                  label="Dica personalizada" :placeholder="field.helpText" density="compact" />
                              </v-col>
                              <v-col cols="12" md="6" v-if="field.type === 'NUMBER'">
                                <v-text-field v-model.number="inputConfig.overrides[field.name].min"
                                  label="Valor mínimo" type="number" density="compact" />
                              </v-col>
                              <v-col cols="12" md="6" v-if="field.type === 'NUMBER'">
                                <v-text-field v-model.number="inputConfig.overrides[field.name].max"
                                  label="Valor máximo" type="number" density="compact" />
                              </v-col>
                              <v-col cols="12" v-if="field.type === 'TEXT'">
                                <v-text-field v-model="inputConfig.overrides[field.name].regex"
                                  label="Expressão regular (validação)" placeholder="Ex: ^[A-Z]{2}\d{4}$"
                                  density="compact" />
                              </v-col>
                              <v-col cols="12" v-if="inputConfig.overrides[field.name].regex">
                                <v-text-field v-model="inputConfig.overrides[field.name].errorMessage"
                                  label="Mensagem de erro personalizada" density="compact" />
                              </v-col>
                            </v-row>
                          </v-expansion-panel-text>
                        </v-expansion-panel>
                      </v-expansion-panels>
                    </v-card-text>
                  </v-card>

                  <!-- Pré-preenchimento -->
                  <v-card variant="outlined">
                    <v-card-title class="text-subtitle-1">
                      <v-icon start color="success">mdi-content-copy</v-icon>
                      Pré-preenchimento
                    </v-card-title>
                    <v-card-text>
                      <v-select v-model="inputConfig.prefillFrom" :items="prefillOptions"
                        label="Origem dos dados para pré-preenchimento" multiple chips closable-chips
                        hint="Os campos serão pré-preenchidos com dados existentes" persistent-hint />
                    </v-card-text>
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
  </v-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'

const isInputType = computed(() =>
  localStepData.value?.type === 'INPUT' || localStepData.value?.type === 'Entrada de Dados'
)

const inputConfig = ref({
  visibleFields: [],
  requiredFields: []
})

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

// Estado
const stepValid = ref(false)
const tab = ref('basic')
const responsibleType = ref('sector')

const localStepData = ref({
  name: '',
  description: '',
  type: 'INPUT',
  instructions: '',
  slaHours: null,
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



// Opções
const stepTypes = [
  { title: 'Entrada de Dados', value: 'INPUT' },
  { title: 'Aprovação', value: 'APPROVAL' },
  { title: 'Upload de Arquivo', value: 'UPLOAD' },
  { title: 'Revisão', value: 'REVIEW' },
  { title: 'Assinatura', value: 'SIGNATURE' }
]

const fileTypes = [
  { title: 'PDF', value: 'application/pdf' },
  { title: 'Imagens (JPG, PNG)', value: 'image/*' },
  { title: 'Word', value: '.doc,.docx' },
  { title: 'Excel', value: '.xls,.xlsx' },
  { title: 'Texto', value: 'text/plain' }
]

const prefillOptions = [
  { title: 'Dados do formulário inicial', value: 'formData' },
  { title: 'Etapa anterior', value: 'previousStep' },
  { title: 'Dados do usuário', value: 'userData' }
]

// Computed
const availableFormFields = computed(() => {
  return props.formFields || []
})

const visibleFieldsOptions = computed(() => {
  return availableFormFields.value.filter(field =>
    inputConfig.value.visibleFields.includes(field.name)
  )
})

const slaRules = computed(() => {
  return [
    v => !v || (v >= 1 && v <= 8760) || 'SLA deve estar entre 1 e 8760 horas',
    v => !v || Number.isInteger(Number(v)) || 'SLA deve ser um número inteiro'
  ]
})

function formatSlaDescription(hours) {
  if (!hours) return ''
  if (hours <= 24) return `${hours} hora(s)`
  const days = Math.floor(hours / 24)
  const remainingHours = hours % 24
  if (remainingHours > 0) {
    return `${days} dia(s) e ${remainingHours} hora(s)`
  }
  return `${days} dia(s)`
}

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

// Watch
watch(() => props.modelValue, (newVal) => {
  if (newVal) {
    if (props.stepData) {
      localStepData.value = { ...props.stepData }
      responsibleType.value = props.stepData.assignedToUserId ? 'user' : 'sector'

      // Carregar configurações INPUT se existirem
      if (props.stepData.type === 'INPUT' && props.stepData.conditions) {
        try {
          const conditions = typeof props.stepData.conditions === 'string'
            ? JSON.parse(props.stepData.conditions)
            : props.stepData.conditions

          // Carregar configurações INPUT ou usar padrões
          inputConfig.value = {
            visibleFields: conditions.visibleFields || [],
            requiredFields: conditions.requiredFields || [],
            overrides: conditions.overrides || {},
            stepLocalFields: conditions.stepLocalFields || [],
            prefillFrom: conditions.prefillFrom || []
          }
        } catch (e) {
          console.error('Error loading INPUT conditions:', e)
          resetInputConfig()
        }
      } else {
        resetInputConfig()
      }
    } else {
      // Novo step
      localStepData.value = {
        name: '',
        description: '',
        type: 'INPUT',
        instructions: '',
        slaHours: null,
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
      resetInputConfig()
    }
    tab.value = 'basic'
  }
})

// Watch para inicializar overrides quando campos visíveis mudam
watch(() => inputConfig.value.visibleFields, (newFields) => {
  newFields.forEach(fieldName => {
    if (!inputConfig.value.overrides[fieldName]) {
      inputConfig.value.overrides[fieldName] = {
        label: '',
        hint: '',
        min: null,
        max: null,
        regex: '',
        errorMessage: ''
      }
    }
  })

  // Remover overrides de campos não visíveis
  Object.keys(inputConfig.value.overrides).forEach(fieldName => {
    if (!newFields.includes(fieldName)) {
      delete inputConfig.value.overrides[fieldName]
    }
  })

  // Limpar campos obrigatórios que não são mais visíveis
  inputConfig.value.requiredFields = inputConfig.value.requiredFields.filter(
    field => newFields.includes(field)
  )
})

// Métodos
function resetInputConfig() {
  inputConfig.value = {
    visibleFields: [],
    requiredFields: [],
    overrides: {},
    stepLocalFields: [],
    prefillFrom: []
  }
}

function onResponsibleTypeChange() {
  localStepData.value.assignedToUserId = null
  localStepData.value.assignedToSectorId = null
}

function hasOverride(fieldName) {
  const override = inputConfig.value.overrides[fieldName]
  if (!override) return false

  return override.label || override.hint ||
    override.min !== null || override.max !== null ||
    override.regex || override.errorMessage
}

function getFlowOptions() {
  const options = [
    { title: 'Próxima etapa', value: null, icon: 'mdi-arrow-right' },
    { title: 'Finalizar processo', value: 'END', icon: 'mdi-flag-checkered' },
    { title: 'Voltar para etapa anterior', value: 'PREVIOUS', icon: 'mdi-arrow-left' }
  ]

  // Adicionar opções para ir para etapas específicas
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

function close() {
  emit('close')
  emit('update:modelValue', false)
}

function save() {
  if (!stepValid.value) return

  // Limpar campos não utilizados
  if (!localStepData.value.allowAttachment) {
    localStepData.value.requireAttachment = false
    localStepData.value.minAttachments = null
    localStepData.value.maxAttachments = null
    localStepData.value.allowedFileTypes = []
  }

  // Se é etapa INPUT, adicionar configurações ao conditions
  if (localStepData.value.type === 'INPUT') {
    // Limpar overrides vazios
    const cleanOverrides = {}
    Object.keys(inputConfig.value.overrides).forEach(fieldName => {
      const override = inputConfig.value.overrides[fieldName]
      const cleanOverride = {}

      if (override.label) cleanOverride.label = override.label
      if (override.hint) cleanOverride.hint = override.hint
      if (override.min !== null && override.min !== '') cleanOverride.min = override.min
      if (override.max !== null && override.max !== '') cleanOverride.max = override.max
      if (override.regex) cleanOverride.regex = override.regex
      if (override.errorMessage) cleanOverride.errorMessage = override.errorMessage

      if (Object.keys(cleanOverride).length > 0) {
        cleanOverrides[fieldName] = cleanOverride
      }
    })

    localStepData.value.conditions = {
      visibleFields: inputConfig.value.visibleFields,
      requiredFields: inputConfig.value.requiredFields,
      overrides: cleanOverrides,
      stepLocalFields: inputConfig.value.stepLocalFields,
      prefillFrom: inputConfig.value.prefillFrom
    }
  }
 if (localStepData.value.type === 'INPUT') {
  localStepData.value.conditions = {
    visibleFields: inputConfig.value.visibleFields,
    requiredFields: inputConfig.value.requiredFields
  }
}

  emit('save', { ...localStepData.value })
}
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