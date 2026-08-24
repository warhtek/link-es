import { useEffect, useState } from 'react'
import { MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import { useTranslation } from 'react-i18next'
import { formatDistance, type ProviderSearchResult } from '../lib/search'

const DEFAULT_CENTER: [number, number] = [13.6929, -89.2182] // San Salvador

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

function ThemeTileLayer() {
  const [theme, setTheme] = useState(() => document.documentElement.getAttribute('data-theme') ?? 'light')

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setTheme(document.documentElement.getAttribute('data-theme') ?? 'light')
    })
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => observer.disconnect()
  }, [])

  const dark = theme === 'dark'
  return (
    <TileLayer
      key={theme}
      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
      url={dark ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png' : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'}
    />
  )
}

function Recenter({ center }: { center: [number, number] | null }) {
  const map = useMap()
  useEffect(() => {
    if (center) map.setView(center, Math.max(map.getZoom(), 13))
  }, [center, map])
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
        <Recenter center={clientPosition ? [clientPosition.lat, clientPosition.lng] : null} />
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
