import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

const COLOR_TOKENS = [
  { name: 'carbon', light: '#0F172A', dark: '#F8FAFC' },
  { name: 'paper', light: '#F8FAFC', dark: '#0B0F17' },
  { name: 'panel', light: '#FFFFFF', dark: '#151E2E' },
  { name: 'moss', light: '#1D4ED8', dark: '#60A5FA' },
  { name: 'moss-soft', light: '#EFF6FF', dark: '#172554' },
  { name: 'clay', light: '#B5502E', dark: '#E08A63' },
  { name: 'line', light: '#E2E8F0', dark: '#283548' },
  { name: 'ink-soft', light: '#64748B', dark: '#94A3B8' },
] as const

function CheckTag({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1 font-medium text-moss">
      <svg viewBox="0 0 24 24" className="h-[11px] w-[11px]" fill="none" stroke="currentColor" strokeWidth="3">
        <path d="M20 6L9 17l-5-5" />
      </svg>
      {label}
    </span>
  )
}

function ProximityRingDemo() {
  return (
    <svg viewBox="0 0 420 220" className="h-auto w-full max-w-md">
      <g transform="translate(110,110)">
        <circle r="52" fill="none" stroke="var(--line)" strokeWidth="1" />
        <circle r="88" fill="none" stroke="var(--line)" strokeWidth="1" opacity="0.6" />
        <circle r="26" fill="none" stroke="var(--moss)" strokeWidth="1.4" opacity="0.7">
          <animate attributeName="r" values="16;58;16" dur="3.4s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.7;0;0.7" dur="3.4s" repeatCount="indefinite" />
        </circle>
        <circle r="7" fill="var(--moss)" stroke="var(--panel)" strokeWidth="2" />
      </g>
      <g>
        <path
          d="M118 104 L 268 62"
          stroke="var(--clay)"
          strokeWidth="1.2"
          strokeDasharray="3 4"
          fill="none"
        />
        <circle cx="272" cy="61" r="6" fill="var(--clay)" stroke="var(--panel)" strokeWidth="2" />
        <rect x="282" y="52" width="52" height="18" rx="4" fill="var(--panel)" stroke="var(--line)" />
        <text
          x="308"
          y="64.5"
          textAnchor="middle"
          fontFamily="'IBM Plex Mono', monospace"
          fontSize="10.5"
          fill="var(--carbon)"
        >
          0.8 km
        </text>
      </g>
      <g>
        <path
          d="M116 120 L 250 168"
          stroke="var(--ink-soft)"
          strokeWidth="1.2"
          strokeDasharray="3 4"
          fill="none"
        />
        <circle cx="254" cy="169" r="6" fill="var(--ink-soft)" stroke="var(--panel)" strokeWidth="2" />
        <rect x="264" y="160" width="52" height="18" rx="4" fill="var(--panel)" stroke="var(--line)" />
        <text
          x="290"
          y="172.5"
          textAnchor="middle"
          fontFamily="'IBM Plex Mono', monospace"
          fontSize="10.5"
          fill="var(--carbon)"
        >
          2.1 km
        </text>
      </g>
    </svg>
  )
}

function Section({
  title,
  hint,
  children,
}: {
  title: string
  hint?: string
  children: ReactNode
}) {
  return (
    <section className="rounded-card border border-line bg-panel p-5 sm:p-6">
      <h2 className="font-display text-lg font-semibold">{title}</h2>
      {hint ? <p className="mt-1 text-sm text-ink-soft">{hint}</p> : null}
      <div className="mt-4">{children}</div>
    </section>
  )
}

export function DesignSystemPage() {
  const { t } = useTranslation()
  const [chipActive, setChipActive] = useState<'near' | 'rated'>('near')

  return (
    <main className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8 sm:px-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
          {t('ds.title')}
        </h1>
        <p className="mt-2 max-w-prose text-sm leading-relaxed text-ink-soft">{t('ds.subtitle')}</p>
      </div>

      <Section title={t('ds.colorsTitle')} hint={t('ds.colorsHint')}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {COLOR_TOKENS.map((token) => (
            <div key={token.name} className="overflow-hidden rounded-control border border-line">
              <div
                className="h-14 border-b border-line"
                style={{ background: `var(--${token.name})` }}
              />
              <div className="px-3 py-2">
                <b className="block font-mono text-xs">{token.name}</b>
                <span className="mt-0.5 block font-mono text-[10px] leading-tight text-ink-soft">
                  {token.light} / {token.dark}
                </span>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title={t('ds.typographyTitle')}>
        <div className="space-y-5">
          <div>
            <span className="font-mono text-[11px] uppercase tracking-wide text-clay">
              {t('ds.displayLabel')}
            </span>
            <p className="font-display text-xl font-semibold">Encuentra a alguien de confianza cerca de ti</p>
            <p className="font-display text-sm font-semibold text-ink-soft">Find someone you trust nearby</p>
          </div>
          <div>
            <span className="font-mono text-[11px] uppercase tracking-wide text-clay">{t('ds.uiLabel')}</span>
            <p className="text-sm leading-relaxed">
              Inter se usa para listados, formularios y chat. Es la voz cotidiana del producto.
            </p>
          </div>
          <div>
            <span className="font-mono text-[11px] uppercase tracking-wide text-clay">{t('ds.dataLabel')}</span>
            <p className="font-mono text-sm">0.8 km · $15/h · #RES-2026-0481</p>
          </div>
        </div>
      </Section>

      <Section title={t('ds.componentsTitle')}>
        <div className="space-y-6">
          <div>
            <h3 className="mb-2 text-sm font-semibold">{t('ds.buttonsTitle')}</h3>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                className="rounded-control bg-moss px-4 py-2 text-sm font-medium text-panel cursor-pointer hover:opacity-90"
              >
                {t('ds.requestBtn')}
              </button>
              <button
                type="button"
                className="rounded-control border border-line bg-paper px-4 py-2 text-sm font-medium text-carbon cursor-pointer hover:bg-moss-soft"
              >
                {t('ds.secondary')}
              </button>
            </div>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-semibold">{t('ds.inputsTitle')}</h3>
            <input
              type="text"
              placeholder={t('ds.searchPlaceholder')}
              className="w-full max-w-sm rounded-control border border-line bg-paper px-3 py-2 text-sm outline-none placeholder:text-ink-soft focus:border-moss"
            />
          </div>

          <div>
            <h3 className="mb-2 text-sm font-semibold">{t('ds.chipsTitle')}</h3>
            <div className="flex flex-wrap gap-2">
              <span className="flex items-center gap-1.5 rounded-full border border-moss bg-moss-soft px-3 py-1.5 text-xs font-medium text-moss">
                <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
                </svg>
                {t('ds.chipRadius')}
              </span>
              <span className="rounded-full border border-line px-3 py-1.5 text-xs font-medium text-ink-soft">
                {t('ds.chipCategory')}
              </span>
              <span className="inline-flex overflow-hidden rounded-full border border-line text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setChipActive('near')}
                  className={`px-3 py-1.5 cursor-pointer ${
                    chipActive === 'near' ? 'bg-moss-soft text-moss' : 'bg-paper text-ink-soft'
                  }`}
                >
                  Más cercanos / Nearest
                </button>
                <button
                  type="button"
                  onClick={() => setChipActive('rated')}
                  className={`border-l border-line px-3 py-1.5 cursor-pointer ${
                    chipActive === 'rated' ? 'bg-moss-soft text-moss' : 'bg-paper text-ink-soft'
                  }`}
                >
                  ★ 5.0
                </button>
              </span>
            </div>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-semibold">{t('ds.cardTitle')}</h3>
            <div className="max-w-sm rounded-card border border-line bg-panel">
              <div className="flex items-center gap-3 border-b border-line px-4 py-3.5">
                <div className="flex h-13 w-13 shrink-0 items-center justify-center rounded-[10px] bg-moss-soft font-semibold text-moss">
                  CT
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <b className="truncate text-sm font-semibold">CreaTIAES</b>
                    <span className="shrink-0 font-mono text-xs text-clay">0.8 km</span>
                  </div>
                  <div className="mt-0.5 text-xs text-ink-soft">Desarrollo y tecnología</div>
                </div>
              </div>
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-sm font-semibold">4.9 ★</span>
                <CheckTag label={t('ds.verified')} />
              </div>
            </div>
            <div className="mt-2 max-w-sm rounded-card border border-line bg-panel px-4 py-3">
              <div className="flex items-center justify-between">
                <b className="text-sm font-semibold">Roberto Rodríguez</b>
                <span className="font-mono text-xs text-clay">2.1 km</span>
              </div>
              <div className="mt-1 flex items-center justify-between text-xs">
                <span className="text-ink-soft">—</span>
                <span className="text-ink-soft">{t('ds.pendingVerif')}</span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="mb-1 text-sm font-semibold">{t('ds.signatureTitle')}</h3>
            <p className="mb-3 text-sm text-ink-soft">{t('ds.signatureDesc')}</p>
            <div className="rounded-control border border-line bg-paper p-4">
              <ProximityRingDemo />
            </div>
          </div>
        </div>
      </Section>
    </main>
  )
}
