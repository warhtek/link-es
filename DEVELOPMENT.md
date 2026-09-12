# Guía de Inicio Rápido — Link-ES

## Requisitos Previos

- **Node.js** ≥ 20 (recomendado: usar `nvm` o `fnm`)
- **Docker** + **Docker Compose** (para PostgreSQL + PostGIS)
- **pnpm** (opcional, npm funciona igual)

---

## Estructura del Proyecto

```
link-es/
├── api/                    # Backend Express + Prisma
│   ├── prisma/
│   │   ├── schema.prisma   # Modelo de datos
│   │   └── seed.ts         # Datos de prueba
│   └── .env                # Variables de entorno (crear desde .env.example)
├── web/                    # Frontend React + Vite + Tailwind
│   └── .env                # Variables de entorno (opcional)
├── docker-compose.yml      # PostgreSQL + PostGIS
└── AGENTS.md               # Contexto para agentes de código
```

---

## 1. Levantar la Base de Datos (PostgreSQL + PostGIS)

```bash
# Desde la raíz del proyecto
docker compose up -d

# Verificar que está healthy
docker ps
# Debe mostrar: link-es-db-1  Up X minutes (healthy)
```

---

## 2. Configurar Variables de Entorno — API

```bash
cd api

# Copiar ejemplo y editar si hace falta
cp .env.example .env
```

**Contenido mínimo de `api/.env`:**
```env
# PostgreSQL local (docker-compose en la raíz del repo)
DATABASE_URL="postgresql://link_es:link_es@localhost:5432/link_es?schema=public"

PORT=4000
CORS_ORIGIN=http://localhost:5173

# JWT Secrets (genera valores seguros con: openssl rand -hex 32)
JWT_ACCESS_SECRET="dev-access-secret-change-in-production"
JWT_REFRESH_SECRET="dev-refresh-secret-change-in-production"
```

---

## 3. Instalar Dependencias y Preparar Base de Datos — API

```bash
# Desde /api
npm install

# Aplicar migraciones (crea tablas, enums, índices)
npx prisma migrate dev

# Poblar con datos de prueba (usuarios, proveedores, categorías, servicios, reseñas)
npx prisma db seed
```

**Usuarios de prueba creados (password: `password123`):**

| Email | Nombre | Roles |
|-------|--------|-------|
| `laura@linkes.dev` | Laura Chávez | `CLIENT` |
| `pedro@linkes.dev` | Pedro Aguilar | `CLIENT` |
| `warhtek@gmail.com` | Walter | `CLIENT` |
| `admin@linkes.dev` | Admin | `CLIENT`, `ADMIN` |
| `maria.plomeria@linkes.dev` | María José López | `PROVIDER` |
| `carlos.electricista@linkes.dev` | Carlos Ramírez | `PROVIDER` |
| `ana.matematicas@linkes.dev` | Ana Martínez | `PROVIDER` |
| `jorge.carpintero@linkes.dev` | Jorge Hernández | `PROVIDER` |
| `rosa.belleza@linkes.dev` | Rosa Flores | `PROVIDER` |
| `luis.soporte@linkes.dev` | Luis Pérez | `PROVIDER` |
| `sofia.foto@linkes.dev` | Sofía Cruz | `PROVIDER` |
| `miguel.pintura@linkes.dev` | Miguel Santos | `PROVIDER` |

---

## 4. Iniciar el Backend (API)

```bash
# Desde /api
npm run dev
# → http://localhost:4000
#   Health: GET /api/health
#   Auth:   POST /api/auth/login, /api/auth/register, /api/auth/me
```

---

## 5. Configurar Variables de Entorno — Web (Opcional)

```bash
cd web

# Solo necesario si la API no está en localhost:4000
echo 'VITE_API_URL="http://localhost:4000/api"' > .env
```

---

## 6. Instalar Dependencias e Iniciar el Frontend

```bash
# Desde /web
npm install
npm run dev
# → http://localhost:5173
```

---

## 7. Verificar que Todo Funciona

| Servicio | URL | Comando de verificación |
|----------|-----|-------------------------|
| **PostgreSQL** | `localhost:5432` | `docker ps` → healthy |
| **API** | `http://localhost:4000` | `curl http://localhost:4000/api/health` |
| **Web** | `http://localhost:5173` | Abrir en navegador |
| **Prisma Studio** | `http://localhost:5555` | `cd api && npx prisma studio` |

---

## Comandos Útiles

```bash
# API
cd api
npm run dev          # Desarrollo con hot-reload (tsx watch)
npm run build        # Compilar TypeScript → dist/
npm run start        # Producción (requiere build previo)
npm run typecheck    # Verificar tipos sin emitir
npx prisma studio    # GUI para ver/editar BD
npx prisma migrate dev --name <nombre>  # Nueva migración
npm run make-admin   # CLI: dar rol ADMIN a un email

# Web
cd web
npm run dev          # Vite dev server
npm run build        # Build producción
npm run lint         # Oxlint
npm run preview      # Preview del build

# BD
docker compose up -d       # Levantar
docker compose down        # Parar (mantiene volúmenes)
docker compose down -v     # Parar y BORRAR datos (¡cuidado!)
docker compose logs -f db  # Ver logs de Postgres
```

---

## Flujo de Desarrollo Típico

```bash
# Terminal 1: Base de datos
docker compose up -d

# Terminal 2: API
cd api && npm run dev

# Terminal 3: Web
cd web && npm run dev
```

---

## Solución de Problemas Comunes

| Error | Solución |
|-------|----------|
| `Falta la variable de entorno JWT_ACCESS_SECRET` | Verifica `api/.env` tiene ambos secrets JWT |
| `P2003: Foreign key constraint failed` | Ejecuta `npx prisma migrate reset --force` y vuelve a `db seed` |
| `ECONNREFUSED 127.0.0.1:5432` | `docker compose up -d` y espera a `healthy` |
| Puerto 5173/4000 ocupado | Cambia `PORT` en `.env` o mata el proceso previo |
| `prisma migrate dev` falla por drift | `npx prisma migrate reset --force` (borra datos) |

---

## Producción (Resumen)

1. **DB**: PostgreSQL gestionado (RDS, Cloud SQL, Neon, Supabase, etc.) con PostGIS
2. **API**: `npm run build && npm run start` detrás de reverse proxy (nginx, Caddy) + TLS
3. **Web**: `npm run build` → servir `dist/` como estáticos (nginx, Vercel, Netlify, Cloudflare Pages)
4. **Secrets**: Generar `JWT_ACCESS_SECRET` y `JWT_REFRESH_SECRET` con `openssl rand -hex 32`
5. **CORS**: `CORS_ORIGIN=https://tu-dominio.com`