import { useRef, useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { RequireAuth } from '../../components/RequireAuth'
import { LocationPicker } from '../../components/LocationPicker'
import { Button, Card, Input, Textarea, Alert } from '@/components/ui'
import {
  useCategories,
  useMe,
  useOnboardingProvider,
  useUploadDocument,
} from '../../lib/auth'
import type { CategoryNode } from '../../lib/api'

const DOC_FIELDS = [
  { type: 'ID', labelKey: 'provider.docId', required: true },
  { type: 'LICENSE', labelKey: 'provider.docLicense', required: false },
  { type: 'CERTIFICATION', labelKey: 'provider.docCertification', required: false },
] as const

const RADIUS_OPTIONS = [1, 5, 10, 15] as const

export function OnboardingProveedorPage() {
  return (
    <RequireAuth>
      <OnboardingContent />
    </RequireAuth>
  )
}

function OnboardingContent() {
  const { t } = useTranslation()
  const me = useMe()
  if (!me.data) return null
  // Ya es proveedor: el onboarding no se repite.
  if (me.data.roles.includes('PROVIDER')) return <Navigate to="/perfil" replace />

  return (
    <main className="mx-auto w-full max-w-2xl space-y-6 px-4 py-10 sm:py-14">
      <header>
        <h1 className="font-display text-xl font-semibold tracking-tight">
          {t('provider.onboardingTitle')}
        </h1>
        <p className="mt-1 text-sm text-ink-soft">{t('provider.onboardingSubtitle')}</p>
      </header>
      <OnboardingForm />
    </main>
  )
}

type FileSelection = Partial<Record<'ID' | 'LICENSE' | 'CERTIFICATION', File>>

function OnboardingForm() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const categories = useCategories()
  const onboarding = useOnboardingProvider()
  const uploadDocument = useUploadDocument()

  const [form, setForm] = useState({
    businessName: '',
    headline: '',
    bio: '',
    city: '',
    serviceRadiusKm: 5,
    lat: null as number | null,
    lng: null as number | null,
  })
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [files, setFiles] = useState<FileSelection>({})

  function toggleCategory(id: string) {
    setSelectedCategories((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : prev.length < 5 ? [...prev, id] : prev,
    )
  }

  function setFile(type: keyof FileSelection, file: File | null) {
    setFiles((prev) => ({ ...prev, [type]: file ?? undefined }))
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    try {
      await onboarding.mutateAsync({
        businessName: form.businessName,
        headline: form.headline || undefined,
        bio: form.bio || undefined,
        categoryIds: selectedCategories,
        city: form.city,
        serviceRadiusKm: form.serviceRadiusKm,
        lat: form.lat ?? undefined,
        lng: form.lng ?? undefined,
      })
    } catch {
      return // el error se muestra bajo el formulario
    }
    for (const file of Object.values(files)) {
      if (!file) continue
      const type = (Object.keys(files) as (keyof FileSelection)[]).find((k) => files[k] === file)!
      await uploadDocument.mutateAsync({ file, type })
    }
    navigate('/perfil')
  }

  const submitting = onboarding.isPending || uploadDocument.isPending

  return (
    <form onSubmit={onSubmit} className="space-y-6" noValidate>
      <Card className="p-5 sm:p-6">
        <h2 className="font-display text-base font-semibold tracking-tight">{t('provider.businessTitle')}</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block space-y-1.5 sm:col-span-2">
            <span className="text-sm font-medium">{t('provider.businessName')}</span>
            <Input
              type="text"
              required
              minLength={2}
              value={form.businessName}
              onChange={(e) => setForm({ ...form, businessName: e.target.value })}
            />
          </label>
          <label className="block space-y-1.5 sm:col-span-2">
            <span className="text-sm font-medium">{`${t('provider.headline')} (${t('common.optional')})`}</span>
            <Input
              type="text"
              maxLength={120}
              placeholder={t('provider.headlinePlaceholder')}
              value={form.headline}
              onChange={(e) => setForm({ ...form, headline: e.target.value })}
            />
          </label>
          <label className="block space-y-1.5 sm:col-span-2">
            <span className="text-sm font-medium">{`${t('provider.bio')} (${t('common.optional')})`}</span>
            <Textarea
              rows={3}
              maxLength={2000}
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
              className="resize-none"
            />
          </label>
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
                    {(root.children.length ? root.children : [root]).map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => toggleCategory(cat.id)}
                        aria-pressed={selectedCategories.includes(cat.id)}
                        className={`cursor-pointer rounded-control border px-3 py-1.5 text-sm ${
                          selectedCategories.includes(cat.id)
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
          <label className="block space-y-1.5">
            <span className="text-sm font-medium">{t('profile.city')}</span>
            <Input
              type="text"
              required
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium">{t('provider.radius')}</span>
            <select
              value={form.serviceRadiusKm}
              onChange={(e) => setForm({ ...form, serviceRadiusKm: Number(e.target.value) })}
              className="w-full rounded-control border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-moss"
            >
              {RADIUS_OPTIONS.map((km) => (
                <option key={km} value={km}>
                  {km} km
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="mt-4 space-y-2">
          <label className="block space-y-1.5">
            <span className="text-sm font-medium">{t('provider.mapPickerLabel')}</span>
            <LocationPicker
              value={form.lat != null && form.lng != null ? { lat: form.lat, lng: form.lng } : null}
              onChange={(lat, lng) => setForm((prev) => ({ ...prev, lat, lng }))}
            />
          </label>
          <p className="text-xs text-ink-soft">{t('provider.areaMapHint')}</p>
        </div>
      </Card>

      <Card className="p-5 sm:p-6">
        <h2 className="font-display text-base font-semibold tracking-tight">{t('provider.documentsTitle')}</h2>
        <p className="mt-1 text-xs text-ink-soft">{t('provider.documentsHint')}</p>
        <div className="mt-4 space-y-3">
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
              accept=".pdf,.jpg,.jpeg,.png,.webp"
              onChange={(file) => setFile(type, file)}
            />
          ))}
        </div>
      </Card>

      {onboarding.isError && (
        <Alert variant="destructive">{t(onboardingErrorKey(onboarding.error))}</Alert>
      )}

      <Button
        type="submit"
        isLoading={submitting}
        disabled={selectedCategories.length === 0 || !files.ID}
        className="w-full sm:w-auto"
      >
        {submitting ? t('provider.submitting') : t('provider.submit')}
      </Button>
      <p className="text-xs text-ink-soft">{t('provider.submitNote')}</p>
    </form>
  )
}

function onboardingErrorKey(error: unknown): string {
  const code = (error as { code?: string })?.code
  if (code === 'validation_error') return 'errors.validation'
  return 'errors.generic'
}

function FileField({
  label,
  file,
  accept,
  onChange,
}: {
  label: React.ReactNode
  file?: File
  accept: string
  onChange: (file: File | null) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <div className="flex items-center justify-between gap-3 rounded-control border border-line bg-paper px-3 py-2.5">
      <span className="min-w-0 truncate text-sm">
        <span className="font-medium">{label}</span>
        {file && <span className="ml-2 font-mono text-xs text-moss">{file.name}</span>}
      </span>
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
        {file ? '✓' : '+'}
      </button>
    </div>
  )
}
