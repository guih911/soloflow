import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/services/api'

export const useProcessStore = defineStore('processes', () => {
  const processes = ref([])
  const currentProcess = ref(null)
  const myTasks = ref([])
  const loading = ref(false)
  const error = ref(null)

  async function fetchProcesses(filters = {}) {
    loading.value = true
    error.value = null
    
    try {
      const response = await api.get('/processes', { params: filters })
      processes.value = response.data
      return response.data
    } catch (err) {
      error.value = err.response?.data?.message || 'Erro ao buscar processos'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function fetchProcess(id) {
    loading.value = true
    error.value = null
    
    try {
      const response = await api.get(`/processes/${id}`)
      currentProcess.value = response.data
      return response.data
    } catch (err) {
      error.value = err.response?.data?.message || 'Erro ao buscar processo'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function fetchMyTasks() {
    loading.value = true
    error.value = null
    
    try {
      const response = await api.get('/processes/my-tasks')
      myTasks.value = response.data
      return response.data
    } catch (err) {
      error.value = err.response?.data?.message || 'Erro ao buscar tarefas'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function createProcess(data) {
    loading.value = true
    error.value = null
    
    try {
      const response = await api.post('/processes', data)
      processes.value.unshift(response.data)
      return response.data
    } catch (err) {
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
      const response = await api.post('/processes/execute-step', data)
      return response.data
    } catch (err) {
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
      const formData = new FormData()
      formData.append('file', file)
      formData.append('stepExecutionId', stepExecutionId)
      
      const response = await api.post('/attachments/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
      return response.data
    } catch (err) {
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
      const response = await api.post(`/attachments/${attachmentId}/sign`, signatureData)
      return response.data
    } catch (err) {
      error.value = err.response?.data?.message || 'Erro ao assinar documento'
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    processes,
    currentProcess,
    myTasks,
    loading,
    error,
    fetchProcesses,
    fetchProcess,
    fetchMyTasks,
    createProcess,
    executeStep,
    uploadAttachment,
    signAttachment,
  }
})