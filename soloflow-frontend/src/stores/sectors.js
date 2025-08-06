import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/services/api'

export const useSectorStore = defineStore('sectors', () => {
  const sectors = ref([])
  const currentSector = ref(null)
  const loading = ref(false)
  const error = ref(null)

  async function fetchSectors() {
    loading.value = true
    error.value = null
    
    try {
      const response = await api.get('/sectors')
      sectors.value = response.data
      return response.data
    } catch (err) {
      error.value = err.response?.data?.message || 'Erro ao buscar setores'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function fetchSector(id) {
    loading.value = true
    error.value = null
    
    try {
      const response = await api.get(`/sectors/${id}`)
      currentSector.value = response.data
      return response.data
    } catch (err) {
      error.value = err.response?.data?.message || 'Erro ao buscar setor'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function createSector(data) {
    loading.value = true
    error.value = null
    
    try {
      const response = await api.post('/sectors', data)
      sectors.value.push(response.data)
      return response.data
    } catch (err) {
      error.value = err.response?.data?.message || 'Erro ao criar setor'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function updateSector(id, data) {
    loading.value = true
    error.value = null
    
    try {
      const response = await api.patch(`/sectors/${id}`, data)
      const index = sectors.value.findIndex(s => s.id === id)
      if (index !== -1) {
        sectors.value[index] = response.data
      }
      return response.data
    } catch (err) {
      error.value = err.response?.data?.message || 'Erro ao atualizar setor'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function deleteSector(id) {
    loading.value = true
    error.value = null
    
    try {
      await api.delete(`/sectors/${id}`)
      sectors.value = sectors.value.filter(s => s.id !== id)
    } catch (err) {
      error.value = err.response?.data?.message || 'Erro ao remover setor'
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    sectors,
    currentSector,
    loading,
    error,
    fetchSectors,
    fetchSector,
    createSector,
    updateSector,
    deleteSector,
  }
})
