import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { useProviderSearch } from '../lib/search'
import { api } from '../lib/api'
import { ProviderCard } from '../components/ProviderCard'

export function HomePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')

  const categories = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.categories(),
    staleTime: Infinity,
  })
  const topRated = useProviderSearch({ sort: 'rating' })

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    navigate(query.trim() ? `/buscar?q=${encodeURIComponent(query.trim())}` : '/buscar')
  }

  return (
    <main>
      {/* Hero con buscador — la cercanía como promesa central del producto */}
      <section className="border-b border-line bg-panel">
        <div className="mx-auto max-w-5xl px-4 py-12 text-center sm:py-16">
          <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
            {t('home.heroTitle')}
          </h1>
          <p className="mx-auto mt-2 max-w-xl text-sm text-ink-soft sm:text-base">
            {t('home.heroSubtitle')}
          </p>
          <form onSubmit={onSubmit} className="mx-auto mt-6 flex max-w-lg gap-2" role="search">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('ds.searchPlaceholder')}
              aria-label={t('search.title')}
              className="w-full rounded-control border border-line bg-paper px-3 py-2.5 text-sm outline-none placeholder:text-ink-soft focus:border-moss"
            />
            <button
              type="submit"
              className="shrink-0 cursor-pointer rounded-control bg-moss px-5 py-2.5 text-sm font-medium text-panel hover:opacity-90"
            >
              {t('home.searchCta')}
            </button>
          </form>
        </div>
      </section>

      {/* Categorías */}
      <section className="mx-auto max-w-5xl px-4 py-10">
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-lg font-semibold tracking-tight">{t('home.categoriesTitle')}</h2>
          <Link to="/buscar" className="text-sm font-medium text-moss hover:underline">
            {t('home.viewAll')}
          </Link>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {categories.data?.map((root) => (
            <Link
              key={root.id}
              to={`/buscar?categoryId=${root.children[0]?.id ?? root.id}`}
              data-testid="home-category"
              className="rounded-card border border-line bg-panel p-4 transition-colors hover:border-moss/60 hover:bg-moss-soft/30"
            >
              <span className="font-mono text-xs uppercase tracking-wide text-ink-soft">
                {root.icon ?? root.name.charAt(0)}
              </span>
              <b className="mt-1 block text-sm font-medium">{root.name}</b>
              <span className="mt-0.5 block text-xs text-ink-soft">
                {t('home.subcategoryCount', { count: root.children.length })}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Mejor calificados */}
      <section className="mx-auto max-w-5xl px-4 pb-14">
        <h2 className="font-display text-lg font-semibold tracking-tight">
          {t('home.topRatedTitle')}
        </h2>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3" data-testid="home-top-rated">
          {topRated.data?.slice(0, 6).map((provider) => (
            <ProviderCard key={provider.id} provider={provider} />
          ))}
        </div>
        <div className="mt-6 text-center">
          <Link
            to="/buscar"
            className="inline-block cursor-pointer rounded-control border border-line bg-paper px-4 py-2 text-sm font-medium hover:bg-moss-soft"
          >
            {t('home.exploreNearby')}
          </Link>
        </div>
      </section>
    </main>
  )
}
