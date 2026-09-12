import { useState } from 'react'
import { MapContainer, Marker, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import { useTranslation } from 'react-i18next'
import { DEFAULT_CENTER } from '../lib/geo'
import { ThemeTileLayer } from './ThemeTileLayer'

// Pin de ubicación elegida con el punto-clay del sistema de diseño.
function pickerIcon(): L.DivIcon {
  return L.divIcon({
    className: 'linkes-pin-wrap',
    html: '<span class="linkes-pin linkes-pin-picked"></span>',
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  })
}

interface Props {
  value: { lat: number; lng: number } | null
  onChange: (lat: number, lng: number) => void
}

// Selecciona la ubicación: tocar el mapa o arrastrar el pin. El botón usa el GPS del navegador.
export function LocationPicker({ value, onChange }: Props) {
  const { t } = useTranslation()
  const [getting, setGetting] = useState(false)

  function pickFromBrowser() {
    if (!navigator.geolocation) {
      alert(t('profile.geolocationNotSupported'))
      return
    }
    setGetting(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onChange(pos.coords.latitude, pos.coords.longitude)
        setGetting(false)
      },
      (err) => {
        setGetting(false)
        if (err.code === err.PERMISSION_DENIED) {
          alert(t('profile.geolocationDenied'))
        } else {
          alert(t('profile.geolocationError'))
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    )
  }

  return (
    <div className="overflow-hidden rounded-control border border-line bg-panel">
      <div className="h-56 sm:h-64" data-testid="location-picker">
        <MapContainer
          center={value ? [value.lat, value.lng] : DEFAULT_CENTER}
          zoom={13}
          scrollWheelZoom={false}
          className="h-full w-full"
          attributionControl={false}
        >
          <ThemeTileLayer />
          <PlacedPin value={value} onChange={onChange} />
        </MapContainer>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-3 py-2">
        <span className="font-mono text-xs text-ink-soft">
          {value ? `${value.lat.toFixed(6)}, ${value.lng.toFixed(6)}` : t('provider.pickLocationEmpty')}
        </span>
        <button
          type="button"
          onClick={pickFromBrowser}
          disabled={getting}
          className="cursor-pointer rounded-control border border-line bg-paper px-3 py-1.5 text-xs font-medium hover:bg-moss-soft disabled:cursor-not-allowed disabled:opacity-50"
        >
          {getting ? t('provider.locating') : t('profile.useCurrentLocation')}
        </button>
      </div>
    </div>
  )
}

function PlacedPin({ value, onChange }: Props) {
  useMapEvents({
    click(event) {
      onChange(event.latlng.lat, event.latlng.lng)
    },
  })

  if (!value) {
    return null
  }

  return (
    <Marker
      position={[value.lat, value.lng]}
      icon={pickerIcon()}
      draggable
      zIndexOffset={0}
      eventHandlers={{
        dragend: (event) => {
          const p = event.target.getLatLng()
          onChange(p.lat, p.lng)
        },
      }}
    />
  )
}