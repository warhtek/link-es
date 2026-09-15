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
  lat: z.coerce.number().min(-90).max(90).optional().nullable(),
  lng: z.coerce.number().min(-180).max(180).optional().nullable(),
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

  // La ubicación (pin del mapa) se guarda desde el selector de mapa del onboarding.
  const [profile] = await prisma.$transaction([
    prisma.providerProfile.create({
      data: {
        userId: user.id,
        businessName: parsed.data.businessName,
        headline: parsed.data.headline ?? null,
        bio: parsed.data.bio ?? null,
        serviceRadiusKm: parsed.data.serviceRadiusKm ?? 5,
        serviceAreaLat: parsed.data.lat ?? undefined,
        serviceAreaLng: parsed.data.lng ?? undefined,
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

// Perfil propio + documentos + servicios + estado de verificación (panel proveedor).
providerRouter.get('/me', requireAuth, async (req, res) => {
  const profile = await prisma.providerProfile.findFirst({
    where: { userId: req.auth!.sub },
    include: {
      documents: { orderBy: { createdAt: 'desc' } },
      categories: true,
      services: { orderBy: { createdAt: 'asc' } },
    },
  })
  if (!profile) {
    res.status(404).json({ error: 'no_provider_profile' })
    return
  }
  // Alias lat/lng (misma convención que la búsqueda pública) sobre la cobertura.
  // priceFrom es Decimal en Prisma; se normaliza a number para el cliente (null si es opcional).
  res.json({
    ...profile,
    lat: profile.serviceAreaLat,
    lng: profile.serviceAreaLng,
    services: profile.services.map((s) => ({
      ...s,
      priceFrom: s.priceFrom == null ? null : Number(s.priceFrom),
    })),
  })
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

// Actualizar perfil de proveedor (categorías, radio, servicios/precios, imágenes, ubicación, etc.)
// Cada ítem de `services` edita un servicio existente (con `id`) o crea uno nuevo (sin `id`).
// Las imágenes se guardan como URL que el cliente carga con <img>. Solo se valida que sea una
// URL http(s) válida: exigir extensión de imagen bloqueaba el guardado completo del perfil con
// URLs reales (Google-hosted, .webp, sin extensión).
const imageUrlSchema = z
  .string()
  .trim()
  .url()
  .max(1000)
  .refine((url) => /^https?:\/\//i.test(url), { message: 'invalid_image_url' })
const serviceItemSchema = z
  .object({
    id: z.string().min(1).optional(),
    title: z.string().trim().min(2).max(120).optional(),
    description: z.string().trim().max(500).optional().nullable(),
    priceFrom: z.coerce.number().min(0).max(999999.99).nullable().optional(),
    unit: z.enum(['HOUR', 'PROJECT']).optional(),
    categoryId: z.string().min(1).optional(),
  })
  .superRefine((val, ctx) => {
    if (val.id) return
    if (!val.title) ctx.addIssue({ code: 'custom', path: ['title'], message: 'required' })
    if (!val.categoryId) ctx.addIssue({ code: 'custom', path: ['categoryId'], message: 'required' })
  })

const updateProviderSchema = z.object({
  businessName: z.string().trim().min(2).max(100).optional(),
  headline: z.string().trim().max(120).optional().nullable(),
  bio: z.string().trim().max(2000).optional().nullable(),
  categoryIds: z.array(z.string()).min(0).max(5).optional(),
  city: z.string().trim().max(80).optional().nullable(),
  serviceRadiusKm: z.coerce.number().min(1).max(50).optional(),
  lat: z.coerce.number().min(-90).max(90).optional().nullable(),
  lng: z.coerce.number().min(-180).max(180).optional().nullable(),
  avatarUrl: imageUrlSchema.optional().nullable(),
  galleryImages: z.array(imageUrlSchema).max(20).optional(),
  services: z.array(serviceItemSchema).max(50).optional(),
})

providerRouter.patch('/me', requireAuth, async (req, res) => {
  const parsed = updateProviderSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'validation_error', issues: parsed.error.flatten() })
    return
  }
  const profile = await prisma.providerProfile.findFirst({ where: { userId: req.auth!.sub } })
  if (!profile) {
    res.status(404).json({ error: 'no_provider_profile' })
    return
  }
  const data = parsed.data
  const servicesToUpdate = data.services?.filter((s) => s.id) ?? []
  const servicesToCreate = data.services?.filter((s) => !s.id) ?? []
  // Solo el proveedor dueño puede editar sus servicios, y un servicio nuevo debe
  // pertenecer a una categoría que el proveedor ya ofrece.
  if (servicesToUpdate.length > 0) {
    const owned = await prisma.service.count({
      where: { id: { in: servicesToUpdate.map((s) => s.id!) }, providerId: profile.id },
    })
    if (owned !== servicesToUpdate.length) {
      res.status(400).json({ error: 'invalid_service' })
      return
    }
  }
  if (servicesToCreate.length > 0) {
    const catIds = [...new Set(servicesToCreate.map((s) => s.categoryId!))]
    const owned = await prisma.category.count({
      where: { id: { in: catIds }, profiles: { some: { id: profile.id } } },
    })
    if (owned !== catIds.length) {
      res.status(400).json({ error: 'invalid_category' })
      return
    }
  }
  const updated = await prisma.$transaction(async (tx) => {
    // La ciudad vive en el usuario (el perfil público la muestra con u.city).
    if (data.city !== undefined) {
      await tx.user.update({
        where: { id: req.auth!.sub },
        data: { city: data.city },
      })
    }
    // Actualización de precios de servicios existentes + creación de servicios nuevos.
    // priceFrom opcional: undefined deja el valor, null lo limpia (servicio sin precio).
    for (const svc of servicesToUpdate) {
      if (svc.priceFrom !== undefined) {
        await tx.service.update({
          where: { id: svc.id },
          data: { priceFrom: svc.priceFrom },
        })
      }
    }
    for (const svc of servicesToCreate) {
      await tx.service.create({
        data: {
          providerId: profile.id,
          categoryId: svc.categoryId!,
          title: svc.title!,
          description: svc.description ?? null,
          priceFrom: svc.priceFrom ?? null,
          unit: svc.unit ?? 'HOUR',
        },
      })
    }
    return tx.providerProfile.update({
      where: { id: profile.id },
      data: {
        businessName: data.businessName ?? undefined,
        headline: data.headline ?? undefined,
        bio: data.bio ?? undefined,
        serviceRadiusKm: data.serviceRadiusKm ?? undefined,
        serviceAreaLat: data.lat === undefined ? undefined : data.lat,
        serviceAreaLng: data.lng === undefined ? undefined : data.lng,
        avatarUrl: data.avatarUrl === undefined ? undefined : data.avatarUrl,
        galleryImages: data.galleryImages === undefined ? undefined : data.galleryImages,
        categories: data.categoryIds ? { set: data.categoryIds.map((id) => ({ id })) } : undefined,
      },
      include: {
        documents: { orderBy: { createdAt: 'desc' } },
        categories: true,
        services: { orderBy: { createdAt: 'asc' } },
      },
    })
  })
  res.json({
    ...updated,
    lat: updated.serviceAreaLat,
    lng: updated.serviceAreaLng,
    services: updated.services.map((s) => ({
      ...s,
      priceFrom: s.priceFrom == null ? null : Number(s.priceFrom),
    })),
  })
})

export { UPLOADS_DIR }
