# Progreso de desarrollo — Link-ES

> Documento de seguimiento global · última actualización **24/08/2026**.
> Plan maestro: `../PlanDesarrolloApp/plan-desarrollo-link-es.md` · Referencia visual: `../PlanDesarrolloApp/mockup-link-es-v2.html`

**Convención**: cada fase terminada genera su propio documento `FASE-<n>-<slug>-PROGRESO.md` en la raíz del repo; este archivo queda como índice y estado general.

| Fase | Documento de cierre |
|---|---|
| 0. Setup + sistema de diseño | [`FASE-0-SETUP-PROGRESO.md`](./FASE-0-SETUP-PROGRESO.md) |
| 1. Auth y usuarios | [`FASE-1-AUTH-USUARIOS-PROGRESO.md`](./FASE-1-AUTH-USUARIOS-PROGRESO.md) |
| 2. Onboarding de proveedor | [`FASE-2-ONBOARDING-PROVEEDOR-PROGRESO.md`](./FASE-2-ONBOARDING-PROVEEDOR-PROGRESO.md) |
| 3. Catálogo público + mapa | [`FASE-3-CATALOGO-MAPA-PROGRESO.md`](./FASE-3-CATALOGO-MAPA-PROGRESO.md) |
| 4. Reservas/Solicitudes | [`FASE-4-RESERVAS-SOLICITUDES-PROGRESO.md`](./FASE-4-RESERVAS-SOLICITUDES-PROGRESO.md) |

---

## ✅ Lo realizado

### Fase 0 — Setup + sistema de diseño **(COMPLETADA)**

Estructura creada en `/home/walter/Documents/CREATIAES/WebAppProfesionales/link-es/`:

```
link-es/
├── AGENTS.md                  # Contexto permanente para agentes (stack, tokens, convenciones)
├── docker-compose.yml         # PostgreSQL 16 local (user/pass/db: link_es)
├── .github/workflows/ci.yml   # CI básico: lint+build web, generate+typecheck+build api
├── .gitignore
├── web/                       # Frontend React
│   └── src/
│       ├── index.css          # Tokens claro/oscuro + @theme inline para Tailwind v4
│       ├── App.tsx            # Rutas (/ → /design-system)
│       ├── components/Topbar.tsx      # Marca + selector idioma ES/EN + tema 3 estados
│       ├── pages/DesignSystem.tsx     # Página del sistema de diseño
│       ├── lib/theme.ts               # light/dark/system persistido, sin flash al cargar
│       └── i18n/                      # react-i18next + locales/{es,en}.json
└── api/                       # Backend Express
    ├── src/server.ts          # GET /api/health + CORS → Vite
    └── prisma/schema.prisma   # 11 entidades del modelo de datos (sección 5 del plan)
```

#### Detalle por área

| Área | Entregado |
|---|---|
| **Sistema de diseño** | Los 8 tokens (carbon, paper, panel, moss, moss-soft, clay, line, ink-soft) como variables CSS con par claro/oscuro; expuestos a Tailwind vía `@theme inline` (`bg-panel`, `text-clay`…). Tipografías Space Grotesk / Inter / IBM Plex Mono. Radios 10–12px, bordes 1px sin sombras |
| **Tema** | Interruptor de 3 estados (claro / oscuro / automático según `prefers-color-scheme`), persistido en `localStorage['link-es-theme']`, aplicado antes del primer render (sin flash) |
| **i18n** | ES/EN con detección del navegador y fallback a español, persistido en `localStorage['link-es-lang']`; toda la UI pasa por diccionarios |
| **Página `/design-system`** | Paleta interactiva, muestras tipográficas, botones, chips, inputs, cards de proveedor con distancia en mono y **anillo de proximidad animado** (elemento de firma) |
| **Backend** | Express 5 + TS, health endpoint verificado; Prisma client generado desde schema válido con User, ProviderProfile, VerificationDocument, Category, Service, Booking, Review, Conversation, Message, Subscription, Address |
| **Infra** | Postgres vía docker-compose, workflow CI, `.gitignore`, repo git inicializado |

#### Verificaciones ejecutadas

- [x] `web`: build de producción OK · lint (oxlint) sin errores · dev server responde en `/design-system`
- [x] `api`: typecheck OK · build OK · `GET /api/health` responde `{"status":"ok"}`
- [x] Schema Prisma validado (`prisma validate`) y cliente generado

### Fase 0 — Cierre de pendientes **(COMPLETADA 23/08/2026)**

| Entregado | Detalle |
|---|---|
| **PostgreSQL levantado** | `docker compose up -d` con Postgres 16 (contenedor `link-es-db-1`, volumen persistente). El plugin Compose no venía instalado; se instaló a nivel de usuario en `~/.docker/cli-plugins/docker-compose` v5.5.0 (sin sudo) |
| **Migración inicial** | `npx prisma migrate dev --name init` aplicada (`20260823163800_init`, 11 tablas). Config de Prisma migrada a `api/prisma.config.ts` (seed + dotenv) por deprecación de `package.json#prisma` |
| **Seed de datos** | `api/prisma/seed.ts` idempotente: 5 categorías raíz + 12 subcategorías, 8 proveedores alrededor de San Salvador/Santa Tecla con coordenadas y radio, servicios con precio, suscripciones PRO/PREMIUM, documentos DUI pendientes para perfiles en revisión, reservas COMPLETED + reseñas coherentes con ratingAvg/ratingCount. Usuarios de prueba con contraseña `password123`: clientes `laura@linkes.dev` / `pedro@linkes.dev`, proveedores `maria.plomeria@linkes.dev` … `miguel.pintura@linkes.dev`. Ejecutar con `npx prisma db seed` |
| **Health check real** | `GET /api/health` verifica la conexión con `SELECT 1` vía Prisma → `{"status":"ok","db":"up"}` (503 + `db:down` si falla); cierre graceful con desconexión del cliente. Añadida dependencia `bcryptjs` (hash de contraseñas del seed, se reutilizará en Fase 1) |

#### Verificaciones ejecutadas

- [x] Seed OK: 10 usuarios · 8 proveedores · 17 categorías · 10 servicios
- [x] `prisma migrate status`: base de datos sincronizada
- [x] `api`: typecheck OK · build OK · health responde con DB arriba

### Fase 1 — Auth y usuarios **(COMPLETADA 24/08/2026)**

#### Backend (`api/`)

| Entregado | Detalle |
|---|---|
| **Modelo RefreshToken** | Migración `auth_refresh_tokens`: guarda solo hash SHA-256 del token, con expiración (30 días) y revocación. Cascada al borrar usuario |
| **`lib/tokens.ts`** | Access token JWT de 15 min (payload: sub, roles, mode); refresh token aleatorio de 48 bytes viajando crudo al cliente y hasheado en DB |
| **`lib/session.ts`** | Emisión de sesión completa (usuario público + tokens), **rotación de refresh** (el usado queda revocado), verificación bcrypt |
| **Rutas auth** | `POST /auth/register` (nace CLIENT, 409 si email duplicado), `POST /auth/login` (401 genérico sin revelar si existe el email), `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/me`. Validación con zod; errores JSON consistentes (`validation_error`, `email_in_use`, `invalid_credentials`) |
| **Rutas users** | `GET/PATCH /users/me` (nombre, teléfono, dirección, ciudad, código postal, locale), `PATCH /users/me/mode` (cambio CLIENT↔PROVIDER, 403 `provider_onboarding_required` si aún no tiene el rol — habilitar en fase 2) |
| **Infra** | `middleware/auth.ts` (`requireAuth`, `requireRole`), cliente Prisma compartido en `lib/prisma.ts`, error handler JSON global, secretos JWT en `.env` |

#### Frontend (`web/`)

| Entregado | Detalle |
|---|---|
| **TanStack Query** | Instalado + `QueryClientProvider`; clave `['me']` compartida por Topbar y páginas |
| **`lib/api.ts`** | Cliente fetch con Bearer automático, **refresh transparente ante 401** (una sola petición concurrente vía promesa compartida), tokens en localStorage, clase `ApiError` con códigos del backend |
| **`lib/auth.tsx`** | Hooks: `useMe`, `useLogin`, `useRegister`, `useLogout`, `useUpdateProfile`, `useSwitchMode` |
| **Páginas** | `/login`, `/registro` (validación HTML5 + mensajes de error traducidos desde códigos API), `/perfil` (cabecera de cuenta, cambio de modo con chips tipo radio, edición de datos personales con confirmación "Guardado") |
| **Protección de rutas** | `RequireAuth`: sin sesión → redirect a `/login` (verificado E2E) |
| **Topbar** | Sin sesión: botones Iniciar sesión / Crear cuenta · Con sesión: avatar con inicial → `/perfil`, Salir (desktop). El idioma elegido con sesión activa se persiste también en el perfil (`PATCH users/me locale`) |
| **Responsive** | Overflow 0px en 375/768/1280 en las tres páginas (se ocultó el indicador de tema resuelto y "Salir" en móvil; logout accesible dentro de `/perfil`) |

#### Verificaciones ejecutadas

- [x] curl: registro, login, me, PATCH perfil, cambio de modo (403 sin rol), refresh con rotación (reuso → 401), logout (204), credenciales inválidas (401), email duplicado (409)
- [x] CORS preflight 5173→4000 OK
- [x] **E2E con Chrome headless (10/10 PASS)**: registro → redirige a perfil → tokens en localStorage → recarga mantiene sesión → logout limpia → login con el usuario creado → edición de ciudad persiste tras recargar
- [x] Responsive sin overflow en 375/768/1280 en `/login`, `/registro` y `/perfil`
- [x] `api` typecheck+build OK · `web` lint+build OK

---

## ⬜ Lo faltante por realizar

### Pendientes inmediatos

- [x] ~~Fases 0, 1 y 2 completadas~~ — ver documentos por fase
- [x] ~~Fase 3 completa~~ — ver `FASE-3-CATALOGO-MAPA-PROGRESO.md` (24/08/2026)
- [x] ~~Fase 4 completa~~ — ver `FASE-4-RESERVAS-SOLICITUDES-PROGRESO.md` (24/08/2026)
- [x] Remoto GitHub configurado (`warhtek/link-es`) y push al día
- [ ] Decidir token Mapbox más adelante si se quiere el basemap premium (hoy: Leaflet+OSM sin costo)

### Roadmap restante (según sección 8 del plan)

| Fase | Contenido | Estado |
|---|---|---|
| ~~0. Setup~~ | Monorepo, sistema de diseño, i18n, CI | ✅ Completada |
| ~~1. Auth y usuarios~~ | Registro/login (JWT + refresh con rotación), roles CLIENT/PROVIDER, cambio de modo, perfil básico | ✅ Completada |
| ~~2. Onboarding de proveedor~~ | Formulario de negocio, categorías, subida de documentos, estado de verificación | ✅ Completada |
| ~~3. Catálogo público + mapa~~ | Home, búsqueda por texto, geolocalización, vista lista/mapa dividida, filtro de radio, perfil público · Leaflet+OSM (decisión vs Mapbox) + PostGIS `ST_DWithin` | ✅ Completada |
| ~~4. Reservas/Solicitudes~~ | Solicitudes con código BK-, máquina de estados por actor, historial cliente/proveedor | ✅ Completada |
| **5. Chat** | Mensajería en tiempo real (Socket.io) ligada a solicitudes · crear conversación al aceptar reserva | ⬜ Siguiente |
| **6. Calificaciones** | Review post-servicio solo sobre reservas COMPLETED, promedio visible en catálogo | ⬜ Pendiente |
| **7. Suscripciones/pagos** | Stripe Billing + Connect, planes FREE/PRO/PREMIUM, visibilidad bloqueada sin plan activo | ⬜ Pendiente |
| **8. Panel admin** | Revisión de documentos (endpoint ya emite PENDING), gestión de categorías/usuarios, métricas | ⬜ Pendiente |
| **9. Pulido y performance** | Accesibilidad, estados vacíos, optimización de imágenes, PWA | ⬜ Pendiente |

### Deuda técnica conocida

- No hay tests automatizados de integración en CI (los E2E corrieron manual con puppeteer-core + Chrome del sistema; considerar subirlos al repo)
- Documentos de verificación en disco local (`api/uploads/`): migrar a Cloudinary/S3 con URLs firmadas antes de producción
- Coordenadas de cobertura del proveedor aún sin capturar en onboarding (llega el mapa en Fase 3)
- 3 vulnerabilidades "high" reportadas por npm audit, todas en `prisma` CLI (devDependency, no runtime)
- El bundle JS de web (~350 kB) se puede reducir con code-splitting cuando crezcan las rutas
- Tokens JWT en localStorage: suficiente para el MVP; migrar a cookies httpOnly si se requiere protección extra contra XSS
- SEO: la SPA no hace SSR; si el catálogo público necesita posicionamiento, migrar rutas públicas a React Router v7 modo framework (plan sección 4)

---

## Comandos rápidos

```bash
cd web && npm run dev        # Frontend → http://localhost:5173
cd api && npm run dev        # API      → http://localhost:4000/api/health
docker compose up -d         # PostgreSQL local (raíz del repo)
cd api && npx prisma db seed # Datos de prueba (categorías, proveedores, reseñas)
```
