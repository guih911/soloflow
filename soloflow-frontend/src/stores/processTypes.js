import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/services/api'

export const useProcessTypeStore = defineStore('processTypes', () => {
  const processTypes = ref([])
  const currentProcessType = ref(null)
  const loading = ref(false)
  const error = ref(null)

  function normalizeProcessType(processType) {
    return {
      ...processType,
      steps: Array.isArray(processType.steps) ? processType.steps : [],
      formFields: Array.isArray(processType.formFields) ? processType.formFields : [],
      _count: processType._count || { instances: 0 },
      company: processType.company || null,
    }
  }

  function normalizeStep(step) {
    let actions = [];
    if (step.actions) {
      try {
        if (typeof step.actions === 'string') {
          actions = JSON.parse(step.actions);
        } else if (Array.isArray(step.actions)) {
          actions = step.actions;
        }
      } catch (e) {
        console.warn('Erro ao processar step.actions:', e);
        actions = [];
      }
    }

    let conditions = {};
    if (step.conditions) {
      try {
        if (typeof step.conditions === 'string') {
          conditions = JSON.parse(step.conditions);
        } else if (typeof step.conditions === 'object') {
          conditions = step.conditions;
        }
      } catch (e) {
        console.warn('Erro ao processar step.conditions:', e);
        conditions = {};
      }
    }

    let allowedFileTypes = [];
    if (step.allowedFileTypes) {
      try {
        if (typeof step.allowedFileTypes === 'string') {
          allowedFileTypes = JSON.parse(step.allowedFileTypes);
        } else if (Array.isArray(step.allowedFileTypes)) {
          allowedFileTypes = step.allowedFileTypes;
        }
      } catch (e) {
        console.warn('Erro ao processar step.allowedFileTypes:', e);
        allowedFileTypes = [];
      }
    }

    return {
      ...step,
      actions: actions,
      conditions: conditions,
      allowedFileTypes: allowedFileTypes,
      name: step.name || '',
      type: step.type || 'INPUT',
      order: step.order || 1,
      allowAttachment: Boolean(step.allowAttachment),
      requiresSignature: Boolean(step.requiresSignature),
      requireAttachment: Boolean(step.requireAttachment),
    };
  }

  function normalizeFormField(field) {
    return {
      ...field,
      options: Array.isArray(field.options) ? field.options : [],
      validations: typeof field.validations === 'object' ? field.validations : {},
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
      console.log('📄 Fetching process types...')
      
      const response = await api.get('/process-types')
      
      console.log('📋 Raw response:', response.data.length, 'items')
      
      processTypes.value = response.data.map(pt => {
        const normalized = normalizeProcessType(pt)
        
        normalized.steps = normalized.steps.map(normalizeStep)
        normalized.formFields = normalized.formFields.map(normalizeFormField)
        
        return normalized
      })
      
      console.log('✅ Process types normalized:', processTypes.value.length)
      return processTypes.value
      
    } catch (err) {
      console.error('❌ Error fetching process types:', err)
      error.value = err.response?.data?.message || 'Erro ao buscar tipos de processo'
      
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
      
      const cleanData = {
        name: data.name?.trim(),
        description: data.description?.trim() || null,
        companyId: data.companyId,
        
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
          instructions: step.instructions?.trim() || null,
          slaHours: step.slaHours || null,
          actions: Array.isArray(step.actions) ? step.actions : [],
          conditions: step.conditions || null,
          allowedFileTypes: Array.isArray(step.allowedFileTypes) ? step.allowedFileTypes : [],
        })),
        
        formFields: (data.formFields || []).map((field, index) => ({
          name: field.name?.trim(),
          label: field.label?.trim(),
          type: field.type || 'TEXT',
          order: index + 1,
          required: Boolean(field.required),
          placeholder: field.placeholder?.trim() || null,
          defaultValue: field.defaultValue?.trim() || null,
          helpText: field.helpText?.trim() || null,
          options: Array.isArray(field.options) ? field.options : [],
          validations: typeof field.validations === 'object' ? field.validations : {},
        }))
      }
      
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
      
      const created = normalizeProcessType(response.data)
      created.steps = created.steps.map(normalizeStep)
      created.formFields = created.formFields.map(normalizeFormField)
      
      processTypes.value.unshift(created)
      
      return created
      
    } catch (err) {
      console.error('❌ Error creating process type:', err)
      
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
      console.log('🔧 Updating process type:', id)
      
      const cleanData = {
        name: data.name?.trim(),
        description: data.description?.trim() || null,
        isActive: data.isActive !== undefined ? Boolean(data.isActive) : undefined,
      }
      
      Object.keys(cleanData).forEach(key => {
        if (cleanData[key] === undefined) {
          delete cleanData[key]
        }
      })
      
      const response = await api.patch(`/process-types/${id}`, cleanData)
      
      console.log('✅ Process type updated')
      
      const updated = normalizeProcessType(response.data)
      updated.steps = updated.steps.map(normalizeStep)
      updated.formFields = updated.formFields.map(normalizeFormField)
      
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

  async function addStep(processTypeId, stepData) {
    loading.value = true
    error.value = null
    
    try {
      const cleanStepData = {
        processTypeId,
        name: stepData.name?.trim(),
        description: stepData.description?.trim() || null,
        type: stepData.type,
        order: stepData.order || 1,
        instructions: stepData.instructions?.trim() || null,
        slaHours: Number(stepData.slaHours) || null,
        assignedToUserId: stepData.assignedToUserId || null,
        assignedToSectorId: stepData.assignedToSectorId || null,
        conditions: stepData.conditions || null,
        actions: stepData.actions || [],
        allowAttachment: !!stepData.allowAttachment,
        requireAttachment: !!stepData.requireAttachment,
        minAttachments: stepData.minAttachments ?? null,
        maxAttachments: stepData.maxAttachments ?? null,
        allowedFileTypes: stepData.allowedFileTypes || []
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

  async function duplicateProcessType(processType) {
    try {
      const duplicateData = {
        name: `${processType.name} (Cópia)`,
        description: processType.description,
        companyId: processType.companyId,
        steps: processType.steps.map(step => ({
          ...step,
          id: undefined,
          processTypeId: undefined,
          tempId: undefined,
        })),
        formFields: processType.formFields.map(field => ({
          ...field,
          id: undefined,
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
    processTypes,
    currentProcessType,
    loading,
    error,
    
    fetchProcessTypes,
    fetchProcessType,
    createProcessType,
    updateProcessType,
    addStep,
    addFormField,
    duplicateProcessType,
    
    clearError,
    clearCurrentProcessType,
  }
})