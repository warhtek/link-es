# Progreso de desarrollo — Link-ES

> Documento de seguimiento generado el **22/08/2026** · última actualización **23/08/2026**.
> Plan maestro: `../PlanDesarrolloApp/plan-desarrollo-link-es.md` · Referencia visual: `../PlanDesarrolloApp/mockup-link-es-v2.html`

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

---

## ⬜ Lo faltante por realizar

### Pendientes inmediatos (cierre de Fase 0)

- [x] **Primer commit** — historial iniciado con commits por feature (chore/feat/docs)
- [x] **Levantar Postgres y primera migración** — `docker compose up -d` + migración `init` aplicada
- [x] **Seed de datos de prueba** — categorías, proveedores con coordenadas, servicios, reseñas
- [x] Conectar health check de la API a Prisma — verificación real de DB con `SELECT 1`

### Roadmap restante (según sección 8 del plan)

| Fase | Contenido | Estado |
|---|---|---|
| ~~0. Setup~~ | Monorepo, sistema de diseño, i18n, CI | ✅ Completada |
| **1. Auth y usuarios** | Registro/login (JWT + refresh), roles CLIENT/PROVIDER, cambio de modo, perfil básico | ⬜ Pendiente |
| **2. Onboarding de proveedor** | Formulario de negocio, categorías, subida de documentos, estado de verificación | ⬜ Pendiente |
| **3. Catálogo público + mapa** | Home, búsqueda por texto, geolocalización, vista lista/mapa dividida, filtro de radio, perfil público · Mapbox GL JS + PostGIS (`ST_DWithin`) · instalar TanStack Query y shadcn/ui | ⬜ Pendiente |
| **4. Reservas/Solicitudes** | Crear solicitud, aceptar/rechazar, estados, historial | ⬜ Pendiente |
| **5. Chat** | Mensajería en tiempo real (Socket.io) ligada a solicitudes | ⬜ Pendiente |
| **6. Calificaciones** | Review post-servicio, promedio visible en catálogo | ⬜ Pendiente |
| **7. Suscripciones/pagos** | Stripe Billing + Connect, planes FREE/PRO/PREMIUM, visibilidad bloqueada sin plan activo | ⬜ Pendiente |
| **8. Panel admin** | Revisión de documentos, gestión de categorías/usuarios, métricas | ⬜ Pendiente |
| **9. Pulido y performance** | Accesibilidad, estados vacíos, optimización de imágenes, PWA | ⬜ Pendiente |

### Deuda técnica conocida

- No hay tests automatizados todavía (solo lint/typecheck/build en CI)
- El bundle JS de web (~300 kB) se puede reducir con code-splitting cuando crezcan las rutas
- SEO: la SPA no hace SSR; si el catálogo público necesita posicionamiento, migrar rutas públicas a React Router v7 modo framework (plan sección 4)

---

## Comandos rápidos

```bash
cd web && npm run dev        # Frontend → http://localhost:5173
cd api && npm run dev        # API      → http://localhost:4000/api/health
docker compose up -d         # PostgreSQL local (raíz del repo)
cd api && npx prisma db seed # Datos de prueba (categorías, proveedores, reseñas)
```
