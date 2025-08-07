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
      console.log('Fetching process types...')
      
      const response = await api.get('/process-types')
      
      console.log('Process types fetched:', response.data)
      processTypes.value = response.data
      return response.data
    } catch (err) {
      console.error('Error fetching process types:', err)
      error.value = err.response?.data?.message || 'Erro ao buscar tipos de processo'
      
      // Se erro 400, pode ser problema de companyId
      if (err.response?.status === 400) {
        window.showSnackbar?.('Erro: ID da empresa é obrigatório', 'error')
      }
      
      throw err
    } finally {
      loading.value = false
    }
  }

  async function fetchProcessType(id) {
    loading.value = true
    error.value = null
    
    try {
      console.log('Fetching process type:', id)
      
      const response = await api.get(`/process-types/${id}`)
      currentProcessType.value = response.data
      return response.data
    } catch (err) {
      console.error('Error fetching process type:', err)
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
      console.log('Creating process type with data:', data)
      
      // Garantir estrutura correta dos dados
      const processTypeData = {
        name: data.name,
        description: data.description || null,
        companyId: data.companyId, // Necessário
        steps: data.steps || [],
        formFields: data.formFields || []
      }
      
      // Validar dados obrigatórios
      if (!processTypeData.companyId) {
        throw new Error('ID da empresa é obrigatório')
      }
      
      if (!processTypeData.name || processTypeData.name.trim().length < 3) {
        throw new Error('Nome deve ter pelo menos 3 caracteres')
      }
      
      console.log('Sending process type data:', processTypeData)
      
      const response = await api.post('/process-types', processTypeData)
      
      console.log('Process type created:', response.data)
      
      // Adicionar na lista local
      processTypes.value.push(response.data)
      return response.data
    } catch (err) {
      console.error('Error creating process type:', err)
      error.value = err.response?.data?.message || err.message || 'Erro ao criar tipo de processo'
      
      // Log detalhado do erro para debug
      if (err.response?.data) {
        console.error('Server error details:', err.response.data)
      }
      
      throw err
    } finally {
      loading.value = false
    }
  }

  async function updateProcessType(id, data) {
    loading.value = true
    error.value = null
    
    try {
      console.log('Updating process type with data:', data)
      
      const response = await api.patch(`/process-types/${id}`, data)
      
      console.log('Process type updated:', response.data)
      
      // Atualizar na lista local
      const index = processTypes.value.findIndex(pt => pt.id === id)
      if (index !== -1) {
        processTypes.value[index] = response.data
      }
      
      return response.data
    } catch (err) {
      console.error('Error updating process type:', err)
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
      console.log('Adding step:', stepData)
      
      const response = await api.post(`/process-types/${processTypeId}/steps`, stepData)
      
      console.log('Step added:', response.data)
      return response.data
    } catch (err) {
      console.error('Error adding step:', err)
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
      console.log('Updating step:', stepData)
      
      const response = await api.patch(`/process-types/steps/${stepId}`, stepData)
      
      console.log('Step updated:', response.data)
      return response.data
    } catch (err) {
      console.error('Error updating step:', err)
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
      console.log('Deleting step:', stepId)
      
      await api.delete(`/process-types/steps/${stepId}`)
      
      console.log('Step deleted')
    } catch (err) {
      console.error('Error deleting step:', err)
      error.value = err.response?.data?.message || 'Erro ao remover etapa'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function addFormField(processTypeId, fieldData) {
    loading.value = true
    error.value = null
    
    try {
      console.log('Adding form field:', fieldData)
      
      const response = await api.post(`/process-types/${processTypeId}/form-fields`, fieldData)
      
      console.log('Form field added:', response.data)
      return response.data
    } catch (err) {
      console.error('Error adding form field:', err)
      error.value = err.response?.data?.message || 'Erro ao adicionar campo'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function updateFormField(fieldId, fieldData) {
    loading.value = true
    error.value = null
    
    try {
      console.log('Updating form field:', fieldData)
      
      const response = await api.patch(`/process-types/form-fields/${fieldId}`, fieldData)
      
      console.log('Form field updated:', response.data)
      return response.data
    } catch (err) {
      console.error('Error updating form field:', err)
      error.value = err.response?.data?.message || 'Erro ao atualizar campo'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function deleteFormField(fieldId) {
    loading.value = true
    error.value = null
    
    try {
      console.log('Deleting form field:', fieldId)
      
      await api.delete(`/process-types/form-fields/${fieldId}`)
      
      console.log('Form field deleted')
    } catch (err) {
      console.error('Error deleting form field:', err)
      error.value = err.response?.data?.message || 'Erro ao remover campo'
      throw err
    } finally {
      loading.value = false
    }
  }

  function clearError() {
    error.value = null
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
    addFormField,
    updateFormField,
    deleteFormField,
    clearError,
  }
})