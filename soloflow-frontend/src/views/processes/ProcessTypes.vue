<template>
  <div>
    <!-- Header -->
    <div class="d-flex align-center justify-space-between mb-6">
      <div>
        <h1 class="text-h4 font-weight-bold">Tipos de Processo</h1>
        <p class="text-subtitle-1 text-medium-emphasis">
          Configure os fluxos de trabalho da empresa
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
        <v-btn
          color="primary"
          @click="createNew"
          prepend-icon="mdi-plus"
        >
          Novo Tipo
        </v-btn>
      </div>
    </div>

    <!-- 🔧 Indicador de carregamento -->
    <v-alert
      v-if="loading && processTypes.length === 0"
      type="info"
      variant="tonal"
      class="mb-6"
    >
      <v-progress-circular
        indeterminate
        size="20"
        class="mr-3"
      />
      Carregando tipos de processo...
    </v-alert>

    <!-- 🔧 Alerta de erro -->
    <v-alert
      v-if="error"
      type="error"
      variant="tonal"
      class="mb-6"
      closable
      @click:close="clearError"
    >
      <v-icon start>mdi-alert-circle</v-icon>
      {{ error }}
    </v-alert>

    <!-- Lista de Tipos de Processo -->
    <v-row v-if="!loading || processTypes.length > 0">
      <v-col
        v-for="processType in processTypesWithInfo"
        :key="processType.id"
        cols="12"
        md="6"
        lg="4"
      >
        <v-hover v-slot="{ isHovering, props }">
          <v-card
            v-bind="props"
            :elevation="isHovering ? 8 : 2"
            class="h-100 d-flex flex-column transition-all position-relative"
            :class="{ 'border-warning': processType.hasIssues }"
          >
            <!-- 🔧 Badge de status -->
            <v-chip
              v-if="processType.hasIssues"
              size="small"
              color="warning"
              class="position-absolute"
              style="top: 8px; right: 8px; z-index: 1;"
            >
              <v-icon start size="16">mdi-alert</v-icon>
              Atenção
            </v-chip>

            <v-card-title class="pb-2">
              <v-icon color="primary" class="mr-2">
                mdi-file-document-multiple-outline
              </v-icon>
              {{ processType.name }}
            </v-card-title>

            <v-card-subtitle v-if="processType.description" class="pb-1">
              {{ processType.description }}
            </v-card-subtitle>

            <v-card-text class="flex-grow-1">
              <!-- 🔧 Estatísticas aprimoradas -->
              <div class="mb-3">
                <div class="d-flex align-center justify-space-between mb-2">
                  <div class="d-flex align-center">
                    <v-icon size="20" class="mr-2" color="primary">mdi-debug-step-over</v-icon>
                    <span class="text-body-2">{{ processType.stepsCount }} etapas</span>
                  </div>
                  <v-chip
                    v-if="processType.stepsCount === 0"
                    size="x-small"
                    color="warning"
                    variant="tonal"
                  >
                    Sem etapas
                  </v-chip>
                </div>
                
                <div class="d-flex align-center justify-space-between mb-2">
                  <div class="d-flex align-center">
                    <v-icon size="20" class="mr-2" color="info">mdi-form-textbox</v-icon>
                    <span class="text-body-2">{{ processType.formFieldsCount }} campos</span>
                  </div>
                </div>
                
                <div class="d-flex align-center justify-space-between">
                  <div class="d-flex align-center">
                    <v-icon size="20" class="mr-2" color="success">mdi-counter</v-icon>
                    <span class="text-body-2">{{ processType.instancesCount }} usos</span>
                  </div>
                </div>
              </div>

              <!-- 🔧 Preview das etapas melhorado -->
              <div v-if="processType.stepsCount > 0" class="mt-3">
                <p class="text-caption text-medium-emphasis mb-2">Fluxo do processo:</p>
                <div class="d-flex flex-wrap gap-1">
                  <v-chip
                    v-for="step in processType.stepsPreview"
                    :key="step.order"
                    size="x-small"
                    class="mr-1 mb-1"
                    variant="tonal"
                    :color="getStepTypeColor(step.type)"
                  >
                    {{ step.order }}. {{ step.name }}
                  </v-chip>
                  
                  <v-chip
                    v-if="processType.hasMoreSteps"
                    size="x-small"
                    variant="outlined"
                    class="mb-1"
                  >
                    +{{ processType.moreStepsCount }}
                  </v-chip>
                </div>
              </div>
              
              <!-- 🔧 Alerta para tipos sem configuração -->
              <div v-else class="mt-3">
                <v-alert
                  type="warning"
                  variant="tonal"
                  density="compact"
                >
                  <v-icon start size="16">mdi-alert</v-icon>
                  Nenhuma etapa configurada
                </v-alert>
              </div>

              <!-- 🔧 Indicadores de recursos -->
              <div v-if="processType.stepsCount > 0" class="mt-3">
                <div class="d-flex flex-wrap gap-1">
                  <v-chip
                    v-if="processType.hasSignatureSteps"
                    size="x-small"
                    color="error"
                    variant="tonal"
                  >
                    <v-icon start size="12">mdi-draw-pen</v-icon>
                    Assinatura
                  </v-chip>
                  <v-chip
                    v-if="processType.hasAttachmentSteps"
                    size="x-small"
                    color="info"
                    variant="tonal"
                  >
                    <v-icon start size="12">mdi-paperclip</v-icon>
                    Anexos
                  </v-chip>
                  <v-chip
                    v-if="processType.formFieldsCount > 0"
                    size="x-small"
                    color="purple"
                    variant="tonal"
                  >
                    <v-icon start size="12">mdi-form-textbox</v-icon>
                    Formulário
                  </v-chip>
                </div>
              </div>
            </v-card-text>

            <v-divider />

            <!-- 🔧 Actions aprimoradas -->
            <v-card-actions class="pa-4">
              <v-btn
                variant="text"
                size="small"
                color="primary"
                @click="editProcessType(processType)"
                :disabled="loading"
              >
                <v-icon start>mdi-pencil</v-icon>
                Editar
              </v-btn>
              
              <v-spacer />
              
              <v-menu>
                <template v-slot:activator="{ props }">
                  <v-btn
                    v-bind="props"
                    icon="mdi-dots-vertical"
                    variant="text"
                    size="small"
                    :disabled="loading"
                  />
                </template>
                
                <v-list>
                  <v-list-item 
                    @click="duplicateProcessType(processType)"
                    :disabled="processType.stepsCount === 0"
                  >
                    <v-list-item-title>
                      <v-icon start>mdi-content-copy</v-icon>
                      Duplicar
                    </v-list-item-title>
                  </v-list-item>
                  
                  <v-list-item 
                    @click="viewProcessTypeDetails(processType)"
                    :disabled="processType.stepsCount === 0"
                  >
                    <v-list-item-title>
                      <v-icon start>mdi-eye</v-icon>
                      Ver Detalhes
                    </v-list-item-title>
                  </v-list-item>
                  
                  <v-divider />
                  
                  <v-list-item 
                    @click="testProcessType(processType)"
                    :disabled="processType.stepsCount === 0"
                  >
                    <v-list-item-title>
                      <v-icon start>mdi-play-circle</v-icon>
                      Testar Fluxo
                    </v-list-item-title>
                  </v-list-item>
                </v-list>
              </v-menu>
            </v-card-actions>
          </v-card>
        </v-hover>
      </v-col>
    </v-row>

    <!-- Estado vazio -->
    <v-card
      v-if="!loading && processTypes.length === 0 && !error"
      class="text-center py-12"
    >
      <v-icon size="64" color="grey-lighten-1">
        mdi-file-document-multiple-outline
      </v-icon>
      <p class="text-h6 mt-4 text-grey">
        Nenhum tipo de processo criado
      </p>
      <p class="text-body-2 text-grey mb-4">
        Crie tipos de processo para que os usuários possam iniciar workflows
      </p>
      <v-btn
        color="primary"
        @click="createNew"
        size="large"
      >
        <v-icon start>mdi-plus</v-icon>
        Criar Primeiro Tipo
      </v-btn>
    </v-card>

    <!-- 🔧 Loading skeleton (quando recarregando) -->
    <v-row v-if="loading && processTypes.length > 0">
      <v-col v-for="n in 3" :key="`skeleton-${n}`" cols="12" md="6" lg="4">
        <v-skeleton-loader
          type="card"
          height="280"
        />
      </v-col>
    </v-row>

    <!-- 🔧 Snackbar para feedback -->
    <v-snackbar
      v-model="showSnackbar"
      :color="snackbarColor"
      :timeout="3000"
      location="top right"
    >
      {{ snackbarMessage }}
      <template v-slot:actions>
        <v-btn
          variant="text"
          @click="showSnackbar = false"
        >
          Fechar
        </v-btn>
      </template>
    </v-snackbar>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useProcessTypeStore } from '@/stores/processTypes'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const processTypeStore = useProcessTypeStore()
const authStore = useAuthStore()

// 🔧 Estado local
const refreshing = ref(false)
const showSnackbar = ref(false)
const snackbarMessage = ref('')
const snackbarColor = ref('success')

// Computed
const loading = computed(() => processTypeStore.loading)
const processTypes = computed(() => processTypeStore.processTypes)
const error = computed(() => processTypeStore.error)

// 🔧 Computed aprimorado para informações dos process types
const processTypesWithInfo = computed(() => {
  return processTypes.value.map(processType => {
    // Garantir que steps e formFields são arrays
    const steps = Array.isArray(processType.steps) ? processType.steps : []
    const formFields = Array.isArray(processType.formFields) ? processType.formFields : []
    
    return {
      ...processType,
      // Contagens corretas
      stepsCount: steps.length,
      formFieldsCount: formFields.length,
      instancesCount: processType._count?.instances || 0,
      
      // Preview das etapas (primeiras 3)
      stepsPreview: steps.slice(0, 3).map((step, idx) => ({
        order: idx + 1,
        name: step.name || `Etapa ${idx + 1}`,
        type: step.type || 'INPUT'
      })),
      
      // Indicadores
      hasMoreSteps: steps.length > 3,
      moreStepsCount: Math.max(0, steps.length - 3),
      hasSignatureSteps: steps.some(step => step.requiresSignature),
      hasAttachmentSteps: steps.some(step => step.allowAttachment),
      hasIssues: steps.length === 0, // Problema se não tem etapas
    }
  })
})

// Métodos auxiliares
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

function showMessage(message, color = 'success') {
  snackbarMessage.value = message
  snackbarColor.value = color
  showSnackbar.value = true
}

// Métodos principais
function createNew() {
  router.push('/process-types/new')
}

function editProcessType(processType) {
  console.log('📝 Editing process type:', processType.id)
  router.push(`/process-types/${processType.id}/edit`)
}

function viewProcessTypeDetails(processType) {
  console.log('👁️ Viewing details for:', processType.name)
  showMessage(`Detalhes de "${processType.name}" - Feature em desenvolvimento`, 'info')
}

function testProcessType(processType) {
  console.log('🧪 Testing process type:', processType.name)
  showMessage(`Teste de "${processType.name}" - Feature em desenvolvimento`, 'info')
}

// 🔧 Método de duplicação aprimorado
async function duplicateProcessType(processType) {
  if (processType.stepsCount === 0) {
    showMessage('Não é possível duplicar um tipo de processo sem etapas', 'warning')
    return
  }

  try {
    console.log('📋 Duplicating process type:', processType.name)
    
    refreshing.value = true
    
    const result = await processTypeStore.duplicateProcessType(processType)
    
    console.log('✅ Process type duplicated:', result.name)
    showMessage(`Tipo de processo "${result.name}" duplicado com sucesso!`, 'success')
    
    // Atualizar lista
    await refreshData()
    
  } catch (error) {
    console.error('❌ Error duplicating process type:', error)
    showMessage('Erro ao duplicar tipo de processo: ' + (error.message || 'Erro desconhecido'), 'error')
  } finally {
    refreshing.value = false
  }
}

// 🔧 Método de atualização aprimorado
async function refreshData() {
  try {
    console.log('🔄 Refreshing process types...')
    refreshing.value = true
    
    await processTypeStore.fetchProcessTypes()
    
    console.log('✅ Process types refreshed, count:', processTypes.value.length)
    
    if (processTypes.value.length === 0) {
      showMessage('Nenhum tipo de processo encontrado', 'info')
    }
    
  } catch (error) {
    console.error('❌ Error refreshing data:', error)
    showMessage('Erro ao atualizar dados: ' + (error.message || 'Erro desconhecido'), 'error')
  } finally {
    refreshing.value = false
  }
}

function clearError() {
  processTypeStore.clearError()
}

// 🔧 Lifecycle melhorado
onMounted(async () => {
  console.log('🚀 ProcessTypes page mounted')
  
  // Verificar se o usuário tem permissão
  if (!authStore.canManageProcessTypes) {
    console.warn('⚠️ User does not have permission to manage process types')
    showMessage('Você não tem permissão para gerenciar tipos de processo', 'error')
    router.push('/dashboard')
    return
  }
  
  // Carregar dados se necessário
  if (processTypes.value.length === 0 && !loading.value) {
    console.log('📥 No process types loaded, fetching...')
    await refreshData()
  } else {
    console.log('✅ Process types already loaded:', processTypes.value.length)
  }
})
</script>

<style scoped>
.transition-all {
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.5, 1);
}

.border-warning {
  border-left: 4px solid rgb(var(--v-theme-warning)) !important;
}

.gap-2 {
  gap: 8px;
}

.gap-1 {
  gap: 4px;
}

.position-relative {
  position: relative;
}

.position-absolute {
  position: absolute;
}
</style>