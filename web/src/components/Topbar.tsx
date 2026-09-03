import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  getStoredTheme,
  setTheme,
  type ResolvedTheme,
  type ThemePreference,
} from '../lib/theme'
import { getAccessToken } from '../lib/api'
import { useLogout, useMe, useUpdateProfile } from '../lib/auth'

function SunIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z" />
    </svg>
  )
}

function AutoIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor" stroke="none" />
    </svg>
  )
}

const THEME_OPTIONS = [
  { value: 'light', icon: SunIcon, labelKey: 'theme.light' },
  { value: 'dark', icon: MoonIcon, labelKey: 'theme.dark' },
  { value: 'system', icon: AutoIcon, labelKey: 'theme.system' },
] as const

export function Topbar() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const [pref, setPref] = useState<ThemePreference>(() => getStoredTheme())
  const [resolved, setResolved] = useState<ResolvedTheme>(() =>
    document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light',
  )
  const me = useMe()
  const logout = useLogout()
  const updateProfile = useUpdateProfile()
  const user = getAccessToken() ? me.data : undefined

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setResolved(
        document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light',
      )
    })
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => observer.disconnect()
  }, [])

  const currentLang = i18n.language.startsWith('en') ? 'en' : 'es'

  useEffect(() => {
    document.documentElement.lang = currentLang
  }, [currentLang])

  function changeLang(lang: string) {
    void i18n.changeLanguage(lang)
    // La elección manual se guarda también en el perfil cuando hay sesión.
    if (user && user.locale !== lang) updateProfile.mutate({ locale: lang as 'es' | 'en' })
  }

  return (
    <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-line bg-panel px-5 py-3 max-sm:px-4">
      <div className="flex shrink-0 items-center gap-2.5">
        <Link to="/" className="flex items-center gap-2.5" aria-label="Link-ES">
          <div className="flex h-[30px] w-[30px] items-center justify-center rounded-lg bg-moss font-display text-[15px] font-bold text-panel">
            L
          </div>
          <b className="font-display text-base font-semibold tracking-tight">{t('brand')}</b>
        </Link>
      </div>

      <nav className="ml-4 hidden items-center gap-1 md:flex">
        <Link
          to="/buscar"
          className={`rounded-lg px-3 py-1.5 text-sm font-medium hover:bg-moss-soft/60 ${
            location.pathname === '/buscar' ? 'bg-moss-soft text-moss' : ''
          }`}
        >
          {t('nav.search')}
        </Link>
        {user && (
          <Link
            to="/mensajes"
            className={`rounded-lg px-3 py-1.5 text-sm font-medium hover:bg-moss-soft/60 ${
              location.pathname.startsWith('/mensajes') ? 'bg-moss-soft text-moss' : ''
            }`}
          >
            {t('nav.messages')}
          </Link>
        )}
        {user && (
          <Link
            to="/reservas"
            className={`rounded-lg px-3 py-1.5 text-sm font-medium hover:bg-moss-soft/60 ${
              location.pathname === '/reservas' ? 'bg-moss-soft text-moss' : ''
            }`}
          >
            {t('nav.bookings')}
          </Link>
        )}
        {user?.roles.includes('PROVIDER') && (
          <Link
            to="/proveedor/solicitudes"
            className={`rounded-lg px-3 py-1.5 text-sm font-medium hover:bg-moss-soft/60 ${
              location.pathname === '/proveedor/solicitudes' ? 'bg-moss-soft text-moss' : ''
            }`}
          >
            {t('nav.requests')}
          </Link>
        )}
        {user?.roles.includes('ADMIN') && (
          <Link
            to="/admin"
            className={`rounded-lg px-3 py-1.5 text-sm font-medium hover:bg-moss-soft/60 ${
              location.pathname.startsWith('/admin') ? 'bg-moss-soft text-moss' : ''
            }`}
          >
            {t('nav.admin')}
          </Link>
        )}
      </nav>

      <div className="ml-auto flex shrink-0 items-center gap-2">
        <div
          className="flex gap-0.5 rounded-lg border border-line bg-paper p-0.5"
          role="group"
          aria-label={t('lang.toggle')}
        >
          {(['es', 'en'] as const).map((lang) => (
            <button
              key={lang}
              type="button"
              onClick={() => changeLang(lang)}
              className={`rounded-md px-2.5 py-1.5 font-mono text-[11.5px] font-semibold cursor-pointer ${
                currentLang === lang ? 'bg-moss-soft text-moss' : 'text-ink-soft'
              }`}
            >
              {lang.toUpperCase()}
            </button>
          ))}
        </div>

        <div
          className="flex gap-0.5 rounded-lg border border-line bg-paper p-0.5"
          role="group"
          aria-label={t('theme.toggle')}
        >
          {THEME_OPTIONS.map(({ value, icon: Icon, labelKey }) => (
            <button
              key={value}
              type="button"
              title={t(labelKey)}
              onClick={() => {
                setTheme(value)
                setPref(value)
              }}
              className={`flex h-[26px] w-[28px] cursor-pointer items-center justify-center rounded-md ${
                pref === value ? 'bg-moss-soft text-moss' : 'text-ink-soft'
              }`}
            >
              <Icon />
            </button>
          ))}
        </div>

        <span
          className="hidden font-mono text-[11px] uppercase tracking-wide text-ink-soft sm:inline"
          data-testid="resolved-theme"
        >
          {resolved}
        </span>

        {user ? (
          <div
            className="flex shrink-0 items-center gap-1 rounded-lg border border-line bg-paper p-0.5"
            data-testid="session-user"
          >
            <Link
              to="/perfil"
              title={t('nav.profile')}
              className="flex items-center gap-2 rounded-md px-2 py-1 hover:bg-moss-soft/60"
            >
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-moss font-display text-[10px] font-bold text-panel">
                {user.name.charAt(0).toUpperCase()}
              </span>
              <span className="hidden max-w-[120px] truncate text-xs font-medium sm:block">
                {user.name.split(' ')[0]}
              </span>
            </Link>
            <button
              type="button"
              onClick={() => {
                logout.mutate()
                navigate('/')
              }}
              title={t('auth.logout')}
              className="hidden cursor-pointer rounded-md px-2 py-1 font-mono text-[11px] font-semibold uppercase text-ink-soft hover:bg-moss-soft/60 hover:text-carbon sm:block"
            >
              {t('auth.logoutShort')}
            </button>
          </div>
        ) : (
          <div className="flex shrink-0 items-center gap-2">
            <Link
              to="/login"
              className="rounded-lg border border-line bg-paper px-3 py-1.5 text-xs font-medium hover:bg-moss-soft"
            >
              {t('auth.loginShort')}
            </Link>
            <Link
              to="/registro"
              className="hidden rounded-lg bg-moss px-3 py-1.5 text-xs font-medium text-panel hover:opacity-90 sm:block"
            >
              {t('auth.registerShort')}
            </Link>
          </div>
        )}
      </div>
    </header>
  )
}
