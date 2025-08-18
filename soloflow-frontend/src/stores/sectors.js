// src/stores/sectors.js
import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/services/api'

export const useSectorStore = defineStore('sectors', () => {
  const sectors = ref([])
  const currentSector = ref(null)
  const loading = ref(false)
  const error = ref(null)

  async function fetchSectors(companyId = null) {
    loading.value = true
    error.value = null
    
    try {
      console.log('Fetching sectors for company:', companyId)
      
      const params = companyId ? { companyId } : {}
      const response = await api.get('/sectors', { params })
      
      console.log('Sectors fetched:', response.data)
      sectors.value = response.data
      return response.data
    } catch (err) {
      console.error('Error fetching sectors:', err)
      error.value = err.response?.data?.message || 'Erro ao buscar setores'
      
      if (err.response?.status === 400) {
        window.showSnackbar?.('Erro: ID da empresa é obrigatório', 'error')
      }
      
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
      console.log('Creating sector with data:', data)
      
      const response = await api.post('/sectors', data)
      
      console.log('Sector created:', response.data)
      
      // Adicionar na lista local
      sectors.value.push(response.data)
      
      return response.data
    } catch (err) {
      console.error('Error creating sector:', err)
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
      console.log('Updating sector with data:', data)
      
      const response = await api.patch(`/sectors/${id}`, data)
      
      // Atualizar na lista local
      const index = sectors.value.findIndex(s => s.id === id)
      if (index !== -1) {
        sectors.value[index] = response.data
      }
      
      return response.data
    } catch (err) {
      console.error('Error updating sector:', err)
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
      
      // Remover da lista local
      sectors.value = sectors.value.filter(s => s.id !== id)
    } catch (err) {
      error.value = err.response?.data?.message || 'Erro ao remover setor'
      throw err
    } finally {
      loading.value = false
    }
  }

  function clearError() {
    error.value = null
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
    clearError,
  }
})