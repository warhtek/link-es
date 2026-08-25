import { io, type Socket } from 'socket.io-client'
import { useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getAccessToken, type BookingStatusValue } from './api'

const SOCKET_ORIGIN = (import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api').replace(/\/api$/, '')

let socket: Socket | null = null

// Conexión única por pestaña; el token viaja en el handshake.
export function getSocket(): Socket {
  if (!socket || socket.disconnected) {
    socket?.close()
    socket = io(SOCKET_ORIGIN, { auth: { token: getAccessToken() ?? undefined } })
  }
  return socket
}

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api'

async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { Authorization: `Bearer ${getAccessToken()}` },
  })
  if (!res.ok) throw new Error('chat_request_failed')
  return res.json()
}

export interface ConversationItem {
  id: string
  counterpart: { type: 'client' | 'provider'; name: string }
  bookingCode: string | null
  bookingStatus: BookingStatusValue | null
  unreadCount: number
  lastMessage: { body: string; createdAt: string; senderId: string } | null
}

export function useConversations() {
  const queryClient = useQueryClient()
  const query = useQuery({
    queryKey: ['conversations'],
    queryFn: () => apiGet<ConversationItem[]>('/conversations'),
    enabled: Boolean(getAccessToken()),
  })

  // Mensajes entrantes actualizan la lista (orden y no leídos).
  useEffect(() => {
    if (!getAccessToken()) return
    const s = getSocket()
    const onNew = () => void queryClient.invalidateQueries({ queryKey: ['conversations'] })
    s.on('message:new', onNew)
    return () => {
      s.off('message:new', onNew)
    }
  }, [queryClient])

  return query
}

export interface ChatMessage {
  id: string
  conversationId: string
  senderId: string
  body: string
  readAt: string | null
  createdAt: string
}

export function useConversationMessages(conversationId: string | undefined, myUserId: string | undefined) {
  const queryClient = useQueryClient()
  const query = useQuery({
    queryKey: ['messages', conversationId],
    queryFn: async (): Promise<ChatMessage[]> => {
      const messages = await apiGet<ChatMessage[]>(`/conversations/${conversationId}/messages`)
      // Abrir el hilo marca leídos en el servidor; reflejarlo localmente.
      return messages.map((m) =>
        m.senderId !== myUserId && !m.readAt ? { ...m, readAt: new Date().toISOString() } : m,
      )
    },
    enabled: Boolean(conversationId && getAccessToken()),
  })

  useEffect(() => {
    if (!conversationId) return
    const s = getSocket()
    const appendOrBump = (message: ChatMessage) => {
      if (message.conversationId !== conversationId) return
      queryClient.setQueryData<ChatMessage[]>(['messages', conversationId], (prev = []) => {
        if (prev.some((m) => m.id === message.id)) return prev
        return [...prev, message]
      })
    }
    s.on('message:new', appendOrBump)
    return () => {
      s.off('message:new', appendOrBump)
    }
  }, [conversationId, queryClient])

  return query
}

export function useSendMessage() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { conversationId: string; body: string }) =>
      new Promise<ChatMessage>((resolve, reject) => {
        getSocket().emit(
          'message:send',
          input,
          (result: { ok: boolean; error?: string; message?: ChatMessage }) => {
            if (result.ok && result.message) resolve(result.message)
            else reject(new Error(result.error ?? 'send_failed'))
          },
        )
      }),
    onSuccess: (message) => {
      // El eco del propio mensaje llega también por broadcast; evitar duplicado.
      queryClient.setQueryData<ChatMessage[]>(
        ['messages', message.conversationId],
        (prev = []) => (prev.some((m) => m.id === message.id) ? prev : [...prev, message]),
      )
    },
  })
}

// Unirse a la sala al abrir un hilo + marcar como leído.
// Unirse a la sala al abrir un hilo + marcar como leídos.
// Re-emitir en cada 'connect': si la conexión tarda o se recupera,
// el join vuelve a enviarse sin quedar perdido en el buffer.
export function useJoinConversation(conversationId: string | undefined) {
  useEffect(() => {
    if (!conversationId || !getAccessToken()) return
    const s = getSocket()
    const join = () => {
      s.emit('conversation:join', conversationId)
      s.emit('conversation:read', conversationId)
    }
    join()
    s.on('connect', join)
    return () => {
      s.off('connect', join)
    }
  }, [conversationId])
}
