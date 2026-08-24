# AGENTS.md — Link-ES

Contexto permanente para agentes de código. No reinventar decisiones ya tomadas.

## Producto

Marketplace web que conecta clientes con profesionales independientes.
**Concepto de diseño**: directorio local verificado; "encuentra a alguien de confianza cerca de ti".
La cercanía es información central (distancias en mono, anillo de proximidad), no decoración.

Plan completo: `../PlanDesarrolloApp/plan-desarrollo-link-es.md`
Referencia visual: `../PlanDesarrolloApp/mockup-link-es-v2.html` — seguir ese sistema de diseño.

## Stack

| Capa | Elección |
|---|---|
| Frontend | React 18+ · Vite · TypeScript · Tailwind CSS v4 (`web/`) |
| Rutas | React Router v7 |
| Datos remotos | TanStack Query (cuando haya backend conectado) |
| UI | shadcn/ui + Radix (adaptados a los tokens de abajo) |
| Backend | Node · Express 5 · TypeScript (`api/`) |
| DB | PostgreSQL + Prisma |
| Auth | JWT + refresh tokens, roles CLIENT/PROVIDER/ADMIN en el token |
| Chat | Socket.io (fase 5) |
| Pagos | Stripe Billing + Connect (fase 7) |
| Mapas | Mapbox GL JS vía react-map-gl + PostGIS `ST_DWithin` (fase 3) |
| i18n | react-i18next, diccionarios ES/EN |

## Estructura

```
link-es/
├── web/                  # Frontend React
│   └── src/
│       ├── components/   # Componentes reutilizables
│       ├── pages/        # Páginas por ruta
│       ├── lib/          # Utilidades puras (theme.ts)
│       └── i18n/         # index.ts + locales/{es,en}.json
├── api/                  # Backend Express
│   ├── src/
│   └── prisma/schema.prisma
├── docker-compose.yml    # Postgres local (user/pass/db: link_es)
└── AGENTS.md
```

## Tokens de diseño (fuente de verdad: `web/src/index.css`)

Variables CSS en `:root` / `[data-theme="dark"]`, expuestas a Tailwind vía `@theme inline`.
Usar SIEMPRE clases utilitarias (`bg-panel`, `text-ink-soft`, `border-line`…), nunca hex crudo.

| Token | Claro | Oscuro | Uso |
|---|---|---|---|
| `carbon` | #171512 | #F3F1EC | Texto principal |
| `paper` | #FAF9F6 | #15140F | Fondo general |
| `panel` | #FFFFFF | #1E1C17 | Cards y paneles |
| `moss` | #2E5339 | #7FB88F | Marca / acción primaria |
| `moss-soft` | #E4ECE3 | #22322A | Fondos activos tenues |
| `clay` | #B5502E | #E08A63 | Distancias, pines, acento |
| `line` | #E7E4DC | #2C2A24 | Bordes y divisores |
| `ink-soft` | #6B675F | #A9A497 | Texto secundario |

Tipografía: **Space Grotesk** (`font-display`) títulos · **Inter** (`font-sans`) UI/cuerpo · **IBM Plex Mono** (`font-mono`) distancias, precios, códigos.

Reglas visuales: bordes de 1px en vez de sombras; radios 10–12px (`rounded-card` 12px, `rounded-control` 10px); cards rectangulares tipo ficha de directorio con distancia como dato ancla; elemento de firma = punto + anillo animado + línea punteada + etiqueta de distancia en mono.

## Convenciones

- **Idioma**: toda la UI pasa por diccionarios i18n (`t('clave')`); prohibido texto embebido. Añadir la clave a AMBOS locales (`es.json` y `en.json`). Datos de usuario no se traducen.
- **Tema**: preferencia `light | dark | system` en `localStorage['link-es-theme']`; `data-theme` en `<html>`. Idioma en `localStorage['link-es-lang']`. Nunca usar colores fijos que rompan el modo oscuro.
- **Comentarios**: solo cuando aporten contexto de negocio; sin comentarios obvios.
- **Modelo de datos**: cualquier cambio en `schema.prisma` se entrega con migración + seed para poder probar pantallas con datos reales.
- **Validación visual**: cada pantalla debe verse bien en 375px, 768px y 1280px.
- **Commits**: uno por feature, formato `feat:`/`fix:`/`chore:` en español.

## Comandos

```bash
# Web (http://localhost:5173)
cd web && npm install && npm run dev      # build: npm run build · lint: npm run lint

# API (http://localhost:4000)
cd api && npm install && npm run dev      # typecheck/build: npm run typecheck | npm run build

# Base de datos local
docker compose up -d                      # en la raíz del repo
cd api && npx prisma migrate dev --name <nombre>
```

## Estado del proyecto

Completadas: setup (0) y auth (1) — JWT access 15 min + refresh con rotación en `api/src/lib/`,
rutas `/auth/*` y `/users/me*`, cliente API con auto-refresh en `web/src/lib/api.ts`, hooks en
`web/src/lib/auth.tsx`.

Fases pendientes según roadmap del plan (sección 8): onboarding proveedor (2),
catálogo+mapa (3), reservas (4), chat (5), calificaciones (6), suscripciones (7), admin (8), pulido (9).
