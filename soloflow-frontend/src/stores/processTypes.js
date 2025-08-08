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
      
      // : Garantir que steps e formFields existam
      processTypes.value = response.data.map(pt => ({
        ...pt,
        steps: pt.steps || [],
        formFields: pt.formFields || [],
        _count: pt._count || { instances: 0 }
      }))
      
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
      
      // : Garantir que steps e formFields existam
      currentProcessType.value = {
        ...response.data,
        steps: response.data.steps || [],
        formFields: response.data.formFields || []
      }
      
      return currentProcessType.value
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
      
      // : Limpar valores null/undefined para campos JSON
      const processTypeData = {
        name: data.name,
        description: data.description || undefined, //  null -> undefined
        companyId: data.companyId, // Necessário
        steps: (data.steps || []).map(step => ({
          ...step,
          description: step.description || undefined, //  null -> undefined
          actions: step.actions || [],
          conditions: step.conditions || undefined, //  null -> undefined
          allowedFileTypes: step.allowedFileTypes || undefined, //  null -> undefined
          assignedToUserId: step.assignedToUserId || undefined, //  null -> undefined
          assignedToSectorId: step.assignedToSectorId || undefined, //  null -> undefined
          minAttachments: step.minAttachments || undefined, //  null -> undefined
          maxAttachments: step.maxAttachments || undefined, //  null -> undefined
        })),
        formFields: (data.formFields || []).map(field => ({
          ...field,
          placeholder: field.placeholder || undefined, //  null -> undefined
          defaultValue: field.defaultValue || undefined, //  null -> undefined
          helpText: field.helpText || undefined, //  null -> undefined
          options: field.options || undefined, //  null -> undefined
          validations: field.validations || undefined, //  null -> undefined
        }))
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
      
      // : Garantir que o response tenha steps e formFields
      const createdProcessType = {
        ...response.data,
        steps: response.data.steps || [],
        formFields: response.data.formFields || []
      }
      
      // Adicionar na lista local
      processTypes.value.push(createdProcessType)
      return createdProcessType
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
      
      // : Limpar valores null para campos opcionais
      const updateData = {
        ...data,
        description: data.description || undefined, //  null -> undefined
      }
      
      const response = await api.patch(`/process-types/${id}`, updateData)
      
      console.log('Process type updated:', response.data)
      
      // : Garantir que steps e formFields existam
      const updatedProcessType = {
        ...response.data,
        steps: response.data.steps || [],
        formFields: response.data.formFields || []
      }
      
      // Atualizar na lista local
      const index = processTypes.value.findIndex(pt => pt.id === id)
      if (index !== -1) {
        processTypes.value[index] = updatedProcessType
      }
      
      return updatedProcessType
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
      
      // : Limpar valores null
      const cleanStepData = {
        ...stepData,
        description: stepData.description || undefined, //  null -> undefined
        actions: stepData.actions || [],
        conditions: stepData.conditions || undefined, //  null -> undefined
        allowedFileTypes: stepData.allowedFileTypes || undefined, //  null -> undefined
        assignedToUserId: stepData.assignedToUserId || undefined, //  null -> undefined
        assignedToSectorId: stepData.assignedToSectorId || undefined, //  null -> undefined
        minAttachments: stepData.minAttachments || undefined, //  null -> undefined
        maxAttachments: stepData.maxAttachments || undefined, //  null -> undefined
      }
      
      const response = await api.post(`/process-types/${processTypeId}/steps`, cleanStepData)
      
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
      
      // : Limpar valores null
      const cleanStepData = {
        ...stepData,
        description: stepData.description || undefined, //  null -> undefined
        actions: stepData.actions || undefined, //  null -> undefined se vazio
        conditions: stepData.conditions || undefined, //  null -> undefined
        allowedFileTypes: stepData.allowedFileTypes || undefined, //  null -> undefined
        assignedToUserId: stepData.assignedToUserId || undefined, //  null -> undefined
        assignedToSectorId: stepData.assignedToSectorId || undefined, //  null -> undefined
        minAttachments: stepData.minAttachments || undefined, //  null -> undefined
        maxAttachments: stepData.maxAttachments || undefined, //  null -> undefined
      }
      
      const response = await api.patch(`/process-types/steps/${stepId}`, cleanStepData)
      
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
      
      // : Limpar valores null
      const cleanFieldData = {
        ...fieldData,
        placeholder: fieldData.placeholder || undefined, //  null -> undefined
        defaultValue: fieldData.defaultValue || undefined, //  null -> undefined
        helpText: fieldData.helpText || undefined, //  null -> undefined
        options: fieldData.options || undefined, //  null -> undefined
        validations: fieldData.validations || undefined, //  null -> undefined
      }
      
      const response = await api.post(`/process-types/${processTypeId}/form-fields`, cleanFieldData)
      
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
      
      // : Limpar valores null
      const cleanFieldData = {
        ...fieldData,
        placeholder: fieldData.placeholder || undefined, //  null -> undefined
        defaultValue: fieldData.defaultValue || undefined, //  null -> undefined
        helpText: fieldData.helpText || undefined, //  null -> undefined
        options: fieldData.options || undefined, //  null -> undefined
        validations: fieldData.validations || undefined, //  null -> undefined
      }
      
      const response = await api.patch(`/process-types/form-fields/${fieldId}`, cleanFieldData)
      
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