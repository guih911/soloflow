import { io } from 'socket.io-client'
import { ref } from 'vue'

let socket = null
const connected = ref(false)
let reconnectTimeout = null

export function useWebSocket() {
  function connect(token) {
    // Se já está conectado com o mesmo token, não reconectar
    if (socket?.connected) return socket

    // IMPORTANTE: Limpar conexão anterior antes de criar nova
    // Isso previne memory leak de listeners acumulados
    if (socket) {
      socket.removeAllListeners()
      socket.disconnect()
      socket = null
    }

    // Limpar timeout de reconexão pendente
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout)
      reconnectTimeout = null
    }

    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000'

    socket = io(`${baseUrl}/notifications`, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 10000,
      timeout: 20000,
    })

    socket.on('connect', () => {
      connected.value = true
    })

    socket.on('disconnect', (reason) => {
      connected.value = false
    })

    socket.on('connect_error', (error) => {
      connected.value = false
    })

    return socket
  }

  function disconnect() {
    // Limpar timeout de reconexão pendente
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout)
      reconnectTimeout = null
    }

    if (socket) {
      socket.removeAllListeners()
      socket.disconnect()
      socket = null
      connected.value = false
    }
  }

  function onNotification(callback) {
    if (socket) {
      socket.on('notification', callback)
    }
  }

  function offNotification(callback) {
    if (socket) {
      socket.off('notification', callback)
    }
  }

  function getSocket() {
    return socket
  }

  return {
    connected,
    connect,
    disconnect,
    onNotification,
    offNotification,
    getSocket,
  }
}
