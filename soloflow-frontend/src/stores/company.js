import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/services/api'

export const useCompanyStore = defineStore('company', () => {
  const companies = ref([])
  const currentCompany = ref(null)
  const loading = ref(false)
  const error = ref(null)

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
      const response = await api.post('/companies', data)
      companies.value.push(response.data)
      return response.data
    } catch (err) {
      error.value = err.response?.data?.message || 'Erro ao criar empresa'
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
  }
})