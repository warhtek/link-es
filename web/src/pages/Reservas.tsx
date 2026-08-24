import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { RequireAuth } from '../components/RequireAuth'
import { BookingStatusBadge } from '../components/BookingStatusBadge'
import { useBookings, useUpdateBookingStatus } from '../lib/auth'
import type { ClientBooking } from '../lib/api'

const ACTIVE: ClientBooking['status'][] = ['PENDING', 'ACCEPTED', 'IN_PROGRESS']

export function ReservasPage() {
  return (
    <RequireAuth>
      <ReservasContent />
    </RequireAuth>
  )
}

function ReservasContent() {
  const { t, i18n } = useTranslation()
  const bookings = useBookings('client')
  const cancel = useUpdateBookingStatus('client')

  const list = (bookings.data ?? []) as ClientBooking[]
  const active = list.filter((b) => ACTIVE.includes(b.status))
  const history = list.filter((b) => !ACTIVE.includes(b.status))

  const locale = i18n.language.startsWith('en') ? 'en-US' : 'es-SV'
  const fmtDate = (iso: string) =>
    new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso))

  return (
    <main className="mx-auto w-full max-w-3xl space-y-6 px-4 py-10 sm:py-14">
      <header className="flex items-baseline justify-between">
        <h1 className="font-display text-xl font-semibold tracking-tight">{t('booking.myBookings')}</h1>
        <Link to="/buscar" className="text-sm font-medium text-moss hover:underline">
          {t('nav.search')}
        </Link>
      </header>

      <section data-testid="bookings-active">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-soft">
          {t('booking.active')}
        </h2>
        {active.length === 0 ? (
          <p className="rounded-card border border-line bg-panel p-5 text-sm text-ink-soft">
            {t('booking.noActive')}
          </p>
        ) : (
          <ul className="space-y-3">
            {active.map((b) => (
              <li key={b.id} className="rounded-card border border-line bg-panel px-4 py-3.5" data-testid="booking-item">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-clay">{b.code}</span>
                  <BookingStatusBadge status={b.status} />
                  {(b.status === 'PENDING' || b.status === 'ACCEPTED' || b.status === 'IN_PROGRESS') && (
                    <button
                      type="button"
                      onClick={() => cancel.mutate({ id: b.id, status: 'CANCELLED' })}
                      disabled={cancel.isPending}
                      data-testid={`cancel-${b.code}`}
                      className="ml-auto cursor-pointer rounded-control border border-line bg-paper px-2.5 py-1 text-xs font-medium hover:bg-moss-soft"
                    >
                      {t('booking.cancelAction')}
                    </button>
                  )}
                </div>
                <p className="mt-1.5 text-sm font-semibold">{b.service.title}</p>
                <p className="mt-0.5 text-xs text-ink-soft">
                  {t('booking.with')}{' '}
                  <Link to={`/proveedores/${b.providerId}`} className="font-medium text-moss hover:underline">
                    {b.providerBusinessName}
                  </Link>
                </p>
                <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
                  <dt className="uppercase tracking-wide text-ink-soft">{t('booking.when')}</dt>
                  <dd className="font-mono">{fmtDate(b.scheduledAt)}</dd>
                  <dt className="uppercase tracking-wide text-ink-soft">{t('booking.addressShort')}</dt>
                  <dd>{b.address}</dd>
                </dl>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section data-testid="bookings-history">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-soft">
          {t('booking.history')}
        </h2>
        {history.length === 0 ? (
          <p className="rounded-card border border-line bg-panel p-5 text-sm text-ink-soft">
            {t('booking.noHistory')}
          </p>
        ) : (
          <ul className="space-y-3 opacity-80">
            {history.map((b) => (
              <li key={b.id} className="rounded-card border border-line bg-panel px-4 py-3.5" data-testid="history-item">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-clay">{b.code}</span>
                  <BookingStatusBadge status={b.status} />
                </div>
                <p className="mt-1.5 text-sm font-semibold">{b.service.title}</p>
                <p className="mt-0.5 text-xs text-ink-soft">
                  {t('booking.with')} {b.providerBusinessName} ·{' '}
                  <span className="font-mono">{fmtDate(b.scheduledAt)}</span>
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}
