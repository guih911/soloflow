<template>
  <div class="process-types-page">
    <!-- Modern Page Header -->
    <div class="page-header">
      <div class="header-content">
        <div class="header-icon">
          <v-icon size="28" color="white">mdi-sitemap</v-icon>
        </div>
        <div class="header-text">
          <h1 class="page-title">Tipos de Processo</h1>
          <p class="page-subtitle">Configure os fluxos de trabalho da empresa</p>
        </div>
      </div>
      <v-btn
        variant="flat"
        color="white"
        @click="createNew"
        prepend-icon="mdi-plus"
        class="action-btn"
      >
        Novo Tipo
      </v-btn>
    </div>

    <!-- Filters -->
    <div class="filters-card">
      <div class="filters-grid">
        <v-text-field
          v-model="searchQuery"
          placeholder="Buscar tipos de processo..."
          prepend-inner-icon="mdi-magnify"
          variant="outlined"
          density="compact"
          hide-details
          clearable
          class="filter-input"
        />
        <v-select
          v-model="filterStatus"
          :items="statusOptions"
          placeholder="Status"
          variant="outlined"
          density="compact"
          hide-details
          clearable
          class="filter-input"
        />
      </div>
    </div>

    <!-- Loading State - Skeleton -->
    <div v-if="loading && processTypes.length === 0" class="loading-state" aria-label="Carregando tipos de processo">
      <v-skeleton-loader
        type="list-item-two-line@5"
        class="skeleton-list"
      />
    </div>

    <!-- Error Alert -->
    <v-alert
      v-if="error"
      type="error"
      variant="tonal"
      closable
      class="mb-4"
      @click:close="clearError"
    >
      {{ error }}
    </v-alert>

    <!-- Process Types List -->
    <div v-if="!loading || processTypes.length > 0" class="types-list" role="list" aria-label="Lista de tipos de processo">
      <div
        v-for="item in paginatedProcessTypes"
        :key="item.id"
        class="type-row"
        :class="{ 'type-row--inactive': !item.isActive }"
        role="listitem"
        :aria-label="`${item.name} - ${item.isActive ? 'Ativo' : 'Inativo'} - ${item.stepsCount} etapas`"
        tabindex="0"
        @click="editProcessType(item)"
        @keydown.enter="editProcessType(item)"
      >
        <!-- Left: Icon + Info -->
        <div class="type-row__main">
          <div class="type-row__icon">
            <v-icon size="20">mdi-sitemap-outline</v-icon>
          </div>
          <div class="type-row__info">
            <div class="type-row__header">
              <span class="type-row__name">{{ item.name }}</span>
              <span
                class="type-row__status"
                :class="item.isActive ? 'type-row__status--active' : 'type-row__status--inactive'"
              >
                {{ item.isActive ? 'Ativo' : 'Inativo' }}
              </span>
            </div>
            <p v-if="item.description" class="type-row__description">
              {{ item.description }}
            </p>
          </div>
        </div>

        <!-- Center: Stats -->
        <div class="type-row__stats">
          <div class="stat-pill">
            <v-icon size="14">mdi-debug-step-over</v-icon>
            <span>{{ item.stepsCount }}</span>
          </div>
          <div class="stat-pill">
            <v-icon size="14">mdi-form-textbox</v-icon>
            <span>{{ item.formFieldsCount }}</span>
          </div>
          <div class="stat-pill">
            <v-icon size="14">mdi-file-document-multiple-outline</v-icon>
            <span>{{ item.instancesCount }}</span>
          </div>
        </div>

        <!-- Center: Features -->
        <div class="type-row__features">
          <v-tooltip v-if="item.stepsCount === 0" location="top">
            <template v-slot:activator="{ props }">
              <span v-bind="props" class="feature-badge feature-badge--warning">
                <v-icon size="12">mdi-alert</v-icon>
              </span>
            </template>
            <span>Sem etapas configuradas</span>
          </v-tooltip>
          <v-tooltip v-if="item.hasSignatureSteps" location="top">
            <template v-slot:activator="{ props }">
              <span v-bind="props" class="feature-badge feature-badge--signature">
                <v-icon size="12">mdi-draw-pen</v-icon>
              </span>
            </template>
            <span>Requer assinatura</span>
          </v-tooltip>
          <v-tooltip v-if="item.hasAttachmentSteps" location="top">
            <template v-slot:activator="{ props }">
              <span v-bind="props" class="feature-badge feature-badge--attachment">
                <v-icon size="12">mdi-paperclip</v-icon>
              </span>
            </template>
            <span>Permite anexos</span>
          </v-tooltip>
          <v-tooltip v-if="item.formFieldsCount > 0" location="top">
            <template v-slot:activator="{ props }">
              <span v-bind="props" class="feature-badge feature-badge--form">
                <v-icon size="12">mdi-form-textbox</v-icon>
              </span>
            </template>
            <span>Possui formulário</span>
          </v-tooltip>
          <v-tooltip v-if="item.hasChildProcesses" location="top">
            <template v-slot:activator="{ props }">
              <span v-bind="props" class="feature-badge feature-badge--subprocess">
                <v-icon size="12">mdi-source-branch</v-icon>
              </span>
            </template>
            <span>{{ item.childProcessCount }} subprocessos</span>
          </v-tooltip>
        </div>

        <!-- Right: Actions -->
        <div class="type-row__actions">
          <v-btn
            size="small"
            variant="text"
            color="primary"
            @click.stop="editProcessType(item)"
          >
            Editar
          </v-btn>
          <v-menu>
            <template v-slot:activator="{ props }">
              <v-btn
                v-bind="props"
                icon="mdi-dots-horizontal"
                variant="text"
                size="small"
                @click.stop
              />
            </template>
            <v-list density="compact">
              <v-list-item @click="toggleProcessTypeStatus(item)">
                <template v-slot:prepend>
                  <v-icon size="18">{{ item.isActive ? 'mdi-eye-off-outline' : 'mdi-eye-outline' }}</v-icon>
                </template>
                <v-list-item-title>{{ item.isActive ? 'Desativar' : 'Ativar' }}</v-list-item-title>
              </v-list-item>
              <v-list-item
                @click="duplicateProcessType(item)"
                :disabled="item.stepsCount === 0"
              >
                <template v-slot:prepend>
                  <v-icon size="18">mdi-content-copy</v-icon>
                </template>
                <v-list-item-title>Duplicar</v-list-item-title>
              </v-list-item>
            </v-list>
          </v-menu>
        </div>
      </div>

      <!-- Empty Search -->
      <div v-if="filteredProcessTypes.length === 0 && processTypes.length > 0" class="empty-search">
        <p>Nenhum tipo encontrado</p>
        <v-btn variant="text" size="small" @click="clearFilters">Limpar filtros</v-btn>
      </div>
    </div>

    <!-- Pagination -->
    <div v-if="filteredProcessTypes.length > itemsPerPage" class="pagination-wrapper">
      <span class="pagination-info">
        {{ paginationStart }}-{{ paginationEnd }} de {{ filteredProcessTypes.length }}
      </span>
      <v-pagination
        v-model="currentPage"
        :length="totalPages"
        :total-visible="5"
        density="compact"
        rounded
      />
    </div>

    <!-- Empty State -->
    <div v-if="!loading && processTypes.length === 0 && !error" class="empty-state">
      <div class="empty-state__icon">
        <v-icon size="32">mdi-sitemap-outline</v-icon>
      </div>
      <h3 class="empty-state__title">Nenhum tipo de processo</h3>
      <p class="empty-state__text">
        Crie seu primeiro tipo de processo para começar
      </p>
      <v-btn color="primary" @click="createNew">
        <v-icon start>mdi-plus</v-icon>
        Criar Tipo de Processo
      </v-btn>
    </div>
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

// Estado local
const refreshing = ref(false)
const searchQuery = ref('')
const filterStatus = ref(null)
const currentPage = ref(1)
const itemsPerPage = 15

// Options
const statusOptions = [
  { title: 'Ativos', value: true },
  { title: 'Inativos', value: false },
]

// Computed
const loading = computed(() => processTypeStore.loading)
const processTypes = computed(() => processTypeStore.processTypes)
const error = computed(() => processTypeStore.error)

// Computed para informações dos process types
const processTypesWithInfo = computed(() => {
  const usedAsChildProcessIds = new Set()

  processTypes.value.forEach(pt => {
    if (Array.isArray(pt.allowedChildProcessTypes) && pt.allowedChildProcessTypes.length > 0) {
      pt.allowedChildProcessTypes.forEach(childId => {
        usedAsChildProcessIds.add(childId)
      })
    }
  })

  return processTypes.value.map(processType => {
    const steps = Array.isArray(processType.steps) ? processType.steps : []
    const formFields = Array.isArray(processType.formFields) ? processType.formFields : []
    const hasChildProcesses = Array.isArray(processType.allowedChildProcessTypes) &&
                              processType.allowedChildProcessTypes.length > 0

    return {
      ...processType,
      stepsCount: steps.length,
      formFieldsCount: formFields.length,
      instancesCount: processType._count?.instances || 0,
      hasSignatureSteps: steps.some(step => step.requiresSignature),
      hasAttachmentSteps: steps.some(step => step.allowAttachment),
      hasChildProcesses,
      childProcessCount: processType.allowedChildProcessTypes?.length || 0
    }
  })
})

// Filtered process types
const filteredProcessTypes = computed(() => {
  let result = processTypesWithInfo.value

  if (searchQuery.value) {
    const search = searchQuery.value.toLowerCase().trim()
    result = result.filter(pt =>
      pt.name.toLowerCase().includes(search) ||
      pt.description?.toLowerCase().includes(search)
    )
  }

  if (filterStatus.value !== null) {
    result = result.filter(pt => pt.isActive === filterStatus.value)
  }

  return result
})

// Pagination
const totalPages = computed(() => Math.ceil(filteredProcessTypes.value.length / itemsPerPage))
const paginationStart = computed(() => (currentPage.value - 1) * itemsPerPage + 1)
const paginationEnd = computed(() => Math.min(currentPage.value * itemsPerPage, filteredProcessTypes.value.length))

const paginatedProcessTypes = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage
  return filteredProcessTypes.value.slice(start, start + itemsPerPage)
})

// Methods
function createNew() {
  router.push('/tipos-de-processo/novo')
}

function editProcessType(processType) {
  router.push(`/tipos-de-processo/${processType.id}/editar`)
}

function clearFilters() {
  searchQuery.value = ''
  filterStatus.value = null
  currentPage.value = 1
}

async function duplicateProcessType(processType) {
  if (processType.stepsCount === 0) {
    window.showSnackbar('Não é possível duplicar um tipo sem etapas', 'warning')
    return
  }

  try {
    refreshing.value = true
    const result = await processTypeStore.duplicateProcessType(processType)
    window.showSnackbar(`"${result.name}" duplicado`, 'success')
    await refreshData()
  } catch (err) {
    window.showSnackbar('Erro ao duplicar', 'error')
  } finally {
    refreshing.value = false
  }
}

async function toggleProcessTypeStatus(processType) {
  const newStatus = !processType.isActive

  try {
    refreshing.value = true
    await processTypeStore.updateProcessType(processType.id, { isActive: newStatus })
    window.showSnackbar(newStatus ? 'Ativado' : 'Desativado', 'success')
    await refreshData()
  } catch (err) {
    window.showSnackbar('Erro ao alterar status', 'error')
  } finally {
    refreshing.value = false
  }
}

async function refreshData() {
  try {
    await processTypeStore.fetchProcessTypes()
  } catch (err) {
    window.showSnackbar('Erro ao carregar dados', 'error')
  }
}

function clearError() {
  processTypeStore.clearError()
}

// Lifecycle
onMounted(async () => {
  if (!authStore.canManageProcessTypes) {
    window.showSnackbar('Sem permissão', 'error')
    router.push('/painel')
    return
  }

  if (processTypes.value.length === 0 && !loading.value) {
    await refreshData()
  }
})
</script>

<style scoped>
.process-types-page {
  max-width: 1200px;
  margin: 0 auto;
}

/* Modern Page Header with Gradient */
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24px 28px;
  background: linear-gradient(135deg, var(--color-primary-500), var(--color-primary-600));
  border-radius: 16px;
  margin-bottom: 24px;
  box-shadow: 0 4px 20px rgba(59, 130, 246, 0.25);
}

.header-content {
  display: flex;
  align-items: center;
  gap: 16px;
}

.header-icon {
  width: 56px;
  height: 56px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
}

.header-text {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.page-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: white !important;
  margin: 0;
  letter-spacing: -0.01em;
}

.page-subtitle {
  font-size: 0.9375rem;
  color: rgba(255, 255, 255, 0.75) !important;
  margin: 0;
}

.action-btn {
  text-transform: none;
  font-weight: 500;
  border-radius: 10px;
  color: var(--color-primary-600) !important;
}

/* Filters */
.filters-card {
  background: var(--color-surface);
  border: 1px solid var(--color-surface-border);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
}

.filters-grid {
  display: grid;
  grid-template-columns: 1fr 180px;
  gap: 12px;
}

@media (max-width: 600px) {
  .filters-grid {
    grid-template-columns: 1fr;
  }
}

.filter-input :deep(.v-field) {
  border-radius: 8px;
}

/* Types List */
.types-list {
  background: var(--color-surface);
  border: 1px solid var(--color-surface-border);
  border-radius: 12px;
  overflow: hidden;
}

/* Type Row */
.type-row {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 14px 20px;
  border-bottom: 1px solid var(--color-surface-border);
  cursor: pointer;
  transition: background 0.15s ease;
}

.type-row:last-child {
  border-bottom: none;
}

.type-row:hover {
  background: var(--color-neutral-50);
}

.type-row--inactive {
  opacity: 0.6;
}

.type-row__main {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  flex: 1;
  min-width: 0;
}

.type-row__icon {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: var(--color-primary-50);
  color: var(--color-primary-600);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.type-row--inactive .type-row__icon {
  background: var(--color-neutral-100);
  color: var(--color-neutral-500);
}

.type-row__info {
  flex: 1;
  min-width: 0;
}

.type-row__header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 2px;
}

.type-row__name {
  font-size: 0.9375rem;
  font-weight: 500;
  color: var(--color-neutral-900);
}

.type-row__status {
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  padding: 2px 6px;
  border-radius: 4px;
}

.type-row__status--active {
  background: var(--color-success-50);
  color: var(--color-success-700);
}

.type-row__status--inactive {
  background: var(--color-neutral-100);
  color: var(--color-neutral-500);
}

.type-row__description {
  font-size: 0.8125rem;
  color: var(--color-neutral-500);
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Stats */
.type-row__stats {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.stat-pill {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: var(--color-neutral-100);
  border-radius: 6px;
  font-size: 0.75rem;
  color: var(--color-neutral-600);
}

.stat-pill .v-icon {
  color: var(--color-neutral-400);
}

/* Features */
.type-row__features {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}

.feature-badge {
  width: 24px;
  height: 24px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.feature-badge--warning {
  background: var(--color-warning-100);
  color: var(--color-warning-600);
}

.feature-badge--signature {
  background: var(--color-error-50);
  color: var(--color-error-600);
}

.feature-badge--attachment {
  background: var(--color-info-50);
  color: var(--color-info-600);
}

.feature-badge--form {
  background: #f3e8ff;
  color: #7c3aed;
}

.feature-badge--subprocess {
  background: #f0fdfa;
  color: #0d9488;
}

/* Actions */
.type-row__actions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.type-row__actions :deep(.v-btn) {
  text-transform: none;
  font-weight: 500;
}

/* Empty Search */
.empty-search {
  padding: 32px;
  text-align: center;
  color: var(--color-neutral-500);
}

.empty-search p {
  margin: 0 0 8px 0;
}

/* Pagination */
.pagination-wrapper {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  margin-top: 16px;
  background: var(--color-surface);
  border: 1px solid var(--color-surface-border);
  border-radius: 12px;
}

.pagination-info {
  font-size: 0.8125rem;
  color: var(--color-neutral-500);
}

/* Loading State - Skeleton */
.loading-state {
  background: var(--color-surface);
  border: 1px solid var(--color-surface-border);
  border-radius: 12px;
  overflow: hidden;
}

.skeleton-list {
  width: 100%;
}

.skeleton-list :deep(.v-skeleton-loader__bone) {
  margin-bottom: 0;
  border-bottom: 1px solid var(--color-surface-border);
}

/* Focus state for keyboard navigation */
.type-row:focus {
  outline: 2px solid var(--color-primary-300);
  outline-offset: -2px;
  background: var(--color-neutral-50);
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: 48px 24px;
  background: var(--color-surface);
  border: 1px solid var(--color-surface-border);
  border-radius: 12px;
}

.empty-state__icon {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: var(--color-neutral-100);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 16px;
  color: var(--color-neutral-400);
}

.empty-state__title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-neutral-700);
  margin: 0 0 4px;
}

.empty-state__text {
  font-size: 0.875rem;
  color: var(--color-neutral-500);
  margin: 0 0 20px;
}

/* Responsive */
@media (max-width: 900px) {
  .type-row__stats,
  .type-row__features {
    display: none;
  }
}

@media (max-width: 600px) {
  .page-header {
    flex-direction: column;
    align-items: stretch;
  }

  .page-header .v-btn {
    width: 100%;
  }

  .type-row {
    padding: 12px 16px;
  }

  .pagination-wrapper {
    flex-direction: column;
    gap: 12px;
  }
}
</style>
