import { useState, type FormEvent, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { RequireAuth } from '../components/RequireAuth'
import { inputClass } from './Login'
import { useLogout, useMe, useProviderMe, useSwitchMode, useUpdateProfile, useUploadDocument, useUpdateProviderProfile, useCategories } from '../lib/auth'
import type { PublicUser } from '../lib/auth'
import type { CategoryNode } from '../lib/api'

const DOC_FIELDS = [
  { type: 'ID', labelKey: 'provider.docId', required: true },
  { type: 'LICENSE', labelKey: 'provider.docLicense', required: false },
  { type: 'CERTIFICATION', labelKey: 'provider.docCertification', required: false },
] as const

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

      {user.roles.includes('PROVIDER') && <ProviderCard />}
      {user.roles.includes('PROVIDER') && <ProviderProfileEdit />}
      <EditProfileForm user={user} />
    </main>
  )
}

const VERIFICATION_STYLE: Record<string, string> = {
  VERIFIED: 'border-moss bg-moss-soft text-moss',
  PENDING: 'border-clay/40 bg-clay/10 text-carbon',
  NONE: 'border-line bg-paper text-ink-soft',
}

function ProviderCard() {
  const { t } = useTranslation()
  const provider = useProviderMe()

  if (provider.isLoading) {
    return (
      <section className="rounded-card border border-line bg-panel p-5 sm:p-6">
        <p className="font-mono text-xs uppercase tracking-wide text-ink-soft">…</p>
      </section>
    )
  }
  if (!provider.data) return null
  const { verificationStatus, documents, categories, businessName, serviceRadiusKm } = provider.data

  return (
    <section className="rounded-card border border-line bg-panel p-5 sm:p-6">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="font-display text-base font-semibold tracking-tight">{businessName}</h2>
        <span
          className={`rounded-control border px-2 py-0.5 font-mono text-[11px] uppercase tracking-wide ${VERIFICATION_STYLE[verificationStatus]}`}
        >
          {t(`provider.status.${verificationStatus}`)}
        </span>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-line pt-4 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-xs uppercase tracking-wide text-ink-soft">{t('provider.categories')}</dt>
          <dd className="mt-1 truncate">{categories.map((c) => c.name).join(', ') || '—'}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-ink-soft">{t('provider.radius')}</dt>
          <dd className="mt-1 font-mono">{serviceRadiusKm} km</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-ink-soft">{t('provider.documents')}</dt>
          <dd className="mt-1 font-mono">
            {documents.length} ·{' '}
            {documents.filter((d) => d.status === 'PENDING').length > 0
              ? t('provider.docsPending')
              : t('provider.docsReviewed')}
          </dd>
        </div>
      </dl>
    </section>
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
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-control border border-line bg-paper px-3 py-2.5">
          <p className="text-xs text-ink-soft">{t('mode.becomeProviderHint')}</p>
          <Link
            to="/proveedor/onboarding"
            className="shrink-0 cursor-pointer rounded-control bg-moss px-3 py-1.5 text-xs font-medium text-panel hover:opacity-90"
          >
            {t('mode.becomeProviderCta')}
          </Link>
        </div>
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

// Proveedor: formulario para editar perfil profesional (categorías, radio, documentos, ubicación)
function ProviderProfileEdit() {
  const { t } = useTranslation()
  const provider = useProviderMe()
  const categories = useCategories()
  const updateProvider = useUpdateProviderProfile()
  const uploadDocument = useUploadDocument()

  const { businessName, headline, bio, categories: providerCategories, serviceRadiusKm, city, lat, lng, documents } = provider.data ?? {
    businessName: '',
    headline: null,
    bio: null,
    categories: [],
    serviceRadiusKm: 5,
    city: null,
    lat: null,
    lng: null,
    documents: [],
  }

  const [form, setForm] = useState({
    businessName,
    headline: headline ?? '',
    bio: bio ?? '',
    serviceRadiusKm,
    city: city ?? '',
    lat: lat ?? '',
    lng: lng ?? '',
  })
  const [selectedCategoryIds, setSelectedCategoryIds] = useState(providerCategories.map((c) => c.id))
  const [files, setFiles] = useState<Partial<Record<'ID' | 'LICENSE' | 'CERTIFICATION', File>>>({})
  const [gettingLocation, setGettingLocation] = useState(false)

  if (provider.isLoading || !provider.data) return null

  function getCurrentLocation() {
    if (!navigator.geolocation) {
      alert(t('profile.geolocationNotSupported'))
      return
    }
    setGettingLocation(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((prev) => ({
          ...prev,
          lat: pos.coords.latitude.toFixed(6),
          lng: pos.coords.longitude.toFixed(6),
        }))
        setGettingLocation(false)
      },
      (err) => {
        setGettingLocation(false)
        if (err.code === err.PERMISSION_DENIED) {
          alert(t('profile.geolocationDenied'))
        } else {
          alert(t('profile.geolocationError'))
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    )
  }

  function toggleCategory(id: string) {
    setSelectedCategoryIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : prev.length < 5 ? [...prev, id] : prev,
    )
  }

  function setFile(type: 'ID' | 'LICENSE' | 'CERTIFICATION', file: File | null) {
    setFiles((prev) => ({ ...prev, [type]: file ?? undefined }))
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    try {
      await updateProvider.mutateAsync({
        businessName: form.businessName,
        headline: form.headline || undefined,
        bio: form.bio || undefined,
        categoryIds: selectedCategoryIds,
        serviceRadiusKm: form.serviceRadiusKm,
        city: form.city || undefined,
        lat: form.lat ? Number(form.lat) : null,
        lng: form.lng ? Number(form.lng) : null,
      })
    } catch {
      return
    }
    for (const [type, file] of Object.entries(files)) {
      if (file) {
        await uploadDocument.mutateAsync({ file, type })
      }
    }
  }

  const submitting = updateProvider.isPending || uploadDocument.isPending

  return (
    <section className="rounded-card border border-line bg-panel p-5 sm:p-6">
      <h2 className="font-display text-base font-semibold tracking-tight">
        {t('provider.businessTitle')}
      </h2>

      <form onSubmit={onSubmit} className="mt-4 space-y-6" noValidate>
        <Section title={t('provider.businessTitle')}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t('provider.businessName')} full>
              <input
                type="text"
                required
                minLength={2}
                value={form.businessName}
                onChange={(e) => setForm({ ...form, businessName: e.target.value })}
                className={inputClass}
              />
            </Field>
            <Field label={`${t('provider.headline')} (${t('common.optional')})`} full>
              <input
                type="text"
                maxLength={120}
                placeholder={t('provider.headlinePlaceholder')}
                value={form.headline}
                onChange={(e) => setForm({ ...form, headline: e.target.value })}
                className={inputClass}
              />
            </Field>
            <Field label={`${t('provider.bio')} (${t('common.optional')})`} full>
              <textarea
                rows={3}
                maxLength={2000}
                value={form.bio}
                onChange={(e) => setForm({ ...form, bio: e.target.value })}
                className={`${inputClass} resize-none`}
              />
            </Field>
          </div>
        </Section>

        <Section title={t('provider.categoriesTitle')} hint={t('provider.categoriesHint')}>
          {categories.isLoading ? (
            <p className="font-mono text-xs uppercase tracking-wide text-ink-soft">…</p>
          ) : (
            <div className="space-y-4">
              {categories.data?.map((root: CategoryNode) => (
                <div key={root.id}>
                  <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
                    {root.name}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(root.children.length ? root.children : [root]).map((cat: { id: string; name: string }) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => toggleCategory(cat.id)}
                        aria-pressed={selectedCategoryIds.includes(cat.id)}
                        className={`cursor-pointer rounded-control border px-3 py-1.5 text-sm ${
                          selectedCategoryIds.includes(cat.id)
                            ? 'border-moss bg-moss-soft font-medium text-moss'
                            : 'border-line bg-paper hover:bg-moss-soft/50'
                        }`}
                      >
                        {cat.name}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>

        <Section title={t('provider.areaTitle')}>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label={t('profile.city')}>
              <input
                type="text"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                className={inputClass}
              />
            </Field>
            <Field label={t('provider.radius')}>
              <select
                value={form.serviceRadiusKm}
                onChange={(e) => setForm({ ...form, serviceRadiusKm: Number(e.target.value) })}
                className={inputClass}
              >
                {[1, 5, 10, 15, 20, 30, 50].map((km) => (
                  <option key={km} value={km}>
                    {km} km
                  </option>
                ))}
              </select>
            </Field>
            <Field label={`${t('profile.lat')} (${t('common.optional')})`}>
              <div className="flex gap-2">
                <input
                  type="number"
                  step="any"
                  placeholder="Latitud"
                  value={form.lat}
                  onChange={(e) => setForm({ ...form, lat: e.target.value })}
                  className={inputClass}
                />
                <button
                  type="button"
                  onClick={getCurrentLocation}
                  disabled={gettingLocation}
                  className="cursor-pointer rounded-control border border-line bg-paper px-3 py-2 text-sm font-medium hover:bg-moss-soft disabled:opacity-50 disabled:cursor-not-allowed"
                  title={t('profile.useCurrentLocation')}
                >
                  {gettingLocation ? '📍' : '📍'}
                </button>
              </div>
            </Field>
            <Field label={`${t('profile.lng')} (${t('common.optional')})`}>
              <input
                type="number"
                step="any"
                placeholder="Longitud"
                value={form.lng}
                onChange={(e) => setForm({ ...form, lng: e.target.value })}
                className={inputClass}
              />
            </Field>
          </div>
          <p className="mt-2 text-xs text-ink-soft">{t('provider.areaMapHint')}</p>
        </Section>

        <Section title={t('provider.documentsTitle')} hint={t('provider.documentsHint')}>
          <div className="space-y-3">
            {DOC_FIELDS.map(({ type, labelKey, required }) => (
              <FileField
                key={type}
                label={
                  <>
                    {t(labelKey)}
                    {required ? '' : ` (${t('common.optional')})`}
                  </>
                }
                file={files[type]}
                existingDocument={documents.find((d) => d.type === type)}
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                onChange={(file) => setFile(type, file)}
              />
            ))}
          </div>
        </Section>

        {updateProvider.isError && (
          <p role="alert" className="rounded-control border border-clay/40 bg-clay/10 px-3 py-2 text-sm">
            {t('errors.generic')}
          </p>
        )}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={submitting || selectedCategoryIds.length === 0}
            className="cursor-pointer rounded-control bg-moss px-4 py-2.5 text-sm font-medium text-panel hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            {submitting ? t('provider.submitting') : t('common.save')}
          </button>
          {updateProvider.isSuccess && !updateProvider.isPending && (
            <span className="font-mono text-xs uppercase tracking-wide text-moss">
              {t('common.saved')}
            </span>
          )}
        </div>
      </form>
    </section>
  )
}

// Componentes de UI reutilizables
function Section({
  title,
  hint,
  children,
}: {
  title: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-card border border-line bg-panel p-5 sm:p-6">
      <h2 className="font-display text-base font-semibold tracking-tight">{title}</h2>
      {hint && <p className="mt-1 text-xs text-ink-soft">{hint}</p>}
      <div className="mt-4">{children}</div>
    </section>
  )
}

function Field({
  label,
  full,
  children,
}: {
  label: string
  full?: boolean
  children: React.ReactNode
}) {
  return (
    <label className={`block space-y-1.5 ${full ? 'sm:col-span-2' : ''}`}>
      <span className="text-sm font-medium">{label}</span>
      {children}
    </label>
  )
}

function FileField({
  label,
  file,
  existingDocument,
  accept,
  onChange,
}: {
  label: React.ReactNode
  file?: File
  existingDocument?: { id: string; type: string; fileUrl: string; status: string }
  accept: string
  onChange: (file: File | null) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  const statusColor = existingDocument?.status === 'APPROVED' ? 'text-moss' : existingDocument?.status === 'PENDING' ? 'text-clay' : 'text-ink-soft'
  const statusText = existingDocument?.status === 'APPROVED' ? 'Aprobado' : existingDocument?.status === 'PENDING' ? 'Pendiente' : 'Rechazado'

  return (
    <div className="flex items-center justify-between gap-3 rounded-control border border-line bg-paper px-3 py-2.5">
      <div className="min-w-0 truncate text-sm">
        <span className="font-medium">{label}</span>
        {file && <span className="ml-2 font-mono text-xs text-moss">{file.name}</span>}
        {existingDocument && !file && (
          <span className="ml-2 font-mono text-xs" style={{ color: `var(--color-${statusColor})` }}>
            {existingDocument.type} — {statusText}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {existingDocument && !file && (
          <a
            href={existingDocument.fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="cursor-pointer rounded-control border border-line bg-panel px-2.5 py-1 text-xs font-medium hover:bg-moss-soft"
          >
            Ver
          </a>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          hidden
          onChange={(e) => onChange(e.target.files?.[0] ?? null)}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="shrink-0 cursor-pointer rounded-control border border-line bg-panel px-2.5 py-1 text-xs font-medium hover:bg-moss-soft"
        >
          {file ? '✓' : existingDocument ? 'Cambiar' : '+'}
        </button>
      </div>
    </div>
  )
}
