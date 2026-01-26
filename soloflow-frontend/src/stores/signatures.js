import { defineStore } from 'pinia'
import api from '@/services/api'
import axios from 'axios'

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
        const response = await api.post('/signatures/sign', signatureData)
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
        const response = await api.post('/signatures/sign-subtask', signatureData)
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
        // Endpoint público - não precisa de autenticação, usa axios direto
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
        const response = await api.post('/signatures/requirements', requirementData)
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
        const response = await api.post('/signatures/requirements/batch', requirements)

        if (response.data.errors && response.data.errors.length > 0) {
        }

        return response.data
      } catch (error) {
        this.error = error.response?.data?.message || 'Erro ao criar requisitos de assinatura'
        throw error
      } finally {
        this.loading = false
      }
    },

    async fetchSignatureRequirements(stepVersionId) {
      this.loading = true
      this.error = null

      try {
        const response = await api.get(`/signatures/requirements/step/${stepVersionId}`)
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
        const response = await api.get(`/signatures/attachments/${attachmentId}`)
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
        const response = await api.get(`/signatures/verify/${attachmentId}`)
        return response.data
      } catch (error) {
        this.error = error.response?.data?.message || 'Erro ao verificar assinaturas'
        throw error
      } finally {
        this.loading = false
      }
    },

    async requestOtp(attachmentId, userPassword) {
      this.loading = true
      this.error = null

      try {
        const response = await api.post('/signatures/request-otp', {
          attachmentId,
          userPassword
        })
        return response.data
      } catch (error) {
        this.error = error.response?.data?.message || 'Erro ao solicitar código de verificação'
        throw error
      } finally {
        this.loading = false
      }
    },

    async verifyOtpAndSign(payload) {
      this.loading = true
      this.error = null

      try {
        const response = await api.post('/signatures/verify-otp', payload)
        return response.data
      } catch (error) {
        this.error = error.response?.data?.message || 'Erro ao verificar código e assinar documento'
        throw error
      } finally {
        this.loading = false
      }
    }
  }
})
