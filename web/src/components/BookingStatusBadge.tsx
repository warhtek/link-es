import { useTranslation } from 'react-i18next'
import type { BookingStatusValue } from '../lib/api'

const STYLE: Record<BookingStatusValue, string> = {
  PENDING: 'border-line bg-paper text-ink-soft',
  ACCEPTED: 'border-moss bg-moss-soft text-moss',
  REJECTED: 'border-clay/40 bg-clay/10 text-carbon',
  IN_PROGRESS: 'border-carbon/30 bg-transparent text-carbon',
  COMPLETED: 'border-moss/50 bg-transparent text-moss',
  CANCELLED: 'border-line bg-transparent text-ink-soft line-through',
}

export function BookingStatusBadge({ status }: { status: BookingStatusValue }) {
  const { t } = useTranslation()
  return (
    <span
      className={`shrink-0 rounded-control border px-2 py-0.5 font-mono text-[11px] uppercase tracking-wide ${STYLE[status]}`}
    >
      {t(`booking.status.${status}`)}
    </span>
  )
}
