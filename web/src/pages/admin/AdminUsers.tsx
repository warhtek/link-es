import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Alert, Badge, Button, Card, Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, Input, SearchInput, Tabs, TabsList, TabsTrigger } from '@/components/ui'
import { api, getAccessToken, type AdminCreateUserInput, type AdminUpdateUserInput, type AdminUserItem, type AdminCategoryItem, type AdminCreateCategoryInput, type AdminUpdateCategoryInput } from '../../lib/api'
import { useMe } from '../../lib/auth'

export function AdminUsersPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const me = useMe()
  const token = getAccessToken()
  const currentUser = token ? me.data : null

  const [activeTab, setActiveTab] = useState<'users' | 'categories'>('users')
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('')
  const [verifFilter, setVerifFilter] = useState<string>('')
  const [page, setPage] = useState(1)

  // Modales Users
  const [createUserModalOpen, setCreateUserModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<AdminUserItem | null>(null)
  const [deletingUser, setDeletingUser] = useState<AdminUserItem | null>(null)

  // Modales Categories
  const [createCategoryModalOpen, setCreateCategoryModalOpen] = useState<false | { parentId?: string } | true>(false)
  const [editingCategory, setEditingCategory] = useState<AdminCategoryItem | null>(null)
  const [deletingCategory, setDeletingCategory] = useState<AdminCategoryItem | null>(null)

  const [alertMessage, setAlertMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Consultas de datos
  const statsQuery = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: () => api.admin.getStats(),
    enabled: Boolean(currentUser?.roles.includes('ADMIN')),
  })

  const usersQuery = useQuery({
    queryKey: ['admin', 'users', { search, roleFilter, verifFilter, page }],
    queryFn: () =>
      api.admin.getUsers({
        search: search || undefined,
        role: roleFilter || undefined,
        verificationStatus: verifFilter || undefined,
        page,
        limit: 15,
      }),
    enabled: Boolean(currentUser?.roles.includes('ADMIN')) && activeTab === 'users',
  })

  const categoriesQuery = useQuery({
    queryKey: ['admin', 'categories'],
    queryFn: () => api.admin.getCategories(),
    enabled: Boolean(currentUser?.roles.includes('ADMIN')) && activeTab === 'categories',
  })

  const allCategoriesQuery = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.categories(),
    staleTime: 5 * 60 * 1000,
  })

  // Mutación: Alternar verificación rápida
  const verifyMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'NONE' | 'PENDING' | 'VERIFIED' }) =>
      api.admin.setVerification(id, status),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin'] })
      showAlert('success', t('admin.messages.verificationSuccess'))
    },
    onError: (err: Error) => showAlert('error', err.message),
  })

  // Mutación: Eliminar usuario
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.admin.deleteUser(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin'] })
      setDeletingUser(null)
      showAlert('success', t('admin.messages.deletedSuccess'))
    },
    onError: (err: Error) => showAlert('error', err.message),
  })

  const deleteCategoryMutation = useMutation({
    mutationFn: (id: string) => api.admin.deleteCategory(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'categories'] })
      setDeletingCategory(null)
      showAlert('success', t('admin.categories.messages.deletedSuccess'))
    },
    onError: (err: Error) => showAlert('error', err.message),
  })

  function showAlert(type: 'success' | 'error', text: string) {
    setAlertMessage({ type, text })
    setTimeout(() => setAlertMessage(null), 4000)
  }

  // Protección de ruta
  if (me.isLoading) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center">
        <span className="font-mono text-xs uppercase tracking-wide text-ink-soft">…</span>
      </main>
    )
  }

  if (!token || !currentUser?.roles.includes('ADMIN')) {
    return <Navigate to="/" replace />
  }

  const stats = statsQuery.data

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      {/* Cabecera con pestañas */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
            {t('admin.title')}
          </h1>
          <p className="mt-1 text-sm text-ink-soft">{t('admin.subtitle')}</p>
        </div>
      </div>

      {/* Navegación por pestañas */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'users' | 'categories')} className="border-b border-line">
        <TabsList variant="line">
          <TabsTrigger value="users">👥 {t('admin.tabs.users')}</TabsTrigger>
          <TabsTrigger value="categories">🏷️ {t('admin.tabs.categories')}</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Alerta flotante o de estado */}
      {alertMessage && (
        <Alert className="mt-4" variant={alertMessage.type === 'success' ? 'success' : 'destructive'}>
          {alertMessage.text}
        </Alert>
      )}

      {activeTab === 'users' ? (
        <>
          {/* Tarjetas KPI de Estadísticas */}
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Card className="p-4">
              <span className="block font-mono text-xs uppercase tracking-wide text-ink-soft">
                {t('admin.stats.totalUsers')}
              </span>
              <b className="mt-1 block font-mono text-2xl font-semibold">{stats?.totalUsers ?? '…'}</b>
            </Card>
            <Card className="p-4">
              <span className="block font-mono text-xs uppercase tracking-wide text-ink-soft">
                {t('admin.stats.clients')}
              </span>
              <b className="mt-1 block font-mono text-2xl font-semibold">{stats?.clientsCount ?? '…'}</b>
            </Card>
            <Card className="p-4">
              <span className="block font-mono text-xs uppercase tracking-wide text-ink-soft">
                {t('admin.stats.providers')}
              </span>
              <b className="mt-1 block font-mono text-2xl font-semibold text-moss">{stats?.providersCount ?? '…'}</b>
            </Card>
            <Card className="p-4">
              <span className="block font-mono text-xs uppercase tracking-wide text-ink-soft">
                {t('admin.stats.pendingVerifications')}
              </span>
              <div className="mt-1 flex items-baseline gap-2">
                <b className="font-mono text-2xl font-semibold text-clay">{stats?.pendingVerifications ?? '…'}</b>
            {(stats?.pendingVerifications ?? 0) > 0 && (
              <span className="rounded-full bg-clay/10 px-2 py-0.5 font-mono text-[10px] font-bold text-clay">
                Revisar
              </span>
            )}
          </div>
        </Card>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <Card className="mt-6 p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="flex-1">
            <SearchInput
              value={search}
              onChange={(val) => { setSearch(val); setPage(1) }}
              placeholder={t('admin.filters.searchPlaceholder')}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Filtro por Rol */}
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value)
                setPage(1)
              }}
              className="rounded-control border border-line bg-paper px-3 py-2 text-xs font-medium outline-none focus:border-moss"
            >
              <option value="">{t('admin.filters.allRoles')}</option>
              <option value="CLIENT">{t('admin.filters.clientsOnly')}</option>
              <option value="PROVIDER">{t('admin.filters.providersOnly')}</option>
              <option value="ADMIN">{t('admin.filters.adminsOnly')}</option>
            </select>

            {/* Filtro por Verificación */}
            <select
              value={verifFilter}
              onChange={(e) => {
                setVerifFilter(e.target.value)
                setPage(1)
              }}
              className="rounded-control border border-line bg-paper px-3 py-2 text-xs font-medium outline-none focus:border-moss"
            >
              <option value="">{t('admin.filters.allStatus')}</option>
              <option value="VERIFIED">{t('admin.filters.verified')}</option>
              <option value="PENDING">{t('admin.filters.pending')}</option>
              <option value="NONE">{t('admin.filters.none')}</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Tabla de Usuarios */}
      <Card className="mt-4 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line bg-paper font-mono text-[11px] uppercase tracking-wider text-ink-soft">
              <tr>
                <th className="px-4 py-3">{t('admin.table.user')}</th>
                <th className="px-4 py-3">{t('admin.table.roles')}</th>
                <th className="px-4 py-3">{t('admin.table.details')}</th>
                <th className="px-4 py-3">{t('admin.table.city')}</th>
                <th className="px-4 py-3">{t('admin.table.verification')}</th>
                <th className="px-4 py-3">{t('admin.table.date')}</th>
                <th className="px-4 py-3 text-right">{t('admin.table.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {usersQuery.isLoading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center font-mono text-xs text-ink-soft">
                    Cargando usuarios…
                  </td>
                </tr>
              ) : usersQuery.data?.users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-ink-soft">
                    {t('admin.table.noResults')}
                  </td>
                </tr>
              ) : (
                usersQuery.data?.users.map((u) => {
                  const isProvider = u.roles.includes('PROVIDER')
                  const verifStatus = u.providerProfile?.verificationStatus

                  return (
                    <tr key={u.id} className="transition-colors hover:bg-paper/60">
                      {/* Usuario */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-moss-soft font-display text-xs font-bold text-moss">
                            {u.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <b className="block truncate font-medium text-carbon">{u.name}</b>
                            <span className="block truncate text-xs text-ink-soft">{u.email}</span>
                            {u.phone && <span className="block font-mono text-[11px] text-ink-soft">{u.phone}</span>}
                          </div>
                        </div>
                      </td>

                      {/* Roles */}
                      <td className="px-4 py-3.5">
                        <div className="flex flex-wrap gap-1">
                          {u.roles.map((r) =>
                        r === 'ADMIN' ? (
                          <Badge key={r} variant="default" className="rounded-control px-2 py-0.5 font-mono text-[10px] uppercase border-carbon/30 bg-carbon text-panel">
                            {r}
                          </Badge>
                        ) : r === 'PROVIDER' ? (
                          <Badge key={r} variant="success" className="rounded-control px-2 py-0.5 font-mono text-[10px] uppercase border-moss bg-moss-soft text-moss">
                            {r}
                          </Badge>
                        ) : (
                          <Badge key={r} variant="secondary" className="rounded-control px-2 py-0.5 font-mono text-[10px] uppercase text-ink-soft">
                            {r}
                          </Badge>
                        )
                      )}
                        </div>
                      </td>

                      {/* Detalles / Negocio */}
                      <td className="px-4 py-3.5">
                        {isProvider && u.providerProfile ? (
                          <div>
                            <b className="block text-xs font-semibold text-carbon">
                              {u.providerProfile.businessName}
                            </b>
                            {u.providerProfile.categories.length > 0 && (
                              <span className="block text-[11px] text-ink-soft">
                                {u.providerProfile.categories.map((c) => c.name).join(', ')}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-ink-soft">
                            {u._count.bookingsAsClient > 0
                              ? `${u._count.bookingsAsClient} reservas`
                              : 'Cliente'}
                          </span>
                        )}
                      </td>

                      {/* Ciudad */}
                      <td className="px-4 py-3.5 text-xs text-ink-soft">{u.city || '—'}</td>

                      {/* Verificación */}
                      <td className="px-4 py-3.5">
                        {isProvider && verifStatus ? (
                          <button
                            type="button"
                            title="Haz clic para alternar verificación"
                            onClick={() => {
                              const nextStatus =
                                verifStatus === 'VERIFIED' ? 'NONE' : 'VERIFIED'
                              verifyMutation.mutate({ id: u.id, status: nextStatus })
                            }}
                            className={`cursor-pointer rounded-control border px-2 py-0.5 text-[11px] font-medium transition-opacity hover:opacity-80 ${
                              verifStatus === 'VERIFIED'
                                ? 'border-moss bg-moss-soft text-moss'
                                : verifStatus === 'PENDING'
                                  ? 'border-clay/40 bg-clay/10 text-clay'
                                  : 'border-line bg-paper text-ink-soft'
                            }`}
                          >
                            {verifStatus === 'VERIFIED'
                              ? `✓ ${t('admin.badges.verified')}`
                              : verifStatus === 'PENDING'
                                ? `⏳ ${t('admin.badges.pending')}`
                                : `○ ${t('admin.badges.none')}`}
                          </button>
                        ) : (
                          <span className="text-ink-soft">—</span>
                        )}
                      </td>

                      {/* Fecha de Registro */}
                      <td className="px-4 py-3.5 font-mono text-xs text-ink-soft">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>

                      {/* Acciones */}
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => setEditingUser(u)}
                            className="cursor-pointer rounded-md p-1.5 text-ink-soft transition-colors hover:bg-moss-soft hover:text-moss"
                            title={t('admin.actions.edit')}
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          {currentUser.id !== u.id && (
                            <button
                              type="button"
                              onClick={() => setDeletingUser(u)}
                              className="cursor-pointer rounded-md p-1.5 text-ink-soft transition-colors hover:bg-clay/10 hover:text-clay"
                              title={t('admin.actions.delete')}
                            >
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {usersQuery.data && usersQuery.data.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-line px-4 py-3">
            <span className="font-mono text-xs text-ink-soft">
              Página {usersQuery.data.page} de {usersQuery.data.totalPages} ({usersQuery.data.total} en total)
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="font-mono"
              >
                ← Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= usersQuery.data.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="font-mono"
              >
                Siguiente →
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Modal: Crear Usuario / Proveedor */}
      {createUserModalOpen && (
        <CreateUserModal
          categories={allCategoriesQuery.data ?? []}
          onClose={() => setCreateUserModalOpen(false)}
          onSuccess={() => {
            setCreateUserModalOpen(false)
            void queryClient.invalidateQueries({ queryKey: ['admin'] })
            showAlert('success', t('admin.messages.createdSuccess'))
          }}
        />
      )}

      {/* Modal: Modificar Usuario */}
      {editingUser && (
        <EditUserModal
          user={editingUser}
          categories={allCategoriesQuery.data ?? []}
          onClose={() => setEditingUser(null)}
          onSuccess={() => {
            setEditingUser(null)
            void queryClient.invalidateQueries({ queryKey: ['admin'] })
            showAlert('success', t('admin.messages.updatedSuccess'))
          }}
        />
      )}

      {/* Modal: Confirmar Eliminación Usuario */}
      {deletingUser && (
        <Dialog open={true} onOpenChange={(open) => !open && setDeletingUser(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3 text-clay">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-clay/10">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                {t('admin.modal.deleteTitle')}
              </DialogTitle>
              <DialogDescription>{t('admin.modal.deleteWarning')}</DialogDescription>
            </DialogHeader>
            <div className="mt-3 rounded-control border border-line bg-paper p-3 font-mono text-xs">
              <b>{deletingUser.name}</b> ({deletingUser.email})
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeletingUser(null)}>
                {t('admin.actions.cancel')}
              </Button>
              <Button
                variant="destructive"
                isLoading={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate(deletingUser.id)}
              >
                {deleteMutation.isPending ? 'Eliminando…' : t('admin.actions.confirmDelete')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
        </> // Cierre users tab
      ) : (
        // ===================== VISTA CATEGORÍAS =====================
        <>
          {/* Métricas categorías */}
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Card className="p-4">
              <span className="block font-mono text-xs uppercase tracking-wide text-ink-soft">
                {t('admin.categories.stats.total')}
              </span>
              <b className="mt-1 block font-mono text-2xl font-semibold">{(categoriesQuery.data as { total: number } | undefined)?.total ?? '…'}</b>
            </Card>
            <Card className="p-4">
              <span className="block font-mono text-xs uppercase tracking-wide text-ink-soft">
                {t('admin.categories.stats.roots')}
              </span>
              <b className="mt-1 block font-mono text-2xl font-semibold text-moss">
                {(categoriesQuery.data as { categories: AdminCategoryItem[] } | undefined)?.categories.filter((c) => !c.parentId).length ?? '…'}
              </b>
            </Card>
            <Card className="p-4">
              <span className="block font-mono text-xs uppercase tracking-wide text-ink-soft">
                {t('admin.categories.stats.specialties')}
              </span>
              <b className="mt-1 block font-mono text-2xl font-semibold text-clay">
                {(categoriesQuery.data as { categories: AdminCategoryItem[] } | undefined)?.categories.filter((c) => c.parentId).length ?? '…'}
              </b>
            </Card>
          </div>

          {/* Cabecera con botón crear */}
          <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h2 className="font-display text-xl font-semibold">{t('admin.categories.title')}</h2>
            <Button
              type="button"
              onClick={() => setCreateCategoryModalOpen(true)}
              className="gap-2 max-sm:w-full"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              {t('admin.categories.actions.createCategory')}
            </Button>
          </div>

          {/* Lista de categorías */}
          <div className="mt-4">
            {categoriesQuery.isLoading ? (
              <Card className="p-8 text-center text-ink-soft">
                <span className="font-mono text-xs text-ink-soft">Cargando categorías…</span>
              </Card>
            ) : (categoriesQuery.data as { categories: AdminCategoryItem[] } | undefined)?.categories.length === 0 ? (
              <Card className="p-8 text-center text-ink-soft">
                {t('admin.categories.empty')}
              </Card>
            ) : (
              <div className="space-y-4">
                {(categoriesQuery.data as { categories: AdminCategoryItem[] } | undefined)?.categories
                  .filter((c) => !c.parentId)
                  .map((rootCat) => (
                    <CategoryCard
                      key={rootCat.id}
                      category={rootCat}
                      allCategories={(categoriesQuery.data as { categories: AdminCategoryItem[] } | undefined)?.categories ?? []}
                      onEdit={(cat) => setEditingCategory(cat)}
                      onAddSubcategory={(parent) => setCreateCategoryModalOpen({ parentId: parent.id })}
                      onDelete={(cat) => setDeletingCategory(cat)}
                    />
                  ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Modal: Crear Usuario / Proveedor */}
      {createUserModalOpen && (
        <CreateUserModal
          categories={allCategoriesQuery.data ?? []}
          onClose={() => setCreateUserModalOpen(false)}
          onSuccess={() => {
            setCreateUserModalOpen(false)
            void queryClient.invalidateQueries({ queryKey: ['admin'] })
            showAlert('success', t('admin.messages.createdSuccess'))
          }}
        />
      )}

      {/* Modal: Modificar Usuario */}
      {editingUser && (
        <EditUserModal
          user={editingUser}
          categories={allCategoriesQuery.data ?? []}
          onClose={() => setEditingUser(null)}
          onSuccess={() => {
            setEditingUser(null)
            void queryClient.invalidateQueries({ queryKey: ['admin'] })
            showAlert('success', t('admin.messages.updatedSuccess'))
          }}
        />
      )}

      {/* Modal: Crear/Editar Categoría */}
      {createCategoryModalOpen && (
        <CreateCategoryModal
          rootCategories={(categoriesQuery.data as { categories: AdminCategoryItem[] } | undefined)?.categories.filter((c) => !c.parentId) ?? []}
          initialParentId={typeof createCategoryModalOpen === 'object' ? createCategoryModalOpen.parentId : undefined}
          onClose={() => setCreateCategoryModalOpen(false)}
          onSuccess={() => {
            setCreateCategoryModalOpen(false)
            void queryClient.invalidateQueries({ queryKey: ['admin', 'categories'] })
            showAlert('success', t('admin.categories.messages.createdSuccess'))
          }}
        />
      )}

      {/* Modal: Editar Categoría */}
      {editingCategory && (
        <EditCategoryModal
          category={editingCategory}
          rootCategories={(categoriesQuery.data as { categories: AdminCategoryItem[] } | undefined)?.categories.filter((c) => !c.parentId) ?? []}
          allCategories={(categoriesQuery.data as { categories: AdminCategoryItem[] } | undefined)?.categories ?? []}
          onClose={() => setEditingCategory(null)}
          onSuccess={() => {
            setEditingCategory(null)
            void queryClient.invalidateQueries({ queryKey: ['admin', 'categories'] })
            showAlert('success', t('admin.categories.messages.updatedSuccess'))
          }}
        />
      )}

      {/* Modal: Confirmar Eliminación Categoría */}
      {deletingCategory && (
        <Dialog open={true} onOpenChange={(open) => !open && setDeletingCategory(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3 text-clay">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-clay/10">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                {t('admin.categories.modal.deleteTitle')}
              </DialogTitle>
              <DialogDescription>
                {deletingCategory._count.children > 0
                  ? t('admin.categories.modal.deleteWarningChildren', { count: deletingCategory._count.children })
                  : deletingCategory._count.services > 0
                  ? t('admin.categories.modal.deleteWarningServices', { count: deletingCategory._count.services })
                  : t('admin.categories.modal.deleteWarning')}
              </DialogDescription>
            </DialogHeader>
            <div className="mt-3 rounded-control border border-line bg-paper p-3 font-mono text-xs">
              <b>{deletingCategory.name}</b> ({deletingCategory.slug})
              <div className="mt-1 text-[10px] text-ink-soft">
                Proveedores: {deletingCategory._count.profiles} · Servicios: {deletingCategory._count.services}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeletingCategory(null)}>
                {t('admin.actions.cancel')}
              </Button>
              <Button
                variant="destructive"
                isLoading={deleteCategoryMutation.isPending}
                onClick={() => deleteCategoryMutation.mutate(deletingCategory.id)}
              >
                {deleteCategoryMutation.isPending ? 'Eliminando…' : t('admin.actions.confirmDelete')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </main>
  )
}

// ----------------------------------------------------------------------------
// Subcomponente: Modal para Crear Usuario
// ----------------------------------------------------------------------------
function CreateUserModal({
  categories,
  onClose,
  onSuccess,
}: {
  categories: { id: string; name: string; children?: { id: string; name: string }[] }[]
  onClose: () => void
  onSuccess: () => void
}) {
  const { t } = useTranslation()
  const [roleType, setRoleType] = useState<'CLIENT' | 'PROVIDER' | 'ADMIN'>('CLIENT')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [phone, setPhone] = useState('')
  const [city, setCity] = useState('')
  const [address, setAddress] = useState('')
  // Campos de Proveedor
  const [businessName, setBusinessName] = useState('')
  const [headline, setHeadline] = useState('')
  const [radiusKm, setRadiusKm] = useState(5)
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([])
  const [verifStatus, setVerifStatus] = useState<'NONE' | 'PENDING' | 'VERIFIED'>('VERIFIED')
  const [error, setError] = useState<string | null>(null)

  const createMutation = useMutation({
    mutationFn: (data: AdminCreateUserInput) => api.admin.createUser(data),
    onSuccess: () => onSuccess(),
    onError: (err: Error) => setError(err.message),
  })

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    const roles: ('CLIENT' | 'PROVIDER' | 'ADMIN')[] = [roleType]
    if (roleType === 'PROVIDER') roles.push('CLIENT')

    createMutation.mutate({
      name,
      email,
      password,
      phone: phone || null,
      city: city || null,
      address: address || null,
      roles,
      businessName: roleType === 'PROVIDER' ? businessName || name : null,
      headline: roleType === 'PROVIDER' ? headline || null : null,
      serviceRadiusKm: radiusKm,
      verificationStatus: roleType === 'PROVIDER' ? verifStatus : undefined,
      categoryIds: roleType === 'PROVIDER' ? selectedCategoryIds : undefined,
    })
  }

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('admin.modal.createTitle')}</DialogTitle>
        </DialogHeader>

        {error && <Alert variant="destructive" className="mt-4 text-xs">{error}</Alert>}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Selector de Tipo de Usuario */}
          <div>
            <label className="block text-xs font-semibold uppercase text-ink-soft">
              Tipo de Usuario
            </label>
            <div className="mt-1 grid grid-cols-3 gap-2">
              {(['CLIENT', 'PROVIDER', 'ADMIN'] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setRoleType(type)}
                  className={`cursor-pointer rounded-control border py-2 text-xs font-medium transition-colors ${
                    roleType === type
                      ? 'border-moss bg-moss-soft text-moss font-semibold'
                      : 'border-line bg-paper text-ink-soft hover:bg-paper/70'
                  }`}
                >
                  {type === 'CLIENT'
                    ? t('admin.modal.typeClient')
                    : type === 'PROVIDER'
                      ? t('admin.modal.typeProvider')
                      : t('admin.modal.typeAdmin')}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-ink-soft">{t('admin.modal.name')} *</label>
              <Input
                required
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-soft">{t('admin.modal.email')} *</label>
              <Input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-ink-soft">{t('admin.modal.password')} *</label>
              <Input
                required
                type="password"
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('admin.modal.passwordHint')}
                className="mt-1"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-soft">{t('admin.modal.phone')}</label>
              <Input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+503 7000 0000"
                className="mt-1"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-ink-soft">{t('admin.modal.city')}</label>
              <Input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="San Salvador, Santa Tecla…"
                className="mt-1"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-soft">{t('admin.modal.address')}</label>
              <Input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          {/* Campos específicos de Proveedor */}
          {roleType === 'PROVIDER' && (
            <div className="mt-4 rounded-control border border-moss/30 bg-moss-soft/20 p-4 space-y-3">
              <h3 className="font-display text-xs font-semibold uppercase tracking-wider text-moss">
                Datos del Perfil Profesional
              </h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-ink-soft">
                    {t('admin.modal.businessName')}
                  </label>
                  <Input
                    type="text"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder={name || 'Nombre comercial'}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink-soft">
                    {t('admin.modal.verificationStatus')}
                  </label>
                  <select
                    value={verifStatus}
                    onChange={(e) => setVerifStatus(e.target.value as 'NONE' | 'PENDING' | 'VERIFIED')}
                    className="mt-1 w-full rounded-control border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-moss"
                  >
                    <option value="VERIFIED">{t('admin.badges.verified')}</option>
                    <option value="PENDING">{t('admin.badges.pending')}</option>
                    <option value="NONE">{t('admin.badges.none')}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-soft">{t('admin.modal.headline')}</label>
                <Input
                  type="text"
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  placeholder="Ej: Plomería y fontanería 24/7 con garantía"
                  className="mt-1"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-ink-soft">
                    {t('admin.modal.radius')}: {radiusKm} km
                  </label>
                  <input
                    type="range"
                    min={1}
                    max={30}
                    value={radiusKm}
                    onChange={(e) => setRadiusKm(Number(e.target.value))}
                    className="mt-2 w-full accent-moss"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink-soft">
                    {t('admin.modal.categories')}
                  </label>
                  <div className="mt-1 max-h-28 overflow-y-auto rounded-control border border-line bg-paper p-2 text-xs">
                    {categories.flatMap((cat) => cat.children ?? [cat]).map((sub) => (
                      <label key={sub.id} className="flex items-center gap-2 py-0.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedCategoryIds.includes(sub.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedCategoryIds((prev) => [...prev, sub.id])
                            } else {
                              setSelectedCategoryIds((prev) => prev.filter((id) => id !== sub.id))
                            }
                          }}
                          className="accent-moss"
                        />
                        <span>{sub.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="mt-6 border-t border-line pt-4">
            <Button variant="outline" type="button" onClick={onClose}>{t('admin.actions.cancel')}</Button>
            <Button type="submit" isLoading={createMutation.isPending}>
              {createMutation.isPending ? 'Guardando…' : t('admin.actions.createUser')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ----------------------------------------------------------------------------
// Subcomponente: Modal para Modificar Usuario
// ----------------------------------------------------------------------------
function EditUserModal({
  user,
  categories,
  onClose,
  onSuccess,
}: {
  user: AdminUserItem
  categories: { id: string; name: string; children?: { id: string; name: string }[] }[]
  onClose: () => void
  onSuccess: () => void
}) {
  const { t } = useTranslation()
  const [name, setName] = useState(user.name)
  const [email, setEmail] = useState(user.email)
  const [phone, setPhone] = useState(user.phone || '')
  const [city, setCity] = useState(user.city || '')
  const [address, setAddress] = useState(user.address || '')
  const [newPassword, setNewPassword] = useState('')
  const [roles, setRoles] = useState<('CLIENT' | 'PROVIDER' | 'ADMIN')[]>(user.roles)

  // Proveedor
  const hasProvider = roles.includes('PROVIDER')
  const [businessName, setBusinessName] = useState(user.providerProfile?.businessName || '')
  const [headline, setHeadline] = useState(user.providerProfile?.headline || '')
  const [radiusKm, setRadiusKm] = useState(user.providerProfile?.serviceRadiusKm || 5)
  const [verifStatus, setVerifStatus] = useState<'NONE' | 'PENDING' | 'VERIFIED'>(
    user.providerProfile?.verificationStatus || 'NONE',
  )
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>(
    user.providerProfile?.categories.map((c) => c.id) || [],
  )
  const [error, setError] = useState<string | null>(null)

  const updateMutation = useMutation({
    mutationFn: (data: AdminUpdateUserInput) => api.admin.updateUser(user.id, data),
    onSuccess: () => onSuccess(),
    onError: (err: Error) => setError(err.message),
  })

  function toggleRole(role: 'CLIENT' | 'PROVIDER' | 'ADMIN') {
    setRoles((prev) => {
      if (prev.includes(role)) {
        if (prev.length === 1) return prev // evitar dejar sin ningún rol
        return prev.filter((r) => r !== role)
      }
      return [...prev, role]
    })
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    updateMutation.mutate({
      name,
      email,
      phone: phone || null,
      city: city || null,
      address: address || null,
      password: newPassword.trim() ? newPassword.trim() : null,
      roles,
      businessName: hasProvider ? businessName || name : undefined,
      headline: hasProvider ? headline || null : undefined,
      serviceRadiusKm: hasProvider ? radiusKm : undefined,
      verificationStatus: hasProvider ? verifStatus : undefined,
      categoryIds: hasProvider ? selectedCategoryIds : undefined,
    })
  }

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('admin.modal.editTitle')}</DialogTitle>
        </DialogHeader>

        {error && <Alert variant="destructive" className="mt-4 text-xs">{error}</Alert>}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Roles */}
          <div>
            <label className="block text-xs font-semibold uppercase text-ink-soft">
              {t('admin.modal.roles')}
            </label>
            <div className="mt-1 flex flex-wrap gap-2">
              {(['CLIENT', 'PROVIDER', 'ADMIN'] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => toggleRole(r)}
                  className={`cursor-pointer rounded-control border px-3 py-1.5 text-xs font-medium transition-colors ${
                    roles.includes(r)
                      ? 'border-moss bg-moss-soft text-moss font-semibold'
                      : 'border-line bg-paper text-ink-soft hover:bg-paper/70'
                  }`}
                >
                  ✓ {r}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-ink-soft">{t('admin.modal.name')} *</label>
              <Input
                required
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-soft">{t('admin.modal.email')} *</label>
              <Input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-ink-soft">
                {t('admin.modal.password')} ({t('admin.modal.passwordEditHint')})
              </label>
              <Input
                type="password"
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="mt-1"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-soft">{t('admin.modal.phone')}</label>
              <Input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-ink-soft">{t('admin.modal.city')}</label>
              <Input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-soft">{t('admin.modal.address')}</label>
              <Input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          {/* Sección de Proveedor si tiene rol PROVIDER */}
          {hasProvider && (
            <div className="mt-4 rounded-control border border-moss/30 bg-moss-soft/20 p-4 space-y-3">
              <h3 className="font-display text-xs font-semibold uppercase tracking-wider text-moss">
                Datos del Perfil Profesional
              </h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-ink-soft">
                    {t('admin.modal.businessName')}
                  </label>
                  <Input
                    type="text"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink-soft">
                    {t('admin.modal.verificationStatus')}
                  </label>
                  <select
                    value={verifStatus}
                    onChange={(e) => setVerifStatus(e.target.value as 'NONE' | 'PENDING' | 'VERIFIED')}
                    className="mt-1 w-full rounded-control border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-moss"
                  >
                    <option value="VERIFIED">{t('admin.badges.verified')}</option>
                    <option value="PENDING">{t('admin.badges.pending')}</option>
                    <option value="NONE">{t('admin.badges.none')}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-soft">{t('admin.modal.headline')}</label>
                <Input
                  type="text"
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-ink-soft">
                    {t('admin.modal.radius')}: {radiusKm} km
                  </label>
                  <input
                    type="range"
                    min={1}
                    max={30}
                    value={radiusKm}
                    onChange={(e) => setRadiusKm(Number(e.target.value))}
                    className="mt-2 w-full accent-moss"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink-soft">
                    {t('admin.modal.categories')}
                  </label>
                  <div className="mt-1 max-h-28 overflow-y-auto rounded-control border border-line bg-paper p-2 text-xs">
                    {categories.flatMap((cat) => cat.children ?? [cat]).map((sub) => (
                      <label key={sub.id} className="flex items-center gap-2 py-0.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedCategoryIds.includes(sub.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedCategoryIds((prev) => [...prev, sub.id])
                            } else {
                              setSelectedCategoryIds((prev) => prev.filter((id) => id !== sub.id))
                            }
                          }}
                          className="accent-moss"
                        />
                        <span>{sub.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="mt-6 border-t border-line pt-4">
            <Button variant="outline" type="button" onClick={onClose}>{t('admin.actions.cancel')}</Button>
            <Button type="submit" isLoading={updateMutation.isPending}>
              {updateMutation.isPending ? 'Guardando…' : t('admin.actions.save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ----------------------------------------------------------------------------
// Componente: Tarjeta de Categoría con subcategorías anidadas
// ----------------------------------------------------------------------------
function CategoryCard({
  category,
  allCategories,
  onEdit,
  onAddSubcategory,
  onDelete,
}: {
  category: AdminCategoryItem
  allCategories: AdminCategoryItem[]
  onEdit: (cat: AdminCategoryItem) => void
  onAddSubcategory: (parent: AdminCategoryItem) => void
  onDelete: (cat: AdminCategoryItem) => void
}) {
  const { t } = useTranslation()
  const isRoot = !category.parentId
  const children = allCategories.filter((c) => c.parentId === category.id)
  const [expanded, setExpanded] = useState(true)

  return (
    <Card className="overflow-hidden">
      {/* Categoría Principal */}
      <div className="p-4 border-b border-line cursor-pointer hover:bg-paper/50" onClick={() => isRoot && children.length > 0 && setExpanded(!expanded)}>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control bg-moss-soft text-moss">
            {category.icon ? (
              <span className="text-xl">{category.icon}</span>
            ) : (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <b className="font-medium text-carbon truncate">{category.name}</b>
              <span className="font-mono text-xs text-ink-soft bg-paper px-2 py-0.5 rounded-control">{category.slug}</span>
              {isRoot && (
                <span className="rounded-full bg-moss/10 px-2 py-0.5 font-mono text-[10px] font-bold text-moss">
                  {t('admin.categories.rootBadge')}
                </span>
              )}
            </div>
            <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-ink-soft">
              <span className="flex items-center gap-1">
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                {category._count.profiles} {t('admin.categories.labels.providers')}
              </span>
              <span className="flex items-center gap-1">
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                {category._count.services} {t('admin.categories.labels.services')}
              </span>
              {category._count.children > 0 && (
                <span className="flex items-center gap-1 text-moss">
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                  {category._count.children} {t('admin.categories.labels.subcategories')}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            {isRoot && children.length > 0 && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
                className="cursor-pointer rounded-md p-1.5 text-ink-soft transition-colors hover:bg-moss-soft hover:text-moss"
                title={expanded ? 'Contraer' : 'Expandir'}
              >
                <svg className={`h-4 w-4 transition-transform ${expanded ? '' : '-rotate-90'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            )}
            {isRoot && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onAddSubcategory(category); }}
                className="cursor-pointer rounded-md p-1.5 text-ink-soft transition-colors hover:bg-moss-soft hover:text-moss"
                title={t('admin.categories.actions.addSubcategory')}
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              </button>
            )}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onEdit(category); }}
              className="cursor-pointer rounded-md p-1.5 text-ink-soft transition-colors hover:bg-moss-soft hover:text-moss"
              title={t('admin.actions.edit')}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onDelete(category); }}
              className="cursor-pointer rounded-md p-1.5 text-ink-soft transition-colors hover:bg-clay/10 hover:text-clay"
              title={t('admin.actions.delete')}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Subcategorías */}
      {isRoot && children.length > 0 && expanded && (
        <div className="pl-10 border-l border-line divide-y divide-line animate-in slide-in-from-top-2 duration-200">
          {children.map((child) => (
            <div key={child.id} className="p-3 flex items-center gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-control bg-clay/10 text-clay">
                {child.icon ? (
                  <span className="text-sm">{child.icon}</span>
                ) : (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h8a1 1 0 001-1z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16H6a1 1 0 00-1 1v4a1 1 0 001 1h8a1 1 0 001-1v-4a1 1 0 00-1-1z" /></svg>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <b className="text-sm font-medium text-carbon truncate">{child.name}</b>
                  <span className="font-mono text-[10px] text-ink-soft bg-paper px-1.5 py-0.5 rounded-control">{child.slug}</span>
                </div>
                <div className="flex flex-wrap gap-2 text-[10px] text-ink-soft">
                  <span>👥 {child._count.profiles}</span>
                  <span>📦 {child._count.services}</span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onEdit(child)}
                  className="cursor-pointer rounded-md p-1 text-ink-soft transition-colors hover:bg-moss-soft hover:text-moss"
                  title={t('admin.actions.edit')}
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(child)}
                  className="cursor-pointer rounded-md p-1 text-ink-soft transition-colors hover:bg-clay/10 hover:text-clay"
                  title={t('admin.actions.delete')}
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

// ----------------------------------------------------------------------------
// Subcomponente: Modal para Crear Categoría
// ----------------------------------------------------------------------------
function CreateCategoryModal({
  rootCategories,
  initialParentId,
  onClose,
  onSuccess,
}: {
  rootCategories: AdminCategoryItem[]
  initialParentId?: string
  onClose: () => void
  onSuccess: () => void
}) {
  const { t } = useTranslation()
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [icon, setIcon] = useState('')
  const [parentId, setParentId] = useState<string | null>(initialParentId ?? null)
  const [error, setError] = useState<string | null>(null)

  const createMutation = useMutation({
    mutationFn: (data: AdminCreateCategoryInput) => api.admin.createCategory(data),
    onSuccess: () => onSuccess(),
    onError: (err: Error) => setError(err.message),
  })

  function generateSlug(input: string): string {
    return input
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
  }

  function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    setName(e.target.value)
    if (!slug || slug === generateSlug(name)) {
      setSlug(generateSlug(e.target.value))
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    createMutation.mutate({ name, slug: slug || undefined, icon: icon || null, parentId })
  }

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {parentId ? t('admin.categories.modal.createSubcategoryTitle') : t('admin.categories.modal.createCategoryTitle')}
          </DialogTitle>
        </DialogHeader>

        {error && <Alert variant="destructive" className="mt-4 text-xs">{error}</Alert>}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-ink-soft">{t('admin.categories.form.name')} *</label>
            <Input
              required
              type="text"
              value={name}
              onChange={handleNameChange}
              className="mt-1"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink-soft">{t('admin.categories.form.slug')}</label>
            <Input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="mt-1"
              placeholder={t('admin.categories.form.slugPlaceholder')}
            />
            <p className="mt-1 text-xs text-ink-soft">{t('admin.categories.form.slugHint')}</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink-soft">{t('admin.categories.form.icon')}</label>
            <Input
              type="text"
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              maxLength={2}
              className="mt-1"
              placeholder="🏠"
            />
            <p className="mt-1 text-xs text-ink-soft">{t('admin.categories.form.iconHint')}</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink-soft">{t('admin.categories.form.parentCategory')}</label>
            <select
              value={parentId ?? ''}
              onChange={(e) => setParentId(e.target.value || null)}
              className="mt-1 w-full rounded-control border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-moss"
            >
              <option value="">{t('admin.categories.form.noParent')}</option>
              {rootCategories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-ink-soft">{t('admin.categories.form.parentHint')}</p>
          </div>

<DialogFooter className="mt-6 border-t border-line pt-4">
            <Button variant="outline" type="button" onClick={onClose}>{t('admin.actions.cancel')}</Button>
            <Button type="submit" isLoading={createMutation.isPending}>
              {createMutation.isPending ? 'Guardando…' : t('admin.actions.createCategory')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ----------------------------------------------------------------------------
// Subcomponente: Modal para Editar Categoría
// ----------------------------------------------------------------------------
function EditCategoryModal({
  category,
  rootCategories,
  allCategories,
  onClose,
  onSuccess,
}: {
  category: AdminCategoryItem
  rootCategories: AdminCategoryItem[]
  allCategories: AdminCategoryItem[]
  onClose: () => void
  onSuccess: () => void
}) {
  const { t } = useTranslation()
  const [name, setName] = useState(category.name)
  const [slug, setSlug] = useState(category.slug)
  const [icon, setIcon] = useState(category.icon ?? '')
  const [parentId, setParentId] = useState(category.parentId ?? '')
  const [error, setError] = useState<string | null>(null)

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: AdminUpdateCategoryInput }) =>
      api.admin.updateCategory(id, data),
    onSuccess: () => onSuccess(),
    onError: (err: Error) => setError(err.message),
  })

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    updateMutation.mutate({
      id: category.id,
      data: { name, slug: slug || undefined, icon: icon || null, parentId: parentId || null },
    })
  }

  // Filtrar para que no pueda ser padre de sí misma ni de sus hijas
  const availableParents = rootCategories.filter(
    (c) => c.id !== category.id && !isDescendant(category.id, c.id, allCategories)
  )

  function isDescendant(childId: string, potentialParentId: string, allCats: AdminCategoryItem[]): boolean {
    const child = allCats.find((c) => c.id === childId)
    if (!child || !child.parentId) return false
    if (child.parentId === potentialParentId) return true
    return isDescendant(child.parentId, potentialParentId, allCats)
  }

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('admin.categories.modal.editTitle')}</DialogTitle>
        </DialogHeader>

        {error && <Alert variant="destructive" className="mt-4 text-xs">{error}</Alert>}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-ink-soft">{t('admin.categories.form.name')} *</label>
            <Input
              required
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink-soft">{t('admin.categories.form.slug')}</label>
            <Input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="mt-1"
            />

            <p className="mt-1 text-xs text-ink-soft">{t('admin.categories.form.slugHint')}</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink-soft">{t('admin.categories.form.icon')}</label>
            <Input
              type="text"
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              maxLength={2}
              className="mt-1"
            />
            <p className="mt-1 text-xs text-ink-soft">{t('admin.categories.form.iconHint')}</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink-soft">{t('admin.categories.form.parentCategory')}</label>
            <select
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
              className="mt-1 w-full rounded-control border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-moss"
            >
              <option value="">{t('admin.categories.form.noParent')}</option>
              {availableParents.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-ink-soft">{t('admin.categories.form.parentHint')}</p>
          </div>

          <DialogFooter className="mt-6 border-t border-line pt-4">
            <Button variant="outline" type="button" onClick={onClose}>{t('admin.actions.cancel')}</Button>
            <Button type="submit" isLoading={updateMutation.isPending}>
              {updateMutation.isPending ? 'Guardando…' : t('admin.actions.save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
