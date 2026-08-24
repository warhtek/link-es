import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { RequireAuth } from '../components/RequireAuth'
import { inputClass } from './Login'
import { useLogout, useMe, useSwitchMode, useUpdateProfile } from '../lib/auth'
import type { PublicUser } from '../lib/auth'

export function PerfilPage() {
  return (
    <RequireAuth>
      <PerfilContent />
    </RequireAuth>
  )
}

function PerfilContent() {
  const { t } = useTranslation()
  const me = useMe()
  const logout = useLogout()
  const switchMode = useSwitchMode()

  if (!me.data) return null
  const user = me.data

  return (
    <main className="mx-auto w-full max-w-2xl space-y-6 px-4 py-10 sm:py-14">
      {/* Cabecera de cuenta */}
      <section className="rounded-card border border-line bg-panel p-5 sm:p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-moss font-display text-lg font-semibold text-panel">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <h1 className="truncate font-display text-lg font-semibold tracking-tight">
              {user.name}
            </h1>
            <p className="truncate text-sm text-ink-soft">{user.email}</p>
          </div>
          <button
            type="button"
            onClick={() => logout.mutate()}
            className="ml-auto shrink-0 cursor-pointer rounded-control border border-line bg-paper px-3 py-1.5 text-sm font-medium text-carbon hover:bg-moss-soft"
          >
            {t('auth.logout')}
          </button>
        </div>

        <dl className="mt-5 grid grid-cols-2 gap-3 border-t border-line pt-4 font-mono text-xs sm:grid-cols-4">
          <div>
            <dt className="uppercase tracking-wide text-ink-soft">{t('auth.roles')}</dt>
            <dd className="mt-1">{t(user.roles.includes('PROVIDER') ? 'auth.roleBoth' : 'auth.roleClient')}</dd>
          </div>
          <div>
            <dt className="uppercase tracking-wide text-ink-soft">{t('profile.since')}</dt>
            <dd className="mt-1">—</dd>
          </div>
        </dl>
      </section>

      {/* Cambio de modo */}
      <ModeSwitcher
        activeMode={user.activeMode}
        isProvider={user.roles.includes('PROVIDER')}
        onSwitch={(mode) => switchMode.mutate(mode)}
        pending={switchMode.isPending}
      />

      <EditProfileForm user={user} />
    </main>
  )
}

function ModeSwitcher({
  activeMode,
  isProvider,
  onSwitch,
  pending,
}: {
  activeMode: PublicUser['activeMode']
  isProvider: boolean
  onSwitch: (mode: 'CLIENT' | 'PROVIDER') => void
  pending: boolean
}) {
  const { t } = useTranslation()
  const modes = [
    { value: 'CLIENT' as const, label: t('mode.client'), desc: t('mode.clientDesc') },
    ...(isProvider
      ? [{ value: 'PROVIDER' as const, label: t('mode.provider'), desc: t('mode.providerDesc') }]
      : []),
  ]

  return (
    <section className="rounded-card border border-line bg-panel p-5 sm:p-6">
      <h2 className="font-display text-base font-semibold tracking-tight">
        {t('mode.title')}
      </h2>
      <p className="mt-1 text-sm text-ink-soft">{t('mode.subtitle')}</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label={t('mode.title')}>
        {modes.map(({ value, label, desc }) => {
          const selected = activeMode === value
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={pending || selected}
              onClick={() => onSwitch(value)}
              className={`cursor-pointer rounded-control border px-4 py-3 text-left transition-colors disabled:cursor-default ${
                selected
                  ? 'border-moss bg-moss-soft'
                  : 'border-line bg-paper hover:bg-moss-soft/50'
              }`}
            >
              <span className={`block text-sm font-semibold ${selected ? 'text-moss' : ''}`}>
                {label}
              </span>
              <span className="mt-0.5 block text-xs text-ink-soft">{desc}</span>
            </button>
          )
        })}
      </div>
      {!isProvider && (
        <p className="mt-3 rounded-control border border-line bg-paper px-3 py-2 text-xs text-ink-soft">
          {t('mode.becomeProviderHint')}
        </p>
      )}
    </section>
  )
}

const EDITABLE_FIELDS = [
  ['name', 'auth.name', false],
  ['phone', 'auth.phone', true],
  ['address', 'profile.address', true],
  ['postalCode', 'profile.postalCode', true],
  ['city', 'profile.city', true],
] as const

function EditProfileForm({ user }: { user: PublicUser }) {
  const { t } = useTranslation()
  const updateProfile = useUpdateProfile()

  const [form, setForm] = useState({
    name: user.name,
    phone: user.phone ?? '',
    address: user.address ?? '',
    postalCode: user.postalCode ?? '',
    city: user.city ?? '',
  })

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    updateProfile.mutate(form)
  }

  return (
    <section className="rounded-card border border-line bg-panel p-5 sm:p-6">
      <h2 className="font-display text-base font-semibold tracking-tight">
        {t('profile.editTitle')}
      </h2>

      <form onSubmit={onSubmit} className="mt-4 grid gap-4 sm:grid-cols-2" noValidate>
        {EDITABLE_FIELDS.map(([field, labelKey, optional]) => (
          <label key={field} className="block space-y-1.5">
            <span className="text-sm font-medium">
              {t(labelKey)}
              {optional && <span className="ml-1 text-xs text-ink-soft">({t('common.optional')})</span>}
            </span>
            <input
              type={field === 'phone' ? 'tel' : 'text'}
              required={!optional && field === 'name'}
              value={form[field]}
              onChange={(event) => setForm((prev) => ({ ...prev, [field]: event.target.value }))}
              className={inputClass}
            />
          </label>
        ))}

        <div className="flex items-center gap-3 sm:col-span-2">
          <button
            type="submit"
            disabled={updateProfile.isPending}
            className="cursor-pointer rounded-control bg-moss px-4 py-2 text-sm font-medium text-panel hover:opacity-90 disabled:cursor-wait disabled:opacity-60"
          >
            {t('common.save')}
          </button>
          {updateProfile.isSuccess && !updateProfile.isPending && (
            <span className="font-mono text-xs uppercase tracking-wide text-moss">
              {t('common.saved')}
            </span>
          )}
          {updateProfile.isError && (
            <span role="alert" className="text-sm text-clay">
              {t('errors.generic')}
            </span>
          )}
        </div>
      </form>
    </section>
  )
}
