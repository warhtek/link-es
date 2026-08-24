import { Router } from 'express'
import { z } from 'zod'
import type { Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma.js'
import { requireAuth } from '../middleware/auth.js'

export const conversationRouter = Router()
conversationRouter.use(requireAuth)

const participantWhere = (userId: string): Prisma.ConversationWhereInput => ({
  OR: [{ clientId: userId }, { provider: { is: { userId } } }],
})

// Lista de conversaciones con contraparte, último mensaje y no leídos.
conversationRouter.get('/', async (req, res) => {
  const userId = req.auth!.sub
  const conversations = await prisma.conversation.findMany({
    where: participantWhere(userId),
    orderBy: { lastMessage: 'desc' },
    include: {
      client: { select: { id: true, name: true } },
      provider: { select: { id: true, businessName: true, userId: true } },
      booking: { select: { id: true, code: true, status: true } },
      messages: {
        where: { readAt: null, senderId: { not: userId } },
        select: { id: true },
      },
    },
  })

  const lastMessages = await prisma.message.findMany({
    where: { conversationId: { in: conversations.map((c) => c.id) } },
    orderBy: { createdAt: 'desc' },
    distinct: ['conversationId'],
    select: { conversationId: true, body: true, createdAt: true, senderId: true },
  })
  const lastByConversation = new Map(lastMessages.map((m) => [m.conversationId, m]))

  res.json(
    conversations.map(({ client, provider, booking, messages, ...c }) => {
      const isClientSide = c.clientId === userId
      return {
        ...c,
        counterpart: isClientSide
          ? { type: 'provider' as const, name: provider.businessName }
          : { type: 'client' as const, name: client.name },
        bookingCode: booking?.code ?? null,
        bookingStatus: booking?.status ?? null,
        unreadCount: messages.length,
        lastMessage: lastByConversation.get(c.id) ?? null,
      }
    }),
  )
})

// Historial de una conversación propia; marca leídos al consultar.
conversationRouter.get('/:id/messages', async (req, res) => {
  const userId = req.auth!.sub
  const conversation = await prisma.conversation.findFirst({
    where: { id: String(req.params.id), ...participantWhere(userId) },
    select: { id: true },
  })
  if (!conversation) {
    res.status(404).json({ error: 'conversation_not_found' })
    return
  }
  const messages = await prisma.message.findMany({
    where: { conversationId: conversation.id },
    orderBy: { createdAt: 'asc' },
    take: 200,
  })
  await prisma.message.updateMany({
    where: { conversationId: conversation.id, senderId: { not: userId }, readAt: null },
    data: { readAt: new Date() },
  })
  res.json(messages)
})

// Crear u obtener conversación (por reserva o por par cliente-proveedor).
const createSchema = z.object({
  bookingId: z.string().min(1).optional(),
  providerProfileId: z.string().min(1).optional(),
}).refine((v) => v.bookingId || v.providerProfileId, { message: 'bookingId o providerProfileId requerido' })

conversationRouter.post('/', async (req, res) => {
  const parsed = createSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'validation_error' })
    return
  }
  const userId = req.auth!.sub

  let clientId: string | undefined
  let providerId: string | undefined
  let bookingId: string | undefined

  if (parsed.data.bookingId) {
    const booking = await prisma.booking.findFirst({
      where: {
        id: parsed.data.bookingId,
        OR: [{ clientId: userId }, { provider: { userId } }],
      },
      select: { id: true, clientId: true, providerId: true },
    })
    if (!booking) {
      res.status(404).json({ error: 'booking_not_found' })
      return
    }
    clientId = booking.clientId
    providerId = booking.providerId
    bookingId = booking.id
  } else {
    const profile = await prisma.providerProfile.findUnique({
      where: { id: parsed.data.providerProfileId! },
      select: { id: true, userId: true },
    })
    if (!profile) {
      res.status(404).json({ error: 'provider_not_found' })
      return
    }
    // MVP: solo el cliente inicia conversaciones; un proveedor no se chatea consigo mismo.
    if (profile.userId === userId) {
      res.status(400).json({ error: 'cannot_chat_with_self' })
      return
    }
    clientId = userId
    providerId = profile.id
  }

  // @@unique([clientId, providerId, bookingId]) no cubre bookingId NULL en
  // Postgres; find-then-create evita duplicados en la práctica del MVP.
  const existing = await prisma.conversation.findFirst({
    where: { clientId, providerId, ...(bookingId ? { bookingId } : {}) },
    select: { id: true },
  })
  if (existing) {
    res.json(existing)
    return
  }
  const created = await prisma.conversation.create({
    data: { clientId, providerId, ...(bookingId ? { bookingId } : {}) },
    select: { id: true },
  })
  res.status(201).json(created)
})
