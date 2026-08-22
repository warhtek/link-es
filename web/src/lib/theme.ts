export type ThemePreference = 'light' | 'dark' | 'system'
export type ResolvedTheme = 'light' | 'dark'

const STORAGE_KEY = 'link-es-theme'

export function getStoredTheme(): ThemePreference {
  const value = localStorage.getItem(STORAGE_KEY)
  if (value === 'light' || value === 'dark' || value === 'system') return value
  return 'system'
}

export function resolveTheme(pref: ThemePreference): ResolvedTheme {
  if (pref !== 'system') return pref
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function applyTheme(resolved: ResolvedTheme) {
  document.documentElement.setAttribute('data-theme', resolved)
}

export function setTheme(pref: ThemePreference) {
  localStorage.setItem(STORAGE_KEY, pref)
  applyTheme(resolveTheme(pref))
}

const media = window.matchMedia('(prefers-color-scheme: dark)')
media.addEventListener('change', () => {
  if (getStoredTheme() === 'system') applyTheme(resolveTheme('system'))
})

applyTheme(resolveTheme(getStoredTheme()))
