import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/services/api'

export const useCompanyStore = defineStore('company', () => {
  const companies = ref([])
  const currentCompany = ref(null)
  const loading = ref(false)
  const error = ref(null)

  function normalizeCompanyPayload(data) {
    const payload = { ...data }

    if (typeof payload.name === 'string') {
      payload.name = payload.name.trim()
    }

    if (typeof payload.cnpj === 'string') {
      const digits = payload.cnpj.replace(/\D/g, '')
      payload.cnpj = digits
    }

    if (typeof payload.email === 'string') {
      const trimmed = payload.email.trim()
      if (!trimmed) {
        delete payload.email
      } else {
        payload.email = trimmed
      }
    }

    if (typeof payload.phone === 'string') {
      const digits = payload.phone.replace(/\D/g, '')
      if (!digits) {
        delete payload.phone
      } else {
        payload.phone = digits
      }
    }

    return payload
  }

  async function fetchCompanies() {
    loading.value = true
    error.value = null
    
    try {
      const response = await api.get('/companies')
      companies.value = response.data
    } catch (err) {
      error.value = err.response?.data?.message || 'Erro ao buscar empresas'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function fetchCompany(id) {
    loading.value = true
    error.value = null
    
    try {
      const response = await api.get(`/companies/${id}`)
      currentCompany.value = response.data
      return response.data
    } catch (err) {
      error.value = err.response?.data?.message || 'Erro ao buscar empresa'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function createCompany(data) {
    loading.value = true
    error.value = null
    
    try {
      const payload = normalizeCompanyPayload(data)
      const response = await api.post('/companies', payload)
      companies.value.push(response.data)
      return response.data
    } catch (err) {
      error.value = err.response?.data?.message || 'Erro ao criar empresa'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function updateCompany(id, data) {
    loading.value = true
    error.value = null

    try {
      const payload = normalizeCompanyPayload(data)
      const response = await api.patch(`/companies/${id}`, payload)
      const index = companies.value.findIndex(company => company.id === id)
      if (index !== -1) {
        companies.value[index] = {
          ...companies.value[index],
          ...response.data
        }
      }
      if (currentCompany.value?.id === id) {
        currentCompany.value = response.data
      }
      return response.data
    } catch (err) {
      error.value = err.response?.data?.message || 'Erro ao atualizar empresa'
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    companies,
    currentCompany,
    loading,
    error,
    fetchCompanies,
    fetchCompany,
    createCompany,
    updateCompany,
  }
})
