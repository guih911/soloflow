<template>
  <div>
    <!-- Header -->
    <div class="d-flex align-center justify-space-between mb-6">
      <div>
        <h1 class="text-h4 font-weight-bold">Criar Novo Processo</h1>
        <p class="text-subtitle-1 text-medium-emphasis">
          Escolha um tipo de processo para iniciar um novo workflow
        </p>
      </div>
      <div class="d-flex gap-2">
        <v-btn
          variant="text"
          @click="refreshData"
          :loading="refreshing"
        >
          <v-icon start>mdi-refresh</v-icon>
          Atualizar
        </v-btn>
        <!-- Botão para criar processo genérico (mantém seleção de tipo) -->
        <v-btn
          color="secondary"
          variant="outlined"
          @click="startGenericProcessCreation"
        >
          <v-icon start>mdi-plus</v-icon>
          Criar Genérico
        </v-btn>
      </div>
    </div>

    <!-- Filtros -->
    <v-card class="mb-6">
      <v-card-text>
        <v-row>
          <v-col cols="12" md="6">
            <v-text-field
              v-model="search"
              label="Buscar tipo de processo"
              prepend-inner-icon="mdi-magnify"
              clearable
              hide-details
            />
          </v-col>
          <v-col cols="12" md="6">
            <v-select
              v-model="filterBySteps"
              :items="stepFilterOptions"
              label="Filtrar por etapas"
              clearable
              hide-details
            />
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <!-- Lista de Tipos de Processo Disponíveis -->
    <v-row v-if="!loading">
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
            class="h-100 d-flex flex-column cursor-pointer position-relative"
            @click="startProcessCreation(processType)"
          >
            <!-- Badge de Processo Rápido -->
            <v-chip
              size="small"
              color="success"
              class="position-absolute fast-process-badge"
              style="top: 8px; right: 8px; z-index: 1;"
            >
              <v-icon start size="16">mdi-flash</v-icon>
              Criação Rápida
            </v-chip>

            <!-- Header do Card -->
            <v-sheet
              color="primary"
              class="pa-3 d-flex align-center"
            >
              <v-icon color="white" class="mr-2" size="24">
                mdi-file-document-multiple-outline
              </v-icon>
              <span class="text-h6 text-white font-weight-medium">
                {{ processType.name }}
              </span>
            </v-sheet>

            <v-card-subtitle v-if="processType.description" class="py-3">
              {{ processType.description }}
            </v-card-subtitle>

            <v-card-text class="flex-grow-1">
              <!-- Estatísticas do Processo -->
              <div class="d-flex flex-wrap gap-2 mb-4">
                <v-chip size="small" variant="tonal" color="primary">
                  <v-icon start size="16">mdi-debug-step-over</v-icon>
                  {{ processType.steps?.length || 0 }} etapas
                </v-chip>
                
                <v-chip 
                  v-if="processType.formFields?.length > 0" 
                  size="small" 
                  variant="tonal" 
                  color="info"
                >
                  <v-icon start size="16">mdi-form-textbox</v-icon>
                  {{ processType.formFields.length }} campos
                </v-chip>
                
                <v-chip 
                  v-if="hasSignatureSteps(processType)" 
                  size="small" 
                  variant="tonal" 
                  color="error"
                >
                  <v-icon start size="16">mdi-draw-pen</v-icon>
                  Assinatura
                </v-chip>
                
                <v-chip 
                  v-if="hasAttachmentSteps(processType)" 
                  size="small" 
                  variant="tonal" 
                  color="warning"
                >
                  <v-icon start size="16">mdi-paperclip</v-icon>
                  Anexos
                </v-chip>
              </div>

              <!-- Preview das Etapas -->
              <div v-if="processType.steps?.length > 0">
                <p class="text-caption text-medium-emphasis mb-2">Fluxo do processo:</p>
                <div class="d-flex flex-wrap gap-1">
                  <v-chip
                    v-for="(step, idx) in processType.steps.slice(0, 3)"
                    :key="step.id"
                    size="x-small"
                    variant="text"
                    :color="getStepTypeColor(step.type)"
                  >
                    {{ idx + 1 }}. {{ step.name }}
                  </v-chip>
                  <v-chip
                    v-if="processType.steps.length > 3"
                    size="x-small"
                    variant="text"
                    color="grey"
                  >
                    +{{ processType.steps.length - 3 }} mais
                  </v-chip>
                </div>
              </div>

              <!-- Tempo Estimado -->
              <div class="mt-3">
                <v-chip size="x-small" variant="outlined">
                  <v-icon start size="12">mdi-clock-outline</v-icon>
                  ~{{ getEstimatedTime(processType) }}
                </v-chip>
              </div>

              <!-- Indicador de Criação Rápida -->
              <v-alert
                type="success"
                variant="tonal"
                density="compact"
                class="mt-3"
              >
                <v-icon start size="16">mdi-lightning-bolt</v-icon>
                <span class="text-caption">
                  Clique para iniciar diretamente - sem seleção de tipo
                </span>
              </v-alert>
            </v-card-text>

            <v-divider />

            <!-- Actions Melhoradas -->
            <v-card-actions class="pa-4">
              <v-btn
                color="primary"
                variant="elevated"
                block
                @click.stop="startProcessCreation(processType)"
                :disabled="!canCreateProcess(processType)"
                class="text-none"
              >
                <v-icon start>mdi-rocket-launch</v-icon>
                Iniciar Agora
                <v-icon end>mdi-arrow-right</v-icon>
              </v-btn>
            </v-card-actions>

            <!-- Badge de Status (mantido) -->
            <v-chip
              v-if="!canCreateProcess(processType)"
              size="small"
              color="error"
              class="position-absolute"
              style="top: 8px; left: 8px; z-index: 1;"
            >
              <v-icon start size="12">mdi-alert</v-icon>
              Incompleto
            </v-chip>
          </v-card>
        </v-hover>
      </v-col>
    </v-row>

    <!-- Estado Vazio -->
    <v-card
      v-if="!loading && filteredProcessTypes.length === 0"
      class="text-center py-12"
    >
      <v-icon size="64" color="grey-lighten-1">
        mdi-file-document-multiple-outline
      </v-icon>
      <p class="text-h6 mt-4 text-grey">
        {{ search ? 'Nenhum tipo de processo encontrado' : 'Nenhum tipo de processo disponível' }}
      </p>
      <p class="text-body-2 text-grey mb-4">
        {{ search ? 'Tente ajustar sua busca' : 'Entre em contato com um administrador para criar tipos de processo' }}
      </p>
      
      <v-btn
        v-if="canManageProcessTypes && !search"
        color="primary"
        @click="goToProcessTypes"
      >
        <v-icon start>mdi-plus</v-icon>
        Criar Tipo de Processo
      </v-btn>
    </v-card>

    <!-- Loading -->
    <div v-if="loading" class="text-center py-12">
      <v-progress-circular
        indeterminate
        color="primary"
        size="64"
      />
      <p class="text-body-2 text-grey mt-4">Carregando tipos de processo...</p>
    </div>

    <!-- Dialog de Criação de Processo Melhorado -->
    <ProcessCreateDialog
      v-model="createDialog"
      :selected-process-type="selectedProcessTypeForDialog"
      @created="onProcessCreated"
      @close="closeCreateDialog"
    />

    <!-- Snackbar para feedback melhorado -->
    <v-snackbar
      v-model="showFeedback"
      :color="feedbackColor"
      :timeout="4000"
      location="top right"
      elevation="6"
    >
      <div class="d-flex align-center">
        <v-icon start>{{ feedbackIcon }}</v-icon>
        {{ feedbackMessage }}
      </div>
      <template v-slot:actions>
        <v-btn
          variant="text"
          @click="showFeedback = false"
        >
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </template>
    </v-snackbar>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useProcessTypeStore } from '@/stores/processTypes'
import ProcessCreateDialog from '@/components/ProcessCreateDialog.vue'

const router = useRouter()
const authStore = useAuthStore()
const processTypeStore = useProcessTypeStore()

// Estado
const search = ref('')
const filterBySteps = ref(null)
const refreshing = ref(false)
const createDialog = ref(false)
const selectedProcessTypeForDialog = ref(null)

// Estado para feedback melhorado
const showFeedback = ref(false)
const feedbackMessage = ref('')
const feedbackColor = ref('success')
const feedbackIcon = ref('mdi-check-circle')

// Computed
const loading = computed(() => processTypeStore.loading)
const processTypes = computed(() => processTypeStore.processTypes)
const canManageProcessTypes = computed(() => authStore.canManageProcessTypes)

// Opções de filtro
const stepFilterOptions = [
  { title: 'Com assinatura digital', value: 'signature' },
  { title: 'Com anexos', value: 'attachments' },
  { title: 'Só aprovação', value: 'approval' },
  { title: 'Processo simples (1-3 etapas)', value: 'simple' },
  { title: 'Processo complexo (4+ etapas)', value: 'complex' }
]

// Filtros
const filteredProcessTypes = computed(() => {
  let result = processTypes.value.filter(pt => pt.isActive && canCreateProcess(pt))

  // Filtro por busca
  if (search.value) {
    const searchTerm = search.value.toLowerCase()
    result = result.filter(pt => 
      pt.name.toLowerCase().includes(searchTerm) ||
      pt.description?.toLowerCase().includes(searchTerm)
    )
  }

  // Filtro por características
  if (filterBySteps.value) {
    switch (filterBySteps.value) {
      case 'signature':
        result = result.filter(pt => hasSignatureSteps(pt))
        break
      case 'attachments':
        result = result.filter(pt => hasAttachmentSteps(pt))
        break
      case 'approval':
        result = result.filter(pt => hasApprovalSteps(pt))
        break
      case 'simple':
        result = result.filter(pt => pt.steps?.length <= 3)
        break
      case 'complex':
        result = result.filter(pt => pt.steps?.length >= 4)
        break
    }
  }

  return result
})

// Métodos auxiliares
function canCreateProcess(processType) {
  return processType.steps && processType.steps.length > 0
}

function hasSignatureSteps(processType) {
  return processType.steps?.some(step => step.requiresSignature) || false
}

function hasAttachmentSteps(processType) {
  return processType.steps?.some(step => step.allowAttachment) || false
}

function hasApprovalSteps(processType) {
  return processType.steps?.some(step => step.type === 'APPROVAL') || false
}

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

function getEstimatedTime(processType) {
  const stepCount = processType.steps?.length || 0
  const hasComplex = processType.steps?.some(s => 
    s.requiresSignature || s.type === 'APPROVAL' || s.allowAttachment
  )
  
  if (stepCount <= 2) return '5-10 min'
  if (stepCount <= 4) return hasComplex ? '30-60 min' : '15-30 min'
  return hasComplex ? '1-2 horas' : '30-60 min'
}

// Métodos de feedback
function showSuccessFeedback(message) {
  feedbackMessage.value = message
  feedbackColor.value = 'success'
  feedbackIcon.value = 'mdi-check-circle'
  showFeedback.value = true
}

function showErrorFeedback(message) {
  feedbackMessage.value = message
  feedbackColor.value = 'error'
  feedbackIcon.value = 'mdi-alert-circle'
  showFeedback.value = true
}

function showInfoFeedback(message) {
  feedbackMessage.value = message
  feedbackColor.value = 'info'
  feedbackIcon.value = 'mdi-information'
  showFeedback.value = true
}

// Métodos principais - MELHORADO
function startProcessCreation(processType) {
  if (!canCreateProcess(processType)) {
    showErrorFeedback('Este tipo de processo não está completo. Verifique se possui etapas configuradas.')
    return
  }

  console.log('🚀 Starting FAST process creation for:', processType.name)
  
  // ✅ CORREÇÃO PRINCIPAL: Passar o processType selecionado
  selectedProcessTypeForDialog.value = processType
  createDialog.value = true
  
  // Feedback visual melhorado
  showInfoFeedback(`Iniciando criação rápida: ${processType.name}`)
}

// Método para criação genérica (mantém seleção de tipo)
function startGenericProcessCreation() {
  console.log('🔄 Starting generic process creation (with type selection)')
  
  // Para criação genérica, não passar processType (mantém seleção)
  selectedProcessTypeForDialog.value = null
  createDialog.value = true
  
  showInfoFeedback('Selecione o tipo de processo')
}

function onProcessCreated(process) {
  console.log('✅ Process created successfully:', process)
  
  closeCreateDialog()
  
  // Feedback de sucesso
  showSuccessFeedback(`Processo "${process.code}" criado com sucesso!`)
  
  // Pequeno delay para melhor UX antes da navegação
  setTimeout(() => {
    // Verificar se tem primeira etapa para executar
    const firstStep = process.stepExecutions?.find(se => se.status === 'IN_PROGRESS')
    
    if (firstStep) {
      // Ir direto para execução da primeira etapa
      router.push(`/processes/${process.id}/execute/${firstStep.id}`)
    } else {
      // Ir para visualização do processo
      router.push(`/processes/${process.id}`)
    }
  }, 1000)
}

function closeCreateDialog() {
  createDialog.value = false
  selectedProcessTypeForDialog.value = null
}

function goToProcessTypes() {
  router.push('/process-types')
}

async function refreshData() {
  refreshing.value = true
  try {
    await processTypeStore.fetchProcessTypes()
    showSuccessFeedback('Dados atualizados com sucesso!')
  } catch (error) {
    showErrorFeedback('Erro ao atualizar dados')
  } finally {
    refreshing.value = false
  }
}

// Lifecycle
onMounted(async () => {
  console.log('🎯 Processes page mounted with FAST creation enabled')
  
  // Carregar tipos de processo se necessário
  if (processTypes.value.length === 0) {
    await processTypeStore.fetchProcessTypes()
  }
  
  // Feedback de boas-vindas
  if (filteredProcessTypes.value.length > 0) {
    showInfoFeedback(`${filteredProcessTypes.value.length} tipos de processo disponíveis para criação rápida`)
  }
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

.position-absolute {
  position: absolute;
}

.position-relative {
  position: relative;
}

.transition-all {
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.5, 1);
}

.v-card:hover {
  transform: translateY(-2px);
}

.fast-process-badge {
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(76, 175, 80, 0.7);
  }
  70% {
    box-shadow: 0 0 0 10px rgba(76, 175, 80, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(76, 175, 80, 0);
  }
}

/* Melhorias visuais */
.v-card {
  transition: all 0.3s ease;
}

.v-card:hover .fast-process-badge {
  transform: scale(1.1);
}

.text-none {
  text-transform: none !important;
}
</style>