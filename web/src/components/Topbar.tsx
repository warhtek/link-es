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

function LogoutIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
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
  const [menuOpen, setMenuOpen] = useState(false)
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

  // Cierra el menú al navegar
  useEffect(() => { setMenuOpen(false) }, [location.pathname])

  const currentLang = i18n.language.startsWith('en') ? 'en' : 'es'

  useEffect(() => {
    document.documentElement.lang = currentLang
  }, [currentLang])

  function changeLang(lang: string) {
    void i18n.changeLanguage(lang)
    // La elección manual se guarda también en el perfil cuando hay sesión.
    if (user && user.locale !== lang) updateProfile.mutate({ locale: lang as 'es' | 'en' })
  }

  const navLinks = [
    { to: '/buscar', label: t('nav.search'), show: true },
    { to: '/mensajes', label: t('nav.messages'), show: !!user },
    { to: '/reservas', label: t('nav.bookings'), show: !!user },
    { to: '/proveedor/solicitudes', label: t('nav.requests'), show: !!(user?.roles.includes('PROVIDER')) },
    { to: '/admin', label: t('nav.admin'), show: !!(user?.roles.includes('ADMIN')) },
  ]

  return (
    <>
      <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-line bg-panel px-5 py-3 max-sm:px-4">
        <div className="flex shrink-0 items-center gap-2.5">
        <Link to="/" className="flex items-center gap-2.5" aria-label="Link-ES">
          <div className="flex h-[30px] w-[30px] items-center justify-center rounded-lg bg-moss font-display text-[15px] font-bold text-panel">
            L
          </div>
          <b className="font-display text-base font-semibold tracking-tight">{t('brand')}</b>
        </Link>
      </div>

        {/* Nav escritorio (md+) */}
        <nav className="ml-4 hidden items-center gap-1 md:flex">
          {navLinks.filter((l) => l.show).map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium hover:bg-moss-soft/60 ${
                location.pathname.startsWith(l.to) ? 'bg-moss-soft text-moss' : ''
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>

      {/* En móvil los controles desbordan: se permiten scroll horizontal a ambos lados */}
      <div className="ml-auto flex shrink-0 items-center gap-2 max-sm:grow max-sm:shrink max-sm:min-w-0 max-sm:overflow-x-auto max-sm:[scrollbar-width:none] max-sm:[&::-webkit-scrollbar]:hidden">
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
            {/* Cerrar sesión: icono siempre visible, texto solo en sm+ */}
            <button
              type="button"
              onClick={() => {
                logout.mutate()
                navigate('/')
              }}
              title={t('auth.logout')}
              className="flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 font-mono text-[11px] font-semibold uppercase text-ink-soft hover:bg-moss-soft/60 hover:text-carbon"
            >
              <LogoutIcon />
              <span className="hidden sm:inline">{t('auth.logoutShort')}</span>
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
              className="rounded-lg bg-moss px-3 py-1.5 text-xs font-medium text-panel hover:opacity-90"
            >
              {t('auth.registerShort')}
            </Link>
          </div>
        )}

      </div>

      {/* Hamburguesa — solo en móvil (<md) */}
        <button
          type="button"
          aria-label={menuOpen ? t('nav.closeMenu') : t('nav.openMenu')}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((o) => !o)}
          className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-line bg-paper text-ink-soft hover:bg-moss-soft/60 md:hidden"
        >
          {menuOpen ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          )}
        </button>
    </header>

      {/* Menú desplegable móvil */}
      {menuOpen && (
        <nav
          className="sticky top-[53px] z-10 flex flex-col border-b border-line bg-panel px-4 py-2 md:hidden"
          aria-label={t('nav.mobileMenu')}
        >
          {navLinks.filter((l) => l.show).map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className={`rounded-lg px-3 py-2 text-sm font-medium hover:bg-moss-soft/60 ${
                location.pathname.startsWith(l.to) ? 'bg-moss-soft text-moss' : ''
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>
      )}
    </>
  )
}
