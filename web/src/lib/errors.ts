import type { TFunction } from 'i18next'
import { ApiError } from './api'

// Mapea códigos del backend a claves i18n; cualquier otro error usa un mensaje genérico.
const CODE_TO_KEY: Record<string, string> = {
  invalid_credentials: 'auth.errors.invalidCredentials',
  email_in_use: 'auth.errors.emailInUse',
  validation_error: 'errors.validation',
  invalid_schedule: 'booking.errors.invalidSchedule',
  invalid_transition: 'booking.errors.invalidTransition',
  service_not_found: 'booking.errors.serviceNotFound',
}

export function authErrorMessage(error: unknown, t: TFunction): string {
  const code = error instanceof ApiError ? error.code : undefined
  return t(CODE_TO_KEY[code ?? ''] ?? 'errors.generic')
}
