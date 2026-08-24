import crypto from 'node:crypto'
import jwt from 'jsonwebtoken'
import type { Role } from '@prisma/client'

const ACCESS_TTL_SEC = 15 * 60 // 15 minutos
const REFRESH_TTL_SEC = 30 * 24 * 60 * 60 // 30 días

export interface AccessPayload {
  sub: string
  roles: Role[]
  mode: Role
}

function requireSecret(name: 'JWT_ACCESS_SECRET' | 'JWT_REFRESH_SECRET'): string {
  const value = process.env[name]
  if (!value) throw new Error(`Falta la variable de entorno ${name}`)
  return value
}

export function signAccessToken(payload: AccessPayload): string {
  return jwt.sign(payload, requireSecret('JWT_ACCESS_SECRET'), {
    expiresIn: ACCESS_TTL_SEC,
  })
}

export function verifyAccessToken(token: string): AccessPayload | null {
  try {
    const decoded = jwt.verify(token, requireSecret('JWT_ACCESS_SECRET'))
    if (typeof decoded === 'string') return null
    const { sub, roles, mode } = decoded as jwt.JwtPayload & Partial<AccessPayload>
    if (!sub || !Array.isArray(roles) || !mode) return null
    return { sub, roles: roles as Role[], mode: mode as Role }
  } catch {
    return null
  }
}

// El refresh token viaja crudo al cliente; en DB solo queda su hash SHA-256.
export function generateRefreshToken(): { raw: string; hash: string; expiresAt: Date } {
  const raw = crypto.randomBytes(48).toString('hex')
  return {
    raw,
    hash: sha256(raw),
    expiresAt: new Date(Date.now() + REFRESH_TTL_SEC * 1000),
  }
}

export function sha256(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex')
}
