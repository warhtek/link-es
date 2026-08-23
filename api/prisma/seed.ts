import 'dotenv/config'
import { PrismaClient, DocumentStatus, DocumentType, VerificationStatus, Plan, SubscriptionStatus } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

// Contraseña única para todos los usuarios de prueba (solo desarrollo local).
const PASSWORD_HASH = await bcrypt.hash('password123', 10)

type CategorySeed = { name: string; slug: string; icon?: string; children?: CategorySeed[] }

const categories: CategorySeed[] = [
  {
    name: 'Hogar y reparaciones',
    slug: 'hogar',
    icon: 'home',
    children: [
      { name: 'Plomería', slug: 'plomeria' },
      { name: 'Electricidad', slug: 'electricidad' },
      { name: 'Carpintería', slug: 'carpinteria' },
      { name: 'Pintura', slug: 'pintura' },
    ],
  },
  {
    name: 'Belleza y cuidado personal',
    slug: 'belleza',
    icon: 'scissors',
    children: [
      { name: 'Peluquería', slug: 'peluqueria' },
      { name: 'Uñas y manicura', slug: 'manicura' },
    ],
  },
  {
    name: 'Clases y tutorías',
    slug: 'clases',
    icon: 'book',
    children: [
      { name: 'Matemáticas', slug: 'matematicas' },
      { name: 'Inglés', slug: 'ingles' },
      { name: 'Música', slug: 'musica' },
    ],
  },
  {
    name: 'Tecnología',
    slug: 'tecnologia',
    icon: 'laptop',
    children: [
      { name: 'Reparación de computadoras', slug: 'reparacion-pc' },
      { name: 'Páginas web', slug: 'paginas-web' },
    ],
  },
  {
    name: 'Eventos',
    slug: 'eventos',
    icon: 'camera',
    children: [{ name: 'Fotografía', slug: 'fotografia' }],
  },
]

type ProviderSeed = {
  user: string
  email: string
  phone: string
  businessName: string
  headline: string
  bio: string
  verificationStatus: VerificationStatus
  lat: number
  lng: number
  radiusKm: number
  ratingAvg: number
  ratingCount: number
  categorySlugs: string[]
  services: { title: string; description: string; priceFrom: number; categorySlug: string }[]
  plan?: Plan
  reviews?: { rating: number; comment: string; by: 'laura' | 'pedro' }[]
}

const providers: ProviderSeed[] = [
  {
    user: 'María José López',
    email: 'maria.plomeria@linkes.dev',
    phone: '+503 7101 0001',
    businessName: 'Plomería López',
    headline: 'Reparaciones de fugas e instalaciones en el día',
    bio: 'Más de 12 años resolviendo emergencias de plomería en colonias de San Salvador. Trabajo limpio y con garantía escrita.',
    verificationStatus: VerificationStatus.VERIFIED,
    lat: 13.689,
    lng: -89.238,
    radiusKm: 8,
    ratingAvg: 4.9,
    ratingCount: 2,
    categorySlugs: ['plomeria'],
    services: [
      { title: 'Reparación de fugas', description: 'Detección y reparación de fugas en tuberías de agua potable.', priceFrom: 15, categorySlug: 'plomeria' },
      { title: 'Instalación de lavamanos y WC', description: 'Instalación completa con materiales incluidos.', priceFrom: 35, categorySlug: 'plomeria' },
    ],
    plan: Plan.PRO,
    reviews: [
      { rating: 5, comment: 'Llegó en menos de una hora y dejó todo impecable.', by: 'laura' },
      { rating: 5, comment: 'Muy honesta con los precios, la recomiendo.', by: 'pedro' },
    ],
  },
  {
    user: 'Carlos Ramírez',
    email: 'carlos.electricista@linkes.dev',
    phone: '+503 7101 0002',
    businessName: 'Electricista CR',
    headline: 'Certificado, trabajos con seguro y factura',
    bio: 'Instalaciones eléctricas residenciales y comerciales. Revisión de paneles, tomacorrientes y alumbrado.',
    verificationStatus: VerificationStatus.VERIFIED,
    lat: 13.695,
    lng: -89.235,
    radiusKm: 10,
    ratingAvg: 4.5,
    ratingCount: 2,
    categorySlugs: ['electricidad'],
    services: [
      { title: 'Revisión eléctrica domiciliar', description: 'Diagnóstico completo del sistema eléctrico de tu casa.', priceFrom: 20, categorySlug: 'electricidad' },
    ],
    reviews: [
      { rating: 4, comment: 'Buen trabajo, aunque llegó 20 minutos tarde.', by: 'laura' },
      { rating: 5, comment: 'Solucionó un corto que dos técnicos más no encontraron.', by: 'pedro' },
    ],
  },
  {
    user: 'Ana Martínez',
    email: 'ana.matematicas@linkes.dev',
    phone: '+503 7101 0003',
    businessName: 'Clases de Matemática con Ana',
    headline: 'Matemáticas y física para bachillerato y universidad',
    bio: 'Licenciada en Educación Matemática. Clases personalizadas presenciales o en línea, con seguimiento semanal.',
    verificationStatus: VerificationStatus.VERIFIED,
    lat: 13.664,
    lng: -89.254,
    radiusKm: 15,
    ratingAvg: 5,
    ratingCount: 1,
    categorySlugs: ['matematicas'],
    services: [
      { title: 'Tutoría de matemáticas', description: 'Sesiones de 90 minutos adaptadas al nivel del estudiante.', priceFrom: 18, categorySlug: 'matematicas' },
    ],
    reviews: [{ rating: 5, comment: 'Mi hijo pasó de 6 a 9 en un ciclo.', by: 'laura' }],
  },
  {
    user: 'Jorge Hernández',
    email: 'jorge.carpintero@linkes.dev',
    phone: '+503 7101 0004',
    businessName: 'Carpintería Don Jorge',
    headline: 'Muebles a medida y reparación de puertas',
    bio: 'Carpintería tradicional y moderna. Muebles de melamina y madera sólida hechos a medida.',
    verificationStatus: VerificationStatus.PENDING,
    lat: 13.71,
    lng: -89.14,
    radiusKm: 12,
    ratingAvg: 0,
    ratingCount: 0,
    categorySlugs: ['carpinteria'],
    services: [
      { title: 'Mueble de melamina a medida', description: 'Diseño, corte e instalación según tus medidas.', priceFrom: 120, categorySlug: 'carpinteria' },
    ],
  },
  {
    user: 'Rosa Flores',
    email: 'rosa.belleza@linkes.dev',
    phone: '+503 7101 0005',
    businessName: 'Belleza Rosa',
    headline: 'Peinados y uñas a domicilio para eventos',
    bio: 'Estilista profesional con 8 años de experiencia en novias, quinceañeras y eventos sociales.',
    verificationStatus: VerificationStatus.VERIFIED,
    lat: 13.677,
    lng: -89.273,
    radiusKm: 20,
    ratingAvg: 4.7,
    ratingCount: 1,
    categorySlugs: ['peluqueria', 'manicura'],
    services: [
      { title: 'Peinado para evento', description: 'Incluye consulta previa y fijación de larga duración.', priceFrom: 40, categorySlug: 'peluqueria' },
      { title: 'Manicura con gel', description: 'Limpieza, esmaltado en gel y diseño sencillo.', priceFrom: 25, categorySlug: 'manicura' },
    ],
    reviews: [{ rating: 5, comment: 'El peinado duró perfecto toda la boda.', by: 'laura' }],
  },
  {
    user: 'Luis Pérez',
    email: 'luis.soporte@linkes.dev',
    phone: '+503 7101 0006',
    businessName: 'Soporte Técnico LP',
    headline: 'Computadoras lentas, virus y formateos el mismo día',
    bio: 'Técnico certificado. Mantenimiento preventivo, limpieza de virus, instalación de programas y respaldo de información.',
    verificationStatus: VerificationStatus.NONE,
    lat: 13.7,
    lng: -89.21,
    radiusKm: 6,
    ratingAvg: 0,
    ratingCount: 0,
    categorySlugs: ['reparacion-pc'],
    services: [
      { title: 'Mantenimiento de laptop o PC', description: 'Limpieza interna, cambio de pasta térmica y optimización.', priceFrom: 22, categorySlug: 'reparacion-pc' },
    ],
  },
  {
    user: 'Sofía Cruz',
    email: 'sofia.foto@linkes.dev',
    phone: '+503 7101 0007',
    businessName: 'Fotografía Sofía',
    headline: 'Sesiones de retrato y cobertura de eventos',
    bio: 'Fotógrafa freelance. Entrega de fotos editadas en 72 horas, galería privada en línea.',
    verificationStatus: VerificationStatus.VERIFIED,
    lat: 13.693,
    lng: -89.193,
    radiusKm: 30,
    ratingAvg: 4.8,
    ratingCount: 1,
    categorySlugs: ['fotografia'],
    services: [
      { title: 'Sesión de retrato (1 hora)', description: 'Una locación, 30 fotos editadas entregadas en línea.', priceFrom: 60, categorySlug: 'fotografia' },
    ],
    plan: Plan.PREMIUM,
    reviews: [{ rating: 5, comment: 'Las fotos de graduación quedaron increíbles.', by: 'pedro' }],
  },
  {
    user: 'Miguel Santos',
    email: 'miguel.pintura@linkes.dev',
    phone: '+503 7101 0008',
    businessName: 'Pintura Profesional MS',
    headline: 'Pintura de casas y locales con acabado garantizado',
    bio: 'Cuadrilla de tres personas. Protegemos muebles y pisos, entregamos limpio y a tiempo.',
    verificationStatus: VerificationStatus.PENDING,
    lat: 13.68,
    lng: -89.17,
    radiusKm: 14,
    ratingAvg: 0,
    ratingCount: 0,
    categorySlugs: ['pintura'],
    services: [
      { title: 'Pintura de cuarto (por proyecto)', description: 'Incluye preparado de paredes y dos manos de pintura.', priceFrom: 90, categorySlug: 'pintura' },
    ],
  },
]

async function main() {
  // Limpieza en orden inverso de dependencias (seed de desarrollo, no incremental)
  await prisma.message.deleteMany()
  await prisma.conversation.deleteMany()
  await prisma.review.deleteMany()
  await prisma.booking.deleteMany()
  await prisma.address.deleteMany()
  await prisma.subscription.deleteMany()
  await prisma.verificationDocument.deleteMany()
  await prisma.service.deleteMany()
  await prisma.providerProfile.deleteMany()
  await prisma.category.deleteMany()
  await prisma.user.deleteMany()

  // Categorías (jerarquía padre/hijo por slug)
  const categoryIds = new Map<string, string>()
  for (const cat of categories) {
    const parent = await prisma.category.create({
      data: { name: cat.name, slug: cat.slug, icon: cat.icon },
    })
    categoryIds.set(cat.slug, parent.id)
    for (const child of cat.children ?? []) {
      const created = await prisma.category.create({
        data: { name: child.name, slug: child.slug, parentId: parent.id },
      })
      categoryIds.set(child.slug, created.id)
    }
  }

  // Clientes de prueba
  const laura = await prisma.user.create({
    data: {
      name: 'Laura Chávez',
      email: 'laura@linkes.dev',
      phone: '+503 7222 1111',
      passwordHash: PASSWORD_HASH,
      roles: ['CLIENT'],
      activeMode: 'CLIENT',
      city: 'San Salvador',
      lat: 13.6929,
      lng: -89.2182,
    },
  })
  const pedro = await prisma.user.create({
    data: {
      name: 'Pedro Aguilar',
      email: 'pedro@linkes.dev',
      phone: '+503 7333 2222',
      passwordHash: PASSWORD_HASH,
      roles: ['CLIENT'],
      activeMode: 'CLIENT',
      city: 'Santa Tecla',
      lat: 13.6767,
      lng: -89.2794,
    },
  })

  for (const p of providers) {
    const user = await prisma.user.create({
      data: {
        name: p.user,
        email: p.email,
        phone: p.phone,
        passwordHash: PASSWORD_HASH,
        roles: ['PROVIDER'],
        activeMode: 'PROVIDER',
        verifiedAt: p.verificationStatus === VerificationStatus.VERIFIED ? new Date() : null,
        providerProfile: {
          create: {
            businessName: p.businessName,
            headline: p.headline,
            bio: p.bio,
            verificationStatus: p.verificationStatus,
            serviceAreaLat: p.lat,
            serviceAreaLng: p.lng,
            serviceRadiusKm: p.radiusKm,
            categories: { connect: p.categorySlugs.map((slug) => ({ id: categoryIds.get(slug)! })) },
          },
        },
      },
      include: { providerProfile: true },
    })

    if (p.plan && p.plan !== Plan.FREE) {
      await prisma.subscription.create({
        data: {
          providerId: user.providerProfile!.id,
          plan: p.plan,
          status: SubscriptionStatus.ACTIVE,
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 3600 * 1000),
        },
      })
    }

    // Un documento pendiente para perfiles en revisión (útil para el panel admin de la fase 8)
    if (p.verificationStatus === VerificationStatus.PENDING) {
      await prisma.verificationDocument.create({
        data: {
          providerId: user.providerProfile!.id,
          type: DocumentType.ID,
          fileUrl: `/uploads/seed/${p.email}-dui.pdf`,
          status: DocumentStatus.PENDING,
        },
      })
    }

    for (const s of p.services) {
      await prisma.service.create({
        data: {
          providerId: user.providerProfile!.id,
          categoryId: categoryIds.get(s.categorySlug)!,
          title: s.title,
          description: s.description,
          priceFrom: s.priceFrom,
        },
      })
    }

    // Reservas completadas + reseñas coherentes con ratingAvg/ratingCount
    let i = 0
    for (const r of p.reviews ?? []) {
      const client = r.by === 'laura' ? laura : pedro
      const service = await prisma.service.findFirstOrThrow({ where: { providerId: user.providerProfile!.id } })
      const booking = await prisma.booking.create({
        data: {
          clientId: client.id,
          providerId: user.providerProfile!.id,
          serviceId: service.id,
          status: 'COMPLETED',
          scheduledAt: new Date(Date.now() - (i + 1) * 7 * 24 * 3600 * 1000),
          address: client.city === 'Santa Tecla' ? 'Residencial La Esperanza, Santa Tecla' : 'Colonia Escalón, San Salvador',
          notes: 'Reserva generada por el seed',
        },
      })
      await prisma.review.create({
        data: {
          bookingId: booking.id,
          clientId: client.id,
          providerId: user.providerProfile!.id,
          rating: r.rating,
          comment: r.comment,
        },
      })
      i++
    }
  }
}

main()
  .then(async () => {
    const [users, profiles, cats, svcs] = await Promise.all([
      prisma.user.count(),
      prisma.providerProfile.count(),
      prisma.category.count(),
      prisma.service.count(),
    ])
    console.log(`Seed OK → ${users} usuarios · ${profiles} proveedores · ${cats} categorías · ${svcs} servicios`)
  })
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
