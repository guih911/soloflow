import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/services/api'
import { useAuthStore } from './auth'

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
      allowedFileTypes = [];
    }
  }

  let flowConditions = [];
  if (step.flowConditions) {
    try {
      if (typeof step.flowConditions === 'string') {
        flowConditions = JSON.parse(step.flowConditions);
      } else if (Array.isArray(step.flowConditions)) {
        flowConditions = step.flowConditions;
      }
    } catch (e) {
      flowConditions = [];
    }
  }

  let reuseData = [];
  if (step.reuseData) {
    try {
      if (typeof step.reuseData === 'string') {
        reuseData = JSON.parse(step.reuseData);
      } else if (Array.isArray(step.reuseData)) {
        reuseData = step.reuseData;
      }
    } catch (e) {
      reuseData = [];
    }
  }

  let signatureRequirements = [];
  if (step.signatureRequirements) {
    try {
      if (typeof step.signatureRequirements === 'string') {
        signatureRequirements = JSON.parse(step.signatureRequirements);
      } else if (Array.isArray(step.signatureRequirements)) {
        signatureRequirements = step.signatureRequirements;
      }
    } catch (e) {
      signatureRequirements = [];
    }
  }

  let assignmentConditions = null;
  if (step.assignmentConditions) {
    try {
      if (typeof step.assignmentConditions === 'string') {
        assignmentConditions = JSON.parse(step.assignmentConditions);
      } else if (typeof step.assignmentConditions === 'object') {
        assignmentConditions = step.assignmentConditions;
      }
    } catch (e) {
      assignmentConditions = null;
    }
  }

  if (assignmentConditions && typeof assignmentConditions === 'object') {
    assignmentConditions = { ...assignmentConditions }
  }

  const reviewSettings = step.type === 'REVIEW'
    ? normalizeReviewSettings(step.reviewSettings)
    : null

  flowConditions = Array.isArray(flowConditions)
    ? flowConditions.map(condition => ({ ...condition }))
    : []

  reuseData = Array.isArray(reuseData)
    ? reuseData.map(item => ({ ...item }))
    : []

  signatureRequirements = Array.isArray(signatureRequirements)
    ? signatureRequirements.map(req => ({ ...req }))
    : []

  conditions = typeof conditions === 'object' && conditions !== null ? { ...conditions } : {}


    return {
      ...step,
      actions: Array.isArray(actions) ? [...actions] : [],
      conditions: conditions,
      allowedFileTypes: Array.isArray(allowedFileTypes) ? [...allowedFileTypes] : [],
      flowConditions: flowConditions,
      reuseData: reuseData,
      signatureRequirements: signatureRequirements,
      assignmentConditions: assignmentConditions,
      reviewSettings: reviewSettings,
      name: step.name || '',
      type: step.type || 'INPUT',
      order: step.order || 1,
      allowAttachment: Boolean(step.allowAttachment),
      requiresSignature: Boolean(step.requiresSignature),
      requireAttachment: Boolean(step.requireAttachment),
      // Garantir que assignedToCreator seja sempre um boolean
      assignedToCreator: Boolean(step.assignedToCreator),
      assignedToUserId: step.assignedToUserId || null,
      assignedToSectorId: step.assignedToSectorId || null,
    }
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

  function sanitizeFieldIdentifier(value, fallback = 'reviewNotes') {
    if (!value) return fallback
    return value
      .toString()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9_]+/g, '_')
      .replace(/_{2,}/g, '_')
      .replace(/^_+|_+$/g, '') || fallback
  }

  function normalizeReviewSettings(settings) {
    if (!settings) return null
    let parsed = settings
    if (typeof parsed === 'string') {
      try {
        parsed = JSON.parse(parsed)
      } catch {
        parsed = null
      }
    }
    if (!parsed || typeof parsed !== 'object') return null
    return {
      enabled: parsed.enabled ?? true,
      fieldName: sanitizeFieldIdentifier(parsed.fieldName, 'reviewNotes'),
      fieldLabel: parsed.fieldLabel || 'Notas da Revisão',
      required: Boolean(parsed.required),
      hint: parsed.hint || ''
    }
  }

  function prepareReviewSettingsForSave(step) {
    if (step.type !== 'REVIEW') return null
    const normalized = normalizeReviewSettings(step.reviewSettings)
    if (!normalized) return null
    return {
      enabled: Boolean(normalized.enabled),
      fieldName: sanitizeFieldIdentifier(normalized.fieldName, 'reviewNotes'),
      fieldLabel: normalized.fieldLabel || 'Notas da Revisão',
      required: Boolean(normalized.required),
      hint: normalized.hint || ''
    }
  }

  async function fetchProcessTypes() {
    loading.value = true
    error.value = null
    
    try {
      // 🔧 FIX: Obter companyId do authStore
      const authStore = useAuthStore()
      const companyId = authStore.activeCompanyId
      
      // 🔧 FIX: Validar se temos companyId
      if (!companyId) {
        throw new Error('ID da empresa não encontrado. Por favor, selecione uma empresa.')
      }

      
      // 🔧 FIX: Adicionar companyId como query parameter
      const response = await api.get('/process-types', {
        params: { companyId }
      })
      
      
      // 🔧 FIX: Normalizar resposta (pode vir com ou sem wrapper)
      let data = response.data
      if (data.success && Array.isArray(data.data)) {
        data = data.data
      } else if (!Array.isArray(data)) {
        data = []
      }
      
      processTypes.value = data
        .filter(pt => pt && typeof pt === 'object' && pt.id)
        .map(pt => {
          const normalized = normalizeProcessType(pt)

          normalized.steps = normalized.steps.map(normalizeStep)
          normalized.formFields = normalized.formFields.map(normalizeFormField)

          return normalized
        })
      
      return processTypes.value
      
    } catch (err) {
      
      // 🔧 FIX: Mensagens de erro mais específicas
      if (err.response?.status === 400) {
        error.value = 'Parâmetro companyId inválido ou ausente'
      } else if (err.response?.status === 401) {
        error.value = 'Não autorizado. Faça login novamente.'
      } else if (err.response?.data?.message) {
        error.value = err.response.data.message
      } else if (err.message) {
        error.value = err.message
      } else {
        error.value = 'Erro ao buscar tipos de processo'
      }
      
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
      
      const response = await api.get(`/process-types/${id}`)
      
      // 🔧 FIX: Normalizar resposta (pode vir com ou sem wrapper)
      let data = response.data
      if (data.success && data.data) {
        data = data.data
      }
      
      const normalized = normalizeProcessType(data)
      normalized.steps = normalized.steps.map(normalizeStep)
      normalized.formFields = normalized.formFields.map(normalizeFormField)
      
      currentProcessType.value = normalized
      
      return currentProcessType.value
      
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
          assignedToCreator: Boolean(step.assignedToCreator),
          assignmentConditions: step.assignmentConditions || null,
          instructions: step.instructions?.trim() || null,
          slaHours: step.slaHours || null,
          actions: Array.isArray(step.actions) ? step.actions : [],
          conditions: step.conditions || null,
          allowedFileTypes: Array.isArray(step.allowedFileTypes) ? step.allowedFileTypes : [],
          flowConditions: Array.isArray(step.flowConditions)
            ? step.flowConditions.map(condition => ({ ...condition }))
            : [],
          reuseData: Array.isArray(step.reuseData)
            ? step.reuseData.map(item => ({ ...item }))
            : [],
          signatureRequirements: Array.isArray(step.signatureRequirements)
            ? step.signatureRequirements.map(req => ({ ...req }))
            : [],
          reviewSettings: prepareReviewSettingsForSave(step)
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
          // Campos específicos para tipo TABLE
          tableColumns: field.type === 'TABLE' && Array.isArray(field.tableColumns) ? field.tableColumns : undefined,
          minRows: field.type === 'TABLE' ? (field.minRows || 0) : undefined,
          maxRows: field.type === 'TABLE' ? (field.maxRows || null) : undefined
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
      
      
      const response = await api.post('/process-types', cleanData)
      
      // 🔧 FIX: Normalizar resposta
      let created = response.data
      if (created.success && created.data) {
        created = created.data
      }
      
      
      created = normalizeProcessType(created)
      created.steps = created.steps.map(normalizeStep)
      created.formFields = created.formFields.map(normalizeFormField)
      
      processTypes.value.unshift(created)
      
      return created
      
    } catch (err) {
      
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
      
      const cleanData = {
        name: data.name?.trim(),
        description: data.description?.trim() || null,
        isActive: data.isActive !== undefined ? Boolean(data.isActive) : undefined,
        isChildProcessOnly: data.isChildProcessOnly !== undefined ? Boolean(data.isChildProcessOnly) : undefined,
        allowSubProcesses: data.allowSubProcesses !== undefined ? Boolean(data.allowSubProcesses) : undefined,
        allowSubTasks: data.allowSubTasks !== undefined ? Boolean(data.allowSubTasks) : undefined,
      }

      if (Array.isArray(data.steps)) {
        cleanData.steps = data.steps.map((step, index) => ({
          id: step.id,
          name: step.name?.trim(),
          description: step.description?.trim() || null,
          type: step.type || 'INPUT',
          order: step.order || index + 1,
          allowAttachment: Boolean(step.allowAttachment),
          requiresSignature: Boolean(step.requiresSignature),
          requireAttachment: Boolean(step.requireAttachment),
          minAttachments: step.minAttachments || null,
          maxAttachments: step.maxAttachments || null,
          assignedToUserId: step.assignedToUserId || null,
          assignedToSectorId: step.assignedToSectorId || null,
          assignedToCreator: Boolean(step.assignedToCreator),
          assignmentConditions: step.assignmentConditions || null,
          instructions: step.instructions?.trim() || null,
          slaHours: step.slaHours || null,
          actions: Array.isArray(step.actions) ? step.actions : [],
          conditions: step.conditions || null,
          allowedFileTypes: Array.isArray(step.allowedFileTypes) ? step.allowedFileTypes : [],
          flowConditions: Array.isArray(step.flowConditions)
            ? step.flowConditions.map(condition => ({ ...condition }))
            : [],
          reuseData: Array.isArray(step.reuseData)
            ? step.reuseData.map(item => ({ ...item }))
            : [],
          signatureRequirements: Array.isArray(step.signatureRequirements)
            ? step.signatureRequirements.map(req => ({ ...req }))
            : [],
          reviewSettings: prepareReviewSettingsForSave(step)
        }))
      }

      if (Array.isArray(data.formFields)) {
        cleanData.formFields = data.formFields.map((field, index) => ({
          id: field.id,
          name: field.name?.trim(),
          label: field.label?.trim(),
          type: field.type || 'TEXT',
          order: field.order || index + 1,
          required: Boolean(field.required),
          placeholder: field.placeholder?.trim() || null,
          defaultValue: field.defaultValue?.trim() || null,
          helpText: field.helpText?.trim() || null,
          options: Array.isArray(field.options) ? field.options : [],
          validations: typeof field.validations === 'object' ? field.validations : {},
          // Campos específicos para tipo TABLE
          tableColumns: field.type === 'TABLE' && Array.isArray(field.tableColumns) ? field.tableColumns : undefined,
          minRows: field.type === 'TABLE' ? (field.minRows || 0) : undefined,
          maxRows: field.type === 'TABLE' ? (field.maxRows || null) : undefined
        }))
      }

      // Incluir allowedChildProcessTypes se fornecido
      if (data.allowedChildProcessTypes !== undefined) {
        cleanData.allowedChildProcessTypes = Array.isArray(data.allowedChildProcessTypes)
          ? data.allowedChildProcessTypes
          : []
      }

      Object.keys(cleanData).forEach(key => {
        if (cleanData[key] === undefined) {
          delete cleanData[key]
        }
      })
      
      const response = await api.patch(`/process-types/${id}`, cleanData)
      
      // 🔧 FIX: Normalizar resposta
      let updated = response.data
      if (updated.success && updated.data) {
        updated = updated.data
      }
      
      
      updated = normalizeProcessType(updated)
      updated.steps = updated.steps.map(normalizeStep)
      updated.formFields = updated.formFields.map(normalizeFormField)
      
      const index = processTypes.value.findIndex(pt => pt.id === id)
      if (index !== -1) {
        processTypes.value[index] = updated
      }
      
      return updated
      
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
        assignedToCreator: Boolean(stepData.assignedToCreator),
        assignmentConditions: stepData.assignmentConditions || null,
        conditions: stepData.conditions || null,
        actions: Array.isArray(stepData.actions) ? stepData.actions : [],
        allowAttachment: !!stepData.allowAttachment,
        requireAttachment: !!stepData.requireAttachment,
        minAttachments: stepData.minAttachments ?? null,
        maxAttachments: stepData.maxAttachments ?? null,
        allowedFileTypes: Array.isArray(stepData.allowedFileTypes) ? stepData.allowedFileTypes : [],
        flowConditions: Array.isArray(stepData.flowConditions)
          ? stepData.flowConditions.map(condition => ({ ...condition }))
          : [],
        reuseData: Array.isArray(stepData.reuseData)
          ? stepData.reuseData.map(item => ({ ...item }))
          : [],
        signatureRequirements: Array.isArray(stepData.signatureRequirements)
          ? stepData.signatureRequirements.map(req => ({ ...req }))
          : [],
        reviewSettings: prepareReviewSettingsForSave(stepData)
      }
      
      const response = await api.post(`/process-types/${processTypeId}/steps`, cleanStepData)
      
      return normalizeStep(response.data)
      
    } catch (err) {
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
      
      return normalizeFormField(response.data)
      
    } catch (err) {
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
          flowConditions: Array.isArray(step.flowConditions)
            ? step.flowConditions.map(condition => ({ ...condition }))
            : [],
          reuseData: Array.isArray(step.reuseData)
            ? step.reuseData.map(item => ({ ...item }))
            : [],
          signatureRequirements: Array.isArray(step.signatureRequirements)
            ? step.signatureRequirements.map(req => ({ ...req }))
            : [],
          reviewSettings: step.reviewSettings ? { ...step.reviewSettings } : null
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
