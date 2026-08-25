import { useState } from 'react'
import { useTranslation } from 'react-i18next'

// Estrellas del sistema: relleno clay, vacías line. Solo lectura o interactivas.
export function StarRating({
  value,
  size = 'text-sm',
  onChange,
}: {
  value: number
  size?: string
  onChange?: (value: number) => void
}) {
  const { t } = useTranslation()
  const [hover, setHover] = useState<number | null>(null)
  const shown = hover ?? value

  return (
    <span
      className={`inline-flex items-center gap-0.5 font-mono ${size} ${
        onChange ? 'cursor-pointer' : ''
      }`}
      role={onChange ? 'radiogroup' : undefined}
      aria-label={t('review.starsAria')}
      onMouseLeave={() => setHover(null)}
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={!onChange}
          aria-label={`${star}`}
          aria-pressed={onChange ? value === star : undefined}
          onClick={() => onChange?.(star)}
          onMouseEnter={() => onChange && setHover(star)}
          className={`leading-none ${onChange ? 'cursor-pointer' : 'cursor-default'}`}
        >
          <span className={star <= shown ? 'text-clay' : 'text-line'}>★</span>
        </button>
      ))}
    </span>
  )
}
