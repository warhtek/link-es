import { useEffect } from 'react'
import { MapContainer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import { useTranslation } from 'react-i18next'
import { formatDistance, type ProviderSearchResult } from '../lib/search'
import { DEFAULT_CENTER } from '../lib/geo'
import { ThemeTileLayer } from './ThemeTileLayer'

// Pines propios del sistema de diseño (ficha de directorio, no app de delivery).
function providerIcon(status: string): L.DivIcon {
  const verified = status === 'VERIFIED'
  return L.divIcon({
    className: 'linkes-pin-wrap',
    html: `<span class="linkes-pin ${verified ? 'linkes-pin-verified' : ''}"></span>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  })
}

// Punto del cliente con anillo de proximidad animado — elemento de firma.
function clientIcon(): L.DivIcon {
  return L.divIcon({
    className: 'linkes-client-wrap',
    html: '<span class="linkes-client"><i></i></span>',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  })
}

// Recalibra el tamaño interno de Leaflet: en móvil el contenedor se monta antes
// de que el layout termine (vh del navegador, barra inferior), y sin esto los
// pines quedan emplazados fuera del área visible.
function AutoFitSize() {
  const map = useMap()
  useEffect(() => {
    const container = map.getContainer()
    let frame = 0
    const invalidate = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => map.invalidateSize())
    }
    const observer = new ResizeObserver(invalidate)
    observer.observe(container)
    window.addEventListener('resize', invalidate)
    const timer = window.setTimeout(() => map.invalidateSize(), 60)
    return () => {
      cancelAnimationFrame(frame)
      window.clearTimeout(timer)
      observer.disconnect()
      window.removeEventListener('resize', invalidate)
    }
  }, [map])
  return null
}

function Recenter({ center }: { center: [number, number] | null }) {
  const map = useMap()
  useEffect(() => {
    if (center) map.setView(center, Math.max(map.getZoom(), 13))
  }, [center, map])
  return null
}

// Encaja la vista para que todos los pines de la búsqueda queden visibles
// (algunos proveedores, como CREATIAES en Santa Tecla, caen fuera de la vista fija).
function RefitOnProviders({
  providers,
  clientPosition,
}: {
  providers: ProviderSearchResult[]
  clientPosition: { lat: number; lng: number } | null
}) {
  const map = useMap()
  useEffect(() => {
    const points: L.LatLngExpression[] = providers
      .filter((p) => p.lat != null && p.lng != null)
      .map((p) => [p.lat!, p.lng!])
    if (clientPosition) points.push([clientPosition.lat, clientPosition.lng])
    if (!points.length) return
    if (points.length === 1) {
      map.setView(points[0], Math.min(16, Math.max(13, map.getZoom())))
      return
    }
    map.fitBounds(L.latLngBounds(points), { padding: [48, 48], maxZoom: 15 })
  }, [providers, clientPosition, map])
  return null
}

// Alternativa al permiso de geolocalización: tocar el mapa define la ubicación.
function ClickToLocate({ enabled, onPick }: { enabled: boolean; onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(event) {
      if (enabled) onPick(event.latlng.lat, event.latlng.lng)
    },
  })
  return null
}

interface Props {
  providers: ProviderSearchResult[]
  clientPosition: { lat: number; lng: number } | null
  pickMode: boolean
  onPickClientPosition: (lat: number, lng: number) => void
  onSelectProvider: (id: string) => void
  selectedId?: string
}

export function ProviderMap({
  providers,
  clientPosition,
  pickMode,
  onPickClientPosition,
  onSelectProvider,
  selectedId,
}: Props) {
  const { t } = useTranslation()

  return (
    <div className="h-full w-full" data-testid="provider-map">
      <MapContainer
        center={clientPosition ? [clientPosition.lat, clientPosition.lng] : DEFAULT_CENTER}
        zoom={13}
        className="h-full w-full"
        attributionControl
      >
        <ThemeTileLayer />
        <AutoFitSize />
        <Recenter center={clientPosition ? [clientPosition.lat, clientPosition.lng] : null} />
        <RefitOnProviders providers={providers} clientPosition={clientPosition} />
        <ClickToLocate enabled={pickMode} onPick={onPickClientPosition} />

        {clientPosition && (
          <Marker position={[clientPosition.lat, clientPosition.lng]} icon={clientIcon()}>
            <Popup>{t('search.clientPin')}</Popup>
          </Marker>
        )}

        {providers
          .filter((p) => p.lat != null && p.lng != null)
          .map((p) => (
            <Marker
              key={p.id}
              position={[p.lat!, p.lng!]}
              icon={providerIcon(p.verificationStatus)}
              opacity={selectedId && selectedId !== p.id ? 0.45 : 1}
              eventHandlers={{ click: () => onSelectProvider(p.id) }}
            >
              <Popup>
                <b>{p.businessName}</b>
                <br />
                <span>★ {p.ratingAvg.toFixed(1)} ({p.ratingCount})</span>
                {p.distanceKm != null && (
                  <>
                    <br />
                    <span className="font-mono">{formatDistance(p.distanceKm)}</span>
                  </>
                )}
                <br />
                <button
                  type="button"
                  onClick={() => onSelectProvider(p.id)}
                  className="mt-1 cursor-pointer rounded-control bg-moss px-2 py-0.5 text-xs text-panel"
                >
                  {t('search.viewProfile')}
                </button>
              </Popup>
            </Marker>
          ))}
      </MapContainer>
    </div>
  )
}
