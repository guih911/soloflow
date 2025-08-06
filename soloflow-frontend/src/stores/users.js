import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/services/api'

export const useUserStore = defineStore('users', () => {
  const users = ref([])
  const currentUser = ref(null)
  const loading = ref(false)
  const error = ref(null)

  async function fetchUsers(companyId = null) {
    loading.value = true
    error.value = null
    
    try {
      const params = companyId ? { companyId } : {}
      const response = await api.get('/users', { params })
      users.value = response.data
      return response.data
    } catch (err) {
      error.value = err.response?.data?.message || 'Erro ao buscar usuários'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function fetchUser(id) {
    loading.value = true
    error.value = null
    
    try {
      const response = await api.get(`/users/${id}`)
      currentUser.value = response.data
      return response.data
    } catch (err) {
      error.value = err.response?.data?.message || 'Erro ao buscar usuário'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function createUser(data) {
    loading.value = true
    error.value = null
    
    try {
      const response = await api.post('/users', data)
      users.value.push(response.data)
      return response.data
    } catch (err) {
      error.value = err.response?.data?.message || 'Erro ao criar usuário'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function updateUser(id, data) {
    loading.value = true
    error.value = null
    
    try {
      const response = await api.patch(`/users/${id}`, data)
      const index = users.value.findIndex(u => u.id === id)
      if (index !== -1) {
        users.value[index] = response.data
      }
      return response.data
    } catch (err) {
      error.value = err.response?.data?.message || 'Erro ao atualizar usuário'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function assignSector(userId, sectorId) {
    loading.value = true
    error.value = null
    
    try {
      const response = await api.patch(`/users/${userId}/sector`, { sectorId })
      const index = users.value.findIndex(u => u.id === userId)
      if (index !== -1) {
        users.value[index] = response.data
      }
      return response.data
    } catch (err) {
      error.value = err.response?.data?.message || 'Erro ao atribuir setor'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function deleteUser(id) {
    loading.value = true
    error.value = null
    
    try {
      await api.delete(`/users/${id}`)
      users.value = users.value.filter(u => u.id !== id)
    } catch (err) {
      error.value = err.response?.data?.message || 'Erro ao remover usuário'
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    users,
    currentUser,
    loading,
    error,
    fetchUsers,
    fetchUser,
    createUser,
    updateUser,
    assignSector,
    deleteUser,
  }
})
