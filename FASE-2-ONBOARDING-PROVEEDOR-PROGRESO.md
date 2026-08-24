# Fase 2 — Onboarding de proveedor · PROGRESO

> Documento de cierre de fase. Estado: **COMPLETADA** (24/08/2026).
> Seguimiento global: [`PROGRESO.md`](./PROGRESO.md) · Plan maestro: `../PlanDesarrolloApp/plan-desarrollo-link-es.md`

Entregable según plan (sección 8): *un usuario puede convertirse en proveedor*.

---

## ✅ Lo realizado

### Backend (`api/`)

| Entregado | Detalle |
|---|---|
| **`GET /categories`** | Catálogo público: categorías raíz con subcategorías anidadas, orden alfabético |
| **`POST /providers/onboarding`** | Crea `ProviderProfile` (nombre, frase corta, bio), vincula 1–5 categorías (validadas contra DB), agrega rol PROVIDER y cambia `activeMode` a PROVIDER en una transacción; devuelve **sesión nueva** porque el access token anterior quedó viejo. Errores: 409 `already_provider`, 400 `invalid_category` |
| **`POST /providers/me/documents`** | Multipart con multer: archivo (PDF/JPG/PNG/WebP máx. 5 MB, 415 si el tipo no está permitido) + tipo (`ID`/`LICENSE`/`CERTIFICATION`/`OTHER`). Al subir, la verificación del perfil pasa a `PENDING`. MVP guarda en `api/uploads/` servido estáticamente; migrar a Cloudinary/S3 después |
| **`GET /providers/me`** | Perfil propio con documentos y categorías para el panel proveedor |
| **Infra** | `lib/upload.ts` (multer con whitelist MIME y nombres aleatorios), `uploads/` en `.gitignore`, rutas montadas en `server.ts` |

El cambio de modo de la Fase 1 (`PATCH /users/me/mode`) queda habilitado automáticamente al obtener el rol PROVIDER — sin cambios de código.

### Frontend (`web/`)

| Entregado | Detalle |
|---|---|
| **API client** | `categories()`, `onboardingProvider()`, `providerMe()`, `uploadDocument()` (FormData sin Content-Type manual); tipos `CategoryNode`, `ProviderProfile`, `VerificationDocument` |
| **Hooks** | `useCategories` (cache infinito), `useProviderMe`, `useOnboardingProvider` (guarda sesión nueva e invalida caches), `useUploadDocument` |
| **Página `/proveedor/onboarding`** | Formulario en 4 secciones estilo ficha: datos del negocio · categorías como chips multi-select (máx. 5) agrupadas por raíz · zona de cobertura (ciudad + radio 1/5/10/15 km, nota de que el mapa llega en Fase 3) · documentos (DUI requerido, licencia y certificación opcionales). Envío secuencial: onboarding → subida de cada documento → redirect a `/perfil`. Si ya es proveedor, redirige a `/perfil` |
| **Perfil** | Nueva tarjeta de proveedor: nombre del negocio, badge de estado (`Verificado` / `En verificación` / `Sin documentos`), categorías, radio en mono y conteo de documentos. El hint "próximamente" se reemplazó por CTA "Convertirme en proveedor" → onboarding |

---

## Verificaciones ejecutadas

- [x] curl: onboarding completo (CLIENT → CLIENT+PROVIDER, mode=PROVIDER), documento DUI → estado PENDING, archivo servido en `/uploads/` (200 application/pdf), cambio de modo bidireccional habilitado
- [x] Casos límite curl: onboarding duplicado → 409 · categoría inexistente → 400 · HTML como documento → 415
- [x] **E2E Chrome headless (8/8 PASS)**: registro → CTA visible en perfil → onboarding con chips de categorías reales → adjuntar DUI → redirige a perfil con tarjeta de negocio → "EN VERIFICACIÓN" visible → selector de modo con ambos roles → persiste tras recargar → repetir onboarding redirige a `/perfil`
- [x] Responsive sin overflow en 375/768/1280 en `/proveedor/onboarding`
- [x] `api` typecheck+build OK · `web` lint+build OK

## Resultado

Un usuario cliente puede convertirse en proveedor desde su perfil: crea su ficha de negocio, elige categorías y sube documentos de verificación; aparece en modo proveedor con su tarjeta profesional visible. Pendiente de revisión manual hasta el panel admin (Fase 8).

## Notas técnicas para fases futuras

- Coordenadas de cobertura (`serviceAreaLat/Lng`) aún vacías en onboarding: el mapa interactivo llega en Fase 3; el campo ciudad es texto libre.
- Los documentos guardan `fileUrl` relativo (`/uploads/<archivo>`); al migrar a CDN solo cambia esa URL.
- La verificación `VERIFIED` solo puede asignarla el admin (Fase 8); hasta entonces los perfiles nuevos quedan en `PENDING`.
