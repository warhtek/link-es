import { Router } from 'express'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import type { Prisma, Role, VerificationStatus } from '@prisma/client'
import { prisma } from '../lib/prisma.js'
import { requireAuth, requireRole } from '../middleware/auth.js'

export const adminRouter = Router()

// Todas las rutas de este router requieren autenticación y rol ADMIN.
adminRouter.use(requireAuth, requireRole('ADMIN'))

// --------------------------------------------------------------------------
// 1. Estadísticas generales del sistema
// --------------------------------------------------------------------------
adminRouter.get('/stats', async (_req, res) => {
  const [totalUsers, clientsCount, providersCount, adminsCount, pendingVerifications, totalBookings] =
    await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { roles: { has: 'CLIENT' } } }),
      prisma.user.count({ where: { roles: { has: 'PROVIDER' } } }),
      prisma.user.count({ where: { roles: { has: 'ADMIN' } } }),
      prisma.providerProfile.count({ where: { verificationStatus: 'PENDING' } }),
      prisma.booking.count(),
    ])

  res.json({
    totalUsers,
    clientsCount,
    providersCount,
    adminsCount,
    pendingVerifications,
    totalBookings,
  })
})

// --------------------------------------------------------------------------
// 2. Listado paginado de usuarios con filtros
// --------------------------------------------------------------------------
adminRouter.get('/users', async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1)
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20))
  const skip = (page - 1) * limit

  const search = typeof req.query.search === 'string' ? req.query.search.trim() : ''
  const roleFilter = typeof req.query.role === 'string' ? (req.query.role.toUpperCase() as Role) : undefined
  const verificationFilter =
    typeof req.query.verificationStatus === 'string'
      ? (req.query.verificationStatus.toUpperCase() as VerificationStatus)
      : undefined

  const where: Prisma.UserWhereInput = {}

  if (roleFilter) {
    where.roles = { has: roleFilter }
  }

  if (verificationFilter) {
    where.providerProfile = {
      verificationStatus: verificationFilter,
    }
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search, mode: 'insensitive' } },
      { city: { contains: search, mode: 'insensitive' } },
      {
        providerProfile: {
          businessName: { contains: search, mode: 'insensitive' },
        },
      },
    ]
  }

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        avatarUrl: true,
        roles: true,
        activeMode: true,
        address: true,
        city: true,
        postalCode: true,
        createdAt: true,
        verifiedAt: true,
        providerProfile: {
          select: {
            id: true,
            businessName: true,
            headline: true,
            verificationStatus: true,
            serviceRadiusKm: true,
            ratingAvg: true,
            ratingCount: true,
            categories: {
              select: { id: true, name: true, slug: true },
            },
          },
        },
        _count: {
          select: {
            bookingsAsClient: true,
            reviews: true,
          },
        },
      },
    }),
  ])

  res.json({
    users,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  })
})

// --------------------------------------------------------------------------
// 3. Detalle completo de un usuario
// --------------------------------------------------------------------------
adminRouter.get('/users/:id', async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.params.id },
    include: {
      providerProfile: {
        include: {
          categories: true,
          services: true,
          documents: true,
          subscription: true,
        },
      },
      _count: {
        select: {
          bookingsAsClient: true,
          reviews: true,
          messages: true,
        },
      },
    },
  })

  if (!user) {
    res.status(404).json({ error: 'not_found', message: 'Usuario no encontrado' })
    return
  }

  // Ocultar hash de contraseña
  const { passwordHash: _, ...publicData } = user
  res.json(publicData)
})

// --------------------------------------------------------------------------
// 4. Crear / Dar de alta un usuario o proveedor
// --------------------------------------------------------------------------
const createUserSchema = z.object({
  name: z.string().trim().min(2, 'El nombre debe tener al menos 2 caracteres'),
  email: z.string().trim().email('Correo electrónico inválido').toLowerCase(),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  phone: z.string().trim().max(30).optional().nullable(),
  city: z.string().trim().max(80).optional().nullable(),
  address: z.string().trim().max(200).optional().nullable(),
  roles: z.array(z.enum(['CLIENT', 'PROVIDER', 'ADMIN'])).min(1, 'Debe asignar al menos un rol'),
  // Campos de proveedor (si tiene rol PROVIDER)
  businessName: z.string().trim().optional().nullable(),
  headline: z.string().trim().max(160).optional().nullable(),
  bio: z.string().trim().max(1000).optional().nullable(),
  serviceRadiusKm: z.number().min(1).max(50).optional().default(5),
  verificationStatus: z.enum(['NONE', 'PENDING', 'VERIFIED']).optional().default('VERIFIED'),
  categoryIds: z.array(z.string()).optional().default([]),
})

adminRouter.post('/users', async (req, res) => {
  const parsed = createUserSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'validation_error', issues: parsed.error.flatten() })
    return
  }

  const data = parsed.data
  const existing = await prisma.user.findUnique({
    where: { email: data.email },
  })
  if (existing) {
    res.status(400).json({ error: 'email_already_exists', message: 'El correo electrónico ya está registrado' })
    return
  }

  const passwordHash = await bcrypt.hash(data.password, 10)
  const isProvider = data.roles.includes('PROVIDER')

  const newUser = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      phone: data.phone ?? null,
      city: data.city ?? null,
      address: data.address ?? null,
      passwordHash,
      roles: data.roles as Role[],
      activeMode: isProvider ? 'PROVIDER' : 'CLIENT',
      verifiedAt: isProvider && data.verificationStatus === 'VERIFIED' ? new Date() : null,
      ...(isProvider
        ? {
            providerProfile: {
              create: {
                businessName: data.businessName?.trim() || data.name,
                headline: data.headline ?? null,
                bio: data.bio ?? null,
                serviceRadiusKm: data.serviceRadiusKm,
                verificationStatus: data.verificationStatus,
                ...(data.categoryIds.length > 0
                  ? {
                      categories: {
                        connect: data.categoryIds.map((id) => ({ id })),
                      },
                    }
                  : {}),
              },
            },
          }
        : {}),
    },
    include: {
      providerProfile: {
        include: { categories: true },
      },
    },
  })

  const { passwordHash: _, ...result } = newUser
  res.status(201).json(result)
})

// --------------------------------------------------------------------------
// 5. Modificar usuario o proveedor
// --------------------------------------------------------------------------
const updateUserSchema = z.object({
  name: z.string().trim().min(2).optional(),
  email: z.string().trim().email().toLowerCase().optional(),
  phone: z.string().trim().max(30).optional().nullable(),
  city: z.string().trim().max(80).optional().nullable(),
  address: z.string().trim().max(200).optional().nullable(),
  password: z.string().min(6).optional().nullable(),
  roles: z.array(z.enum(['CLIENT', 'PROVIDER', 'ADMIN'])).min(1).optional(),
  // Campos de proveedor
  businessName: z.string().trim().optional().nullable(),
  headline: z.string().trim().max(160).optional().nullable(),
  bio: z.string().trim().max(1000).optional().nullable(),
  serviceRadiusKm: z.number().min(1).max(50).optional(),
  verificationStatus: z.enum(['NONE', 'PENDING', 'VERIFIED']).optional(),
  categoryIds: z.array(z.string()).optional(),
})

adminRouter.patch('/users/:id', async (req, res) => {
  const parsed = updateUserSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'validation_error', issues: parsed.error.flatten() })
    return
  }

  const { id } = req.params
  const existing = await prisma.user.findUnique({
    where: { id },
    include: { providerProfile: true },
  })

  if (!existing) {
    res.status(404).json({ error: 'not_found', message: 'Usuario no encontrado' })
    return
  }

  const data = parsed.data

  // Validar unicidad si el email cambia
  if (data.email && data.email !== existing.email) {
    const emailConflict = await prisma.user.findUnique({ where: { email: data.email } })
    if (emailConflict) {
      res.status(400).json({ error: 'email_already_exists', message: 'El correo electrónico ya pertenece a otra cuenta' })
      return
    }
  }

  const updateData: Prisma.UserUpdateInput = {}
  if (data.name !== undefined) updateData.name = data.name
  if (data.email !== undefined) updateData.email = data.email
  if (data.phone !== undefined) updateData.phone = data.phone
  if (data.city !== undefined) updateData.city = data.city
  if (data.address !== undefined) updateData.address = data.address
  if (data.roles !== undefined) updateData.roles = data.roles as Role[]

  if (data.password) {
    updateData.passwordHash = await bcrypt.hash(data.password, 10)
  }

  // Determinar roles efectivos
  const finalRoles = (data.roles as Role[]) ?? existing.roles
  const isProvider = finalRoles.includes('PROVIDER')

  if (isProvider) {
    if (existing.providerProfile) {
      // Actualizar perfil de proveedor existente
      const profileUpdate: Prisma.ProviderProfileUpdateInput = {}
      if (data.businessName !== undefined) profileUpdate.businessName = data.businessName || existing.name
      if (data.headline !== undefined) profileUpdate.headline = data.headline
      if (data.bio !== undefined) profileUpdate.bio = data.bio
      if (data.serviceRadiusKm !== undefined) profileUpdate.serviceRadiusKm = data.serviceRadiusKm
      if (data.verificationStatus !== undefined) {
        profileUpdate.verificationStatus = data.verificationStatus
        if (data.verificationStatus === 'VERIFIED' && !existing.verifiedAt) {
          updateData.verifiedAt = new Date()
        }
      }
      if (data.categoryIds !== undefined) {
        profileUpdate.categories = {
          set: data.categoryIds.map((catId) => ({ id: catId })),
        }
      }
      updateData.providerProfile = { update: profileUpdate }
    } else {
      // El usuario no tenía perfil de proveedor previo, se crea ahora
      updateData.providerProfile = {
        create: {
          businessName: data.businessName?.trim() || data.name || existing.name,
          headline: data.headline ?? null,
          bio: data.bio ?? null,
          serviceRadiusKm: data.serviceRadiusKm ?? 5,
          verificationStatus: data.verificationStatus ?? 'VERIFIED',
          ...(data.categoryIds && data.categoryIds.length > 0
            ? {
                categories: {
                  connect: data.categoryIds.map((catId) => ({ id: catId })),
                },
              }
            : {}),
        },
      }
    }
  }

  const updatedUser = await prisma.user.update({
    where: { id },
    data: updateData,
    include: {
      providerProfile: {
        include: { categories: true },
      },
    },
  })

  const { passwordHash: _, ...result } = updatedUser
  res.json(result)
})

// --------------------------------------------------------------------------
// 6. Cambio rápido de estado de verificación para proveedores
// --------------------------------------------------------------------------
const verifySchema = z.object({
  verificationStatus: z.enum(['NONE', 'PENDING', 'VERIFIED']),
})

adminRouter.patch('/users/:id/verification', async (req, res) => {
  const parsed = verifySchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'validation_error', issues: parsed.error.flatten() })
    return
  }

  const { id } = req.params
  const user = await prisma.user.findUnique({
    where: { id },
    include: { providerProfile: true },
  })

  if (!user || !user.providerProfile) {
    res.status(404).json({ error: 'not_found', message: 'Proveedor no encontrado' })
    return
  }

  const status = parsed.data.verificationStatus

  const [updatedProfile] = await prisma.$transaction([
    prisma.providerProfile.update({
      where: { id: user.providerProfile.id },
      data: { verificationStatus: status },
    }),
    prisma.user.update({
      where: { id: user.id },
      data: { verifiedAt: status === 'VERIFIED' ? new Date() : null },
    }),
  ])

  res.json({
    ok: true,
    verificationStatus: updatedProfile.verificationStatus,
  })
})

// --------------------------------------------------------------------------
// 7. Eliminar usuario y datos asociados en cascada segura
// --------------------------------------------------------------------------
adminRouter.delete('/users/:id', async (req, res) => {
  const { id } = req.params

  if (req.auth?.sub === id) {
    res.status(400).json({ error: 'forbidden', message: 'No puedes eliminar tu propia cuenta de administrador' })
    return
  }

  const user = await prisma.user.findUnique({
    where: { id },
    include: { providerProfile: true },
  })

  if (!user) {
    res.status(404).json({ error: 'not_found', message: 'Usuario no encontrado' })
    return
  }

  await prisma.$transaction(async (tx) => {
    // 1. Limpieza de relaciones de proveedor
    if (user.providerProfile) {
      const providerId = user.providerProfile.id

      // Documentos y suscripciones
      await tx.verificationDocument.deleteMany({ where: { providerId } })
      await tx.subscription.deleteMany({ where: { providerId } })

      // Reseñas recibidas por el proveedor
      await tx.review.deleteMany({ where: { providerId } })

      // Mensajes y conversaciones del proveedor
      const convs = await tx.conversation.findMany({ where: { providerId }, select: { id: true } })
      const convIds = convs.map((c) => c.id)
      if (convIds.length > 0) {
        await tx.message.deleteMany({ where: { conversationId: { in: convIds } } })
        await tx.conversation.deleteMany({ where: { id: { in: convIds } } })
      }

      // Reservas del proveedor
      await tx.booking.deleteMany({ where: { providerId } })

      // Servicios del proveedor
      await tx.service.deleteMany({ where: { providerId } })

      // Perfil de proveedor
      await tx.providerProfile.delete({ where: { id: providerId } })
    }

    // 2. Limpieza de relaciones como cliente
    // Reseñas hechas por el cliente
    await tx.review.deleteMany({ where: { clientId: user.id } })

    // Mensajes enviados por el usuario
    await tx.message.deleteMany({ where: { senderId: user.id } })

    // Conversaciones del cliente
    const clientConvs = await tx.conversation.findMany({ where: { clientId: user.id }, select: { id: true } })
    const clientConvIds = clientConvs.map((c) => c.id)
    if (clientConvIds.length > 0) {
      await tx.message.deleteMany({ where: { conversationId: { in: clientConvIds } } })
      await tx.conversation.deleteMany({ where: { id: { in: clientConvIds } } })
    }

    // Reservas del cliente
    await tx.booking.deleteMany({ where: { clientId: user.id } })

    // Tokens y direcciones
    await tx.refreshToken.deleteMany({ where: { userId: user.id } })
    await tx.passwordResetToken.deleteMany({ where: { userId: user.id } })
    await tx.address.deleteMany({ where: { userId: user.id } })

    // 3. Eliminar usuario
    await tx.user.delete({ where: { id: user.id } })
  })

  res.json({ ok: true, message: 'Usuario y sus registros asociados eliminados correctamente' })
})

// --------------------------------------------------------------------------
// 8. Gestión de Categorías
// --------------------------------------------------------------------------

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// 8.1 Listar todas las categorías con jerarquía y métricas
adminRouter.get('/categories', async (_req, res) => {
  const allCategories = await prisma.category.findMany({
    orderBy: { name: 'asc' },
    include: {
      _count: {
        select: {
          children: true,
          profiles: true,
          services: true,
        },
      },
      parent: {
        select: { id: true, name: true, slug: true },
      },
    },
  })

  const totalCount = await prisma.category.count()

  res.json({
    categories: allCategories,
    total: totalCount,
  })
})

// 8.2 Crear categoría o subcategoría
const createCategorySchema = z.object({
  name: z.string().trim().min(2, 'El nombre debe tener al menos 2 caracteres'),
  slug: z.string().trim().optional(),
  icon: z.string().trim().max(30).optional().nullable(),
  parentId: z.string().trim().optional().nullable(),
})

adminRouter.post('/categories', async (req, res) => {
  const parsed = createCategorySchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'validation_error', issues: parsed.error.flatten() })
    return
  }

  const { name, icon, parentId } = parsed.data
  let slug = parsed.data.slug?.trim() ? slugify(parsed.data.slug) : slugify(name)

  const existing = await prisma.category.findUnique({ where: { slug } })
  if (existing) {
    slug = `${slug}-${Date.now().toString(36)}`
  }

  if (parentId) {
    const parent = await prisma.category.findUnique({ where: { id: parentId } })
    if (!parent) {
      res.status(400).json({ error: 'parent_not_found', message: 'La categoría principal indicada no existe' })
      return
    }
  }

  const created = await prisma.category.create({
    data: {
      name,
      slug,
      icon: icon || null,
      parentId: parentId || null,
    },
    include: {
      parent: true,
      _count: { select: { children: true, profiles: true, services: true } },
    },
  })

  res.status(201).json(created)
})

// 8.3 Modificar categoría
const updateCategorySchema = z.object({
  name: z.string().trim().min(2).optional(),
  slug: z.string().trim().optional(),
  icon: z.string().trim().max(30).optional().nullable(),
  parentId: z.string().trim().optional().nullable(),
})

adminRouter.patch('/categories/:id', async (req, res) => {
  const parsed = updateCategorySchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'validation_error', issues: parsed.error.flatten() })
    return
  }

  const { id } = req.params
  const existing = await prisma.category.findUnique({ where: { id } })
  if (!existing) {
    res.status(404).json({ error: 'not_found', message: 'Categoría no encontrada' })
    return
  }

  const updateData: Prisma.CategoryUpdateInput = {}

  if (parsed.data.name !== undefined) updateData.name = parsed.data.name
  if (parsed.data.icon !== undefined) updateData.icon = parsed.data.icon

  if (parsed.data.slug !== undefined && parsed.data.slug.trim()) {
    const newSlug = slugify(parsed.data.slug)
    if (newSlug !== existing.slug) {
      const conflict = await prisma.category.findUnique({ where: { slug: newSlug } })
      if (conflict) {
        res.status(400).json({ error: 'slug_already_exists', message: 'El slug ya pertenece a otra categoría' })
        return
      }
      updateData.slug = newSlug
    }
  }

  if (parsed.data.parentId !== undefined) {
    if (parsed.data.parentId === id) {
      res.status(400).json({ error: 'invalid_parent', message: 'Una categoría no puede ser padre de sí misma' })
      return
    }
    if (parsed.data.parentId) {
      const parent = await prisma.category.findUnique({ where: { id: parsed.data.parentId } })
      if (!parent) {
        res.status(400).json({ error: 'parent_not_found', message: 'La categoría principal no existe' })
        return
      }
      updateData.parent = { connect: { id: parsed.data.parentId } }
    } else {
      updateData.parent = { disconnect: true }
    }
  }

  const updated = await prisma.category.update({
    where: { id },
    data: updateData,
    include: {
      parent: true,
      _count: { select: { children: true, profiles: true, services: true } },
    },
  })

  res.json(updated)
})

// 8.4 Eliminar categoría con validaciones de seguridad
adminRouter.delete('/categories/:id', async (req, res) => {
  const { id } = req.params

  const category = await prisma.category.findUnique({
    where: { id },
    include: {
      children: true,
      services: { select: { id: true } },
      profiles: { select: { id: true } },
    },
  })

  if (!category) {
    res.status(404).json({ error: 'not_found', message: 'Categoría no encontrada' })
    return
  }

  if (category.children.length > 0) {
    res.status(400).json({
      error: 'category_has_children',
      message: `No se puede eliminar porque contiene ${category.children.length} subcategoría(s). Elimínalas o reasígnalas primero.`,
    })
    return
  }

  if (category.services.length > 0) {
    res.status(400).json({
      error: 'category_has_services',
      message: `No se puede eliminar porque tiene ${category.services.length} servicio(s) de profesionales activos asociados.`,
    })
    return
  }

  await prisma.category.update({
    where: { id },
    data: {
      profiles: { set: [] },
    },
  })

  await prisma.category.delete({ where: { id } })

  res.json({ ok: true, message: 'Categoría eliminada correctamente' })
})

