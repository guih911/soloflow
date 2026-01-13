import { defineStore } from 'pinia'
import axios from 'axios'
import { useAuthStore } from './auth'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

export const useSignaturesStore = defineStore('signatures', {
  state: () => ({
    signatureRequirements: [],
    attachmentSignatures: [],
    loading: false,
    error: null
  }),

  actions: {
    async signDocument(signatureData) {
      this.loading = true
      this.error = null

      try {
        const authStore = useAuthStore()
        const response = await axios.post(
          `${API_URL}/signatures/sign`,
          signatureData,
          {
            headers: { 'Authorization': `Bearer ${authStore.token}` }
          }
        )

        return response.data
      } catch (error) {
        this.error = error.response?.data?.message || 'Erro ao assinar documento'
        throw error
      } finally {
        this.loading = false
      }
    },

    async signSubTaskDocument(signatureData) {
      this.loading = true
      this.error = null

      try {
        const authStore = useAuthStore()
        const response = await axios.post(
          `${API_URL}/signatures/sign-subtask`,
          signatureData,
          {
            headers: { 'Authorization': `Bearer ${authStore.token}` }
          }
        )

        return response.data
      } catch (error) {
        this.error = error.response?.data?.message || 'Erro ao assinar documento da sub-tarefa'
        throw error
      } finally {
        this.loading = false
      }
    },

    async validateSignaturePublic(signatureToken, documentHash = null) {
      this.loading = true
      this.error = null

      try {
        const response = await axios.post(
          `${API_URL}/signatures/public/validate`,
          {
            signatureToken,
            documentHash
          }
        )

        return response.data
      } catch (error) {
        this.error = error.response?.data?.message || 'Erro ao validar assinatura'
        throw error
      } finally {
        this.loading = false
      }
    },

    async createSignatureRequirement(requirementData) {
      this.loading = true
      this.error = null

      try {
        const authStore = useAuthStore()
        const response = await axios.post(
          `${API_URL}/signatures/requirements`,
          requirementData,
          {
            headers: { 'Authorization': `Bearer ${authStore.token}` }
          }
        )

        return response.data
      } catch (error) {
        this.error = error.response?.data?.message || 'Erro ao criar requisito de assinatura'
        throw error
      } finally {
        this.loading = false
      }
    },

    async createMultipleSignatureRequirements(requirements) {
      this.loading = true
      this.error = null

      try {
        const authStore = useAuthStore()

        console.log('Creating multiple signature requirements:', requirements)

        // Usar endpoint batch para criar todos de uma vez
        const response = await axios.post(
          `${API_URL}/signatures/requirements/batch`,
          requirements,
          {
            headers: { 'Authorization': `Bearer ${authStore.token}` }
          }
        )

        console.log('Batch signature requirements response:', response.data)

        if (response.data.errors && response.data.errors.length > 0) {
          console.error('Some requirements failed:', response.data.errors)
        }

        return response.data
      } catch (error) {
        this.error = error.response?.data?.message || 'Erro ao criar requisitos de assinatura'
        console.error('Error creating signature requirements:', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    async fetchSignatureRequirements(stepVersionId) {
      this.loading = true
      this.error = null

      try {
        const authStore = useAuthStore()
        const response = await axios.get(
          `${API_URL}/signatures/requirements/step/${stepVersionId}`,
          {
            headers: { 'Authorization': `Bearer ${authStore.token}` }
          }
        )

        this.signatureRequirements = response.data
        return response.data
      } catch (error) {
        this.error = error.response?.data?.message || 'Erro ao buscar requisitos de assinatura'
        throw error
      } finally {
        this.loading = false
      }
    },

    async fetchAttachmentSignatures(attachmentId) {
      this.loading = true
      this.error = null

      try {
        const authStore = useAuthStore()
        const response = await axios.get(
          `${API_URL}/signatures/attachments/${attachmentId}`,
          {
            headers: { 'Authorization': `Bearer ${authStore.token}` }
          }
        )

        this.attachmentSignatures = response.data
        return response.data
      } catch (error) {
        this.error = error.response?.data?.message || 'Erro ao buscar assinaturas do anexo'
        throw error
      } finally {
        this.loading = false
      }
    },

    async verifySignatures(attachmentId) {
      this.loading = true
      this.error = null

      try {
        const authStore = useAuthStore()
        const response = await axios.get(
          `${API_URL}/signatures/verify/${attachmentId}`,
          {
            headers: { 'Authorization': `Bearer ${authStore.token}` }
          }
        )

        return response.data
      } catch (error) {
        this.error = error.response?.data?.message || 'Erro ao verificar assinaturas'
        throw error
      } finally {
        this.loading = false
      }
    }
  }
})
