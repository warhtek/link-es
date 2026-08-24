import { useMemo, useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ProviderMap } from '../components/ProviderMap'
import { ProviderCard } from '../components/ProviderCard'
import {
  formatDistance,
  useGeolocation,
  useProviderSearch,
  type SortOption,
} from '../lib/search'
import { api } from '../lib/api'
import { useQuery } from '@tanstack/react-query'

const RADIUS_OPTIONS = [1, 5, 10] as const

export function BuscarPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  // Estado de filtros (inicializado desde la URL para búsquedas desde Home)
  const [q, setQ] = useState(searchParams.get('q') ?? '')
  const categoryId = searchParams.get('categoryId') ?? undefined
  const [radiusKm, setRadiusKm] = useState<number | undefined>(undefined)
  const [sort, setSort] = useState<SortOption>('rating')
  const [selectedId, setSelectedId] = useState<string | undefined>()

  const geo = useGeolocation()
  const categories = useQuery({ queryKey: ['categories'], queryFn: () => api.categories(), staleTime: Infinity })

  // Categorías aplanadas (raíces + subcategorías) para el filtro.
  const categoryOptions = useMemo(
    () =>
      (categories.data ?? []).flatMap((root) => [
        { id: root.children[0]?.id ?? root.id, name: root.name, group: true },
        ...root.children.map((child) => ({ id: child.id, name: `— ${child.name}`, group: false })),
      ]),
    [categories.data],
  )

  // El texto se busca tal cual al enviar; los demás filtros son inmediatos.
  const params = useMemo(
    () => ({
      q: q.trim() || undefined,
      categoryId,
      lat: geo.position?.lat,
      lng: geo.position?.lng,
      radiusKm,
      sort: sort === 'distance' && !geo.position ? ('rating' as const) : sort,
    }),
    [q, categoryId, geo.position, radiusKm, sort],
  )
  const search = useProviderSearch(params)

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    search.refetch()
  }

  const pickMode = geo.status === 'denied' || geo.status === 'unavailable'

  return (
    <main className="lg:flex lg:h-[calc(100vh-53px)]">
      {/* Columna izquierda: filtros + resultados (45% en escritorio) */}
      <div className="flex min-w-0 flex-col border-line lg:w-[45%] lg:border-r">
        <div className="space-y-3 border-b border-line bg-panel px-4 py-3">
          <form onSubmit={onSubmit} className="flex gap-2" role="search">
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t('ds.searchPlaceholder')}
              aria-label={t('search.title')}
              data-testid="search-input"
              className="w-full rounded-control border border-line bg-paper px-3 py-2 text-sm outline-none placeholder:text-ink-soft focus:border-moss"
            />
            <button
              type="submit"
              className="shrink-0 cursor-pointer rounded-control bg-moss px-4 py-2 text-sm font-medium text-panel hover:opacity-90"
            >
              {t('home.searchCta')}
            </button>
          </form>

          <div className="flex flex-wrap items-center gap-2">
            {/* Filtro de radio — solo activo con ubicación conocida */}
            {geo.position ? (
              <>
                {RADIUS_OPTIONS.map((km) => (
                  <button
                    key={km}
                    type="button"
                    onClick={() => setRadiusKm(radiusKm === km ? undefined : km)}
                    aria-pressed={radiusKm === km}
                    data-testid={`radius-${km}`}
                    className={`cursor-pointer rounded-control border px-2.5 py-1 font-mono text-xs ${
                      radiusKm === km
                        ? 'border-moss bg-moss-soft font-semibold text-moss'
                        : 'border-line bg-paper text-ink-soft hover:bg-moss-soft/50'
                    }`}
                  >
                    ≤ {km} km
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setRadiusKm(undefined)}
                  aria-pressed={!radiusKm}
                  className={`cursor-pointer rounded-control border px-2.5 py-1 text-xs ${
                    !radiusKm
                      ? 'border-moss bg-moss-soft font-semibold text-moss'
                      : 'border-line bg-paper text-ink-soft hover:bg-moss-soft/50'
                  }`}
                >
                  {t('search.wholeCity')}
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={geo.request}
                disabled={geo.status === 'requesting'}
                data-testid="use-location"
                className="cursor-pointer rounded-control border border-clay/60 bg-clay/10 px-3 py-1.5 text-xs font-medium text-carbon hover:opacity-90 disabled:opacity-60"
              >
                ◎ {geo.status === 'requesting' ? t('search.locating') : t('search.useMyLocation')}
              </button>
            )}

            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortOption)}
              aria-label={t('search.sortBy')}
              className="ml-auto cursor-pointer rounded-control border border-line bg-paper px-2 py-1.5 text-xs outline-none focus:border-moss"
            >
              <option value="distance" disabled={!geo.position}>
                {t('search.sort.distance')}
              </option>
              <option value="rating">{t('search.sort.rating')}</option>
              <option value="bookings">{t('search.sort.bookings')}</option>
            </select>
          </div>

          <select
            value={categoryId ?? ''}
            onChange={(e) => {
              const next = e.target.value || null
              navigate(next ? `/buscar?categoryId=${next}` : '/buscar', { replace: true })
            }}
            aria-label={t('home.categoriesTitle')}
            data-testid="category-filter"
            className="w-full cursor-pointer rounded-control border border-line bg-paper px-2 py-1.5 text-xs outline-none focus:border-moss sm:w-auto sm:min-w-52"
          >
            <option value="">{t('search.allCategories')}</option>
            {categoryOptions.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.name}
              </option>
            ))}
          </select>

          {pickMode && (
            <p className="rounded-control border border-line bg-paper px-3 py-1.5 text-xs text-ink-soft">
              {t('search.pickOnMapHint')}
            </p>
          )}
        </div>

        {/* Resultados */}
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4" data-testid="results-list">
          {geo.status === 'granted' && (
            <p className="mb-3 font-mono text-xs uppercase tracking-wide text-ink-soft">
              {t('search.resultsNear', {
                count: search.data?.length ?? 0,
                radius: radiusKm ? `≤ ${radiusKm} km` : t('search.wholeCity').toLowerCase(),
                nearest:
                  sort === 'distance' && search.data?.[0]?.distanceKm != null
                    ? ` · ${t('search.nearest')} ${formatDistance(search.data[0].distanceKm)}`
                    : '',
              })}
            </p>
          )}
          {search.isPending ? (
            <p className="font-mono text-xs uppercase tracking-wide text-ink-soft">…</p>
          ) : search.data && search.data.length > 0 ? (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              {search.data.map((provider) => (
                <ProviderCard
                  key={provider.id}
                  provider={provider}
                  highlighted={selectedId === provider.id}
                  onHover={(id) => setSelectedId(id ?? undefined)}
                />
              ))}
            </div>
          ) : (
            <div className="py-14 text-center">
              <p className="font-display text-sm font-semibold">{t('search.emptyTitle')}</p>
              <p className="mx-auto mt-1 max-w-xs text-xs text-ink-soft">{t('search.emptyHint')}</p>
            </div>
          )}
        </div>
      </div>

      {/* Columna derecha / bloque superior móvil: mapa en vivo (55%) */}
      <div className="h-[45vh] w-full lg:h-auto lg:min-w-0 lg:flex-1">
        <ProviderMap
          providers={search.data ?? []}
          clientPosition={geo.position}
          pickMode={pickMode}
          onPickClientPosition={geo.setManual}
          onSelectProvider={(id) => navigate(`/proveedores/${id}`)}
          selectedId={selectedId}
        />
      </div>
    </main>
  )
}
