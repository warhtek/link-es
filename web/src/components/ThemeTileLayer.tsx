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

  return (
    <TileLayer
      key={theme}
      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
    />
  )
}