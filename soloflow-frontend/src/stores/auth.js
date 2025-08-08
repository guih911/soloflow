import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/services/api'
import router from '@/router'

// SoloFlow Import das outras stores para resetar no switch de empresa
import { useProcessStore } from '@/stores/processes'
import { useProcessTypeStore } from '@/stores/processTypes'
import { useSectorStore } from '@/stores/sectors'
import { useUserStore } from '@/stores/users'
import { useCompanyStore } from '@/stores/company'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const token = ref(null)
  const companies = ref([])
  const activeCompany = ref(null)
  const loading = ref(false)
  const error = ref(null)

  // Computed
  const isAuthenticated = computed(() => !!token.value)
  const userRole = computed(() => activeCompany.value?.role || null)
  const activeCompanyId = computed(() => activeCompany.value?.companyId || null)
  const activeSectorId = computed(() => activeCompany.value?.sector?.id || null)
  const isAdmin = computed(() => userRole.value === 'ADMIN')
  const isManager = computed(() => userRole.value === 'MANAGER')
  const canManageUsers = computed(() => ['ADMIN', 'MANAGER'].includes(userRole.value))
  const canManageProcessTypes = computed(() => ['ADMIN', 'MANAGER'].includes(userRole.value))

  // SoloFlow MELHORADO: Login com tratamento robusto de erros
  async function login(credentials) {
    loading.value = true
    error.value = null
    
    try {
      console.log('Attempting login with:', credentials.email)
      
      const response = await api.post('/auth/login', credentials)
      const { access_token, user: userData } = response.data
      
      console.log('Login response:', response.data)
      
      // SoloFlow CORRIGIDO: Validação mais rigorosa dos dados
      if (!access_token || !userData?.id || !userData?.companies?.length) {
        throw new Error('Resposta inválida do servidor')
      }
      
      // SoloFlow Configurar dados do usuário
      token.value = access_token
      user.value = {
        id: userData.id,
        name: userData.name,
        email: userData.email,
      }
      companies.value = userData.companies || []
      activeCompany.value = userData.activeCompany
      
      // SoloFlow CRÍTICO: Salvar no localStorage de forma consistente
      localStorage.setItem('token', access_token)
      localStorage.setItem('user', JSON.stringify(user.value))
      localStorage.setItem('companies', JSON.stringify(companies.value))
      localStorage.setItem('activeCompany', JSON.stringify(activeCompany.value))
      
      // SoloFlow Configurar header padrão do axios
      api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`
      
      console.log('Login successful, active company:', activeCompany.value?.name)
      
      // SoloFlow MELHORADO: Navegação após login
      const redirectPath = sessionStorage.getItem('redirectAfterLogin') || '/dashboard'
      sessionStorage.removeItem('redirectAfterLogin')
      router.push(redirectPath)
      
      window.showSnackbar?.('Login realizado com sucesso!', 'success')
      
      return response.data
    } catch (err) {
      console.error('Login error:', err)
      error.value = err.response?.data?.message || err.message || 'Erro ao fazer login'
      window.showSnackbar?.(error.value, 'error')
      
      // SoloFlow SEGURANÇA: Limpar dados em caso de erro
      logout()
      throw err
    } finally {
      loading.value = false
    }
  }

  async function register(userData) {
    loading.value = true
    error.value = null
    
    try {
      console.log('Attempting register with:', userData.email)
      
      const response = await api.post('/auth/register', userData)
      const { access_token, user: newUser } = response.data
      
      console.log('Register response:', response.data)
      
      // SoloFlow VALIDAÇÃO: Verificar resposta válida
      if (!access_token || !newUser?.id) {
        throw new Error('Resposta inválida do servidor')
      }
      
      // SoloFlow Fazer login automático após registro
      token.value = access_token
      user.value = {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
      }
      companies.value = newUser.companies || []
      activeCompany.value = newUser.activeCompany
      
      // SoloFlow Salvar no localStorage
      localStorage.setItem('token', access_token)
      localStorage.setItem('user', JSON.stringify(user.value))
      localStorage.setItem('companies', JSON.stringify(companies.value))
      localStorage.setItem('activeCompany', JSON.stringify(activeCompany.value))
      
      // SoloFlow Configurar header padrão do axios
      api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`
      
      router.push('/dashboard')
      window.showSnackbar?.('Conta criada com sucesso!', 'success')
      
      return response.data
    } catch (err) {
      console.error('Register error:', err)
      error.value = err.response?.data?.message || 'Erro ao registrar'
      window.showSnackbar?.(error.value, 'error')
      throw err
    } finally {
      loading.value = false
    }
  }

  // SoloFlow CORRIGIDO: Switch de empresa SEM force reload
  async function switchCompany(companyId) {
    if (activeCompany.value?.companyId === companyId) {
      console.log('Company already active:', companyId)
      return
    }

    loading.value = true
    error.value = null
    
    try {
      console.log('Switching to company:', companyId)
      
      const response = await api.post('/auth/switch-company', { companyId })
      const { access_token, user: userData } = response.data
      
      console.log('Switch company response:', response.data)
      
      // SoloFlow CRÍTICO: Validar resposta
      if (!access_token || !userData) {
        throw new Error('Resposta inválida do servidor')
      }
      
      // SoloFlow Atualizar dados
      token.value = access_token
      user.value = {
        id: userData.id,
        name: userData.name,
        email: userData.email,
      }
      companies.value = userData.companies || []
      activeCompany.value = userData.activeCompany
      
      // SoloFlow Atualizar localStorage
      localStorage.setItem('token', access_token)
      localStorage.setItem('user', JSON.stringify(user.value))
      localStorage.setItem('companies', JSON.stringify(companies.value))
      localStorage.setItem('activeCompany', JSON.stringify(activeCompany.value))
      
      // SoloFlow Atualizar header do axios
      api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`
      
      // SoloFlow CORRIGIDO: Resetar stores em vez de recarregar página
      await resetAllStores()
      
      window.showSnackbar?.(`Empresa alterada para: ${activeCompany.value.name}`, 'success')
      
      // SoloFlow MELHORADO: Navegar para dashboard se não estiver lá
      if (router.currentRoute.value.path !== '/dashboard') {
        router.push('/dashboard')
      }
      
      return response.data
    } catch (err) {
      console.error('Switch company error:', err)
      error.value = err.response?.data?.message || 'Erro ao trocar empresa'
      window.showSnackbar?.(error.value, 'error')
      throw err
    } finally {
      loading.value = false
    }
  }

  // SoloFlow Resetar todas as stores ao trocar empresa
  async function resetAllStores() {
    try {
      console.log('Resetting all stores for company switch...')
      
      // SoloFlow Resetar stores de dados
      const processStore = useProcessStore()
      const processTypeStore = useProcessTypeStore()
      const sectorStore = useSectorStore()
      const userStore = useUserStore()
      const companyStore = useCompanyStore()
      
      // SoloFlow Limpar dados das stores
      processStore.processes = []
      processStore.currentProcess = null
      processStore.myTasks = []
      processStore.myCreatedProcesses = []
      processStore.dashboardStats = {}
      
      processTypeStore.processTypes = []
      processTypeStore.currentProcessType = null
      
      sectorStore.sectors = []
      sectorStore.currentSector = null
      
      userStore.users = []
      userStore.currentUser = null
      
      companyStore.companies = []
      companyStore.currentCompany = null
      
      console.log('All stores reset successfully')
    } catch (error) {
      console.error('Error resetting stores:', error)
    }
  }

  // SoloFlow MELHORADO: Refresh token com validações
  async function refreshToken() {
    if (!token.value) return false

    try {
      console.log('Refreshing token...')
      
      const response = await api.post('/auth/refresh')
      const { access_token, user: userData } = response.data
      
      // SoloFlow VALIDAR: Resposta válida
      if (!access_token || !userData) {
        throw new Error('Resposta inválida do servidor')
      }
      
      // SoloFlow Atualizar dados
      token.value = access_token
      user.value = {
        id: userData.id,
        name: userData.name,
        email: userData.email,
      }
      companies.value = userData.companies || []
      activeCompany.value = userData.activeCompany
      
      // SoloFlow Atualizar localStorage
      localStorage.setItem('token', access_token)
      localStorage.setItem('user', JSON.stringify(user.value))
      localStorage.setItem('companies', JSON.stringify(companies.value))
      localStorage.setItem('activeCompany', JSON.stringify(activeCompany.value))
      
      // SoloFlow Atualizar header do axios
      api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`
      
      console.log('Token refreshed successfully')
      return true
    } catch (err) {
      console.error('Refresh token error:', err)
      // SoloFlow SEGURANÇA: Se refresh falhar, fazer logout
      logout()
      return false
    }
  }

  function logout() {
    console.log('Logging out...')
    
    // SoloFlow Limpar estado
    user.value = null
    token.value = null
    companies.value = []
    activeCompany.value = null
    error.value = null
    
    // SoloFlow Limpar localStorage
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    localStorage.removeItem('companies')
    localStorage.removeItem('activeCompany')
    
    // SoloFlow Limpar header do axios
    delete api.defaults.headers.common['Authorization']
    
    // SoloFlow Resetar todas as stores
    resetAllStores()
    
    // SoloFlow Navegar para login
    router.push('/login')
    window.showSnackbar?.('Logout realizado com sucesso!', 'info')
  }

  // SoloFlow MELHORADO: Inicializar auth com validações
  function initializeAuth() {
    console.log('Initializing auth from localStorage...')
    
    const storedToken = localStorage.getItem('token')
    const storedUser = localStorage.getItem('user')
    const storedCompanies = localStorage.getItem('companies')
    const storedActiveCompany = localStorage.getItem('activeCompany')
    
    if (storedToken && storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser)
        const parsedCompanies = storedCompanies ? JSON.parse(storedCompanies) : []
        const parsedActiveCompany = storedActiveCompany ? JSON.parse(storedActiveCompany) : null
        
        // SoloFlow VALIDAÇÃO: Verificar se dados são válidos
        if (!parsedUser?.id || !parsedActiveCompany?.companyId) {
          console.warn('Invalid stored auth data, clearing...')
          logout()
          return
        }
        
        token.value = storedToken
        user.value = parsedUser
        companies.value = parsedCompanies
        activeCompany.value = parsedActiveCompany
        
        // SoloFlow Configurar header do axios
        api.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`
        
        console.log('Auth initialized from localStorage:', {
          user: user.value?.name,
          company: activeCompany.value?.name,
          companies: companies.value?.length
        })
        
        // SoloFlow OPCIONAL: Verificar se token ainda é válido (chamada silenciosa)
        refreshToken().catch(() => {
          console.warn('Stored token is invalid, user needs to login again')
        })
      } catch (error) {
        console.error('Error parsing stored auth data:', error)
        logout()
      }
    } else {
      console.log('No stored auth data found')
    }
  }

  // SoloFlow Verificar se usuário tem permissão
  function hasPermission(permission) {
    const permissions = {
      ADMIN: [
        'manage_companies',
        'manage_users', 
        'manage_sectors',
        'manage_process_types',
        'manage_processes',
        'view_all_processes',
        'execute_any_step',
        'system_settings',
        'view_reports',
      ],
      MANAGER: [
        'manage_users',
        'manage_sectors', 
        'manage_process_types',
        'view_company_processes',
        'execute_assigned_steps',
        'view_reports',
      ],
      USER: [
        'create_processes',
        'view_own_processes',
        'execute_assigned_steps',
      ],
    };

    const userPermissions = permissions[userRole.value] || []
    return userPermissions.includes(permission)
  }

  // SoloFlow Verificar se pode acessar rota
  function canAccessRoute(requiredRoles) {
    if (!requiredRoles || requiredRoles.length === 0) return true
    return requiredRoles.includes(userRole.value)
  }

  // SoloFlow Obter dados do perfil atual
  async function getProfile() {
    try {
      const response = await api.get('/auth/me')
      return response.data
    } catch (err) {
      console.error('Error getting profile:', err)
      throw err
    }
  }

  // SoloFlow Atualizar perfil
  async function updateProfile(profileData) {
    loading.value = true
    error.value = null
    
    try {
      const response = await api.patch('/users/me', profileData)
      
      // SoloFlow Atualizar dados locais
      user.value = { ...user.value, ...response.data }
      localStorage.setItem('user', JSON.stringify(user.value))
      
      window.showSnackbar?.('Perfil atualizado com sucesso!', 'success')
      return response.data
    } catch (err) {
      error.value = err.response?.data?.message || 'Erro ao atualizar perfil'
      window.showSnackbar?.(error.value, 'error')
      throw err
    } finally {
      loading.value = false
    }
  }

  // SoloFlow Trocar senha
  async function changePassword(passwordData) {
    loading.value = true
    error.value = null
    
    try {
      await api.patch('/auth/change-password', passwordData)
      window.showSnackbar?.('Senha alterada com sucesso!', 'success')
    } catch (err) {
      error.value = err.response?.data?.message || 'Erro ao alterar senha'
      window.showSnackbar?.(error.value, 'error')
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    // State
    user,
    token,
    companies,
    activeCompany,
    loading,
    error,
    
    // Computed
    isAuthenticated,
    userRole,
    activeCompanyId,
    activeSectorId,
    isAdmin,
    isManager,
    canManageUsers,
    canManageProcessTypes,
    
    // Actions - Auth
    login,
    register,
    logout,
    initializeAuth,
    refreshToken,
    
    // Actions - Company
    switchCompany,
    resetAllStores,
    
    // Actions - Profile
    getProfile,
    updateProfile,
    changePassword,
    
    // Actions - Permissions
    hasPermission,
    canAccessRoute,
  }
})