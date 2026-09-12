import { useEffect, useState } from 'react'
import { TileLayer } from 'react-leaflet'

export function ThemeTileLayer() {
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