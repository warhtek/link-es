import { Router, type Request, type Response } from 'express'
import { z } from 'zod'
import type { Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma.js'
import { requireAuth } from '../middleware/auth.js'
import { isUniqueViolation } from '../lib/session.js'

export const reviewRouter = Router({ mergeParams: true })
reviewRouter.use(requireAuth)

const reviewSchema = z.object({
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().trim().max(1000).optional(),
})

// Recalcula el promedio del proveedor con todas sus reseñas (simple y exacto).
async function recomputeRating(tx: Prisma.TransactionClient, providerId: string) {
  const agg = await tx.review.aggregate({
    where: { providerId },
    _avg: { rating: true },
    _count: true,
  })
  await tx.providerProfile.update({
    where: { id: providerId },
    data: {
      ratingAvg: Math.round((agg._avg.rating ?? 0) * 10) / 10,
      ratingCount: agg._count,
    },
  })
}

// El cliente califica una reserva propia COMPLETADA. Una sola reseña por reserva.
reviewRouter.post('/', async (req: Request, res: Response) => {
  const parsed = reviewSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'validation_error', issues: parsed.error.flatten() })
    return
  }
  const bookingId = String(req.params.id)
  const booking = await prisma.booking.findFirst({
    where: { id: bookingId, clientId: req.auth!.sub },
    select: { id: true, status: true, providerId: true },
  })
  if (!booking) {
    res.status(404).json({ error: 'booking_not_found' })
    return
  }
  if (booking.status !== 'COMPLETED') {
    res.status(409).json({ error: 'booking_not_completed' })
    return
  }

  try {
    const review = await prisma.$transaction(async (tx) => {
      const created = await tx.review.create({
        data: {
          bookingId,
          clientId: req.auth!.sub,
          providerId: booking.providerId,
          rating: parsed.data.rating,
          comment: parsed.data.comment ?? null,
        },
        select: { id: true, rating: true, comment: true, createdAt: true },
      })
      await recomputeRating(tx, booking.providerId)
      return created
    })
    res.status(201).json(review)
  } catch (error) {
    if (isUniqueViolation(error)) {
      res.status(409).json({ error: 'already_reviewed' })
      return
    }
    throw error
  }
})

// ¿Ya califiqué esta reserva? (para pintar la UI sin pedirlo dos veces)
reviewRouter.get('/', async (req: Request, res: Response) => {
  const review = await prisma.review.findUnique({
    where: { bookingId: String(req.params.id) },
    select: { rating: true, comment: true, createdAt: true },
  })
  res.json(review)
})
