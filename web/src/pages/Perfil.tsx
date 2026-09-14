import { useState, type FormEvent, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { RequireAuth } from '../components/RequireAuth'
import { Button, Card, Input, Textarea, Field, Alert, Badge } from '@/components/ui'
import { useLogout, useMe, useProviderMe, useSwitchMode, useUpdateProfile, useUploadDocument, useUpdateProviderProfile, useCategories } from '../lib/auth'
import { LocationPicker } from '../components/LocationPicker'
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
  const providerData = useProviderMe().data
  const logout = useLogout()
  const switchMode = useSwitchMode()

  if (!me.data) return null
  const user = me.data

  return (
    <main className="mx-auto w-full max-w-2xl space-y-6 px-4 py-10 sm:py-14">
      {/* Cabecera de cuenta */}
      <Card className="p-5 sm:p-6">
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
          <Button
            variant="outline"
            onClick={() => logout.mutate()}
            className="ml-auto shrink-0"
          >
            {t('auth.logout')}
          </Button>
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
      </Card>

      {/* Cambio de modo */}
      <ModeSwitcher
        activeMode={user.activeMode}
        isProvider={user.roles.includes('PROVIDER')}
        onSwitch={(mode) => switchMode.mutate(mode)}
        pending={switchMode.isPending}
      />

      {user.roles.includes('PROVIDER') && <ProviderCard />}
      {user.roles.includes('PROVIDER') && <ProviderProfileEdit key={providerData?.id ?? 'pending'} />}
      <EditProfileForm user={user} />
    </main>
  )
}

const VERIFICATION_STYLE: Record<string, 'success' | 'destructive' | 'outline'> = {
  VERIFIED: 'success',
  PENDING: 'destructive',
  NONE: 'outline',
}

function ProviderCard() {
  const { t } = useTranslation()
  const provider = useProviderMe()

  if (provider.isLoading) {
    return (
      <Card className="p-5 sm:p-6">
        <p className="font-mono text-xs uppercase tracking-wide text-ink-soft">…</p>
      </Card>
    )
  }
  if (!provider.data) return null
  const { verificationStatus, documents, categories, businessName, serviceRadiusKm } = provider.data

  return (
    <Card className="p-5 sm:p-6">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="font-display text-base font-semibold tracking-tight">{businessName}</h2>
        <Badge variant={VERIFICATION_STYLE[verificationStatus]} className="font-mono text-[11px] uppercase">
          {t(`provider.status.${verificationStatus}`)}
        </Badge>
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
    </Card>
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
    <Card className="p-5 sm:p-6">
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
          <Button size="sm" asChild>
            <Link to="/proveedor/onboarding">
              {t('mode.becomeProviderCta')}
            </Link>
          </Button>
        </div>
      )}
    </Card>
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
    <Card className="p-5 sm:p-6">
      <h2 className="font-display text-base font-semibold tracking-tight">
        {t('profile.editTitle')}
      </h2>

      <form onSubmit={onSubmit} className="mt-4 grid gap-4 sm:grid-cols-2" noValidate>
        {EDITABLE_FIELDS.map(([field, labelKey, optional]) => (
          <Field key={field} label={`${t(labelKey)}${optional ? ` (${t('common.optional')})` : ''}`}>
            <Input
              type={field === 'phone' ? 'tel' : 'text'}
              required={!optional && field === 'name'}
              value={form[field]}
              onChange={(event) => setForm((prev) => ({ ...prev, [field]: event.target.value }))}
            />
          </Field>
        ))}

        <div className="flex items-center gap-3 sm:col-span-2">
          <Button
            type="submit"
            isLoading={updateProfile.isPending}
          >
            {t('common.save')}
          </Button>
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
    </Card>
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
  })
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(
    lat != null && lng != null ? { lat, lng } : null,
  )
  const [selectedCategoryIds, setSelectedCategoryIds] = useState(providerCategories.map((c) => c.id))
  const [files, setFiles] = useState<Partial<Record<'ID' | 'LICENSE' | 'CERTIFICATION', File>>>({})

  if (provider.isLoading || !provider.data) return null

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
        lat: position ? position.lat : null,
        lng: position ? position.lng : null,
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
    <Card className="p-5 sm:p-6">
      <h2 className="font-display text-base font-semibold tracking-tight">
        {t('provider.businessTitle')}
      </h2>

      <form onSubmit={onSubmit} className="mt-4 space-y-6" noValidate>
        <Card className="p-5 sm:p-6">
          <h2 className="font-display text-base font-semibold tracking-tight">{t('provider.businessTitle')}</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label={t('provider.businessName')} className="sm:col-span-2">
              <Input
                type="text"
                required
                minLength={2}
                value={form.businessName}
                onChange={(e) => setForm({ ...form, businessName: e.target.value })}
              />
            </Field>
            <Field label={`${t('provider.headline')} (${t('common.optional')})`} className="sm:col-span-2">
              <Input
                type="text"
                maxLength={120}
                placeholder={t('provider.headlinePlaceholder')}
                value={form.headline}
                onChange={(e) => setForm({ ...form, headline: e.target.value })}
              />
            </Field>
            <Field label={`${t('provider.bio')} (${t('common.optional')})`} className="sm:col-span-2">
              <Textarea
                rows={3}
                maxLength={2000}
                value={form.bio}
                onChange={(e) => setForm({ ...form, bio: e.target.value })}
              />
            </Field>
          </div>
        </Card>

        <Card className="p-5 sm:p-6">
          <h2 className="font-display text-base font-semibold tracking-tight">{t('provider.categoriesTitle')}</h2>
          <p className="mt-1 text-xs text-ink-soft">{t('provider.categoriesHint')}</p>
          <div className="mt-4">
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
          </div>
        </Card>

        <Card className="p-5 sm:p-6">
          <h2 className="font-display text-base font-semibold tracking-tight">{t('provider.areaTitle')}</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label={t('profile.city')}>
              <Input
                type="text"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
              />
            </Field>
            <Field label={t('provider.radius')}>
              <select
                value={form.serviceRadiusKm}
                onChange={(e) => setForm({ ...form, serviceRadiusKm: Number(e.target.value) })}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 cursor-pointer"
              >
                {[1, 5, 10, 15, 20, 30, 50].map((km) => (
                  <option key={km} value={km}>
                    {km} km
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <div className="mt-4 space-y-2">
            <Field label={t('provider.mapPickerLabel')}>
              <LocationPicker value={position} onChange={(lat, lng) => setPosition({ lat, lng })} />
            </Field>
            <p className="text-xs text-ink-soft">{t('provider.areaMapHint')}</p>
          </div>
        </Card>

        <Card className="p-5 sm:p-6">
          <h2 className="font-display text-base font-semibold tracking-tight">{t('provider.documentsTitle')}</h2>
          <p className="mt-1 text-xs text-ink-soft">{t('provider.documentsHint')}</p>
          <div className="mt-4">
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
          </div>
        </Card>

        {updateProvider.isError && (
          <Alert variant="destructive">
            {t('errors.generic')}
          </Alert>
        )}

        <div className="flex items-center gap-3">
          <Button
            type="submit"
            disabled={submitting || selectedCategoryIds.length === 0}
            isLoading={submitting}
            className="sm:w-auto"
          >
            {submitting ? t('provider.submitting') : t('common.save')}
          </Button>
          {updateProvider.isSuccess && !updateProvider.isPending && (
            <span className="font-mono text-xs uppercase tracking-wide text-moss">
              {t('common.saved')}
            </span>
          )}
        </div>
      </form>
    </Card>
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
