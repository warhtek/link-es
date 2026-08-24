// Cliente API con access token corto + refresh automático ante 401.
// Tokens en localStorage: suficiente para el MVP; migrar a cookies httpOnly si
// se necesita protección extra contra XSS.

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api'
const ACCESS_KEY = 'link-es-access-token'
const REFRESH_KEY = 'link-es-refresh-token'

export interface SessionResponse {
  id: string
  name: string
  email: string
  phone: string | null
  avatarUrl: string | null
  roles: string[]
  activeMode: 'CLIENT' | 'PROVIDER'
  address: string | null
  postalCode: string | null
  city: string | null
  locale: 'es' | 'en' | null
  accessToken: string
  refreshToken: string
}

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly issues?: unknown

  constructor(status: number, code: string, message?: string, issues?: unknown) {
    super(message ?? code)
    this.status = status
    this.code = code
    this.issues = issues
  }
}

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_KEY)
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_KEY)
}

export function saveSession(tokens: Pick<SessionResponse, 'accessToken' | 'refreshToken'>): void {
  localStorage.setItem(ACCESS_KEY, tokens.accessToken)
  localStorage.setItem(REFRESH_KEY, tokens.refreshToken)
}

export function clearSession(): void {
  localStorage.removeItem(ACCESS_KEY)
  localStorage.removeItem(REFRESH_KEY)
}

async function request<T>(path: string, init: RequestInit = {}, retried = false): Promise<T> {
  const headers = new Headers(init.headers)
  if (init.body) headers.set('Content-Type', 'application/json')
  const access = getAccessToken()
  if (access) headers.set('Authorization', `Bearer ${access}`)

  const response = await fetch(`${API_URL}${path}`, { ...init, headers })

  if (response.status === 401 && !retried && getRefreshToken()) {
    const refreshed = await tryRefresh()
    if (refreshed) return request<T>(path, init, true)
  }

  if (!response.ok && response.status !== 204) {
    let body: Record<string, unknown> = {}
    try {
      body = await response.json()
    } catch {
      // cuerpo vacío o no-JSON
    }
    throw new ApiError(response.status, String(body.error ?? 'request_failed'), undefined, body.issues)
  }
  return response.status === 204 ? (undefined as T) : ((await response.json()) as T)
}

let inflightRefresh: Promise<boolean> | null = null

function tryRefresh(): Promise<boolean> {
  // Una sola petición de refresh aunque varias consultas fallen a la vez.
  inflightRefresh ??= doRefresh().finally(() => {
    inflightRefresh = null
  })
  return inflightRefresh
}

async function doRefresh(): Promise<boolean> {
  const refreshToken = getRefreshToken()
  if (!refreshToken) return false
  try {
    const response = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })
    if (!response.ok) {
      clearSession()
      return false
    }
    saveSession((await response.json()) as Pick<SessionResponse, 'accessToken' | 'refreshToken'>)
    return true
  } catch {
    return false
  }
}

export const api = {
  register: (input: { name: string; email: string; password: string; phone?: string }) =>
    request<SessionResponse>('/auth/register', { method: 'POST', body: JSON.stringify(input) }),
  login: (input: { email: string; password: string }) =>
    request<SessionResponse>('/auth/login', { method: 'POST', body: JSON.stringify(input) }),
  logout: () => {
    const refreshToken = getRefreshToken()
    clearSession()
    if (!refreshToken) return Promise.resolve()
    return request<void>('/auth/logout', { method: 'POST', body: JSON.stringify({ refreshToken }) }).catch(
      () => undefined,
    )
  },
  me: () => request<Omit<SessionResponse, 'accessToken' | 'refreshToken'>>('/auth/me'),
  updateProfile: (
    input: Partial<{
      name: string
      phone: string | null
      address: string | null
      postalCode: string | null
      city: string | null
      locale: 'es' | 'en' | null
    }>,
  ) => request<Omit<SessionResponse, 'accessToken' | 'refreshToken'>>('/users/me', { method: 'PATCH', body: JSON.stringify(input) }),
  switchMode: (mode: 'CLIENT' | 'PROVIDER') =>
    request<Omit<SessionResponse, 'accessToken' | 'refreshToken'>>('/users/me/mode', {
      method: 'PATCH',
      body: JSON.stringify({ mode }),
    }),
}
