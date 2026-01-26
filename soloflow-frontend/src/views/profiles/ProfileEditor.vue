<template>
  <div class="profile-editor-page">
    <!-- Header com Navegação -->
    <div class="page-header">
      <div class="header-content">
        <v-btn
          icon="mdi-arrow-left"
          variant="text"
          color="white"
          @click="goBack"
          class="back-btn"
          aria-label="Voltar para lista de perfis"
        />
        <div class="header-icon" aria-hidden="true">
          <v-icon size="28" color="white">mdi-shield-account</v-icon>
        </div>
        <div class="header-text">
          <h1 class="page-title">{{ isEditing ? 'Editar Perfil' : 'Novo Perfil' }}</h1>
          <p class="page-subtitle">{{ isEditing ? form.name || 'Carregando...' : 'Configure permissões e níveis de acesso' }}</p>
        </div>
      </div>
      <div class="header-actions">
        <v-btn
          variant="outlined"
          color="white"
          @click="goBack"
          class="action-btn"
        >
          Cancelar
        </v-btn>
        <v-btn
          variant="flat"
          color="white"
          :loading="saving"
          :disabled="!isFormValid"
          @click="handleSubmit"
          class="action-btn action-btn--primary"
        >
          <v-icon start>mdi-content-save</v-icon>
          {{ isEditing ? 'Salvar Alterações' : 'Criar Perfil' }}
        </v-btn>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="loading-state" aria-label="Carregando dados do perfil">
      <v-skeleton-loader type="card, card, card" class="skeleton-content" />
    </div>

    <!-- Content -->
    <div v-else class="editor-content">
      <!-- Tabs de Navegação -->
      <v-tabs
        v-model="activeTab"
        color="primary"
        class="editor-tabs"
        aria-label="Seções do perfil"
      >
        <v-tab value="general">
          <v-icon start>mdi-information-outline</v-icon>
          Informações Gerais
        </v-tab>
        <v-tab value="screens">
          <v-icon start>mdi-monitor</v-icon>
          Telas e Permissões
          <v-chip size="x-small" class="ml-2" color="primary" variant="tonal">
            {{ totalSelectedScreens }}
          </v-chip>
        </v-tab>
        <v-tab value="process-types">
          <v-icon start>mdi-file-tree</v-icon>
          Tipos de Processo
          <v-chip size="x-small" class="ml-2" color="primary" variant="tonal">
            {{ processTypeSelections.length }}
          </v-chip>
        </v-tab>
      </v-tabs>

      <v-window v-model="activeTab" class="editor-window">
        <!-- Tab: Informações Gerais -->
        <v-window-item value="general">
          <div class="tab-content">
            <div class="section-card">
              <div class="section-header">
                <div class="section-icon" aria-hidden="true">
                  <v-icon size="24">mdi-badge-account</v-icon>
                </div>
                <div>
                  <h2 class="section-title">Informações do Perfil</h2>
                  <p class="section-description">Defina o nome e configurações básicas do perfil</p>
                </div>
              </div>

              <v-form ref="generalFormRef" class="section-content">
                <v-row>
                  <v-col cols="12" md="6">
                    <v-text-field
                      v-model="form.name"
                      label="Nome do Perfil"
                      placeholder="Ex.: Supervisor de Processos"
                      :rules="[v => !!v || 'O nome do perfil é obrigatório']"
                      variant="outlined"
                      density="comfortable"
                      prepend-inner-icon="mdi-shield-account"
                      required
                      aria-required="true"
                    />
                  </v-col>

                  <v-col cols="12" md="6">
                    <div class="switch-card">
                      <div class="switch-content">
                        <div class="switch-info">
                          <v-icon :color="form.isDefault ? 'warning' : 'grey'" size="24">
                            {{ form.isDefault ? 'mdi-star' : 'mdi-star-outline' }}
                          </v-icon>
                          <div>
                            <span class="switch-label">Perfil Padrão</span>
                            <span class="switch-hint">Aplicado automaticamente a novos usuários</span>
                          </div>
                        </div>
                        <v-switch
                          v-model="form.isDefault"
                          color="warning"
                          hide-details
                          inset
                        />
                      </div>
                    </div>
                  </v-col>

                  <v-col cols="12">
                    <v-textarea
                      v-model="form.description"
                      label="Descrição"
                      placeholder="Descreva quando este perfil deve ser utilizado..."
                      rows="3"
                      variant="outlined"
                      density="comfortable"
                      counter="500"
                      maxlength="500"
                    />
                  </v-col>
                </v-row>
              </v-form>
            </div>
          </div>
        </v-window-item>

        <!-- Tab: Telas e Permissões -->
        <v-window-item value="screens">
          <div class="tab-content">
            <div class="section-card">
              <div class="section-header">
                <div class="section-icon section-icon--blue" aria-hidden="true">
                  <v-icon size="24" color="white">mdi-view-grid</v-icon>
                </div>
                <div>
                  <h2 class="section-title">Permissões por Tela</h2>
                  <p class="section-description">Ative as ações desejadas em cada módulo do sistema</p>
                </div>
                <v-chip color="primary" variant="tonal" class="ml-auto">
                  {{ totalSelectedScreens }} permissão(ões) ativa(s)
                </v-chip>
              </div>

              <div class="permissions-grid">
                <div
                  v-for="screen in screenCatalog"
                  :key="screen.id"
                  class="permission-card"
                  :class="{ 'permission-card--active': hasAnyActionSelected(screen.id) }"
                >
                  <div class="permission-card__header">
                    <div class="permission-card__icon" :style="{ background: getScreenColor(screen.id) }">
                      <v-icon size="20" color="white">{{ screen.icon }}</v-icon>
                    </div>
                    <div class="permission-card__info">
                      <h3 class="permission-card__title">{{ screen.label }}</h3>
                      <span class="permission-card__count">
                        {{ selectedActionsCount(screen.id) }} de {{ screen.actions.length }} ações
                      </span>
                    </div>
                    <v-btn
                      size="small"
                      variant="text"
                      :color="hasAllActionsSelected(screen.id) ? 'primary' : 'grey'"
                      @click="toggleAllActions(screen.id)"
                    >
                      {{ hasAllActionsSelected(screen.id) ? 'Desmarcar' : 'Marcar' }} Todos
                    </v-btn>
                  </div>

                  <div class="permission-card__actions">
                    <label
                      v-for="action in screen.actions"
                      :key="`${screen.id}-${action.id}`"
                      class="action-checkbox"
                      :class="{ 'action-checkbox--checked': screenStates[screen.id]?.[action.id] }"
                    >
                      <input
                        type="checkbox"
                        :checked="screenStates[screen.id]?.[action.id]"
                        @change="toggleAction(screen.id, action.id)"
                        class="action-checkbox__input"
                      />
                      <span class="action-checkbox__box">
                        <v-icon v-if="screenStates[screen.id]?.[action.id]" size="14" color="white">mdi-check</v-icon>
                      </span>
                      <span class="action-checkbox__label">{{ action.label }}</span>
                    </label>
                  </div>

                  <!-- Seção especial para tipos de relatório -->
                  <div v-if="screen.id === 'reports' && screen.reportTypes && hasAnyActionSelected('reports')" class="report-types-section">
                    <div class="report-types-header">
                      <v-icon size="16" color="primary" class="mr-2">mdi-file-chart</v-icon>
                      <span class="report-types-title">Relatórios Disponíveis</span>
                      <v-chip size="x-small" color="primary" variant="tonal" class="ml-2">
                        {{ selectedReportTypesCount }} de {{ screen.reportTypes.length }}
                      </v-chip>
                      <v-btn
                        size="x-small"
                        variant="text"
                        :color="hasAllReportTypesSelected ? 'primary' : 'grey'"
                        @click="toggleAllReportTypes"
                        class="ml-auto"
                      >
                        {{ hasAllReportTypesSelected ? 'Desmarcar' : 'Marcar' }} Todos
                      </v-btn>
                    </div>
                    <div class="report-types-grid">
                      <label
                        v-for="reportType in screen.reportTypes"
                        :key="`report-${reportType.id}`"
                        class="report-type-checkbox"
                        :class="{ 'report-type-checkbox--checked': reportTypeStates[reportType.id] }"
                      >
                        <input
                          type="checkbox"
                          :checked="reportTypeStates[reportType.id]"
                          @change="toggleReportType(reportType.id)"
                          class="report-type-checkbox__input"
                        />
                        <span class="report-type-checkbox__box">
                          <v-icon v-if="reportTypeStates[reportType.id]" size="12" color="white">mdi-check</v-icon>
                        </span>
                        <v-icon size="16" :color="reportTypeStates[reportType.id] ? 'primary' : 'grey'" class="mr-1">{{ reportType.icon }}</v-icon>
                        <span class="report-type-checkbox__label">{{ reportType.label }}</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </v-window-item>

        <!-- Tab: Tipos de Processo -->
        <v-window-item value="process-types">
          <div class="tab-content">
            <div class="section-card">
              <div class="section-header">
                <div class="section-icon section-icon--green" aria-hidden="true">
                  <v-icon size="24" color="white">mdi-sitemap</v-icon>
                </div>
                <div>
                  <h2 class="section-title">Acesso a Tipos de Processo</h2>
                  <p class="section-description">Defina quais tipos de processo este perfil pode acessar</p>
                </div>
              </div>

              <div class="section-content">
                <!-- Info Card Personalizado -->
                <div class="info-card mb-6">
                  <div class="info-card__icon">
                    <v-icon size="20" color="white">mdi-lightbulb-on</v-icon>
                  </div>
                  <div class="info-card__content">
                    <span class="info-card__title">Como funciona?</span>
                    <span class="info-card__text">
                      Ao adicionar um tipo de processo, o perfil terá <strong>acesso completo</strong> para visualizar, criar e executar processos desse tipo.
                    </span>
                  </div>
                </div>

                <!-- Seletor de Tipos de Processo -->
                <div class="process-type-selector">
                  <label class="selector-label">
                    <v-icon size="18" class="mr-2">mdi-plus-circle-outline</v-icon>
                    Adicionar Tipos de Processo
                  </label>
                  <v-autocomplete
                    v-model="selectedProcessTypeIds"
                    :items="processTypeItems"
                    item-title="title"
                    item-value="value"
                    item-subtitle="subtitle"
                    placeholder="Buscar e selecionar tipos de processo..."
                    prepend-inner-icon="mdi-magnify"
                    variant="outlined"
                    density="comfortable"
                    multiple
                    chips
                    closable-chips
                    clearable
                    :menu-props="{ maxHeight: 300 }"
                    class="process-type-autocomplete"
                    hide-details
                  >
                    <template v-slot:chip="{ props, item }">
                      <v-chip
                        v-bind="props"
                        :color="item.value === '*' ? 'warning' : 'success'"
                        variant="flat"
                        size="small"
                        closable
                      >
                        <v-icon start size="14">
                          {{ item.value === '*' ? 'mdi-asterisk' : 'mdi-file-tree' }}
                        </v-icon>
                        {{ item.title }}
                      </v-chip>
                    </template>
                    <template v-slot:item="{ props, item }">
                      <v-list-item
                        v-bind="props"
                        :disabled="item.raw.disabled"
                      >
                        <template v-slot:prepend>
                          <v-icon :color="item.value === '*' ? 'warning' : 'success'" size="20">
                            {{ item.value === '*' ? 'mdi-asterisk' : 'mdi-file-tree' }}
                          </v-icon>
                        </template>
                      </v-list-item>
                    </template>
                  </v-autocomplete>
                </div>

                <!-- Lista de tipos selecionados -->
                <div v-if="processTypeSelections.length > 0" class="process-types-section">
                  <div class="process-types-header">
                    <div class="process-types-header__info">
                      <v-icon size="18" color="success" class="mr-2">mdi-check-circle</v-icon>
                      <span class="process-types-header__title">Tipos Selecionados</span>
                      <v-chip size="x-small" color="success" variant="tonal" class="ml-2">
                        {{ processTypeSelections.length }}
                      </v-chip>
                    </div>
                  </div>
                  <div class="process-types-grid">
                    <div
                      v-for="item in processTypeSelections"
                      :key="item.key"
                      class="process-type-card"
                      :class="{ 'process-type-card--all': item.processTypeId === '*' }"
                    >
                      <div class="process-type-card__icon" :class="{ 'icon--warning': item.processTypeId === '*' }">
                        <v-icon size="20" color="white">
                          {{ item.processTypeId === '*' ? 'mdi-asterisk' : 'mdi-file-tree' }}
                        </v-icon>
                      </div>
                      <div class="process-type-card__content">
                        <span class="process-type-card__name">{{ item.label }}</span>
                        <div class="process-type-card__badges">
                          <v-chip size="x-small" color="success" variant="flat">
                            <v-icon start size="10">mdi-eye</v-icon>
                            Ver
                          </v-chip>
                          <v-chip size="x-small" color="primary" variant="flat">
                            <v-icon start size="10">mdi-plus</v-icon>
                            Criar
                          </v-chip>
                          <v-chip size="x-small" color="info" variant="flat">
                            <v-icon start size="10">mdi-play</v-icon>
                            Executar
                          </v-chip>
                        </div>
                      </div>
                      <v-btn
                        icon
                        size="small"
                        variant="text"
                        color="error"
                        @click="removeProcessType(item.key)"
                        aria-label="Remover tipo de processo"
                        class="remove-btn"
                      >
                        <v-icon size="18">mdi-close</v-icon>
                      </v-btn>
                    </div>
                  </div>
                </div>

                <div v-else class="empty-process-types">
                  <v-icon size="48" color="grey-lighten-1">mdi-file-tree-outline</v-icon>
                  <p>Nenhum tipo de processo selecionado</p>
                  <span>Adicione tipos de processo para definir o acesso deste perfil</span>
                </div>
              </div>
            </div>
          </div>
        </v-window-item>
      </v-window>
    </div>

    <!-- Footer Fixo -->
    <div class="editor-footer">
      <div class="footer-content">
        <div class="footer-info">
          <v-icon size="18" class="mr-2">mdi-information-outline</v-icon>
          <span>As alterações só serão salvas ao clicar em "{{ isEditing ? 'Salvar Alterações' : 'Criar Perfil' }}"</span>
        </div>
        <div class="footer-actions">
          <v-btn variant="text" @click="goBack">Cancelar</v-btn>
          <v-btn
            color="primary"
            variant="elevated"
            :loading="saving"
            :disabled="!isFormValid"
            @click="handleSubmit"
          >
            <v-icon start>mdi-content-save</v-icon>
            {{ isEditing ? 'Salvar Alterações' : 'Criar Perfil' }}
          </v-btn>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, reactive, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useProfileStore } from '@/stores/profiles'
import { useProcessTypeStore } from '@/stores/processTypes'
import { SCREEN_CATALOG } from '@/constants/permissions'

const route = useRoute()
const router = useRouter()
const profileStore = useProfileStore()
const processTypeStore = useProcessTypeStore()

// Estado
const loading = ref(false)
const saving = ref(false)
const activeTab = ref('general')
const generalFormRef = ref(null)

const form = reactive({
  id: null,
  name: '',
  description: '',
  isDefault: false
})

const screenCatalog = SCREEN_CATALOG
const screenStates = reactive({})
const processTypeSelections = reactive([])
const reportTypeStates = reactive({})

// Computed
const isEditing = computed(() => !!route.params.id)
const processTypes = computed(() => processTypeStore.processTypes || [])

const processTypeItems = computed(() => {
  const selectedIds = new Set(processTypeSelections.map((item) => item.processTypeId))

  const items = [
    {
      value: '*',
      title: 'Todos os tipos (*)',
      subtitle: 'Aplica capacidades em todos os processos.'
    },
    ...processTypes.value.map((type) => ({
      value: type.id,
      title: type.name,
      subtitle: type.description || undefined
    }))
  ]

  return items.map((item) => ({
    ...item,
    disabled: selectedIds.has(item.value)
  }))
})

const processTypeLookup = computed(() => {
  const map = new Map()
  processTypeItems.value.forEach((item) => {
    map.set(item.value, item.title)
  })
  return map
})

const selectedProcessTypeIds = computed({
  get: () => processTypeSelections.map((item) => item.processTypeId),
  set: (ids) => {
    const currentIds = processTypeSelections.map((item) => item.processTypeId)
    ids.forEach((id) => {
      if (!currentIds.includes(id)) {
        addProcessTypeSelection(id)
      }
    })

    const allowed = new Set(ids)
    currentIds.forEach((id) => {
      if (!allowed.has(id)) {
        removeProcessTypeById(id)
      }
    })
  }
})

const totalSelectedScreens = computed(() =>
  screenCatalog.reduce((count, screen) => count + selectedActionsCount(screen.id), 0)
)

const isFormValid = computed(() => {
  return form.name?.trim()?.length >= 2
})

// Computed para tipos de relatório
const reportsScreen = computed(() => screenCatalog.find(s => s.id === 'reports'))

const selectedReportTypesCount = computed(() => {
  return Object.values(reportTypeStates).filter(Boolean).length
})

const hasAllReportTypesSelected = computed(() => {
  const reportTypes = reportsScreen.value?.reportTypes || []
  return reportTypes.length > 0 && reportTypes.every(rt => reportTypeStates[rt.id])
})

// Métodos
function resetScreenStates() {
  screenCatalog.forEach((screen) => {
    screenStates[screen.id] = {}
    screen.actions.forEach((action) => {
      screenStates[screen.id][action.id] = false
    })
  })
}

function resetReportTypeStates() {
  const reportTypes = reportsScreen.value?.reportTypes || []
  reportTypes.forEach((rt) => {
    reportTypeStates[rt.id] = false
  })
}

function toggleReportType(reportTypeId) {
  reportTypeStates[reportTypeId] = !reportTypeStates[reportTypeId]
}

function toggleAllReportTypes() {
  const reportTypes = reportsScreen.value?.reportTypes || []
  const allSelected = hasAllReportTypesSelected.value
  reportTypes.forEach((rt) => {
    reportTypeStates[rt.id] = !allSelected
  })
}

function selectedActionsCount(screenId) {
  return Object.values(screenStates[screenId] ?? {}).filter(Boolean).length
}

function hasAnyActionSelected(screenId) {
  return selectedActionsCount(screenId) > 0
}

function hasAllActionsSelected(screenId) {
  const screen = screenCatalog.find((s) => s.id === screenId)
  if (!screen) return false
  return screen.actions.every((action) => screenStates[screenId]?.[action.id])
}

function toggleAction(screenId, actionId) {
  if (!screenStates[screenId]) {
    screenStates[screenId] = {}
  }
  screenStates[screenId][actionId] = !screenStates[screenId][actionId]
}

function toggleAllActions(screenId) {
  const screen = screenCatalog.find((s) => s.id === screenId)
  if (!screen) return

  const allSelected = hasAllActionsSelected(screenId)
  screen.actions.forEach((action) => {
    screenStates[screenId][action.id] = !allSelected
  })
}

function getScreenColor(screenId) {
  const colors = {
    dashboard: '#3b82f6',
    processes: '#10b981',
    users: '#f59e0b',
    profiles: '#8b5cf6',
    sectors: '#06b6d4',
    companies: '#ec4899',
    process_types: '#14b8a6',
    settings: '#64748b',
    tasks: '#3b82f6',
    signatures: '#ef4444',
    reports: '#7c3aed'
  }
  return colors[screenId] || '#3b82f6'
}

function addProcessTypeSelection(processTypeId) {
  const normalizedId = processTypeId ?? '*'
  const exists = processTypeSelections.some((item) => item.processTypeId === normalizedId)
  if (exists) return

  const label = processTypeLookup.value.get(normalizedId) || 'Tipo desconhecido'

  processTypeSelections.push({
    key: crypto.randomUUID(),
    processTypeId: normalizedId,
    label,
    canView: true,
    canCreate: true,
    canExecute: true
  })
}

function removeProcessType(key) {
  const index = processTypeSelections.findIndex((item) => item.key === key)
  if (index !== -1) {
    processTypeSelections.splice(index, 1)
  }
}

function removeProcessTypeById(processTypeId) {
  const index = processTypeSelections.findIndex((item) => item.processTypeId === processTypeId)
  if (index !== -1) {
    processTypeSelections.splice(index, 1)
  }
}

function collectScreenPermissions() {
  const output = []

  screenCatalog.forEach((screen) => {
    screen.actions.forEach((action) => {
      if (screenStates[screen.id][action.id]) {
        output.push({
          resource: screen.id,
          action: action.id,
          scope: null
        })
      }
    })
  })

  // Adicionar permissões de tipos de relatório
  const reportTypes = reportsScreen.value?.reportTypes || []
  reportTypes.forEach((rt) => {
    if (reportTypeStates[rt.id]) {
      output.push({
        resource: 'reports',
        action: `view_${rt.id}`,
        scope: null
      })
    }
  })

  return output
}

async function loadProfile(profileId) {
  loading.value = true
  try {
    const profile = await profileStore.fetchProfile(profileId)

    form.id = profile.id
    form.name = profile.name || ''
    form.description = profile.description || ''
    form.isDefault = Boolean(profile.isDefault)

    // Carregar permissões de tela
    const existingPermissions = Array.isArray(profile.permissions) ? profile.permissions : []
    existingPermissions.forEach((permission) => {
      const screen = screenCatalog.find((item) => item.id === permission.resource)
      const actionExists = screen?.actions.some((action) => action.id === permission.action)

      if (screen && actionExists) {
        screenStates[screen.id][permission.action] = true
      }

      // Carregar permissões de tipos de relatório (formato: view_dashboard, view_performance, etc.)
      if (permission.resource === 'reports' && permission.action?.startsWith('view_')) {
        const reportTypeId = permission.action.replace('view_', '')
        const reportTypes = reportsScreen.value?.reportTypes || []
        if (reportTypes.some(rt => rt.id === reportTypeId)) {
          reportTypeStates[reportTypeId] = true
        }
      }
    })

    // Carregar tipos de processo
    const existingProcessTypes = Array.isArray(profile.processTypePermissions)
      ? profile.processTypePermissions
      : []

    existingProcessTypes.forEach((item) => {
      addProcessTypeSelection(item.processTypeId || '*')
    })
  } catch (error) {
    window.showSnackbar?.('Erro ao carregar dados do perfil.', 'error')
    router.push('/perfis')
  } finally {
    loading.value = false
  }
}

async function handleSubmit() {
  if (!form.name?.trim()) {
    window.showSnackbar?.('Informe o nome do perfil.', 'warning')
    activeTab.value = 'general'
    return
  }

  saving.value = true
  try {
    const payload = {
      name: form.name.trim(),
      description: form.description?.trim() || null,
      isDefault: Boolean(form.isDefault),
      permissions: collectScreenPermissions(),
      processTypes: processTypeSelections.map((item) => ({
        processTypeId: item.processTypeId || '*',
        canView: true,
        canCreate: true,
        canExecute: true
      }))
    }

    if (isEditing.value) {
      await profileStore.updateProfile(form.id, payload)
      window.showSnackbar?.('Perfil atualizado com sucesso!', 'success')
    } else {
      await profileStore.createProfile(payload)
      window.showSnackbar?.('Perfil criado com sucesso!', 'success')
    }

    router.push('/perfis')
  } catch (error) {
    const message = error.response?.data?.message || error.message || 'Erro ao salvar perfil.'
    window.showSnackbar?.(message, 'error')
  } finally {
    saving.value = false
  }
}

function goBack() {
  router.push('/perfis')
}

// Inicialização
onMounted(async () => {
  resetScreenStates()
  resetReportTypeStates()

  await processTypeStore.fetchProcessTypes()

  if (isEditing.value && route.params.id) {
    await loadProfile(route.params.id)
  }
})
</script>

<style scoped>
.profile-editor-page {
  min-height: 100vh;
  background: var(--color-neutral-50);
  padding-bottom: 80px;
}

/* Header */
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 28px;
  background: linear-gradient(135deg, var(--color-primary-500), var(--color-primary-600));
  box-shadow: 0 4px 20px rgba(59, 130, 246, 0.25);
}

.header-content {
  display: flex;
  align-items: center;
  gap: 16px;
}

.back-btn {
  margin-right: 8px;
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

.header-actions {
  display: flex;
  gap: 12px;
}

.action-btn {
  text-transform: none;
  font-weight: 500;
  border-radius: 10px;
}

.action-btn--primary {
  color: var(--color-primary-600) !important;
  background: white !important;
}

/* Loading */
.loading-state {
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
}

.skeleton-content {
  border-radius: 16px;
}

/* Editor Content */
.editor-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
}

/* Tabs */
.editor-tabs {
  background: var(--color-surface);
  border-radius: 12px 12px 0 0;
  border: 1px solid var(--color-surface-border);
  border-bottom: none;
}

.editor-tabs :deep(.v-tab) {
  text-transform: none;
  font-weight: 500;
  letter-spacing: 0;
}

.editor-window {
  background: var(--color-surface);
  border: 1px solid var(--color-surface-border);
  border-top: none;
  border-radius: 0 0 12px 12px;
}

/* Tab Content */
.tab-content {
  padding: 24px;
}

/* Section Card */
.section-card {
  background: white;
  border-radius: 16px;
  border: 1px solid var(--color-surface-border);
  overflow: hidden;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px 24px;
  background: linear-gradient(135deg, var(--color-neutral-50) 0%, transparent 100%);
  border-bottom: 1px solid var(--color-surface-border);
}

.section-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: linear-gradient(135deg, var(--color-primary-100), var(--color-primary-50));
  color: var(--color-primary-600);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.section-icon--blue {
  background: linear-gradient(135deg, #3b82f6, #2563eb);
}

.section-icon--green {
  background: linear-gradient(135deg, #10b981, #059669);
}

.section-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--color-neutral-800);
  margin: 0 0 4px 0;
}

.section-description {
  font-size: 0.875rem;
  color: var(--color-neutral-500);
  margin: 0;
}

.section-content {
  padding: 24px;
}

/* Switch Card */
.switch-card {
  background: var(--color-neutral-50);
  border: 1px solid var(--color-surface-border);
  border-radius: 12px;
  padding: 16px;
  height: 100%;
}

.switch-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.switch-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.switch-label {
  display: block;
  font-weight: 600;
  color: var(--color-neutral-800);
}

.switch-hint {
  display: block;
  font-size: 0.75rem;
  color: var(--color-neutral-500);
}

/* Permissions Grid */
.permissions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 16px;
  padding: 24px;
}

.permission-card {
  background: white;
  border: 1px solid var(--color-surface-border);
  border-radius: 12px;
  overflow: hidden;
  transition: all 0.2s ease;
}

.permission-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.permission-card--active {
  border-color: var(--color-primary-300);
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.02) 0%, white 100%);
}

.permission-card__header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: var(--color-neutral-50);
  border-bottom: 1px solid var(--color-surface-border);
}

.permission-card__icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.permission-card__info {
  flex: 1;
  min-width: 0;
}

.permission-card__title {
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--color-neutral-800);
  margin: 0;
}

.permission-card__count {
  font-size: 0.75rem;
  color: var(--color-neutral-500);
}

.permission-card__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 16px;
}

/* Action Checkbox */
.action-checkbox {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: var(--color-neutral-50);
  border: 1px solid var(--color-surface-border);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s ease;
  user-select: none;
}

.action-checkbox:hover {
  background: var(--color-neutral-100);
}

.action-checkbox--checked {
  background: var(--color-primary-50);
  border-color: var(--color-primary-300);
}

.action-checkbox__input {
  display: none;
}

.action-checkbox__box {
  width: 18px;
  height: 18px;
  border: 2px solid var(--color-neutral-300);
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
  flex-shrink: 0;
}

.action-checkbox--checked .action-checkbox__box {
  background: var(--color-primary-500);
  border-color: var(--color-primary-500);
}

.action-checkbox__label {
  font-size: 0.8125rem;
  color: var(--color-neutral-700);
}

/* Report Types Section */
.report-types-section {
  padding: 16px;
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.04), rgba(59, 130, 246, 0.02));
  border-top: 1px solid var(--color-surface-border);
}

.report-types-header {
  display: flex;
  align-items: center;
  margin-bottom: 12px;
}

.report-types-title {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--color-neutral-700);
}

.report-types-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 8px;
}

.report-type-checkbox {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 12px;
  background: white;
  border: 1px solid var(--color-surface-border);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s ease;
  user-select: none;
}

.report-type-checkbox:hover {
  background: var(--color-neutral-50);
  border-color: var(--color-primary-200);
}

.report-type-checkbox--checked {
  background: var(--color-primary-50);
  border-color: var(--color-primary-300);
}

.report-type-checkbox__input {
  display: none;
}

.report-type-checkbox__box {
  width: 16px;
  height: 16px;
  border: 2px solid var(--color-neutral-300);
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
  flex-shrink: 0;
}

.report-type-checkbox--checked .report-type-checkbox__box {
  background: var(--color-primary-500);
  border-color: var(--color-primary-500);
}

.report-type-checkbox__label {
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--color-neutral-700);
}

.report-type-checkbox--checked .report-type-checkbox__label {
  color: var(--color-primary-700);
}

/* Process Types Section */
.process-types-section {
  margin-top: 8px;
}

.process-types-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--color-surface-border);
}

.process-types-header__info {
  display: flex;
  align-items: center;
}

.process-types-header__title {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-neutral-700);
}

/* Process Types Grid */
.process-types-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 12px;
}

.process-type-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 18px;
  background: white;
  border: 1px solid var(--color-surface-border);
  border-radius: 12px;
  transition: all 0.2s ease;
}

.process-type-card:hover {
  border-color: var(--color-primary-200);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.process-type-card--all {
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.06), rgba(245, 158, 11, 0.02));
  border-color: rgba(245, 158, 11, 0.3);
}

.process-type-card__icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: linear-gradient(135deg, #10b981, #059669);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.process-type-card__icon.icon--warning {
  background: linear-gradient(135deg, #f59e0b, #d97706);
}

.process-type-card__content {
  flex: 1;
  min-width: 0;
}

.process-type-card__name {
  display: block;
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--color-neutral-800);
  margin-bottom: 8px;
}

.process-type-card__badges {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.process-type-card__badges .v-chip {
  font-size: 0.6875rem !important;
  font-weight: 500;
}

.process-type-card .remove-btn {
  opacity: 0.5;
  transition: opacity 0.2s;
}

.process-type-card:hover .remove-btn {
  opacity: 1;
}

/* Info Card */
.info-card {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 16px 20px;
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.08), rgba(16, 185, 129, 0.04));
  border: 1px solid rgba(16, 185, 129, 0.2);
  border-radius: 12px;
}

.info-card__icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: linear-gradient(135deg, #10b981, #059669);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.info-card__content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.info-card__title {
  font-size: 0.875rem;
  font-weight: 600;
  color: #059669;
}

.info-card__text {
  font-size: 0.8125rem;
  color: var(--color-neutral-600);
  line-height: 1.5;
}

.info-card__text strong {
  color: #059669;
  font-weight: 600;
}

/* Process Type Selector */
.process-type-selector {
  margin-bottom: 24px;
}

.selector-label {
  display: flex;
  align-items: center;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--color-neutral-600);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 12px;
}

.process-type-autocomplete :deep(.v-field) {
  border-radius: 12px;
  background: var(--color-neutral-50);
}

.process-type-autocomplete :deep(.v-field--focused) {
  background: white;
}

.process-type-autocomplete :deep(.v-chip) {
  margin: 4px 4px 4px 0;
}

/* Empty Process Types */
.empty-process-types {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  text-align: center;
  background: var(--color-neutral-50);
  border-radius: 12px;
  border: 1px dashed var(--color-surface-border);
}

.empty-process-types p {
  font-weight: 600;
  color: var(--color-neutral-600);
  margin: 16px 0 4px 0;
}

.empty-process-types span {
  font-size: 0.875rem;
  color: var(--color-neutral-500);
}

/* Footer */
.editor-footer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: white;
  border-top: 1px solid var(--color-surface-border);
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.08);
  z-index: 100;
}

.footer-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 16px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.footer-info {
  display: flex;
  align-items: center;
  font-size: 0.875rem;
  color: var(--color-neutral-500);
}

.footer-actions {
  display: flex;
  gap: 12px;
}

/* Responsive */
@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }

  .header-actions {
    width: 100%;
    justify-content: stretch;
  }

  .header-actions .action-btn {
    flex: 1;
  }

  .permissions-grid {
    grid-template-columns: 1fr;
  }

  .process-types-grid {
    grid-template-columns: 1fr;
  }

  .footer-content {
    flex-direction: column;
    gap: 12px;
  }

  .footer-info {
    display: none;
  }

  .footer-actions {
    width: 100%;
  }

  .footer-actions .v-btn {
    flex: 1;
  }
}
</style>
