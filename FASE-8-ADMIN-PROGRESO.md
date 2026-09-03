# Fase 8 — Panel de Administración (Clientes y Proveedores) — Link-ES

> Documento de cierre de fase · **03/09/2026**  
> Plan maestro: `../PlanDesarrolloApp/plan-desarrollo-link-es.md` (sección 8, Fase 8)  
> Índice general: [`PROGRESO.md`](./PROGRESO.md)

---

## 🎯 Objetivo de la Fase

Implementar una sección de administración accesible para usuarios con rol `ADMIN` que permita gestionar de forma integral los usuarios de la plataforma (tanto **clientes** como **proveedores**):
1. **Dar de alta / Agregar**: Creación directa de cuentas de clientes, administradores y perfiles profesionales de proveedores con categorías, radio de cobertura y verificación inicial.
2. **Consultar y filtrar**: Listado paginado con búsqueda por nombre, email, teléfono o nombre comercial, filtros por rol (`CLIENT`, `PROVIDER`, `ADMIN`) y estado de verificación.
3. **Modificar**: Edición de datos personales, asignación/revocación de roles, actualización de perfiles de proveedores, restablecimiento de contraseña y cambio de estado de verificación.
4. **Eliminar**: Eliminación segura con limpieza en cascada de registros dependientes (reservas, reseñas, mensajes, conversaciones, servicios y tokens).

---

## 🛠️ Lo realizado

### 1. Modelo de Datos y Migración (`api/prisma`)
- Se extendió el enum `Role` en `schema.prisma`:
  ```prisma
  enum Role {
    CLIENT
    PROVIDER
    ADMIN
  }
  ```
- Se generó y aplicó la migración:
  `20260903142657_add_admin_role`
- Se creó el script CLI `api/src/scripts/make-admin.ts` para promover cualquier usuario a `ADMIN` o crear la cuenta administrativa por defecto:
  ```bash
  npm --prefix api run make-admin <email>
  ```
- Se añadió la cuenta inicial de administrador en `api/prisma/seed.ts`:
  - **Email**: `admin@linkes.dev`
  - **Password**: `password123`

### 2. Backend API (`api/src/routes/admin.routes.ts`)
Rutas montadas en `/api/admin` protegidas con middleware `requireAuth` y `requireRole('ADMIN')`:
- `GET /api/admin/stats`: Métricas en tiempo real (total usuarios, clientes, proveedores, administradores, pendientes de verificación y reservas).
- `GET /api/admin/users`: Listado paginado con búsqueda insensible a mayúsculas y filtros múltiples.
- `GET /api/admin/users/:id`: Consulta de detalle completo de usuario y perfil profesional.
- `POST /api/admin/users`: Alta de usuarios con validaciones mediante `zod`, hashing con `bcryptjs` y creación condicional de `ProviderProfile`.
- `PATCH /api/admin/users/:id`: Edición de datos, roles, datos de negocio y cambio opcional de contraseña.
- `PATCH /api/admin/users/:id/verification`: Alternado rápido del estado de verificación (`VERIFIED`, `PENDING`, `NONE`).
- `DELETE /api/admin/users/:id`: Eliminación transaccional segura evitando la auto-eliminación del administrador en sesión.

### 3. Frontend Web (`web/src`)
- **Cliente API** (`web/src/lib/api.ts`): Tipos `AdminUserItem`, `AdminStats`, `AdminCreateUserInput`, `AdminUpdateUserInput` y métodos `api.admin.*`.
- **Página de Administración** (`web/src/pages/admin/AdminUsers.tsx`):
  - Tarjetas KPI superiores con alertas de verificaciones pendientes.
  - Barra de herramientas con buscador en vivo y selectores de roles y estado.
  - Tabla de usuarios responsiva con avatares, datos de contacto, insignias de rol y detalle comercial.
  - Acciones por fila: modificar, toggle de verificación y eliminar.
  - Modales dedicados para dar de alta, editar y confirmación de borrado.
- **Navegación** (`web/src/components/Topbar.tsx`): Enlace "Administración" visible exclusivamente para usuarios con rol `ADMIN`.
- **Enrutamiento** (`web/src/App.tsx`): Ruta `/admin` con redirección automática para usuarios sin permisos.

### 4. Internacionalización (`web/src/i18n`)
- Diccionarios completos en español (`es.json`) e inglés (`en.json`) para todos los textos, filtros, modales, alertas y badges del panel.

---

## 🧪 Verificaciones Ejecutadas

1. **Compilación y Tipado**:
   - `npm --prefix api run typecheck`: OK (0 errores)
   - `npm --prefix api run build`: OK (0 errores)
   - `npm --prefix web run build`: OK (0 errores)
   - `npm --prefix web run lint`: OK (oxlint sin observaciones)
2. **Pruebas Funcionales Automatizadas**:
   - Autenticación como `admin@linkes.dev` mediante token JWT.
   - Consulta a `/api/admin/stats` exitosa (HTTP 200).
   - Creación de usuario y proveedor de prueba vía `POST /api/admin/users` (HTTP 201).
   - Modificación y aprobación de verificación vía `PATCH /api/admin/users/:id` (HTTP 200).
   - Eliminación en cascada vía `DELETE /api/admin/users/:id` (HTTP 200).
