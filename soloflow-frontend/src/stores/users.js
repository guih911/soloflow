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
      console.log('Fetching users for company:', companyId)
      
      const params = companyId ? { companyId } : {}
      const response = await api.get('/users', { params })
      
      console.log('Users fetched:', response.data)
      users.value = response.data
      return response.data
    } catch (err) {
      console.error('Error fetching users:', err)
      error.value = err.response?.data?.message || 'Erro ao buscar usuários'
      
      // Se erro 400, pode ser problema de companyId
      if (err.response?.status === 400) {
        window.showSnackbar?.('Erro: ID da empresa é obrigatório', 'error')
      }
      
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
      console.log('Creating user with data:', data)
      
      // Garantir estrutura correta dos dados
      const userData = {
        name: data.name,
        email: data.email,
        password: data.password,
        role: data.role || 'USER',
        companyId: data.companyId, // Necessário para multi-empresa
        sectorId: data.sectorId || null,
        isDefault: true
      }
      
      console.log('Sending user data:', userData)
      
      const response = await api.post('/users', userData)
      
      console.log('User created:', response.data)
      
      // Adicionar na lista local se não existe
      const existingIndex = users.value.findIndex(u => u.id === response.data.id)
      if (existingIndex === -1) {
        users.value.push(response.data)
      } else {
        users.value[existingIndex] = response.data
      }
      
      return response.data
    } catch (err) {
      console.error('Error creating user:', err)
      error.value = err.response?.data?.message || 'Erro ao criar usuário'
      
      // Log detalhado do erro para debug
      if (err.response?.data) {
        console.error('Server error details:', err.response.data)
      }
      
      throw err
    } finally {
      loading.value = false
    }
  }

  async function updateUser(id, data) {
    loading.value = true
    error.value = null
    
    try {
      console.log('Updating user with data:', data)
      
      const response = await api.patch(`/users/${id}`, data)
      
      // Atualizar na lista local
      const index = users.value.findIndex(u => u.id === id)
      if (index !== -1) {
        users.value[index] = response.data
      }
      
      return response.data
    } catch (err) {
      console.error('Error updating user:', err)
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
      
      // Atualizar na lista local
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
      
      // Remover da lista local
      users.value = users.value.filter(u => u.id !== id)
    } catch (err) {
      error.value = err.response?.data?.message || 'Erro ao remover usuário'
      throw err
    } finally {
      loading.value = false
    }
  }

  function clearError() {
    error.value = null
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
    clearError,
  }
})