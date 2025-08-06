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
  const activeSectorId = computed(() => activeCompany.value?.sectorId || null)
  const isAdmin = computed(() => userRole.value === 'ADMIN')
  const isManager = computed(() => userRole.value === 'MANAGER')

  // Actions
  async function login(credentials) {
    loading.value = true
    error.value = null
    
    try {
      const response = await api.post('/auth/login', credentials)
      const { access_token, user: userData } = response.data
      
      token.value = access_token
      user.value = {
        id: userData.id,
        name: userData.name,
        email: userData.email,
      }
      companies.value = userData.companies
      activeCompany.value = userData.activeCompany
      
      // Salvar no localStorage
      localStorage.setItem('token', access_token)
      localStorage.setItem('user', JSON.stringify(user.value))
      localStorage.setItem('companies', JSON.stringify(companies.value))
      localStorage.setItem('activeCompany', JSON.stringify(activeCompany.value))
      
      // Configurar header padrão do axios
      api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`
      
      router.push('/dashboard')
      window.showSnackbar('Login realizado com sucesso!', 'success')
    } catch (err) {
      error.value = err.response?.data?.message || 'Erro ao fazer login'
      window.showSnackbar(error.value, 'error')
      throw err
    } finally {
      loading.value = false
    }
  }

  async function register(userData) {
    loading.value = true
    error.value = null
    
    try {
      const response = await api.post('/auth/register', userData)
      const { access_token, user: newUser } = response.data
      
      // Fazer login automático após registro
      token.value = access_token
      user.value = {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
      }
      companies.value = newUser.companies
      activeCompany.value = newUser.activeCompany
      
      // Salvar no localStorage
      localStorage.setItem('token', access_token)
      localStorage.setItem('user', JSON.stringify(user.value))
      localStorage.setItem('companies', JSON.stringify(companies.value))
      localStorage.setItem('activeCompany', JSON.stringify(activeCompany.value))
      
      // Configurar header padrão do axios
      api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`
      
      router.push('/dashboard')
      window.showSnackbar('Conta criada com sucesso!', 'success')
    } catch (err) {
      error.value = err.response?.data?.message || 'Erro ao registrar'
      window.showSnackbar(error.value, 'error')
      throw err
    } finally {
      loading.value = false
    }
  }

  async function switchCompany(companyId) {
    loading.value = true
    error.value = null
    
    try {
      const response = await api.post('/auth/switch-company', { companyId })
      const { access_token, activeCompany: newActiveCompany } = response.data
      
      token.value = access_token
      activeCompany.value = newActiveCompany
      
      // Atualizar localStorage
      localStorage.setItem('token', access_token)
      localStorage.setItem('activeCompany', JSON.stringify(activeCompany.value))
      
      // Atualizar header do axios
      api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`
      
      window.showSnackbar('Empresa alterada com sucesso!', 'success')
      
      // Recarregar página para atualizar dados
      window.location.reload()
    } catch (err) {
      error.value = err.response?.data?.message || 'Erro ao trocar empresa'
      window.showSnackbar(error.value, 'error')
      throw err
    } finally {
      loading.value = false
    }
  }

  function logout() {
    user.value = null
    token.value = null
    companies.value = []
    activeCompany.value = null
    
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    localStorage.removeItem('companies')
    localStorage.removeItem('activeCompany')
    
    delete api.defaults.headers.common['Authorization']
    
    router.push('/login')
    window.showSnackbar('Logout realizado com sucesso!', 'info')
  }

  function initializeAuth() {
    const storedToken = localStorage.getItem('token')
    const storedUser = localStorage.getItem('user')
    const storedCompanies = localStorage.getItem('companies')
    const storedActiveCompany = localStorage.getItem('activeCompany')
    
    if (storedToken && storedUser) {
      token.value = storedToken
      user.value = JSON.parse(storedUser)
      companies.value = storedCompanies ? JSON.parse(storedCompanies) : []
      activeCompany.value = storedActiveCompany ? JSON.parse(storedActiveCompany) : null
      
      // Configurar header do axios
      api.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`
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
    // Actions
    login,
    register,
    switchCompany,
    logout,
    initializeAuth,
  }
})