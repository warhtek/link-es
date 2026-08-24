import { useCallback, useState } from 'react'
import { useQuery } from '@tanstack/react-query'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api'

export interface ProviderSearchResult {
  id: string
  businessName: string
  headline: string | null
  verificationStatus: 'NONE' | 'PENDING' | 'VERIFIED'
  ratingAvg: number
  ratingCount: number
  city: string | null
  lat: number | null
  lng: number | null
  distanceKm: number | null
  categories: { name: string; icon: string | null }[]
}

export interface PublicProviderDetail extends Omit<ProviderSearchResult, 'distanceKm'> {
  bio: string | null
  serviceRadiusKm: number
  categories: { id: string; name: string; icon: string | null }[]
  services: { id: string; title: string; description: string | null; priceFrom: number; unit: 'HOUR' | 'PROJECT' }[]
}

export type SortOption = 'distance' | 'rating' | 'bookings'

export interface SearchParams {
  q?: string
  categoryId?: string
  lat?: number
  lng?: number
  radiusKm?: number
  sort: SortOption
}

function toQuery(params: SearchParams): string {
  const qs = new URLSearchParams()
  if (params.q) qs.set('q', params.q)
  if (params.categoryId) qs.set('categoryId', params.categoryId)
  if (params.lat !== undefined) {
    qs.set('lat', String(params.lat))
    qs.set('lng', String(params.lng))
  }
  if (params.radiusKm) qs.set('radiusKm', String(params.radiusKm))
  qs.set('sort', params.sort)
  return qs.toString()
}

export function useProviderSearch(params: SearchParams) {
  return useQuery({
    queryKey: ['providers-search', toQuery(params)],
    queryFn: async (): Promise<ProviderSearchResult[]> => {
      const res = await fetch(`${API_URL}/public/providers?${toQuery(params)}`)
      if (!res.ok) throw new Error('search_failed')
      return res.json()
    },
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  })
}

export function usePublicProvider(id: string | undefined) {
  return useQuery({
    queryKey: ['public-provider', id],
    queryFn: async (): Promise<PublicProviderDetail> => {
      const res = await fetch(`${API_URL}/public/providers/${id}`)
      if (!res.ok) throw new Error('provider_not_found')
      return res.json()
    },
    enabled: Boolean(id),
  })
}

export type GeoStatus = 'idle' | 'requesting' | 'granted' | 'denied' | 'unavailable'

// Ubicación del cliente: nunca sale del navegador salvo como coordenadas para
// calcular distancia; el proveedor no la recibe.
export function useGeolocation() {
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null)
  const [status, setStatus] = useState<GeoStatus>('idle')

  const request = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setStatus('unavailable')
      return
    }
    setStatus('requesting')
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setPosition({ lat: coords.latitude, lng: coords.longitude })
        setStatus('granted')
      },
      () => setStatus('denied'),
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 60_000 },
    )
  }, [])

  // Alternativa sin permiso del navegador: tocar el mapa para ubicarse.
  const setManual = useCallback((lat: number, lng: number) => {
    setPosition({ lat, lng })
    setStatus('granted')
  }, [])

  return { position, status, request, setManual }
}

export function formatDistance(km: number | null): string {
  if (km == null) return ''
  return km >= 1 ? `${km.toFixed(1)} km` : `${Math.round(km * 1000)} m`
}
