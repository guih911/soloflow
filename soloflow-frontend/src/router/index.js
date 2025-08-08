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

// Views - Profile
import Profile from '@/views/users/Profile.vue'

// Views - Signatures
import PendingSignatures from '@/views/signatures/PendingSignatures.vue'

// Views - Settings
import Settings from '@/views/settings/Settings.vue'

const routes = [
  // Redirect principal
  {
    path: '/',
    redirect: '/dashboard',
  },

  // ROTAS DE AUTENTICAÇÃO
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

  // ROTAS DO DASHBOARD (todas protegidas)
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

      // EMPRESAS
      {
        path: '/companies',
        name: 'Companies',
        component: Companies,
        meta: { requiresRole: ['ADMIN'] },
      },

      // USUÁRIOS
      {
        path: '/users',
        name: 'Users',
        component: Users,
        meta: { requiresRole: ['ADMIN', 'MANAGER'] },
      },

      // SETORES
      {
        path: '/sectors',
        name: 'Sectors',
        component: Sectors,
        meta: { requiresRole: ['ADMIN', 'MANAGER'] },
      },

      // TIPOS DE PROCESSO
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
        props: true,
      },

      // PROCESSOS - SEÇÃO CORRIGIDA E EXPANDIDA
      {
        path: '/processes',
        name: 'Processes',
        component: Processes,
        meta: { 
          title: 'Criar Processo',
          description: 'Iniciar um novo workflow'
        }
      },
      {
        path: '/processes/:id',
        name: 'ProcessDetail',
        component: ProcessDetail,
        props: true,
        meta: {
          title: 'Detalhes do Processo',
          description: 'Visualizar informações e progresso'
        }
      },
      {
        path: '/processes/:id/execute/:stepId',
        name: 'StepExecution',
        component: StepExecution,
        props: true,
        meta: {
          title: 'Executar Etapa',
          description: 'Completar uma etapa do processo'
        }
      },

      // GERENCIAR PROCESSOS
      {
        path: '/manage-processes',
        name: 'ManageProcesses',
        component: ManageProcesses,
        meta: { 
          requiresRole: ['ADMIN', 'MANAGER'],
          title: 'Gerenciar Processos',
          description: 'Acompanhar todos os processos da empresa'
        },
      },

      // MINHAS TAREFAS
      {
        path: '/my-tasks',
        name: 'MyTasks',
        component: MyTasks,
        meta: {
          title: 'Minhas Tarefas',
          description: 'Etapas pendentes de execução'
        }
      },

      // ASSINATURAS PENDENTES
      {
        path: '/signatures/pending',
        name: 'PendingSignatures',
        component: PendingSignatures,
        meta: {
          title: 'Assinaturas Pendentes',
          description: 'Documentos aguardando assinatura'
        }
      },

      // PERFIL DO USUÁRIO
      {
        path: '/profile',
        name: 'Profile',
        component: Profile,
        meta: {
          title: 'Meu Perfil',
          description: 'Configurações da conta'
        }
      },

      // CONFIGURAÇÕES
      {
        path: '/settings',
        name: 'Settings',
        component: Settings,
        meta: { 
          requiresRole: ['ADMIN'],
          title: 'Configurações',
          description: 'Configurações do sistema'
        },
      },

      // ALIASES PARA COMPATIBILIDADE
      {
        path: '/mytasks',
        redirect: '/my-tasks'
      },
      {
        path: '/manageprocesses',
        redirect: '/manage-processes'
      }
    ],
  },

  // Catch-all para rotas inexistentes
  {
    path: '/:pathMatch(.*)*',
    redirect: '/dashboard',
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

// Navigation guards melhorados
router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()
  
  // Inicializar auth do localStorage se necessário
  if (!authStore.user && localStorage.getItem('token')) {
    try {
      authStore.initializeAuth()
    } catch (error) {
      console.error('Error initializing auth:', error)
      localStorage.clear()
    }
  }

  const isAuthenticated = authStore.isAuthenticated
  const userRole = authStore.userRole

  // Debug
  console.log('Navigation Guard:', {
    to: to.path,
    isAuthenticated,
    userRole,
    requiresAuth: to.meta.requiresAuth,
    requiresGuest: to.meta.requiresGuest,
    requiresRole: to.meta.requiresRole
  })

  // Rota requer autenticação
  if (to.meta.requiresAuth && !isAuthenticated) {
    console.log('Redirecting to login - not authenticated')
    // Salvar destino para redirect após login
    sessionStorage.setItem('redirectAfterLogin', to.fullPath)
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
      
      // Mostrar mensagem de erro se disponível
      if (window.showSnackbar) {
        window.showSnackbar('Acesso negado. Você não tem permissão para acessar esta página.', 'error')
      }
      
      next('/dashboard')
      return
    }
  }

  // Verificar se empresa está ativa (para rotas autenticadas)
  if (to.meta.requiresAuth && isAuthenticated) {
    const activeCompany = authStore.activeCompany
    if (!activeCompany) {
      console.log('No active company - redirecting to dashboard')
      if (window.showSnackbar) {
        window.showSnackbar('Erro: nenhuma empresa ativa encontrada', 'error')
      }
      next('/dashboard')
      return
    }
  }

  next()
})

// Interceptar erros de navegação
router.onError((error) => {
  console.error('Router error:', error)
  
  if (window.showSnackbar) {
    if (error.message.includes('Failed to fetch')) {
      window.showSnackbar('Erro de conexão. Verifique sua internet.', 'error')
    } else if (error.message.includes('404')) {
      window.showSnackbar('Página não encontrada.', 'error')
    } else {
      window.showSnackbar('Erro de navegação. Tente novamente.', 'error')
    }
  }
})

// Meta dados globais para debugging
router.beforeResolve((to, from, next) => {
  // Adicionar título da página se especificado
  if (to.meta.title) {
    document.title = `${to.meta.title} - SoloFlow`
  } else {
    document.title = 'SoloFlow - Gestão de Processos'
  }
  
  next()
})

export default router