# Progreso de desarrollo — Link-ES

> Documento de seguimiento generado el **22/08/2026**.
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

---

## ⬜ Lo faltante por realizar

### Pendientes inmediatos (cierre de Fase 0)

- [x] **Primer commit** — historial iniciado con commits por feature (chore/feat/docs)
- [ ] **Levantar Postgres y primera migración** — `docker compose up -d` + `npx prisma migrate dev --name init`
- [ ] **Seed de datos de prueba** (proveedores con coordenadas, categorías) para probar pantallas con datos reales
- [ ] Conectar health check de la API a Prisma (verificar conexión real a DB)

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

- La API aún no usa Prisma en runtime (`server.ts` solo tiene health endpoint)
- No hay tests automatizados todavía (solo lint/typecheck/build en CI)
- El bundle JS de web (~300 kB) se puede reducir con code-splitting cuando crezcan las rutas
- SEO: la SPA no hace SSR; si el catálogo público necesita posicionamiento, migrar rutas públicas a React Router v7 modo framework (plan sección 4)

---

## Comandos rápidos

```bash
cd web && npm run dev        # Frontend → http://localhost:5173
cd api && npm run dev        # API      → http://localhost:4000/api/health
docker compose up -d         # PostgreSQL local (raíz del repo)
```
