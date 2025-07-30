<template>
  <v-app>
    <!-- App Bar -->
    <v-app-bar
      color="primary"
      elevation="0"
      class="app-bar"
    >
      <v-app-bar-nav-icon
        @click="drawer = !drawer"
        class="d-lg-none"
      />

      <v-app-bar-title class="font-weight-bold">
        SoloFlow
      </v-app-bar-title>

      <v-spacer />

      <!-- User Menu -->
      <v-menu offset-y>
        <template v-slot:activator="{ props }">
          <v-btn
            v-bind="props"
            variant="text"
            class="text-none"
          >
            <v-avatar size="32" class="mr-2">
              <v-icon>mdi-account-circle</v-icon>
            </v-avatar>
            <span class="d-none d-sm-inline">{{ user?.name }}</span>
            <v-icon right>mdi-menu-down</v-icon>
          </v-btn>
        </template>

        <v-list>
          <v-list-item @click="profile">
            <template v-slot:prepend>
              <v-icon>mdi-account</v-icon>
            </template>
            <v-list-item-title>Meu Perfil</v-list-item-title>
          </v-list-item>
          
          <v-divider />
          
          <v-list-item @click="logout">
            <template v-slot:prepend>
              <v-icon>mdi-logout</v-icon>
            </template>
            <v-list-item-title>Sair</v-list-item-title>
          </v-list-item>
        </v-list>
      </v-menu>
    </v-app-bar>

    <!-- Navigation Drawer -->
    <v-navigation-drawer
      v-model="drawer"
      :rail="rail"
      permanent
      @click="rail = false"
      class="navigation-drawer"
    >
      <v-list nav density="comfortable">
        <v-list-item
          v-for="item in visibleMenuItems"
          :key="item.title"
          :to="item.to"
          :prepend-icon="item.icon"
          :title="item.title"
          color="primary"
          rounded="xl"
          class="mx-2 my-1"
        />
      </v-list>

      <template v-slot:append>
        <div class="pa-2">
          <v-btn
            block
            @click="rail = !rail"
            variant="text"
            class="d-none d-lg-flex"
          >
            <v-icon>
              {{ rail ? 'mdi-menu' : 'mdi-menu-open' }}
            </v-icon>
          </v-btn>
        </div>
      </template>
    </v-navigation-drawer>

    <!-- Main Content -->
    <v-main class="main-content">
      <v-container fluid class="pa-4">
        <transition name="fade" mode="out-in">
          <router-view />
        </transition>
      </v-container>
    </v-main>
  </v-app>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const drawer = ref(true)
const rail = ref(false)

const user = computed(() => authStore.user)

const menuItems = [
  {
    title: 'Dashboard',
    icon: 'mdi-view-dashboard',
    to: '/dashboard',
    roles: ['ADMIN', 'MANAGER', 'USER']
  },
  {
    title: 'Processos',
    icon: 'mdi-file-document-multiple',
    to: '/processes',
    roles: ['ADMIN', 'MANAGER', 'USER']
  },
  {
    title: 'Tipos de Processo',
    icon: 'mdi-file-cog',
    to: '/process-types',
    roles: ['ADMIN', 'MANAGER']
  },
  {
    title: 'Usuários',
    icon: 'mdi-account-group',
    to: '/users',
    roles: ['ADMIN', 'MANAGER']
  },
  {
    title: 'Empresas',
    icon: 'mdi-domain',
    to: '/companies',
    roles: ['ADMIN']
  }
]

const visibleMenuItems = computed(() => {
  const userRole = authStore.userRole
  return menuItems.filter(item => item.roles.includes(userRole))
})

onMounted(() => {
  // Ajustar drawer baseado no tamanho da tela
  if (window.innerWidth < 1280) {
    drawer.value = false
  }
})

function profile() {
  router.push('/profile')
}

function logout() {
  authStore.logout()
}
</script>

<style scoped>
.app-bar {
  z-index: 1000 !important;
}

.navigation-drawer {
  padding-top: 64px;
}

.main-content {
  background-color: #f5f5f5;
  min-height: 100vh;
}
</style>
