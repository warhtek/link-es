import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import {
  BCRYPT_ROUNDS,
  issueSession,
  isUniqueViolation,
  revokeRefreshToken,
  rotateRefreshToken,
  verifyPassword,
} from '../lib/session.js'
import { requireAuth } from '../middleware/auth.js'
import { toPublicUser } from '../lib/users.js'
import { createPasswordResetToken, resetPasswordWithToken } from '../lib/password-reset.js'
import { sendPasswordResetEmail } from '../lib/mailer.js'

export const authRouter = Router()

const registerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8).max(72),
  phone: z.string().trim().max(30).optional(),
})

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
})

const refreshSchema = z.object({ refreshToken: z.string().min(1) })

const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
})

const resetPasswordSchema = z.object({
  token: z.string().min(16),
  password: z.string().min(8).max(72),
})

// Registro único: todo usuario nace CLIENT; el rol PROVIDER se agrega con el
// onboarding de proveedor (fase 2).
authRouter.post('/register', async (req, res) => {
  const parsed = registerSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'validation_error', issues: parsed.error.flatten() })
    return
  }
  const { name, email, password, phone } = parsed.data
  try {
    const user = await prisma.user.create({
      data: {
        name,
        email,
        phone: phone ?? null,
        passwordHash: await bcrypt.hash(password, BCRYPT_ROUNDS),
        roles: ['CLIENT'],
      },
    })
    res.status(201).json(await issueSession(user))
  } catch (error) {
    if (isUniqueViolation(error)) {
      res.status(409).json({ error: 'email_in_use', message: 'Ese correo ya está registrado' })
      return
    }
    throw error
  }
})

authRouter.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'validation_error', issues: parsed.error.flatten() })
    return
  }
  const { email, password } = parsed.data
  const user = await prisma.user.findUnique({ where: { email } })
  // Mensaje genérico para no revelar si el correo existe.
  if (!user || !(await verifyPassword(user, password))) {
    res.status(401).json({ error: 'invalid_credentials', message: 'Credenciales incorrectas' })
    return
  }
  res.json(await issueSession(user))
})

authRouter.post('/refresh', async (req, res) => {
  const parsed = refreshSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'validation_error' })
    return
  }
  const session = await rotateRefreshToken(parsed.data.refreshToken)
  if (!session) {
    res.status(401).json({ error: 'invalid_refresh_token' })
    return
  }
  res.json(session)
})

authRouter.post('/logout', async (req, res) => {
  const parsed = refreshSchema.safeParse(req.body)
  if (parsed.success) await revokeRefreshToken(parsed.data.refreshToken)
  res.status(204).send()
})

// Siempre responde igual para no revelar qué correos están registrados.
authRouter.post('/forgot-password', async (req, res) => {
  const parsed = forgotPasswordSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'validation_error', issues: parsed.error.flatten() })
    return
  }
  const { email } = parsed.data
  const user = await prisma.user.findUnique({ where: { email } })
  if (user) {
    const rawToken = await createPasswordResetToken(user.id)
    const webUrl = process.env.WEB_APP_URL ?? 'http://localhost:5173'
    await sendPasswordResetEmail(
      user.email,
      user.name,
      `${webUrl}/restablecer-password?token=${rawToken}`,
    )
  }
  res.json({
    ok: true,
    message: 'Si el correo está registrado, enviamos un enlace para restablecer la contraseña.',
  })
})

authRouter.post('/reset-password', async (req, res) => {
  const parsed = resetPasswordSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'validation_error', issues: parsed.error.flatten() })
    return
  }
  const passwordHash = await bcrypt.hash(parsed.data.password, BCRYPT_ROUNDS)
  const userId = await resetPasswordWithToken(parsed.data.token, passwordHash)
  if (!userId) {
    res.status(400).json({
      error: 'invalid_reset_token',
      message: 'El enlace no es válido, expiró o ya fue utilizado.',
    })
    return
  }
  res.json({ ok: true })
})

authRouter.get('/me', requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.auth!.sub } })
  if (!user) {
    res.status(404).json({ error: 'user_not_found' })
    return
  }
  res.json(toPublicUser(user))
})
