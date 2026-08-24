import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useRegister } from '../lib/auth'
import { authErrorMessage } from '../lib/errors'

export function RegistroPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const register = useRegister()

  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' })

  function setField(field: keyof typeof form) {
    return (event: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [field]: event.target.value }))
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    register.mutate(
      { ...form, phone: form.phone || undefined },
      { onSuccess: () => navigate('/perfil') },
    )
  }

  return (
    <main className="mx-auto w-full max-w-md px-4 py-10 sm:py-14">
      <div className="rounded-card border border-line bg-panel p-6 sm:p-8">
        <h1 className="font-display text-xl font-semibold tracking-tight">
          {t('auth.registerTitle')}
        </h1>
        <p className="mt-1 text-sm text-ink-soft">{t('auth.registerSubtitle')}</p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
          <Field label={t('auth.name')}>
            <input
              type="text"
              required
              autoComplete="name"
              minLength={2}
              value={form.name}
              onChange={setField('name')}
              className={inputClass}
            />
          </Field>
          <Field label={t('auth.email')}>
            <input
              type="email"
              required
              autoComplete="email"
              value={form.email}
              onChange={setField('email')}
              className={inputClass}
              placeholder={t('auth.emailPlaceholder')}
            />
          </Field>
          <Field label={`${t('auth.phone')} (${t('common.optional')})`}>
            <input
              type="tel"
              autoComplete="tel"
              value={form.phone}
              onChange={setField('phone')}
              className={inputClass}
              placeholder="+503 7000 0000"
            />
          </Field>
          <Field
            label={t('auth.password')}
            hint={t('auth.passwordHint')}
          >
            <input
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={form.password}
              onChange={setField('password')}
              className={inputClass}
            />
          </Field>

          {register.isError && (
            <p role="alert" className="rounded-control border border-clay/40 bg-clay/10 px-3 py-2 text-sm text-carbon">
              {authErrorMessage(register.error, t)}
            </p>
          )}

          <button
            type="submit"
            disabled={register.isPending}
            className="w-full cursor-pointer rounded-control bg-moss px-4 py-2.5 text-sm font-medium text-panel hover:opacity-90 disabled:cursor-wait disabled:opacity-60"
          >
            {t('auth.registerSubmit')}
          </button>
        </form>
      </div>

      <p className="mt-4 text-center text-sm text-ink-soft">
        {t('auth.hasAccount')}{' '}
        <Link to="/login" className="font-medium text-moss hover:underline">
          {t('auth.goLogin')}
        </Link>
      </p>
    </main>
  )
}

const inputClass =
  'w-full rounded-control border border-line bg-paper px-3 py-2 text-sm outline-none placeholder:text-ink-soft focus:border-moss'

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium">{label}</span>
      {children}
      {hint && <span className="block text-xs text-ink-soft">{hint}</span>}
    </label>
  )
}
