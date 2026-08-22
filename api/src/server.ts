import 'dotenv/config'
import express from 'express'
import cors from 'cors'

const app = express()

app.use(cors({ origin: process.env.CORS_ORIGIN?.split(',') ?? true }))
app.use(express.json())

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'link-es-api', timestamp: new Date().toISOString() })
})

const port = Number(process.env.PORT) || 4000

app.listen(port, () => {
  console.log(`[link-es-api] escuchando en http://localhost:${port}`)
})
