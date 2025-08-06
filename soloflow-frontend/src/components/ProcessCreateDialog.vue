<template>
  <v-dialog
    v-model="dialog"
    max-width="800"
    persistent
  >
    <template v-slot:activator="{ props }">
      <v-btn
        v-bind="props"
        color="primary"
        prepend-icon="mdi-plus"
      >
        Novo Processo
      </v-btn>
    </template>

    <v-card>
      <v-stepper v-model="step">
        <v-stepper-header>
          <v-stepper-item
            :complete="step > 1"
            :value="1"
            title="Tipo de Processo"
          />
          <v-divider />
          <v-stepper-item
            :complete="step > 2"
            :value="2"
            title="Informações Básicas"
          />
          <v-divider v-if="hasFormFields" />
          <v-stepper-item
            v-if="hasFormFields"
            :value="3"
            title="Formulário"
          />
        </v-stepper-header>

        <v-stepper-window>
          <!-- Step 1: Selecionar Tipo de Processo -->
          <v-stepper-window-item :value="1">
            <v-card-text>
              <h3 class="text-h6 mb-4">Selecione o tipo de processo</h3>
              
              <v-text-field
                v-model="searchType"
                label="Buscar tipo de processo"
                prepend-inner-icon="mdi-magnify"
                clearable
                class="mb-4"
              />

              <v-radio-group v-model="selectedProcessTypeId">
                <v-card
                  v-for="processType in filteredProcessTypes"
                  :key="processType.id"
                  class="mb-3"
                  :color="selectedProcessTypeId === processType.id ? 'primary' : ''"
                  :variant="selectedProcessTypeId === processType.id ? 'tonal' : 'outlined'"
                  @click="selectedProcessTypeId = processType.id"
                >
                  <v-card-text>
                    <v-radio
                      :label="processType.name"
                      :value="processType.id"
                      hide-details
                    />
                    <p v-if="processType.description" class="text-body-2 text-grey mt-2 ml-8">
                      {{ processType.description }}
                    </p>
                    <div class="mt-2 ml-8">
                      <v-chip size="small" class="mr-2">
                        <v-icon start size="16">mdi-debug-step-over</v-icon>
                        {{ processType.steps?.length || 0 }} etapas
                      </v-chip>
                      <v-chip v-if="processType.formFields?.length > 0" size="small">
                        <v-icon start size="16">mdi-form-textbox</v-icon>
                        {{ processType.formFields.length }} campos
                      </v-chip>
                    </div>
                  </v-card-text>
                </v-card>
              </v-radio-group>

              <v-alert
                v-if="filteredProcessTypes.length === 0"
                type="info"
                variant="tonal"
                text="Nenhum tipo de processo encontrado"
              />
            </v-card-text>

            <v-card-actions>
              <v-spacer />
              <v-btn variant="text" @click="close">Cancelar</v-btn>
              <v-btn
                color="primary"
                :disabled="!selectedProcessTypeId"
                @click="nextStep"
              >
                Próximo
              </v-btn>
            </v-card-actions>
          </v-stepper-window-item>

          <!-- Step 2: Informações Básicas -->
          <v-stepper-window-item :value="2">
            <v-card-text>
              <h3 class="text-h6 mb-4">Informações do processo</h3>
              
              <v-text-field
                v-model="processData.title"
                label="Título do processo"
                hint="Deixe vazio para usar o padrão"
                persistent-hint
                class="mb-4"
              />

              <v-textarea
                v-model="processData.description"
                label="Descrição"
                rows="3"
              />
            </v-card-text>

            <v-card-actions>
              <v-btn variant="text" @click="step--">Voltar</v-btn>
              <v-spacer />
              <v-btn variant="text" @click="close">Cancelar</v-btn>
              <v-btn
                color="primary"
                @click="hasFormFields ? nextStep() : createProcess()"
                :loading="creating"
              >
                {{ hasFormFields ? 'Próximo' : 'Criar Processo' }}
              </v-btn>
            </v-card-actions>
          </v-stepper-window-item>

          <!-- Step 3: Formulário Dinâmico -->
          <v-stepper-window-item v-if="hasFormFields" :value="3">
            <v-card-text>
              <h3 class="text-h6 mb-4">Preencha os dados do formulário</h3>
              
              <v-form ref="dynamicForm" v-model="formValid">
                <v-row>
                  <v-col
                    v-for="field in selectedProcessType?.formFields"
                    :key="field.id"
                    :cols="getFieldCols(field)"
                  >
                    <!-- Campo de Texto -->
                    <v-text-field
                      v-if="field.type === 'TEXT'"
                      v-model="formData[field.name]"
                      :label="field.label"
                      :placeholder="field.placeholder"
                      :required="field.required"
                      :rules="getFieldRules(field)"
                      :hint="field.helpText"
                      persistent-hint
                    />

                    <!-- Campo Numérico -->
                    <v-text-field
                      v-else-if="field.type === 'NUMBER'"
                      v-model.number="formData[field.name]"
                      :label="field.label"
                      :placeholder="field.placeholder"
                      type="number"
                      :required="field.required"
                      :rules="getFieldRules(field)"
                      :hint="field.helpText"
                      persistent-hint
                    />

                    <!-- Campo de Data -->
                    <v-text-field
                      v-else-if="field.type === 'DATE'"
                      v-model="formData[field.name]"
                      :label="field.label"
                      type="date"
                      :required="field.required"
                      :rules="getFieldRules(field)"
                      :hint="field.helpText"
                      persistent-hint
                    />

                    <!-- Campo de Email -->
                    <v-text-field
                      v-else-if="field.type === 'EMAIL'"
                      v-model="formData[field.name]"
                      :label="field.label"
                      :placeholder="field.placeholder || 'email@exemplo.com'"
                      type="email"
                      :required="field.required"
                      :rules="getFieldRules(field)"
                      :hint="field.helpText"
                      persistent-hint
                    />

                    <!-- Campo de CPF -->
                    <v-text-field
                      v-else-if="field.type === 'CPF'"
                      v-model="formData[field.name]"
                      :label="field.label"
                      :placeholder="field.placeholder || '000.000.000-00'"
                      v-mask="'###.###.###-##'"
                      :required="field.required"
                      :rules="getFieldRules(field)"
                      :hint="field.helpText"
                      persistent-hint
                    />

                    <!-- Campo de CNPJ -->
                    <v-text-field
                      v-else-if="field.type === 'CNPJ'"
                      v-model="formData[field.name]"
                      :label="field.label"
                      :placeholder="field.placeholder || '00.000.000/0000-00'"
                      v-mask="'##.###.###/####-##'"
                      :required="field.required"
                      :rules="getFieldRules(field)"
                      :hint="field.helpText"
                      persistent-hint
                    />

                    <!-- Campo de Telefone -->
                    <v-text-field
                      v-else-if="field.type === 'PHONE'"
                      v-model="formData[field.name]"
                      :label="field.label"
                      :placeholder="field.placeholder || '(00) 00000-0000'"
                      v-mask="['(##) ####-####', '(##) #####-####']"
                      :required="field.required"
                      :rules="getFieldRules(field)"
                      :hint="field.helpText"
                      persistent-hint
                    />

                    <!-- Campo de Moeda -->
                    <v-text-field
                      v-else-if="field.type === 'CURRENCY'"
                      v-model="formData[field.name]"
                      :label="field.label"
                      :placeholder="field.placeholder"
                      prefix="R$"
                      type="number"
                      step="0.01"
                      :required="field.required"
                      :rules="getFieldRules(field)"
                      :hint="field.helpText"
                      persistent-hint
                    />

                    <!-- Dropdown -->
                    <v-select
                      v-else-if="field.type === 'DROPDOWN'"
                      v-model="formData[field.name]"
                      :label="field.label"
                      :items="getFieldOptions(field)"
                      :required="field.required"
                      :rules="getFieldRules(field)"
                      :hint="field.helpText"
                      persistent-hint
                    />

                    <!-- Checkbox -->
                    <div v-else-if="field.type === 'CHECKBOX'">
                      <p class="text-subtitle-2 mb-2">{{ field.label }}</p>
                      <v-checkbox
                        v-for="option in getFieldOptions(field)"
                        :key="option.value"
                        v-model="formData[field.name]"
                        :label="option.label"
                        :value="option.value"
                        multiple
                        hide-details
                      />
                      <p v-if="field.helpText" class="text-caption text-grey mt-1">
                        {{ field.helpText }}
                      </p>
                    </div>

                    <!-- Textarea -->
                    <v-textarea
                      v-else-if="field.type === 'TEXTAREA'"
                      v-model="formData[field.name]"
                      :label="field.label"
                      :placeholder="field.placeholder"
                      rows="3"
                      :required="field.required"
                      :rules="getFieldRules(field)"
                      :hint="field.helpText"
                      persistent-hint
                    />
                  </v-col>
                </v-row>
              </v-form>
            </v-card-text>

            <v-card-actions>
              <v-btn variant="text" @click="step--">Voltar</v-btn>
              <v-spacer />
              <v-btn variant="text" @click="close">Cancelar</v-btn>
              <v-btn
                color="primary"
                @click="createProcess"
                :loading="creating"
                :disabled="!formValid"
              >
                Criar Processo
              </v-btn>
            </v-card-actions>
          </v-stepper-window-item>
        </v-stepper-window>
      </v-stepper>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useProcessStore } from '@/stores/processes'
import { useProcessTypeStore } from '@/stores/processTypes'

const router = useRouter()
const processStore = useProcessStore()
const processTypeStore = useProcessTypeStore()

// Estado
const dialog = ref(false)
const step = ref(1)
const creating = ref(false)
const formValid = ref(true)
const searchType = ref('')
const selectedProcessTypeId = ref(null)

const dynamicForm = ref(null)
const processData = ref({
  title: '',
  description: ''
})
const formData = ref({})

// Computed
const processTypes = computed(() => processTypeStore.processTypes)

const filteredProcessTypes = computed(() => {
  if (!searchType.value) return processTypes.value
  
  const search = searchType.value.toLowerCase()
  return processTypes.value.filter(pt => 
    pt.name.toLowerCase().includes(search) ||
    pt.description?.toLowerCase().includes(search)
  )
})

const selectedProcessType = computed(() => {
  return processTypes.value.find(pt => pt.id === selectedProcessTypeId.value)
})

const hasFormFields = computed(() => {
  return selectedProcessType.value?.formFields?.length > 0
})

// Watch
watch(selectedProcessTypeId, () => {
  // Resetar dados do formulário ao mudar tipo
  formData.value = {}
  
  // Definir valores padrão
  if (selectedProcessType.value?.formFields) {
    selectedProcessType.value.formFields.forEach(field => {
      if (field.defaultValue) {
        formData.value[field.name] = field.defaultValue
      } else if (field.type === 'CHECKBOX') {
        formData.value[field.name] = []
      }
    })
  }
})

// Métodos
function nextStep() {
  step.value++
}

function getFieldCols(field) {
  switch (field.type) {
    case 'TEXTAREA':
      return 12
    case 'CHECKBOX':
      return 12
    default:
      return { cols: 12, md: 6 }
  }
}

function getFieldOptions(field) {
  try {
    const options = JSON.parse(field.options || '[]')
    return options.map(opt => ({
      title: opt.label || opt.value,
      value: opt.value,
      label: opt.label || opt.value
    }))
  } catch {
    return []
  }
}

function getFieldRules(field) {
  const rules = []
  
  // Regra de obrigatoriedade
  if (field.required) {
    rules.push(v => {
      if (field.type === 'CHECKBOX') {
        return (v && v.length > 0) || `${field.label} é obrigatório`
      }
      return !!v || `${field.label} é obrigatório`
    })
  }

  // Validações específicas por tipo
  switch (field.type) {
    case 'EMAIL':
      rules.push(v => !v || /.+@.+\..+/.test(v) || 'E-mail inválido')
      break
    case 'CPF':
      rules.push(v => !v || /^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(v) || 'CPF inválido')
      break
    case 'CNPJ':
      rules.push(v => !v || /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/.test(v) || 'CNPJ inválido')
      break
  }

  // Validações customizadas
  if (field.validations) {
    try {
      const validations = JSON.parse(field.validations)
      
      if (validations.minLength) {
        rules.push(v => !v || v.length >= validations.minLength || 
          validations.customMessage || `Mínimo ${validations.minLength} caracteres`)
      }
      
      if (validations.maxLength) {
        rules.push(v => !v || v.length <= validations.maxLength || 
          validations.customMessage || `Máximo ${validations.maxLength} caracteres`)
      }
      
      if (validations.min !== undefined) {
        rules.push(v => !v || Number(v) >= validations.min || 
          validations.customMessage || `Valor mínimo: ${validations.min}`)
      }
      
      if (validations.max !== undefined) {
        rules.push(v => !v || Number(v) <= validations.max || 
          validations.customMessage || `Valor máximo: ${validations.max}`)
      }
      
      if (validations.pattern) {
        rules.push(v => !v || new RegExp(validations.pattern).test(v) || 
          validations.customMessage || 'Formato inválido')
      }
    } catch (e) {
      console.error('Erro ao parsear validações:', e)
    }
  }

  return rules
}

async function createProcess() {
  if (hasFormFields.value && !formValid.value) return

  creating.value = true
  try {
    const data = {
      processTypeId: selectedProcessTypeId.value,
      title: processData.value.title,
      description: processData.value.description,
      formData: hasFormFields.value ? formData.value : undefined
    }

    const created = await processStore.createProcess(data)
    window.showSnackbar('Processo criado com sucesso!', 'success')
    
    close()
    
    // Ir para o processo criado
    router.push(`/processes/${created.id}`)
  } catch (error) {
    window.showSnackbar(error.message || 'Erro ao criar processo', 'error')
  } finally {
    creating.value = false
  }
}

function close() {
  dialog.value = false
  step.value = 1
  selectedProcessTypeId.value = null
  processData.value = {
    title: '',
    description: ''
  }
  formData.value = {}
  searchType.value = ''
}

// Carregar tipos de processo ao abrir
watch(dialog, (newVal) => {
  if (newVal) {
    processTypeStore.fetchProcessTypes()
  }
})
</script>