import { useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { usePublicProvider } from '../../lib/search'
import { getAccessToken } from '../../lib/api'
import { useCreateBooking } from '../../lib/auth'
import { authErrorMessage } from '../../lib/errors'
import { inputClass } from '../Login'

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

      <RequestServiceSection services={p.services} />
    </main>
  )
}

function RequestServiceSection({
  services,
}: {
  services: { id: string; title: string; priceFrom: number; unit: 'HOUR' | 'PROJECT' }[]
}) {
  const { t, i18n } = useTranslation()
  const createBooking = useCreateBooking()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({
    serviceId: services[0]?.id ?? '',
    scheduledAt: '',
    address: '',
    notes: '',
  })

  // Sin sesión el CTA lleva a login (vuelve después); con sesión se abre el formulario.
  if (!getAccessToken()) {
    return (
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
    )
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    createBooking.mutate(
      {
        serviceId: form.serviceId,
        scheduledAt: new Date(form.scheduledAt).toISOString(),
        address: form.address,
        notes: form.notes || undefined,
      },
      {
        onSuccess: () => setOpen(false),
      },
    )
  }

  if (createBooking.isSuccess && createBooking.data) {
    return (
      <div className="mt-6 rounded-card border border-moss bg-moss-soft p-5 text-center sm:p-6" data-testid="booking-success">
        <p className="font-display text-base font-semibold text-moss">{t('booking.createdTitle')}</p>
        <p className="mt-1 font-mono text-lg">{createBooking.data.code}</p>
        <p className="mx-auto mt-1 max-w-xs text-xs text-ink-soft">{t('booking.createdNote')}</p>
        <Link to="/reservas" className="mt-3 inline-block text-sm font-medium text-moss hover:underline">
          {t('booking.goMyBookings')}
        </Link>
      </div>
    )
  }

  if (!open || services.length === 0) {
    return (
      <div className="mt-6 rounded-card border border-line bg-panel p-5 text-center sm:p-6">
        <p className="text-sm text-ink-soft">{t('public.requestNote')}</p>
        <button
          type="button"
          onClick={() => setOpen(true)}
          disabled={services.length === 0}
          data-testid="request-service"
          className="mt-3 cursor-pointer rounded-control bg-moss px-5 py-2.5 text-sm font-medium text-panel hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {t('ds.requestBtn')}
        </button>
      </div>
    )
  }

  return (
    <section className="mt-6 rounded-card border border-line bg-panel p-5 sm:p-6" data-testid="request-form">
      <h2 className="font-display text-base font-semibold tracking-tight">{t('booking.formTitle')}</h2>
      <form onSubmit={onSubmit} className="mt-4 grid gap-4 sm:grid-cols-2" noValidate>
        <label className="block space-y-1.5">
          <span className="text-sm font-medium">{t('booking.service')}</span>
          <select
            value={form.serviceId}
            onChange={(e) => setForm({ ...form, serviceId: e.target.value })}
            required
            className={inputClass}
            data-testid="booking-service"
          >
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title} — ${s.priceFrom.toFixed(2)}
                {' '}
                {i18n.language.startsWith('en')
                  ? s.unit === 'HOUR' ? '/hr' : '/project'
                  : s.unit === 'HOUR' ? '/hora' : '/proyecto'}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1.5">
          <span className="text-sm font-medium">{t('booking.when')}</span>
          <input
            type="datetime-local"
            required
            value={form.scheduledAt}
            onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })}
            className={inputClass}
            data-testid="booking-date"
          />
        </label>
        <label className="block space-y-1.5 sm:col-span-2">
          <span className="text-sm font-medium">{t('booking.address')}</span>
          <input
            type="text"
            required
            minLength={5}
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            placeholder={t('booking.addressPlaceholder')}
            className={inputClass}
            data-testid="booking-address"
          />
          <span className="block text-xs text-ink-soft">{t('booking.addressPrivacy')}</span>
        </label>
        <label className="block space-y-1.5 sm:col-span-2">
          <span className="text-sm font-medium">
            {t('booking.notes')} ({t('common.optional')})
          </span>
          <textarea
            rows={2}
            maxLength={1000}
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            className={`${inputClass} resize-none`}
          />
        </label>

        {createBooking.isError && (
          <p role="alert" className="rounded-control border border-clay/40 bg-clay/10 px-3 py-2 text-sm sm:col-span-2">
            {authErrorMessage(createBooking.error, t)}
          </p>
        )}

        <div className="flex items-center gap-3 sm:col-span-2">
          <button
            type="submit"
            disabled={createBooking.isPending}
            data-testid="booking-submit"
            className="cursor-pointer rounded-control bg-moss px-5 py-2.5 text-sm font-medium text-panel hover:opacity-90 disabled:cursor-wait disabled:opacity-60"
          >
            {createBooking.isPending ? t('booking.sending') : t('booking.send')}
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="cursor-pointer rounded-control border border-line bg-paper px-4 py-2.5 text-sm font-medium hover:bg-moss-soft"
          >
            {t('common.cancel')}
          </button>
        </div>
      </form>
    </section>
  )
}
