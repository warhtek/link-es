import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { requireAuth } from '../middleware/auth.js'
import { toPublicUser } from '../lib/users.js'

export const userRouter = Router()
userRouter.use(requireAuth)

const updateProfileSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  phone: z.string().trim().max(30).nullable().optional(),
  address: z.string().trim().max(200).nullable().optional(),
  postalCode: z.string().trim().max(12).nullable().optional(),
  city: z.string().trim().max(80).nullable().optional(),
  locale: z.enum(['es', 'en']).nullable().optional(),
})

userRouter.get('/me', async (req, res) => {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: req.auth!.sub } })
  res.json(toPublicUser(user))
})

userRouter.patch('/me', async (req, res) => {
  const parsed = updateProfileSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'validation_error', issues: parsed.error.flatten() })
    return
  }
  const user = await prisma.user.update({
    where: { id: req.auth!.sub },
    data: parsed.data,
  })
  res.json(toPublicUser(user))
})

// Cambio de modo CLIENT ↔ PROVIDER desde la misma cuenta.
const switchModeSchema = z.object({ mode: z.enum(['CLIENT', 'PROVIDER']) })

userRouter.patch('/me/mode', async (req, res) => {
  const parsed = switchModeSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'validation_error' })
    return
  }
  const user = await prisma.user.findUniqueOrThrow({ where: { id: req.auth!.sub } })
  if (parsed.data.mode === 'PROVIDER' && !user.roles.includes('PROVIDER')) {
    // Aún no pasó el onboarding de proveedor (fase 2).
    res.status(403).json({ error: 'provider_onboarding_required' })
    return
  }
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { activeMode: parsed.data.mode },
  })
  res.json(toPublicUser(updated))
})
