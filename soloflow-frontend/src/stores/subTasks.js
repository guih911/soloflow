import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/services/api'

export const useSubTaskStore = defineStore('subTasks', () => {
  const subTasks = ref([])
  const loading = ref(false)
  const error = ref(null)

  // Buscar sub-tarefas de uma etapa
  async function fetchSubTasks(stepExecutionId) {
    loading.value = true
    error.value = null

    try {
      const response = await api.get(`/sub-tasks/step-execution/${stepExecutionId}`)
      subTasks.value = response.data
      return response.data
    } catch (err) {
      error.value = err.response?.data?.message || 'Erro ao buscar sub-tarefas'
      throw err
    } finally {
      loading.value = false
    }
  }

  // Criar sub-tarefa manual
  async function createSubTask(data) {
    loading.value = true
    error.value = null

    try {
      const response = await api.post('/sub-tasks', data)
      subTasks.value.push(response.data)
      return response.data
    } catch (err) {
      error.value = err.response?.data?.message || 'Erro ao criar sub-tarefa'
      throw err
    } finally {
      loading.value = false
    }
  }

  // Executar/atualizar status da sub-tarefa
  async function executeSubTask(subTaskId, status, comment = null) {
    loading.value = true
    error.value = null

    try {
      const response = await api.post('/sub-tasks/execute', {
        subTaskId,
        status,
        comment
      })

      // Atualizar na lista local
      const index = subTasks.value.findIndex(st => st.id === subTaskId)
      if (index !== -1) {
        subTasks.value[index] = response.data
      }

      return response.data
    } catch (err) {
      error.value = err.response?.data?.message || 'Erro ao executar sub-tarefa'
      throw err
    } finally {
      loading.value = false
    }
  }

  // Atualizar sub-tarefa
  async function updateSubTask(subTaskId, data) {
    loading.value = true
    error.value = null

    try {
      const response = await api.put(`/sub-tasks/${subTaskId}`, data)

      // Atualizar na lista local
      const index = subTasks.value.findIndex(st => st.id === subTaskId)
      if (index !== -1) {
        subTasks.value[index] = response.data
      }

      return response.data
    } catch (err) {
      error.value = err.response?.data?.message || 'Erro ao atualizar sub-tarefa'
      throw err
    } finally {
      loading.value = false
    }
  }

  // Deletar sub-tarefa
  async function deleteSubTask(subTaskId) {
    loading.value = true
    error.value = null

    try {
      await api.delete(`/sub-tasks/${subTaskId}`)

      // Remover da lista local
      subTasks.value = subTasks.value.filter(st => st.id !== subTaskId)
    } catch (err) {
      error.value = err.response?.data?.message || 'Erro ao remover sub-tarefa'
      throw err
    } finally {
      loading.value = false
    }
  }

  // Criar sub-tarefas a partir de templates
  async function createFromTemplates(stepExecutionId) {
    loading.value = true
    error.value = null

    try {
      const response = await api.post(`/sub-tasks/create-from-templates/${stepExecutionId}`)
      subTasks.value = response.data
      return response.data
    } catch (err) {
      error.value = err.response?.data?.message || 'Erro ao criar sub-tarefas'
      throw err
    } finally {
      loading.value = false
    }
  }

  // Verificar se todas as sub-tarefas obrigatórias foram concluídas
  async function checkAllRequiredCompleted(stepExecutionId) {
    try {
      const response = await api.get(`/sub-tasks/check-required/${stepExecutionId}`)
      return response.data.allRequiredCompleted
    } catch (err) {
      return true // Em caso de erro, assume que está ok
    }
  }

  function clearSubTasks() {
    subTasks.value = []
    error.value = null
  }

  return {
    subTasks,
    loading,
    error,
    fetchSubTasks,
    createSubTask,
    executeSubTask,
    updateSubTask,
    deleteSubTask,
    createFromTemplates,
    checkAllRequiredCompleted,
    clearSubTasks
  }
})
