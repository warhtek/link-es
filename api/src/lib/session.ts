import bcrypt from 'bcryptjs'
import { Prisma, type User } from '@prisma/client'
import { prisma } from './prisma.js'
import { generateRefreshToken, sha256, signAccessToken } from './tokens.js'
import { toPublicUser, type PublicUser } from './users.js'

export interface SessionTokens {
  accessToken: string
  refreshToken: string
}

export const BCRYPT_ROUNDS = 10

// Login / registro / refresh devuelven usuario público + tokens.
export async function issueSession(user: User): Promise<PublicUser & SessionTokens> {
  const refreshToken = await createRefreshToken(user.id)
  return {
    ...toPublicUser(user),
    accessToken: signAccessToken({ sub: user.id, roles: user.roles, mode: user.activeMode }),
    refreshToken,
  }
}

async function createRefreshToken(userId: string): Promise<string> {
  const token = generateRefreshToken()
  await prisma.refreshToken.create({
    data: { userId, tokenHash: token.hash, expiresAt: token.expiresAt },
  })
  return token.raw
}

export async function rotateRefreshToken(rawToken: string): Promise<(PublicUser & SessionTokens) | null> {
  const stored = await prisma.refreshToken.findUnique({
    where: { tokenHash: sha256(rawToken) },
    include: { user: true },
  })
  if (!stored || stored.revokedAt || stored.expiresAt < new Date()) return null

  // Rotación: el token usado queda revocado y se emite uno nuevo.
  await prisma.refreshToken.update({
    where: { id: stored.id },
    data: { revokedAt: new Date() },
  })
  return issueSession(stored.user)
}

export async function revokeRefreshToken(rawToken: string): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: { tokenHash: sha256(rawToken), revokedAt: null },
    data: { revokedAt: new Date() },
  })
}

export function verifyPassword(user: User, password: string): Promise<boolean> {
  return bcrypt.compare(password, user.passwordHash)
}

export function isUniqueViolation(error: unknown): error is Prisma.PrismaClientKnownRequestError {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002'
}
