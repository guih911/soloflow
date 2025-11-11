<template>
  <div class="create-process-container">
    <div class="header-section mb-6">
      <div class="d-flex align-center">
        <v-btn icon="mdi-arrow-left" variant="text" @click="goBack" class="mr-3" />
        <div class="flex-grow-1">
          <h1 class="text-h4 font-weight-bold mb-2">
            <v-icon size="32" class="mr-2" color="primary">
              {{ selectedProcessType ? 'mdi-rocket-launch' : 'mdi-file-document-plus' }}
            </v-icon>
            {{ selectedProcessType ? 'Iniciar Processo' : 'Criar Novo Processo' }}
          </h1>
          <p class="text-subtitle-1 text-medium-emphasis">
            {{ selectedProcessType 
              ? 'Preencha as informações necessárias para iniciar o processo' 
              : 'Selecione o tipo de processo e preencha as informações necessárias'
            }}
          </p>
        </div>
      </div>
    </div>

    
    <div v-if="!selectedProcessType">
      
    </div>

   
    <div v-else>
      <v-card class="form-card" elevation="2">
       
        <div class="selected-process-header pa-6">
          <div class="d-flex align-center">
            <v-avatar color="primary" size="56" class="mr-4">
              <v-icon size="28" color="white">mdi-file-document-multiple</v-icon>
            </v-avatar>
            
            <div class="flex-grow-1">
              <h3 class="text-h5 font-weight-bold">{{ selectedProcessType.name }}</h3>
              <p v-if="selectedProcessType.description" class="text-body-1 text-medium-emphasis mt-1">
                {{ selectedProcessType.description }}
              </p>
            </div>
            
            <v-btn variant="text" size="small" @click="changeProcessType" v-if="!preselectedType">
              <v-icon start>mdi-pencil</v-icon>
              Trocar tipo
            </v-btn>
          </div>
        </div>

        <v-divider />

        <!-- ✅ FORMULÁRIO COM PROGRESSO DE UPLOAD -->
        <v-form ref="processForm" v-model="formValid">
          <div class="form-content pa-6">
            
            <!-- ✅ SEÇÃO: Campos do Formulário -->
            <div v-if="hasFormFields" class="form-section mb-6">
              <h4 class="text-h6 font-weight-medium mb-4 d-flex align-center">
                <v-icon color="purple" class="mr-2">mdi-form-textbox</v-icon>
                Dados do Processo
              </h4>
              
              <v-row>
                <v-col
                  v-for="field in getVisibleFormFields(selectedProcessType)"
                  :key="field.id"
                  :cols="getFieldCols(field)"
                >
               
                  <v-text-field
                    v-if="field.type === 'TEXT'"
                    v-model="formData[field.name]"
                    :label="field.label"
                    :placeholder="field.placeholder"
                    :required="field.required"
                    :rules="getFieldRules(field)"
                    :hint="field.helpText"
                    persistent-hint
                    variant="outlined"
                    prepend-inner-icon="mdi-text"
                    class="mb-3"
                  />

                  <v-text-field
                    v-else-if="field.type === 'EMAIL'"
                    v-model="formData[field.name]"
                    :label="field.label"
                    :placeholder="field.placeholder"
                    :required="field.required"
                    :rules="getFieldRules(field)"
                    :hint="field.helpText"
                    persistent-hint
                    variant="outlined"
                    prepend-inner-icon="mdi-email"
                    class="mb-3"
                  />

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
                    variant="outlined"
                    prepend-inner-icon="mdi-numeric"
                    class="mb-3"
                  />

                  <v-text-field
                    v-else-if="field.type === 'DATE'"
                    v-model="formData[field.name]"
                    :label="field.label"
                    type="date"
                    :required="field.required"
                    :rules="getFieldRules(field)"
                    :hint="field.helpText"
                    persistent-hint
                    variant="outlined"
                    prepend-inner-icon="mdi-calendar"
                    class="mb-3"
                  />

                  <v-text-field
                    v-else-if="field.type === 'CPF'"
                    v-model="formData[field.name]"
                    :label="field.label"
                    :placeholder="field.placeholder || '000.000.000-00'"
                    :required="field.required"
                    :rules="getFieldRules(field)"
                    :hint="field.helpText"
                    v-mask="'###.###.###-##'"
                    persistent-hint
                    variant="outlined"
                    prepend-inner-icon="mdi-card-account-details"
                    class="mb-3"
                  />

                  <v-text-field
                    v-else-if="field.type === 'CNPJ'"
                    v-model="formData[field.name]"
                    :label="field.label"
                    :placeholder="field.placeholder || '00.000.000/0000-00'"
                    :required="field.required"
                    :rules="getFieldRules(field)"
                    :hint="field.helpText"
                    v-mask="'##.###.###/####-##'"
                    persistent-hint
                    variant="outlined"
                    prepend-inner-icon="mdi-domain"
                    class="mb-3"
                  />

                  <v-text-field
                    v-else-if="field.type === 'PHONE'"
                    v-model="formData[field.name]"
                    :label="field.label"
                    :placeholder="field.placeholder || '(00) 00000-0000'"
                    :required="field.required"
                    :rules="getFieldRules(field)"
                    :hint="field.helpText"
                    v-mask="['(##) ####-####', '(##) #####-####']"
                    persistent-hint
                    variant="outlined"
                    prepend-inner-icon="mdi-phone"
                    class="mb-3"
                  />

                  <v-text-field
                    v-else-if="field.type === 'CURRENCY'"
                    v-model="formData[field.name]"
                    :label="field.label"
                    :placeholder="field.placeholder"
                    :required="field.required"
                    :rules="getFieldRules(field)"
                    :hint="field.helpText"
                    persistent-hint
                    variant="outlined"
                    prepend-inner-icon="mdi-currency-usd"
                    prefix="R$"
                    class="mb-3"
                  />

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
                    variant="outlined"
                    prepend-inner-icon="mdi-text-long"
                    class="mb-3"
                  />

                  <v-select
                    v-else-if="field.type === 'DROPDOWN'"
                    v-model="formData[field.name]"
                    :label="field.label"
                    :placeholder="field.placeholder"
                    :required="field.required"
                    :rules="getFieldRules(field)"
                    :hint="field.helpText"
                    :items="field.options || []"
                    persistent-hint
                    variant="outlined"
                    prepend-inner-icon="mdi-form-dropdown"
                    class="mb-3"
                  />

                  <div v-else-if="field.type === 'CHECKBOX'" class="mb-4">
                    <label class="text-subtitle-2 mb-2 d-block font-weight-medium">
                      {{ field.label }}
                      <span v-if="field.required" class="text-error">*</span>
                    </label>
                    <v-checkbox
                      v-for="(option, idx) in (field.options || [])"
                      :key="idx"
                      v-model="formData[field.name]"
                      :label="option"
                      :value="option"
                      hide-details
                      density="compact"
                      class="mt-1"
                    />
                    <small v-if="field.helpText" class="text-caption text-medium-emphasis d-block mt-2">
                      {{ field.helpText }}
                    </small>
                  </div>
                </v-col>
              </v-row>
            </div>

            <!-- Observações (mantido igual) -->
            <div class="form-section">
              <v-divider v-if="hasFormFields" class="mb-6" />
              
              <h4 class="text-h6 font-weight-medium mb-4 d-flex align-center">
                <v-icon color="info" class="mr-2">mdi-note-text</v-icon>
                Observações Adicionais
              </h4>
              
              <v-row>
                <v-col cols="12">
                  <v-textarea
                    v-model="processData.observations"
                    label="Observações sobre este processo"
                    placeholder="Adicione informações adicionais, contexto ou observações específicas sobre este processo..."
                    rows="4"
                    counter="1000"
                    :rules="[v => !v || v.length <= 1000 || 'Máximo 1000 caracteres']"
                    variant="outlined"
                    prepend-inner-icon="mdi-note-text"
                    hint="Campo opcional para informações complementares"
                    persistent-hint
                  />
                </v-col>
              </v-row>
            </div>
          </div>
        </v-form>

        <v-divider />

        <!-- ✅ ACTIONS COM FEEDBACK DE PROGRESSO -->
        <v-card-actions class="pa-6">
          <v-btn variant="text" @click="changeProcessType" v-if="!preselectedType">
            <v-icon start>mdi-arrow-left</v-icon>
            Trocar Tipo
          </v-btn>
          
          <v-btn variant="text" @click="goBack" v-else>
            Cancelar
          </v-btn>
          
          <v-spacer />
          
        
          
          <v-btn
            color="primary"
            variant="elevated"
            size="large"
            :loading="creating"
            :disabled="!formValid"
            @click="createProcessWithFiles"
          >
            <v-icon start>mdi-rocket-launch</v-icon>
            Criar Processo
          </v-btn>
        </v-card-actions>
      </v-card>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useProcessStore } from '@/stores/processes'
import { useProcessTypeStore } from '@/stores/processTypes'

const router = useRouter()
const route = useRoute()
const processStore = useProcessStore()
const processTypeStore = useProcessTypeStore()

// Props
const props = defineProps({
  typeId: String
})

// ✅ ESTADO REFATORADO
const searchType = ref('')
const selectedProcessTypeId = ref(null)
const formValid = ref(true)
const creating = ref(false)



const processForm = ref(null)
const processData = ref({
  observations: ''
})
const formData = ref({})


const loadingTypes = computed(() => processTypeStore.loading)
const processTypes = computed(() => processTypeStore.processTypes)
const preselectedType = computed(() => props.typeId || route.params.typeId)
const selectedProcessType = computed(() => {
  if (selectedProcessTypeId.value) {
    return processTypes.value.find(pt => pt.id === selectedProcessTypeId.value)
  }
  return null
})
const hasFormFields = computed(() => {
  return getVisibleFieldsCount(selectedProcessType.value) > 0
})


async function createProcessWithFiles() {
  if (!formValid.value || !selectedProcessType.value) {
    window.showSnackbar?.('Por favor, corrija os erros no formulário', 'error')
    return
  }

  creating.value = true

  try {
    const basePayload = {
      processTypeId: selectedProcessType.value.id,
      title: generateProcessTitle(),
      description: processData.value.observations?.trim() || null,
      formData: formData.value
    }

    const createdProcess = await processStore.createProcess(basePayload)

    window.showSnackbar?.('Processo criado com sucesso!', 'success')

    setTimeout(() => {
      router.push(`/processes/${createdProcess.id}`)
    }, 500)

  } catch (error) {
    console.error('Erro ao criar processo:', error)
    window.showSnackbar?.(error.message || 'Erro ao criar processo', 'error')
  } finally {
    creating.value = false
  }
}


function generateProcessTitle() {
  const now = new Date()
  const dateStr = now.toLocaleDateString('pt-BR')
  const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  
  return `${selectedProcessType.value?.name} - ${dateStr} ${timeStr}`
}


function getVisibleFormFields(processType) {
  if (!processType?.formFields) return []
  return processType.formFields
}

function getVisibleFieldsCount(processType) {
  return getVisibleFormFields(processType).length
}

function getFieldCols(field) {
  switch (field.type) {
    case 'TEXTAREA':
    case 'CHECKBOX':
      return 12
    default:
      return { cols: 12, md: 6 }
  }
}

function getFieldRules(field) {
  const rules = []
  
  if (field.required) {
    rules.push(v => {
      if (field.type === 'CHECKBOX') {
        return (v && v.length > 0) || `${field.label} é obrigatório`
      }
      return !!v || `${field.label} é obrigatório`
    })
  }


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
    case 'PHONE':
      rules.push(v => !v || /^\(\d{2}\) \d{4,5}-\d{4}$/.test(v) || 'Telefone inválido')
      break
  }

  return rules
}

// Métodos de navegação (mantidos)
function goBack() {
  router.push('/processes')
}

function changeProcessType() {
  selectedProcessTypeId.value = null
  formData.value = {}
}

function selectProcessType(processType) {
  selectedProcessTypeId.value = processType.id
  initializeFormData(processType)
}

function proceedToForm() {
  const processType = processTypes.value.find(pt => pt.id === selectedProcessTypeId.value)
  if (processType) {
    initializeFormData(processType)
  }
}

function initializeFormData(processType) {
  formData.value = {}

  if (processType?.formFields) {
    getVisibleFormFields(processType).forEach(field => {
      if (field.defaultValue) {
        formData.value[field.name] = field.defaultValue
      } else if (field.type === 'CHECKBOX') {
        formData.value[field.name] = []
      }
    })
  }
}

// Watchers (mantidos)
watch(() => preselectedType.value, async (newTypeId) => {
  if (newTypeId && processTypes.value.length > 0) {
    const processType = processTypes.value.find(pt => pt.id === newTypeId)
    if (processType) {
      console.log('✨ Pre-selecting process type:', processType.name)
      selectedProcessTypeId.value = newTypeId
      initializeFormData(processType)
    }
  }
}, { immediate: true })

// Lifecycle (mantido)
onMounted(async () => {
  console.log('🚀 CreateProcess mounted, typeId:', preselectedType.value)
  
  if (processTypes.value.length === 0) {
    await processTypeStore.fetchProcessTypes()
  }
  
  if (preselectedType.value) {
    const processType = processTypes.value.find(pt => pt.id === preselectedType.value)
    if (processType) {
      selectedProcessTypeId.value = preselectedType.value
      initializeFormData(processType)
    }
  }
})
</script>

<style scoped>
/* Estilos mantidos iguais + novos para upload */
.create-process-container {
  max-width: 1200px;
  margin: 0 auto;
}

.header-section {
  background: linear-gradient(135deg, rgba(25, 118, 210, 0.1), rgba(66, 165, 245, 0.05));
  border-radius: 16px;
  padding: 24px;
  border: 1px solid rgba(25, 118, 210, 0.1);
  margin-bottom: 32px;
  backdrop-filter: blur(10px);
}

.form-card {
  border-radius: 16px;
  overflow: hidden;
}

.selected-process-header {
  background: linear-gradient(135deg, rgba(25, 118, 210, 0.05), rgba(66, 165, 245, 0.02));
  border-bottom: 1px solid rgba(25, 118, 210, 0.1);
}

.form-section h4 {
  border-left: 4px solid rgb(var(--v-theme-primary));
  padding-left: 16px;
}

/* Responsividade */
@media (max-width: 768px) {
  .header-section {
    padding: 16px;
  }
  
  .selected-process-header .d-flex {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }
}
</style>