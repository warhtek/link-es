# Fase 5 — Chat · PROGRESO

> Documento de cierre de fase. Estado: **COMPLETADA** (24/08/2026).
> Seguimiento global: [`PROGRESO.md`](./PROGRESO.md) · Plan maestro: `../PlanDesarrolloApp/plan-desarrollo-link-es.md`

Entregable según plan (sección 8): *conversaciones funcionales*.

---

## ✅ Lo realizado

### Backend (`api/`)

| Entregado | Detalle |
|---|---|
| **Socket.io** | Servidor de sockets sobre el mismo HTTP; handshake autenticado con el access token JWT (conexión sin token → `unauthorized`). Salas por conversación (`conversation:<id>`); solo participantes pueden unirse |
| **Relación Conversation↔Booking** | El schema tenía `bookingId` pero **nunca definió la relación FK** — migración `conversation_booking_relation` (FK con ON DELETE SET NULL) + campo inverso `Booking.conversation` |
| **Conversación automática** | Al **aceptar** una reserva nace su conversación (dentro de la misma transacción del cambio de estado, find-then-create para idempotencia) |
| **Eventos** | `message:send` (valida participación, persiste, actualiza `lastMessage`, ack con el mensaje creado, broadcast `message:new` a la sala) · `conversation:read` (marca leídos del otro usuario) · vacío/>2000 chars rechazado; intruso → `forbidden` |
| **REST complementario** | `GET /conversations` (contraparte, código de reserva, no leídos, último mensaje), `GET /conversations/:id/messages` (historial 200, marca leídos al consultar), `POST /conversations` (create-or-get por reserva o por perfil proveedor; auto-chat prohibido). `GET /bookings` ahora incluye `conversationId` |

### Frontend (`web/`)

| Entregado | Detalle |
|---|---|
| **Cliente socket** | `lib/chat.ts`: singleton por pestaña con token del localStorage, reconexión automática de socket.io |
| **Hooks** | `useConversations` (se reordena y cuenta no leídos en vivo vía invalidación), `useConversationMessages` (historial + append en vivo deduplicado), `useSendMessage` (ack + eco local idempotente), `useJoinConversation` (join a la sala + marcar leídos) |
| **Página `/mensajes/:id?`** | Escritorio: lista 320px + hilo lado a lado. Móvil: lista o hilo (navegación con botón atrás). Selección derivada de la URL (compartible/botón atrás nativo). Burbujas propias moss / ajenas panel con borde, horas en mono, cabecera con contraparte + código BK- + badge de estado de reserva |
| **Accesos** | Topbar "Mensajes" (con sesión) · botón "💬 Ver chat" en reservas activas del cliente y en trabajos en curso del proveedor |
| **i18n** | Claves chat.* en es/en |

---

## Verificaciones ejecutadas

- [x] curl/node: conversación nace al aceptar reserva; foráneo por REST → 404; mensaje vacío rechazado; intruso por socket → `forbidden`; conexión sin token → `unauthorized`; entrega en vivo verificada entre dos clientes node
- [x] **E2E Chrome headless con dos contextos aislados (5/5 PASS)** — sesión real de dos usuarios simultáneos: laura ve su conversación → envía mensaje que llega EN VIVO a jorge sin recargar → jorge responde y llega EN VIVO a laura → historial persiste tras recargar
- [x] Responsive sin overflow en 375/768/1280 en `/mensajes`
- [x] Regresión: E2E Fases 1–4 en verde (10+8+12+7)
- [x] `api` typecheck+build OK · `web` lint+build OK

## Bugs detectados y corregidos durante la verificación

- **Schema**: relación `Conversation.booking` inexistente desde Fase 0 (columna huérfana sin FK) — migrada y tipada.
- **Test infraestructura**: las páginas de puppeteer compartían `localStorage`; se usan browser contexts aislados para probar sesiones simultáneas reales.
- Infra local: procesos dev huérfanos de sesiones sudo anteriores ocupaban puertos; los servicios ahora se lanzan daemonizados (doble-fork).

## Resultado

Cliente y proveedor coordinan cada servicio en un hilo de chat ligado a su reserva: la conversación nace al aceptar la solicitud, los mensajes viajan en tiempo real, los no leídos se cuentan y el historial queda guardado. Base lista para notificaciones push (Fase 9+) y adjuntos.

## Notas técnicas para fases futuras

- El índice único `[clientId, providerId, bookingId]` trata NULLs como distintos en Postgres; si se permiten chats sin reserva, añadir índice parcial único.
- Adjuntos en mensajes pendientes (modelo ya tiene `attachments String[]`).
- Para notificaciones unread globales (badge en topbar), exponer conteo agregado en `/auth/me` o endpoint dedicado.
- Los E2E viven fuera del repo (`/tmp/opencode/e2e/*.mjs`); pendiente decidir si se versionan.
