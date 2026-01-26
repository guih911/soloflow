import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/services/api'
import { useWebSocket } from '@/services/websocket'

export const useNotificationsStore = defineStore('notifications', () => {
  const items = ref([])
  const loading = ref(false)
  const error = ref(null)
  const totalCount = ref(0)
  const wsConnected = ref(false)

  const { connect, disconnect, onNotification, offNotification, connected } = useWebSocket()

  const unreadCount = computed(() =>
    items.value.filter(n => !n.isRead).length
  )

  // WebSocket: conectar e escutar notificações em tempo real
  function initWebSocket(token) {
    connect(token)
    onNotification(handleNewNotification)
    wsConnected.value = true
  }

  function stopWebSocket() {
    offNotification(handleNewNotification)
    disconnect()
    wsConnected.value = false
  }

  function handleNewNotification(notification) {
    // Adicionar no topo da lista
    const exists = items.value.find(n => n.id === notification.id)
    if (!exists) {
      items.value.unshift(notification)
      totalCount.value++
      // Limitar tamanho do array para evitar crescimento de memória
      if (items.value.length > 200) {
        items.value = items.value.slice(0, 200)
      }
    }
  }

  // REST API: buscar histórico de notificações
  async function fetchNotifications(options = {}) {
    loading.value = true
    error.value = null

    try {
      const params = {}
      if (options.page) params.page = options.page
      if (options.limit) params.limit = options.limit
      if (options.type) params.type = options.type
      if (options.unreadOnly) params.unreadOnly = true

      const response = await api.get('/notifications', { params })
      const data = response.data

      if (data.items) {
        items.value = data.items
        totalCount.value = data.total || data.items.length
      } else if (Array.isArray(data)) {
        items.value = data
        totalCount.value = data.length
      }

      return items.value
    } catch (err) {
      error.value = err.response?.data?.message || err.message || 'Erro ao carregar notificações'
      // Fallback: manter items vazios, sem dados sintéticos
      items.value = []
      throw err
    } finally {
      loading.value = false
    }
  }

  async function fetchUnreadCount() {
    try {
      const response = await api.get('/notifications/count')
      return response.data.count || 0
    } catch {
      return 0
    }
  }

  async function markAsRead(notificationId) {
    try {
      await api.patch(`/notifications/${notificationId}/read`)
      const notification = items.value.find(n => n.id === notificationId)
      if (notification) {
        notification.isRead = true
        notification.readAt = new Date().toISOString()
      }
    } catch {
      // Erro silencioso - notificação pode ser marcada na próxima tentativa
    }
  }

  async function markAllAsRead() {
    try {
      await api.patch('/notifications/read-all')
      items.value.forEach(n => {
        n.isRead = true
        n.readAt = new Date().toISOString()
      })
    } catch {
      // Erro silencioso - operação não crítica
    }
  }

  async function deleteNotification(notificationId) {
    try {
      await api.delete(`/notifications/${notificationId}`)
      items.value = items.value.filter(n => n.id !== notificationId)
      totalCount.value = Math.max(0, totalCount.value - 1)
    } catch {
      // Erro silencioso - operação não crítica
    }
  }

  function isRead(id) {
    const notification = items.value.find(n => n.id === id)
    return notification?.isRead ?? false
  }

  function $reset() {
    items.value = []
    totalCount.value = 0
    error.value = null
    loading.value = false
    stopWebSocket()
  }

  return {
    items,
    loading,
    error,
    totalCount,
    unreadCount,
    wsConnected,
    fetchNotifications,
    fetchUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    isRead,
    initWebSocket,
    stopWebSocket,
    $reset,
  }
})
