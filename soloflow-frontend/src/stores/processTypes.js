import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/services/api'

export const useProcessTypeStore = defineStore('processTypes', () => {
  const processTypes = ref([])
  const currentProcessType = ref(null)
  const loading = ref(false)
  const error = ref(null)

  // 🔧 HELPER: Garantir que dados estão na estrutura correta
  function normalizeProcessType(processType) {
    return {
      ...processType,
      // Garantir que arrays existam
      steps: Array.isArray(processType.steps) ? processType.steps : [],
      formFields: Array.isArray(processType.formFields) ? processType.formFields : [],
      // Garantir contadores
      _count: processType._count || { instances: 0 },
      // Processar company se existir
      company: processType.company || null,
    }
  }

  // 🔧 HELPER: Normalizar step (já vem com JSON parseado do backend)
  function normalizeStep(step) {
    return {
      ...step,
      // Backend já faz parse, mas garantir fallbacks
      actions: Array.isArray(step.actions) ? step.actions : [],
      conditions: typeof step.conditions === 'object' ? step.conditions : {},
      allowedFileTypes: Array.isArray(step.allowedFileTypes) ? step.allowedFileTypes : [],
      // Garantir campos obrigatórios
      name: step.name || '',
      type: step.type || 'INPUT',
      order: step.order || 1,
      allowAttachment: Boolean(step.allowAttachment),
      requiresSignature: Boolean(step.requiresSignature),
      requireAttachment: Boolean(step.requireAttachment),
    }
  }

  // 🔧 HELPER: Normalizar form field (já vem com JSON parseado do backend)
  function normalizeFormField(field) {
    return {
      ...field,
      // Backend já faz parse, mas garantir fallbacks
      options: Array.isArray(field.options) ? field.options : [],
      validations: typeof field.validations === 'object' ? field.validations : {},
      // Garantir campos obrigatórios
      name: field.name || '',
      label: field.label || '',
      type: field.type || 'TEXT',
      order: field.order || 1,
      required: Boolean(field.required),
    }
  }

  async function fetchProcessTypes() {
    loading.value = true
    error.value = null
    
    try {
      console.log('🔄 Fetching process types...')
      
      const response = await api.get('/process-types')
      
      console.log('📋 Raw response:', response.data.length, 'items')
      
      // 🔧 Normalizar todos os process types
      processTypes.value = response.data.map(pt => {
        const normalized = normalizeProcessType(pt)
        
        // Normalizar steps e form fields
        normalized.steps = normalized.steps.map(normalizeStep)
        normalized.formFields = normalized.formFields.map(normalizeFormField)
        
        return normalized
      })
      
      console.log('✅ Process types normalized:', processTypes.value.length)
      return processTypes.value
      
    } catch (err) {
      console.error('❌ Error fetching process types:', err)
      error.value = err.response?.data?.message || 'Erro ao buscar tipos de processo'
      
      // Reset em caso de erro
      processTypes.value = []
      
      throw err
    } finally {
      loading.value = false
    }
  }

  async function fetchProcessType(id) {
    loading.value = true
    error.value = null
    
    try {
      console.log('📋 Fetching process type:', id)
      
      const response = await api.get(`/process-types/${id}`)
      
      // 🔧 Normalizar process type individual
      const normalized = normalizeProcessType(response.data)
      normalized.steps = normalized.steps.map(normalizeStep)
      normalized.formFields = normalized.formFields.map(normalizeFormField)
      
      currentProcessType.value = normalized
      
      console.log('✅ Process type fetched and normalized')
      return currentProcessType.value
      
    } catch (err) {
      console.error('❌ Error fetching process type:', err)
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
      console.log('🚀 Creating process type:', data.name)
      
      // 🔧 Limpar e estruturar dados antes de enviar
      const cleanData = {
        name: data.name?.trim(),
        description: data.description?.trim() || null,
        companyId: data.companyId,
        
        // Processar steps
        steps: (data.steps || []).map((step, index) => ({
          name: step.name?.trim(),
          description: step.description?.trim() || null,
          type: step.type || 'INPUT',
          order: index + 1,
          allowAttachment: Boolean(step.allowAttachment),
          requiresSignature: Boolean(step.requiresSignature),
          requireAttachment: Boolean(step.requireAttachment),
          minAttachments: step.minAttachments || null,
          maxAttachments: step.maxAttachments || null,
          assignedToUserId: step.assignedToUserId || null,
          assignedToSectorId: step.assignedToSectorId || null,
          // Arrays serão convertidos em JSON pelo backend
          actions: Array.isArray(step.actions) ? step.actions : [],
          conditions: typeof step.conditions === 'object' ? step.conditions : {},
          allowedFileTypes: Array.isArray(step.allowedFileTypes) ? step.allowedFileTypes : [],
        })),
        
        // Processar form fields
        formFields: (data.formFields || []).map((field, index) => ({
          name: field.name?.trim(),
          label: field.label?.trim(),
          type: field.type || 'TEXT',
          order: index + 1,
          required: Boolean(field.required),
          placeholder: field.placeholder?.trim() || null,
          defaultValue: field.defaultValue?.trim() || null,
          helpText: field.helpText?.trim() || null,
          // Arrays/Objects serão convertidos em JSON pelo backend
          options: Array.isArray(field.options) ? field.options : [],
          validations: typeof field.validations === 'object' ? field.validations : {},
        }))
      }
      
      // Validações básicas
      if (!cleanData.name) {
        throw new Error('Nome é obrigatório')
      }
      
      if (!cleanData.companyId) {
        throw new Error('ID da empresa é obrigatório')
      }
      
      if (cleanData.steps.length === 0) {
        throw new Error('Pelo menos uma etapa é obrigatória')
      }
      
      console.log('📤 Sending clean data:', cleanData)
      
      const response = await api.post('/process-types', cleanData)
      
      console.log('✅ Process type created:', response.data.id)
      
      // 🔧 Normalizar resposta
      const created = normalizeProcessType(response.data)
      created.steps = created.steps.map(normalizeStep)
      created.formFields = created.formFields.map(normalizeFormField)
      
      // Adicionar à lista local
      processTypes.value.unshift(created)
      
      return created
      
    } catch (err) {
      console.error('❌ Error creating process type:', err)
      
      // Extrair mensagem de erro
      let errorMessage = 'Erro ao criar tipo de processo'
      if (err.response?.data?.message) {
        errorMessage = err.response.data.message
      } else if (err.message) {
        errorMessage = err.message
      }
      
      error.value = errorMessage
      throw new Error(errorMessage)
    } finally {
      loading.value = false
    }
  }

  async function updateProcessType(id, data) {
    loading.value = true
    error.value = null
    
    try {
      console.log('📝 Updating process type:', id)
      
      // 🔧 Limpar dados para update (apenas campos permitidos)
      const cleanData = {
        name: data.name?.trim(),
        description: data.description?.trim() || null,
        isActive: data.isActive !== undefined ? Boolean(data.isActive) : undefined,
      }
      
      // Remover campos undefined
      Object.keys(cleanData).forEach(key => {
        if (cleanData[key] === undefined) {
          delete cleanData[key]
        }
      })
      
      const response = await api.patch(`/process-types/${id}`, cleanData)
      
      console.log('✅ Process type updated')
      
      // 🔧 Normalizar resposta
      const updated = normalizeProcessType(response.data)
      updated.steps = updated.steps.map(normalizeStep)
      updated.formFields = updated.formFields.map(normalizeFormField)
      
      // Atualizar na lista local
      const index = processTypes.value.findIndex(pt => pt.id === id)
      if (index !== -1) {
        processTypes.value[index] = updated
      }
      
      return updated
      
    } catch (err) {
      console.error('❌ Error updating process type:', err)
      error.value = err.response?.data?.message || 'Erro ao atualizar tipo de processo'
      throw err
    } finally {
      loading.value = false
    }
  }

  // 🔧 Métodos auxiliares para steps e form fields
  async function addStep(processTypeId, stepData) {
    loading.value = true
    error.value = null
    
    try {
      const cleanStepData = {
        name: stepData.name?.trim(),
        description: stepData.description?.trim() || null,
        type: stepData.type || 'INPUT',
        allowAttachment: Boolean(stepData.allowAttachment),
        requiresSignature: Boolean(stepData.requiresSignature),
        requireAttachment: Boolean(stepData.requireAttachment),
        minAttachments: stepData.minAttachments || null,
        maxAttachments: stepData.maxAttachments || null,
        assignedToUserId: stepData.assignedToUserId || null,
        assignedToSectorId: stepData.assignedToSectorId || null,
        actions: Array.isArray(stepData.actions) ? stepData.actions : [],
        conditions: typeof stepData.conditions === 'object' ? stepData.conditions : {},
        allowedFileTypes: Array.isArray(stepData.allowedFileTypes) ? stepData.allowedFileTypes : [],
      }
      
      const response = await api.post(`/process-types/${processTypeId}/steps`, cleanStepData)
      
      console.log('✅ Step added')
      return normalizeStep(response.data)
      
    } catch (err) {
      console.error('❌ Error adding step:', err)
      error.value = err.response?.data?.message || 'Erro ao adicionar etapa'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function addFormField(processTypeId, fieldData) {
    loading.value = true
    error.value = null
    
    try {
      const cleanFieldData = {
        name: fieldData.name?.trim(),
        label: fieldData.label?.trim(),
        type: fieldData.type || 'TEXT',
        required: Boolean(fieldData.required),
        placeholder: fieldData.placeholder?.trim() || null,
        defaultValue: fieldData.defaultValue?.trim() || null,
        helpText: fieldData.helpText?.trim() || null,
        options: Array.isArray(fieldData.options) ? fieldData.options : [],
        validations: typeof fieldData.validations === 'object' ? fieldData.validations : {},
      }
      
      const response = await api.post(`/process-types/${processTypeId}/form-fields`, cleanFieldData)
      
      console.log('✅ Form field added')
      return normalizeFormField(response.data)
      
    } catch (err) {
      console.error('❌ Error adding form field:', err)
      error.value = err.response?.data?.message || 'Erro ao adicionar campo'
      throw err
    } finally {
      loading.value = false
    }
  }

  // 🔧 Método para duplicar process type
  async function duplicateProcessType(processType) {
    try {
      const duplicateData = {
        name: `${processType.name} (Cópia)`,
        description: processType.description,
        companyId: processType.companyId,
        steps: processType.steps.map(step => ({
          ...step,
          id: undefined, // Remover ID para criar novo
          processTypeId: undefined,
          tempId: undefined,
        })),
        formFields: processType.formFields.map(field => ({
          ...field,
          id: undefined, // Remover ID para criar novo
          processTypeId: undefined,
          tempId: undefined,
        }))
      }
      
      return await createProcessType(duplicateData)
      
    } catch (err) {
      console.error('❌ Error duplicating process type:', err)
      throw err
    }
  }

  function clearError() {
    error.value = null
  }

  function clearCurrentProcessType() {
    currentProcessType.value = null
  }

  return {
    // State
    processTypes,
    currentProcessType,
    loading,
    error,
    
    // Actions
    fetchProcessTypes,
    fetchProcessType,
    createProcessType,
    updateProcessType,
    addStep,
    addFormField,
    duplicateProcessType,
    
    // Utils
    clearError,
    clearCurrentProcessType,
  }
})