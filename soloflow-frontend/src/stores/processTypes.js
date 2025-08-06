import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/services/api'

export const useProcessTypeStore = defineStore('processTypes', () => {
  const processTypes = ref([])
  const currentProcessType = ref(null)
  const loading = ref(false)
  const error = ref(null)

  async function fetchProcessTypes() {
    loading.value = true
    error.value = null
    
    try {
      const response = await api.get('/process-types')
      processTypes.value = response.data
      return response.data
    } catch (err) {
      error.value = err.response?.data?.message || 'Erro ao buscar tipos de processo'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function fetchProcessType(id) {
    loading.value = true
    error.value = null
    
    try {
      const response = await api.get(`/process-types/${id}`)
      currentProcessType.value = response.data
      return response.data
    } catch (err) {
      error.value = err.response?.data?.message || 'Erro ao buscar tipo de processo'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function createProcessType(data) {
    loading.value = true
    error.value = null
    
    try {
      const response = await api.post('/process-types', data)
      processTypes.value.push(response.data)
      return response.data
    } catch (err) {
      error.value = err.response?.data?.message || 'Erro ao criar tipo de processo'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function updateProcessType(id, data) {
    loading.value = true
    error.value = null
    
    try {
      const response = await api.patch(`/process-types/${id}`, data)
      const index = processTypes.value.findIndex(pt => pt.id === id)
      if (index !== -1) {
        processTypes.value[index] = response.data
      }
      return response.data
    } catch (err) {
      error.value = err.response?.data?.message || 'Erro ao atualizar tipo de processo'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function addStep(processTypeId, stepData) {
    loading.value = true
    error.value = null
    
    try {
      const response = await api.post(`/process-types/${processTypeId}/steps`, stepData)
      return response.data
    } catch (err) {
      error.value = err.response?.data?.message || 'Erro ao adicionar etapa'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function updateStep(stepId, stepData) {
    loading.value = true
    error.value = null
    
    try {
      const response = await api.patch(`/process-types/steps/${stepId}`, stepData)
      return response.data
    } catch (err) {
      error.value = err.response?.data?.message || 'Erro ao atualizar etapa'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function deleteStep(stepId) {
    loading.value = true
    error.value = null
    
    try {
      await api.delete(`/process-types/steps/${stepId}`)
    } catch (err) {
      error.value = err.response?.data?.message || 'Erro ao remover etapa'
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    processTypes,
    currentProcessType,
    loading,
    error,
    fetchProcessTypes,
    fetchProcessType,
    createProcessType,
    updateProcessType,
    addStep,
    updateStep,
    deleteStep,
  }
})
