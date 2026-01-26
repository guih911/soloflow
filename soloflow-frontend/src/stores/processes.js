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

  // ✅ ETAPA 1: createProcess cria apenas o processo (JSON puro)
  async function createProcess(data) {
    loading.value = true
    error.value = null

    try {
      // Filtrar apenas dados não-arquivo do formData
      const sanitizedFormData = {}
      if (data.formData) {
        Object.keys(data.formData).forEach(fieldName => {
          const fieldValue = data.formData[fieldName]
          // Verificar se é array de arquivos (tem propriedade .file)
          if (Array.isArray(fieldValue) && fieldValue.length > 0 && fieldValue[0]?.file instanceof File) {
            // PULAR - é campo de arquivo, será enviado depois
          } else {
            // Incluir - é campo normal (string, number, date, etc.)
            sanitizedFormData[fieldName] = fieldValue
          }
        })
      }

      // Payload limpo (apenas dados JSON)
      const cleanPayload = {
        processTypeId: data.processTypeId,
        title: data.title,
        description: data.description,
        formData: data.formData
      }

      const response = await api.post('/processes', cleanPayload)

      // Adicionar à lista local
      processes.value.unshift(response.data)
      
      return response.data
    } catch (err) {
      error.value = err.response?.data?.message || 'Erro ao criar processo'
      throw err
    } finally {
      loading.value = false
    }
  }

  // ✅ ETAPA 2: Helper para upload individual por campo
  async function uploadProcessFieldFile(processId, fieldName, file) {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('fieldName', fieldName)

    try {
      const response = await api.post(`/processes/${processId}/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })

      return response.data
    } catch (err) {
      throw new Error(`Erro ao enviar arquivo para ${fieldName}: ${err.response?.data?.message || err.message}`)
    }
  }

  // ✅ ETAPA 2: Upload de todos os arquivos por campo (fluxo principal)
  async function uploadProcessFiles(processId, filesMap) {
    const uploadResults = []
    const uploadErrors = []

    try {
      // Iterar por cada campo que tem arquivos
      for (const [fieldName, fileList] of Object.entries(filesMap)) {
        // Para cada arquivo do campo
        for (const fileItem of fileList) {
          try {
            // Extrair o File objeto (pode estar em .file ou ser o próprio objeto)
            const file = fileItem?.file || fileItem

            if (!(file instanceof File)) {
              continue
            }

            const result = await uploadProcessFieldFile(processId, fieldName, file)
            uploadResults.push({ fieldName, file: file.name, result })

            // Pequeno delay para não sobrecarregar
            await new Promise(resolve => setTimeout(resolve, 200))

          } catch (fileError) {
            uploadErrors.push({ fieldName, file: fileItem?.name || 'unknown', error: fileError.message })
          }
        }
      }

      // Refetch do processo para ter formData atualizado
      try {
        const updatedProcess = await api.get(`/processes/${processId}`)
        currentProcess.value = updatedProcess.data
      } catch (refetchError) {
      }

      // Se houve erros, reportar mas não falhar completamente
      if (uploadErrors.length > 0) {
        const errorMessage = `${uploadErrors.length} arquivo(s) falharam: ${uploadErrors.map(e => e.file).join(', ')}`
        throw new Error(errorMessage)
      }

      return {
        processId,
        uploadResults,
        updatedProcess: currentProcess.value
      }

    } catch (error) {
      throw error
    }
  }

  // ✅ MANTIDO: Outros métodos existentes
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

  async function fetchMyTasks() {
    loading.value = true
    error.value = null

    try {
      const response = await api.get('/processes/my/tasks')
      myTasks.value = response.data
      return response.data
    } catch (err) {
      error.value = err.response?.data?.message || 'Erro ao buscar tarefas'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function fetchMyCreatedProcesses() {
    loading.value = true
    error.value = null

    try {
      const response = await api.get('/processes/my/created')
      myCreatedProcesses.value = response.data
      return response.data
    } catch (err) {
      error.value = err.response?.data?.message || 'Erro ao buscar processos criados'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function fetchDashboardStats() {
    loading.value = true
    error.value = null

    try {
      const response = await api.get('/processes/stats/dashboard')
      dashboardStats.value = response.data
      return response.data
    } catch (err) {
      error.value = err.response?.data?.message || 'Erro ao buscar estatísticas'
      throw err
    } finally {
      loading.value = false
    }
  }

async function executeStep(data) {
  loading.value = true
  error.value = null

  try {
    // Validação no store
    if (!data.stepExecutionId) {
      throw new Error('stepExecutionId é obrigatório')
    }

    if (typeof data.stepExecutionId !== 'string') {
      throw new Error('stepExecutionId deve ser uma string')
    }

    // Limpeza do payload
    const cleanPayload = {
      stepExecutionId: data.stepExecutionId,
      action: data.action || null,
      comment: data.comment || null,
      metadata: data.metadata && typeof data.metadata === 'object' ? data.metadata : {}
    }

    // Remover campos undefined/null desnecessários
    Object.keys(cleanPayload).forEach(key => {
      if (cleanPayload[key] === undefined) {
        delete cleanPayload[key]
      }
    })

    const response = await api.post('/processes/execute-step', cleanPayload)

    // Atualizar processo atual se estiver carregado
    if (currentProcess.value && response.data.processInstanceId) {
      await fetchProcess(currentProcess.value.id)
    }

    // Recarregar tarefas
    await fetchMyTasks()

    return response.data
  } catch (err) {
    error.value = err.response?.data?.message || 'Erro ao executar etapa'
    throw err
  } finally {
    loading.value = false
  }
}

  async function cancelProcess(processId, reason = '') {
    loading.value = true
    error.value = null

    try {
      const payload = reason && reason.trim() ? { reason: reason.trim() } : {}
      const response = await api.post(`/processes/${processId}/cancel`, payload)
      const updatedProcess = response.data

      if (currentProcess.value?.id === processId) {
        currentProcess.value = updatedProcess
      }

      if (Array.isArray(processes.value) && processes.value.length) {
        processes.value = processes.value.map(proc =>
          proc.id === processId ? updatedProcess : proc
        )
      }

      if (Array.isArray(myCreatedProcesses.value) && myCreatedProcesses.value.length) {
        myCreatedProcesses.value = myCreatedProcesses.value.map(proc =>
          proc.id === processId ? updatedProcess : proc
        )
      }

      if (Array.isArray(myTasks.value) && myTasks.value.length) {
        myTasks.value = myTasks.value.filter(task => task.processInstance?.id !== processId)
      }

      return updatedProcess
    } catch (err) {
      error.value = err.response?.data?.message || 'Erro ao cancelar processo'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function uploadAttachment(file, stepExecutionId, options = {}) {
    loading.value = true
    error.value = null

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('stepExecutionId', stepExecutionId)

      // Se é um arquivo de campo do formulário da etapa, marcar para não aparecer em assinaturas
      if (options.isStepFormField) {
        formData.append('isStepFormField', 'true')
      }
      if (options.fieldName) {
        formData.append('fieldName', options.fieldName)
      }

      const response = await api.post('/attachments/upload', formData)
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

  // Utility methods
  function clearError() {
    error.value = null
  }

  function clearCurrentProcess() {
    currentProcess.value = null
  }

  function clearProcesses() {
    processes.value = []
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
    
    // Actions - PRINCIPAIS REFATORADOS
    createProcess,           // ✅ REFATORADO: só JSON
    uploadProcessFieldFile,  // ✅ NOVO: upload individual
    uploadProcessFiles,      // ✅ NOVO: upload em lote por campo
    
    // Actions - Mantidas
    fetchProcess,
    fetchProcesses,
    fetchMyTasks,
    fetchMyCreatedProcesses,
    fetchDashboardStats,
    executeStep,
    cancelProcess,
    uploadAttachment,
    signAttachment,
    
    // Utils
    clearError,
    clearCurrentProcess,
    clearProcesses,
  }
})
