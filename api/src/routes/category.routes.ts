import { Router } from 'express'
import { prisma } from '../lib/prisma.js'

export const categoryRouter = Router()

// Catálogo público: categorías raíz con sus subcategorías (para filtros y onboarding).
categoryRouter.get('/', async (_req, res) => {
  const roots = await prisma.category.findMany({
    where: { parentId: null },
    orderBy: { name: 'asc' },
    include: { children: { orderBy: { name: 'asc' } } },
  })
  res.json(roots)
})
