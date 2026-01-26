import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

// Layouts
import AuthLayout from '@/layouts/AuthLayout.vue'
import DashboardLayout from '@/layouts/DashboardLayout.vue'

// Views - Auth
import Login from '@/views/auth/Login.vue'
import ForgotPassword from '@/views/auth/ForgotPassword.vue'
import ResetPassword from '@/views/auth/ResetPassword.vue'


// Views - Dashboard
import Dashboard from '@/views/Dashboard.vue'

// Views - Companies
import Companies from '@/views/companies/Companies.vue'

// Views - Users
import Users from '@/views/users/Users.vue'
import UserEditor from '@/views/users/UserEditor.vue'

// Views - Sectors
import Sectors from '@/views/sectors/Sectors.vue'

// Views - Process Types
import ProcessTypes from '@/views/processes/ProcessTypes.vue'
import ProcessTypeEditor from '@/views/processes/ProcessTypeEditor.vue'
import Profiles from '@/views/profiles/Profiles.vue'
import ProfileEditor from '@/views/profiles/ProfileEditor.vue'

// Views - Processes
import Processes from '@/views/processes/Processes.vue'
import CreateProcess from '@/views/processes/CreateProcess.vue' 
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

// Views - Reports
import Reports from '@/views/reports/Reports.vue'

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
    { path: '/painel', permission: { resource: 'dashboard', action: 'view' } },
    { path: '/processos', permission: { resource: 'processes', action: 'create' } },
    { path: '/gerenciar-processos', permission: { resource: 'processes', action: 'manage' } },
    { path: '/minhas-tarefas', permission: { resource: 'tasks', action: 'view' } },
    { path: '/meus-processos', permission: { resource: 'processes', action: 'view' } },
    { path: '/assinaturas/pendentes', permission: { resource: 'signatures', action: 'view' } },
    { path: '/relatorios', permission: { resource: 'reports', action: 'view' } },
    // === SEÇÃO CONFIGURAÇÕES ===
    { path: '/tipos-de-processo', permission: { resource: 'process_types', action: 'manage' } },
    { path: '/setores', permission: { resource: 'sectors', action: 'manage' } },
    { path: '/usuarios', permission: { resource: 'users', action: 'manage' } },
    { path: '/perfis', permission: { resource: 'profiles', action: 'manage' } },
    { path: '/empresas', permission: { resource: 'companies', action: 'manage' } },
    // === FALLBACK FINAL ===
    { path: '/meu-perfil', permission: null }, // Sempre disponível
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

  return '/meu-perfil'
}

const routes = [
  // Redirect principal
  {
    path: '/',
    redirect: '/painel',
  },

  // ROTAS DE AUTENTICAÇÃO
  {
    path: '/entrar',
    component: AuthLayout,
    children: [
      {
        path: '',
        name: 'Entrar',
        component: Login,
        meta: { requiresGuest: true },
      },
    ],
  },
  {
    path: '/esqueci-senha',
    component: AuthLayout,
    children: [
      {
        path: '',
        name: 'EsqueciSenha',
        component: ForgotPassword,
        meta: { requiresGuest: true, title: 'Esqueci Minha Senha' },
      },
    ],
  },
  {
    path: '/redefinir-senha',
    component: AuthLayout,
    children: [
      {
        path: '',
        name: 'RedefinirSenha',
        component: ResetPassword,
        meta: { requiresGuest: true, title: 'Redefinir Senha' },
      },
    ],
  },

  // ROTAS LEGAIS (sem autenticação)
  {
    path: '/politica-de-privacidade',
    component: AuthLayout,
    children: [
      {
        path: '',
        name: 'PoliticaPrivacidade',
        component: () => import('@/views/legal/PrivacyPolicy.vue'),
        meta: { requiresAuth: false, title: 'Política de Privacidade' },
      },
    ],
  },
  {
    path: '/termos-de-uso',
    component: AuthLayout,
    children: [
      {
        path: '',
        name: 'TermosDeUso',
        component: () => import('@/views/legal/TermsOfUse.vue'),
        meta: { requiresAuth: false, title: 'Termos de Uso' },
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

  // ROTAS DO PAINEL (todas protegidas)
  {
    path: '/painel',
    component: DashboardLayout,
    meta: { requiresAuth: true },
    children: [
      // Painel Principal
      {
        path: '',
        name: 'Painel',
        component: Dashboard,
        meta: {
          requiresPermission: { resource: 'dashboard', action: 'view' },
          title: 'Painel',
          description: 'Painel de controle'
        }
      },

      // EMPRESAS
      {
        path: '/empresas',
        name: 'Empresas',
        component: Companies,
        meta: { requiresPermission: { resource: 'companies', action: 'manage' } },
      },

      // USUÁRIOS
      {
        path: '/usuarios',
        name: 'Usuarios',
        component: Users,
        meta: { requiresPermission: { resource: 'users', action: 'manage' } },
      },
      {
        path: '/usuarios/novo',
        name: 'UsuarioNovo',
        component: UserEditor,
        meta: {
          requiresPermission: { resource: 'users', action: 'manage' },
          title: 'Novo Usuário',
          description: 'Criar novo usuário no sistema'
        },
      },
      {
        path: '/usuarios/:id/editar',
        name: 'UsuarioEditar',
        component: UserEditor,
        meta: {
          requiresPermission: { resource: 'users', action: 'manage' },
          title: 'Editar Usuário',
          description: 'Editar usuário existente'
        },
        props: true,
      },

      // SETORES
      {
        path: '/setores',
        name: 'Setores',
        component: Sectors,
        meta: { requiresPermission: { resource: 'sectors', action: 'manage' } },
      },

      // TIPOS DE PROCESSO
      {
        path: '/tipos-de-processo',
        name: 'TiposDeProcesso',
        component: ProcessTypes,
        meta: { requiresPermission: { resource: 'process_types', action: 'manage' } },
      },
      {
        path: '/tipos-de-processo/novo',
        name: 'TipoDeProcessoNovo',
        component: ProcessTypeEditor,
        meta: { requiresPermission: { resource: 'process_types', action: 'manage' } },
      },
      {
        path: '/tipos-de-processo/:id/editar',
        name: 'TipoDeProcessoEditar',
        component: ProcessTypeEditor,
        meta: { requiresPermission: { resource: 'process_types', action: 'manage' } },
        props: true,
      },

      // PERFIS
      {
        path: '/perfis',
        name: 'Perfis',
        component: Profiles,
        meta: { requiresPermission: { resource: 'profiles', action: 'manage' } },
      },
      {
        path: '/perfis/novo',
        name: 'PerfilNovo',
        component: ProfileEditor,
        meta: {
          requiresPermission: { resource: 'profiles', action: 'manage' },
          title: 'Novo Perfil',
          description: 'Criar novo perfil de acesso'
        },
      },
      {
        path: '/perfis/:id/editar',
        name: 'PerfilEditar',
        component: ProfileEditor,
        meta: {
          requiresPermission: { resource: 'profiles', action: 'manage' },
          title: 'Editar Perfil',
          description: 'Editar perfil de acesso'
        },
        props: true,
      },

      // PROCESSOS
      {
        path: '/processos',
        name: 'Processos',
        component: Processes,
        meta: { 
          title: 'Processos Disponíveis',
          description: 'Escolha um tipo de processo para iniciar'
        }
      },
      {
        path: '/processos/criar',
        name: 'CriarProcesso',
        component: CreateProcess,
        meta: {
          title: 'Criar Novo Processo',
          description: 'Iniciar um novo workflow'
        }
      },
      {
        path: '/processos/criar/:typeId',
        name: 'CriarProcessoComTipo',
        component: CreateProcess,
        props: true,
        meta: {
          title: 'Criar Processo',
          description: 'Iniciar processo com tipo pré-selecionado'
        }
      },
      {
        path: '/processos/:id',
        name: 'DetalhesDoProcesso',
        component: ProcessDetail,
        props: true,
        meta: {
          title: 'Detalhes do Processo',
          description: 'Visualizar informações e progresso'
        }
      },
      {
        path: '/processos/:id/executar/:stepId',
        name: 'ExecutarEtapa',
        component: StepExecution,
        props: true,
        meta: {
          title: 'Executar Etapa',
          description: 'Completar uma etapa do processo'
        }
      },

      // GERENCIAR PROCESSOS
      {
        path: '/gerenciar-processos',
        name: 'GerenciarProcessos',
        component: ManageProcesses,
        meta: {
          requiresPermission: { resource: 'processes', action: 'manage' },
          title: 'Gerenciar Processos',
          description: 'Acompanhar todos os processos da empresa'
        },
      },

      // MEUS PROCESSOS
      {
        path: '/meus-processos',
        name: 'MeusProcessos',
        component: MyProcesses,
        meta: {
          title: 'Meus Processos',
          description: 'Processos que você criou ou participa'
        }
      },

      // MINHAS TAREFAS
      {
        path: '/minhas-tarefas',
        name: 'MinhasTarefas',
        component: MyTasks,
        meta: {
          title: 'Minhas Tarefas',
          description: 'Etapas pendentes de execução'
        }
      },

      // ASSINATURAS PENDENTES
      {
        path: '/assinaturas/pendentes',
        name: 'AssinaturasPendentes',
        component: PendingSignatures,
        meta: {
          title: 'Assinaturas Pendentes',
          description: 'Documentos aguardando assinatura'
        }
      },

      // RELATÓRIOS
      {
        path: '/relatorios',
        name: 'Relatorios',
        component: Reports,
        meta: {
          requiresPermission: { resource: 'reports', action: 'view' },
          title: 'Relatórios',
          description: 'Análise e acompanhamento dos processos'
        }
      },

      // PERFIL DO USUÁRIO
      {
        path: '/meu-perfil',
        name: 'MeuPerfil',
        component: Profile,
        meta: {
          title: 'Meu Perfil',
          description: 'Configurações da conta'
        }
      },

      // CONFIGURAÇÕES
      {
        path: '/configuracoes',
        name: 'Configuracoes',
        component: Settings,
        meta: {
          requiresPermission: { resource: 'settings', action: 'manage' },
          title: 'Configurações',
          description: 'Configurações do sistema'
        },
      },

      // ALIASES PARA COMPATIBILIDADE (rotas antigas redirecionam para novas)
      { path: '/dashboard', redirect: '/painel' },
      { path: '/login', redirect: '/entrar' },
      { path: '/companies', redirect: '/empresas' },
      { path: '/users', redirect: '/usuarios' },
      { path: '/sectors', redirect: '/setores' },
      { path: '/process-types', redirect: '/tipos-de-processo' },
      { path: '/process-types/new', redirect: '/tipos-de-processo/novo' },
      { path: '/profiles', redirect: '/perfis' },
      { path: '/processes', redirect: '/processos' },
      { path: '/processes/create', redirect: '/processos/criar' },
      { path: '/manage-processes', redirect: '/gerenciar-processos' },
      { path: '/my-processes', redirect: '/meus-processos' },
      { path: '/my-tasks', redirect: '/minhas-tarefas' },
      { path: '/mytasks', redirect: '/minhas-tarefas' },
      { path: '/manageprocesses', redirect: '/gerenciar-processos' },
      { path: '/signatures/pending', redirect: '/assinaturas/pendentes' },
      { path: '/profile', redirect: '/meu-perfil' },
      { path: '/settings', redirect: '/configuracoes' }
    ],
  },

  // Catch-all para rotas inexistentes
  {
    path: '/:pathMatch(.*)*',
    name: 'NaoEncontrado',
    beforeEnter: (to, from, next) => {
      const authStore = useAuthStore()
      if (authStore.isAuthenticated) {
        const firstAvailableRoute = findFirstAvailableRoute(authStore)
        next(firstAvailableRoute)
      } else {
        next('/entrar')
      }
    },
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()

  // Inicializa auth se tiver token
  if (!authStore.user && localStorage.getItem('token')) {
    try {
      authStore.initializeAuth()
    } catch (error) {
      localStorage.clear()
    }
  }

  const isAuthenticated = authStore.isAuthenticated
  const userRole = authStore.userRole


  // Permite rotas públicas
  if (to.meta.public === true || to.meta.requiresAuth === false) {
    next()
    return
  }

  // Verifica se a rota ou algum parent requer autenticação
  const requiresAuth = to.matched.some(record => record.meta.requiresAuth)
  
  // Redireciona para login se rota requer autenticação e usuário não está autenticado
  if (requiresAuth && !isAuthenticated) {
    sessionStorage.setItem('redirectAfterLogin', to.fullPath)
    next('/entrar')
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
