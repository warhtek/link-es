# Guía de Despliegue Gratuito: Cloudflare Pages + Render + Neon/Supabase

Esta guía explica cómo desplegar la aplicación Link-ES usando servicios gratuitos:

| Componente | Plataforma | Costo |
|------------|------------|-------|
| Frontend (React) | Cloudflare Pages | Gratis (ancho de banda ilimitado) |
| Backend (Docker) | Render | Gratis (750h/mes, se duerme tras 15min inactividad) |
| Base de Datos (PostgreSQL) | Neon o Supabase | Gratis |

---

## 1. Base de Datos: Neon (Recomendado) o Supabase

### Neon
1. Ve a [neon.tech](https://neon.tech) y crea una cuenta
2. Crea un nuevo proyecto: `link-es`
3. Copia la **Connection String** (formato: `postgresql://user:pass@host/db?sslmode=require`)
4. Guarda esta URL para el paso 2

### Supabase
1. Ve a [supabase.com](https://supabase.com) y crea una cuenta
2. Crea un nuevo proyecto: `link-es`
3. En Settings > Database, copia la **Connection String** (URI)
4. Guarda esta URL para el paso 2

### Migración de datos
```bash
# Localmente, con la URL de Neon/Supabase en .env
cd api
DATABASE_URL="postgresql://..." npx prisma migrate deploy
# Opcional: seed de datos
DATABASE_URL="postgresql://..." npx tsx prisma/seed.ts
```

---

## 2. Backend: Render (Docker)

### Opción A: Usando render.yaml (recomendado)
1. Haz push de los cambios a GitHub (incluye `render.yaml`, `api/Dockerfile`, `api/.dockerignore`)
2. Ve a [dashboard.render.com](https://dashboard.render.com)
3. New > Blueprint > Conecta tu repo `warhtek/link-es`
4. Render detectará el `render.yaml` y creará el servicio automáticamente
5. Configura las variables de entorno **requeridas** en el dashboard:
   - `DATABASE_URL`: La URL de Neon/Supabase del paso 1
   - `CORS_ORIGIN`: `https://<tu-proyecto>.pages.dev` (URL de Cloudflare Pages del paso 3)
   - `WEB_APP_URL`: `https://<tu-proyecto>.pages.dev`
   - `JWT_ACCESS_SECRET`: Genera con `openssl rand -base64 32`
   - `JWT_REFRESH_SECRET`: Genera con `openssl rand -base64 32`
   - (Opcional) Variables SMTP para emails

### Opción B: Manual
1. En Render: New > Web Service > Deploy from Docker
2. Repositorio: `warhtek/link-es`
3. Dockerfile Path: `api/Dockerfile`
4. Docker Context: `api`
5. Plan: Free
6. Health Check Path: `/api/health`
7. Configura las mismas variables de entorno que en Opción A

### Notas importantes
- El plan gratuito de Render **duerme el servicio** tras 15 min de inactividad
- La primera petición tras dormir tarda ~30-60s en responder
- El sistema de archivos es **efímero**: las subidas a `/uploads` se pierden al reiniciar
  - Solución futura: migrar a Cloudinary/S3 (ver comentario en `api/src/lib/upload.ts`)

---

## 3. Frontend: Cloudflare Pages

1. Ve a [dash.cloudflare.com](https://dash.cloudflare.com) > Pages
2. Create a project > Connect to Git > GitHub > `warhtek/link-es`
3. Configuración de build:
   - **Build command**: `npm run build`
   - **Build output directory**: `web/dist`
   - **Root directory**: `web` (opcional, si no lo pones, configura el path en el build command)
4. Variables de entorno (si las necesitas en el frontend):
   - `VITE_API_URL`: `https://<tu-servicio>.onrender.com` (URL de Render del paso 2)
5. Save and Deploy

### Configuración de `VITE_API_URL` en el frontend
Si tu frontend necesita llamar al backend, asegúrate de usar `import.meta.env.VITE_API_URL` en tu código React.

Ejemplo en `web/src/lib/api.ts` (si existe) o donde haces fetch:
```typescript
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000'
```

---

## 4. Conexión Final: CORS y Variables

Una vez tengas las tres URLs:
- **Frontend**: `https://link-es.pages.dev` (Cloudflare Pages)
- **Backend**: `https://link-es-api.onrender.com` (Render)
- **Database**: `postgresql://...` (Neon/Supabase)

### Actualiza en Render (Backend):
```
CORS_ORIGIN=https://link-es.pages.dev
WEB_APP_URL=https://link-es.pages.dev
```

### Actualiza en Cloudflare Pages (Frontend):
```
VITE_API_URL=https://link-es-api.onrender.com
```

---

## 5. Verificación

1. **Health Check Backend**: `https://link-es-api.onrender.com/api/health`
   - Debe devolver: `{"status":"ok","db":"up",...}`

2. **Frontend**: `https://link-es.pages.dev`
   - Debe cargar la app React

3. **Registro/Login**: Prueba crear un usuario y hacer login
   - Verifica que las peticiones van al backend correcto

---

## 6. Comandos Útiles

### Desarrollo local con Docker
```bash
# Levantar solo PostgreSQL
docker-compose up -d db

# En otra terminal, backend
cd api && npm run dev

# En otra terminal, frontend
cd web && npm run dev
```

### Build local de Docker (para probar)
```bash
cd api
docker build -t link-es-api .
docker run -p 4000:4000 --env-file .env link-es-api
```

### Generar secrets seguros
```bash
openssl rand -base64 32
```

---

## 7. Limitaciones Conocidas (Plan Gratuito)

| Limitación | Impacto | Solución |
|------------|---------|----------|
| Render duerme a los 15min | Primera petición lenta (~30-60s) | Ping periódico (cron job externo) o upgrade a plan pagado |
| FS efímero en Render | Subidas a `/uploads` se pierden | Migrar a Cloudinary/S3 |
| Neon: 0.5 GB storage | Suficiente para MVP | Upgrade si crece |
| Cloudflare Pages: 500 builds/mes | Suficiente para desarrollo normal | - |

---

## 8. Próximos Pasos (Producción Real)

1. **Dominio personalizado**: Configura en Cloudflare Pages y Render
2. **CDN para uploads**: Cloudinary (gratis 25GB) o AWS S3 + CloudFront
3. **Email real**: SendGrid, Mailgun, o Resend (todos tienen tier gratis)
4. **Monitoring**: UptimeRobot (gratis) para hacer ping al backend y evitar que duerma
5. **CI/CD**: GitHub Actions para tests automáticos antes de deploy

---

## Archivos Creados/Modificados

- `api/Dockerfile` - Multi-stage build para Node.js 22 Alpine
- `api/.dockerignore` - Excluye node_modules, dist, .env, etc.
- `api/.env.example` - Variables de entorno documentadas
- `render.yaml` - Blueprint de Render para deploy automático
- `DEPLOYMENT.md` - Esta guía