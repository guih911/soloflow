// src/stores/users.js - Versao melhorada
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
      
      // Validar dados antes de enviar
      if (!data.name || !data.email) {
        throw new Error('Nome e email são obrigatórios')
      }

      if (!data.password && !data.id) {
        throw new Error('Senha é obrigatória para novos usuários')
      }

      if (!data.companies || data.companies.length === 0) {
        throw new Error('Pelo menos uma empresa deve ser especificada')
      }

      // Verificar se há empresa padrão
      const hasDefault = data.companies.some(c => c.isDefault)
      if (!hasDefault) {
        data.companies[0].isDefault = true
      }

      // Estrutura correta para envio
      const userData = {
        name: data.name.trim(),
        email: data.email.trim().toLowerCase(),
        password: data.password,
        cpf: data.cpf || null,
        companies: data.companies.map(company => ({
          companyId: company.companyId,
          sectorId: company.sectorId || null,
          profileId: company.profileId,
          isDefault: Boolean(company.isDefault)
          // role removido - backend define USER automaticamente
        }))
      }
      
      console.log('Sending user data:', userData)
      
      const response = await api.post('/users', userData)
      
      console.log('User created successfully:', response.data)
      
      // Atualizar lista local
      await fetchUsers()
      
      return response.data
    } catch (err) {
      console.error('Error creating user:', err)
      
      let errorMessage = 'Erro ao criar usuário'
      
      if (err.response?.data?.message) {
        errorMessage = err.response.data.message
      } else if (err.message) {
        errorMessage = err.message
      }
      
      // Tratar erros específicos
      if (err.response?.status === 409) {
        errorMessage = 'Email já está em uso por outro usuário'
      } else if (err.response?.status === 400) {
        errorMessage = err.response.data?.message || 'Dados inválidos fornecidos'
      } else if (err.response?.status === 403) {
        errorMessage = 'Você não tem permissão para realizar esta ação'
      }
      
      error.value = errorMessage
      
      // Log detalhado do erro para debug
      if (err.response?.data) {
        console.error('Server error details:', err.response.data)
      }
      
      throw new Error(errorMessage)
    } finally {
      loading.value = false
    }
  }

  async function updateUser(id, data) {
    loading.value = true
    error.value = null
    
    try {
      console.log('Updating user with data:', data)
      
      // Filtrar apenas campos que podem ser atualizados
      const updateData = {}
      if (data.name !== undefined) updateData.name = data.name.trim()
      if (data.isActive !== undefined) updateData.isActive = data.isActive
      
      const response = await api.patch(`/users/${id}`, updateData)
      
      console.log('User updated successfully:', response.data)
      
      // Atualizar na lista local
      const index = users.value.findIndex(u => u.id === id)
      if (index !== -1) {
        users.value[index] = { ...users.value[index], ...response.data }
      }
      
      return response.data
    } catch (err) {
      console.error('Error updating user:', err)
      
      let errorMessage = 'Erro ao atualizar usuário'
      if (err.response?.data?.message) {
        errorMessage = err.response.data.message
      }
      
      error.value = errorMessage
      throw new Error(errorMessage)
    } finally {
      loading.value = false
    }
  }

  async function updateUserCompanies(id, companiesData) {
    loading.value = true
    error.value = null
    
    try {
      console.log('Updating user companies:', { id, companiesData })
      
      // Validar dados
      if (!companiesData || companiesData.length === 0) {
        throw new Error('Pelo menos uma empresa deve ser especificada')
      }

      // Verificar se há empresa padrão
      const hasDefault = companiesData.some(c => c.isDefault)
      if (!hasDefault) {
        companiesData[0].isDefault = true
      }

      // Preparar dados
      const companies = companiesData.map(company => ({
        companyId: company.companyId,
        sectorId: company.sectorId || null,
        profileId: company.profileId,
        isDefault: Boolean(company.isDefault)
        // role removido - backend define USER automaticamente
      }))
      
      const response = await api.patch(`/users/${id}/companies`, { companies })
      
      console.log('User companies updated successfully:', response.data)
      
      // Atualizar lista completa
      await fetchUsers()
      
      return response.data
    } catch (err) {
      console.error('Error updating user companies:', err)
      
      let errorMessage = 'Erro ao atualizar empresas do usuário'
      if (err.response?.data?.message) {
        errorMessage = err.response.data.message
      }
      
      error.value = errorMessage
      throw new Error(errorMessage)
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
        users.value[index] = { ...users.value[index], ...response.data }
      }
      
      return response.data
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Erro ao atribuir setor'
      error.value = errorMessage
      throw new Error(errorMessage)
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
      
      console.log('User deleted successfully')
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Erro ao remover usuário'
      error.value = errorMessage
      throw new Error(errorMessage)
    } finally {
      loading.value = false
    }
  }

  async function resetUserPassword(userId, newPassword) {
    loading.value = true
    error.value = null

    try {
      console.log('Resetting password for user:', userId)

      if (!newPassword || newPassword.length < 6) {
        throw new Error('Senha deve ter no mínimo 6 caracteres')
      }

      await api.patch(`/users/${userId}/reset-password`, { newPassword })

      console.log('Password reset successfully')
    } catch (err) {
      console.error('Error resetting password:', err)
      const errorMessage = err.response?.data?.message || 'Erro ao resetar senha'
      error.value = errorMessage
      throw new Error(errorMessage)
    } finally {
      loading.value = false
    }
  }

  function clearError() {
    error.value = null
  }

  // Funções utilitárias
  function validateUserData(data) {
    const errors = []
    
    if (!data.name || data.name.trim().length < 3) {
      errors.push('Nome deve ter pelo menos 3 caracteres')
    }
    
    if (!data.email || !data.email.includes('@')) {
      errors.push('Email inválido')
    }
    
    if (!data.password && !data.id) {
      errors.push('Senha é obrigatória')
    }
    
    if (!data.companies || data.companies.length === 0) {
      errors.push('Pelo menos uma empresa deve ser especificada')
    }
    
    if (data.companies) {
      data.companies.forEach((company, index) => {
        if (!company.companyId) {
          errors.push(`Empresa ${index + 1}: ID da empresa é obrigatório`)
        }
        if (!company.profileId) {
          errors.push(`Empresa ${index + 1}: Perfil de acesso é obrigatório`)
        }
      })
      
      const hasDefault = data.companies.some(c => c.isDefault)
      if (!hasDefault) {
        errors.push('Pelo menos uma empresa deve ser marcada como padrão')
      }
    }
    
    return errors
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
    updateUserCompanies,
    assignSector,
    deleteUser,
    resetUserPassword,
    clearError,
    validateUserData,
  }
})
