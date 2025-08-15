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
      console.log('🚀 Creating process (step 1/2): JSON data only')
      
      // 🔧 CRÍTICO: Filtrar apenas dados não-arquivo do formData
      const sanitizedFormData = {}
      if (data.formData) {
        Object.keys(data.formData).forEach(fieldName => {
          const fieldValue = data.formData[fieldName]
          // Verificar se é array de arquivos (tem propriedade .file)
          if (Array.isArray(fieldValue) && fieldValue.length > 0 && fieldValue[0]?.file instanceof File) {
            // PULAR - é campo de arquivo, será enviado depois
            console.log(`📎 Skipping file field: ${fieldName} (${fieldValue.length} files)`)
          } else {
            // Incluir - é campo normal (string, number, date, etc.)
            sanitizedFormData[fieldName] = fieldValue
          }
        })
      }

      // 🔧 Payload limpo (apenas dados JSON)
      const cleanPayload = {
        processTypeId: data.processTypeId,
        title: data.title,
        description: data.description,
        formData: data.formData // Já deve estar sanitizado
      }
console.log('📤 Sending clean payload:', cleanPayload)
      
      const response = await api.post('/processes', cleanPayload)
      
      console.log('✅ Process created (step 1/2):', response.data.code)
      
      // Adicionar à lista local
      if (processes.value.length > 0) {
        processes.value.unshift(response.data)
      }
      
      return response.data
    } catch (err) {
      console.error('❌ Error creating process:', err)
      error.value = err.response?.data?.message || 'Erro ao criar processo'
      throw err
    } finally {
      loading.value = false
    }
  }

  // ✅ ETAPA 2: Helper para upload individual por campo
  async function uploadProcessFieldFile(processId, fieldName, file) {
    console.log(`📁 Uploading file for field ${fieldName}:`, file.name)
    
    const formData = new FormData()
    formData.append('file', file)
    formData.append('fieldName', fieldName)

    try {
      const response = await api.post(`/processes/${processId}/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        // 🔧 BÔNUS: Progress tracking
        onUploadProgress: (progressEvent) => {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total)
          console.log(`📊 Upload progress for ${file.name}: ${progress}%`)
        }
      })
      
      console.log(`✅ File uploaded for field ${fieldName}:`, response.data)
      return response.data
    } catch (err) {
      console.error(`❌ Error uploading file for field ${fieldName}:`, err)
      throw new Error(`Erro ao enviar arquivo para ${fieldName}: ${err.response?.data?.message || err.message}`)
    }
  }

  // ✅ ETAPA 2: Upload de todos os arquivos por campo (fluxo principal)
  async function uploadProcessFiles(processId, filesMap) {
    console.log('📁 Starting bulk file upload for process:', processId)
    console.log('📋 Files map:', Object.keys(filesMap))
    
    const uploadResults = []
    const uploadErrors = []

    try {
      // 🔧 Iterar por cada campo que tem arquivos
      for (const [fieldName, fileList] of Object.entries(filesMap)) {
        console.log(`📂 Processing field: ${fieldName} (${fileList.length} files)`)
        
        // 🔧 Para cada arquivo do campo
        for (const fileItem of fileList) {
          try {
            // Extrair o File objeto (pode estar em .file ou ser o próprio objeto)
            const file = fileItem?.file || fileItem
            
            if (!(file instanceof File)) {
              console.warn(`⚠️ Skipping invalid file in field ${fieldName}:`, fileItem)
              continue
            }

            const result = await uploadProcessFieldFile(processId, fieldName, file)
            uploadResults.push({ fieldName, file: file.name, result })
            
            // 🔧 PERFORMANCE: Pequeno delay para não sobrecarregar
            await new Promise(resolve => setTimeout(resolve, 200))
            
          } catch (fileError) {
            console.error(`❌ Failed to upload file in field ${fieldName}:`, fileError)
            uploadErrors.push({ fieldName, file: fileItem?.name || 'unknown', error: fileError.message })
          }
        }
      }

      // ✅ GARANTIR: Refetch do processo para ter formData atualizado
      console.log('🔄 Refetching process to get updated formData...')
      const updatedProcess = await api.get(`/processes/${processId}`)
      currentProcess.value = updatedProcess.data
      
      console.log('✅ All files uploaded successfully!')
      console.log('📊 Upload summary:', {
        successful: uploadResults.length,
        failed: uploadErrors.length,
        results: uploadResults
      })

      // ✅ Se houve erros, reportar mas não falhar completamente
      if (uploadErrors.length > 0) {
        console.warn('⚠️ Some file uploads failed:', uploadErrors)
        const errorMessage = `${uploadErrors.length} arquivo(s) falharam: ${uploadErrors.map(e => e.file).join(', ')}`
        throw new Error(errorMessage)
      }

      return {
        processId,
        uploadResults,
        updatedProcess: currentProcess.value
      }

    } catch (error) {
      console.error('❌ Bulk upload failed:', error)
      throw error
    }
  }

  // ✅ MANTIDO: Outros métodos existentes
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
      const formData = new FormData()
      formData.append('file', file)                 
      formData.append('stepExecutionId', stepExecutionId)

      const response = await api.post('/attachments/upload', formData)
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
    uploadAttachment,
    signAttachment,
    
    // Utils
    clearError,
    clearCurrentProcess,
    clearProcesses,
  }
})