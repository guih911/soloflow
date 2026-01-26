<template>
  <div class="profiles-page">
    <!-- Modern Page Header -->
    <div class="page-header">
      <div class="header-content">
        <div class="header-icon" aria-hidden="true">
          <v-icon size="28" color="white">mdi-shield-account</v-icon>
        </div>
        <div class="header-text">
          <h1 class="page-title">Perfis de Acesso</h1>
          <p class="page-subtitle">Configure permissões e níveis de acesso</p>
        </div>
      </div>
      <v-btn
        v-if="canManageProfiles"
        variant="flat"
        color="white"
        prepend-icon="mdi-plus"
        @click="openCreateDialog"
        class="action-btn"
      >
        Novo Perfil
      </v-btn>
    </div>

    <!-- Loading State - Skeleton -->
    <div v-if="profilesLoading && profiles.length === 0" class="loading-state" aria-label="Carregando perfis">
      <v-skeleton-loader type="table-heading, table-row@5" class="skeleton-table" />
    </div>

    <!-- Profiles Cards Grid - Visual Profissional -->
    <div v-if="!profilesLoading || profiles.length > 0" class="profiles-container">
      <!-- Toolbar de Filtros -->
      <div class="toolbar-card">
        <div class="toolbar-content">
          <div class="toolbar-left">
            <v-icon class="mr-2" color="primary" aria-hidden="true">mdi-account-key</v-icon>
            <span class="toolbar-title">Lista de Perfis</span>
            <v-chip size="small" color="primary" variant="tonal" class="ml-2">
              {{ filteredProfiles.length }}
            </v-chip>
          </div>
          <div class="toolbar-right">
            <v-text-field
              v-model="search"
              density="compact"
              placeholder="Buscar perfil..."
              prepend-inner-icon="mdi-magnify"
              variant="outlined"
              hide-details
              single-line
              class="search-field"
              aria-label="Buscar perfis"
            />
          </div>
        </div>
      </div>

      <!-- Profiles Grid -->
      <div class="profiles-grid" role="list" aria-label="Lista de perfis de acesso">
        <div
          v-for="profile in filteredProfiles"
          :key="profile.id"
          class="profile-card"
          :class="{
            'profile-card--default': profile.isDefault,
            'profile-card--inactive': profile.isActive === false
          }"
          role="listitem"
          :aria-label="`Perfil ${profile.name}`"
          tabindex="0"
          @keydown.enter="openEditDialog(profile.id)"
        >
          <!-- Card Header -->
          <div class="profile-card__header">
            <div class="profile-card__avatar" :class="{ 'avatar--default': profile.isDefault }">
              <v-icon size="24" color="white">
                {{ profile.isDefault ? 'mdi-star' : 'mdi-shield-account' }}
              </v-icon>
            </div>
            <div class="profile-card__title-section">
              <h3 class="profile-card__name">{{ profile.name }}</h3>
              <div class="profile-card__badges">
                <span v-if="profile.isDefault" class="badge badge--default">
                  <v-icon size="12">mdi-star</v-icon>
                  Padrão
                </span>
                <span :class="['badge', profile.isActive !== false ? 'badge--active' : 'badge--inactive']">
                  <v-icon size="12">{{ profile.isActive !== false ? 'mdi-check' : 'mdi-close' }}</v-icon>
                  {{ profile.isActive !== false ? 'Ativo' : 'Inativo' }}
                </span>
              </div>
            </div>
            <div class="profile-card__actions">
              <v-btn
                icon
                size="small"
                variant="text"
                :disabled="!canManageProfiles"
                @click.stop="openEditDialog(profile.id)"
                aria-label="Editar perfil"
              >
                <v-icon size="20">mdi-pencil</v-icon>
              </v-btn>
              <v-btn
                icon
                size="small"
                variant="text"
                :color="profile.isActive ? 'success' : 'grey'"
                :disabled="!canManageProfiles"
                @click.stop="toggleProfileStatus(profile)"
                :aria-label="profile.isActive ? 'Desativar perfil' : 'Ativar perfil'"
              >
                <v-icon size="20">{{ profile.isActive ? 'mdi-toggle-switch' : 'mdi-toggle-switch-off' }}</v-icon>
              </v-btn>
            </div>
          </div>

          <!-- Card Content -->
          <div class="profile-card__content">
            <!-- Empresa -->
            <div class="profile-card__section">
              <div class="section-label">
                <v-icon size="16" class="mr-1" aria-hidden="true">mdi-office-building</v-icon>
                Empresa
              </div>
              <div class="section-value">
                <v-chip v-if="profile.companyId" size="small" variant="tonal" color="primary">
                  {{ getCompanyLabel(profile.companyId) }}
                </v-chip>
                <span v-else class="text-muted">Global (todas as empresas)</span>
              </div>
            </div>

            <!-- Telas Liberadas -->
            <div class="profile-card__section">
              <div class="section-label">
                <v-icon size="16" class="mr-1" aria-hidden="true">mdi-monitor</v-icon>
                Telas Liberadas
                <v-chip size="x-small" variant="tonal" class="ml-1">
                  {{ getScreensCount(profile) }}
                </v-chip>
              </div>
              <div class="section-value permissions-list">
                <template v-if="summarizeScreens(profile).length > 0">
                  <v-tooltip
                    v-for="(summary, idx) in summarizeScreens(profile).slice(0, 2)"
                    :key="idx"
                    :text="summary"
                    location="top"
                  >
                    <template #activator="{ props }">
                      <v-chip
                        v-bind="props"
                        size="small"
                        variant="tonal"
                        color="blue"
                        class="permission-chip"
                      >
                        {{ truncateText(summary, 25) }}
                      </v-chip>
                    </template>
                  </v-tooltip>
                  <v-chip
                    v-if="summarizeScreens(profile).length > 2"
                    size="small"
                    variant="outlined"
                    color="grey"
                    class="more-chip"
                  >
                    +{{ summarizeScreens(profile).length - 2 }}
                  </v-chip>
                </template>
                <span v-else class="text-muted">Nenhuma tela configurada</span>
              </div>
            </div>

            <!-- Tipos de Processo -->
            <div class="profile-card__section">
              <div class="section-label">
                <v-icon size="16" class="mr-1" aria-hidden="true">mdi-file-tree</v-icon>
                Tipos de Processo
                <v-chip size="x-small" variant="tonal" class="ml-1">
                  {{ getProcessTypesCount(profile) }}
                </v-chip>
              </div>
              <div class="section-value permissions-list">
                <template v-if="summarizeProcessTypes(profile).length > 0">
                  <v-chip
                    v-for="(summary, idx) in summarizeProcessTypes(profile).slice(0, 3)"
                    :key="idx"
                    size="small"
                    variant="tonal"
                    color="green"
                    class="permission-chip"
                  >
                    {{ truncateText(summary, 20) }}
                  </v-chip>
                  <v-chip
                    v-if="summarizeProcessTypes(profile).length > 3"
                    size="small"
                    variant="outlined"
                    color="grey"
                    class="more-chip"
                  >
                    +{{ summarizeProcessTypes(profile).length - 3 }}
                  </v-chip>
                </template>
                <span v-else class="text-muted">Sem restrições</span>
              </div>
            </div>
          </div>

          <!-- Card Footer -->
          <div class="profile-card__footer">
            <span class="profile-card__description" v-if="profile.description">
              {{ truncateText(profile.description, 60) }}
            </span>
            <span v-else class="text-muted text-caption">Sem descrição</span>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-if="filteredProfiles.length === 0 && !profilesLoading" class="empty-state">
        <div class="empty-state__icon" aria-hidden="true">
          <v-icon size="64" color="grey-lighten-1">mdi-shield-off-outline</v-icon>
        </div>
        <h3 class="empty-state__title">Nenhum perfil encontrado</h3>
        <p class="empty-state__text">
          {{ search ? 'Tente ajustar sua busca ou' : 'Comece' }} criando um novo perfil de acesso.
        </p>
        <v-btn
          v-if="canManageProfiles"
          color="primary"
          variant="elevated"
          prepend-icon="mdi-plus"
          @click="openCreateDialog"
          class="mt-4"
        >
          Criar Perfil
        </v-btn>
      </div>
    </div>

  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useProfileStore } from '@/stores/profiles'
import { useProcessTypeStore } from '@/stores/processTypes'
import { useCompanyStore } from '@/stores/company'
import { useAuthStore } from '@/stores/auth'
import { SCREEN_CATALOG } from '@/constants/permissions'

const router = useRouter()
const authStore = useAuthStore()
const profileStore = useProfileStore()
const processTypeStore = useProcessTypeStore()
const companyStore = useCompanyStore()

const search = ref('')

const headers = [
  { title: 'Nome', key: 'name' },
  { title: 'Empresa', key: 'company', sortable: false },
  { title: 'Padrão', key: 'isDefault', align: 'center' },
  { title: 'Status', key: 'isActive', align: 'center' },
  { title: 'Telas liberadas', key: 'screens', sortable: false },
  { title: 'Tipos de processo', key: 'processTypes', sortable: false },
  { title: 'Ações', key: 'actions', align: 'center', sortable: false },
]

const profiles = computed(() => profileStore.profiles || [])
const processTypes = computed(() => processTypeStore.processTypes || [])
const companies = computed(() => companyStore.companies || [])
const profilesLoading = computed(() => profileStore.loading)
const canManageProfiles = computed(() => authStore.hasPermission('profiles', 'manage'))

const filteredProfiles = computed(() => {
  const term = search.value.trim().toLowerCase()
  if (!term) return profiles.value
  return profiles.value.filter((profile) => {
    const haystack = [
      profile.name,
      profile.description,
      summarizeScreens(profile).join(' '),
      summarizeProcessTypes(profile).join(' '),
      getCompanyLabel(profile.companyId),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
    return haystack.includes(term)
  })
})

const screenCatalog = SCREEN_CATALOG

onMounted(async () => {
  try {
    await Promise.all([
      profileStore.fetchProfiles(),
      processTypeStore.fetchProcessTypes(),
      companyStore.fetchCompanies(),
    ])
  } catch (error) {
    window.showSnackbar?.('Erro ao carregar perfis', 'error')
  }
})

function getCompanyLabel(companyId) {
  if (!companyId) return 'Global'
  const company = (companies.value || []).find((item) => item.id === companyId)
  return company?.name || 'Empresa desconhecida'
}

function summarizeScreens(profile) {
  const permissions = Array.isArray(profile.permissions) ? profile.permissions : []
  const grouped = new Map()

  permissions.forEach((permission) => {
    const screen = screenCatalog.find((item) => item.id === permission.resource)
    if (!screen) return

    const entry = grouped.get(screen.label) || new Set()
    entry.add(
      screen.actions.find((action) => action.id === permission.action)?.label ??
        permission.action,
    )
    grouped.set(screen.label, entry)
  })

  return Array.from(grouped.entries()).map(
    ([label, actions]) => `${label}: ${Array.from(actions).join(', ')}`,
  )
}

function summarizeProcessTypes(profile) {
  const permissions = Array.isArray(profile.processTypePermissions)
    ? profile.processTypePermissions
    : []

  if (!permissions.length) return []

  return permissions.map((permission) => {
    return permission.processTypeId === '*'
      ? 'Todos os tipos'
      : processTypes.value.find((type) => type.id === permission.processTypeId)?.name ||
          'Tipo desconhecido'
  })
}

function getScreensCount(profile) {
  const permissions = Array.isArray(profile.permissions) ? profile.permissions : []
  const screens = new Set(permissions.map((p) => p.resource))
  return screens.size
}

function getProcessTypesCount(profile) {
  const permissions = Array.isArray(profile.processTypePermissions)
    ? profile.processTypePermissions
    : []
  return permissions.length
}

function truncateText(text, maxLength) {
  if (!text) return ''
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}

function openCreateDialog() {
  router.push('/perfis/novo')
}

function openEditDialog(profileId) {
  router.push(`/perfis/${profileId}/editar`)
}

async function toggleProfileStatus(profile) {
  if (!canManageProfiles.value) return

  const newStatus = profile.isActive === false ? true : false
  const action = newStatus ? 'ativar' : 'desativar'

  try {
    await profileStore.updateProfile(profile.id, { isActive: newStatus })
    // Recarregar lista de perfis para refletir a mudança
    await profileStore.fetchProfiles()
    window.showSnackbar?.(`Perfil ${newStatus ? 'ativado' : 'desativado'} com sucesso.`, 'success')
  } catch (error) {
    const message = error.response?.data?.message || `Erro ao ${action} perfil.`
    window.showSnackbar?.(message, 'error')
  }
}
</script>

<style scoped>
.profiles-page {
  max-width: 1400px;
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

/* Loading State */
.loading-state {
  padding: 0;
}

.skeleton-table {
  width: 100%;
  border-radius: 16px;
  overflow: hidden;
  background: var(--color-surface);
  border: 1px solid var(--color-surface-border);
}

/* Profiles Container */
.profiles-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* Toolbar */
.toolbar-card {
  background: var(--color-surface);
  border: 1px solid var(--color-surface-border);
  border-radius: 14px;
  padding: 16px 20px;
}

.toolbar-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.toolbar-left {
  display: flex;
  align-items: center;
}

.toolbar-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-neutral-800);
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.search-field {
  width: 280px;
}

.search-field :deep(.v-field) {
  border-radius: 10px;
}

/* Profiles Grid */
.profiles-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
  gap: 20px;
}

/* Profile Card */
.profile-card {
  background: var(--color-surface);
  border: 1px solid var(--color-surface-border);
  border-radius: 16px;
  overflow: hidden;
  transition: all 0.25s ease;
  cursor: pointer;
}

.profile-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.1);
  border-color: var(--color-primary-200);
}

.profile-card:focus {
  outline: 2px solid var(--color-primary-400);
  outline-offset: 2px;
}

.profile-card--default {
  border-color: var(--color-primary-300);
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.03) 0%, var(--color-surface) 100%);
}

.profile-card--inactive {
  opacity: 0.7;
  background: var(--color-neutral-50);
}

/* Card Header */
.profile-card__header {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 20px;
  background: linear-gradient(135deg, var(--color-neutral-50) 0%, transparent 100%);
  border-bottom: 1px solid var(--color-surface-border);
}

.profile-card__avatar {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: linear-gradient(135deg, var(--color-primary-500), var(--color-primary-600));
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.profile-card__avatar.avatar--default {
  background: linear-gradient(135deg, var(--color-warning-500), var(--color-warning-600));
}

.profile-card__title-section {
  flex: 1;
  min-width: 0;
}

.profile-card__name {
  font-size: 1.0625rem;
  font-weight: 600;
  color: var(--color-neutral-800);
  margin: 0 0 6px 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.profile-card__badges {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 20px;
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.02em;
}

.badge--default {
  background: var(--color-warning-100);
  color: var(--color-warning-700);
}

.badge--active {
  background: var(--color-success-100);
  color: var(--color-success-700);
}

.badge--inactive {
  background: var(--color-error-100);
  color: var(--color-error-700);
}

.profile-card__actions {
  display: flex;
  gap: 4px;
}

/* Card Content */
.profile-card__content {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.profile-card__section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.section-label {
  display: flex;
  align-items: center;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-neutral-500);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.section-value {
  font-size: 0.875rem;
  color: var(--color-neutral-700);
}

.permissions-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.permission-chip {
  font-size: 0.75rem !important;
}

.more-chip {
  font-size: 0.75rem !important;
  font-weight: 600;
}

.text-muted {
  color: var(--color-neutral-400);
  font-style: italic;
}

/* Card Footer */
.profile-card__footer {
  padding: 14px 20px;
  background: var(--color-neutral-50);
  border-top: 1px solid var(--color-surface-border);
}

.profile-card__description {
  font-size: 0.8125rem;
  color: var(--color-neutral-600);
  line-height: 1.5;
}

/* Empty State */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 64px 24px;
  background: var(--color-surface);
  border: 1px dashed var(--color-surface-border);
  border-radius: 16px;
  text-align: center;
}

.empty-state__icon {
  width: 96px;
  height: 96px;
  border-radius: 50%;
  background: var(--color-neutral-100);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20px;
}

.empty-state__title {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-neutral-700);
  margin: 0 0 8px 0;
}

.empty-state__text {
  font-size: 0.9375rem;
  color: var(--color-neutral-500);
  margin: 0;
  max-width: 360px;
}

/* Responsive */
@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
    padding: 20px;
  }

  .header-content {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .action-btn {
    width: 100%;
  }

  .toolbar-content {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }

  .toolbar-left {
    justify-content: center;
  }

  .toolbar-right {
    justify-content: center;
  }

  .search-field {
    width: 100%;
  }

  .profiles-grid {
    grid-template-columns: 1fr;
  }
}
</style>
