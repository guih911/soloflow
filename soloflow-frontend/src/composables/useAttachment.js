import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

export function useAttachment() {
  /**
   * Verifica se é um anexo de sub-tarefa pelo ID
   */
  function isSubTaskAttachment(attachmentId) {
    return attachmentId && attachmentId.startsWith('subtask-')
  }

  /**
   * Extrai o ID real da sub-tarefa do ID do anexo
   */
  function getSubTaskId(attachmentId) {
    if (isSubTaskAttachment(attachmentId)) {
      return attachmentId.replace('subtask-', '')
    }
    return null
  }

  /**
   * Busca attachment com autenticação
   */
  async function fetchAttachment(attachmentId) {
    const token = localStorage.getItem('token')
    if (!token) {
      throw new Error('Token não encontrado')
    }

    // Determinar endpoint baseado no tipo de anexo
    let endpoint
    if (isSubTaskAttachment(attachmentId)) {
      const subTaskId = getSubTaskId(attachmentId)
      endpoint = `${API_URL}/sub-tasks/attachment/${subTaskId}/download`
    } else {
      endpoint = `${API_URL}/processes/attachment/${attachmentId}/view`
    }

    const response = await axios.get(endpoint, {
      headers: {
        Authorization: `Bearer ${token}`
      },
      responseType: 'blob'
    })

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

    // Determinar endpoint baseado no tipo de anexo
    let endpoint
    if (isSubTaskAttachment(attachmentId)) {
      const subTaskId = getSubTaskId(attachmentId)
      endpoint = `${API_URL}/sub-tasks/attachment/${subTaskId}/download`
    } else {
      endpoint = `${API_URL}/processes/attachment/${attachmentId}/download`
    }

    const response = await axios.get(endpoint, {
      headers: {
        Authorization: `Bearer ${token}`
      },
      responseType: 'blob'
    })

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
    getPreviewUrl,
    isSubTaskAttachment,
    getSubTaskId
  }
}
