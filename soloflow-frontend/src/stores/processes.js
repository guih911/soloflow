import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/services/api'

export const useProcessStore = defineStore('processes', () => {
  const processes = ref([])
  const currentProcess = ref(null)
  const myTasks = ref([])
  const myCreatedProcesses = ref([])
  const dashboardStats = ref({})
  const loading = ref(false)
  const error = ref(null)

  // ✅ NOVO: Buscar todos os processos com filtros
  async function fetchProcesses(filters = {}) {
    loading.value = true
    error.value = null
    
    try {
      console.log('Fetching processes with filters:', filters)
      
      const response = await api.get('/processes', { params: filters })
      processes.value = response.data
      
      console.log('Processes fetched:', response.data.length)
      return response.data
    } catch (err) {
      console.error('Error fetching processes:', err)
      error.value = err.response?.data?.message || 'Erro ao buscar processos'
      throw err
    } finally {
      loading.value = false
    }
  }

  // ✅ MELHORADO: Buscar processo específico
  async function fetchProcess(id) {
    loading.value = true
    error.value = null
    
    try {
      console.log('Fetching process:', id)
      
      const response = await api.get(`/processes/${id}`)
      currentProcess.value = response.data
      
      console.log('Process fetched:', response.data)
      return response.data
    } catch (err) {
      console.error('Error fetching process:', err)
      error.value = err.response?.data?.message || 'Erro ao buscar processo'
      throw err
    } finally {
      loading.value = false
    }
  }

  // ✅ MELHORADO: Buscar minhas tarefas
  async function fetchMyTasks() {
    loading.value = true
    error.value = null
    
    try {
      console.log('Fetching my tasks...')
      
      const response = await api.get('/processes/my/tasks')
      myTasks.value = response.data
      
      console.log('My tasks fetched:', response.data.length)
      return response.data
    } catch (err) {
      console.error('Error fetching my tasks:', err)
      error.value = err.response?.data?.message || 'Erro ao buscar tarefas'
      throw err
    } finally {
      loading.value = false
    }
  }

  // ✅ NOVO: Buscar processos criados por mim
  async function fetchMyCreatedProcesses() {
    loading.value = true
    error.value = null
    
    try {
      console.log('Fetching my created processes...')
      
      const response = await api.get('/processes/my/created')
      myCreatedProcesses.value = response.data
      
      console.log('My created processes fetched:', response.data.length)
      return response.data
    } catch (err) {
      console.error('Error fetching my created processes:', err)
      error.value = err.response?.data?.message || 'Erro ao buscar processos criados'
      throw err
    } finally {
      loading.value = false
    }
  }

  // ✅ NOVO: Buscar estatísticas para dashboard
  async function fetchDashboardStats() {
    loading.value = true
    error.value = null
    
    try {
      console.log('Fetching dashboard stats...')
      
      const response = await api.get('/processes/stats/dashboard')
      dashboardStats.value = response.data
      
      console.log('Dashboard stats fetched:', response.data)
      return response.data
    } catch (err) {
      console.error('Error fetching dashboard stats:', err)
      error.value = err.response?.data?.message || 'Erro ao buscar estatísticas'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function createProcess(data) {
    loading.value = true
    error.value = null
    
    try {
      console.log('Creating process with data:', data)
      
      const response = await api.post('/processes', data)
      
      // Adicionar à lista local se estiver carregada
      if (processes.value.length > 0) {
        processes.value.unshift(response.data)
      }
      
      console.log('Process created:', response.data)
      return response.data
    } catch (err) {
      console.error('Error creating process:', err)
      error.value = err.response?.data?.message || 'Erro ao criar processo'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function executeStep(data) {
    loading.value = true
    error.value = null
    
    try {
      console.log('Executing step with data:', data)
      
      const response = await api.post('/processes/execute-step', data)
      
      // Atualizar processo atual se estiver carregado
      if (currentProcess.value && currentProcess.value.id === data.processInstanceId) {
        await fetchProcess(currentProcess.value.id)
      }
      
      // Recarregar tarefas
      await fetchMyTasks()
      
      console.log('Step executed:', response.data)
      return response.data
    } catch (err) {
      console.error('Error executing step:', err)
      error.value = err.response?.data?.message || 'Erro ao executar etapa'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function uploadAttachment(file, stepExecutionId) {
    loading.value = true
    error.value = null
    
    try {
      console.log('Uploading attachment for step:', stepExecutionId)
      
      const formData = new FormData()
      formData.append('file', file)
      formData.append('stepExecutionId', stepExecutionId)
      
      const response = await api.post('/attachments/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
      
      console.log('Attachment uploaded:', response.data)
      return response.data
    } catch (err) {
      console.error('Error uploading attachment:', err)
      error.value = err.response?.data?.message || 'Erro ao enviar arquivo'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function signAttachment(attachmentId, signatureData) {
    loading.value = true
    error.value = null
    
    try {
      console.log('Signing attachment:', attachmentId)
      
      const response = await api.post(`/attachments/${attachmentId}/sign`, signatureData)
      
      console.log('Attachment signed:', response.data)
      return response.data
    } catch (err) {
      console.error('Error signing attachment:', err)
      error.value = err.response?.data?.message || 'Erro ao assinar documento'
      throw err
    } finally {
      loading.value = false
    }
  }

  // ✅ NOVO: Buscar processos por status
  async function fetchProcessesByStatus(status) {
    return fetchProcesses({ status })
  }

  // ✅ NOVO: Buscar processos por tipo
  async function fetchProcessesByType(processTypeId) {
    return fetchProcesses({ processTypeId })
  }

  // ✅ NOVO: Buscar anexos pendentes de assinatura
  async function fetchPendingSignatures() {
    loading.value = true
    error.value = null
    
    try {
      console.log('Fetching pending signatures...')
      
      // Buscar tarefas que requerem assinatura
      const tasks = await fetchMyTasks()
      const pendingSignatures = tasks.filter(task => 
        task.step.requiresSignature && 
        task.status === 'IN_PROGRESS'
      )
      
      console.log('Pending signatures found:', pendingSignatures.length)
      return pendingSignatures
    } catch (err) {
      console.error('Error fetching pending signatures:', err)
      error.value = err.response?.data?.message || 'Erro ao buscar assinaturas pendentes'
      throw err
    } finally {
      loading.value = false
    }
  }

  // ✅ NOVO: Marcar todas as notificações como lidas
  async function markAllNotificationsAsRead() {
    // Implementar quando tiver sistema de notificações
    console.log('Mark all notifications as read - TODO')
  }

  // ✅ NOVO: Cancelar processo (se for criador ou admin)
  async function cancelProcess(processId, reason) {
    loading.value = true
    error.value = null
    
    try {
      console.log('Cancelling process:', processId)
      
      const response = await api.patch(`/processes/${processId}/cancel`, { reason })
      
      // Atualizar processo na lista
      const index = processes.value.findIndex(p => p.id === processId)
      if (index !== -1) {
        processes.value[index] = response.data
      }
      
      console.log('Process cancelled:', response.data)
      return response.data
    } catch (err) {
      console.error('Error cancelling process:', err)
      error.value = err.response?.data?.message || 'Erro ao cancelar processo'
      throw err
    } finally {
      loading.value = false
    }
  }

  // ✅ Limpar dados
  function clearError() {
    error.value = null
  }

  function clearCurrentProcess() {
    currentProcess.value = null
  }

  function clearProcesses() {
    processes.value = []
  }

  // ✅ NOVO: Recarregar dados após mudança de empresa
  async function refreshAfterCompanySwitch() {
    try {
      processes.value = []
      myTasks.value = []
      myCreatedProcesses.value = []
      dashboardStats.value = {}
      currentProcess.value = null
      
      // Recarregar dados básicos
      await Promise.all([
        fetchMyTasks(),
        fetchDashboardStats()
      ])
    } catch (error) {
      console.error('Error refreshing after company switch:', error)
    }
  }

  return {
    // State
    processes,
    currentProcess,
    myTasks,
    myCreatedProcesses,
    dashboardStats,
    loading,
    error,
    
    // Actions - Básicas
    fetchProcesses,
    fetchProcess,
    fetchMyTasks,
    fetchMyCreatedProcesses,
    fetchDashboardStats,
    createProcess,
    executeStep,
    uploadAttachment,
    signAttachment,
    
    // Actions - Específicas
    fetchProcessesByStatus,
    fetchProcessesByType,
    fetchPendingSignatures,
    cancelProcess,
    
    // Actions - Utilidades
    clearError,
    clearCurrentProcess,
    clearProcesses,
    refreshAfterCompanySwitch,
    markAllNotificationsAsRead,
  }
})