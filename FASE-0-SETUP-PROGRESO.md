# Fase 0 — Setup + sistema de diseño · PROGRESO

> Documento de cierre de fase. Estado: **COMPLETADA** (23/08/2026).
> Seguimiento global: [`PROGRESO.md`](./PROGRESO.md) · Plan maestro: `../PlanDesarrolloApp/plan-desarrollo-link-es.md`

---

## ✅ Lo realizado

### Estructura creada en `link-es/`

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
    ├── src/server.ts          # GET /api/health
    └── prisma/schema.prisma   # 11 entidades del modelo de datos (sección 5 del plan)
```

### Detalle por área

| Área | Entregado |
|---|---|
| **Sistema de diseño** | Los 8 tokens (carbon, paper, panel, moss, moss-soft, clay, line, ink-soft) como variables CSS con par claro/oscuro; expuestos a Tailwind vía `@theme inline` (`bg-panel`, `text-clay`…). Tipografías Space Grotesk / Inter / IBM Plex Mono. Radios 10–12px, bordes 1px sin sombras |
| **Tema** | Interruptor de 3 estados (claro / oscuro / automático según `prefers-color-scheme`), persistido en `localStorage['link-es-theme']`, aplicado antes del primer render (sin flash) |
| **i18n** | ES/EN con detección del navegador y fallback a español, persistido en `localStorage['link-es-lang']`; toda la UI pasa por diccionarios |
| **Página `/design-system`** | Paleta interactiva, muestras tipográficas, botones, chips, inputs, cards de proveedor con distancia en mono y **anillo de proximidad animado** (elemento de firma) |
| **Backend** | Express 5 + TS, health endpoint; Prisma client generado desde schema válido con User, ProviderProfile, VerificationDocument, Category, Service, Booking, Review, Conversation, Message, Subscription, Address |
| **Infra** | Postgres vía docker-compose, workflow CI, `.gitignore`, repo git inicializado |

### Cierre de pendientes (23/08/2026)

| Entregado | Detalle |
|---|---|
| **PostgreSQL levantado** | `docker compose up -d` con Postgres 16 (contenedor `link-es-db-1`, volumen persistente). Plugin Compose instalado a nivel de usuario en `~/.docker/cli-plugins/docker-compose` v5.5.0 (sin sudo) |
| **Migración inicial** | `npx prisma migrate dev --name init` aplicada (`20260823163800_init`, 11 tablas). Config de Prisma migrada a `api/prisma.config.ts` (seed + dotenv) por deprecación de `package.json#prisma` |
| **Seed de datos** | `api/prisma/seed.ts` idempotente: 5 categorías raíz + 12 subcategorías, 8 proveedores alrededor de San Salvador/Santa Tecla con coordenadas y radio, servicios con precio, suscripciones PRO/PREMIUM, documentos DUI pendientes, reservas COMPLETED + reseñas coherentes. Usuarios de prueba con contraseña `password123`: clientes `laura@linkes.dev` / `pedro@linkes.dev`, proveedores `maria.plomeria@linkes.dev` … `miguel.pintura@linkes.dev`. Ejecutar con `npx prisma db seed` |
| **Health check real** | `GET /api/health` verifica conexión con `SELECT 1` vía Prisma → `{"status":"ok","db":"up"}` (503 si falla); cierre graceful. Dependencia `bcryptjs` añadida |

---

## Verificaciones ejecutadas

- [x] Seed OK: 10 usuarios · 8 proveedores · 17 categorías · 10 servicios
- [x] `prisma migrate status`: base de datos sincronizada
- [x] `api`: typecheck OK · build OK · health responde con DB arriba
- [x] `web`: build de producción OK · lint (oxlint) sin errores · dev server responde en `/design-system`

## Resultado

Frontend y backend corriendo en local, cambio de tema e idioma funcionando, página `/design-system` con los tokens del plan. Base lista para Fase 1.
