import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/services/api'

export const useChildProcessStore = defineStore('childProcesses', () => {
  const configs = ref([])
  const childProcesses = ref([])
  const parentProcess = ref(null)
  const loading = ref(false)
  const error = ref(null)

  // ════════════════════════════════════════════════════════════════════════════════
  // CONFIGURAÇÕES DE SUB-PROCESSOS
  // ════════════════════════════════════════════════════════════════════════════════

  async function createConfig(data) {
    loading.value = true
    error.value = null

    try {
      const response = await api.post('/child-processes/configs', data)
      configs.value.push(response.data)
      return response.data
    } catch (err) {
      error.value = err.response?.data?.message || 'Erro ao criar configuração'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function updateConfig(configId, data) {
    loading.value = true
    error.value = null

    try {
      const response = await api.put(`/child-processes/configs/${configId}`, data)

      const index = configs.value.findIndex(c => c.id === configId)
      if (index !== -1) {
        configs.value[index] = response.data
      }

      return response.data
    } catch (err) {
      error.value = err.response?.data?.message || 'Erro ao atualizar configuração'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function deleteConfig(configId) {
    loading.value = true
    error.value = null

    try {
      await api.delete(`/child-processes/configs/${configId}`)
      configs.value = configs.value.filter(c => c.id !== configId)
    } catch (err) {
      error.value = err.response?.data?.message || 'Erro ao remover configuração'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function fetchConfigs(processInstanceId) {
    loading.value = true
    error.value = null

    try {
      const response = await api.get(`/child-processes/configs/process/${processInstanceId}`)
      configs.value = response.data
      return response.data
    } catch (err) {
      error.value = err.response?.data?.message || 'Erro ao buscar configurações'
      throw err
    } finally {
      loading.value = false
    }
  }

  // ════════════════════════════════════════════════════════════════════════════════
  // SUB-PROCESSOS
  // ════════════════════════════════════════════════════════════════════════════════

  async function createChildProcess(data) {
    loading.value = true
    error.value = null

    try {
      const response = await api.post('/child-processes', data)
      childProcesses.value.unshift(response.data)
      return response.data
    } catch (err) {
      error.value = err.response?.data?.message || 'Erro ao criar sub-processo'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function fetchChildProcesses(parentProcessInstanceId) {
    loading.value = true
    error.value = null

    try {
      const response = await api.get(`/child-processes/parent/${parentProcessInstanceId}`)
      childProcesses.value = response.data
      return response.data
    } catch (err) {
      error.value = err.response?.data?.message || 'Erro ao buscar sub-processos'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function fetchParentProcess(childProcessInstanceId) {
    loading.value = true
    error.value = null

    try {
      const response = await api.get(`/child-processes/child/${childProcessInstanceId}/parent`)
      parentProcess.value = response.data
      return response.data
    } catch (err) {
      error.value = err.response?.data?.message || 'Erro ao buscar processo pai'
      throw err
    } finally {
      loading.value = false
    }
  }

  // ════════════════════════════════════════════════════════════════════════════════
  // UTILITÁRIOS
  // ════════════════════════════════════════════════════════════════════════════════

  function clearError() {
    error.value = null
  }

  function clearChildProcesses() {
    childProcesses.value = []
  }

  function clearConfigs() {
    configs.value = []
  }

  return {
    // State
    configs,
    childProcesses,
    parentProcess,
    loading,
    error,

    // Config Actions
    createConfig,
    updateConfig,
    deleteConfig,
    fetchConfigs,

    // Child Process Actions
    createChildProcess,
    fetchChildProcesses,
    fetchParentProcess,

    // Utils
    clearError,
    clearChildProcesses,
    clearConfigs,
  }
})
