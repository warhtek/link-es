import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { api } from '../lib/api'
import { authErrorMessage } from '../lib/errors'
import { inputClass } from './Login'

export function RecuperarPasswordPage() {
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    setPending(true)
    setError(null)
    // Respuesta genérica del backend: mostramos el mismo mensaje exista o no el correo.
    api
      .forgotPassword(email)
      .then(() => setSent(true))
      .catch((cause: unknown) => setError(authErrorMessage(cause, t)))
      .finally(() => setPending(false))
  }

  return (
    <main className="mx-auto w-full max-w-md px-4 py-10 sm:py-14">
      <div className="rounded-card border border-line bg-panel p-6 sm:p-8">
        <h1 className="font-display text-xl font-semibold tracking-tight">
          {t('auth.forgotTitle')}
        </h1>
        <p className="mt-1 text-sm text-ink-soft">{t('auth.forgotSubtitle')}</p>

        {sent ? (
          <p
            role="status"
            className="mt-6 rounded-control border border-moss/40 bg-moss/10 px-3 py-2 text-sm"
          >
            {t('auth.forgotSent')}
          </p>
        ) : (
          <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
            <label className="block space-y-1.5">
              <span className="text-sm font-medium">{t('auth.email')}</span>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className={inputClass}
                placeholder={t('auth.emailPlaceholder')}
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
              {t('auth.forgotSubmit')}
            </button>
          </form>
        )}
      </div>

      <p className="mt-4 text-center text-sm text-ink-soft">
        <Link to="/login" className="font-medium text-moss hover:underline">
          {t('auth.backToLogin')}
        </Link>
      </p>
    </main>
  )
}
