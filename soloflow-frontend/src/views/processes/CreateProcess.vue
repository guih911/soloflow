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
          Criar Novo Processo
        </h1>
        <p class="text-subtitle-1 text-medium-emphasis">
          Selecione o tipo de processo e preencha as informações necessárias
        </p>
      </div>
    </div>

    <!-- Step 1: Seleção do Tipo de Processo -->
    <div v-if="!selectedProcessType">
      <v-card class="mb-4">
        <v-card-text>
          <v-text-field
            v-model="searchType"
            label="Buscar tipo de processo"
            prepend-inner-icon="mdi-magnify"
            clearable
            hide-details
          />
        </v-card-text>
      </v-card>

      <v-row>
        <v-col
          v-for="processType in filteredProcessTypes"
          :key="processType.id"
          cols="12"
          md="6"
          lg="4"
        >
          <v-hover v-slot="{ isHovering, props }">
            <v-card
              v-bind="props"
              :elevation="isHovering ? 8 : 2"
              class="h-100 cursor-pointer"
              @click="selectProcessType(processType)"
            >
              <v-card-title class="d-flex align-center">
                <v-icon
                  color="primary"
                  class="mr-2"
                >
                  mdi-file-document-multiple-outline
                </v-icon>
                {{ processType.name }}
              </v-card-title>

              <v-card-subtitle v-if="processType.description">
                {{ processType.description }}
              </v-card-subtitle>

              <v-card-text>
                <div class="d-flex flex-wrap gap-2 mb-3">
                  <v-chip size="small" variant="tonal">
                    <v-icon start size="16">mdi-debug-step-over</v-icon>
                    {{ processType.steps?.length || 0 }} etapas
                  </v-chip>
                  <v-chip v-if="processType.formFields?.length > 0" size="small" variant="tonal">
                    <v-icon start size="16">mdi-form-textbox</v-icon>
                    {{ processType.formFields.length }} campos
                  </v-chip>
                </div>

                <!-- Preview das etapas -->
                <div v-if="processType.steps?.length > 0">
                  <p class="text-caption text-medium-emphasis mb-2">Fluxo do processo:</p>
                  <div class="d-flex flex-wrap gap-1">
                    <v-chip
                      v-for="(step, idx) in processType.steps.slice(0, 4)"
                      :key="step.id"
                      size="x-small"
                      variant="text"
                    >
                      {{ idx + 1 }}. {{ step.name }}
                    </v-chip>
                    <v-chip
                      v-if="processType.steps.length > 4"
                      size="x-small"
                      variant="text"
                    >
                      +{{ processType.steps.length - 4 }}
                    </v-chip>
                  </div>
                </div>
              </v-card-text>

              <v-divider />

              <v-card-actions>
                <v-spacer />
                <v-btn
                  color="primary"
                  variant="text"
                  @click.stop="selectProcessType(processType)"
                >
                  Selecionar
                  <v-icon end>mdi-arrow-right</v-icon>
                </v-btn>
              </v-card-actions>
            </v-card>
          </v-hover>
        </v-col>
      </v-row>

      <v-card
        v-if="filteredProcessTypes.length === 0"
        class="text-center py-12"
      >
        <v-icon size="64" color="grey-lighten-1">
          mdi-file-document-multiple-outline
        </v-icon>
        <p class="text-h6 mt-4 text-grey">
          Nenhum tipo de processo encontrado
        </p>
      </v-card>
    </div>

    <!-- Step 2: Formulário do Processo -->
    <div v-else>
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon color="primary" class="mr-2">
            mdi-file-document-multiple-outline
          </v-icon>
          {{ selectedProcessType.name }}
          <v-spacer />
          <v-btn
            variant="text"
            size="small"
            @click="selectedProcessType = null"
          >
            <v-icon start>mdi-pencil</v-icon>
            Trocar tipo
          </v-btn>
        </v-card-title>

        <v-divider />

        <v-form ref="processForm" v-model="formValid">
          <v-card-text>
            <!-- Informações Básicas -->
            <h3 class="text-h6 mb-4">Informações Básicas</h3>
            
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
              class="mb-6"
            />

            <!-- Campos Personalizados -->
            <div v-if="selectedProcessType.formFields?.length > 0">
              <v-divider class="mb-6" />
              
              <h3 class="text-h6 mb-4">Informações Específicas</h3>
              
              <v-row>
                <v-col
                  v-for="field in selectedProcessType.formFields"
                  :key="field.id"
                  :cols="getFieldCols(field)"
                >
                  <DynamicField
                    v-model="formData[field.name]"
                    :field="field"
                  />
                </v-col>
              </v-row>
            </div>
          </v-card-text>

          <v-divider />

          <v-card-actions>
            <v-btn
              variant="text"
              @click="selectedProcessType = null"
            >
              Voltar
            </v-btn>
            <v-spacer />
            <v-btn
              variant="text"
              @click="goBack"
            >
              Cancelar
            </v-btn>
            <v-btn
              color="primary"
              variant="elevated"
              :loading="creating"
              :disabled="!formValid"
              @click="createProcess"
            >
              <v-icon start>mdi-check</v-icon>
              Criar Processo
            </v-btn>
          </v-card-actions>
        </v-form>
      </v-card>
    </div>

    <!-- Loading -->
    <v-overlay
      :model-value="loadingTypes"
      contained
      class="align-center justify-center"
    >
      <v-progress-circular
        indeterminate
        size="64"
        color="primary"
      />
    </v-overlay>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useProcessStore } from '@/stores/processes'
import { useProcessTypeStore } from '@/stores/processTypes'
import DynamicField from '@/components/DynamicField.vue'

const router = useRouter()
const processStore = useProcessStore()
const processTypeStore = useProcessTypeStore()

// Estado
const searchType = ref('')
const selectedProcessType = ref(null)
const formValid = ref(true)
const creating = ref(false)

const processForm = ref(null)
const processData = ref({
  title: '',
  description: ''
})
const formData = ref({})

// Computed
const loadingTypes = computed(() => processTypeStore.loading)
const processTypes = computed(() => processTypeStore.processTypes)

const filteredProcessTypes = computed(() => {
  if (!searchType.value) return processTypes.value
  
  const search = searchType.value.toLowerCase()
  return processTypes.value.filter(pt => 
    pt.name.toLowerCase().includes(search) ||
    pt.description?.toLowerCase().includes(search)
  )
})

// Métodos
function goBack() {
  router.push('/processes')
}

function selectProcessType(processType) {
  selectedProcessType.value = processType
  formData.value = {}
  
  // Definir valores padrão dos campos
  if (processType.formFields) {
    processType.formFields.forEach(field => {
      if (field.defaultValue) {
        formData.value[field.name] = field.defaultValue
      } else if (field.type === 'CHECKBOX') {
        formData.value[field.name] = []
      }
    })
  }
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

async function createProcess() {
  if (!formValid.value || !selectedProcessType.value) return

  creating.value = true
  try {
    const hasFormFields = selectedProcessType.value.formFields?.length > 0
    
    const data = {
      processTypeId: selectedProcessType.value.id,
      title: processData.value.title,
      description: processData.value.description,
      formData: hasFormFields ? formData.value : undefined
    }

    const created = await processStore.createProcess(data)
    window.showSnackbar('Processo criado com sucesso!', 'success')
    
    // Verificar se tem primeira etapa para executar
    const firstStep = created.stepExecutions?.find(se => se.status === 'IN_PROGRESS')
    
    if (firstStep) {
      // Ir direto para execução da primeira etapa
      router.push(`/processes/${created.id}/execute/${firstStep.id}`)
    } else {
      // Ir para visualização do processo
      router.push(`/processes/${created.id}`)
    }
  } catch (error) {
    window.showSnackbar(error.message || 'Erro ao criar processo', 'error')
  } finally {
    creating.value = false
  }
}

onMounted(() => {
  processTypeStore.fetchProcessTypes()
})
</script>

<style scoped>
.cursor-pointer {
  cursor: pointer;
}

.gap-1 {
  gap: 4px;
}

.gap-2 {
  gap: 8px;
}
</style>