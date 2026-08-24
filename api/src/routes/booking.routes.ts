import crypto from 'node:crypto'
import { Router } from 'express'
import { z } from 'zod'
import type { BookingStatus } from '@prisma/client'
import { prisma } from '../lib/prisma.js'
import { requireAuth } from '../middleware/auth.js'

export const bookingRouter = Router()
bookingRouter.use(requireAuth)

function newCode(): string {
  return `BK-${crypto.randomBytes(3).toString('hex').toUpperCase()}`
}

const createSchema = z.object({
  serviceId: z.string().min(1),
  scheduledAt: z.coerce.date(),
  address: z.string().trim().min(5).max(200),
  notes: z.string().trim().max(1000).optional(),
})

// Cliente crea solicitud de servicio → PENDING.
bookingRouter.post('/', async (req, res) => {
  const parsed = createSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'validation_error', issues: parsed.error.flatten() })
    return
  }
  if (parsed.data.scheduledAt.getTime() < Date.now()) {
    res.status(400).json({ error: 'invalid_schedule', message: 'La fecha debe ser futura' })
    return
  }
  const service = await prisma.service.findFirst({
    where: { id: parsed.data.serviceId, active: true },
    select: { id: true, providerId: true },
  })
  if (!service) {
    res.status(404).json({ error: 'service_not_found' })
    return
  }
  const booking = await prisma.booking.create({
    data: {
      code: newCode(),
      clientId: req.auth!.sub,
      providerId: service.providerId,
      serviceId: service.id,
      scheduledAt: parsed.data.scheduledAt,
      address: parsed.data.address,
      notes: parsed.data.notes ?? null,
    },
  })
  res.status(201).json({ id: booking.id, code: booking.code, status: booking.status })
})

// Historial según modo: como cliente o como proveedor.
bookingRouter.get('/', async (req, res) => {
  const scope = req.query.scope === 'provider' ? 'provider' : 'client'
  const include = {
    service: { select: { id: true, title: true, priceFrom: true, unit: true } },
  }

  if (scope === 'provider') {
    const profile = await prisma.providerProfile.findUnique({
      where: { userId: req.auth!.sub },
      select: { id: true },
    })
    if (!profile) {
      res.json([])
      return
    }
    const bookings = await prisma.booking.findMany({
      where: { providerId: profile.id },
      orderBy: { createdAt: 'desc' },
      include: {
        ...include,
        client: { select: { id: true, name: true } },
        conversation: { select: { id: true } },
      },
    })
    res.json(bookings.map(({ client, service, conversation, ...b }) => ({
      ...b,
      service: { ...service, priceFrom: Number(service.priceFrom) },
      clientName: client.name,
      conversationId: conversation?.id ?? null,
    })))
  } else {
    const bookings = await prisma.booking.findMany({
      where: { clientId: req.auth!.sub },
      orderBy: { createdAt: 'desc' },
      include: {
        ...include,
        provider: { select: { id: true, businessName: true } },
        conversation: { select: { id: true } },
      },
    })
    res.json(bookings.map(({ provider, service, conversation, ...b }) => ({
      ...b,
      service: { ...service, priceFrom: Number(service.priceFrom) },
      providerBusinessName: provider.businessName,
      providerId: provider.id,
      conversationId: conversation?.id ?? null,
    })))
  }
})

// Máquina de estados: quién puede mover la reserva y hacia dónde.
const TRANSITIONS: Record<BookingStatus, Partial<Record<'CLIENT' | 'PROVIDER', BookingStatus[]>>> = {
  PENDING: { PROVIDER: ['ACCEPTED', 'REJECTED'], CLIENT: ['CANCELLED'] },
  ACCEPTED: { PROVIDER: ['IN_PROGRESS'], CLIENT: ['CANCELLED'] },
  REJECTED: {},
  IN_PROGRESS: { PROVIDER: ['COMPLETED'], CLIENT: ['CANCELLED'] },
  COMPLETED: {},
  CANCELLED: {},
}

const patchSchema = z.object({ status: z.enum(['ACCEPTED', 'REJECTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']) })

bookingRouter.patch('/:id/status', async (req, res) => {
  const parsed = patchSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'validation_error' })
    return
  }
  const booking = await prisma.booking.findUnique({
    where: { id: String(req.params.id) },
    include: { provider: { select: { userId: true } } },
  })
  if (!booking) {
    res.status(404).json({ error: 'booking_not_found' })
    return
  }
  const isProvider = booking.provider.userId === req.auth!.sub
  const isClient = booking.clientId === req.auth!.sub
  if (!isProvider && !isClient) {
    res.status(403).json({ error: 'forbidden' })
    return
  }
  const actor: 'CLIENT' | 'PROVIDER' = isProvider ? 'PROVIDER' : 'CLIENT'
  const allowed = TRANSITIONS[booking.status][actor] ?? []
  if (!allowed.includes(parsed.data.status)) {
    res.status(409).json({
      error: 'invalid_transition',
      message: `No se puede pasar de ${booking.status} a ${parsed.data.status} como ${actor}`,
    })
    return
  }
  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.booking.update({
      where: { id: booking.id },
      data: { status: parsed.data.status },
      select: { id: true, code: true, status: true },
    })
    // Al aceptar nace la conversación ligada a la reserva (Fase 5).
    if (parsed.data.status === 'ACCEPTED') {
      const existing = await tx.conversation.findFirst({
        where: { clientId: booking.clientId, providerId: booking.providerId, bookingId: booking.id },
        select: { id: true },
      })
      if (!existing) {
        await tx.conversation.create({
          data: { clientId: booking.clientId, providerId: booking.providerId, bookingId: booking.id },
        })
      }
    }
    return result
  })
  res.json(updated)
})
