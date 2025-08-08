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
      <v-btn
        color="primary"
        @click="createNew"
        prepend-icon="mdi-plus"
      >
        Novo Tipo
      </v-btn>
    </div>

    <!-- Lista de Tipos de Processo -->
    <v-row>
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
        class="h-100 d-flex flex-column transition-all"
      >
        <v-card-title>
          <v-icon color="primary" class="mr-2">
            mdi-file-document-multiple-outline
          </v-icon>
          {{ processType.name }}
        </v-card-title>

        <v-card-subtitle v-if="processType.description">
          {{ processType.description }}
        </v-card-subtitle>

        <v-card-text class="flex-grow-1">
          <!-- : Estatísticas corretas -->
          <div class="mb-3">
            <div class="d-flex align-center mb-2">
              <v-icon size="20" class="mr-2">mdi-debug-step-over</v-icon>
              <span class="text-body-2">
                {{ processType.stepsCount }} etapas
              </span>
            </div>
            
            <div class="d-flex align-center mb-2">
              <v-icon size="20" class="mr-2">mdi-form-textbox</v-icon>
              <span class="text-body-2">
                {{ processType.formFieldsCount }} campos de formulário
              </span>
            </div>
            
            <div class="d-flex align-center">
              <v-icon size="20" class="mr-2">mdi-counter</v-icon>
              <span class="text-body-2">
                {{ processType.instancesCount }} processos criados
              </span>
            </div>
          </div>

          <!-- : Preview das etapas aprimorado -->
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
          
          <!--  NOVO: Indicadores visuais -->
          <div v-else class="mt-3">
            <v-alert
              type="warning"
              variant="tonal"
              density="compact"
            >
              ⚠️ Nenhuma etapa configurada
            </v-alert>
          </div>
        </v-card-text>

        <v-divider />

        <!-- : Actions aprimoradas -->
        <v-card-actions class="pa-4">
          <v-btn
            variant="text"
            size="small"
            color="primary"
            @click="editProcessType(processType)"
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
              />
            </template>
            
            <v-list>
              <v-list-item @click="duplicateProcessType(processType)">
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
            </v-list>
          </v-menu>
        </v-card-actions>
      </v-card>
    </v-hover>
  </v-col>
</v-row>

    <!-- Estado vazio -->
    <v-card
      v-if="!loading && processTypes.length === 0"
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
      >
        <v-icon start>mdi-plus</v-icon>
        Criar Primeiro Tipo
      </v-btn>
    </v-card>

    <!-- Loading -->
    <div v-if="loading" class="text-center py-12">
      <v-progress-circular
        indeterminate
        color="primary"
        size="64"
      />
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onBeforeUnmount, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useProcessTypeStore } from '@/stores/processTypes'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const processTypeStore = useProcessTypeStore()
const authStore = useAuthStore()

//  ADICIONAR: Estado local para controle
const refreshing = ref(false)
const lastRefresh = ref(null)

// Computed
const loading = computed(() => processTypeStore.loading)
const processTypes = computed(() => processTypeStore.processTypes)

//  CORRIGIDO: Computed para mostrar informações corretas
const processTypesWithInfo = computed(() => {
  return processTypes.value.map(processType => ({
    ...processType,
    //  Garantir contagem correta de etapas e campos
    stepsCount: processType.steps?.length || 0,
    formFieldsCount: processType.formFields?.length || 0,
    instancesCount: processType._count?.instances || 0,
    
    //  Processar etapas para preview
    stepsPreview: processType.steps?.slice(0, 3).map((step, idx) => ({
      order: idx + 1,
      name: step.name,
      type: step.type
    })) || [],
    
    hasMoreSteps: (processType.steps?.length || 0) > 3,
    moreStepsCount: Math.max(0, (processType.steps?.length || 0) - 3)
  }))
})

// 🔧 CORRIGIR: Métodos
function createNew() {
  router.push('/process-types/new')
}

function editProcessType(processType) {
  console.log('📝 Editing process type:', processType.id)
  router.push(`/process-types/${processType.id}/edit`)
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

//  NOVO: Método para ver detalhes
function viewProcessTypeDetails(processType) {
  // Implementar dialog ou página de detalhes
  console.log('👁️ Viewing details for:', processType.name)
  window.showSnackbar?.(`Detalhes de "${processType.name}" - Feature em desenvolvimento`, 'info')
}


//  CORRIGIDO: Método de duplicação aprimorado
async function duplicateProcessType(processType) {
  try {
    console.log('📋 Duplicating process type:', processType.name)
    
    //  Mostrar loading
    refreshing.value = true
    
    const result = await processTypeStore.duplicateProcessType(processType)
    
    console.log('🎉 Process type duplicated:', result)
    window.showSnackbar?.(`Tipo de processo "${result.name}" duplicado com sucesso!`, 'success')
    
    //  IMPORTANTE: Atualizar lista após duplicação
    await refreshData()
    
  } catch (error) {
    console.error('❌ Error duplicating process type:', error)
    window.showSnackbar?.('Erro ao duplicar tipo de processo: ' + (error.message || 'Erro desconhecido'), 'error')
  } finally {
    refreshing.value = false
  }
}

//  NOVO: Método para atualizar dados
async function refreshData() {
  try {
    console.log('🔄 Refreshing process types data...')
    refreshing.value = true
    lastRefresh.value = new Date()
    
    await processTypeStore.fetchProcessTypes()
    
    console.log(' Process types refreshed, count:', processTypes.value.length)
  } catch (error) {
    console.error('❌ Error refreshing data:', error)
    window.showSnackbar?.('Erro ao atualizar dados', 'error')
  } finally {
    refreshing.value = false
  }
}

//  NOVO: Auto-refresh quando necessário
function setupAutoRefresh() {
  //  Refresh quando voltar para a página (window focus)
  const handleFocus = () => {
    const now = new Date()
    const timeSinceLastRefresh = lastRefresh.value ? now - lastRefresh.value : Infinity
    
    // Refresh se passou mais de 30 segundos desde o último refresh
    if (timeSinceLastRefresh > 30000) {
      console.log('🔄 Auto-refreshing due to window focus')
      refreshData()
    }
  }
  
  window.addEventListener('focus', handleFocus)
  
  return () => {
    window.removeEventListener('focus', handleFocus)
  }
}

//  Lifecycle hooks
onMounted(async () => {
  console.log('🚀 ProcessTypes page mounted')
  
  //  Verificar se já tem dados carregados
  if (processTypes.value.length === 0) {
    console.log('📥 No process types loaded, fetching...')
    await refreshData()
  } else {
    console.log(' Process types already loaded:', processTypes.value.length)
    
    //  Fazer refresh leve se dados são antigos
    const timeSinceMount = Date.now() - (window.processTypesLastLoaded || 0)
    if (timeSinceMount > 60000) { // 1 minuto
      console.log('🔄 Data might be stale, refreshing...')
      await refreshData()
    }
  }
  
  //  Setup auto-refresh
  const cleanup = setupAutoRefresh()
  
  //  Cleanup na desmontagem
  onBeforeUnmount(cleanup)
  
  // Marcar timestamp de carregamento
  window.processTypesLastLoaded = Date.now()
})
</script>

