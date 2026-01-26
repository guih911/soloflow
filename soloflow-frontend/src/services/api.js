import axios from 'axios'
import router from '@/router'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
  timeout: 30000, // Aumentado para 30 segundos
})

// Flag para evitar múltiplas tentativas de refresh simultâneas
let isRefreshing = false
let failedQueue = []
// Flag para evitar múltiplos redirects de sessão expirada
let sessionExpiredHandled = false
let sessionExpiredTimer = null
// Timeout para reset de isRefreshing em caso de erro inesperado
let refreshTimeoutTimer = null
const REFRESH_TIMEOUT_MS = 15000 // 15 segundos máximo para refresh

const processQueue = (error, token = null) => {
  // Processar todas as promises pendentes
  const queue = [...failedQueue]
  failedQueue = []

  queue.forEach(prom => {
    if (error) {
      prom.reject(error)
    } else {
      prom.resolve(token)
    }
  })
}

// Reset seguro do estado de refresh
const resetRefreshState = () => {
  if (refreshTimeoutTimer) {
    clearTimeout(refreshTimeoutTimer)
    refreshTimeoutTimer = null
  }
  isRefreshing = false
}

// Função para limpar sessão e redirecionar para login
function clearSessionAndRedirect() {
  if (sessionExpiredHandled) {
    return
  }
  sessionExpiredHandled = true

  // Limpar timer anterior se existir
  if (sessionExpiredTimer) {
    clearTimeout(sessionExpiredTimer)
    sessionExpiredTimer = null
  }

  localStorage.removeItem('token')
  localStorage.removeItem('user')
  localStorage.removeItem('companies')
  localStorage.removeItem('activeCompany')
  localStorage.removeItem('profileIds')
  localStorage.removeItem('permissions')
  localStorage.removeItem('processTypePermissions')

  // Só redireciona se não estiver já na página de login
  if (router.currentRoute.value.path !== '/entrar') {
    window.showSnackbar?.('Sua sessão expirou. Faça login novamente.', 'warning')
    router.push('/entrar').then(() => {
      // Reset da flag após navegação concluída com debounce seguro
      sessionExpiredTimer = setTimeout(() => {
        sessionExpiredHandled = false
        sessionExpiredTimer = null
      }, 3000)
    }).catch(() => {
      // Se navegação falhar, resetar flag para permitir nova tentativa
      sessionExpiredHandled = false
    })
  } else {
    // Já na página de login, resetar flag com delay para evitar loops
    sessionExpiredTimer = setTimeout(() => {
      sessionExpiredHandled = false
      sessionExpiredTimer = null
    }, 3000)
  }
}

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers = config.headers || {}
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    if (!error.response) {
      return Promise.reject(error)
    }

    // Não tentar refresh em requisições de auth (login, refresh, etc)
    const isAuthRequest = originalRequest?.url?.includes('/auth/')

    // Se for 401 e não for uma requisição de auth e não foi tentado retry ainda
    if (error.response?.status === 401 && !isAuthRequest && !originalRequest._retry) {

      // Se já está fazendo refresh, adicionar na fila
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        }).then(token => {
          originalRequest.headers.Authorization = `Bearer ${token}`
          return api(originalRequest)
        }).catch(err => {
          return Promise.reject(err)
        })
      }

      originalRequest._retry = true
      isRefreshing = true

      // Timeout de segurança para reset do estado de refresh
      // Evita que isRefreshing fique true indefinidamente em caso de erro inesperado
      refreshTimeoutTimer = setTimeout(() => {
        if (isRefreshing) {
          const timeoutError = new Error('Timeout ao renovar sessão')
          processQueue(timeoutError, null)
          resetRefreshState()
          clearSessionAndRedirect()
        }
      }, REFRESH_TIMEOUT_MS)

      try {
        const response = await axios.post(
          `${api.defaults.baseURL}/auth/refresh`,
          {},
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`
            },
            timeout: 10000 // 10 segundos de timeout para a requisição
          }
        )

        const { access_token, user: userData } = response.data

        if (access_token) {
          localStorage.setItem('token', access_token)
          if (userData) {
            localStorage.setItem('user', JSON.stringify({
              id: userData.id,
              name: userData.name,
              email: userData.email,
            }))
            if (userData.companies) {
              localStorage.setItem('companies', JSON.stringify(userData.companies))
            }
            if (userData.activeCompany) {
              localStorage.setItem('activeCompany', JSON.stringify(userData.activeCompany))
            }
            if (userData.permissions) {
              localStorage.setItem('permissions', JSON.stringify(userData.permissions))
            }
            if (userData.processTypePermissions) {
              localStorage.setItem('processTypePermissions', JSON.stringify(userData.processTypePermissions))
            }
            if (userData.profileIds) {
              localStorage.setItem('profileIds', JSON.stringify(userData.profileIds))
            }
          }

          // Atualizar header padrão
          api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`

          // Processar fila de requisições que estavam esperando
          processQueue(null, access_token)

          // Refazer requisição original com novo token
          originalRequest.headers.Authorization = `Bearer ${access_token}`
          return api(originalRequest)
        } else {
          // Token não retornado - tratar como erro
          throw new Error('Token não retornado pelo servidor')
        }
      } catch (refreshError) {
        processQueue(refreshError, null)
        clearSessionAndRedirect()
        return Promise.reject(refreshError)
      } finally {
        resetRefreshState()
      }
    }

    // Se for 401 em requisição de auth (login falhou, etc), não redirecionar
    if (error.response?.status === 401 && isAuthRequest) {
      return Promise.reject(error)
    }

    // Se for 401 após tentar refresh, limpar sessão
    if (error.response?.status === 401 && originalRequest._retry) {
      clearSessionAndRedirect()
    }

    return Promise.reject(error)
  }
)

export default api
