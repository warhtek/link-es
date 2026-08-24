import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { usePublicProvider } from '../../lib/search'

export function PerfilPublicoPage() {
  return <PerfilPublicoContent />
}

function PerfilPublicoContent() {
  const { t, i18n } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const provider = usePublicProvider(id)

  if (provider.isPending) {
    return (
      <main className="flex min-h-[50vh] items-center justify-center">
        <span className="font-mono text-xs uppercase tracking-wide text-ink-soft">…</span>
      </main>
    )
  }
  if (provider.isError || !provider.data) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16 text-center">
        <p className="font-display text-lg font-semibold">{t('search.notFoundTitle')}</p>
        <Link to="/buscar" className="mt-3 inline-block text-sm font-medium text-moss hover:underline">
          {t('search.backToSearch')}
        </Link>
      </main>
    )
  }

  const p = provider.data
  const verified = p.verificationStatus === 'VERIFIED'

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:py-12">
      <nav className="mb-4">
        <Link to="/buscar" className="font-mono text-xs uppercase tracking-wide text-ink-soft hover:text-carbon">
          ← {t('search.title')}
        </Link>
      </nav>

      {/* Cabecera tipo ficha */}
      <header className="rounded-card border border-line bg-panel">
        <div className="flex items-start gap-4 border-b border-line px-5 py-5 sm:px-6">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[10px] bg-moss-soft font-display text-xl font-semibold text-moss">
            {p.businessName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-xl font-semibold tracking-tight">{p.businessName}</h1>
              {verified && (
                <span className="rounded-control border border-moss bg-moss-soft px-2 py-0.5 text-[11px] font-medium text-moss">
                  ✓ {t('ds.verified')}
                </span>
              )}
              {p.verificationStatus === 'PENDING' && (
                <span className="text-[11px] text-ink-soft">{t('ds.pendingVerif')}</span>
              )}
            </div>
            {p.headline && <p className="mt-1 text-sm text-ink-soft">{p.headline}</p>}
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
              {p.ratingCount > 0 ? (
                <span className="font-mono">★ {p.ratingAvg.toFixed(1)}</span>
              ) : (
                <span className="text-ink-soft">☆</span>
              )}
              <span className="text-ink-soft">
                ({t('search.reviewCount', { count: p.ratingCount })})
              </span>
              {p.city && <span className="text-ink-soft">· {p.city}</span>}
              <span className="font-mono text-ink-soft">· {t('provider.radius')}: {p.serviceRadiusKm} km</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 px-5 py-3 sm:px-6">
          {p.categories.map((cat) => (
            <span key={cat.id} className="rounded-control border border-line bg-paper px-2.5 py-1 text-xs">
              {cat.icon} {cat.name}
            </span>
          ))}
        </div>
      </header>

      {p.bio && (
        <section className="mt-6 rounded-card border border-line bg-panel p-5 sm:p-6">
          <h2 className="font-display text-base font-semibold tracking-tight">{t('provider.bio')}</h2>
          <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-carbon/90">{p.bio}</p>
        </section>
      )}

      {/* Servicios con precio en mono */}
      <section className="mt-6 rounded-card border border-line bg-panel p-5 sm:p-6">
        <h2 className="font-display text-base font-semibold tracking-tight">{t('public.servicesTitle')}</h2>
        {p.services.length === 0 ? (
          <p className="mt-2 text-sm text-ink-soft">{t('public.noServices')}</p>
        ) : (
          <ul className="mt-3 divide-y divide-line">
            {p.services.map((service) => (
              <li key={service.id} className="flex items-baseline justify-between gap-3 py-3">
                <div className="min-w-0">
                  <b className="block truncate text-sm font-medium">{service.title}</b>
                  {service.description && (
                    <span className="mt-0.5 block truncate text-xs text-ink-soft">{service.description}</span>
                  )}
                </div>
                <span className="shrink-0 font-mono text-sm">
                  ${service.priceFrom.toFixed(2)}
                  <span className="text-xs text-ink-soft">
                    {' '}
                    / {i18n.language.startsWith('en')
                      ? service.unit === 'HOUR' ? 'hr' : 'project'
                      : service.unit === 'HOUR' ? 'hora' : 'proyecto'}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="mt-6 rounded-card border border-line bg-panel p-5 text-center sm:p-6">
        <p className="text-sm text-ink-soft">{t('public.requestNote')}</p>
        <Link
          to="/login"
          data-testid="request-service"
          className="mt-3 inline-block cursor-pointer rounded-control bg-moss px-5 py-2.5 text-sm font-medium text-panel hover:opacity-90"
        >
          {t('ds.requestBtn')}
        </Link>
      </div>
    </main>
  )
}
