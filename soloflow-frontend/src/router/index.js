import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

// Layouts
import AuthLayout from '@/layouts/AuthLayout.vue'
import DashboardLayout from '@/layouts/DashboardLayout.vue'

// Views
import Login from '@/views/auth/Login.vue'
import Register from '@/views/auth/Register.vue'
import Dashboard from '@/views/Dashboard.vue'
import Companies from '@/views/companies/Companies.vue'
import Users from '@/views/users/Users.vue'
import ProcessTypes from '@/views/processes/ProcessTypes.vue'
import Processes from '@/views/processes/Processes.vue'

const routes = [
  {
    path: '/',
    redirect: '/dashboard',
  },
  {
    path: '/login',
    component: AuthLayout,
    children: [
      {
        path: '',
        name: 'Login',
        component: Login,
        meta: { requiresGuest: true },
      },
    ],
  },
  {
    path: '/register',
    component: AuthLayout,
    children: [
      {
        path: '',
        name: 'Register',
        component: Register,
        meta: { requiresGuest: true },
      },
    ],
  },
  {
    path: '/dashboard',
    component: DashboardLayout,
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        name: 'Dashboard',
        component: Dashboard,
      },
      {
        path: '/companies',
        name: 'Companies',
        component: Companies,
        meta: { requiresRole: ['ADMIN'] },
      },
      {
        path: '/users',
        name: 'Users',
        component: Users,
        meta: { requiresRole: ['ADMIN', 'MANAGER'] },
      },
      {
        path: '/process-types',
        name: 'ProcessTypes',
        component: ProcessTypes,
        meta: { requiresRole: ['ADMIN', 'MANAGER'] },
      },
      {
        path: '/processes',
        name: 'Processes',
        component: Processes,
      },
    ],
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/dashboard',
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

// Navigation guards
router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()
  
  // Inicializar auth do localStorage
  if (!authStore.user) {
    authStore.initializeAuth()
  }

  const isAuthenticated = authStore.isAuthenticated
  const userRole = authStore.userRole

  // Rota requer autenticação
  if (to.meta.requiresAuth && !isAuthenticated) {
    next('/login')
    return
  }

  // Rota requer que seja visitante (não autenticado)
  if (to.meta.requiresGuest && isAuthenticated) {
    next('/dashboard')
    return
  }

  // Rota requer role específica
  if (to.meta.requiresRole) {
    const allowedRoles = to.meta.requiresRole
    if (!allowedRoles.includes(userRole)) {
      next('/dashboard')
      return
    }
  }

  next()
})

export default router