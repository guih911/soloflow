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

      <!-- User Menu -->
      <v-menu offset-y>
        <template v-slot:activator="{ props }">
          <v-btn v-bind="props" variant="text" class="text-none">
            <v-avatar size="32" class="mr-2" color="white">
              <span class="text-primary font-weight-bold">U</span>
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
          </v-list-item>
          
          <v-divider class="my-1" />
          
          <v-list-item @click="goToProfile">
            <template v-slot:prepend>
              <v-icon color="primary" size="small">mdi-account</v-icon>
            </template>
            <v-list-item-title>Meu Perfil</v-list-item-title>
          </v-list-item>
          
          <v-list-item @click="goToSettings">
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
          @click="goTo('/dashboard')"
          class="mx-3 my-1"
          rounded="xl"
        >
          <template v-slot:prepend>
            <v-icon size="20">mdi-view-dashboard</v-icon>
          </template>
          <v-list-item-title class="text-body-2">Dashboard</v-list-item-title>
        </v-list-item>

          <!-- Processos -->
        <v-list-item 
          @click="goTo('/processes')"
          class="mx-3 my-1"
          rounded="xl"
        >
          <template v-slot:prepend>
            <v-icon size="20">mdi-clipboard-list</v-icon>
          </template>
          <v-list-item-title class="text-body-2">Processos</v-list-item-title>
        </v-list-item>


        <!-- Gerenciar Processos -->
        <v-list-item 
          @click="goTo('/manageprocesses')"
          class="mx-3 my-1"
          rounded="xl"
        >
          <template v-slot:prepend>
            <v-icon size="20">mdi-clipboard-edit</v-icon>
          </template>
          <v-list-item-title class="text-body-2">Gerenciar Processos</v-list-item-title>
        </v-list-item>

        <!-- Tipos de Processo -->
        <v-list-item 
          @click="goTo('/process-types')"
          class="mx-3 my-1"
          rounded="xl"
        >
          <template v-slot:prepend>
            <v-icon size="20">mdi-file-cog</v-icon>
          </template>
          <v-list-item-title class="text-body-2">Tipos de Processo</v-list-item-title>
        </v-list-item>

        <!-- Tasks -->
        <v-list-item 
          @click="goTo('/mytasks')"
          class="mx-3 my-1"
          rounded="xl"
        >
          <template v-slot:prepend>
            <v-icon size="20">mdi-clipboard-text</v-icon>
          </template>
          <v-list-item-title class="text-body-2">Minhas Tarefas</v-list-item-title>
        </v-list-item>


        <!-- Setores -->
        <v-list-item 
          @click="goTo('/sectors')"
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
          @click="goTo('/users')"
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
          @click="goTo('/companies')"
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
  </v-app>
</template>

<script setup>
import { useAuthStore } from '@/stores/auth'
import { ref,computed } from 'vue'

const authStore = useAuthStore()
const drawer = ref(true)
const user = computed(() => authStore.user)

// Função simples de navegação
function goTo(path) {
  console.log('Indo para:', path)
  try {
    window.location.href = path
  } catch (error) {
    console.error('Erro na navegação:', error)
  }
}

// Funções do menu do usuário
function goToProfile() {
  console.log('Ir para perfil')
  goTo('/profile')
}

function goToSettings() {
  console.log('Ir para configurações')
  goTo('/settings')
}

function handleLogout() {
  
  

    // Limpar dados
    localStorage.clear()
    sessionStorage.clear()
    
    // Redirecionar
    window.location.href = '/login'
  
}
</script>

<style scoped>
.v-list-item {
  cursor: pointer !important;
}

.v-list-item:hover {
  background-color: rgba(var(--v-theme-primary), 0.08) !important;
}
</style>