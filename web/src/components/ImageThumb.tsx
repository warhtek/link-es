import { useState } from 'react'
import { normalizeImageUrl } from '../lib/image'

export function ImageThumb({
  src,
  alt,
  className,
}: {
  src: string
  alt: string
  className?: string
}) {
  // Solo recuerda el error de la URL concreta: si el enlace cambia
  // (p. ej. al editarlo en el formulario) se reintenta la carga.
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  const trimmed = src.trim()

  if (!trimmed || failedSrc === trimmed) {
    return (
      <div
        className={`flex items-center justify-center bg-moss-soft font-display text-sm text-moss ${className ?? ''}`}
      >
        {alt.charAt(0).toUpperCase()}
      </div>
    )
  }
  return (
    <img
      key={trimmed}
      src={normalizeImageUrl(trimmed)}
      alt={alt}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setFailedSrc(trimmed)}
      className={`object-cover ${className ?? ''}`}
    />
  )
}