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
      <v-btn
        variant="text"
        @click="refreshData"
        :loading="refreshing"
      >
        <v-icon start>mdi-refresh</v-icon>
        Atualizar
      </v-btn>
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
            class="h-100 d-flex flex-column cursor-pointer"
            @click="startProcessCreation(processType)"
          >
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
            </v-card-text>

            <v-divider />

            <!-- Actions -->
            <v-card-actions class="pa-4">
              <v-btn
                color="primary"
                variant="elevated"
                block
                @click.stop="startProcessCreation(processType)"
                :disabled="!canCreateProcess(processType)"
              >
                <v-icon start>mdi-play</v-icon>
                Iniciar Processo
              </v-btn>
            </v-card-actions>

            <!-- Badge de Status -->
            <v-chip
              v-if="!canCreateProcess(processType)"
              size="small"
              color="error"
              class="position-absolute"
              style="top: 8px; right: 8px;"
            >
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

    <!-- Dialog de Criação de Processo -->
    <ProcessCreateDialog
      v-model="createDialog"
      :selected-process-type="selectedProcessType"
      @created="onProcessCreated"
      @close="createDialog = false"
    />
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
const selectedProcessType = ref(null)

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

// Métodos principais
function startProcessCreation(processType) {
  if (!canCreateProcess(processType)) {
    window.showSnackbar?.('Este tipo de processo não está completo. Verifique se possui etapas configuradas.', 'warning')
    return
  }

  console.log('🚀 Starting process creation for:', processType.name)
  selectedProcessType.value = processType
  createDialog.value = true
}

function onProcessCreated(process) {
  console.log('✅ Process created successfully:', process)
  createDialog.value = false
  selectedProcessType.value = null
  
  // Navegar para o processo criado
  router.push(`/processes/${process.id}`)
}

function goToProcessTypes() {
  router.push('/process-types')
}

async function refreshData() {
  refreshing.value = true
  try {
    await processTypeStore.fetchProcessTypes()
    window.showSnackbar?.('Dados atualizados com sucesso!', 'success')
  } catch (error) {
    window.showSnackbar?.('Erro ao atualizar dados', 'error')
  } finally {
    refreshing.value = false
  }
}

// Lifecycle
onMounted(async () => {
  console.log('🎯 Processes page mounted')
  
  // Carregar tipos de processo se necessário
  if (processTypes.value.length === 0) {
    await processTypeStore.fetchProcessTypes()
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

.transition-all {
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.5, 1);
}

.v-card:hover {
  transform: translateY(-2px);
}
</style>