import { Router, type Request, type Response } from 'express'
import { z } from 'zod'
import { Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma.js'

export const publicProviderRouter = Router()

const searchSchema = z.object({
  q: z.string().trim().max(100).optional(),
  categoryId: z.string().min(1).optional(),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  radiusKm: z.coerce.number().min(0.5).max(50).optional(),
  sort: z.enum(['distance', 'rating', 'bookings']).default('rating'),
})

interface SearchRow {
  id: string
  businessName: string
  headline: string | null
  verificationStatus: 'NONE' | 'PENDING' | 'VERIFIED'
  ratingAvg: number
  ratingCount: number
  city: string | null
  lat: number | null
  lng: number | null
  distanceKm: number | null
}

// Distancia en km entre el punto del proveedor y el cliente (PostGIS).
const distanceExpr = (clientLat: string, clientLng: string) =>
  Prisma.sql`ST_Distance(
    ST_SetSRID(ST_MakePoint(p."serviceAreaLng", p."serviceAreaLat"), 4326)::geography,
    ST_SetSRID(ST_MakePoint(${clientLng}::float8, ${clientLat}::float8), 4326)::geography
  ) / 1000.0`

publicProviderRouter.get('/', async (req: Request, res: Response) => {
  const parsed = searchSchema.safeParse(req.query)
  if (!parsed.success) {
    res.status(400).json({ error: 'validation_error', issues: parsed.error.flatten() })
    return
  }
  const { q, categoryId, lat, lng, radiusKm, sort } = parsed.data

  // TRUE como primera condición simplifica el join con AND.
  const conditions = [Prisma.sql`TRUE`]
  if (q) {
    const like = `%${q}%`
    conditions.push(
      Prisma.sql`(p."businessName" ILIKE ${like} OR p.headline ILIKE ${like} OR p.bio ILIKE ${like}
        OR EXISTS (SELECT 1 FROM services s WHERE s."providerId" = p.id AND s.title ILIKE ${like}))`,
    )
  }
  if (categoryId) {
    conditions.push(
      Prisma.sql`(EXISTS (SELECT 1 FROM "_CategoryToProviderProfile" cp WHERE cp."B" = p.id AND cp."A" = ${categoryId})
        OR EXISTS (SELECT 1 FROM services s WHERE s."providerId" = p.id AND s."categoryId" = ${categoryId}))`,
    )
  }
  if (lat !== undefined && lng !== undefined && radiusKm) {
    conditions.push(
      Prisma.sql`ST_DWithin(
        ST_SetSRID(ST_MakePoint(p."serviceAreaLng", p."serviceAreaLat"), 4326)::geography,
        ST_SetSRID(ST_MakePoint(${lng}::float8, ${lat}::float8), 4326)::geography,
        ${radiusKm * 1000}
      )`,
    )
  }
  const where = Prisma.join(conditions, ' AND ')

  // "Más solicitados": reservas aceptadas o completadas por proveedor.
  const orderBy =
    sort === 'distance' && lat !== undefined && lng !== undefined
      ? Prisma.sql`ORDER BY "distanceKm" ASC NULLS LAST`
      : sort === 'bookings'
        ? Prisma.sql`ORDER BY (SELECT COUNT(*) FROM bookings b WHERE b."providerId" = p.id AND b.status IN ('ACCEPTED', 'COMPLETED')) DESC, p."ratingAvg" DESC`
        : Prisma.sql`ORDER BY p."ratingAvg" DESC, p."ratingCount" DESC`

  const rows = await prisma.$queryRaw<SearchRow[]>(Prisma.sql`
    SELECT p.id, p."businessName", p.headline, p."verificationStatus",
           p."ratingAvg", p."ratingCount", u.city,
           p."serviceAreaLat" AS lat, p."serviceAreaLng" AS lng,
           ${lat !== undefined && lng !== undefined ? distanceExpr(String(lat), String(lng)) : Prisma.sql`NULL::float8`} AS "distanceKm"
    FROM provider_profiles p
    JOIN users u ON u.id = p."userId"
    WHERE ${where}
    ${orderBy}
    LIMIT 60
  `)

  // Categorías de todos los resultados en una sola consulta.
  const ids = rows.map((r) => r.id)
  const catRows = ids.length
    ? await prisma.$queryRaw<{ A: string; B: string; name: string; icon: string | null }[]>(Prisma.sql`
        SELECT cp."A", cp."B", c.name, c.icon
        FROM "_CategoryToProviderProfile" cp
        JOIN categories c ON c.id = cp."A"
        WHERE cp."B" IN (${Prisma.join(ids)})
      `)
    : []

  res.json(
    rows.map((row) => ({
      id: row.id,
      businessName: row.businessName,
      headline: row.headline,
      verificationStatus: row.verificationStatus,
      ratingAvg: row.ratingAvg,
      ratingCount: row.ratingCount,
      city: row.city,
      lat: row.lat,
      lng: row.lng,
      distanceKm: row.distanceKm == null ? null : Number(row.distanceKm),
      categories: catRows
        .filter((c) => c.B === row.id)
        .map((c) => ({ name: c.name, icon: c.icon })),
    })),
  )
})

publicProviderRouter.get('/:id', async (req: Request, res: Response) => {
  const id = String(req.params.id)
  const profile = await prisma.providerProfile.findFirst({
    where: { id },
    select: {
      id: true,
      businessName: true,
      headline: true,
      bio: true,
      verificationStatus: true,
      ratingAvg: true,
      ratingCount: true,
      serviceRadiusKm: true,
      user: { select: { city: true } },
      categories: { select: { id: true, name: true, icon: true } },
      services: {
        where: { active: true },
        select: { id: true, title: true, description: true, priceFrom: true, unit: true },
        orderBy: { priceFrom: 'asc' },
      },
    },
  })
  if (!profile) {
    res.status(404).json({ error: 'provider_not_found' })
    return
  }
  res.json({
    id: profile.id,
    businessName: profile.businessName,
    headline: profile.headline,
    bio: profile.bio,
    verificationStatus: profile.verificationStatus,
    ratingAvg: profile.ratingAvg,
    ratingCount: profile.ratingCount,
    serviceRadiusKm: profile.serviceRadiusKm,
    city: profile.user.city,
    categories: profile.categories,
    services: profile.services.map((s) => ({ ...s, priceFrom: Number(s.priceFrom) })),
  })
})
