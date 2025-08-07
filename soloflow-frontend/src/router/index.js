import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

// Layouts
import AuthLayout from '@/layouts/AuthLayout.vue'
import DashboardLayout from '@/layouts/DashboardLayout.vue'

// Views - Auth
import Login from '@/views/auth/Login.vue'
import Register from '@/views/auth/Register.vue'

// Views - Dashboard
import Dashboard from '@/views/Dashboard.vue'

// Views - Companies
import Companies from '@/views/companies/Companies.vue'

// Views - Users
import Users from '@/views/users/Users.vue'

// Views - Sectors
import Sectors from '@/views/sectors/Sectors.vue'

// Views - Process Types
import ProcessTypes from '@/views/processes/ProcessTypes.vue'
import ProcessTypeEditor from '@/views/processes/ProcessTypeEditor.vue'

// Views - Processes
import Processes from '@/views/processes/Processes.vue'
import ProcessDetail from '@/views/processes/ProcessDetail.vue'
import StepExecution from '@/views/processes/StepExecution.vue'
import ManageProcesses from '@/views/processes/ManageProcesses.vue'

// Views - Tasks
import MyTasks from '@/views/tasks/MyTasks.vue'


//Views - Profile
import Profile from '@/views/users/Profile.vue'

//Views - signatures
import PendingSignatures from '@/views/signatures/PendingSignatures.vue'

//views - sttings
import Settings from '@/views/settings/Settings.vue'

const routes = [
  // ✅ Redirect principal
  {
    path: '/',
    redirect: '/dashboard',
  },

  // ✅ ROTAS DE AUTENTICAÇÃO
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

  // ✅ ROTAS DO DASHBOARD (todas protegidas)
  {
    path: '/dashboard',
    component: DashboardLayout,
    meta: { requiresAuth: true },
    children: [
      // Dashboard Principal
      {
        path: '',
        name: 'Dashboard',
        component: Dashboard,
      },

      // ✅ EMPRESAS
      {
        path: '/companies',
        name: 'Companies',
        component: Companies,
        meta: { requiresRole: ['ADMIN'] },
      },

      // ✅ USUÁRIOS
      {
        path: '/users',
        name: 'Users',
        component: Users,
        meta: { requiresRole: ['ADMIN', 'MANAGER'] },
      },

      // ✅ SETORES (SEM DUPLICAÇÃO)
      {
        path: '/sectors',
        name: 'Sectors',
        component: Sectors,
        meta: { requiresRole: ['ADMIN', 'MANAGER'] },
      },

      // ✅ TIPOS DE PROCESSO (SEM DUPLICAÇÃO)
      {
        path: '/process-types',
        name: 'ProcessTypes',
        component: ProcessTypes,
        meta: { requiresRole: ['ADMIN', 'MANAGER'] },
      },
      {
        path: '/process-types/new',
        name: 'ProcessTypeNew',
        component: ProcessTypeEditor,
        meta: { requiresRole: ['ADMIN', 'MANAGER'] },
      },
      {
        path: '/process-types/:id/edit',
        name: 'ProcessTypeEdit',
        component: ProcessTypeEditor,
        meta: { requiresRole: ['ADMIN', 'MANAGER'] },
      },

      // ✅ PROCESSOS
      {
        path: '/processes',
        name: 'Processes',
        component: Processes,
      },
      {
        path: '/processes/:id',
        name: 'ProcessDetail',
        component: ProcessDetail,
      },
      {
        path: '/processes/:id/execute/:stepId',
        name: 'StepExecution',
        component: StepExecution,
      },

      // ✅ GERENCIAR PROCESSOS
      {
        path: '/manageprocesses',
        name: 'ManageProcesses',
        component: ManageProcesses,
        meta: { requiresRole: ['ADMIN', 'MANAGER'] },
      },

      // ✅ MINHAS TAREFAS
      {
        path: '/mytasks',
        name: 'MyTasks',
        component: MyTasks,
      },

      // ✅ NOVAS ROTAS - Assinaturas Pendentes
      {
        path: '/signatures/pending',
        name: 'PendingSignatures',
        component:PendingSignatures ,
      },

      // ✅ NOVA ROTA - Perfil do Usuário
      {
        path: '/profile',
        name: 'Profile',
        component:Profile ,
      },

      // ✅ NOVA ROTA - Configurações
      {
        path: '/settings',
        name: 'Settings',
        component: Settings,
        meta: { requiresRole: ['ADMIN'] },
      },
    ],
  },

  // ✅ Catch-all para rotas inexistentes
  {
    path: '/:pathMatch(.*)*',
    redirect: '/dashboard',
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

// ✅ MELHORADO: Navigation guards
router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()
  
  // Inicializar auth do localStorage se necessário
  if (!authStore.user && localStorage.getItem('token')) {
    authStore.initializeAuth()
  }

  const isAuthenticated = authStore.isAuthenticated
  const userRole = authStore.userRole

  // Rota requer autenticação
  if (to.meta.requiresAuth && !isAuthenticated) {
    console.log('Redirecting to login - not authenticated')
    next('/login')
    return
  }

  // Rota requer que seja visitante (não autenticado)
  if (to.meta.requiresGuest && isAuthenticated) {
    console.log('Redirecting to dashboard - already authenticated')
    next('/dashboard')
    return
  }

  // Rota requer role específica
  if (to.meta.requiresRole && isAuthenticated) {
    const allowedRoles = Array.isArray(to.meta.requiresRole) 
      ? to.meta.requiresRole 
      : [to.meta.requiresRole]
    
    if (!allowedRoles.includes(userRole)) {
      console.log(`Access denied - user role ${userRole} not in ${allowedRoles}`)
      // Mostrar mensagem de erro
      if (window.showSnackbar) {
        window.showSnackbar('Acesso negado. Você não tem permissão para acessar esta página.', 'error')
      }
      next('/dashboard')
      return
    }
  }

  next()
})

// ✅ Tratar erros de navegação
router.onError((error) => {
  console.error('Router error:', error)
  if (window.showSnackbar) {
    window.showSnackbar('Erro de navegação. Tente novamente.', 'error')
  }
})

export default router