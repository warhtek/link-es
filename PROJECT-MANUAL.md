# Project Manual — Link-ES

> Technical and functional manual for the **Link-ES** project: a web marketplace connecting clients with verified independent professionals in their area.  
> Last updated: 06/11/2026 · Branch `main`.

---

## 1. General description

Link-ES is a web application (SPA + REST API + WebSocket) that acts as a **verified local directory** of independent professionals. Its design concept: "find someone you trust near you". Proximity is central information (distances in mono, proximity ring), not decoration.

Main use cases:
- A client searches for a professional by category/text, sees the real distance and public profile, requests a service and coordinates via chat.
- A professional signs up, uploads verification documents, manages requests and receives ratings.
- An administrator manages users, verifications and metrics.

---

## 2. Features

### 2.1 Authentication and users
- Registration (born as `CLIENT`), login, logout, refresh with rotation, password recovery by email.
- Editable profile: name, phone, address, city, postal code, language.
- Mode switch `CLIENT ↔ PROVIDER` (requires PROVIDER role).
- Roles in the JWT token: `CLIENT`, `PROVIDER`, `ADMIN`.
- Preferences: theme (light/dark/system) in `localStorage['link-es-theme']`, language in `localStorage['link-es-lang']`.

### 2.2 Provider onboarding
- Form: business name, short headline, bio, 1–5 categories, city, coverage radius (1/5/10/15 km).
- Document upload: ID (required), license and certification (optional) — PDF/JPG/PNG/WebP ≤5 MB.
- Verification status: `NONE` → `PENDING` (on upload) → `VERIFIED` (admin).
- Professional card visible in the profile with status badge.

### 2.3 Public catalog and map
- Home: hero with search box, category grid with counts, "Top rated", CTA to the map.
- Search `/buscar`: text, category (roots + subcategories), radius chips (≤1/≤5/≤10 km + whole city), ordering (proximity/rating/most requested), geolocation with fallback to click-on-map.
- Split view 45% list / 55% map (desktop); mobile: 45vh map on top + list below.
- Public profile `/proveedores/:id`: bio, categories, services with price, radius, reviews, request CTA.
- Leaflet + OpenStreetMap map, custom pins by verification, animated proximity ring of the client, design-aligned popup.

### 2.4 Bookings / requests
- `POST /bookings`: client creates request (active service, future date, address, notes) → `PENDING`, code `BK-XXXXXX`.
- State machine by actor: provider `PENDING→ACCEPTED/REJECTED`, `ACCEPTED→IN_PROGRESS`, `IN_PROGRESS→COMPLETED`; client `CANCELLED` from PENDING/ACCEPTED/IN_PROGRESS.
- `/reservas` (client) and `/proveedor/solicitudes` (provider) with sections and actions.
- History with localized date and internationalization.

### 2.5 Chat
- Socket.io with JWT in handshake, rooms per conversation.
- Automatic conversation on booking acceptance.
- REST: listing, history (200, marks as read), create-or-get.
- Page `/mensajes/:id?`: list + thread, mobile with back navigation, bubbles by actor, unread counter.

### 2.6 Ratings
- `POST /bookings/:id/review`: only client + COMPLETED + unique (rating 1–5 + comment ≤1000).
- Recalculation of `ratingAvg/ratingCount` in a transaction.
- Reviews visible in public profile (only first name of the author).
- Shared `StarRating` component (read and input).

### 2.7 Administration panel
- `/admin` (only `ADMIN`): KPIs, paginated listing with search and filters, create/edit/delete clients and providers (cascade), verification change, password reset.
- `npm run make-admin <email>` to promote administrators.

---

## 3. Architecture

```
link-es/
├── web/                  # React frontend (Vite)
│   └── src/
│       ├── components/   # Reusable + ui/ (shadcn)
│       ├── pages/        # By route
│       ├── lib/          # api.ts, auth.tsx, chat.ts, geo.ts, ...
│       └── i18n/         # index.ts + locales/{es,en}.json
├── api/                  # Express backend
│   ├── src/
│   │   ├── routes/       # auth, user, category, provider, public, booking, conversation, review, admin
│   │   ├── lib/          # prisma, tokens, session, users, upload, mailer, ...
│   │   ├── middleware/   # auth (requireAuth, requireRole)
│   │   ├── socket.ts     # Socket.io
│   │   └── server.ts     # Entry point, mounts routes at /api/*
│   └── prisma/
│       ├── schema.prisma
│       ├── seed.ts
│       └── migrations/
├── docker-compose.yml    # PostgreSQL + PostGIS local
├── render.yaml           # Render blueprint
└── AGENTS.md             # Context for agents
```

Communication: frontend consumes `VITE_API_URL` (default `http://localhost:4000/api`); WebSocket over the same host (Socket.io). CORS configured by `CORS_ORIGIN`.

---

## 4. Technology stack

### Frontend (`web/`)
| Technology | Version | Use |
|---|---|---|
| React | 19.2 | UI |
| TypeScript | ~6.0 | Typing |
| Vite | 8.2 | Bundler/dev server |
| Tailwind CSS | 4.3 | Styles + tokens |
| React Router | 7.18 | Routing |
| TanStack Query | 5.102 | Remote data |
| shadcn/ui + Radix | — | Accessible components |
| Leaflet + react-leaflet | 1.9 / 5.0 | Maps |
| socket.io-client | 4.8 | Chat |
| react-i18next | 17 | i18n ES/EN |
| lucide-react | 1.46 | Icons |
| sonner | 2.0 | Toasts |

### Backend (`api/`)
| Technology | Version | Use |
|---|---|---|
| Node.js | ≥20 | Runtime |
| Express | 5.1 | HTTP framework |
| TypeScript | ~6.0 | Typing |
| Prisma | 6.16 | ORM |
| PostgreSQL + PostGIS | 16 / 3.5 | DB + geo |
| jsonwebtoken | 9.0 | JWT |
| bcryptjs | 3.0 | Password hashing |
| Zod | 4.4 | Validation |
| Multer | 2.2 | Uploads |
| Socket.io | 4.8 | WebSocket |
| Nodemailer | 9.0 | Email |

---

## 5. Database

PostgreSQL 16 + PostGIS 3.5. Main models:

| Model | Description |
|---|---|
| `User` | Account, roles, active mode, basic profile, locale |
| `RefreshToken` / `PasswordResetToken` | Hashed tokens (SHA-256) with expiration/revocation |
| `ProviderProfile` | Business card, verification, rating, service area (lat/lng/radius) |
| `VerificationDocument` | Uploaded documents (ID/LICENSE/CERTIFICATION/OTHER) with status |
| `Category` | Category tree (parentId) |
| `Service` | Provider services (title, price, unit) |
| `Booking` | Booking with code `BK-XXXXXX`, status, date, address |
| `Review` | Rating 1–5 + comment (unique per booking) |
| `Conversation` / `Message` | Chat linked to a booking |
| `Subscription` | Plan (FREE/PRO/PREMIUM) and status |
| `Address` | User addresses with coordinates |

Indexes: `[serviceAreaLat, serviceAreaLng]` on ProviderProfile; `[clientId,status]`, `[providerId,status]` on Booking; `[conversationId,createdAt]` on Message.

---

## 6. Location and maps

- **Map engine**: Leaflet 1.9 + react-leaflet 5, OpenStreetMap tiles (migrated from CARTO due to API key requirement). Map theme changes with light/dark mode.
- **Geolocation**: `navigator.geolocation`; if rejected or unavailable, "click on the map" mode.
- **Real distance**: PostGIS `ST_Distance`/`ST_DWithin` over geography 4326, ordering by proximity/rating/requests.
- **Privacy**: public catalog never exposes exact address or contact; only service area (lat/lng + radius).
- **Signature element**: client point in carbon with animated concentric ring in clay + distance label in IBM Plex Mono.

---

## 7. Commands and processes to start services

### Prerequisites
- Node.js ≥ 20 (recommended `nvm`/`fnm`)
- Docker + Docker Compose
- (Optional) `pnpm` (npm works the same)

### Typical flow (3 terminals)

```bash
# Terminal 1 — Database (from repo root)
docker compose up -d
docker ps   # link-es-db-1 ... (healthy)

# Terminal 2 — API (http://localhost:4000)
cd api
cp .env.example .env
npm install
npx prisma migrate dev
npx prisma db seed
npm run dev

# Terminal 3 — Web (http://localhost:5173)
cd web
npm install
npm run dev
```

### Minimum environment variables (`api/.env`)

```env
DATABASE_URL="postgresql://link_es:link_es@localhost:5432/link_es?schema=public"
PORT=4000
HOST=0.0.0.0
CORS_ORIGIN=http://localhost:5173
WEB_APP_URL=http://localhost:5173
JWT_ACCESS_SECRET="dev-access-secret-change-in-production"
JWT_REFRESH_SECRET="dev-refresh-secret-change-in-production"
```

Frontend (optional) `web/.env`:
```env
VITE_API_URL="http://localhost:4000/api"
```

### Test users (password `password123`)

| Email | Name | Role |
|-------|------|------|
| `laura@linkes.dev` | Laura Chávez | CLIENT |
| `pedro@linkes.dev` | Pedro Aguilar | CLIENT |
| `admin@linkes.dev` | Admin | CLIENT, ADMIN |
| `maria.plomeria@linkes.dev` | María José López | PROVIDER |
| `carlos.electricista@linkes.dev` | Carlos Ramírez | PROVIDER |
| `jorge.carpintero@linkes.dev` | Jorge Hernández | PROVIDER |
| `miguel.pintura@linkes.dev` | Miguel Santos | PROVIDER |

### Useful commands

```bash
# API
cd api
npm run dev          # hot-reload (tsx watch)
npm run build        # compile TS → dist/
npm run start        # production (requires build)
npm run typecheck    # type check
npm run make-admin   # CLI: grant ADMIN role to an email
npx prisma studio    # GUI (http://localhost:5555)
npx prisma migrate dev --name <name>
npx prisma migrate deploy   # production

# Web
cd web
npm run dev          # Vite dev server
npm run build        # production build
npm run lint         # oxlint
npm run preview      # preview build

# DB
docker compose up -d       # start
docker compose down        # stop (keeps volume)
docker compose down -v     # stop and DELETE data
docker compose logs -f db  # Postgres logs
```

### Quick verification

```bash
curl http://localhost:4000/api/health
# → {"status":"ok","db":"up","service":"link-es-api",...}

# Test login
curl -X POST http://localhost:4000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"laura@linkes.dev","password":"password123"}'
```

### Troubleshooting

| Error | Solution |
|-------|----------|
| `Falta la variable de entorno JWT_ACCESS_SECRET` | Check `api/.env` has both JWT secrets |
| `ECONNREFUSED 127.0.0.1:5432` | `docker compose up -d` and wait for `healthy` |
| `P2003: Foreign key constraint failed` | `npx prisma migrate reset --force` and `npx prisma db seed` |
| Port 5173/4000 in use | Change `PORT` in `.env` or kill the process |
| `prisma migrate dev` fails due to drift | `npx prisma migrate reset --force` |

---

## 8. Deployment (production)

- **Frontend**: Cloudflare Pages — build `npm run build`, output `web/dist`, root `web`, env `VITE_API_URL=https://link-es-api.onrender.com/api`.
- **Backend**: Render (Docker, `api/Dockerfile`) — health `/api/health`, env per `render.yaml`/`INFRASTRUCTURE.md`.
- **DB**: Neon (PostgreSQL + PostGIS), migrations with `npx prisma migrate deploy`.
- **Keep-alive**: UptimeRobot ping every 5 min to `/api/health` (prevents Render sleep).
- Free-tier limitations: Render sleeps after 15 min; ephemeral FS (uploads lost → migrate to Cloudinary/S3).

---

## 9. Conventions and quality

- UI always via i18n dictionaries (`t('key')`); keys in `es.json` and `en.json`.
- Theme: preference in `localStorage['link-es-theme']`; `data-theme` on `<html>`.
- Comments only when they add business context.
- Changes to `schema.prisma` ship with migration + seed.
- Visual validation at 375/768/1280 px.
- Commits: one per feature, `feat:`/`fix:`/`chore:` in Spanish.
- CI: GitHub Actions (lint+build web, generate+typecheck+build api).

---

## 10. References

- `AGENTS.md` — permanent context (stack, tokens, conventions).
- `PROGRESO.md` — global status index.
- `FASE-0..6`, `FASE-8` `*-PROGRESO.md` — per-phase closure.
- `DEVELOPMENT.md`, `DEPLOYMENT.md`, `INFRASTRUCTURE.md` — development, deployment and infrastructure.
- Master plan: `../PlanDesarrolloApp/plan-desarrollo-link-es.md` (outside repo).
- Repo: `https://github.com/warhtek/link-es`.
