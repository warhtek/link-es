import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { getAccessToken } from '../lib/api'
import { useMe } from '../lib/auth'

export function RequireAuth({ children }: { children: ReactNode }) {
  const location = useLocation()
  const me = useMe()

  if (!getAccessToken()) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }
  if (me.isPending) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <span className="font-mono text-xs uppercase tracking-wide text-ink-soft">
          …
        </span>
      </div>
    )
  }
  if (!me.data) {
    return <Navigate to="/login" replace />
  }
  return children
}
