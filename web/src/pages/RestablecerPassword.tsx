import { useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { api } from '../lib/api'
import { authErrorMessage } from '../lib/errors'
import { inputClass } from './Login'

export function RestablecerPasswordPage() {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [changed, setChanged] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    if (password.length < 8) {
      setError(t('auth.errors.validation'))
      return
    }
    if (password !== confirm) {
      setError(t('auth.resetMismatch'))
      return
    }
    setPending(true)
    api
      .resetPassword({ token, password })
      .then(() => setChanged(true))
      .catch((cause: unknown) => setError(authErrorMessage(cause, t)))
      .finally(() => setPending(false))
  }

  if (!token) {
    return (
      <main className="mx-auto w-full max-w-md px-4 py-10 sm:py-14">
        <div className="rounded-card border border-line bg-panel p-6 sm:p-8">
          <p role="alert" className="text-sm text-ink-soft">
            {t('auth.resetMissingToken')}
          </p>
        </div>
        <p className="mt-4 text-center text-sm text-ink-soft">
          <Link to="/recuperar-password" className="font-medium text-moss hover:underline">
            {t('auth.backToForgot')}
          </Link>
        </p>
      </main>
    )
  }

  return (
    <main className="mx-auto w-full max-w-md px-4 py-10 sm:py-14">
      <div className="rounded-card border border-line bg-panel p-6 sm:p-8">
        <h1 className="font-display text-xl font-semibold tracking-tight">
          {t('auth.resetTitle')}
        </h1>
        <p className="mt-1 text-sm text-ink-soft">{t('auth.resetSubtitle')}</p>

        {changed ? (
          <div className="mt-6 space-y-4">
            <p
              role="status"
              className="rounded-control border border-moss/40 bg-moss/10 px-3 py-2 text-sm"
            >
              {t('auth.resetDone')}
            </p>
            <Link
              to="/login"
              className="block w-full rounded-control bg-moss px-4 py-2.5 text-center text-sm font-medium text-panel hover:opacity-90"
            >
              {t('auth.backToLogin')}
            </Link>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
            <label className="block space-y-1.5">
              <span className="text-sm font-medium">{t('auth.newPassword')}</span>
              <input
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className={inputClass}
              />
              <span className="text-xs text-ink-soft">{t('auth.passwordHint')}</span>
            </label>
            <label className="block space-y-1.5">
              <span className="text-sm font-medium">{t('auth.confirmPassword')}</span>
              <input
                type="password"
                required
                autoComplete="new-password"
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
                className={inputClass}
              />
            </label>

            {error && (
              <p
                role="alert"
                className="rounded-control border border-clay/40 bg-clay/10 px-3 py-2 text-sm text-carbon"
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={pending}
              className="w-full cursor-pointer rounded-control bg-moss px-4 py-2.5 text-sm font-medium text-panel hover:opacity-90 disabled:cursor-wait disabled:opacity-60"
            >
              {t('auth.resetSubmit')}
            </button>
          </form>
        )}
      </div>
    </main>
  )
}
