import crypto from 'node:crypto'
import { prisma } from './prisma.js'
import { sha256 } from './tokens.js'

const RESET_TTL_SEC = 60 * 60 // el enlace vive 1 hora

// Devuelve el token crudo para incluir en el enlace del correo.
export async function createPasswordResetToken(userId: string): Promise<string> {
  await prisma.passwordResetToken.deleteMany({ where: { userId, usedAt: null } })
  const raw = crypto.randomBytes(32).toString('hex')
  await prisma.passwordResetToken.create({
    data: {
      userId,
      tokenHash: sha256(raw),
      expiresAt: new Date(Date.now() + RESET_TTL_SEC * 1000),
    },
  })
  return raw
}

// Cambia la contraseña y cierra todas las sesiones del usuario en una transacción;
// devuelve el id del usuario o null si el token es inválido, vencido o ya usado.
export async function resetPasswordWithToken(
  rawToken: string,
  passwordHash: string,
): Promise<string | null> {
  const stored = await prisma.passwordResetToken.findUnique({ where: { tokenHash: sha256(rawToken) } })
  if (!stored || stored.usedAt || stored.expiresAt < new Date()) return null

  return prisma.$transaction(async (tx) => {
    await tx.passwordResetToken.update({
      where: { id: stored.id },
      data: { usedAt: new Date() },
    })
    await tx.refreshToken.updateMany({
      where: { userId: stored.userId },
      data: { revokedAt: new Date() },
    })
    await tx.user.update({
      where: { id: stored.userId },
      data: { passwordHash },
    })
    return stored.userId
  })
}
