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
  const profileIds = ref([])
  const permissions = ref([])
  const processTypePermissions = ref([])

  // Computed
  const isAuthenticated = computed(() => !!token.value)
  const userRole = computed(() => activeCompany.value?.role || null)
  const activeCompanyId = computed(() => activeCompany.value?.companyId || null)
  const activeSectorId = computed(() => activeCompany.value?.sector?.id || null)
  // ⚠️ REMOVIDO: Fallback de permissões por role
  // O sistema agora é 100% baseado em Perfis de Acesso
  // Se o usuário não tiver perfil com permissões, ele não terá acesso a nada
  const fallbackPermissionMatrix = {
    // Fallback removido - sistema agora é 100% baseado em perfis
  }

  // ⚠️ CORRIGIDO: Verificar apenas permissões, não mais roles
  const isAdmin = computed(() => hasPermission('*', '*'))
  const isManager = computed(() => hasPermission('users', 'manage'))
  const canManageUsers = computed(() => hasPermission('users', 'manage'))
  const canManageProcessTypes = computed(() => hasPermission('process_types', 'manage'))

  function normalizePermissions(rawPermissions = []) {
    return rawPermissions
      .filter(Boolean)
      .map(permission => ({
        resource: String(permission.resource || '*').toLowerCase(),
        action: String(permission.action || '*').toLowerCase(),
        scope: permission.scope ?? null,
      }))
  }

  function normalizeProcessTypePermissions(rawPermissions = []) {
    return rawPermissions
      .filter(Boolean)
      .map(permission => ({
        processTypeId: permission.processTypeId || '*',
        canView: permission.canView ?? true,
        canCreate: permission.canCreate ?? false,
        canExecute: permission.canExecute ?? false,
      }))
  }

  /**
   * ✅ Encontra a primeira rota disponível baseada nas permissões do usuário
   * Segue EXATAMENTE a ordem do menu lateral (sidebar) no DashboardLayout.vue
   */
  function findFirstAvailableRouteFromPermissions() {
    // Ordem de prioridade EXATA do menu lateral (sidebar)
    const routePriority = [
      // === SEÇÃO PRINCIPAL ===
      { path: '/dashboard', resource: 'dashboard', action: 'view' },
      { path: '/processes', resource: 'processes', action: 'create' },
      { path: '/manage-processes', resource: 'processes', action: 'manage' },
      { path: '/my-tasks', resource: 'tasks', action: 'view' },
      { path: '/my-processes', resource: 'processes', action: 'view' },
      { path: '/signatures/pending', resource: 'signatures', action: 'view' },
      // === SEÇÃO CONFIGURAÇÕES ===
      { path: '/process-types', resource: 'process_types', action: 'manage' },
      { path: '/sectors', resource: 'sectors', action: 'manage' },
      { path: '/users', resource: 'users', action: 'manage' },
      { path: '/profiles', resource: 'profiles', action: 'manage' },
      { path: '/companies', resource: 'companies', action: 'manage' },
      // === FALLBACK FINAL ===
      { path: '/profile', resource: null, action: null }, // Sempre disponível
    ]

    for (const route of routePriority) {
      if (!route.resource) {
        return route.path
      }

      const hasPerm = hasPermission(route.resource, route.action)

      if (hasPerm) {
        return route.path
      }
    }

    return '/profile'
  }

  function applySession(accessToken, userData) {
    token.value = accessToken
    user.value = {
      id: userData.id,
      name: userData.name,
      email: userData.email,
    }
    companies.value = userData.companies || []
    activeCompany.value = userData.activeCompany || null
    profileIds.value = userData.profileIds || []
    permissions.value = normalizePermissions(userData.permissions || [])
    processTypePermissions.value = normalizeProcessTypePermissions(userData.processTypePermissions || [])

    localStorage.setItem('token', accessToken)
    localStorage.setItem('user', JSON.stringify(user.value))
    localStorage.setItem('companies', JSON.stringify(companies.value))
    localStorage.setItem('activeCompany', JSON.stringify(activeCompany.value))
    localStorage.setItem('profileIds', JSON.stringify(profileIds.value))
    localStorage.setItem('permissions', JSON.stringify(permissions.value))
    localStorage.setItem('processTypePermissions', JSON.stringify(processTypePermissions.value))

    api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`
  }

  function clearSession() {
    user.value = null
    token.value = null
    companies.value = []
    activeCompany.value = null
    profileIds.value = []
    permissions.value = []
    processTypePermissions.value = []
  }

  function loadStoredArray(key) {
    const raw = localStorage.getItem(key)
    if (!raw) return []
    try {
      return JSON.parse(raw)
    } catch (error) {
      return []
    }
  }

  async function login(credentials) {
    loading.value = true
    error.value = null

    try {
      const response = await api.post('/auth/login', credentials)
      const { access_token, user: userData } = response.data

      if (!access_token || !userData?.id || !userData?.companies?.length) {
        throw new Error('Resposta inválida do servidor')
      }

      applySession(access_token, userData)

      const savedRedirect = sessionStorage.getItem('redirectAfterLogin')
      sessionStorage.removeItem('redirectAfterLogin')

      let redirectPath = savedRedirect || '/dashboard'

      if (redirectPath === '/dashboard' || redirectPath === '/') {
        const hasDashboardPermission = hasPermission('dashboard', 'view')

        if (!hasDashboardPermission) {
          redirectPath = findFirstAvailableRouteFromPermissions()
        }
      }

      router.push(redirectPath)

      window.showSnackbar?.('Login realizado com sucesso!', 'success')

      return response.data
    } catch (err) {
      let errorMessage = 'Erro ao fazer login'

      if (err.response?.status === 401) {
        errorMessage = 'Email ou senha incorretos'
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message
      } else if (err.message) {
        errorMessage = err.message
      }

      error.value = errorMessage
      window.showSnackbar?.(errorMessage, 'error')

      clearSession()
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      localStorage.removeItem('companies')
      localStorage.removeItem('activeCompany')
      localStorage.removeItem('profileIds')
      localStorage.removeItem('permissions')
      localStorage.removeItem('processTypePermissions')
      delete api.defaults.headers.common['Authorization']

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

      if (!access_token || !newUser?.id) {
        throw new Error('Resposta inválida do servidor')
      }

      applySession(access_token, newUser)

      const firstRoute = findFirstAvailableRouteFromPermissions()
      router.push(firstRoute)
      window.showSnackbar?.('Conta criada com sucesso!', 'success')

      return response.data
    } catch (err) {
      error.value = err.response?.data?.message || 'Erro ao registrar'
      window.showSnackbar?.(error.value, 'error')
      throw err
    } finally {
      loading.value = false
    }
  }


  async function switchCompany(companyId) {
    if (activeCompany.value?.companyId === companyId) {
      return
    }

    loading.value = true
    error.value = null

    try {
      const response = await api.post('/auth/switch-company', { companyId })
      const { access_token, user: userData } = response.data

      if (!access_token || !userData) {
        throw new Error('Resposta inválida do servidor')
      }

      applySession(access_token, userData)
      await resetAllStores()

      window.showSnackbar?.(`Empresa alterada para: ${activeCompany.value.name}`, 'success')

      const firstRoute = findFirstAvailableRouteFromPermissions()
      if (router.currentRoute.value.path !== firstRoute) {
        router.push(firstRoute)
      }

      return response.data
    } catch (err) {
      error.value = err.response?.data?.message || 'Erro ao trocar empresa'
      window.showSnackbar?.(error.value, 'error')
      throw err
    } finally {
      loading.value = false
    }
  }


  async function resetAllStores() {
    try {
      const processStore = useProcessStore()
      const processTypeStore = useProcessTypeStore()
      const sectorStore = useSectorStore()
      const userStore = useUserStore()
      const companyStore = useCompanyStore()

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
    } catch (error) {
      // Erro silencioso ao resetar stores
    }
  }

  async function refreshToken() {
    if (!token.value) return false

    try {
      const response = await api.post('/auth/refresh')
      const { access_token, user: userData } = response.data

      if (!access_token || !userData) {
        throw new Error('Resposta inválida do servidor')
      }

      applySession(access_token, userData)

      return true
    } catch (err) {
      return false
    }
  }

  function logout() {
    clearSession()

    localStorage.removeItem('token')
    localStorage.removeItem('user')
    localStorage.removeItem('companies')
    localStorage.removeItem('activeCompany')
    localStorage.removeItem('profileIds')
    localStorage.removeItem('permissions')
    localStorage.removeItem('processTypePermissions')

    delete api.defaults.headers.common['Authorization']

    resetAllStores()

    router.push('/login')
    window.showSnackbar?.('Logout realizado com sucesso!', 'info')
  }


  function initializeAuth() {
    const storedToken = localStorage.getItem('token')
    const storedUser = localStorage.getItem('user')
    const storedCompanies = localStorage.getItem('companies')
    const storedActiveCompany = localStorage.getItem('activeCompany')
    const storedProfiles = loadStoredArray('profileIds')
    const storedPermissions = loadStoredArray('permissions')
    const storedProcessTypePermissions = loadStoredArray('processTypePermissions')

    if (storedToken && storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser)
        const parsedCompanies = storedCompanies ? JSON.parse(storedCompanies) : []
        const parsedActiveCompany = storedActiveCompany ? JSON.parse(storedActiveCompany) : null

        if (!parsedUser?.id || !parsedActiveCompany?.companyId) {
          logout()
          return
        }

        token.value = storedToken
        user.value = parsedUser
        companies.value = parsedCompanies
        activeCompany.value = parsedActiveCompany
        profileIds.value = Array.isArray(storedProfiles) ? storedProfiles : []
        permissions.value = normalizePermissions(storedPermissions)
        processTypePermissions.value = normalizeProcessTypePermissions(storedProcessTypePermissions)

        api.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`

        refreshToken().catch(() => {
          // Erro silencioso - será tratado na próxima requisição
        })
      } catch (error) {
        logout()
      }
    }
  }


  const legacyPermissionMap = {
    manage_companies: { resource: 'companies', action: 'manage' },
    manage_users: { resource: 'users', action: 'manage' },
    manage_sectors: { resource: 'sectors', action: 'manage' },
    manage_process_types: { resource: 'process_types', action: 'manage' },
    manage_profiles: { resource: 'profiles', action: 'manage' },
    manage_processes: { resource: 'processes', action: 'manage' },
    view_all_processes: { resource: 'processes', action: 'view' },
    execute_any_step: { resource: 'tasks', action: 'execute' },
    system_settings: { resource: 'settings', action: 'manage' },
    view_reports: { resource: 'reports', action: 'view' },
    create_processes: { resource: 'processes', action: 'create' },
    view_own_processes: { resource: 'processes', action: 'view' },
    execute_assigned_steps: { resource: 'tasks', action: 'execute' },
  }

  function hasPermission(resource, action) {
    let targetResource = resource
    let targetAction = action

    if (typeof resource === 'string' && action === undefined) {
      const mapped = legacyPermissionMap[resource]
      if (mapped) {
        targetResource = mapped.resource
        targetAction = mapped.action
      } else {
        targetAction = 'view'
      }
    }

    const normalizedResource = String(targetResource || '*').toLowerCase()
    const normalizedAction = String(targetAction || 'view').toLowerCase()

    let effectivePermissions = permissions.value

    if (!effectivePermissions.length) {
      effectivePermissions = []
    }

    const result = effectivePermissions.some((permission) => {
      const permResource = String(permission.resource || '*').toLowerCase()
      const permAction = String(permission.action || '*').toLowerCase()

      return (permResource === '*' || permResource === normalizedResource) &&
        (permAction === '*' || permAction === normalizedAction)
    })

    return result
  }

  function matchesPermissionRequirement(requirement) {
    if (!requirement) {
      return true
    }

    if (typeof requirement === 'string') {
      return hasPermission(requirement)
    }

    if (Array.isArray(requirement)) {
      return requirement.some((single) => matchesPermissionRequirement(single))
    }

    if (typeof requirement === 'object') {
      return hasPermission(requirement.resource, requirement.action)
    }

    return false
  }
function canAccessProcessType(processTypeId, capability = 'view') {
  const normalizedCapability = String(capability || 'view').toLowerCase()

  const candidates = processTypePermissions.value.length
    ? processTypePermissions.value
    : [{
        processTypeId: '*',
        canView: hasPermission('processes', 'view'),
        canCreate: hasPermission('processes', 'create'),
        canExecute: hasPermission('tasks', 'execute'),
      }]

  return candidates.some((permission) => {
    const matchesProcess = permission.processTypeId === '*' || permission.processTypeId === processTypeId

    if (!matchesProcess) return false

    if (normalizedCapability === 'view') return permission.canView
    if (normalizedCapability === 'create') return permission.canCreate
    if (normalizedCapability === 'execute') return permission.canExecute

    return false
  })
}



  // SoloFlow Verificar se pode acessar rota
  function canAccessRoute(requirements) {
    if (!requirements) {
      return true
    }

    if (Array.isArray(requirements) && requirements.every((item) => typeof item === 'string')) {
      return requirements.includes(userRole.value)
    }

    if (typeof requirements === 'string' || Array.isArray(requirements)) {
      return matchesPermissionRequirement(requirements)
    }

    if (typeof requirements === 'object') {
      const requiredRoles = requirements.roles
      const requiredPermissions = requirements.permissions ?? requirements.permission

      const roleOk = requiredRoles
        ? (Array.isArray(requiredRoles)
            ? requiredRoles.includes(userRole.value)
            : requiredRoles === userRole.value)
        : true

      const permissionOk = requiredPermissions
        ? matchesPermissionRequirement(requiredPermissions)
        : true

      return roleOk && permissionOk
    }

    return false
  }

  async function getProfile() {
    try {
      const response = await api.get('/auth/me')
      return response.data
    } catch (err) {
      throw err
    }
  }

  async function updateProfile(profileData) {
    loading.value = true
    error.value = null

    try {
      const response = await api.patch('/users/me', profileData)

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

  async function changePassword(passwordData) {
    loading.value = true
    error.value = null

    try {
      await api.patch('/users/me/change-password', passwordData)
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
    profileIds,
    permissions,
    processTypePermissions,
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
    canAccessProcessType,
    
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
