import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import type { Server as HttpServer } from 'node:http'
import { prisma } from './lib/prisma.js'
import { authRouter } from './routes/auth.routes.js'
import { userRouter } from './routes/user.routes.js'
import { categoryRouter } from './routes/category.routes.js'
import { providerRouter, UPLOADS_DIR } from './routes/provider.routes.js'
import { publicProviderRouter } from './routes/public.routes.js'
import { bookingRouter } from './routes/booking.routes.js'
import { conversationRouter } from './routes/conversation.routes.js'
import { reviewRouter } from './routes/review.routes.js'
import { adminRouter } from './routes/admin.routes.js'
import { setupSocket } from './socket.js'

const app = express()

app.use(cors({ origin: process.env.CORS_ORIGIN?.split(',') ?? true }))
app.use(express.json())

// Documentos de verificación subidos en local (Fase 2); mover a CDN con Cloudinary/S3.
app.use('/uploads', express.static(UPLOADS_DIR))

app.use('/api/auth', authRouter)
app.use('/api/users', userRouter)
app.use('/api/categories', categoryRouter)
app.use('/api/providers', providerRouter)
app.use('/api/public/providers', publicProviderRouter)
app.use('/api/bookings', bookingRouter)
app.use('/api/bookings/:id/review', reviewRouter)
app.use('/api/conversations', conversationRouter)
app.use('/api/admin', adminRouter)

// Express 5 reenvía aquí los rechazos de handlers async.
app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[link-es-api] error no manejado:', error)
  if (!res.headersSent) {
    res.status(500).json({ error: 'internal_error', message: 'Error interno del servidor' })
  }
})

app.get('/api/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`
    res.json({ status: 'ok', db: 'up', service: 'link-es-api', timestamp: new Date().toISOString() })
  } catch {
    res.status(503).json({ status: 'degraded', db: 'down', service: 'link-es-api', timestamp: new Date().toISOString() })
  }
})

const port = Number(process.env.PORT) || 4000

const server = app.listen(port, () => {
  console.log(`[link-es-api] escuchando en http://localhost:${port}`)
})

// Chat en tiempo real (Fase 5): Socket.io sobre el mismo servidor HTTP.
setupSocket(server as HttpServer)

async function shutdown() {
  server.close()
  await prisma.$disconnect()
  process.exit(0)
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
