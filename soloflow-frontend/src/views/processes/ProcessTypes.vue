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

    <!-- ✨ Filtro de Busca -->
    <v-card v-if="!loading || processTypes.length > 0" class="filter-card mb-6" elevation="2">
      <v-card-text class="py-4">
        <v-row align="center">
          <v-col cols="12">
            <v-text-field
              v-model="searchQuery"
              label="Buscar tipo de processo por nome"
              prepend-inner-icon="mdi-magnify"
              clearable
              variant="outlined"
              density="comfortable"
              hide-details
              class="search-field"
              placeholder="Digite o nome do tipo de processo..."
            />
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <!-- Lista de Tipos de Processo -->
    <v-row v-if="!loading || processTypes.length > 0">
      <v-col
        v-for="processType in paginatedProcessTypes"
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

            <v-card-title class="pb-2 d-flex align-center flex-wrap">
              <v-icon color="primary" class="mr-2">
                mdi-file-document-multiple-outline
              </v-icon>
              <span class="mr-2">{{ processType.name }}</span>

              <!-- Badge de Somente Subprocesso -->
              <v-tooltip v-if="processType.isChildProcessOnly" location="top">
                <template v-slot:activator="{ props }">
                  <v-chip
                    v-bind="props"
                    size="x-small"
                    color="orange"
                    variant="flat"
                    class="mr-1"
                  >
                    <v-icon start size="12">mdi-lock</v-icon>
                    Apenas Sub
                  </v-chip>
                </template>
                <span>
                  Este tipo só pode ser usado como subprocesso
                </span>
              </v-tooltip>

              <!-- Badge de Sub-Processo -->
              <v-tooltip v-if="processType.isSubProcess" location="top">
                <template v-slot:activator="{ props }">
                  <v-chip
                    v-bind="props"
                    size="x-small"
                    color="deep-purple"
                    variant="flat"
                    class="mr-1"
                  >
                    <v-icon start size="12">mdi-source-branch</v-icon>
                    Sub
                  </v-chip>
                </template>
                <span>
                  Sub-processo de: {{ processType.parentNames.join(', ') }}
                </span>
              </v-tooltip>

              <!-- Badge de Pai (tem sub-processos) -->
              <v-tooltip v-if="processType.hasChildProcesses" location="top">
                <template v-slot:activator="{ props }">
                  <v-chip
                    v-bind="props"
                    size="x-small"
                    color="teal"
                    variant="flat"
                  >
                    <v-icon start size="12">mdi-sitemap</v-icon>
                    {{ processType.childProcessCount }}
                  </v-chip>
                </template>
                <span>
                  Possui {{ processType.childProcessCount }} tipo(s) de sub-processo configurado(s)
                </span>
              </v-tooltip>
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
              <!-- Badge de status -->
              <v-chip
                :color="processType.isActive ? 'success' : 'error'"
                size="small"
                variant="tonal"
              >
                <v-icon start size="16">
                  {{ processType.isActive ? 'mdi-check-circle' : 'mdi-cancel' }}
                </v-icon>
                {{ processType.isActive ? 'Ativo' : 'Inativo' }}
              </v-chip>

              <v-spacer />

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
                    @click="toggleProcessTypeStatus(processType)"
                  >
                    <v-list-item-title>
                      <v-icon start>{{ processType.isActive ? 'mdi-cancel' : 'mdi-check-circle' }}</v-icon>
                      {{ processType.isActive ? 'Desativar' : 'Ativar' }}
                    </v-list-item-title>
                  </v-list-item>
                  <v-list-item
                    @click="duplicateProcessType(processType)"
                    :disabled="processType.stepsCount === 0"
                  >
                    <v-list-item-title>
                      <v-icon start>mdi-content-copy</v-icon>
                      Duplicar
                    </v-list-item-title>
                  </v-list-item>
                </v-list>
              </v-menu>
            </v-card-actions>
          </v-card>
        </v-hover>
      </v-col>
    </v-row>

    <!-- ✨ Paginação -->
    <PaginationControls
      v-model:current-page="currentPage"
      v-model:items-per-page="itemsPerPage"
      :total-items="filteredProcessTypes.length"
      item-label="tipos de processo"
    />

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

    <!-- ✨ Estado vazio de busca -->
    <v-card
      v-if="!loading && processTypes.length > 0 && filteredProcessTypes.length === 0"
      class="text-center py-12"
      elevation="0"
    >
      <v-icon size="64" color="grey-lighten-1">
        mdi-file-search
      </v-icon>
      <p class="text-h6 mt-4 text-grey">
        Nenhum tipo de processo encontrado
      </p>
      <p class="text-body-2 text-grey mb-4">
        Não encontramos tipos de processo que correspondam à busca "{{ searchQuery }}"
      </p>
      <v-btn
        color="primary"
        variant="outlined"
        @click="clearSearch"
      >
        <v-icon start>mdi-filter-remove</v-icon>
        Limpar Busca
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
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useProcessTypeStore } from '@/stores/processTypes'
import { useAuthStore } from '@/stores/auth'
import PaginationControls from '@/components/PaginationControls.vue'

const router = useRouter()
const processTypeStore = useProcessTypeStore()
const authStore = useAuthStore()

// 🔧 Estado local
const refreshing = ref(false)
const showSnackbar = ref(false)
const snackbarMessage = ref('')
const snackbarColor = ref('success')

// ✨ Estado de busca e paginação
const searchQuery = ref('')
const currentPage = ref(1)
const itemsPerPage = ref(12)

// Computed
const loading = computed(() => processTypeStore.loading)
const processTypes = computed(() => processTypeStore.processTypes)
const error = computed(() => processTypeStore.error)

// 🔧 Computed aprimorado para informações dos process types
const processTypesWithInfo = computed(() => {
  // Primeiro, identificar quais tipos são usados como sub-processos
  const usedAsChildProcessIds = new Set()
  const parentProcessNames = {} // Mapeia ID do filho para nomes dos pais

  processTypes.value.forEach(pt => {
    if (Array.isArray(pt.allowedChildProcessTypes) && pt.allowedChildProcessTypes.length > 0) {
      pt.allowedChildProcessTypes.forEach(childId => {
        usedAsChildProcessIds.add(childId)
        if (!parentProcessNames[childId]) {
          parentProcessNames[childId] = []
        }
        parentProcessNames[childId].push(pt.name)
      })
    }
  })

  return processTypes.value.map(processType => {
    // Garantir que steps e formFields são arrays
    const steps = Array.isArray(processType.steps) ? processType.steps : []
    const formFields = Array.isArray(processType.formFields) ? processType.formFields : []

    // Verificar se este tipo é usado como sub-processo
    const isSubProcess = usedAsChildProcessIds.has(processType.id)
    const parentNames = parentProcessNames[processType.id] || []

    // Verificar se este tipo tem sub-processos configurados
    const hasChildProcesses = Array.isArray(processType.allowedChildProcessTypes) &&
                              processType.allowedChildProcessTypes.length > 0

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

      // Indicadores de sub-processo
      isSubProcess,
      parentNames,
      hasChildProcesses,
      childProcessCount: processType.allowedChildProcessTypes?.length || 0
    }
  })
})

// ✨ Computed para filtrar por busca
const filteredProcessTypes = computed(() => {
  let result = processTypesWithInfo.value

  // Filtro por busca de nome
  if (searchQuery.value) {
    const search = searchQuery.value.toLowerCase().trim()
    result = result.filter(pt => 
      pt.name.toLowerCase().includes(search) ||
      pt.description?.toLowerCase().includes(search)
    )
  }

  return result
})

const paginatedProcessTypes = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value
  const end = start + itemsPerPage.value
  return filteredProcessTypes.value.slice(start, end)
})

// ✨ Watchers para resetar página quando filtros mudam
watch([searchQuery, itemsPerPage], () => {
  currentPage.value = 1
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

// ✨ Método para limpar busca
function clearSearch() {
  searchQuery.value = ''
  currentPage.value = 1
}

// Métodos principais
function createNew() {
  router.push('/tipos-de-processo/novo')
}

function editProcessType(processType) {
  console.log('📝 Editing process type:', processType.id)
  router.push(`/tipos-de-processo/${processType.id}/editar`)
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

// Toggle de status ativo/inativo
async function toggleProcessTypeStatus(processType) {
  const newStatus = !processType.isActive
  const action = newStatus ? 'ativar' : 'desativar'

  try {
    console.log(`${newStatus ? '✅' : '❌'} Toggling process type status:`, processType.name, 'to', newStatus)

    refreshing.value = true

    await processTypeStore.updateProcessType(processType.id, {
      isActive: newStatus
    })

    const message = newStatus
      ? `Tipo de processo "${processType.name}" ativado. Usuários podem criar novas solicitações.`
      : `Tipo de processo "${processType.name}" desativado. Novas solicitações não poderão ser criadas, mas processos em andamento continuam.`

    showMessage(message, 'success')

    // Atualizar lista
    await refreshData()

  } catch (error) {
    console.error(`❌ Error ${action}ing process type:`, error)
    showMessage(`Erro ao ${action} tipo de processo: ` + (error.message || 'Erro desconhecido'), 'error')
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
    router.push('/painel')
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

/* ✨ Filter Card */
.filter-card {
  border-radius: 16px;
  border: 1px solid rgba(0, 0, 0, 0.06);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
  backdrop-filter: blur(10px);
}

.search-field :deep(.v-field) {
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(10px);
}

/* ✨ Paginação */
.pagination-section {
  margin-top: 32px;
}

.pagination-card {
  border-radius: 16px;
  border: 1px solid rgba(0, 0, 0, 0.06);
  background: white;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
}

.pagination-info {
  font-weight: 500;
}

.pagination-controls {
  flex-wrap: wrap;
}

.items-per-page-select :deep(.v-field) {
  border-radius: 12px;
}

.pagination-component :deep(.v-pagination__item) {
  border-radius: 12px;
  font-weight: 600;
  min-width: 40px;
  height: 40px;
}

.pagination-component :deep(.v-pagination__item--is-active) {
  background: linear-gradient(135deg, #1976D2, #42A5F5);
  box-shadow: 0 2px 8px rgba(25, 118, 210, 0.3);
}

/* ✨ Responsividade */
@media (max-width: 768px) {
  .pagination-controls {
    width: 100%;
    justify-content: center;
  }

  .pagination-info {
    width: 100%;
    text-align: center;
  }
}

/* ✨ Tema Escuro */
@media (prefers-color-scheme: dark) {
  .filter-card,
  .pagination-card {
    border-color: rgba(255, 255, 255, 0.1);
    background: rgba(255, 255, 255, 0.05);
  }

  .search-field :deep(.v-field) {
    background: rgba(255, 255, 255, 0.05);
  }
}
</style>