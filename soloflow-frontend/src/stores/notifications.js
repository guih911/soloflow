import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import api from '@/services/api'
import { useAuthStore } from '@/stores/auth'
import { useProcessStore } from '@/stores/processes'

export const useNotificationsStore = defineStore('notifications', () => {
  const authStore = useAuthStore()
  const processStore = useProcessStore()

  const items = ref([])
  const loading = ref(false)
  const error = ref(null)
  const readIds = ref([])
  let pollHandle = null

  function storageKey() {
    const userId = authStore.user?.id || 'anon'
    const companyId = authStore.activeCompanyId || 'none'
    return `notifications_read:${userId}:${companyId}`
  }

  function loadReadIds() {
    try {
      const raw = localStorage.getItem(storageKey())
      readIds.value = raw ? JSON.parse(raw) : []
    } catch (err) {
      readIds.value = []
    }
  }

  function saveReadIds() {
    try {
      localStorage.setItem(storageKey(), JSON.stringify(readIds.value))
    } catch (err) {
      /* noop */
    }
  }

  watch(
    () => [authStore.user?.id, authStore.activeCompanyId],
    () => {
      loadReadIds()
    },
    { immediate: true }
  )

  const unreadCount = computed(() =>
    items.value.filter(notification => !readIds.value.includes(notification.id)).length
  )

  async function fetchNotifications() {
    loading.value = true
    error.value = null

    try {
      const response = await api.get('/notifications').catch(() => null)
      let notifications = []

      if (response && Array.isArray(response.data)) {
        notifications = normalizeApiNotifications(response.data)
      } else {
        if (!processStore.myTasks?.length) {
          try {
            await processStore.fetchMyTasks()
          } catch (err) {
            /* ignore */
          }
        }
        notifications = buildNotificationsFromTasks(processStore.myTasks || [])
      }

      items.value = notifications.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
      loadReadIds()
      return items.value
    } catch (err) {
      error.value = err.response?.data?.message || err.message || 'Erro ao carregar notificações'
      throw err
    } finally {
      loading.value = false
    }
  }

  function normalizeApiNotifications(apiItems) {
    return apiItems.map(item => ({
      id: item.id ?? Math.random().toString(36).slice(2),
      title: item.title ?? 'Notificação',
      message: item.message ?? '',
      icon: item.icon ?? 'mdi-bell',
      color: item.color ?? 'primary',
      createdAt: item.createdAt ?? item.created_at ?? new Date().toISOString(),
      link: item.link ?? null,
    }))
  }

  function buildNotificationsFromTasks(tasks) {
    return tasks.map(task => ({
      id: `task-${task.id}`,
      title: task.processInstance?.title || task.processInstance?.code || 'Processo',
      message: task.step?.name ? `Etapa pendente: ${task.step.name}` : 'Você possui uma ação pendente',
      icon: task.step?.requiresSignature ? 'mdi-draw-pen' : 'mdi-play-circle',
      color: task.step?.requiresSignature ? 'error' : 'primary',
      createdAt: task.createdAt || task.updatedAt || new Date().toISOString(),
      link: task.processInstance
        ? `/processes/${task.processInstance.id}/execute/${task.id}`
        : null,
    }))
  }

  function markAsRead(id) {
    if (!readIds.value.includes(id)) {
      readIds.value.push(id)
      saveReadIds()
    }
  }

  function markAllAsRead() {
    readIds.value = items.value.map(notification => notification.id)
    saveReadIds()
  }

  function isRead(id) {
    return readIds.value.includes(id)
  }

  function startPolling(interval = 60000) {
    stopPolling()
    pollHandle = setInterval(() => {
      fetchNotifications().catch(() => {})
    }, interval)
  }

  function stopPolling() {
    if (pollHandle) {
      clearInterval(pollHandle)
      pollHandle = null
    }
  }

  return {
    items,
    loading,
    error,
    unreadCount,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    isRead,
    startPolling,
    stopPolling,
  }
})
