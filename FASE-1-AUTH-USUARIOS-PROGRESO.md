# Fase 1 — Auth y usuarios · PROGRESO

> Documento de cierre de fase. Estado: **COMPLETADA** (24/08/2026).
> Seguimiento global: [`PROGRESO.md`](./PROGRESO.md) · Plan maestro: `../PlanDesarrolloApp/plan-desarrollo-link-es.md`

Entregable según plan (sección 8): *un usuario puede registrarse y editar su perfil*.

---

## ✅ Lo realizado

### Backend (`api/`)

| Entregado | Detalle |
|---|---|
| **Modelo RefreshToken** | Migración `auth_refresh_tokens`: guarda solo hash SHA-256 del token, con expiración (30 días) y revocación. Cascada al borrar usuario |
| **`lib/tokens.ts`** | Access token JWT de 15 min (payload: sub, roles, mode); refresh token aleatorio de 48 bytes viajando crudo al cliente y hasheado en DB |
| **`lib/session.ts`** | Emisión de sesión completa (usuario público + tokens), **rotación de refresh** (el usado queda revocado), verificación bcrypt |
| **Rutas auth** | `POST /auth/register` (nace CLIENT, 409 si email duplicado), `POST /auth/login` (401 genérico sin revelar si existe el email), `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/me`. Validación con zod; errores JSON consistentes (`validation_error`, `email_in_use`, `invalid_credentials`) |
| **Rutas users** | `GET/PATCH /users/me` (nombre, teléfono, dirección, ciudad, código postal, locale), `PATCH /users/me/mode` (cambio CLIENT↔PROVIDER; 403 `provider_onboarding_required` si aún no tiene el rol — se habilita con la Fase 2) |
| **Infra** | `middleware/auth.ts` (`requireAuth`, `requireRole`), cliente Prisma compartido en `lib/prisma.ts`, error handler JSON global, secretos JWT en `.env` |

### Frontend (`web/`)

| Entregado | Detalle |
|---|---|
| **TanStack Query** | Instalado + `QueryClientProvider`; clave `['me']` compartida por Topbar y páginas |
| **`lib/api.ts`** | Cliente fetch con Bearer automático, **refresh transparente ante 401** (una sola petición concurrente vía promesa compartida), tokens en localStorage, clase `ApiError` con códigos del backend |
| **`lib/auth.tsx`** | Hooks: `useMe`, `useLogin`, `useRegister`, `useLogout`, `useUpdateProfile`, `useSwitchMode` |
| **Páginas** | `/login`, `/registro` (validación HTML5 + mensajes de error traducidos desde códigos API), `/perfil` (cabecera de cuenta, cambio de modo con chips tipo radio, edición de datos personales con confirmación "Guardado") |
| **Protección de rutas** | `RequireAuth`: sin sesión → redirect a `/login` |
| **Topbar** | Sin sesión: botones Iniciar sesión / Crear cuenta · Con sesión: avatar con inicial → `/perfil`, Salir (desktop). El idioma elegido con sesión activa se persiste también en el perfil (`PATCH users/me locale`) |
| **Responsive** | Overflow 0px en 375/768/1280 en las tres páginas (indicador de tema resuelto y "Salir" ocultos en móvil; logout accesible dentro de `/perfil`) |

---

## Verificaciones ejecutadas

- [x] curl: registro, login, me, PATCH perfil, cambio de modo (403 sin rol), refresh con rotación (reuso → 401), logout (204), credenciales inválidas (401), email duplicado (409)
- [x] CORS preflight 5173→4000 OK
- [x] **E2E con Chrome headless (10/10 PASS)**: registro → redirige a perfil → tokens en localStorage → recarga mantiene sesión → logout limpia → login con el usuario creado → edición de ciudad persiste tras recargar
- [x] Responsive sin overflow en 375/768/1280 en `/login`, `/registro` y `/perfil`
- [x] `api` typecheck+build OK · `web` lint+build OK

## Resultado

Un usuario puede registrarse, iniciar sesión, cerrar sesión, editar su perfil y cambiar su preferencia de idioma de forma persistente. La sesión sobrevive recargas gracias al refresh token. Base lista para el onboarding de proveedor (Fase 2).

## Notas técnicas para fases futuras

- El access token lleva `{ sub, roles, mode }`: al cambiar de modo el token queda viejo hasta el próximo refresh automático.
- Los errores del backend viajan como códigos (`email_in_use`…) que el frontend traduce vía `web/src/lib/errors.ts`.
- Tokens en localStorage: suficiente para el MVP; migrar a cookies httpOnly si se requiere protección extra contra XSS.
