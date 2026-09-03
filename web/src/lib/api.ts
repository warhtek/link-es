// Cliente API con access token corto + refresh automático ante 401.
// Tokens en localStorage: suficiente para el MVP; migrar a cookies httpOnly si
// se necesita protección extra contra XSS.

// Sin variable de entorno se deduce del host con el que se abre el sitio:
// permite usar la app desde otros equipos de la red sin reconfigurar nada.
const API_URL =
  import.meta.env.VITE_API_URL ?? `http://${window.location.hostname}:4000/api`
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

async function request<T>(
  path: string,
  init: RequestInit = {},
  retried = false,
): Promise<T> {
  const headers = new Headers(init.headers)
  // Con FormData el navegador fija Content-Type con el boundary; no tocarlo.
  if (init.body && !(init.body instanceof FormData)) headers.set('Content-Type', 'application/json')
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
  forgotPassword: (email: string) =>
    request<{ ok: boolean; message: string }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),
  resetPassword: (input: { token: string; password: string }) =>
    request<{ ok: boolean }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
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
  categories: () =>
    request<CategoryNode[]>('/categories'),
  onboardingProvider: (input: {
    businessName: string
    headline?: string
    bio?: string
    categoryIds: string[]
    city: string
    serviceRadiusKm?: number
  }) => request<OnboardingResponse>('/providers/onboarding', { method: 'POST', body: JSON.stringify(input) }),
  providerMe: () => request<ProviderProfile>('/providers/me'),
  uploadDocument: (file: File, type: string) => {
    const form = new FormData()
    form.append('file', file)
    form.append('type', type)
    return request<VerificationDocument>('/providers/me/documents', { method: 'POST', body: form })
  },
  createBooking: (input: { serviceId: string; scheduledAt: string; address: string; notes?: string }) =>
    request<{ id: string; code: string; status: string }>('/bookings', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  bookings: (scope: 'client' | 'provider') =>
    request<ClientBooking[] | ProviderBooking[]>(`/bookings?scope=${scope}`),
  createBookingReview: (
    id: string,
    input: { rating: number; comment?: string },
  ) =>
    request<{ id: string; rating: number; comment: string | null }>(`/bookings/${id}/review`, {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  updateBookingStatus: (id: string, status: BookingAction) =>
    request<{ id: string; code: string; status: string }>(`/bookings/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
  admin: {
    getStats: () => request<AdminStats>('/admin/stats'),
    getUsers: (params?: {
      search?: string
      role?: string
      verificationStatus?: string
      page?: number
      limit?: number
    }) => {
      const sp = new URLSearchParams()
      if (params?.search) sp.set('search', params.search)
      if (params?.role) sp.set('role', params.role)
      if (params?.verificationStatus) sp.set('verificationStatus', params.verificationStatus)
      if (params?.page) sp.set('page', String(params.page))
      if (params?.limit) sp.set('limit', String(params.limit))
      const qs = sp.toString()
      return request<AdminUsersResponse>(`/admin/users?${qs}`)
    },
    getCategories: () => request<AdminCategoriesResponse>('/admin/categories'),
    createCategory: (data: AdminCreateCategoryInput) =>
      request<AdminCategoryItem>('/admin/categories', { method: 'POST', body: JSON.stringify(data) }),
    updateCategory: (id: string, data: AdminUpdateCategoryInput) =>
      request<AdminCategoryItem>(`/admin/categories/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    deleteCategory: (id: string) =>
      request<{ ok: boolean; message: string }>(`/admin/categories/${id}`, { method: 'DELETE' }),
    getUser: (id: string) => request<AdminUserItem>(`/admin/users/${id}`),
    createUser: (data: AdminCreateUserInput) =>
      request<AdminUserItem>('/admin/users', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    updateUser: (id: string, data: AdminUpdateUserInput) =>
      request<AdminUserItem>(`/admin/users/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    setVerification: (id: string, verificationStatus: 'NONE' | 'PENDING' | 'VERIFIED') =>
      request<{ ok: boolean; verificationStatus: string }>(`/admin/users/${id}/verification`, {
        method: 'PATCH',
        body: JSON.stringify({ verificationStatus }),
      }),
    deleteUser: (id: string) =>
      request<{ ok: boolean; message: string }>(`/admin/users/${id}`, {
        method: 'DELETE',
      }),
  },
}

export type BookingStatusValue =
  | 'PENDING'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'

export type BookingAction = Extract<
  BookingStatusValue,
  'ACCEPTED' | 'REJECTED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
>

interface BookingBase {
  id: string
  code: string
  status: BookingStatusValue
  scheduledAt: string
  address: string
  notes: string | null
  createdAt: string
  service: { id: string; title: string; priceFrom: number; unit: 'HOUR' | 'PROJECT' }
}

export interface ClientBooking extends BookingBase {
  providerBusinessName: string
  providerId: string
  conversationId?: string | null
  myRating?: number | null
}

export interface ProviderBooking extends BookingBase {
  clientName: string
  conversationId?: string | null
}

export interface CategoryNode {
  id: string
  name: string
  slug: string
  icon: string | null
  children: { id: string; name: string; slug: string; icon: string | null }[]
}

export interface VerificationDocument {
  id: string
  type: 'ID' | 'LICENSE' | 'CERTIFICATION' | 'OTHER'
  fileUrl: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  createdAt: string
}

export interface ProviderProfile {
  id: string
  businessName: string
  headline: string | null
  bio: string | null
  verificationStatus: 'NONE' | 'PENDING' | 'VERIFIED'
  serviceRadiusKm: number
  documents: VerificationDocument[]
  categories: CategoryNode[]
}

interface OnboardingResponse extends SessionResponse {
  profile: ProviderProfile
}

export interface AdminStats {
  totalUsers: number
  clientsCount: number
  providersCount: number
  adminsCount: number
  pendingVerifications: number
  totalBookings: number
}

export interface AdminUserItem {
  id: string
  name: string
  email: string
  phone: string | null
  avatarUrl: string | null
  roles: ('CLIENT' | 'PROVIDER' | 'ADMIN')[]
  activeMode: 'CLIENT' | 'PROVIDER'
  address: string | null
  city: string | null
  postalCode: string | null
  createdAt: string
  verifiedAt: string | null
  providerProfile?: {
    id: string
    businessName: string
    headline: string | null
    verificationStatus: 'NONE' | 'PENDING' | 'VERIFIED'
    serviceRadiusKm: number
    ratingAvg: number
    ratingCount: number
    categories: { id: string; name: string; slug: string }[]
  } | null
  _count: {
    bookingsAsClient: number
    reviews: number
  }
}

export interface AdminUsersResponse {
  users: AdminUserItem[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface AdminCreateUserInput {
  name: string
  email: string
  password: string
  phone?: string | null
  city?: string | null
  address?: string | null
  roles: ('CLIENT' | 'PROVIDER' | 'ADMIN')[]
  businessName?: string | null
  headline?: string | null
  bio?: string | null
  serviceRadiusKm?: number
  verificationStatus?: 'NONE' | 'PENDING' | 'VERIFIED'
  categoryIds?: string[]
}

export interface AdminUpdateUserInput {
  name?: string
  email?: string
  password?: string | null
  phone?: string | null
  city?: string | null
  address?: string | null
  roles?: ('CLIENT' | 'PROVIDER' | 'ADMIN')[]
  businessName?: string | null
  headline?: string | null
  bio?: string | null
  serviceRadiusKm?: number
  verificationStatus?: 'NONE' | 'PENDING' | 'VERIFIED'
  categoryIds?: string[]
}

export interface AdminCategoryItem {
  id: string
  name: string
  slug: string
  icon: string | null
  parentId: string | null
  _count: {
    profiles: number
    services: number
    children: number
  }
  children: AdminCategoryItem[]
  parent: AdminCategoryItem | null
}

export interface AdminCategoriesResponse {
  categories: AdminCategoryItem[]
  total: number
}

export interface AdminCreateCategoryInput {
  name: string
  slug?: string
  icon?: string | null
  parentId?: string | null
}

export interface AdminUpdateCategoryInput {
  name?: string
  slug?: string
  icon?: string | null
  parentId?: string | null
}

