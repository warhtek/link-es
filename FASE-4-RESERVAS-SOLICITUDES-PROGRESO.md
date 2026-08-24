# Fase 4 — Reservas/Solicitudes · PROGRESO

> Documento de cierre de fase. Estado: **COMPLETADA** (24/08/2026).
> Seguimiento global: [`PROGRESO.md`](./PROGRESO.md) · Plan maestro: `../PlanDesarrolloApp/plan-desarrollo-link-es.md`

Entregable según plan (sección 8): *flujo completo cliente↔proveedor sin pagos*.

---

## ✅ Lo realizado

### Backend (`api/`)

| Entregado | Detalle |
|---|---|
| **Código de reserva** | Migración `booking_code`: columna `code` única `BK-XXXXXX` generada por la API, con backfill para las reservas existentes del seed. Pensado para soporte y UI en IBM Plex Mono |
| **`POST /bookings`** | Cliente autenticado crea solicitud: servicio activo obligatorio (404 si no existe), fecha futura (400 `invalid_schedule`), dirección y notas. Nace en `PENDING` |
| **`GET /bookings?scope=`** | Historial según rol: `client` ve sus reservas con negocio/proveedor; `provider` ve las de su perfil con nombre del cliente. Incluye servicio con precio numérico |
| **`PATCH /bookings/:id/status`** | **Máquina de estados con control por actor**: PROVIDER mueve `PENDING→ACCEPTED/REJECTED`, `ACCEPTED→IN_PROGRESS`, `IN_PROGRESS→COMPLETED`; CLIENT puede `CANCELLED` desde PENDING/ACCEPTED/IN_PROGRESS. Transición inválida → 409 `invalid_transition`; tercero ajeno → 403 |

### Frontend (`web/`)

| Entregado | Detalle |
|---|---|
| **Solicitud desde perfil público** | Sin sesión: CTA lleva a `/login`. Con sesión: formulario inline (servicio con precio, fecha-hora con `datetime-local`, dirección con nota de privacidad, notas). Éxito muestra tarjeta verde con **código BK-XXXXXX** y enlace a Mis reservas |
| **`/reservas` (cliente)** | Secciones Activas / Historial; cada reserva: código mono, badge de estado, servicio, enlace al proveedor, fecha localizada (`Intl.DateTimeFormat` es-SV/en-US) y dirección. Botón Cancelar disponible según estado |
| **`/proveedor/solicitudes`** | Pendientes de respuesta (Aceptar/Rechazar) · Trabajos en curso (Iniciar trabajo → Marcar completado) · Historial. Guard: usuarios sin rol PROVIDER ven explicación con CTA al onboarding |
| **Navegación** | Topbar: "Mis reservas" (con sesión) y "Solicitudes" (rol PROVIDER), con estado activo |
| **i18n** | Todas las claves nuevas en es/en, incluidos nombres de estados y errores del backend (`invalid_schedule`, `invalid_transition`, `service_not_found`) |

---

## Verificaciones ejecutadas

- [x] curl API: creación (código generado, fecha pasada → 400), cliente intenta ACCEPT → 409, tercero ajeno → 403, flujo completo del proveedor PENDING→ACCEPTED→IN_PROGRESS→COMPLETED, cancelación por cliente, listas scope client/provider con datos unidos
- [x] **E2E Chrome headless cruzando usuarios reales (7/7 PASS)**: laura (cliente) solicita "Mueble de melamina" a Carpintería Don Jorge desde el perfil público → código `BK-…` visible → PENDIENTE en `/reservas` → jorge (proveedor) la ve con código y cliente → Aceptar → Iniciar → Completar → laura la ve COMPLETADA en su historial
- [x] Regresión: E2E Fase 1 (10/10), Fase 2 (8/8), Fase 3 (12/12) siguen en verde
- [x] Responsive sin overflow en 375/768/1280 en `/reservas`
- [x] `api` typecheck+build OK · `web` lint+build OK (0 warnings)

## Bugs menores detectados y corregidos durante la verificación

- Claves i18n faltantes que se renderizaban crudas (`common.cancel`, `errors.validation`) — añadidas a ambos locales.

## Resultado

El ciclo comercial básico funciona de punta a punta sin pagos: el cliente solicita un servicio desde el perfil público, el proveedor lo gestiona desde su panel de solicitudes, ambos siguen el estado con códigos legibles y el historial queda registrado — base lista para chat (Fase 5) y calificaciones post-servicio (Fase 6).

## Notas técnicas para fases futuras

- El chat (Fase 5) debe engancharse a `Conversation.bookingId`; la conversación puede crearse al aceptar la solicitud.
- La reseña (Fase 6) solo debe permitirse sobre reservas COMPLETED donde el usuario sea el cliente.
- "Más solicitados" en la búsqueda pública ya cuenta ACCEPTED+COMPLETED, así que este flujo alimenta ese ordenamiento.
- Los tests E2E viven fuera del repo (`/tmp/opencode/e2e/*.mjs` con puppeteer-core + Chrome del sistema); pendiente decidir si se versionan.
