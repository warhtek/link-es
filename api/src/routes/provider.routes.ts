import { Router } from 'express'
import { z } from 'zod'
import type { Role } from '@prisma/client'
import { prisma } from '../lib/prisma.js'
import { requireAuth } from '../middleware/auth.js'
import { documentUpload, UPLOADS_DIR } from '../lib/upload.js'
import { issueSession } from '../lib/session.js'

export const providerRouter = Router()

const onboardingSchema = z.object({
  businessName: z.string().trim().min(2).max(100),
  headline: z.string().trim().max(120).optional(),
  bio: z.string().trim().max(2000).optional(),
  categoryIds: z.array(z.string().min(1)).min(1).max(5),
  city: z.string().trim().min(2).max(80),
  serviceRadiusKm: z.coerce.number().min(1).max(50).optional(),
})

// Convierte a un usuario en proveedor: crea el perfil, vincula categorías y
// agrega el rol PROVIDER. Devuelve sesión nueva porque el modo cambia.
providerRouter.post('/onboarding', requireAuth, async (req, res) => {
  const parsed = onboardingSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'validation_error', issues: parsed.error.flatten() })
    return
  }
  const user = await prisma.user.findUnique({ where: { id: req.auth!.sub }, include: { providerProfile: true } })
  if (!user) {
    res.status(404).json({ error: 'user_not_found' })
    return
  }
  if (user.providerProfile) {
    res.status(409).json({ error: 'already_provider' })
    return
  }
  const categoryCount = await prisma.category.count({ where: { id: { in: parsed.data.categoryIds } } })
  if (categoryCount !== parsed.data.categoryIds.length) {
    res.status(400).json({ error: 'invalid_category' })
    return
  }

  // Coordenadas de cobertura llegan con el mapa en Fase 3; por ahora solo texto.
  const [profile] = await prisma.$transaction([
    prisma.providerProfile.create({
      data: {
        userId: user.id,
        businessName: parsed.data.businessName,
        headline: parsed.data.headline ?? null,
        bio: parsed.data.bio ?? null,
        serviceRadiusKm: parsed.data.serviceRadiusKm ?? 5,
        categories: { connect: parsed.data.categoryIds.map((id) => ({ id })) },
      },
    }),
    prisma.user.update({
      where: { id: user.id },
      data: {
        roles: [...new Set<Role>([...user.roles, 'PROVIDER'])],
        activeMode: 'PROVIDER',
        ...(user.city ? {} : { city: parsed.data.city }),
      },
    }),
  ])

  const session = await issueSession(
    await prisma.user.findUniqueOrThrow({ where: { id: user.id } }),
  )
  res.status(201).json({ profile, ...session })
})

// Perfil propio + documentos + estado de verificación (para el panel proveedor).
providerRouter.get('/me', requireAuth, async (req, res) => {
  const profile = await prisma.providerProfile.findFirst({
    where: { userId: req.auth!.sub },
    include: {
      documents: { orderBy: { createdAt: 'desc' } },
      categories: true,
    },
  })
  if (!profile) {
    res.status(404).json({ error: 'no_provider_profile' })
    return
  }
  res.json(profile)
})

const DOCUMENT_TYPES = new Set(['ID', 'LICENSE', 'CERTIFICATION', 'OTHER'])

// Subida de documentos de verificación (multipart: file + type).
// El estado pasa a PENDING para revisión del admin (Fase 8).
providerRouter.post('/me/documents', requireAuth, (req, res) => {
  documentUpload.single('file')(req, res, async (err) => {
    if (err) {
      const unsupported = err.message === 'unsupported_media_type'
      res.status(unsupported ? 415 : 400).json({
        error: unsupported ? 'unsupported_media_type' : err.code === 'LIMIT_FILE_SIZE' ? 'file_too_large' : 'upload_error',
      })
      return
    }
    const file = req.file
    const type = req.body?.type
    if (!file || typeof type !== 'string' || !DOCUMENT_TYPES.has(type)) {
      res.status(400).json({ error: 'validation_error' })
      return
    }
    const profile = await prisma.providerProfile.findFirst({ where: { userId: req.auth!.sub } })
    if (!profile) {
      res.status(404).json({ error: 'no_provider_profile' })
      return
    }
    const [document] = await prisma.$transaction([
      prisma.verificationDocument.create({
        data: {
          providerId: profile.id,
          type: type as never,
          fileUrl: `/uploads/${file.filename}`,
        },
      }),
      prisma.providerProfile.update({
        where: { id: profile.id },
        data: { verificationStatus: 'PENDING' },
      }),
    ])
    res.status(201).json(document)
  })
})

export { UPLOADS_DIR }
