import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

export function useAttachment() {
  /**
   * Busca attachment com autenticação
   */
  async function fetchAttachment(attachmentId) {
    const token = localStorage.getItem('token')
    if (!token) {
      throw new Error('Token não encontrado')
    }

    const response = await axios.get(
      `${API_URL}/processes/attachment/${attachmentId}/view`,
      {
        headers: {
          Authorization: `Bearer ${token}`
        },
        responseType: 'blob'
      }
    )

    return response.data
  }

  /**
   * Baixa attachment com autenticação
   */
  async function downloadAttachment(attachmentId, fileName) {
    const token = localStorage.getItem('token')
    if (!token) {
      throw new Error('Token não encontrado')
    }

    const response = await axios.get(
      `${API_URL}/processes/attachment/${attachmentId}/download`,
      {
        headers: {
          Authorization: `Bearer ${token}`
        },
        responseType: 'blob'
      }
    )

    // Criar URL do blob e fazer download
    const url = window.URL.createObjectURL(response.data)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName || 'arquivo'
    document.body.appendChild(a)
    a.click()
    a.remove()
    window.URL.revokeObjectURL(url)
  }

  /**
   * Cria URL de visualização com blob
   */
  async function getPreviewUrl(attachmentId) {
    const blob = await fetchAttachment(attachmentId)
    return URL.createObjectURL(blob)
  }

  return {
    fetchAttachment,
    downloadAttachment,
    getPreviewUrl
  }
}
