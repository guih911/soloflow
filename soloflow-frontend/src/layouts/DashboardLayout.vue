<template>
  <v-app class="app-container">
    <!-- Sidebar Moderna -->
    <v-navigation-drawer
      v-model="sidebarOpen"
      :rail="!sidebarExpanded"
      :permanent="!isMobile"
      :temporary="isMobile"
      :width="260"
      rail-width="72"
      class="sidebar"
    >
      <!-- Logo Section -->
      <div class="sidebar-header">
        <div class="logo-wrapper" @click="sidebarExpanded = !sidebarExpanded">
          <img src="/logo.png" alt="SoloFlow" class="logo-img" :class="{ 'logo-collapsed': !sidebarExpanded }" />
        </div>
      </div>

      <v-divider class="my-2 mx-3" />

      <!-- Navigation -->
      <v-list nav density="compact" class="nav-list">
        <!-- Main Navigation -->
        <template v-for="item in mainNavItems" :key="item.route">
          <v-tooltip
            v-if="canAccess(item.permission)"
            :disabled="sidebarExpanded"
            location="right"
            :text="item.title"
          >
            <template #activator="{ props }">
              <v-list-item
                v-bind="props"
                :to="{ name: item.route }"
                :exact="item.exact"
                class="nav-item"
                rounded="lg"
              >
                <template #prepend>
                  <div class="nav-icon" :class="{ 'nav-icon-active': isActiveRoute(item.route) }">
                    <v-icon :icon="item.icon" size="20" />
                  </div>
                </template>
                <v-list-item-title class="nav-title">{{ item.title }}</v-list-item-title>
                <template #append v-if="sidebarExpanded && item.badge && item.badge() > 0">
                  <v-chip size="x-small" color="warning" variant="flat" class="nav-badge">
                    {{ item.badge() }}
                  </v-chip>
                </template>
              </v-list-item>
            </template>
          </v-tooltip>
        </template>

        <!-- Settings Section -->
        <template v-if="hasAnyAdminPermission">
          <div v-if="sidebarExpanded" class="nav-section-header">
            <span>Configurações</span>
          </div>
          <v-divider v-else class="my-3 mx-3" />

          <template v-for="item in settingsNavItems" :key="item.route">
            <v-tooltip
              v-if="canAccess(item.permission)"
              :disabled="sidebarExpanded"
              location="right"
              :text="item.title"
            >
              <template #activator="{ props }">
                <v-list-item
                  v-bind="props"
                  :to="{ name: item.route }"
                  class="nav-item"
                  rounded="lg"
                >
                  <template #prepend>
                    <div class="nav-icon" :class="{ 'nav-icon-active': isActiveRoute(item.route) }">
                      <v-icon :icon="item.icon" size="20" />
                    </div>
                  </template>
                  <v-list-item-title class="nav-title">{{ item.title }}</v-list-item-title>
                </v-list-item>
              </template>
            </v-tooltip>
          </template>
        </template>
      </v-list>

      <!-- User Section (Bottom) -->
      <template #append>
        <div class="sidebar-footer">
          <v-divider class="mb-3" />

          <!-- Company Selector -->
          <v-menu v-if="companies.length > 1" location="top">
            <template #activator="{ props }">
              <div v-bind="props" class="company-selector" :class="{ 'company-selector-collapsed': !sidebarExpanded }">
                <v-avatar size="32" color="primary-lighten-4" class="company-avatar">
                  <v-icon size="16" color="primary">mdi-domain</v-icon>
                </v-avatar>
                <div v-if="sidebarExpanded" class="company-info">
                  <span class="company-name">{{ currentCompany?.name }}</span>
                  <span class="company-role">{{ getRoleText(currentCompany?.role) }}</span>
                </div>
                <v-icon v-if="sidebarExpanded" size="16" class="company-chevron">mdi-unfold-more-horizontal</v-icon>
              </div>
            </template>
            <v-list min-width="240" class="company-menu">
              <v-list-subheader class="text-xs font-medium text-slate-500">
                TROCAR EMPRESA
              </v-list-subheader>
              <v-list-item
                v-for="company in companies"
                :key="company.companyId"
                @click="switchCompany(company.companyId)"
                :active="company.companyId === currentCompany?.companyId"
                rounded="lg"
                class="mx-2"
              >
                <template #prepend>
                  <v-avatar size="32" :color="company.companyId === currentCompany?.companyId ? 'primary' : 'grey-lighten-3'">
                    <v-icon size="16" :color="company.companyId === currentCompany?.companyId ? 'white' : 'grey'">
                      mdi-domain
                    </v-icon>
                  </v-avatar>
                </template>
                <v-list-item-title class="text-sm font-medium">{{ company.name }}</v-list-item-title>
                <v-list-item-subtitle class="text-xs">{{ getRoleText(company.role) }}</v-list-item-subtitle>
                <template #append v-if="company.companyId === currentCompany?.companyId">
                  <v-icon size="16" color="primary">mdi-check</v-icon>
                </template>
              </v-list-item>
            </v-list>
          </v-menu>

          <!-- User Menu -->
          <v-menu location="top">
            <template #activator="{ props }">
              <div v-bind="props" class="user-menu-trigger" :class="{ 'user-menu-collapsed': !sidebarExpanded }">
                <v-avatar size="36" color="primary" class="user-avatar">
                  <span class="text-white text-sm font-semibold">{{ getUserInitials(user?.name) }}</span>
                </v-avatar>
                <div v-if="sidebarExpanded" class="user-info">
                  <span class="user-name">{{ user?.name }}</span>
                  <span class="user-email">{{ user?.email }}</span>
                </div>
                <v-icon v-if="sidebarExpanded" size="16" class="ml-auto text-slate-400">mdi-chevron-up</v-icon>
              </div>
            </template>
            <v-list min-width="240" class="user-menu">
              <!-- User Info Header -->
              <div class="user-menu-header">
                <v-avatar size="40" color="primary">
                  <span class="text-white font-semibold">{{ getUserInitials(user?.name) }}</span>
                </v-avatar>
                <div class="user-menu-info">
                  <span class="user-menu-name">{{ user?.name }}</span>
                  <span class="user-menu-email">{{ user?.email }}</span>
                </div>
              </div>

              <v-divider class="my-2" />

              <v-list-item @click="goToProfile" rounded="lg" class="mx-2">
                <template #prepend>
                  <v-icon size="18" color="secondary">mdi-account-circle-outline</v-icon>
                </template>
                <v-list-item-title class="text-sm">Meu Perfil</v-list-item-title>
              </v-list-item>

              <v-list-item v-if="user?.role === 'ADMIN'" @click="goToSettings" rounded="lg" class="mx-2">
                <template #prepend>
                  <v-icon size="18" color="secondary">mdi-cog-outline</v-icon>
                </template>
                <v-list-item-title class="text-sm">Configurações</v-list-item-title>
              </v-list-item>

              <v-divider class="my-2" />

              <v-list-item @click="handleLogout" rounded="lg" class="mx-2 logout-item">
                <template #prepend>
                  <v-icon size="18" color="error">mdi-logout</v-icon>
                </template>
                <v-list-item-title class="text-sm text-error">Sair</v-list-item-title>
              </v-list-item>
            </v-list>
          </v-menu>
        </div>
      </template>
    </v-navigation-drawer>

    <!-- Header Moderno -->
    <v-app-bar flat height="64" class="app-header">
      <!-- Mobile menu toggle -->
      <v-app-bar-nav-icon
        v-if="isMobile"
        @click="sidebarOpen = !sidebarOpen"
        class="ml-2"
      />

      <!-- Page Title (mobile) -->
      <div v-if="isMobile" class="d-flex align-center">
        <img src="/logo.png" alt="SoloFlow" style="height: 24px;" />
      </div>

      <v-spacer />

      <!-- Search (Desktop) -->
      <div v-if="!isMobile" class="header-search" ref="searchContainerRef">
        <v-text-field
          v-model="searchQuery"
          placeholder="Buscar processos, tarefas..."
          prepend-inner-icon="mdi-magnify"
          variant="solo"
          density="compact"
          hide-details
          flat
          class="search-input"
          bg-color="surface-variant"
          @focus="onSearchFocus"
          @keyup.enter="handleSearch"
          @keydown.down.prevent="navigateResults(1)"
          @keydown.up.prevent="navigateResults(-1)"
          @keydown.escape="showSearchResults = false"
        />
        <!-- Search Results Dropdown -->
        <div v-if="showSearchResults && searchQuery.length >= 2" class="search-dropdown">
          <div v-if="searchLoading" class="search-loading">
            <v-progress-circular size="20" width="2" indeterminate color="primary" />
            <span>Buscando...</span>
          </div>
          <template v-else-if="searchResults.length > 0">
            <div v-if="processResults.length > 0" class="search-section">
              <div class="search-section-title">
                <v-icon size="14">mdi-folder-outline</v-icon>
                Processos
              </div>
              <div
                v-for="(item, idx) in processResults"
                :key="'p-' + item.id"
                class="search-result-item"
                :class="{ 'search-result-active': selectedResultIndex === idx }"
                @click="goToProcess(item)"
                @mouseenter="selectedResultIndex = idx"
              >
                <div class="result-icon" :class="'result-icon--' + getResultStatusColor(item.status)">
                  <v-icon size="16">mdi-file-document-outline</v-icon>
                </div>
                <div class="result-info">
                  <span class="result-title">{{ item.title || item.processType?.name }}</span>
                  <span class="result-meta">{{ item.code }} &middot; {{ getStatusText(item.status) }}</span>
                </div>
              </div>
            </div>
            <div v-if="taskResults.length > 0" class="search-section">
              <div class="search-section-title">
                <v-icon size="14">mdi-checkbox-marked-circle-outline</v-icon>
                Tarefas
              </div>
              <div
                v-for="(item, idx) in taskResults"
                :key="'t-' + item.id"
                class="search-result-item"
                :class="{ 'search-result-active': selectedResultIndex === (processResults.length + idx) }"
                @click="goToTask(item)"
                @mouseenter="selectedResultIndex = processResults.length + idx"
              >
                <div class="result-icon result-icon--task">
                  <v-icon size="16">mdi-checkbox-marked-circle-outline</v-icon>
                </div>
                <div class="result-info">
                  <span class="result-title">{{ item.step?.name || 'Tarefa' }}</span>
                  <span class="result-meta">{{ item.process?.code || item.processCode }} &middot; {{ item.process?.processType?.name || '' }}</span>
                </div>
              </div>
            </div>
          </template>
          <div v-else class="search-empty">
            <v-icon size="20" color="grey">mdi-magnify</v-icon>
            <span>Nenhum resultado para "{{ searchQuery }}"</span>
          </div>
          <div class="search-footer" @click="handleSearch">
            <v-icon size="14">mdi-arrow-right</v-icon>
            <span>Ver todos os resultados para "{{ searchQuery }}"</span>
          </div>
        </div>
      </div>

      <v-spacer />

      <!-- Header Actions -->
      <div class="header-actions">
        <!-- Notifications -->
        <NotificationMenu @show-modal="showNotifications" />

        <!-- Quick Create -->
        <v-btn
          color="primary"
          variant="flat"
          class="create-btn"
          :to="{ name: 'Processos' }"
        >
          <v-icon start size="18">mdi-plus</v-icon>
          <span class="d-none d-sm-inline">Novo</span>
        </v-btn>
      </div>
    </v-app-bar>

    <!-- Main Content -->
    <v-main class="main-content">
      <div class="content-wrapper">
        <router-view />
      </div>
    </v-main>

    <!-- Snackbar Global -->
    <v-snackbar
      v-model="snackbar.show"
      :color="snackbar.color"
      :timeout="3000"
      location="bottom right"
      rounded="lg"
    >
      <div class="d-flex align-center">
        <v-icon v-if="snackbar.color === 'success'" class="mr-2">mdi-check-circle</v-icon>
        <v-icon v-else-if="snackbar.color === 'error'" class="mr-2">mdi-alert-circle</v-icon>
        <v-icon v-else-if="snackbar.color === 'warning'" class="mr-2">mdi-alert</v-icon>
        <v-icon v-else class="mr-2">mdi-information</v-icon>
        {{ snackbar.message }}
      </div>
      <template #actions>
        <v-btn variant="text" size="small" @click="snackbar.show = false">
          Fechar
        </v-btn>
      </template>
    </v-snackbar>

    <!-- Notifications Dialog -->
    <v-dialog v-model="notificationsDialog" max-width="480">
      <v-card class="notifications-dialog">
        <v-card-title class="d-flex align-center pa-4">
          <v-icon color="primary" class="mr-2">mdi-bell-outline</v-icon>
          <span class="text-h6 font-weight-semibold">Notificações</span>
          <v-spacer />
          <v-btn
            v-if="unreadNotifications > 0"
            variant="text"
            size="small"
            color="primary"
            @click="markAllNotificationsAsRead"
          >
            Marcar todas
          </v-btn>
          <v-btn icon variant="text" size="small" @click="notificationsDialog = false">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-card-title>

        <v-divider />

        <v-card-text class="pa-0">
          <div v-if="notificationsList.length === 0" class="empty-state py-12">
            <div class="empty-icon">
              <v-icon size="40">mdi-bell-off-outline</v-icon>
            </div>
            <p class="empty-title">Nenhuma notificação</p>
            <p class="empty-description">Você está em dia com todas as suas tarefas!</p>
          </div>

          <v-list v-else lines="two" class="py-0">
            <v-list-item
              v-for="notification in notificationsList"
              :key="notification.id"
              @click="openNotification(notification)"
              class="notification-item"
              :class="{ 'notification-unread': !isRead(notification.id) }"
            >
              <template #prepend>
                <v-avatar :color="isRead(notification.id) ? 'grey-lighten-3' : (notification.color || 'primary')" size="40">
                  <v-icon :color="isRead(notification.id) ? 'grey' : 'white'" size="20">
                    {{ notification.icon || 'mdi-bell' }}
                  </v-icon>
                </v-avatar>
              </template>
              <v-list-item-title class="text-sm font-medium">{{ notification.title }}</v-list-item-title>
              <v-list-item-subtitle class="text-xs">{{ notification.message }}</v-list-item-subtitle>
              <template #append>
                <div v-if="!isRead(notification.id)" class="notification-dot"></div>
              </template>
            </v-list-item>
          </v-list>
        </v-card-text>
      </v-card>
    </v-dialog>
  </v-app>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useDisplay } from 'vuetify'
import { useAuthStore } from '@/stores/auth'
import { useProcessStore } from '@/stores/processes'
import { useNotificationsStore } from '@/stores/notifications'
import NotificationMenu from '@/components/NotificationMenu.vue'

const { mobile } = useDisplay()
const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const processStore = useProcessStore()
const notificationsStore = useNotificationsStore()

// State
const sidebarOpen = ref(true)
const sidebarExpanded = ref(true)
const searchQuery = ref('')
const showSearchResults = ref(false)
const searchLoading = ref(false)
const selectedResultIndex = ref(-1)
const searchContainerRef = ref(null)
const notificationsDialog = ref(false)

const snackbar = reactive({
  show: false,
  message: '',
  color: 'success'
})

// Computed
const isMobile = computed(() => mobile.value)
const user = computed(() => authStore.user)
const currentCompany = computed(() => authStore.activeCompany)
const companies = computed(() => authStore.companies)
const pendingTasks = computed(() => processStore.myTasks?.length || 0)
const pendingSignatures = computed(() => {
  if (!processStore.myTasks) return 0
  return processStore.myTasks.filter(task => {
    if (!task.hasValidSignatureRequirements) return false
    const hasPdfAttachments = task.attachments?.some(att =>
      att.mimeType === 'application/pdf' && !att.isSigned
    )
    return hasPdfAttachments
  }).length
})

const notificationsList = computed(() => notificationsStore.items || [])
const unreadNotifications = computed(() => notificationsStore.unreadCount || 0)
const isRead = (id) => notificationsStore.isRead(id)

const hasAnyAdminPermission = computed(() => {
  return authStore.hasPermission('process_types', 'manage') ||
         authStore.hasPermission('profiles', 'manage') ||
         authStore.hasPermission('sectors', 'manage') ||
         authStore.hasPermission('users', 'manage') ||
         authStore.hasPermission('companies', 'manage') ||
         authStore.hasPermission('settings', 'manage')
})

// Navigation Items
const mainNavItems = computed(() => [
  {
    title: 'Dashboard',
    icon: 'mdi-view-dashboard-outline',
    route: 'Painel',
    exact: true,
    permission: { resource: 'dashboard', action: 'view' }
  },
  {
    title: 'Criar Processo',
    icon: 'mdi-plus-circle-outline',
    route: 'Processos',
    permission: { resource: 'processes', action: 'create' }
  },
  {
    title: 'Gerenciar Processos',
    icon: 'mdi-clipboard-list-outline',
    route: 'GerenciarProcessos',
    permission: { resource: 'processes', action: 'manage' }
  },
  {
    title: 'Minhas Tarefas',
    icon: 'mdi-checkbox-marked-circle-outline',
    route: 'MinhasTarefas',
    permission: { resource: 'tasks', action: 'view' },
    badge: () => pendingTasks.value
  },
  {
    title: 'Meus Processos',
    icon: 'mdi-folder-account-outline',
    route: 'MeusProcessos',
    permission: { resource: 'processes', action: 'view' }
  },
  {
    title: 'Assinaturas',
    icon: 'mdi-draw-pen',
    route: 'AssinaturasPendentes',
    permission: null, // Available to all authenticated users
    badge: () => pendingSignatures.value
  }
])

const settingsNavItems = computed(() => [
  {
    title: 'Tipos de Processo',
    icon: 'mdi-file-cog-outline',
    route: 'TiposDeProcesso',
    permission: { resource: 'process_types', action: 'manage' }
  },
  {
    title: 'Setores',
    icon: 'mdi-office-building-outline',
    route: 'Setores',
    permission: { resource: 'sectors', action: 'manage' }
  },
  {
    title: 'Usuários',
    icon: 'mdi-account-group-outline',
    route: 'Usuarios',
    permission: { resource: 'users', action: 'manage' }
  },
  {
    title: 'Perfis',
    icon: 'mdi-shield-account-outline',
    route: 'Perfis',
    permission: { resource: 'profiles', action: 'manage' }
  },
  {
    title: 'Empresas',
    icon: 'mdi-domain',
    route: 'Empresas',
    permission: { resource: 'companies', action: 'manage' }
  }
])

// Methods
function canAccess(permission) {
  if (!permission) return true
  return authStore.canAccessRoute({ permissions: permission })
}

function isActiveRoute(routeName) {
  return route.name === routeName
}

function getUserInitials(name) {
  if (!name) return 'U'
  return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
}

function getRoleText(role) {
  const roles = { ADMIN: 'Administrador', MANAGER: 'Gerente', USER: 'Usuário' }
  return roles[role] || role
}

function showNotifications() {
  notificationsDialog.value = true
}

async function markAllNotificationsAsRead() {
  try {
    await notificationsStore.markAllAsRead()
  } catch (e) {
    console.error('Erro ao marcar notificações:', e)
  }
}

async function openNotification(notification) {
  try {
    if (!isRead(notification.id)) {
      await notificationsStore.markAsRead(notification.id)
    }
    const url = notification.actionUrl || notification.link
    if (url) {
      router.push(url)
      notificationsDialog.value = false
    }
  } catch (e) {
    console.error('Erro ao abrir notificação:', e)
  }
}

function goToProfile() {
  router.push({ name: 'MeuPerfil' })
}

function goToSettings() {
  router.push({ name: 'Configuracoes' })
}

async function switchCompany(companyId) {
  try {
    await authStore.switchCompany(companyId)
  } catch (error) {
    console.error('Erro ao trocar empresa:', error)
  }
}

async function handleLogout() {
  try {
    await authStore.logout()
    router.push('/entrar')
  } catch (error) {
    localStorage.clear()
    sessionStorage.clear()
    router.push('/entrar')
  }
}

// Search
const searchResults = computed(() => [...processResults.value, ...taskResults.value])

const processResults = computed(() => {
  if (!searchQuery.value || searchQuery.value.length < 2) return []
  const query = searchQuery.value.toLowerCase()
  return (processStore.processes || [])
    .filter(p => {
      const title = (p.title || '').toLowerCase()
      const code = (p.code || '').toLowerCase()
      const typeName = (p.processType?.name || '').toLowerCase()
      return title.includes(query) || code.includes(query) || typeName.includes(query)
    })
    .slice(0, 5)
})

const taskResults = computed(() => {
  if (!searchQuery.value || searchQuery.value.length < 2) return []
  const query = searchQuery.value.toLowerCase()
  return (processStore.myTasks || [])
    .filter(t => {
      const stepName = (t.step?.name || '').toLowerCase()
      const processCode = (t.process?.code || t.processCode || '').toLowerCase()
      const processTypeName = (t.process?.processType?.name || '').toLowerCase()
      return stepName.includes(query) || processCode.includes(query) || processTypeName.includes(query)
    })
    .slice(0, 5)
})

function getStatusText(status) {
  const texts = {
    DRAFT: 'Rascunho',
    IN_PROGRESS: 'Em Andamento',
    COMPLETED: 'Concluído',
    CANCELLED: 'Cancelado',
    REJECTED: 'Rejeitado'
  }
  return texts[status] || status
}

function getResultStatusColor(status) {
  const colors = {
    IN_PROGRESS: 'info',
    COMPLETED: 'success',
    CANCELLED: 'error',
    REJECTED: 'error'
  }
  return colors[status] || 'grey'
}

async function onSearchFocus() {
  if (!processStore.processes?.length) {
    searchLoading.value = true
    try {
      await processStore.fetchProcesses()
    } catch (e) { /* silent */ }
    searchLoading.value = false
  }
  if (!processStore.myTasks?.length) {
    try {
      await processStore.fetchMyTasks()
    } catch (e) { /* silent */ }
  }
  if (searchQuery.value.length >= 2) {
    showSearchResults.value = true
  }
}

function navigateResults(direction) {
  const total = searchResults.value.length
  if (total === 0) return
  selectedResultIndex.value = (selectedResultIndex.value + direction + total) % total
}

function goToProcess(item) {
  showSearchResults.value = false
  searchQuery.value = ''
  router.push({ name: 'DetalhesDoProcesso', params: { id: item.id } })
}

function goToTask(item) {
  showSearchResults.value = false
  searchQuery.value = ''
  const processId = item.process?.id || item.processId
  if (processId) {
    router.push({ name: 'DetalhesDoProcesso', params: { id: processId } })
  } else {
    router.push({ name: 'MinhasTarefas' })
  }
}

function handleSearch() {
  showSearchResults.value = false
  if (searchQuery.value.trim()) {
    if (selectedResultIndex.value >= 0 && selectedResultIndex.value < searchResults.value.length) {
      const selected = selectedResultIndex.value
      if (selected < processResults.value.length) {
        goToProcess(processResults.value[selected])
      } else {
        goToTask(taskResults.value[selected - processResults.value.length])
      }
    } else {
      router.push({ name: 'GerenciarProcessos', query: { search: searchQuery.value } })
      searchQuery.value = ''
    }
  }
}

// Global snackbar
window.showSnackbar = (message, color = 'success') => {
  snackbar.message = message
  snackbar.color = color
  snackbar.show = true
}

// Lifecycle
onMounted(async () => {
  document.addEventListener('click', handleClickOutsideSearch)
  try {
    await notificationsStore.fetchNotifications()
    notificationsStore.startPolling(60000)
  } catch (e) {
    // Silent error
  }
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutsideSearch)
  notificationsStore.stopPolling()
})

watch(() => authStore.activeCompanyId, async (newId, oldId) => {
  if (newId && newId !== oldId) {
    try {
      await notificationsStore.fetchNotifications()
    } catch (e) {
      // Silent error
    }
  }
})

// Search dropdown control
watch(searchQuery, (val) => {
  selectedResultIndex.value = -1
  showSearchResults.value = val.length >= 2
})

function handleClickOutsideSearch(e) {
  if (searchContainerRef.value && !searchContainerRef.value.contains(e.target)) {
    showSearchResults.value = false
  }
}

// Auto-collapse sidebar on mobile
watch(isMobile, (value) => {
  if (value) {
    sidebarOpen.value = false
  } else {
    sidebarOpen.value = true
  }
})
</script>

<style scoped>
/* App Container */
.app-container {
  background-color: var(--color-bg-primary);
}

/* Sidebar */
.sidebar {
  background: var(--color-surface) !important;
  border-right: 1px solid var(--color-surface-border) !important;
}

.sidebar-header {
  padding: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 64px;
}

.logo-wrapper {
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.logo-img {
  height: 28px;
  width: auto;
  transition: all 0.2s ease;
}

.logo-img.logo-collapsed {
  height: 24px;
}

/* Navigation */
.nav-list {
  padding: 8px;
}

.nav-item {
  margin-bottom: 2px;
  padding: 8px 12px !important;
  min-height: 40px !important;
}

.nav-icon {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: transparent;
  transition: all 0.2s ease;
  color: var(--color-neutral-500);
}

.nav-icon-active {
  background: var(--color-primary-100);
  color: var(--color-primary-600);
}

.nav-item:hover .nav-icon {
  background: var(--color-neutral-100);
  color: var(--color-neutral-700);
}

.nav-item.v-list-item--active .nav-icon {
  background: var(--color-primary-100);
  color: var(--color-primary-600);
}

.nav-title {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-neutral-700);
  margin-left: 4px;
}

.nav-item.v-list-item--active .nav-title {
  color: var(--color-primary-600);
  font-weight: 600;
}

.nav-badge {
  font-size: 0.7rem;
  height: 20px;
  min-width: 20px;
}

.nav-section-header {
  padding: 16px 16px 8px;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-neutral-400);
}

/* Sidebar Footer */
.sidebar-footer {
  padding: 12px;
}

.company-selector,
.user-menu-trigger {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-bottom: 8px;
}

.company-selector:hover,
.user-menu-trigger:hover {
  background: var(--color-neutral-100);
}

.company-selector-collapsed,
.user-menu-collapsed {
  justify-content: center;
  padding: 10px;
}

.company-info,
.user-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.company-name,
.user-name {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-neutral-800);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.company-role,
.user-email {
  font-size: 0.75rem;
  color: var(--color-neutral-500);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.company-chevron {
  color: var(--color-neutral-400);
}

/* User Menu */
.user-menu-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: var(--color-neutral-50);
}

.user-menu-info {
  display: flex;
  flex-direction: column;
}

.user-menu-name {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-neutral-800);
}

.user-menu-email {
  font-size: 0.75rem;
  color: var(--color-neutral-500);
}

.logout-item:hover {
  background: var(--color-error-50) !important;
}

/* Header */
.app-header {
  background: var(--color-surface) !important;
  border-bottom: 1px solid var(--color-surface-border) !important;
  overflow: visible !important;
}

.app-header :deep(.v-toolbar__content) {
  overflow: visible !important;
}

.header-search {
  max-width: 400px;
  width: 100%;
  position: relative;
}

.search-input {
  max-width: 400px;
}

/* Search Dropdown */
.search-dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  background: var(--color-surface);
  border: 1px solid var(--color-surface-border);
  border-radius: 12px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.12);
  z-index: 1000;
  max-height: 400px;
  overflow-y: auto;
}

.search-loading {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 16px;
  font-size: 0.8125rem;
  color: var(--color-neutral-500);
}

.search-section {
  padding: 4px 0;
}

.search-section + .search-section {
  border-top: 1px solid var(--color-surface-border);
}

.search-section-title {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px 4px;
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-neutral-400);
}

.search-result-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 14px;
  cursor: pointer;
  transition: background 0.1s ease;
}

.search-result-item:hover,
.search-result-active {
  background: var(--color-neutral-50);
}

.result-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: var(--color-neutral-100);
  color: var(--color-neutral-500);
}

.result-icon--info {
  background: var(--color-primary-50);
  color: var(--color-primary-600);
}

.result-icon--success {
  background: var(--color-success-50);
  color: var(--color-success-600);
}

.result-icon--error {
  background: var(--color-error-50);
  color: var(--color-error-600);
}

.result-icon--task {
  background: var(--color-warning-50);
  color: var(--color-warning-600);
}

.result-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.result-title {
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--color-neutral-800);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.result-meta {
  font-size: 0.6875rem;
  color: var(--color-neutral-500);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.search-empty {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 20px 16px;
  font-size: 0.8125rem;
  color: var(--color-neutral-500);
  justify-content: center;
}

.search-footer {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 14px;
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--color-primary-600);
  border-top: 1px solid var(--color-surface-border);
  cursor: pointer;
  transition: background 0.1s ease;
}

.search-footer:hover {
  background: var(--color-primary-50);
}

.search-input :deep(.v-field) {
  border-radius: 10px;
  box-shadow: none !important;
}

.search-input :deep(.v-field__input) {
  padding-top: 8px;
  padding-bottom: 8px;
  min-height: 40px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-right: 16px;
}

.create-btn {
  font-weight: 600;
  padding: 0 16px;
  height: 38px;
}

/* Main Content */
.main-content {
  background: var(--color-bg-primary);
}

.content-wrapper {
  padding: 24px;
  max-width: 1600px;
  margin: 0 auto;
  min-height: calc(100vh - 64px);
}

/* Notifications Dialog */
.notifications-dialog {
  border-radius: 16px !important;
}

.notification-item {
  cursor: pointer;
  transition: background 0.2s ease;
}

.notification-item:hover {
  background: var(--color-neutral-50);
}

.notification-unread {
  background: var(--color-primary-50);
}

.notification-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-primary-500);
}

/* Empty State */
.empty-state {
  text-align: center;
}

.empty-icon {
  width: 80px;
  height: 80px;
  margin: 0 auto 16px;
  border-radius: 50%;
  background: var(--color-neutral-100);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-neutral-400);
}

.empty-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-neutral-700);
  margin-bottom: 4px;
}

.empty-description {
  font-size: 0.875rem;
  color: var(--color-neutral-500);
}

/* Company Menu */
.company-menu {
  padding: 8px;
}

/* Responsive */
@media (max-width: 768px) {
  .content-wrapper {
    padding: 16px;
  }
}

/* Override Vuetify nav drawer rail behavior */
:deep(.v-navigation-drawer--rail) .nav-item {
  padding: 8px !important;
  justify-content: center;
}

:deep(.v-navigation-drawer--rail) .nav-icon {
  margin: 0;
}

:deep(.v-navigation-drawer--rail) .v-list-item__prepend {
  margin-inline-end: 0 !important;
}

:deep(.v-navigation-drawer--rail) .v-list-item__content {
  display: none;
}

:deep(.v-navigation-drawer--rail) .v-list-item__append {
  display: none;
}

:deep(.v-navigation-drawer--rail) .nav-section-header {
  display: none;
}
</style>