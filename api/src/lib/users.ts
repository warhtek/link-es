import type { User } from '@prisma/client'

// Forma pública del usuario: nunca exponer passwordHash ni refreshTokens.
export interface PublicUser {
  id: string
  name: string
  email: string
  phone: string | null
  avatarUrl: string | null
  roles: string[]
  activeMode: string
  address: string | null
  postalCode: string | null
  city: string | null
  locale: string | null
}

export function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    avatarUrl: user.avatarUrl,
    roles: user.roles,
    activeMode: user.activeMode,
    address: user.address,
    postalCode: user.postalCode,
    city: user.city,
    locale: user.locale,
  }
}
