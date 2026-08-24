import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  api,
  clearSession,
  getAccessToken,
  saveSession,
  type SessionResponse,
} from './api'

export interface PublicUser
  extends Omit<SessionResponse, 'accessToken' | 'refreshToken'> {}

const ME_KEY = ['me'] as const

export function useMe() {
  const hasToken = Boolean(getAccessToken())
  return useQuery({
    queryKey: ME_KEY,
    queryFn: () => api.me(),
    enabled: hasToken,
    retry: false,
  })
}

export function useLogin() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { email: string; password: string }) => {
      const session = await api.login(input)
      saveSession(session)
      return session
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ME_KEY }),
  })
}

export function useRegister() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { name: string; email: string; password: string; phone?: string }) => {
      const session = await api.register(input)
      saveSession(session)
      return session
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ME_KEY }),
  })
}

export function useLogout() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => api.logout(),
    onSettled: () => {
      clearSession()
      queryClient.setQueryData(ME_KEY, null)
      queryClient.clear()
    },
  })
}

export function useUpdateProfile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: api.updateProfile,
    onSuccess: (user) => queryClient.setQueryData(ME_KEY, user),
  })
}

export function useSwitchMode() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: api.switchMode,
    // Al cambiar de modo el access token queda viejo (el modo va en el payload);
    // el refresh automático lo renueva en la próxima petición.
    onSuccess: (user) => queryClient.setQueryData(ME_KEY, user),
  })
}

export function useCategories() {
  return useQuery({ queryKey: ['categories'], queryFn: () => api.categories(), staleTime: Infinity })
}

const PROVIDER_ME_KEY = ['providers', 'me'] as const

export function useProviderMe() {
  return useQuery({
    queryKey: PROVIDER_ME_KEY,
    queryFn: () => api.providerMe(),
    retry: false,
  })
}

// Onboarding: el backend devuelve sesión nueva (el usuario pasa a PROVIDER).
export function useOnboardingProvider() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: Parameters<typeof api.onboardingProvider>[0]) => api.onboardingProvider(input),
    onSuccess: ({ ...session }) => {
      saveSession(session)
      queryClient.invalidateQueries({ queryKey: ME_KEY })
      queryClient.invalidateQueries({ queryKey: PROVIDER_ME_KEY })
    },
  })
}

export function useUploadDocument() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ file, type }: { file: File; type: string }) => api.uploadDocument(file, type),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PROVIDER_ME_KEY }),
  })
}
