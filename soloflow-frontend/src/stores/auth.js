import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/services/api'
import router from '@/router'

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

  // ✅ MELHORADO: Login com suporte completo ao multiempresa
  async function login(credentials) {
    loading.value = true
    error.value = null
    
    try {
      console.log('Attempting login with:', credentials.email)
      
      const response = await api.post('/auth/login', credentials)
      const { access_token, user: userData } = response.data
      
      console.log('Login response:', response.data)
      
      // Configurar dados do usuário
      token.value = access_token
      user.value = {
        id: userData.id,
        name: userData.name,
        email: userData.email,
      }
      companies.value = userData.companies || []
      activeCompany.value = userData.activeCompany
      
      // Salvar no localStorage
      localStorage.setItem('token', access_token)
      localStorage.setItem('user', JSON.stringify(user.value))
      localStorage.setItem('companies', JSON.stringify(companies.value))
      localStorage.setItem('activeCompany', JSON.stringify(activeCompany.value))
      
      // Configurar header padrão do axios
      api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`
      
      console.log('Login successful, redirecting to dashboard')
      router.push('/dashboard')
      window.showSnackbar?.('Login realizado com sucesso!', 'success')
      
      return response.data
    } catch (err) {
      console.error('Login error:', err)
      error.value = err.response?.data?.message || 'Erro ao fazer login'
      window.showSnackbar?.(error.value, 'error')
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
      
      // Fazer login automático após registro
      token.value = access_token
      user.value = {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
      }
      companies.value = newUser.companies || []
      activeCompany.value = newUser.activeCompany
      
      // Salvar no localStorage
      localStorage.setItem('token', access_token)
      localStorage.setItem('user', JSON.stringify(user.value))
      localStorage.setItem('companies', JSON.stringify(companies.value))
      localStorage.setItem('activeCompany', JSON.stringify(activeCompany.value))
      
      // Configurar header padrão do axios
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

  // ✅ MELHORADO: Switch de empresa com atualização completa
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
      
      // Atualizar dados
      token.value = access_token
      user.value = {
        id: userData.id,
        name: userData.name,
        email: userData.email,
      }
      companies.value = userData.companies || []
      activeCompany.value = userData.activeCompany
      
      // Atualizar localStorage
      localStorage.setItem('token', access_token)
      localStorage.setItem('user', JSON.stringify(user.value))
      localStorage.setItem('companies', JSON.stringify(companies.value))
      localStorage.setItem('activeCompany', JSON.stringify(activeCompany.value))
      
      // Atualizar header do axios
      api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`
      
      window.showSnackbar?.(`Empresa alterada para: ${activeCompany.value.name}`, 'success')
      
      // ✅ IMPORTANTE: Recarregar página para atualizar todos os dados
      // Isso garante que todas as stores sejam resetadas com os dados da nova empresa
      setTimeout(() => {
        window.location.reload()
      }, 500)
      
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

  // ✅ NOVO: Refresh token para manter sessão
  async function refreshToken() {
    if (!token.value) return false

    try {
      console.log('Refreshing token...')
      
      const response = await api.post('/auth/refresh')
      const { access_token, user: userData } = response.data
      
      // Atualizar dados
      token.value = access_token
      user.value = {
        id: userData.id,
        name: userData.name,
        email: userData.email,
      }
      companies.value = userData.companies || []
      activeCompany.value = userData.activeCompany
      
      // Atualizar localStorage
      localStorage.setItem('token', access_token)
      localStorage.setItem('user', JSON.stringify(user.value))
      localStorage.setItem('companies', JSON.stringify(companies.value))
      localStorage.setItem('activeCompany', JSON.stringify(activeCompany.value))
      
      // Atualizar header do axios
      api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`
      
      console.log('Token refreshed successfully')
      return true
    } catch (err) {
      console.error('Refresh token error:', err)
      // Se refresh falhar, fazer logout
      logout()
      return false
    }
  }

  function logout() {
    console.log('Logging out...')
    
    user.value = null
    token.value = null
    companies.value = []
    activeCompany.value = null
    error.value = null
    
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    localStorage.removeItem('companies')
    localStorage.removeItem('activeCompany')
    
    delete api.defaults.headers.common['Authorization']
    
    router.push('/login')
    window.showSnackbar?.('Logout realizado com sucesso!', 'info')
  }

  function initializeAuth() {
    console.log('Initializing auth from localStorage...')
    
    const storedToken = localStorage.getItem('token')
    const storedUser = localStorage.getItem('user')
    const storedCompanies = localStorage.getItem('companies')
    const storedActiveCompany = localStorage.getItem('activeCompany')
    
    if (storedToken && storedUser) {
      try {
        token.value = storedToken
        user.value = JSON.parse(storedUser)
        companies.value = storedCompanies ? JSON.parse(storedCompanies) : []
        activeCompany.value = storedActiveCompany ? JSON.parse(storedActiveCompany) : null
        
        // Configurar header do axios
        api.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`
        
        console.log('Auth initialized from localStorage:', {
          user: user.value?.name,
          company: activeCompany.value?.name,
          companies: companies.value?.length
        })
        
        // ✅ Verificar se token ainda é válido
        // refreshToken()
      } catch (error) {
        console.error('Error parsing stored auth data:', error)
        logout()
      }
    } else {
      console.log('No stored auth data found')
    }
  }

  // ✅ NOVO: Verificar se usuário tem permissão
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
      ],
      MANAGER: [
        'manage_users',
        'manage_sectors', 
        'manage_process_types',
        'view_company_processes',
        'execute_assigned_steps',
      ],
      USER: [
        'create_processes',
        'view_own_processes',
        'execute_assigned_steps',
      ],
    }

    const userPermissions = permissions[userRole.value] || []
    return userPermissions.includes(permission)
  }

  // ✅ NOVO: Verificar se pode acessar rota
  function canAccessRoute(requiredRoles) {
    if (!requiredRoles || requiredRoles.length === 0) return true
    return requiredRoles.includes(userRole.value)
  }

  // ✅ NOVO: Obter dados do perfil atual
  async function getProfile() {
    try {
      const response = await api.get('/auth/me')
      return response.data
    } catch (err) {
      console.error('Error getting profile:', err)
      throw err
    }
  }

  // ✅ NOVO: Atualizar perfil
  async function updateProfile(profileData) {
    loading.value = true
    error.value = null
    
    try {
      const response = await api.patch('/users/me', profileData)
      
      // Atualizar dados locais
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

  // ✅ NOVO: Trocar senha
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
    
    // Actions - Profile
    getProfile,
    updateProfile,
    changePassword,
    
    // Actions - Permissions
    hasPermission,
    canAccessRoute,
  }
})