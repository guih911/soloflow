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
        <v-badge :content="notifications.length" :model-value="notifications.length > 0" color="error">
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
      v-model="drawer" 
      app 
      width="280"
      class="modern-drawer"
      style="top: 72px !important; height: calc(100vh - 72px) !important; background: linear-gradient(180deg, #1976D2, #1565C0, #0D47A1) !important;"
    >
      <v-divider style="border-color: rgba(255, 255, 255, 0.2);" />

      <!-- ✨ Navigation Items com Ícones Corrigidos -->
      <v-list nav density="comfortable" class="navigation-list" style="background: transparent;">
        <!-- Dashboard -->
        <v-list-item 
          :to="{ name: 'Dashboard' }"
          class="nav-item white-text"
          rounded="xl"
        >
          <template v-slot:prepend>
            <v-icon size="20" color="white">mdi-view-dashboard</v-icon>
          </template>
          <v-list-item-title class="text-white">Dashboard</v-list-item-title>
        </v-list-item>

        <!-- Criar Processo -->
        <v-list-item 
          :to="{ name: 'Processes' }"
          class="nav-item white-text"
          rounded="xl"
        >
          <template v-slot:prepend>
            <v-icon size="20" color="white">mdi-rocket-launch</v-icon>
          </template>
          <v-list-item-title class="text-white">Criar Processo</v-list-item-title>
        </v-list-item>

        <!-- Gerenciar Processos -->
        <v-list-item 
          v-if="canAccess(['ADMIN', 'MANAGER'])"
          :to="{ name: 'ManageProcesses' }"
          class="nav-item white-text"
          rounded="xl"
        >
          <template v-slot:prepend>
            <v-icon size="20" color="white">mdi-clipboard-edit</v-icon>
          </template>
          <v-list-item-title class="text-white">Gerenciar Processos</v-list-item-title>
        </v-list-item>

        <!-- Minhas Tarefas -->
        <v-list-item 
          :to="{ name: 'MyTasks' }"
          class="nav-item white-text"
          rounded="xl"
        >
          <template v-slot:prepend>
            <v-icon size="20" color="white">mdi-clipboard-text</v-icon>
          </template>
          <v-list-item-title class="text-white">Minhas Tarefas</v-list-item-title>
          <template v-slot:append v-if="pendingTasks > 0">
            <v-chip size="x-small" color="warning" variant="flat">
              {{ pendingTasks }}
            </v-chip>
          </template>
        </v-list-item>

        <!-- Assinaturas Pendentes -->
        <v-list-item 
          :to="{ name: 'PendingSignatures' }"
          class="nav-item white-text"
          rounded="xl"
        >
          <template v-slot:prepend>
            <v-icon size="20" color="white">mdi-draw-pen</v-icon>
          </template>
          <v-list-item-title class="text-white">Assinaturas</v-list-item-title>
          <template v-slot:append v-if="pendingSignatures > 0">
            <v-chip size="x-small" color="warning" variant="flat">
              {{ pendingSignatures }}
            </v-chip>
          </template>
        </v-list-item>

        <!-- Divider -->
        <v-divider class="my-4" v-if="canAccess(['ADMIN', 'MANAGER'])" style="border-color: rgba(255, 255, 255, 0.2);" />

        <!-- Configurações Header -->
        <v-list-subheader v-if="canAccess(['ADMIN', 'MANAGER'])" class="settings-header text-white">
          <v-icon start size="16" color="white">mdi-cog</v-icon>
          CONFIGURAÇÕES
        </v-list-subheader>

        <!-- Tipos de Processo -->
        <v-list-item 
          v-if="canAccess(['ADMIN', 'MANAGER'])"
          :to="{ name: 'ProcessTypes' }"
          class="nav-item white-text"
          rounded="xl"
        >
          <template v-slot:prepend>
            <v-icon size="20" color="white">mdi-file-cog</v-icon>
          </template>
          <v-list-item-title class="text-white">Tipos de Processo</v-list-item-title>
        </v-list-item>

        <!-- Setores -->
        <v-list-item 
          v-if="canAccess(['ADMIN', 'MANAGER'])"
          :to="{ name: 'Sectors' }"
          class="nav-item white-text"
          rounded="xl"
        >
          <template v-slot:prepend>
            <v-icon size="20" color="white">mdi-office-building</v-icon>
          </template>
          <v-list-item-title class="text-white">Setores</v-list-item-title>
        </v-list-item>

        <!-- Usuários -->
        <v-list-item 
          v-if="canAccess(['ADMIN', 'MANAGER'])"
          :to="{ name: 'Users' }"
          class="nav-item white-text"
          rounded="xl"
        >
          <template v-slot:prepend>
            <v-icon size="20" color="white">mdi-account-group</v-icon>
          </template>
          <v-list-item-title class="text-white">Usuários</v-list-item-title>
        </v-list-item>

        <!-- Empresas -->
        <v-list-item 
          v-if="canAccess(['ADMIN'])"
          :to="{ name: 'Companies' }"
          class="nav-item white-text"
          rounded="xl"
        >
          <template v-slot:prepend>
            <v-icon size="20" color="white">mdi-domain</v-icon>
          </template>
          <v-list-item-title class="text-white">Empresas</v-list-item-title>
        </v-list-item>
      </v-list>
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
          <v-btn icon variant="text" @click="notificationsDialog = false">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-card-title>
        <v-card-text>
          <div v-if="notifications.length === 0" class="text-center py-8">
            <v-icon size="64" color="grey-lighten-2">mdi-bell-off</v-icon>
            <div class="text-h6 mt-4">Nenhuma notificação</div>
            <div class="text-body-2 text-medium-emphasis">
              Você está em dia com todas as tarefas!
            </div>
          </div>
          <v-list v-else>
            <v-list-item v-for="notification in notifications" :key="notification.id">
              <template v-slot:prepend>
                <v-avatar :color="notification.color" size="32">
                  <v-icon color="white" size="16">{{ notification.icon }}</v-icon>
                </v-avatar>
              </template>
              <v-list-item-title>{{ notification.title }}</v-list-item-title>
              <v-list-item-subtitle>{{ notification.message }}</v-list-item-subtitle>
            </v-list-item>
          </v-list>
        </v-card-text>
      </v-card>
    </v-dialog>
  </v-app>
</template>

<script setup>
import { ref, computed, reactive, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

// ✨ Estado Reativo
const drawer = ref(true)
const notificationsDialog = ref(false)

// ✨ Computed Properties
const user = computed(() => authStore.user)
const currentCompany = computed(() => authStore.activeCompany)
const companies = computed(() => authStore.companies)

// ✨ Dados Mock para demonstração
const pendingTasks = ref(3)
const pendingSignatures = ref(1)
const notifications = ref([
  {
    id: 1,
    title: 'Nova tarefa pendente',
    message: 'Aprovação de solicitação de compra',
    icon: 'mdi-clipboard-text',
    color: 'primary'
  }
])

// ✨ Métodos
function toggleDrawer() {
  drawer.value = !drawer.value
}

// ✨ Desabilitar snackbar global (remove notificações indesejadas)
window.showSnackbar = () => {
  // Não faz nada - previne notificações
}

function showNotifications() {
  notificationsDialog.value = true
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

// ✨ Watch para responsividade
watch(() => window.innerWidth, (newWidth) => {
  if (newWidth < 1024) {
    drawer.value = false
  } else {
    drawer.value = true
  }
}, { immediate: true })
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
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.navigation-list {
  padding: 16px 0;
}

.nav-item {
  margin-bottom: 8px;
  margin-left: 12px;
  margin-right: 12px;
  transition: all 0.2s ease;
  border-radius: 16px !important;
}

.nav-item:hover {
  background: rgba(255, 255, 255, 0.1) !important;
  transform: translateX(4px);
  border-radius: 16px !important;
}

.nav-item.v-list-item--active {
  background: rgba(255, 255, 255, 0.2) !important;
  font-weight: 600;
  border-radius: 16px !important;
}

.white-text .v-list-item-title {
  color: white !important;
}

.white-text .v-icon {
  color: white !important;
}

.settings-header {
  color: white !important;
  font-weight: 700;
  font-size: 0.75rem;
  margin-top: 8px;
  padding-left: 20px;
  opacity: 0.9;
}

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

/* ✨ Animações */
.v-list-item {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.v-avatar {
  transition: all 0.2s ease;
}

.v-btn {
  transition: all 0.2s ease;
}

/* ✨ Breadcrumbs */
.breadcrumbs-container {
  background: rgba(25, 118, 210, 0.02);
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
  padding: 12px 0;
}

.content-container {
  padding: 24px;
  min-height: calc(100vh - 144px);
}

/* ✨ Tema Escuro */
.v-theme--dark .modern-drawer {
  background: linear-gradient(180deg, #0D47A1, #1565C0, #1976D2) !important;
}

.v-theme--dark .app-bar-modern {
  background: rgba(18, 18, 18, 0.8) !important;
  backdrop-filter: blur(20px);
}
</style>