import { useState, type FormEvent, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { RequireAuth } from '../components/RequireAuth'
import { Button, Card, Input, Textarea, Field, Alert, Badge } from '@/components/ui'
import { useLogout, useMe, useProviderMe, useSwitchMode, useUpdateProfile, useUploadDocument, useUpdateProviderProfile, useCategories } from '../lib/auth'
import { LocationPicker } from '../components/LocationPicker'
import { ImageThumb } from '../components/ImageThumb'
import { GalleryLightbox } from '../components/GalleryLightbox'
import { authErrorMessage } from '../lib/errors'
import type { PublicUser } from '../lib/auth'
import type { CategoryNode } from '../lib/api'

const DOC_FIELDS = [
  { type: 'ID', labelKey: 'provider.docId', required: true },
  { type: 'LICENSE', labelKey: 'provider.docLicense', required: false },
  { type: 'CERTIFICATION', labelKey: 'provider.docCertification', required: false },
] as const

function isValidImageUrl(value: string): boolean {
  const url = value.trim()
  try {
    return /^https?:\/\//.test(new URL(url).href)
  } catch {
    return false
  }
}

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

  const { businessName, headline, bio, categories: providerCategories, serviceRadiusKm, city, lat, lng, documents, avatarUrl: avatarUrlInitial, galleryImages: providerGallery } = provider.data ?? {
    businessName: '',
    headline: null,
    bio: null,
    categories: [],
    serviceRadiusKm: 5,
    city: null,
    lat: null,
    lng: null,
    documents: [],
    avatarUrl: null,
    galleryImages: [],
  }
  const providerServices = provider.data?.services ?? []

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
  const [servicePrices, setServicePrices] = useState<Record<string, string>>(() =>
    Object.fromEntries(providerServices.map((s) => [s.id, s.priceFrom == null ? '' : String(s.priceFrom)])),
  )
  const [newService, setNewService] = useState({
    title: '',
    description: '',
    categoryId: providerCategories[0]?.id ?? '',
    unit: 'HOUR' as 'HOUR' | 'PROJECT',
    price: '',
  })
  const [serviceDrafts, setServiceDrafts] = useState<
    { key: string; title: string; categoryId: string; unit: 'HOUR' | 'PROJECT'; price: string }[]
  >([])
  const serviceTitleRef = useRef<HTMLInputElement>(null)
  const [avatarUrl, setAvatarUrl] = useState(avatarUrlInitial ?? '')
  const [gallery, setGallery] = useState<string[]>(providerGallery)
  const [galleryUrl, setGalleryUrl] = useState('')
  const [galleryLightbox, setGalleryLightbox] = useState<number | null>(null)

  if (provider.isLoading || !provider.data) return null

  function toggleCategory(id: string) {
    setSelectedCategoryIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : prev.length < 5 ? [...prev, id] : prev,
    )
  }

  function setFile(type: 'ID' | 'LICENSE' | 'CERTIFICATION', file: File | null) {
    setFiles((prev) => ({ ...prev, [type]: file ?? undefined }))
  }

  function addServiceDraft() {
    if (!newService.title.trim() || !newService.categoryId) return
    setServiceDrafts((prev) => [
      ...prev,
      {
        key: crypto.randomUUID(),
        title: newService.title.trim(),
        categoryId: newService.categoryId,
        unit: newService.unit,
        price: newService.price.trim(),
      },
    ])
    setNewService((prev) => ({ ...prev, title: '', description: '', price: '' }))
    serviceTitleRef.current?.focus()
  }

  function removeServiceDraft(key: string) {
    setServiceDrafts((prev) => prev.filter((d) => d.key !== key))
  }

  function addGalleryImage() {
    const url = galleryUrl.trim()
    if (!isValidImageUrl(url)) return
    setGallery((prev) => [...prev, url])
    setGalleryUrl('')
  }

  function removeGalleryImage(index: number) {
    setGallery((prev) => prev.filter((_, i) => i !== index))
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
        avatarUrl: avatarUrl.trim() === '' ? null : avatarUrl.trim(),
        galleryImages: gallery.map((u) => u.trim()).filter(Boolean),
        services: [
          ...Object.entries(servicePrices).map(([id, price]) => ({
            id,
            priceFrom: price.trim() === '' ? null : Number(price),
          })),
          ...serviceDrafts.map((d) => ({
            title: d.title,
            categoryId: d.categoryId,
            unit: d.unit,
            priceFrom: d.price.trim() === '' ? null : Number(d.price),
          })),
        ],
      })
    } catch {
      return
    }
    setServiceDrafts([])
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
          <h2 className="font-display text-base font-semibold tracking-tight">{t('provider.servicesTitle')}</h2>
          <p className="mt-1 text-xs text-ink-soft">{t('provider.servicesHint')}</p>
          {providerServices.length === 0 ? (
            <p className="mt-4 text-sm text-ink-soft">{t('provider.servicesEmpty')}</p>
          ) : (
            <ul className="mt-4 divide-y divide-line">
              {providerServices.map((service) => (
                <li key={service.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{service.title}</p>
                    {service.description && (
                      <p className="mt-0.5 truncate text-xs text-ink-soft">{service.description}</p>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm text-ink-soft">$</span>
                      <Input
                        type="number"
                        inputMode="decimal"
                        min={0}
                        step="0.01"
                        placeholder="0"
                        aria-label={`${service.title} — ${t('provider.servicePrice')}`}
                        className="h-9 w-24 text-right font-mono"
                        value={servicePrices[service.id] ?? ''}
                        onChange={(e) =>
                          setServicePrices((prev) => ({ ...prev, [service.id]: e.target.value }))
                        }
                      />
                      <span className="whitespace-nowrap font-mono text-xs text-ink-soft">
                        / {t(`provider.serviceUnit${service.unit}`)}
                      </span>
                    </div>
                    {(servicePrices[service.id] ?? '').trim() === '' && (
                      <span className="font-mono text-[11px] uppercase tracking-wide text-ink-soft">
                        {t('provider.serviceNoPrice')}
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-5 border-t border-line pt-4">
            <h3 className="font-display text-sm font-semibold tracking-tight">
              {t('provider.serviceAddTitle')}
              {serviceDrafts.length > 0 && (
                <span className="ml-2 font-mono text-xs text-ink-soft">({serviceDrafts.length})</span>
              )}
            </h3>
            <p className="mt-1 text-xs text-ink-soft">{t('provider.serviceAddEntriesHint')}</p>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <Field label={t('provider.serviceName')} className="sm:col-span-2">
                <Input
                  ref={serviceTitleRef}
                  type="text"
                  maxLength={120}
                  value={newService.title}
                  onChange={(e) => setNewService({ ...newService, title: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addServiceDraft()
                    }
                  }}
                />
              </Field>
              <Field label={t('provider.serviceCategory')}>
                <select
                  value={newService.categoryId}
                  onChange={(e) => setNewService({ ...newService, categoryId: e.target.value })}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 cursor-pointer"
                >
                  {providerCategories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={t('provider.serviceUnit')}>
                <select
                  value={newService.unit}
                  onChange={(e) =>
                    setNewService({ ...newService, unit: e.target.value as 'HOUR' | 'PROJECT' })
                  }
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 cursor-pointer"
                >
                  <option value="HOUR">{t('provider.serviceUnitHOUR')}</option>
                  <option value="PROJECT">{t('provider.serviceUnitPROJECT')}</option>
                </select>
              </Field>
              <Field label={`${t('provider.servicePrice')} (${t('common.optional')}) ($)`}>
                <Input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="0.01"
                  placeholder="0"
                  value={newService.price}
                  onChange={(e) => setNewService({ ...newService, price: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addServiceDraft()
                    }
                  }}
                />
              </Field>
              <div className="sm:col-span-2">
                <Field label={`${t('provider.serviceDescription')} (${t('common.optional')})`}>
                  <Textarea
                    rows={2}
                    maxLength={500}
                    value={newService.description}
                    onChange={(e) => setNewService({ ...newService, description: e.target.value })}
                  />
                </Field>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={addServiceDraft}
              disabled={!newService.title.trim() || !newService.categoryId}
            >
              {t('provider.serviceAddCta')}
            </Button>

            {serviceDrafts.length > 0 && (
              <>
                <ul className="mt-4 divide-y divide-line">
                  {serviceDrafts.map((d) => (
                    <li key={d.key} className="flex items-center justify-between gap-3 py-2.5">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{d.title}</p>
                        <p className="truncate font-mono text-xs text-ink-soft">
                        {d.price.trim() === ''
                          ? t('provider.serviceNoPrice')
                          : `$${d.price} / ${t(`provider.serviceUnit${d.unit}`)}`}
                      </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeServiceDraft(d.key)}
                        className="shrink-0 cursor-pointer rounded-control border border-line bg-panel px-2.5 py-1 text-xs font-medium text-clay hover:bg-moss-soft"
                      >
                        {t('provider.serviceRemove')}
                      </button>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-xs text-ink-soft">
                  {serviceDrafts.length === 1
                    ? t('provider.serviceDraftHint_one')
                    : t('provider.serviceDraftHint', { count: serviceDrafts.length })}
                </p>
              </>
            )}
          </div>
        </Card>

        <Card className="p-5 sm:p-6">
          <h2 className="font-display text-base font-semibold tracking-tight">{t('provider.imagesTitle')}</h2>
          <p className="mt-1 text-xs text-ink-soft">{t('provider.imagesHint')}</p>

          <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-center">
            <Field label={`${t('provider.avatarLabel')} (${t('common.optional')})`}>
              <Input
                type="url"
                placeholder={t('provider.imagePlaceholder')}
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
              />
            </Field>
            <div className="flex justify-center">
              <ImageThumb src={avatarUrl} alt="avatar" className="h-20 w-20 rounded-[10px]" fit="contain" />
            </div>
          </div>

          <div className="mt-5 border-t border-line pt-4">
            <h3 className="font-display text-sm font-semibold tracking-tight">
              {t('provider.galleryTitle')}
              {gallery.length > 0 && (
                <span className="ml-2 font-mono text-xs text-ink-soft">({gallery.length})</span>
              )}
            </h3>
            <p className="mt-1 text-xs text-ink-soft">{t('provider.galleryHint')}</p>

            {gallery.length === 0 ? (
              <p className="mt-3 text-sm text-ink-soft">{t('provider.imagesEmpty')}</p>
            ) : (
              <ul className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
                {gallery.map((url, index) => (
                  <li
                    key={`${url}-${index}`}
                    className="group relative overflow-hidden rounded-card border border-line"
                  >
                    <button
                      type="button"
                      onClick={() => setGalleryLightbox(index)}
                      className="block w-full cursor-pointer text-left"
                      aria-label={`${t('provider.galleryTitle')} ${index + 1}`}
                    >
                      <ImageThumb src={url} alt={`${t('provider.galleryTitle')} ${index + 1}`} className="aspect-video w-full" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeGalleryImage(index)}
                      className="absolute right-1.5 top-1.5 cursor-pointer rounded-control border border-line bg-panel/90 px-2 py-1 text-[11px] font-medium text-clay hover:bg-panel"
                    >
                      {t('provider.imageRemove')}
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Input
                type="url"
                placeholder={t('provider.imagePlaceholder')}
                value={galleryUrl}
                onChange={(e) => setGalleryUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addGalleryImage()
                  }
                }}
                className="sm:max-w-xs"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!isValidImageUrl(galleryUrl)}
                onClick={addGalleryImage}
              >
                {t('provider.imageAdd')}
              </Button>
            </div>
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
            {authErrorMessage(updateProvider.error, t)}
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
      <GalleryLightbox
        images={gallery}
        index={galleryLightbox}
        onClose={() => setGalleryLightbox(null)}
        onNavigate={setGalleryLightbox}
      />
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

