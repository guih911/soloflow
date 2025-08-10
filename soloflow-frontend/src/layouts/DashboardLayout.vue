<template>
  <v-app>
    <!-- App Bar -->
    <v-app-bar
      color="primary"
      elevation="2"
      app
      height="64"
    >
      <v-app-bar-nav-icon @click="drawer = !drawer" />
      
      <v-app-bar-title class="font-weight-bold">
        SoloFlow
      </v-app-bar-title>

      <v-spacer />

      <!-- Seletor de Empresa -->
      <v-menu 
        v-if="companies.length > 1"
        offset-y
        class="mr-4"
      >
        <template v-slot:activator="{ props }">
          <v-btn v-bind="props" variant="text" class="text-none">
            <v-icon start>mdi-domain</v-icon>
            {{ currentCompany?.name }}
            <v-icon end>mdi-chevron-down</v-icon>
          </v-btn>
        </template>

        <v-list min-width="250">
          <v-list-subheader>Trocar empresa</v-list-subheader>
          <v-list-item
            v-for="company in companies"
            :key="company.companyId"
            @click="switchCompany(company.companyId)"
            :active="company.companyId === currentCompany?.companyId"
          >
            <template v-slot:prepend>
              <v-icon :color="company.companyId === currentCompany?.companyId ? 'primary' : 'grey'">
                mdi-domain
              </v-icon>
            </template>
            <v-list-item-title>{{ company.name }}</v-list-item-title>
            <v-list-item-subtitle>{{ getRoleText(company.role) }}</v-list-item-subtitle>
            <template v-slot:append>
              <v-icon v-if="company.companyId === currentCompany?.companyId">
                mdi-check
              </v-icon>
            </template>
          </v-list-item>
        </v-list>
      </v-menu>

      <!-- User Menu -->
      <v-menu offset-y>
        <template v-slot:activator="{ props }">
          <v-btn v-bind="props" variant="text" class="text-none">
            <v-avatar size="32" class="mr-2" color="white">
              <span class="text-primary font-weight-bold">
                {{ getUserInitials(user?.name) }}
              </span>
            </v-avatar>
            <span class="d-none d-sm-inline">{{ user?.name }}</span>
            <v-icon end>mdi-chevron-down</v-icon>
          </v-btn>
        </template>

        <v-list min-width="200">
          <v-list-item>
            <v-list-item-title class="text-caption text-medium-emphasis">
              {{ user?.email }}
            </v-list-item-title>
            <v-list-item-subtitle class="text-caption">
              {{ currentCompany?.name }} - {{ getRoleText(currentCompany?.role) }}
            </v-list-item-subtitle>
          </v-list-item>
          
          <v-divider class="my-1" />
          
          <v-list-item @click="goToProfile">
            <template v-slot:prepend>
              <v-icon color="primary" size="small">mdi-account</v-icon>
            </template>
            <v-list-item-title>Meu Perfil</v-list-item-title>
          </v-list-item>
          
          <v-list-item @click="goToSettings" v-if="user?.role === 'ADMIN'">
            <template v-slot:prepend>
              <v-icon color="primary" size="small">mdi-cog</v-icon>
            </template>
            <v-list-item-title>Configurações</v-list-item-title>
          </v-list-item>
          
          <v-divider class="my-1" />
          
          <v-list-item @click="handleLogout" class="text-error">
            <template v-slot:prepend>
              <v-icon color="error" size="small">mdi-logout</v-icon>
            </template>
            <v-list-item-title>Sair do Sistema</v-list-item-title>
          </v-list-item>
        </v-list>
      </v-menu>
    </v-app-bar>

    <!-- Navigation Drawer -->
    <v-navigation-drawer 
      v-model="drawer" 
      app 
      :width="250"
      style="top: 64px !important; height: calc(100vh - 64px) !important;"
    >
      <v-list nav density="compact" class="pt-4">
        <!-- Dashboard -->
        <v-list-item 
          :to="{ name: 'Dashboard' }"
          class="mx-3 my-1"
          rounded="xl"
        >
          <template v-slot:prepend>
            <v-icon size="20">mdi-view-dashboard</v-icon>
          </template>
          <v-list-item-title class="text-body-2">Dashboard</v-list-item-title>
        </v-list-item>

        <!-- ✨ Criar Processo - ATUALIZADO -->
        <v-list-item 
          :to="{ name: 'Processes' }"
          class="mx-3 my-1"
          rounded="xl"
        >
          <template v-slot:prepend>
            <v-icon size="20">mdi-rocket-launch</v-icon>
          </template>
          <v-list-item-title class="text-body-2">Criar Processo</v-list-item-title>
        </v-list-item>

        <!-- Gerenciar Processos -->
        <v-list-item 
          v-if="canAccess(['ADMIN', 'MANAGER'])"
          :to="{ name: 'ManageProcesses' }"
          class="mx-3 my-1"
          rounded="xl"
        >
          <template v-slot:prepend>
            <v-icon size="20">mdi-clipboard-edit</v-icon>
          </template>
          <v-list-item-title class="text-body-2">Gerenciar Processos</v-list-item-title>
        </v-list-item>

        <!-- Minhas Tarefas -->
        <v-list-item 
          :to="{ name: 'MyTasks' }"
          class="mx-3 my-1"
          rounded="xl"
        >
          <template v-slot:prepend>
            <v-icon size="20">mdi-clipboard-text</v-icon>
          </template>
          <v-list-item-title class="text-body-2">Minhas Tarefas</v-list-item-title>
        </v-list-item>

        <!-- Assinaturas Pendentes -->
        <v-list-item 
          :to="{ name: 'PendingSignatures' }"
          class="mx-3 my-1"
          rounded="xl"
        >
          <template v-slot:prepend>
            <v-icon size="20">mdi-draw-pen</v-icon>
          </template>
          <v-list-item-title class="text-body-2">Assinaturas Pendentes</v-list-item-title>
        </v-list-item>

        <v-divider class="my-3" />

        <!-- Configurações (apenas para ADMIN/MANAGER) -->
        <v-list-subheader v-if="canAccess(['ADMIN', 'MANAGER'])">
          CONFIGURAÇÕES
        </v-list-subheader>

        <!-- Tipos de Processo -->
        <v-list-item 
          v-if="canAccess(['ADMIN', 'MANAGER'])"
          :to="{ name: 'ProcessTypes' }"
          class="mx-3 my-1"
          rounded="xl"
        >
          <template v-slot:prepend>
            <v-icon size="20">mdi-file-cog</v-icon>
          </template>
          <v-list-item-title class="text-body-2">Tipos de Processo</v-list-item-title>
        </v-list-item>

        <!-- Setores -->
        <v-list-item 
          v-if="canAccess(['ADMIN', 'MANAGER'])"
          :to="{ name: 'Sectors' }"
          class="mx-3 my-1"
          rounded="xl"
        >
          <template v-slot:prepend>
            <v-icon size="20">mdi-office-building</v-icon>
          </template>
          <v-list-item-title class="text-body-2">Setores</v-list-item-title>
        </v-list-item>

        <!-- Usuários -->
        <v-list-item 
          v-if="canAccess(['ADMIN', 'MANAGER'])"
          :to="{ name: 'Users' }"
          class="mx-3 my-1"
          rounded="xl"
        >
          <template v-slot:prepend>
            <v-icon size="20">mdi-account-group</v-icon>
          </template>
          <v-list-item-title class="text-body-2">Usuários</v-list-item-title>
        </v-list-item>

        <!-- Empresas -->
        <v-list-item 
          v-if="canAccess(['ADMIN'])"
          :to="{ name: 'Companies' }"
          class="mx-3 my-1"
          rounded="xl"
        >
          <template v-slot:prepend>
            <v-icon size="20">mdi-domain</v-icon>
          </template>
          <v-list-item-title class="text-body-2">Empresas</v-list-item-title>
        </v-list-item>
      </v-list>
    </v-navigation-drawer>

    <!-- Main Content -->
    <v-main style="padding-top: 64px !important;">
      <div style="padding: 24px;">
        <router-view />
      </div>
    </v-main>

    <!-- Snackbar Global -->
    <v-snackbar
      v-model="snackbar.show"
      :color="snackbar.color"
      :timeout="3000"
      location="top right"
    >
      {{ snackbar.message }}
      <template v-slot:actions>
        <v-btn
          variant="text"
          @click="snackbar.show = false"
        >
          Fechar
        </v-btn>
      </template>
    </v-snackbar>
  </v-app>
</template>

<script setup>
import { ref, computed, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const drawer = ref(true)
const user = computed(() => authStore.user)
const currentCompany = computed(() => authStore.activeCompany)
const companies = computed(() => authStore.companies)

// Snackbar global
const snackbar = reactive({
  show: false,
  message: '',
  color: 'success'
})

// Expor método global para mostrar snackbar
window.showSnackbar = (message, color = 'success') => {
  snackbar.message = message
  snackbar.color = color
  snackbar.show = true
}

// Métodos de navegação
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
    window.showSnackbar?.('Erro ao trocar empresa', 'error')
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

// Auxiliares
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
</script>

<style scoped>
.v-list-item {
  cursor: pointer !important;
}

.v-list-item:hover {
  background-color: rgba(var(--v-theme-primary), 0.08) !important;
}

.v-list-item--active {
  background-color: rgba(var(--v-theme-primary), 0.12) !important;
  color: rgb(var(--v-theme-primary)) !important;
}
</style>