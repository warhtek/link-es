import { useTranslation } from 'react-i18next'
import { Button, Card } from '@/components/ui'
import { RequireAuth } from '../../components/RequireAuth'
import { BookingStatusBadge } from '../../components/BookingStatusBadge'
import { useBookings, useMe, useUpdateBookingStatus } from '../../lib/auth'
import { ChatLink } from '../Mensajes'
import type { BookingAction, ProviderBooking } from '../../lib/api'

export function SolicitudesPage() {
  return (
    <RequireAuth>
      <SolicitudesContent />
    </RequireAuth>
  )
}

function SolicitudesContent() {
  const { t, i18n } = useTranslation()
  const me = useMe()
  const bookings = useBookings('provider')
  const move = useUpdateBookingStatus('provider')

  const list = (bookings.data ?? []) as ProviderBooking[]
  const pending = list.filter((b) => b.status === 'PENDING')
  const working = list.filter((b) => ['ACCEPTED', 'IN_PROGRESS'].includes(b.status))
  const history = list.filter((b) => ['REJECTED', 'COMPLETED', 'CANCELLED'].includes(b.status))

  const locale = i18n.language.startsWith('en') ? 'en-US' : 'es-SV'
  const fmtDate = (iso: string) =>
    new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso))

  if (!me.data?.roles.includes('PROVIDER')) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16 text-center">
        <p className="font-display text-lg font-semibold">{t('booking.providerOnlyTitle')}</p>
        <p className="mt-1 text-sm text-ink-soft">{t('booking.providerOnlyNote')}</p>
      </main>
    )
  }

  const NEXT_ACTION: Partial<Record<ProviderBooking['status'], { status: BookingAction; labelKey: string; testid: string }>> = {
    ACCEPTED: { status: 'IN_PROGRESS', labelKey: 'booking.startJob', testid: 'start' },
    IN_PROGRESS: { status: 'COMPLETED', labelKey: 'booking.completeJob', testid: 'complete' },
  }

  function Row({ b, actions }: { b: ProviderBooking; actions?: boolean }) {
    return (
      <li className="px-4 py-3.5" data-testid="request-item">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-clay">{b.code}</span>
          <BookingStatusBadge status={b.status} />
          <span className="ml-auto font-mono text-xs text-ink-soft">{fmtDate(b.scheduledAt)}</span>
        </div>
        <p className="mt-1.5 text-sm font-semibold">{b.service.title}</p>
        <p className="mt-0.5 truncate text-xs text-ink-soft">
          {b.clientName} · {b.address}
          {b.notes && ` · “${b.notes}”`}
        </p>
        {actions && (
          <div className="mt-2.5 flex flex-wrap gap-2">
            {b.status === 'PENDING' && (
              <>
                <Button
                  size="sm"
                  isLoading={move.isPending}
                  onClick={() => move.mutate({ id: b.id, status: 'ACCEPTED' })}
                  data-testid="accept-request"
                >
                  ✓ {t('booking.accept')}
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  isLoading={move.isPending}
                  onClick={() => move.mutate({ id: b.id, status: 'REJECTED' })}
                  data-testid="reject-request"
                >
                  ✕ {t('booking.reject')}
                </Button>
              </>
            )}
                {b.conversationId && (
              <ChatLink conversationId={b.conversationId} />
            )}
            {NEXT_ACTION[b.status] && (
              <Button
                size="sm"
                isLoading={move.isPending}
                onClick={() => move.mutate({ id: b.id, status: NEXT_ACTION[b.status]!.status })}
                data-testid={`${NEXT_ACTION[b.status]!.testid}-request`}
              >
                {t(NEXT_ACTION[b.status]!.labelKey)}
              </Button>
            )}
          </div>
        )}
      </li>
    )
  }

  return (
    <main className="mx-auto w-full max-w-3xl space-y-6 px-4 py-10 sm:py-14">
      <header>
        <h1 className="font-display text-xl font-semibold tracking-tight">{t('booking.requestsTitle')}</h1>
        <p className="mt-1 text-sm text-ink-soft">{t('booking.requestsSubtitle')}</p>
      </header>

      <section data-testid="requests-pending">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-soft">
          {t('booking.pendingSection')}
        </h2>
        {pending.length === 0 ? (
          <Card className="p-5"><p className="text-sm text-ink-soft">
            {t('booking.noPending')}
          </p></Card>
        ) : (
          <ul className="space-y-3">
            {pending.map((b) => (
              <Row key={b.id} b={b} actions />
            ))}
          </ul>
        )}
      </section>

      <section data-testid="requests-working">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-soft">
          {t('booking.workingSection')}
        </h2>
        {working.length === 0 ? (
          <Card className="p-5"><p className="text-sm text-ink-soft">
            {t('booking.noWorking')}
          </p></Card>
        ) : (
          <ul className="space-y-3">
            {working.map((b) => (
              <Row key={b.id} b={b} actions />
            ))}
          </ul>
        )}
      </section>

      {history.length > 0 && (
        <section data-testid="requests-history">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-soft">
            {t('booking.history')}
          </h2>
          <ul className="space-y-3 opacity-80">
            {history.map((b) => (
              <Row key={b.id} b={b} />
            ))}
          </ul>
        </section>
      )}
    </main>
  )
}
