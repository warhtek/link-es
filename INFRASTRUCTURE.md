# Infraestructura y Configuración - Link-ES

## Resumen de Servicios

| Componente | Plataforma | Plan | URL |
|------------|------------|------|-----|
| **Frontend (React + Vite)** | Cloudflare Pages | Gratis | `https://link-es.warhtek.workers.dev` |
| **Backend (Node.js + Express + Docker)** | Render | Gratis (750h/mes) | `https://link-es-api.onrender.com` |
| **Base de Datos (PostgreSQL)** | Neon | Gratis (0.5 GB) | `postgresql://neondb_owner:...@ep-little-water-b5med4cy-pooler.c-7.us-east-2.aws.neon.tech/neondb` |
| **Keep-Alive (evita sleep)** | UptimeRobot | Gratis | Ping cada 5 min a `/api/health` |

---

## 1. Frontend - Cloudflare Pages

### Configuración de Build
- **Root directory**: `web`
- **Build command**: `npm run build`
- **Build output directory**: `web/dist`
- **Node version**: 24.x (detectado automáticamente)

### Variables de Entorno (Settings > Environment variables)
| Variable | Valor |
|----------|-------|
| `VITE_API_URL` | `https://link-es-api.onrender.com/api` |

### Dominio
- **Subdominio Pages**: `link-es.warhtek.workers.dev`
- **Custom domain**: (pendiente)

---

## 2. Backend - Render (Docker)

### Servicio
- **Nombre**: `link-es-api`
- **Tipo**: Web Service (Docker)
- **Dockerfile**: `api/Dockerfile`
- **Docker Context**: `api`
- **Plan**: Free
- **Health Check Path**: `/api/health`
- **Auto-deploy**: Yes (push a `main`)

### Variables de Entorno (Environment)
| Variable | Valor | Notas |
|----------|-------|-------|
| `NODE_ENV` | `production` | |
| `PORT` | `4000` | |
| `HOST` | `0.0.0.0` | |
| `DATABASE_URL` | `postgresql://neondb_owner:npg_MHuq0xj4hVOL@ep-little-water-b5med4cy-pooler.c-7.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require` | **Secret** |
| `CORS_ORIGIN` | `https://link-es.warhtek.workers.dev` | Exact match, sin trailing slash |
| `WEB_APP_URL` | `https://link-es.warhtek.workers.dev` | Para emails, redirects |
| `JWT_ACCESS_SECRET` | `[generado con openssl rand -base64 32]` | **Secret** |
| `JWT_REFRESH_SECRET` | `[generado con openssl rand -base64 32]` | **Secret** |
| `SMTP_HOST` | (opcional) | Para emails reales |
| `SMTP_PORT` | (opcional) | |
| `SMTP_SECURE` | (opcional) | |
| `SMTP_USER` | (opcional) | |
| `SMTP_PASS` | (opcional) | **Secret** |
| `MAIL_FROM` | (opcional) | |

### Endpoints Principales
```
GET  /api/health                    → Health check
POST /api/auth/register             → Registro
POST /api/auth/login                → Login
POST /api/auth/refresh              → Refresh token
GET  /api/auth/me                   → Usuario actual
GET  /api/categories                → Categorías (público)
GET  /api/public/providers          → Buscar proveedores (público)
GET  /api/public/providers/:id      → Detalle proveedor (público)
... (resto requieren auth)
```

### Limitación Plan Gratis
- **Sleep tras 15 min** inactividad → Primera request ~30-60s
- **Solución**: UptimeRobot ping cada 5 min a `https://link-es-api.onrender.com/api/health`
- **FS efímero**: `/uploads` se pierde en redeploy → Migrar a Cloudinary/S3 en producción

---

## 3. Base de Datos - Neon

### Proyecto
- **Nombre**: `link-es`
- **Región**: `us-east-2` (AWS)
- **Connection String**:
```
postgresql://neondb_owner:npg_MHuq0xj4hVOL@ep-little-water-b5med4cy-pooler.c-7.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require
```

### Migraciones
```bash
cd api
DATABASE_URL="postgresql://..." npx prisma migrate deploy
# Seed opcional:
DATABASE_URL="postgresql://..." npx tsx prisma/seed.ts
```

### Prisma Schema
- `api/prisma/schema.prisma` define: User, ProviderProfile, Category, Service, Booking, Review, Conversation, Message, VerificationDocument, etc.

---

## 4. Keep-Alive - UptimeRobot

### Monitor
- **Tipo**: HTTP(s)
- **URL**: `https://link-es-api.onrender.com/api/health`
- **Intervalo**: 5 minutos
- **Alertas**: Email si está down > 1 min

---

## 5. URLs de Referencia Rápida

| Servicio | URL |
|----------|-----|
| **Frontend (Producción)** | https://link-es.warhtek.workers.dev |
| **Backend API** | https://link-es-api.onrender.com |
| **Health Check** | https://link-es-api.onrender.com/api/health |
| **Render Dashboard** | https://dashboard.render.com/web/srv-... |
| **Cloudflare Pages Dashboard** | https://dash.cloudflare.com/.../pages/view/link-es |
| **Neon Console** | https://console.neon.tech/projects/... |
| **UptimeRobot** | https://uptimerobot.com/dashboard |
| **GitHub Repo** | https://github.com/warhtek/link-es |

---

## 6. Comandos Útiles

### Desarrollo Local
```bash
# Solo DB
docker-compose up -d db

# Backend
cd api && npm run dev

# Frontend
cd web && npm run dev
```

### Build y Test Local Docker
```bash
cd api
docker build -t link-es-api .
docker run -p 4000:4000 --env-file .env link-es-api
```

### Generar Secrets
```bash
openssl rand -base64 32
```

### Prisma
```bash
cd api
npx prisma migrate dev      # Desarrollo
npx prisma migrate deploy   # Producción
npx prisma studio           # UI
```

---

## 7. Próximos Pasos (Producción Real)

1. **Dominio personalizado**: Configurar en Cloudflare Pages + Render
2. **CDN para uploads**: Cloudinary (gratis 25GB) o AWS S3 + CloudFront
3. **Email transaccional**: SendGrid, Mailgun, Resend (tienen tier gratis)
4. **Monitoring**: UptimeRobot ya configurado
5. **CI/CD**: GitHub Actions para tests + lint antes de deploy
6. **Logs**: Integrar con Better Stack, Logtail o similar

---

## 8. Archivos de Configuración Clave

```
├── api/
│   ├── Dockerfile              # Multi-stage Node 22 Alpine
│   ├── .dockerignore
│   ├── .env.example            # Variables documentadas
│   ├── prisma/
│   │   └── schema.prisma       # Schema DB
│   └── src/
│       └── server.ts           # Entry point, rutas montadas en /api/*
├── web/
│   ├── vite.config.ts          # Alias @, plugins React + Tailwind
│   ├── package.json            # Scripts: build, dev, lint
│   └── src/
│       └── lib/api.ts          # Cliente API, usa VITE_API_URL
├── render.yaml                 # Blueprint Render (opcional)
├── docker-compose.yml          # Solo DB local
└── DEPLOYMENT.md               # Guía paso a paso original
```

---

## 9. Troubleshooting Común

| Problema | Solución |
|----------|----------|
| **CORS error** | Verificar `CORS_ORIGIN` en Render = URL exacta de Cloudflare Pages |
| **404 en /categories** | `VITE_API_URL` debe terminar en `/api` |
| **Providers vacíos** | Verificar que hay proveedores onboardeados en Neon |
| **Backend lento primera vez** | UptimeRobot configurado correctamente |
| **Build falla en Cloudflare** | `Root directory = web` en build config |
| **Variables no toman efecto** | Redeploy tras cambiar env vars en Cloudflare/Render |

---

*Documento generado automáticamente - Actualizar tras cambios de infraestructura*