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
            Escolha um dos tipos de processo disponíveis para começar seu workflow
          </p>
        </div>

        <div class="header-actions">
          <v-btn variant="text" @click="refreshData" :loading="refreshing">
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
            <v-text-field v-model="search" label="Buscar tipo de processo" prepend-inner-icon="mdi-magnify" clearable
              variant="outlined" density="comfortable" hide-details class="search-field" />
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <!-- ✨ Grid de Cards Profissionais -->
    <div v-if="!loading" class="process-grid">
      <div class="cards-container">
        <div v-for="processType in filteredProcessTypes" :key="processType.id" class="card-wrapper">
          <v-hover v-slot="{ isHovering, props }">
            <v-card 
              v-bind="props" 
              :elevation="0"
              class="process-card professional-card h-100 d-flex flex-column position-relative" 
              :class="{
                'card-hover': isHovering,
                'card-disabled': !canCreateProcess(processType),
                'card-featured': isFeaturedProcess(processType)
              }" 
              @click="startProcessCreation(processType)"
            >

           
               

              <!-- ✨ Header do Card Redesenhado -->
              <div class="card-header">
                <div class="header-content-wrapper">
                  <div class="icon-section">
                    <div class="process-icon">
                      <v-icon size="28" color="primary">
                        {{ getProcessIcon(processType) }}
                      </v-icon>
                    </div>
                  </div>
                  
                  <div class="content-section">
                    <h3 class="process-title">{{ processType.name }}</h3>
                    <div class="process-meta">
                      <span class="meta-item">
                        <v-icon size="14">mdi-format-list-numbered</v-icon>
                        {{ processType.steps?.length || 0 }} etapas
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- ✨ Conteúdo Principal -->
              <div class="card-body">
                <div class="process-description">
                  <p v-if="processType.description" class="description-text">
                    {{ processType.description }}
                  </p>
                  <p v-else class="description-placeholder">
                    Nenhuma descrição disponível para este tipo de processo.
                  </p>
                </div>

                <!-- ✨ Sem Métricas de Performance -->
                <!-- Removido: métricas desnecessárias -->
              </div>

              <!-- ✨ Footer com Ação Principal -->
              <div class="card-footer">
                <v-btn 
                  :color="canCreateProcess(processType) ? 'primary' : 'error'"
                  :variant="canCreateProcess(processType) ? 'flat' : 'outlined'" 
                  block 
                  size="large"
                  :disabled="!canCreateProcess(processType)" 
                  @click.stop="startProcessCreation(processType)"
                  class="action-button"
                  :class="{ 'button-disabled': !canCreateProcess(processType) }"
                >
                  <v-icon start size="20">
                    {{ canCreateProcess(processType) ? 'mdi-rocket-launch' : 'mdi-alert-circle' }}
                  </v-icon>
                  {{ canCreateProcess(processType) ? 'Iniciar Processo' : 'Configuração Incompleta' }}
                </v-btn>
              </div>
            </v-card>
          </v-hover>
        </div>
      </div>
    </div>

    <!-- ✨ Estado Vazio Melhorado -->
    <v-card v-if="!loading && filteredProcessTypes.length === 0" class="empty-state text-center py-12" elevation="0">
      <div class="empty-state-content">
        <div class="empty-icon-wrapper mb-6">
          <v-icon size="80" color="grey-lighten-2">
            {{ search ? 'mdi-file-search' : 'mdi-file-document-multiple-outline' }}
          </v-icon>
        </div>

        <h2 class="text-h5 font-weight-bold mb-3">
          {{ search ? 'Nenhum processo encontrado' : 'Nenhum processo disponível' }}
        </h2>

        <p class="text-body-1 text-medium-emphasis mb-6 mx-auto" style="max-width: 400px;">
          {{
            search
              ? `Não encontramos processos que correspondam à busca "${search}". Tente usar termos diferentes.`
              : 'Ainda não há tipos de processo configurados. Entre em contato com um administrador para criar workflows.'
          }}
        </p>

        <div class="d-flex justify-center gap-3">
          <v-btn v-if="search" color="primary" variant="outlined" @click="clearFilters">
            <v-icon start>mdi-filter-remove</v-icon>
            Limpar Busca
          </v-btn>
          
          <v-btn v-if="!search && canManageProcessTypes" color="primary" variant="flat" @click="goToProcessTypes">
            <v-icon start>mdi-plus</v-icon>
            Criar Tipo de Processo
          </v-btn>
        </div>
      </div>
    </v-card>

    <!-- ✨ Loading State Melhorado -->
    <div v-if="loading" class="loading-container">
      <div class="text-center py-12">
        <div class="loading-animation mb-4">
          <v-progress-circular indeterminate color="primary" size="48" width="4" />
        </div>
        <h3 class="text-h6 mb-2 font-weight-medium">
          Carregando processos
        </h3>
        <p class="text-body-2 text-medium-emphasis">
          Preparando os workflows disponíveis...
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

const canManageProcessTypes = computed(() => {
  const userRole = authStore.userRole
  return ['ADMIN', 'MANAGER'].includes(userRole)
})

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

  // Ordenação: Featured primeiro, depois por nome
  return result.sort((a, b) => {
    const aFeatured = isFeaturedProcess(a)
    const bFeatured = isFeaturedProcess(b)
    
    if (aFeatured && !bFeatured) return -1
    if (!aFeatured && bFeatured) return 1
    
    return a.name.localeCompare(b.name)
  })
})

// ✨ Métodos Auxiliares
function canCreateProcess(processType) {
  return processType.steps && processType.steps.length > 0
}

function isFeaturedProcess(processType) {
  return (processType._count?.instances || 0) > 3
}

function getProcessIcon(processType) {
  // Mapear ícones baseado no nome/tipo do processo
  const name = processType.name.toLowerCase()
  
  if (name.includes('compra') || name.includes('aquisição')) return 'mdi-cart'
  if (name.includes('férias') || name.includes('licença')) return 'mdi-calendar-account'
  if (name.includes('despesa') || name.includes('reembolso')) return 'mdi-receipt'
  if (name.includes('contrato')) return 'mdi-file-document'
  if (name.includes('rh') || name.includes('recursos humanos')) return 'mdi-account-group'
  if (name.includes('ti') || name.includes('tecnologia')) return 'mdi-laptop'
  if (name.includes('financeiro') || name.includes('pagamento')) return 'mdi-currency-usd'
  if (name.includes('marketing')) return 'mdi-bullhorn'
  if (name.includes('vendas')) return 'mdi-handshake'
  if (name.includes('suporte')) return 'mdi-help-circle'
  
  return processType.icon || 'mdi-file-document-outline'
}

// ✨ Métodos de Ação
function startProcessCreation(processType) {
  if (!canCreateProcess(processType)) {
    window.showSnackbar?.('Este tipo de processo não está completo. Verifique se possui etapas configuradas.', 'warning')
    return
  }

  // ✨ Navegar para página de criação com tipo pré-selecionado
  router.push({
    name: 'CreateProcessWithType',
    params: { typeId: processType.id }
  })
}

function clearFilters() {
  search.value = ''
}

function goToProcessTypes() {
  router.push({ name: 'ProcessTypes' })
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
  // Carregar tipos de processo se necessário
  if (processTypes.value.length === 0) {
    await processTypeStore.fetchProcessTypes()
  }
})
</script>

<style scoped>
/* ✨ Layout e Container */
.processes-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 24px;
}

.process-grid {
  width: 100%;
}

.cards-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(380px, 1fr));
  gap: 24px;
  width: 100%;
}

.card-wrapper {
  width: 100%;
  min-height: 320px;
}

/* ✨ Header Section */
.header-section {
  background: linear-gradient(135deg, rgba(25, 118, 210, 0.06), rgba(66, 165, 245, 0.02));
  border-radius: 24px;
  padding: 32px;
  border: 1px solid rgba(25, 118, 210, 0.08);
  margin-bottom: 32px;
  backdrop-filter: blur(20px);
}

.header-content h1 {
  background: linear-gradient(135deg, #1976D2, #42A5F5);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  font-size: 2.25rem;
  font-weight: 700;
  letter-spacing: -0.02em;
}

/* ✨ Filter Card */
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

/* ✨ Professional Card Design */
.professional-card {
  border-radius: 20px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
  border: 1px solid rgba(0, 0, 0, 0.08);
  overflow: hidden;
  background: white;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
  position: relative;
}

.professional-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
  border-color: rgba(25, 118, 210, 0.2);
}

.card-disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.card-disabled:hover {
  transform: none !important;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04) !important;
  border-color: rgba(0, 0, 0, 0.08) !important;
}



/* ✨ Status Badges */
.status-badges {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 10;
  display: flex;
  gap: 6px;
}

.featured-badge {
  border-color: rgba(0, 0, 0, 0.23) !important;
  color: rgba(0, 0, 0, 0.6) !important;
  background: transparent !important;
  font-weight: 500;
}

.status-badge {
  background: #F44336 !important;
  color: white !important;
  font-weight: 600;
}

/* ✨ Card Header */
.card-header {
  padding: 24px 24px 20px;
  background: white;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

.header-content-wrapper {
  display: flex;
  align-items: flex-start;
  gap: 16px;
}

.icon-section {
  flex-shrink: 0;
}

.process-icon {
  width: 56px;
  height: 56px;
  border-radius: 16px;
  background: linear-gradient(135deg, rgba(25, 118, 210, 0.08), rgba(66, 165, 245, 0.04));
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(25, 118, 210, 0.1);
}

.content-section {
  flex: 1;
  min-width: 0;
}

.process-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.87) !important;
  margin: 0 0 8px;
  line-height: 1.3;
  letter-spacing: -0.01em;
  display: block;
}

.process-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  color: rgba(0, 0, 0, 0.6) !important;
  font-size: 0.875rem;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 4px;
  color: rgba(0, 0, 0, 0.6) !important;
}

.meta-divider {
  color: rgba(0, 0, 0, 0.3) !important;
}

/* ✨ Card Body */
.card-body {
  padding: 20px 24px;
  flex: 1;
}

.process-description {
  margin-bottom: 20px;
}

.description-text {
  color: rgba(0, 0, 0, 0.7) !important;
  line-height: 1.6;
  font-size: 0.95rem;
  margin: 0;
  display: block;
}

.description-placeholder {
  color: rgba(0, 0, 0, 0.5) !important;
  line-height: 1.6;
  font-size: 0.95rem;
  font-style: italic;
  margin: 0;
  display: block;
}

/* ✨ Process Metrics */
.process-metrics {
  background: rgba(25, 118, 210, 0.03);
  border-radius: 12px;
  padding: 16px;
  border: 1px solid rgba(25, 118, 210, 0.08);
}

.metric-row {
  display: flex;
  justify-content: center;
  gap: 12px;
}

.metric-item {
  text-align: center;
}

.metric-value {
  font-size: 1.1rem;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.87) !important;
  line-height: 1.2;
  display: block;
}

.metric-label {
  font-size: 0.75rem;
  color: rgba(0, 0, 0, 0.6) !important;
  margin-top: 2px;
  line-height: 1.2;
  display: block;
}

/* ✨ Card Footer */
.card-footer {
  padding: 0 24px 24px;
  margin-top: auto;
}

.action-button {
  border-radius: 16px;
  text-transform: none;
  font-weight: 600;
  height: 52px;
  font-size: 1rem;
  letter-spacing: 0.02em;
  box-shadow: 0 2px 8px rgba(25, 118, 210, 0.2);
  transition: all 0.2s ease;
}

.action-button:hover:not(.button-disabled) {
  box-shadow: 0 4px 16px rgba(25, 118, 210, 0.3);
  transform: translateY(-1px);
}

.button-disabled {
  box-shadow: none !important;
  transform: none !important;
}

/* ✨ Empty State */
.empty-state {
  border-radius: 24px;
  border: 2px dashed rgba(0, 0, 0, 0.1);
  background: rgba(248, 250, 252, 0.5);
  backdrop-filter: blur(10px);
}

.empty-state-content {
  max-width: 500px;
  margin: 0 auto;
}

.empty-icon-wrapper {
  display: flex;
  justify-content: center;
}

/* ✨ Loading State */
.loading-container {
  min-height: 400px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.loading-animation {
  display: flex;
  justify-content: center;
}

/* ✨ Responsividade */
@media (max-width: 768px) {
  .processes-container {
    padding: 0 16px;
  }

  .cards-container {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .card-wrapper {
    min-height: 300px;
  }

  .header-section {
    padding: 24px 20px;
  }

  .header-content h1 {
    font-size: 1.75rem;
  }

  .card-header {
    padding: 20px 20px 16px;
  }

  .card-body {
    padding: 16px 20px;
  }

  .card-footer {
    padding: 0 20px 20px;
  }

  .process-icon {
    width: 48px;
    height: 48px;
  }

  .process-title {
    font-size: 1.1rem;
  }

  .metric-row {
    gap: 8px;
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
  }
}

@media (min-width: 1441px) {
  .cards-container {
    grid-template-columns: repeat(4, 1fr);
  }
}

/* ✨ Tema Escuro */
@media (prefers-color-scheme: dark) {
  .filter-card {
    border-color: rgba(255, 255, 255, 0.1);
    background: rgba(255, 255, 255, 0.05);
  }

  .professional-card {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(255, 255, 255, 0.1);
  }

  .professional-card:hover {
    border-color: rgba(66, 165, 245, 0.3);
  }

  .process-title {
    color: rgba(255, 255, 255, 0.9);
  }

  .description-text {
    color: rgba(255, 255, 255, 0.7);
  }

  .description-placeholder {
    color: rgba(255, 255, 255, 0.5);
  }

  .metric-value {
    color: rgba(255, 255, 255, 0.9);
  }

  .process-meta {
    color: rgba(255, 255, 255, 0.6);
  }

  .metric-label {
    color: rgba(255, 255, 255, 0.6);
  }

  .empty-state {
    border-color: rgba(255, 255, 255, 0.2);
    background: rgba(255, 255, 255, 0.02);
  }
}

/* ✨ Micro-interações */
.professional-card {
  will-change: transform, box-shadow;
}

/* ✨ Estados de foco para acessibilidade */
.professional-card:focus-visible {
  outline: 2px solid #1976D2;
  outline-offset: 2px;
}

.action-button:focus-visible {
  outline: 2px solid #1976D2;
  outline-offset: 2px;
}
</style>