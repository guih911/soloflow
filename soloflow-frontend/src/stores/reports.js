import { defineStore } from 'pinia'
import api from '@/services/api'

export const useReportsStore = defineStore('reports', {
  state: () => ({
    dashboardData: null,
    performanceData: null,
    reportData: null,
    filters: {
      startDate: '',
      endDate: '',
      status: '',
      sectorId: '',
      userId: '',
    },
    loading: false,
    error: null,
  }),

  actions: {
    async fetchDashboard(filters = {}) {
      this.loading = true
      this.error = null
      try {
        const params = { ...filters }
        Object.keys(params).forEach(key => {
          if (!params[key]) delete params[key]
        })
        const { data } = await api.get('/reports/dashboard', { params })
        this.dashboardData = data
        return data
      } catch (err) {
        this.error = err.response?.data?.message || 'Erro ao carregar dashboard'
        throw err
      } finally {
        this.loading = false
      }
    },

    async fetchPerformance(filters = {}) {
      this.loading = true
      this.error = null
      try {
        const params = { ...filters }
        Object.keys(params).forEach(key => {
          if (!params[key]) delete params[key]
        })
        const { data } = await api.get('/reports/performance', { params })
        this.performanceData = data
        return data
      } catch (err) {
        this.error = err.response?.data?.message || 'Erro ao carregar dados de performance'
        throw err
      } finally {
        this.loading = false
      }
    },

    async fetchReport(type, filters = {}) {
      this.loading = true
      this.error = null
      try {
        const params = { ...this.filters, ...filters }
        // Remove empty params
        Object.keys(params).forEach(key => {
          if (!params[key]) delete params[key]
        })
        const { data } = await api.get(`/reports/${type}`, { params })
        this.reportData = data
        return data
      } catch (err) {
        this.error = err.response?.data?.message || 'Erro ao carregar relatório'
        throw err
      } finally {
        this.loading = false
      }
    },

    async exportPdf(type, filters = {}) {
      try {
        const params = { ...this.filters, ...filters }
        Object.keys(params).forEach(key => {
          if (!params[key]) delete params[key]
        })
        const response = await api.get(`/reports/export/${type}`, {
          params,
          responseType: 'blob',
        })
        // Download do arquivo
        const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }))
        const link = document.createElement('a')
        link.href = url
        link.setAttribute('download', `relatorio-${type.toLowerCase()}-${Date.now()}.pdf`)
        document.body.appendChild(link)
        link.click()
        link.remove()
        window.URL.revokeObjectURL(url)
      } catch (err) {
        const message = err.response?.data?.message || 'Erro ao exportar PDF'
        throw new Error(message)
      }
    },

    resetFilters() {
      this.filters = {
        startDate: '',
        endDate: '',
        status: '',
        sectorId: '',
        userId: '',
      }
    },
  },
})
