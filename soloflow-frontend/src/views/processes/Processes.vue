<template>
  <div class="processes-container">
    <!-- ✨ Header Elegante -->
    <div class="header-section mb-8">
      <div class="d-flex align-center justify-space-between">
        <div class="header-content">
          <h1 class="text-h3 font-weight-bold mb-2 text-primary">
            <v-icon size="40" class="mr-3" color="primary">mdi-workflow</v-icon>
            Iniciar Novo Processo
          </h1>
          <p class="text-h6 text-medium-emphasis">
            Escolha um dos tipos de processo disponíveis para começar seu processo
          </p>
        </div>
        
        <div class="header-actions">
          <v-btn
            variant="text"
            @click="refreshData"
            :loading="refreshing"
          >
            <v-icon start>mdi-refresh</v-icon>
            Atualizar
          </v-btn>
        </div>
      </div>
    </div>

    <!-- ✨ Filtro de Busca Simplificado -->
    <v-card class="filter-card mb-6" elevation="2">
      <v-card-text class="py-4">
        <v-row align="center">
          <v-col cols="12">
            <v-text-field
              v-model="search"
              label="Buscar tipo de processo"
              prepend-inner-icon="mdi-magnify"
              clearable
              variant="outlined"
              density="comfortable"
              hide-details
              class="search-field"
            />
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <!-- ✨ Lista de Processos com Design Padronizado -->
    <div v-if="!loading" class="process-grid">
      <div class="cards-container">
        <div
          v-for="processType in filteredProcessTypes"
          :key="processType.id"
          class="card-wrapper"
        >
          <v-hover v-slot="{ isHovering, props }">
            <v-card
              v-bind="props"
              :elevation="isHovering ? 12 : 4"
              class="process-card h-100 d-flex flex-column position-relative"
              :class="{ 
                'card-hover': isHovering,
                'card-disabled': !canCreateProcess(processType),
                'card-featured': isFeaturedProcess(processType)
              }"
              @click="startProcessCreation(processType)"
            >
              <!-- ✨ Badge de Status -->
              <div class="status-badges">
                <v-chip
                  v-if="isFeaturedProcess(processType)"
                  size="x-small"
                  color="warning"
                  class="featured-badge"
                >
                  <v-icon start size="12">mdi-star</v-icon>
                  Popular
                </v-chip>
                
                <v-chip
                  v-if="!canCreateProcess(processType)"
                  size="x-small"
                  color="error"
                  class="status-badge"
                >
                  <v-icon start size="12">mdi-alert</v-icon>
                  Incompleto
                </v-chip>
              </div>

              <!-- ✨ Header do Card com Design Padronizado -->
              <v-sheet
                color="primary"
                class="card-header pa-4"
                style="background: linear-gradient(135deg, #1976D2, #42A5F5, #64B5F6); min-height: 100px;"
              >
                <div class="d-flex align-center h-100">
                  <v-avatar
                    color="white"
                    size="48"
                    class="mr-4 elevation-3"
                  >
                    <v-icon 
                      size="24" 
                      color="primary"
                    >
                      mdi-file-document-outline
                    </v-icon>
                  </v-avatar>
                  
                  <div class="flex-grow-1">
                    <h3 class="text-h6 font-weight-bold text-white mb-0">
                      {{ processType.name }}
                    </h3>
                  </div>
                </div>
              </v-sheet>

              <!-- ✨ Conteúdo do Card com Descrição Simples -->
              <v-card-text class="flex-grow-1 pa-4">
                <!-- ✨ Descrição do Processo Livre -->
                <p v-if="processType.description" class="text-body-1 text-high-emphasis mb-0" style="line-height: 1.6;">
                  {{ processType.description }}
                </p>
                <p v-else class="text-body-1 text-medium-emphasis mb-0 font-italic">
                  Nenhuma descrição disponível para este tipo de processo.
                </p>
              </v-card-text>

              <!-- ✨ Actions Elegantes -->
              <div style="margin-top: auto;">
                <v-divider />
                
                <v-card-actions class="pa-4">
                  <v-btn
                    :color="canCreateProcess(processType) ? 'primary' : 'grey'"
                    :variant="canCreateProcess(processType) ? 'elevated' : 'outlined'"
                    block
                    size="large"
                    :disabled="!canCreateProcess(processType)"
                    @click.stop="startProcessCreation(processType)"
                    class="action-button"
                  >
                    <v-icon start size="20">
                      {{ canCreateProcess(processType) ? 'mdi-play-circle' : 'mdi-alert-circle' }}
                    </v-icon>
                    {{ canCreateProcess(processType) ? 'Iniciar Processo' : 'Processo Incompleto' }}
                  </v-btn>
                </v-card-actions>
              </div>
            </v-card>
          </v-hover>
        </div>
      </div>
    </div>

    <!-- ✨ Estado Vazio Elegante -->
    <v-card
      v-if="!loading && filteredProcessTypes.length === 0"
      class="empty-state text-center py-12"
      elevation="2"
    >
      <div class="empty-state-content">
        <v-avatar size="120" color="grey-lighten-3" class="mb-4">
          <v-icon size="60" color="grey-lighten-1">
            mdi-file-document-multiple-outline
          </v-icon>
        </v-avatar>
        
        <h2 class="text-h5 font-weight-bold mb-2">
          {{ search ? 'Nenhum processo encontrado' : 'Nenhum processo disponível' }}
        </h2>
        
        <p class="text-body-1 text-medium-emphasis mb-6">
          {{ 
            search 
              ? 'Tente ajustar sua busca' 
              : 'Entre em contato com um administrador para criar tipos de processo'
          }}
        </p>
        
        <div class="d-flex justify-center gap-3">
          <v-btn
            v-if="search"
            color="primary"
            variant="outlined"
            @click="clearFilters"
          >
            <v-icon start>mdi-filter-remove</v-icon>
            Limpar Busca
          </v-btn>
        </div>
      </div>
    </v-card>

    <!-- ✨ Loading Elegante -->
    <div v-if="loading" class="loading-container">
      <div class="text-center py-12">
        <v-progress-circular
          indeterminate
          color="primary"
          size="64"
          width="6"
        />
        <p class="text-h6 mt-4 text-medium-emphasis">
          Carregando processos disponíveis...
        </p>
        <p class="text-body-2 text-grey">
          Preparando os workflows para você
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useProcessTypeStore } from '@/stores/processTypes'

const router = useRouter()
const authStore = useAuthStore()
const processTypeStore = useProcessTypeStore()

// ✨ Estado Reativo
const search = ref('')
const refreshing = ref(false)

// ✨ Computed Properties
const loading = computed(() => processTypeStore.loading)
const processTypes = computed(() => processTypeStore.processTypes)

const activeProcessTypes = computed(() => 
  processTypes.value.filter(pt => pt.isActive)
)

// ✨ Filtro Simplificado (apenas busca)
const filteredProcessTypes = computed(() => {
  let result = activeProcessTypes.value.filter(pt => canCreateProcess(pt))

  // Filtro por busca
  if (search.value) {
    const searchTerm = search.value.toLowerCase()
    result = result.filter(pt => 
      pt.name.toLowerCase().includes(searchTerm) ||
      pt.description?.toLowerCase().includes(searchTerm)
    )
  }

  // Ordenação padrão por nome
  return result.sort((a, b) => a.name.localeCompare(b.name))
})

// ✨ Métodos Auxiliares
function canCreateProcess(processType) {
  return processType.steps && processType.steps.length > 0
}

function isFeaturedProcess(processType) {
  return (processType._count?.instances || 0) > 5
}

// ✨ Métodos de Ação
function startProcessCreation(processType) {
  if (!canCreateProcess(processType)) {
    window.showSnackbar?.('Este tipo de processo não está completo. Verifique se possui etapas configuradas.', 'warning')
    return
  }

  console.log('🚀 Navigating to process creation for:', processType.name)
  
  // ✨ Navegar para página de criação com tipo pré-selecionado
  router.push({
    name: 'CreateProcessWithType',
    params: { typeId: processType.id }
  })
}

function clearFilters() {
  search.value = ''
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

// ✨ Lifecycle
onMounted(async () => {
  console.log('🎯 Processes page mounted')
  
  // Carregar tipos de processo se necessário
  if (processTypes.value.length === 0) {
    await processTypeStore.fetchProcessTypes()
  }
})
</script>

<style scoped>
/* ✨ Estilos Elegantes e Padronizados */
.processes-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 16px;
}

.process-grid {
  width: 100%;
}

.cards-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
  gap: 24px;
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
}

.card-wrapper {
  width: 100%;
  min-height: 280px;
}

.header-section {
  background: linear-gradient(135deg, rgba(25, 118, 210, 0.08), rgba(66, 165, 245, 0.04));
  border-radius: 20px;
  padding: 32px;
  border: 1px solid rgba(25, 118, 210, 0.1);
  margin-bottom: 32px;
  backdrop-filter: blur(10px);
}

.header-content h1 {
  background: linear-gradient(135deg, #1976D2, #42A5F5);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  font-size: 2.25rem;
  font-weight: 800;
  letter-spacing: -0.02em;
}

.filter-card {
  border-radius: 20px;
  border: 1px solid rgba(0, 0, 0, 0.06);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04);
  margin-bottom: 32px;
  backdrop-filter: blur(10px);
}

.search-field .v-field {
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(10px);
}

.process-card {
  border-radius: 20px;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
  border: none;
  overflow: hidden;
  min-height: 280px;
  display: flex;
  flex-direction: column;
  background: white;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06);
  position: relative;
}

.process-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.12) !important;
}

.card-hover {
  transform: translateY(-2px);
}

.card-disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.card-disabled:hover {
  transform: none !important;
  box-shadow: none !important;
}

.card-featured {
  border: 2px solid #FFB74D;
  background: linear-gradient(135deg, rgba(255, 183, 77, 0.03), transparent);
}

.status-badges {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 2;
  display: flex;
  gap: 4px;
}

.card-header {
  position: relative;
  color: white;
  border-radius: 16px 16px 0 0;
  display: flex;
  align-items: center;
}

.action-button {
  border-radius: 12px;
  text-transform: none;
  font-weight: 600;
  height: 48px;
  width: 100%;
  font-size: 0.95rem;
  letter-spacing: 0.3px;
}

.empty-state {
  border-radius: 16px;
  border: 2px dashed rgba(0, 0, 0, 0.1);
}

.empty-state-content {
  max-width: 400px;
  margin: 0 auto;
}

.loading-container {
  min-height: 400px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* ✨ Responsividade */
@media (max-width: 768px) {
  .processes-container {
    padding: 0 12px;
  }
  
  .cards-container {
    grid-template-columns: 1fr;
    gap: 16px;
  }
  
  .card-wrapper {
    min-height: 300px;
  }
  
  .header-section {
    padding: 20px;
  }
  
  .header-content h1 {
    font-size: 1.8rem;
  }
}

@media (min-width: 769px) and (max-width: 1024px) {
  .cards-container {
    grid-template-columns: repeat(2, 1fr);
    gap: 20px;
  }
}

@media (min-width: 1025px) and (max-width: 1440px) {
  .cards-container {
    grid-template-columns: repeat(3, 1fr);
    gap: 24px;
  }
}

@media (min-width: 1441px) {
  .cards-container {
    grid-template-columns: repeat(4, 1fr);
    gap: 24px;
  }
}

/* ✨ Tema escuro */
@media (prefers-color-scheme: dark) {
  .filter-card {
    border-color: rgba(255, 255, 255, 0.1);
    background: rgba(255, 255, 255, 0.02);
  }
  
  .process-card {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
  }
  
  .empty-state {
    border-color: rgba(255, 255, 255, 0.2);
    background: rgba(255, 255, 255, 0.02);
  }
}
</style>