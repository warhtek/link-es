import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const app = express()

app.use(cors({ origin: process.env.CORS_ORIGIN?.split(',') ?? true }))
app.use(express.json())

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

async function shutdown() {
  server.close()
  await prisma.$disconnect()
  process.exit(0)
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
