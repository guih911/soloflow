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
        // Fetch tasks
        if (!processStore.myTasks?.length) {
          try {
            await processStore.fetchMyTasks()
          } catch (err) {
            /* ignore */
          }
        }

        // Fetch user's created processes for lifecycle events
        if (!processStore.myCreatedProcesses?.length) {
          try {
            await processStore.fetchMyCreatedProcesses()
          } catch (err) {
            /* ignore */
          }
        }

        const taskNotifications = buildNotificationsFromTasks(processStore.myTasks || [])
        const lifecycleNotifications = buildProcessLifecycleNotifications(processStore.myCreatedProcesses || [])
        notifications = [...taskNotifications, ...lifecycleNotifications]
      }

      // Deduplicate by id
      const seen = new Set()
      notifications = notifications.filter(n => {
        if (seen.has(n.id)) return false
        seen.add(n.id)
        return true
      })

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
      type: item.type ?? 'info',
      icon: item.icon ?? null,
      createdAt: item.createdAt ?? item.created_at ?? new Date().toISOString(),
      link: item.link ?? item.actionUrl ?? null,
    }))
  }

  function buildNotificationsFromTasks(tasks) {
    return tasks.map(task => {
      const processId = task.processInstance?.id || task.process?.id || task.processId
      const processTitle = task.processInstance?.title || task.process?.title || task.processInstance?.code || task.process?.code || 'Processo'
      const isSignature = task.step?.requiresSignature || task.hasValidSignatureRequirements
      return {
        id: `task-${task.id}`,
        title: processTitle,
        message: task.step?.name ? `Etapa pendente: ${task.step.name}` : 'Você possui uma ação pendente',
        type: isSignature ? 'signature' : 'task',
        icon: isSignature ? 'mdi-draw-pen' : 'mdi-play-circle-outline',
        createdAt: task.createdAt || task.updatedAt || new Date().toISOString(),
        link: processId ? `/processos/${processId}` : null,
      }
    })
  }

  function buildProcessLifecycleNotifications(processes) {
    const notifications = []

    for (const process of processes) {
      const processId = process.id
      const processTitle = process.title || process.code || 'Processo'

      // Process completed
      if (process.status === 'COMPLETED') {
        notifications.push({
          id: `process-completed-${processId}`,
          title: processTitle,
          message: 'Processo concluído com sucesso',
          type: 'process_completed',
          icon: 'mdi-check-circle-outline',
          createdAt: process.completedAt || process.updatedAt || process.createdAt,
          link: `/processos/${processId}`,
        })
      }

      // Process cancelled
      if (process.status === 'CANCELLED') {
        notifications.push({
          id: `process-cancelled-${processId}`,
          title: processTitle,
          message: 'Processo foi cancelado',
          type: 'process_cancelled',
          icon: 'mdi-cancel',
          createdAt: process.updatedAt || process.createdAt,
          link: `/processos/${processId}`,
        })
      }

      // Process rejected
      if (process.status === 'REJECTED') {
        notifications.push({
          id: `process-rejected-${processId}`,
          title: processTitle,
          message: 'Processo foi rejeitado',
          type: 'process_rejected',
          icon: 'mdi-close-circle-outline',
          createdAt: process.updatedAt || process.createdAt,
          link: `/processos/${processId}`,
        })
      }

      // Process in progress (step advancement)
      if (process.status === 'IN_PROGRESS' && process.currentStepOrder > 1) {
        const totalSteps = process.processTypeVersion?.steps?.length || process.stepExecutions?.length || 0
        const stepLabel = totalSteps
          ? `Etapa ${process.currentStepOrder} de ${totalSteps}`
          : `Etapa ${process.currentStepOrder}`
        notifications.push({
          id: `process-progress-${processId}-step-${process.currentStepOrder}`,
          title: processTitle,
          message: `Processo avançou — ${stepLabel}`,
          type: 'process_progress',
          icon: 'mdi-arrow-right-circle-outline',
          createdAt: process.updatedAt || process.createdAt,
          link: `/processos/${processId}`,
        })
      }

      // Signature completed on process attachments
      const executions = process.stepExecutions || []
      for (const exec of executions) {
        const signatures = exec.signatureRecords || exec.signatures || []
        for (const sig of signatures) {
          if (sig.signedAt && sig.status !== 'PENDING') {
            const signerName = sig.signerName || sig.signer?.name || 'Alguém'
            notifications.push({
              id: `signature-done-${sig.id}`,
              title: processTitle,
              message: `${signerName} assinou o documento`,
              type: 'signature_completed',
              icon: 'mdi-draw-pen',
              createdAt: sig.signedAt,
              link: `/processos/${processId}`,
            })
          }
        }
      }
    }

    return notifications
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
