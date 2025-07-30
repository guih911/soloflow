import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/services/api'
import router from '@/router'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const token = ref(null)
  const loading = ref(false)
  const error = ref(null)

  // Computed
  const isAuthenticated = computed(() => !!token.value)
  const userRole = computed(() => user.value?.role || null)
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
      user.value = userData
      
      localStorage.setItem('token', access_token)
      localStorage.setItem('user', JSON.stringify(userData))
      
      router.push('/dashboard')
    } catch (err) {
      error.value = err.response?.data?.message || 'Erro ao fazer login'
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
      
      token.value = access_token
      user.value = newUser
      
      localStorage.setItem('token', access_token)
      localStorage.setItem('user', JSON.stringify(newUser))
      
      router.push('/dashboard')
    } catch (err) {
      error.value = err.response?.data?.message || 'Erro ao registrar'
      throw err
    } finally {
      loading.value = false
    }
  }

  function logout() {
    user.value = null
    token.value = null
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    router.push('/login')
  }

  function initializeAuth() {
    const storedToken = localStorage.getItem('token')
    const storedUser = localStorage.getItem('user')
    
    if (storedToken && storedUser) {
      token.value = storedToken
      user.value = JSON.parse(storedUser)
    }
  }

  return {
    // State
    user,
    token,
    loading,
    error,
    // Computed
    isAuthenticated,
    userRole,
    isAdmin,
    isManager,
    // Actions
    login,
    register,
    logout,
    initializeAuth,
  }
})
