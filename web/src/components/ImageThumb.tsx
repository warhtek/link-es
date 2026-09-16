import { useEffect, useState } from 'react'
import { resolveImageUrl } from '../lib/resolveImage'

export function ImageThumb({
  src,
  alt,
  className,
  fit = 'cover',
}: {
  src: string
  alt: string
  className?: string
  fit?: 'cover' | 'contain'
}) {
  // Solo recuerda el error de la URL concreta: si el enlace cambia
  // (p. ej. al editarlo en el formulario) se reintenta la carga.
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null)
  const trimmed = src.trim()

  useEffect(() => {
    let active = true
    setResolvedUrl(null)
    resolveImageUrl(trimmed).then((url) => {
      if (active) setResolvedUrl(url)
    })
    return () => {
      active = false
    }
  }, [trimmed])

  if (!trimmed || failedSrc === resolvedUrl || resolvedUrl === null) {
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
      key={resolvedUrl}
      src={resolvedUrl}
      alt={alt}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setFailedSrc(resolvedUrl)}
      className={`object-${fit} ${className ?? ''}`}
    />
  )
}