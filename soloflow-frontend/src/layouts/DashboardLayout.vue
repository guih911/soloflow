<template>
  <v-app>
    <!-- ✨ App Bar Moderno com Glassmorphism -->
    <v-app-bar
      color="rgba(255, 255, 255, 0.8)"
      elevation="0"
      app
      height="72"
      style="backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);"
      class="app-bar-modern"
    >
      <!-- Menu Toggle -->
      <v-app-bar-nav-icon 
        @click="toggleDrawer" 
        color="primary"
        class="ml-2"
      >
        <v-icon>{{ drawer ? 'mdi-menu-open' : 'mdi-menu' }}</v-icon>
      </v-app-bar-nav-icon>
      
      <!-- Logo e Título -->
      <div class="d-flex align-center ml-4">
        <div>
          <v-app-bar-title class="text-h5 font-weight-bold logo-text">
            SoloFlow
          </v-app-bar-title>
          <div class="text-caption text-medium-emphasis">
            Sistema de processos
          </div>
        </div>
      </div>

      <v-spacer />

      <!-- ✨ Notifications -->
      <v-btn icon variant="text" class="mr-2" @click="showNotifications">
        <v-badge :content="unreadNotifications" :model-value="unreadNotifications > 0" color="error">
          <v-icon>mdi-bell</v-icon>
        </v-badge>
      </v-btn>

      <!-- Seletor de Empresa Melhorado -->
      <v-menu 
        v-if="companies.length > 1"
        offset-y
        class="mr-4"
      >
        <template v-slot:activator="{ props }">
          <v-btn 
            v-bind="props" 
            variant="plain" 
            class="text-none company-selector"
            prepend-icon="mdi-domain"
          >
            {{ currentCompany?.name }}
            <v-icon end>mdi-chevron-down</v-icon>
          </v-btn>
        </template>

        <v-list min-width="280" class="company-list">
          <v-list-subheader class="text-primary font-weight-bold">
            <v-icon start>mdi-swap-horizontal</v-icon>
            Trocar empresa
          </v-list-subheader>
          <v-list-item
            v-for="company in companies"
            :key="company.companyId"
            @click="switchCompany(company.companyId)"
            :active="company.companyId === currentCompany?.companyId"
            class="company-item"
          >
            <template v-slot:prepend>
              <v-avatar size="32" :color="company.companyId === currentCompany?.companyId ? 'primary' : 'grey-lighten-2'">
                <v-icon size="16" :color="company.companyId === currentCompany?.companyId ? 'white' : 'grey'">
                  mdi-domain
                </v-icon>
              </v-avatar>
            </template>
            <v-list-item-title class="font-weight-medium">{{ company.name }}</v-list-item-title>
            <v-list-item-subtitle>{{ getRoleText(company.role) }}</v-list-item-subtitle>
            <template v-slot:append>
              <v-chip 
                v-if="company.companyId === currentCompany?.companyId"
                size="x-small"
                color="primary"
                variant="flat"
              >
                <v-icon start size="12">mdi-check</v-icon>
                Ativa
              </v-chip>
            </template>
          </v-list-item>
        </v-list>
      </v-menu>

      <!-- User Menu Melhorado -->
      <v-menu offset-y>
        <template v-slot:activator="{ props }">
          <v-btn v-bind="props" variant="text" class="text-none user-menu-btn">
            <v-avatar size="36" color="primary" class="mr-2">
              <span class="text-white font-weight-bold text-body-2">
                {{ getUserInitials(user?.name) }}
              </span>
            </v-avatar>
            <div class="d-none d-sm-flex flex-column align-start">
              <span class="text-body-2 font-weight-medium">{{ user?.name }}</span>
              <span class="text-caption text-medium-emphasis">{{ getRoleText(currentCompany?.role) }}</span>
            </div>
            <v-icon end class="ml-1">mdi-chevron-down</v-icon>
          </v-btn>
        </template>

        <v-list min-width="260" class="user-menu">
          <!-- User Info -->
          <v-list-item class="user-info-item">
            <template v-slot:prepend>
              <v-avatar size="48" color="primary">
                <span class="text-white font-weight-bold">
                  {{ getUserInitials(user?.name) }}
                </span>
              </v-avatar>
            </template>
            <v-list-item-title class="font-weight-bold">{{ user?.name }}</v-list-item-title>
            <v-list-item-subtitle>{{ user?.email }}</v-list-item-subtitle>
            <v-list-item-subtitle class="text-primary">
              {{ currentCompany?.name }} • {{ getRoleText(currentCompany?.role) }}
            </v-list-item-subtitle>
          </v-list-item>
          
          <v-divider class="my-2" />
          
          <!-- Menu Items -->
          <v-list-item @click="goToProfile" class="menu-item">
            <template v-slot:prepend>
              <v-icon color="primary">mdi-account-circle</v-icon>
            </template>
            <v-list-item-title>Meu Perfil</v-list-item-title>
            <v-list-item-subtitle>Dados pessoais e configurações</v-list-item-subtitle>
          </v-list-item>
          
          <v-list-item @click="goToSettings" v-if="user?.role === 'ADMIN'" class="menu-item">
            <template v-slot:prepend>
              <v-icon color="primary">mdi-cog</v-icon>
            </template>
            <v-list-item-title>Configurações</v-list-item-title>
            <v-list-item-subtitle>Configurações do sistema</v-list-item-subtitle>
          </v-list-item>
          
          <v-divider class="my-2" />
          
          <v-list-item @click="handleLogout" class="menu-item logout-item">
            <template v-slot:prepend>
              <v-icon color="error">mdi-logout</v-icon>
            </template>
            <v-list-item-title class="text-error">Sair do Sistema</v-list-item-title>
            <v-list-item-subtitle>Encerrar sessão</v-list-item-subtitle>
          </v-list-item>
        </v-list>
      </v-menu>
    </v-app-bar>

    <!-- ✨ Navigation Drawer com Gradiente Azul -->
    <v-navigation-drawer 
      :model-value="true"
      app 
      :rail="!drawer"
      :width="280"
      rail-width="72"
      :permanent="true"
      :class="['modern-drawer', { 'is-rail': !drawer }]"
      style="top: 72px !important; height: calc(100vh - 72px) !important;"
    >
      <div class="drawer-gradient">
        <v-divider style="border-color: rgba(255, 255, 255, 0.2);" />

        <!-- ✨ Navigation Items com Ícones Corrigidos -->
        <v-list nav density="comfortable" class="navigation-list">
          <!-- Dashboard -->
          <v-tooltip :disabled="drawer" location="right" text="Dashboard" content-class="nav-tooltip" open-delay="120">
            <template #activator="{ props }">
              <v-list-item 
                v-bind="props"
                :to="{ name: 'Dashboard' }"
                :exact="true"
                class="nav-item"
                rounded="xl"
              >
                <template v-slot:prepend>
                  <v-icon size="20">mdi-view-dashboard</v-icon>
                </template>
                <v-list-item-title>Dashboard</v-list-item-title>
              </v-list-item>
            </template>
          </v-tooltip>

          <!-- Criar Processo -->
          <v-tooltip :disabled="drawer" location="right" text="Criar Processo" content-class="nav-tooltip" open-delay="120">
            <template #activator="{ props }">
              <v-list-item 
                v-bind="props"
                :to="{ name: 'Processes' }"
                class="nav-item"
                rounded="xl"
              >
                <template v-slot:prepend>
                  <v-icon size="20">mdi-rocket-launch</v-icon>
                </template>
                <v-list-item-title>Criar Processo</v-list-item-title>
              </v-list-item>
            </template>
          </v-tooltip>

          <!-- Gerenciar Processos -->
          <v-tooltip 
            v-if="canAccess(['ADMIN', 'MANAGER'])"
            :disabled="drawer" 
            location="right" 
            text="Gerenciar Processos" 
            content-class="nav-tooltip" 
            open-delay="120"
          >
            <template #activator="{ props }">
              <v-list-item 
                v-bind="props"
                :to="{ name: 'ManageProcesses' }"
                class="nav-item"
                rounded="xl"
              >
                <template v-slot:prepend>
                  <v-icon size="20">mdi-clipboard-edit</v-icon>
                </template>
                <v-list-item-title>Gerenciar Processos</v-list-item-title>
              </v-list-item>
            </template>
          </v-tooltip>

          <!-- Minhas Tarefas -->
          <v-tooltip :disabled="drawer" location="right" text="Minhas Tarefas" content-class="nav-tooltip" open-delay="120">
            <template #activator="{ props }">
              <v-list-item 
                v-bind="props"
                :to="{ name: 'MyTasks' }"
                class="nav-item"
                rounded="xl"
              >
                <template v-slot:prepend>
                  <v-icon size="20">mdi-clipboard-text</v-icon>
                </template>
                <v-list-item-title>Minhas Tarefas</v-list-item-title>
                <template v-slot:append v-if="drawer && pendingTasks > 0">
                  <v-chip size="x-small" color="warning" variant="flat">
                    {{ pendingTasks }}
                  </v-chip>
                </template>
              </v-list-item>
            </template>
          </v-tooltip>

          <!-- Assinaturas Pendentes -->
          <v-tooltip :disabled="drawer" location="right" text="Assinaturas" content-class="nav-tooltip" open-delay="120">
            <template #activator="{ props }">
              <v-list-item 
                v-bind="props"
                :to="{ name: 'PendingSignatures' }"
                class="nav-item"
                rounded="xl"
              >
                <template v-slot:prepend>
                  <v-icon size="20">mdi-draw-pen</v-icon>
                </template>
                <v-list-item-title>Assinaturas</v-list-item-title>
                <template v-slot:append v-if="drawer && pendingSignatures > 0">
                  <v-chip size="x-small" color="warning" variant="flat">
                    {{ pendingSignatures }}
                  </v-chip>
                </template>
              </v-list-item>
            </template>
          </v-tooltip>

          <!-- Divider -->
          <v-divider 
            v-if="drawer && canAccess(['ADMIN', 'MANAGER'])" 
            class="my-4" 
            style="border-color: rgba(255, 255, 255, 0.2);" 
          />

          <!-- Configurações Header -->
          <v-list-subheader v-if="drawer && canAccess(['ADMIN', 'MANAGER'])" class="settings-header">
            <v-icon start size="16">mdi-cog</v-icon>
            CONFIGURAÇÕES
          </v-list-subheader>

          <!-- Tipos de Processo -->
          <v-tooltip 
            v-if="canAccess(['ADMIN', 'MANAGER'])"
            :disabled="drawer" 
            location="right" 
            text="Tipos de Processo" 
            content-class="nav-tooltip" 
            open-delay="120"
          >
            <template #activator="{ props }">
              <v-list-item 
                v-bind="props"
                :to="{ name: 'ProcessTypes' }"
                class="nav-item"
                rounded="xl"
              >
                <template v-slot:prepend>
                  <v-icon size="20">mdi-file-cog</v-icon>
                </template>
                <v-list-item-title>Tipos de Processo</v-list-item-title>
              </v-list-item>
            </template>
          </v-tooltip>

          <!-- Setores -->
          <v-tooltip 
            v-if="canAccess(['ADMIN', 'MANAGER'])"
            :disabled="drawer" 
            location="right" 
            text="Setores" 
            content-class="nav-tooltip" 
            open-delay="120"
          >
            <template #activator="{ props }">
              <v-list-item 
                v-bind="props"
                :to="{ name: 'Sectors' }"
                class="nav-item"
                rounded="xl"
              >
                <template v-slot:prepend>
                  <v-icon size="20">mdi-office-building</v-icon>
                </template>
                <v-list-item-title>Setores</v-list-item-title>
              </v-list-item>
            </template>
          </v-tooltip>

          <!-- Usuários -->
          <v-tooltip 
            v-if="canAccess(['ADMIN', 'MANAGER'])"
            :disabled="drawer" 
            location="right" 
            text="Usuários" 
            content-class="nav-tooltip" 
            open-delay="120"
          >
            <template #activator="{ props }">
              <v-list-item 
                v-bind="props"
                :to="{ name: 'Users' }"
                class="nav-item"
                rounded="xl"
              >
                <template v-slot:prepend>
                  <v-icon size="20">mdi-account-group</v-icon>
                </template>
                <v-list-item-title>Usuários</v-list-item-title>
              </v-list-item>
            </template>
          </v-tooltip>

          <!-- Empresas -->
          <v-tooltip 
            v-if="canAccess(['ADMIN'])"
            :disabled="drawer" 
            location="right" 
            text="Empresas" 
            content-class="nav-tooltip" 
            open-delay="120"
          >
            <template #activator="{ props }">
              <v-list-item 
                v-bind="props"
                :to="{ name: 'Companies' }"
                class="nav-item"
                rounded="xl"
              >
                <template v-slot:prepend>
                  <v-icon size="20">mdi-domain</v-icon>
                </template>
                <v-list-item-title>Empresas</v-list-item-title>
              </v-list-item>
            </template>
          </v-tooltip>
        </v-list>
      </div>
    </v-navigation-drawer>

    <!-- ✨ Main Content -->
    <v-main style="padding-top: 72px !important;">
      <!-- Content Area -->
      <div class="content-container">
        <router-view />
      </div>
    </v-main>

    <!-- ✨ Notifications Dialog -->
    <v-dialog v-model="notificationsDialog" max-width="500">
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon color="primary" class="mr-2">mdi-bell</v-icon>
          Notificações
          <v-spacer />
          <v-btn size="small" variant="text" :disabled="unreadNotifications === 0" @click="markAllNotificationsAsRead">
            Marcar todas como lidas
          </v-btn>
          <v-btn icon variant="text" @click="notificationsDialog = false">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-card-title>
        <v-card-text>
          <div v-if="notificationsList.length === 0" class="text-center py-8">
            <v-icon size="64" color="grey-lighten-2">mdi-bell-off</v-icon>
            <div class="text-h6 mt-4">Nenhuma notificação</div>
            <div class="text-body-2 text-medium-emphasis">
              Você está em dia com todas as tarefas!
            </div>
          </div>
          <v-list v-else>
            <v-list-item v-for="notification in notificationsList" :key="notification.id" @click="openNotification(notification)" style="cursor: pointer;">
              <template v-slot:prepend>
                <v-avatar :color="isRead(notification.id) ? 'grey-lighten-2' : (notification.color || 'primary')" size="32">
                  <v-icon color="white" size="16">{{ notification.icon || 'mdi-bell' }}</v-icon>
                </v-avatar>
              </template>
              <v-list-item-title>{{ notification.title }}</v-list-item-title>
              <v-list-item-subtitle>{{ notification.message }}</v-list-item-subtitle>
              <template v-slot:append>
                <v-chip v-if="!isRead(notification.id)" size="x-small" color="error" variant="flat">Novo</v-chip>
              </template>
            </v-list-item>
          </v-list>
        </v-card-text>
      </v-card>
    </v-dialog>
  </v-app>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useProcessStore } from '@/stores/processes'
import { useNotificationsStore } from '@/stores/notifications'

const processStore = useProcessStore()
const notificationsStore = useNotificationsStore()
const router = useRouter()
const authStore = useAuthStore()

// ✨ Estado Reativo
const drawer = ref(false) // Inicia colapsado (rail mode)
const notificationsDialog = ref(false)

// ✨ Computed Properties
const user = computed(() => authStore.user)
const currentCompany = computed(() => authStore.activeCompany)
const companies = computed(() => authStore.companies)

// ✨ Contagens derivadas
const pendingTasks = computed(() => processStore.myTasks?.length || 0)
const pendingSignatures = computed(() => {
  if (!processStore.myTasks) return 0
  return processStore.myTasks.filter(task => task.step?.requiresSignature === true).length
})

const notificationsList = computed(() => notificationsStore.items || [])
const unreadNotifications = computed(() => notificationsStore.unreadCount || 0)
const isRead = (id) => notificationsStore.isRead(id)

// ✨ Métodos
function toggleDrawer() {
  drawer.value = !drawer.value
}

function showNotifications() {
  notificationsDialog.value = true
}

async function markAllNotificationsAsRead() {
  try {
    await notificationsStore.markAllAsRead()
  } catch (e) {
    console.error('Erro ao marcar todas como lidas:', e)
  }
}

async function openNotification(notification) {
  try {
    if (!isRead(notification.id)) {
      await notificationsStore.markAsRead(notification.id)
    }
    if (notification.link) {
      router.push(notification.link)
      notificationsDialog.value = false
    }
  } catch (e) {
    console.error('Erro ao abrir notificação:', e)
  }
}

// ✨ Métodos de navegação
function goToProfile() {
  router.push({ name: 'Profile' })
}

function goToSettings() {
  router.push({ name: 'Settings' })
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
    router.push('/login')
  } catch (error) {
    localStorage.clear()
    sessionStorage.clear()
    router.push('/login')
  }
}

// ✨ Auxiliares
function getUserInitials(name) {
  if (!name) return 'U'
  return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
}

function getRoleText(role) {
  const roles = { ADMIN: 'Administrador', MANAGER: 'Gerente', USER: 'Usuário' }
  return roles[role] || role
}

function canAccess(requiredRoles) {
  const userRole = authStore.userRole
  return requiredRoles.includes(userRole)
}

// ✨ Carregar notificações ao montar e quando trocar empresa
onMounted(async () => {
  try {
    await notificationsStore.fetchNotifications()
    notificationsStore.startPolling(60000)
  } catch (e) {
    console.warn('Falha ao carregar notificações inicialmente:', e)
  }
})

onUnmounted(() => {
  notificationsStore.stopPolling()
})

watch(() => authStore.activeCompanyId, async (newId, oldId) => {
  if (newId && newId !== oldId) {
    try {
      await notificationsStore.fetchNotifications()
    } catch (e) {
      console.warn('Falha ao recarregar notificações após trocar empresa:', e)
    }
  }
})
</script>

<style scoped>
/* ✨ App Bar Moderno */
.app-bar-modern {
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  transition: all 0.3s ease;
}

.logo-text {
  background: linear-gradient(135deg, #1976D2, #42A5F5);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.company-selector {
  border-radius: 12px;
  text-transform: none;
  font-weight: 500;
}

/* ✨ Navigation Drawer com Gradiente Azul */
.modern-drawer {
  border-right: none !important;
  transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
}

.drawer-gradient {
  background: linear-gradient(180deg, #1976D2, #1565C0, #0D47A1);
  height: 100%;
  width: 100%;
}

.navigation-list {
  padding: 16px 0;
  background: transparent !important;
}

/* ✨ Estado Expandido - Itens de Navegação */
.nav-item {
  margin: 4px 12px;
  transition: all 0.2s ease;
  border-radius: 16px !important;
  color: white !important;
}

.nav-item :deep(.v-list-item__prepend) {
  margin-inline-end: 16px;
}

.nav-item :deep(.v-list-item-title) {
  color: white !important;
  font-weight: 500;
}

.nav-item :deep(.v-icon) {
  color: white !important;
}

.nav-item:hover {
  background: rgba(255, 255, 255, 0.1) !important;
  transform: translateX(4px);
}

.nav-item.v-list-item--active {
  background: rgba(255, 255, 255, 0.2) !important;
  font-weight: 600;
}

/* ✨ Estado Rail (Colapsado) - SOLUÇÃO DEFINITIVA */
.modern-drawer.is-rail .nav-item {
  margin: 4px 12px !important;
  padding: 0 !important;
  min-height: 48px !important;
  height: 48px !important;
  min-width: 48px !important;
  width: 48px !important;
  max-width: 48px !important;
  border-radius: 12px !important;
  position: relative !important;
}

/* CRÍTICO: Resetar estrutura do Vuetify completamente */
.modern-drawer.is-rail .nav-item.v-list-item {
  padding: 0 !important;
  padding-inline: 0 !important;
  padding-inline-start: 0 !important;
  padding-inline-end: 0 !important;
  padding-left: 0 !important;
  padding-right: 0 !important;
}

/* Forçar prepend a ficar invisível e não ocupar espaço */
.modern-drawer.is-rail .nav-item :deep(.v-list-item__prepend) {
  position: static !important;
  margin: 0 !important;
  padding: 0 !important;
  margin-inline-start: 0 !important;
  margin-inline-end: 0 !important;
  width: 0 !important;
  height: 0 !important;
  overflow: visible !important;
}

/* Ícone - posicionamento absoluto perfeito */
.modern-drawer.is-rail .nav-item :deep(.v-icon) {
  position: absolute !important;
  top: 50% !important;
  left: 50% !important;
  transform: translate(-50%, -50%) !important;
  margin: 0 !important;
  padding: 0 !important;
}

/* Esconder conteúdo completamente */
.modern-drawer.is-rail .nav-item :deep(.v-list-item__content) {
  display: none !important;
  width: 0 !important;
  height: 0 !important;
  opacity: 0 !important;
  visibility: hidden !important;
}

.modern-drawer.is-rail .nav-item :deep(.v-list-item__append) {
  display: none !important;
  width: 0 !important;
  height: 0 !important;
  opacity: 0 !important;
  visibility: hidden !important;
}

/* Hover e active - estados visuais */
.modern-drawer.is-rail .nav-item:hover {
  transform: none !important;
  background: rgba(255, 255, 255, 0.12) !important;
}

.modern-drawer.is-rail .nav-item.v-list-item--active {
  background: rgba(255, 255, 255, 0.22) !important;
}

/* Headers e Dividers - ocultar no modo rail */
.modern-drawer.is-rail .settings-header,
.modern-drawer.is-rail .v-divider {
  display: none !important;
}

/* ✨ Headers de Seção */
.settings-header {
  color: white !important;
  font-weight: 700;
  font-size: 0.75rem;
  margin-top: 8px;
  padding-left: 20px;
  opacity: 0.9;
}

/* ✨ Tooltips */
.nav-tooltip {
  background: rgba(18, 18, 18, 0.92) !important;
  color: #fff !important;
  border-radius: 8px !important;
  padding: 6px 12px !important;
  box-shadow: 0 6px 18px rgba(0,0,0,0.22) !important;
  font-weight: 500;
  letter-spacing: 0.2px;
}

/* ✨ Content Container */
.content-container {
  padding: 24px;
  min-height: calc(100vh - 96px);
}

/* ✨ User Menu */
.user-menu-btn {
  text-transform: none;
  margin-right: 8px;
}

.user-info-item {
  background: rgba(25, 118, 210, 0.04);
  margin: 8px;
  border-radius: 12px;
}

.menu-item {
  margin: 4px 8px;
  border-radius: 8px;
  transition: all 0.2s ease;
}

.menu-item:hover {
  background: rgba(25, 118, 210, 0.08) !important;
}

.logout-item:hover {
  background: rgba(244, 67, 54, 0.08) !important;
}

/* ✨ Company List */
.company-list {
  border-radius: 16px;
  overflow: hidden;
}

.company-item {
  margin: 4px 8px;
  border-radius: 12px;
  transition: all 0.2s ease;
}

.company-item:hover {
  background: rgba(25, 118, 210, 0.08) !important;
}

/* ✨ Responsividade */
@media (max-width: 1024px) {
  .modern-drawer {
    z-index: 1001;
  }
}

@media (max-width: 768px) {
  .content-container {
    padding: 16px;
  }
  
  .user-menu-btn .d-sm-flex {
    display: none !important;
  }
}

/* ✨ Tema Escuro */
.v-theme--dark .drawer-gradient {
  background: linear-gradient(180deg, #0D47A1, #1565C0, #1976D2) !important;
}

.v-theme--dark .app-bar-modern {
  background: rgba(18, 18, 18, 0.8) !important;
  backdrop-filter: blur(20px);
}
</style>