import type { NextFunction, Request, Response } from 'express'
import { verifyAccessToken, type AccessPayload } from '../lib/tokens.js'

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: AccessPayload
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null
  const payload = token ? verifyAccessToken(token) : null
  if (!payload) {
    res.status(401).json({ error: 'unauthorized', message: 'Token ausente o inválido' })
    return
  }
  req.auth = payload
  next()
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.auth || !roles.some((role) => req.auth!.roles.includes(role as never))) {
      res.status(403).json({ error: 'forbidden', message: 'Rol insuficiente' })
      return
    }
    next()
  }
}
