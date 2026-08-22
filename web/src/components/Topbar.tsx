import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  getStoredTheme,
  setTheme,
  type ResolvedTheme,
  type ThemePreference,
} from '../lib/theme'

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
  const [pref, setPref] = useState<ThemePreference>(() => getStoredTheme())
  const [resolved, setResolved] = useState<ResolvedTheme>(() =>
    document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light',
  )

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
  }

  return (
    <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-line bg-panel px-5 py-3 max-sm:px-4">
      <div className="flex shrink-0 items-center gap-2.5">
        <div className="flex h-[30px] w-[30px] items-center justify-center rounded-lg bg-moss font-display text-[15px] font-bold text-panel">
          L
        </div>
        <b className="font-display text-base font-semibold tracking-tight">{t('brand')}</b>
      </div>

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
          className="font-mono text-[11px] uppercase tracking-wide text-ink-soft"
          data-testid="resolved-theme"
        >
          {resolved}
        </span>
      </div>
    </header>
  )
}
