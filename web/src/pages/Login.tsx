import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useLogin } from '../lib/auth'
import { authErrorMessage } from '../lib/errors'

export function LoginPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const login = useLogin()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    login.mutate(
      { email, password },
      { onSuccess: () => navigate('/perfil') },
    )
  }

  return (
    <main className="mx-auto w-full max-w-md px-4 py-10 sm:py-14">
      <div className="rounded-card border border-line bg-panel p-6 sm:p-8">
        <h1 className="font-display text-xl font-semibold tracking-tight">
          {t('auth.loginTitle')}
        </h1>
        <p className="mt-1 text-sm text-ink-soft">{t('auth.loginSubtitle')}</p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
          <Field label={t('auth.email')}>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className={inputClass}
              placeholder={t('auth.emailPlaceholder')}
            />
          </Field>
          <Field label={t('auth.password')}>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className={inputClass}
            />
          </Field>

          {login.isError && (
            <p role="alert" className="rounded-control border border-clay/40 bg-clay/10 px-3 py-2 text-sm text-carbon">
              {authErrorMessage(login.error, t)}
            </p>
          )}

          <button
            type="submit"
            disabled={login.isPending}
            className="w-full cursor-pointer rounded-control bg-moss px-4 py-2.5 text-sm font-medium text-panel hover:opacity-90 disabled:cursor-wait disabled:opacity-60"
          >
            {t('auth.loginSubmit')}
          </button>
        </form>

        <p className="mt-3 text-center text-sm">
          <Link to="/recuperar-password" className="font-medium text-moss hover:underline">
            {t('auth.forgotLink')}
          </Link>
        </p>
      </div>

      <p className="mt-4 text-center text-sm text-ink-soft">
        {t('auth.noAccount')}{' '}
        <Link to="/registro" className="font-medium text-moss hover:underline">
          {t('auth.goRegister')}
        </Link>
      </p>
    </main>
  )
}

export const inputClass =
  'w-full rounded-control border border-line bg-paper px-3 py-2 text-sm outline-none placeholder:text-ink-soft focus:border-moss'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium">{label}</span>
      {children}
    </label>
  )
}
