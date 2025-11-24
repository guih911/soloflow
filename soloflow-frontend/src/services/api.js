import axios from 'axios'
import router from '@/router'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
  timeout: 10000,

})

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
  (error) => {
    // Não fazer logout automático em requisições de refresh token
    // O refresh pode falhar se o token expirou, mas o usuário ainda tem sessão válida no localStorage
    const isRefreshRequest = error.config?.url?.includes('/auth/refresh')

    if (error.response?.status === 401 && !isRefreshRequest) {
      console.log('401 Unauthorized - clearing session and redirecting to login')
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      localStorage.removeItem('companies')
      localStorage.removeItem('activeCompany')
      localStorage.removeItem('profileIds')
      localStorage.removeItem('permissions')
      localStorage.removeItem('processTypePermissions')
      router.push('/login')
    }
    return Promise.reject(error)
  }
)

export default api
