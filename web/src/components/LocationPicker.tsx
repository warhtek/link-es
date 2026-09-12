import { useEffect, useRef, useState } from 'react'
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

// Convierte texto a número válido dentro del rango de la coordenada, o null.
function parseCoord(text: string, max: number): number | null {
  const n = Number.parseFloat(text)
  if (Number.isNaN(n) || n < -max || n > max) {
    return null
  }
  return n
}

function fmtCoord(n: number): string {
  return n.toFixed(6).replace(/0+$/, '').replace(/\.$/, '')
}

// Selecciona la ubicación: tocar el mapa, arrastrar el pin, el GPS o escribir lat/long.
export function LocationPicker({ value, onChange }: Props) {
  const { t } = useTranslation()
  const [getting, setGetting] = useState(false)
  const [latInput, setLatInput] = useState(value ? fmtCoord(value.lat) : '')
  const [lngInput, setLngInput] = useState(value ? fmtCoord(value.lng) : '')
  // No pisar lo que el usuario escribe: solo se resincroniza el campo cuando el
  // cambio provino del mapa/GPS/arrastre y no de los propios inputs.
  const lastChange = useRef<'input' | 'external'>('external')

  useEffect(() => {
    if (value && lastChange.current === 'external') {
      setLatInput(fmtCoord(value.lat))
      setLngInput(fmtCoord(value.lng))
    }
  }, [value])

  function externalChange(lat: number, lng: number) {
    lastChange.current = 'external'
    onChange(lat, lng)
  }

  function commitFromInput(latValue: string, lngValue: string) {
    const lat = parseCoord(latValue, 90)
    const lng = parseCoord(lngValue, 180)
    if (lat !== null && lng !== null) {
      lastChange.current = 'input'
      onChange(lat, lng)
    }
  }

  function pickFromBrowser() {
    if (!navigator.geolocation) {
      alert(t('profile.geolocationNotSupported'))
      return
    }
    setGetting(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        externalChange(pos.coords.latitude, pos.coords.longitude)
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
          dragging={false}
          className="h-full w-full"
          attributionControl={false}
        >
          <ThemeTileLayer />
          <PlacedPin value={value} onChange={externalChange} />
        </MapContainer>
      </div>
      <div className="grid grid-cols-2 gap-2 border-t border-line px-3 py-2 sm:gap-3">
        <label className="block space-y-1">
          <span className="text-xs font-medium text-ink-soft">{t('provider.mapPickerLat')}</span>
          <input
            type="text"
            inputMode="decimal"
            autoComplete="off"
            value={latInput}
            onChange={(e) => {
              const v = e.target.value
              setLatInput(v)
              commitFromInput(v, lngInput)
            }}
            placeholder="13.6770"
            aria-invalid={latInput !== '' && parseCoord(latInput, 90) === null}
            className={`w-full rounded-control border bg-paper px-2.5 py-1.5 font-mono text-sm ${latInput !== '' && parseCoord(latInput, 90) === null ? 'border-clay' : 'border-line'}`}
          />
        </label>
        <label className="block space-y-1">
          <span className="text-xs font-medium text-ink-soft">{t('provider.mapPickerLng')}</span>
          <input
            type="text"
            inputMode="decimal"
            autoComplete="off"
            value={lngInput}
            onChange={(e) => {
              const v = e.target.value
              setLngInput(v)
              commitFromInput(latInput, v)
            }}
            placeholder="-89.2730"
            aria-invalid={lngInput !== '' && parseCoord(lngInput, 180) === null}
            className={`w-full rounded-control border bg-paper px-2.5 py-1.5 font-mono text-sm ${lngInput !== '' && parseCoord(lngInput, 180) === null ? 'border-clay' : 'border-line'}`}
          />
        </label>
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