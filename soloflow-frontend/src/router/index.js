import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

// Layouts
import AuthLayout from '@/layouts/AuthLayout.vue'
import DashboardLayout from '@/layouts/DashboardLayout.vue'

// Views - Auth
import Login from '@/views/auth/Login.vue'


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
import Profiles from '@/views/profiles/Profiles.vue'

// Views - Processes
import Processes from '@/views/processes/Processes.vue'
import CreateProcess from '@/views/processes/CreateProcess.vue' // ✅ ADICIONADO
import ProcessDetail from '@/views/processes/ProcessDetail.vue'
import StepExecution from '@/views/processes/StepExecution.vue'
import ManageProcesses from '@/views/processes/ManageProcesses.vue'
import MyProcesses from '@/views/processes/MyProcesses.vue'

// Views - Tasks
import MyTasks from '@/views/tasks/MyTasks.vue'

// Views - Profile
import Profile from '@/views/users/Profile.vue'

// Views - Signatures
import PendingSignatures from '@/views/signatures/PendingSignatures.vue'

// Views - Public
import ValidateSignature from '@/views/public/ValidateSignature.vue'

// Views - Settings
import Settings from '@/views/settings/Settings.vue'

/**
 * Encontra a primeira rota disponível para o usuário baseado em suas permissões
 * Segue EXATAMENTE a ordem do menu lateral (sidebar) no DashboardLayout.vue
 * @param {Object} authStore - Store de autenticação
 * @returns {string} - Path da primeira rota disponível
 */
function findFirstAvailableRoute(authStore) {
  // Ordem de prioridade EXATA do menu lateral (sidebar)
  const routePriority = [
    // === SEÇÃO PRINCIPAL ===
    { path: '/dashboard', permission: { resource: 'dashboard', action: 'view' } },
    { path: '/processes', permission: { resource: 'processes', action: 'create' } },
    { path: '/manage-processes', permission: { resource: 'processes', action: 'manage' } },
    { path: '/my-tasks', permission: { resource: 'tasks', action: 'view' } },
    { path: '/my-processes', permission: { resource: 'processes', action: 'view' } },
    { path: '/signatures/pending', permission: { resource: 'signatures', action: 'view' } },
    // === SEÇÃO CONFIGURAÇÕES ===
    { path: '/process-types', permission: { resource: 'process_types', action: 'manage' } },
    { path: '/sectors', permission: { resource: 'sectors', action: 'manage' } },
    { path: '/users', permission: { resource: 'users', action: 'manage' } },
    { path: '/profiles', permission: { resource: 'profiles', action: 'manage' } },
    { path: '/companies', permission: { resource: 'companies', action: 'manage' } },
    // === FALLBACK FINAL ===
    { path: '/profile', permission: null }, // Sempre disponível
  ]

  for (const route of routePriority) {
    if (!route.permission) {
      return route.path
    }

    const hasPerm = authStore.hasPermission(route.permission.resource, route.permission.action)

    if (hasPerm) {
      return route.path
    }
  }

  return '/profile'
}

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

  // ROTAS PÚBLICAS (sem autenticação)
  {
    path: '/validar-assinatura',
    name: 'ValidateSignature',
    component: ValidateSignature,
    meta: {
      requiresAuth: false,
      title: 'Validar Assinatura Digital',
      public: true
    }
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
        meta: {
          requiresPermission: { resource: 'dashboard', action: 'view' },
          title: 'Dashboard',
          description: 'Painel de controle'
        }
      },

      // EMPRESAS
      {
        path: '/companies',
        name: 'Companies',
        component: Companies,
        meta: { requiresPermission: { resource: 'companies', action: 'manage' } },
      },

      // USUÁRIOS
      {
        path: '/users',
        name: 'Users',
        component: Users,
        meta: { requiresPermission: { resource: 'users', action: 'manage' } },
      },

      // SETORES
      {
        path: '/sectors',
        name: 'Sectors',
        component: Sectors,
        meta: { requiresPermission: { resource: 'sectors', action: 'manage' } },
      },

      // TIPOS DE PROCESSO
      {
        path: '/process-types',
        name: 'ProcessTypes',
        component: ProcessTypes,
        meta: { requiresPermission: { resource: 'process_types', action: 'manage' } },
      },
      {
        path: '/process-types/new',
        name: 'ProcessTypeNew',
        component: ProcessTypeEditor,
        meta: { requiresPermission: { resource: 'process_types', action: 'manage' } },
      },
      {
        path: '/process-types/:id/edit',
        name: 'ProcessTypeEdit',
        component: ProcessTypeEditor,
        meta: { requiresPermission: { resource: 'process_types', action: 'manage' } },
        props: true,
      },

      // PERFIS
      {
        path: '/profiles',
        name: 'Profiles',
        component: Profiles,
        meta: { requiresPermission: { resource: 'profiles', action: 'manage' } },
      },

      // PROCESSOS - ✅ SEÇÃO MELHORADA
      {
        path: '/processes',
        name: 'Processes',
        component: Processes,
        meta: { 
          title: 'Processos Disponíveis',
          description: 'Escolha um tipo de processo para iniciar'
        }
      },
      {
        path: '/processes/create',
        name: 'CreateProcess',
        component: CreateProcess,
        meta: {
          title: 'Criar Novo Processo',
          description: 'Iniciar um novo workflow'
        }
      },
      {
        path: '/processes/create/:typeId',
        name: 'CreateProcessWithType',
        component: CreateProcess,
        props: true,
        meta: {
          title: 'Criar Processo',
          description: 'Iniciar processo com tipo pré-selecionado'
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
          requiresPermission: { resource: 'processes', action: 'manage' },
          title: 'Gerenciar Processos',
          description: 'Acompanhar todos os processos da empresa'
        },
      },

      // MEUS PROCESSOS
      {
        path: '/my-processes',
        name: 'MyProcesses',
        component: MyProcesses,
        meta: {
          title: 'Meus Processos',
          description: 'Processos que você criou ou participa'
        }
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
          requiresPermission: { resource: 'settings', action: 'manage' },
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
    name: 'NotFound',
    beforeEnter: (to, from, next) => {
      const authStore = useAuthStore()
      if (authStore.isAuthenticated) {
        const firstAvailableRoute = findFirstAvailableRoute(authStore)
        next(firstAvailableRoute)
      } else {
        next('/login')
      }
    },
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()

  if (!authStore.user && localStorage.getItem('token')) {
    try {
      authStore.initializeAuth()
    } catch (error) {
      localStorage.clear()
    }
  }

  const isAuthenticated = authStore.isAuthenticated
  const userRole = authStore.userRole

  if (to.meta.public === true || to.meta.requiresAuth === false) {
    next()
    return
  }

  if (to.meta.requiresAuth && !isAuthenticated) {
    sessionStorage.setItem('redirectAfterLogin', to.fullPath)
    next('/login')
    return
  }

  if (to.meta.requiresGuest && isAuthenticated) {
    const firstAvailableRoute = findFirstAvailableRoute(authStore)
    next(firstAvailableRoute)
    return
  }

  if ((to.meta.requiresPermission || to.meta.requiresPermissions) && isAuthenticated) {
    const rawRequirements = to.meta.requiresPermission ?? to.meta.requiresPermissions
    const requirements = Array.isArray(rawRequirements) ? rawRequirements : [rawRequirements]
    const hasPermission = requirements.some((requirement) => {
      if (!requirement) {
        return false
      }

      if (typeof requirement === 'string') {
        return authStore.hasPermission(requirement)
      }

      if (typeof requirement === 'object') {
        return authStore.hasPermission(requirement.resource, requirement.action)
      }

      return false
    })

    if (!hasPermission) {
      if (window.showSnackbar) {
        window.showSnackbar('Acesso negado. Redirecionando para página disponível...', 'warning')
      }
      const firstAvailableRoute = findFirstAvailableRoute(authStore)
      next(firstAvailableRoute)
      return
    }
  }

  if (to.meta.requiresRole && isAuthenticated) {
    const allowedRoles = Array.isArray(to.meta.requiresRole)
      ? to.meta.requiresRole
      : [to.meta.requiresRole]

    if (!allowedRoles.includes(userRole)) {
      if (window.showSnackbar) {
        window.showSnackbar('Acesso negado. Redirecionando para página disponível...', 'warning')
      }

      const firstAvailableRoute = findFirstAvailableRoute(authStore)
      next(firstAvailableRoute)
      return
    }
  }

  if (to.meta.requiresAuth && isAuthenticated) {
    const activeCompany = authStore.activeCompany
    if (!activeCompany) {
      if (window.showSnackbar) {
        window.showSnackbar('Erro: nenhuma empresa ativa encontrada', 'error')
      }
      const firstAvailableRoute = findFirstAvailableRoute(authStore)
      next(firstAvailableRoute)
      return
    }
  }

  if (to.path === '/' && isAuthenticated) {
    const firstAvailableRoute = findFirstAvailableRoute(authStore)
    next(firstAvailableRoute)
    return
  }

  next()
})

router.onError((error) => {
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

router.beforeResolve((to, from, next) => {
  if (to.meta.title) {
    document.title = `${to.meta.title} - SoloFlow`
  } else {
    document.title = 'SoloFlow - Gestão de Processos'
  }
  
  next()
})

export default router
