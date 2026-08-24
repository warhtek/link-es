import { Server as SocketServer, type Socket } from 'socket.io'
import type { Server as HttpServer } from 'node:http'
import { prisma } from './lib/prisma.js'
import { verifyAccessToken } from './lib/tokens.js'

// Salas por conversación: conversation:<id>. Solo participantes autenticados.
export function setupSocket(httpServer: HttpServer) {
  const io = new SocketServer(httpServer, {
    cors: { origin: process.env.CORS_ORIGIN?.split(',') ?? true },
  })

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined
    const payload = token ? verifyAccessToken(token) : null
    if (!payload) {
      next(new Error('unauthorized'))
      return
    }
    socket.data.userId = payload.sub
    next()
  })

  io.on('connection', (socket: Socket) => {
    console.log(`[link-es-socket] conectado usuario ${socket.data.userId}`)

    socket.on('conversation:join', async (conversationId: string) => {
      const isParticipant = await prisma.conversation.findFirst({
        where: { id: String(conversationId), OR: [{ clientId: socket.data.userId }, { provider: { userId: socket.data.userId } }] },
        select: { id: true },
      })
      if (isParticipant) socket.join(`conversation:${conversationId}`)
    })

    socket.on('message:send', async (input: { conversationId?: string; body?: string }, ack?: (result: { ok: boolean; error?: string; message?: unknown }) => void) => {
      const conversationId = String(input?.conversationId ?? '')
      const body = String(input?.body ?? '').trim()
      if (!conversationId || !body || body.length > 2000) {
        ack?.({ ok: false, error: 'validation_error' })
        return
      }
      const conversation = await prisma.conversation.findFirst({
        where: { id: conversationId, OR: [{ clientId: socket.data.userId }, { provider: { userId: socket.data.userId } }] },
        select: { id: true },
      })
      if (!conversation) {
        ack?.({ ok: false, error: 'forbidden' })
        return
      }
      const message = await prisma.message.create({
        data: { conversationId, senderId: socket.data.userId, body },
      })
      await prisma.conversation.update({
        where: { id: conversationId },
        data: { lastMessage: message.createdAt },
      })
      ack?.({ ok: true, message })
      io.to(`conversation:${conversationId}`).emit('message:new', message)
    })

    // Marcar leídos: el remitente distinto de mí deja de contar como no leído.
    socket.on('conversation:read', async (conversationId: string) => {
      await prisma.message.updateMany({
        where: { conversationId: String(conversationId), senderId: { not: socket.data.userId }, readAt: null },
        data: { readAt: new Date() },
      })
    })

    socket.on('disconnect', () => {
      console.log(`[link-es-socket] desconectado usuario ${socket.data.userId}`)
    })
  })

  return io
}
