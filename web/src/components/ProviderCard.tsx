import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { formatDistance, type ProviderSearchResult } from '../lib/search'

// Ficha de directorio (plan sección 3): borde 1px sin sombra, distancia como dato ancla.
export function ProviderCard({
  provider,
  highlighted,
  onHover,
}: {
  provider: ProviderSearchResult
  highlighted?: boolean
  onHover?: (id: string | null) => void
}) {
  const { t } = useTranslation()

  return (
    <Link
      to={`/proveedores/${provider.id}`}
      onMouseEnter={() => onHover?.(provider.id)}
      onMouseLeave={() => onHover?.(null)}
      data-testid="provider-card"
      className={`block rounded-card border bg-panel transition-colors ${
        highlighted ? 'border-moss' : 'border-line hover:border-moss/60'
      }`}
    >
      <div className="flex items-center gap-3 border-b border-line px-4 py-3.5">
        <div className="flex h-13 w-13 shrink-0 items-center justify-center rounded-[10px] bg-moss-soft font-semibold text-moss">
          {provider.businessName.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <b className="truncate text-sm font-semibold">{provider.businessName}</b>
            {provider.distanceKm != null && (
              <span className="shrink-0 font-mono text-xs text-clay">
                {formatDistance(provider.distanceKm)}
              </span>
            )}
          </div>
          <div className="mt-0.5 truncate text-xs text-ink-soft">
            {provider.headline || provider.categories.map((c) => c.name).join(' · ') || provider.city || '—'}
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between px-4 py-2.5">
        <span className="text-xs">
          <b className="font-mono">{provider.ratingCount > 0 ? `★ ${provider.ratingAvg.toFixed(1)}` : '☆'}</b>{' '}
          <span className="text-ink-soft">({provider.ratingCount})</span>
        </span>
        {provider.verificationStatus === 'VERIFIED' && (
          <span className="rounded-control border border-moss bg-moss-soft px-2 py-0.5 text-[11px] font-medium text-moss">
            ✓ {t('ds.verified')}
          </span>
        )}
        {provider.verificationStatus === 'PENDING' && (
          <span className="text-[11px] text-ink-soft">{t('ds.pendingVerif')}</span>
        )}
      </div>
    </Link>
  )
}
