# Fase 6 — Calificaciones · PROGRESO

> Documento de cierre de fase. Estado: **COMPLETADA** (24/08/2026).
> Seguimiento global: [`PROGRESO.md`](./PROGRESO.md) · Plan maestro: `../PlanDesarrolloApp/plan-desarrollo-link-es.md`

Entregable según plan (sección 8): *ratings visibles en catálogo*.

---

## ✅ Lo realizado

### Backend (`api/`)

| Entregado | Detalle |
|---|---|
| **`POST /bookings/:id/review`** | El cliente califica una reserva **propia y COMPLETED** (rating entero 1–5 + comentario opcional ≤1000). Reserva inexistente/ajena → 404; no completada → 409 `booking_not_completed`; duplicada → 409 `already_reviewed` (unique por booking). Recalcula `ratingAvg/ratingCount` del proveedor con TODAS sus reseñas dentro de la misma transacción |
| **`GET /bookings/:id/review`** | Consulta si la reserva ya tiene reseña propia (para pintar UI sin pedir dos veces) |
| **Perfil público enriquecido** | `GET /public/providers/:id` incluye últimas 10 reseñas con **solo el primer nombre** del autor (privacidad) |
| **Listas de reservas** | Incluyen `myRating` (reseña propia) para ambas ramas client/provider |

### Frontend (`web/`)

| Entregado | Detalle |
|---|---|
| **`StarRating`** | Componente de estrellas con los tokens del sistema: relleno clay, vacías line; modo lectura y modo input (hover + aria-pressed por estrella) |
| **Calificar desde `/reservas`** | Historial: reservas COMPLETED sin reseña muestran botón "★ Calificar servicio" → formulario inline (estrellas interactivas + comentario) → al guardar se reemplaza por "Tu reseña" ★★★★☆. Las activas nunca muestran el botón |
| **Reseñas en perfil público** | Sección "Reseñas" con promedio mono, avatar-inicial, autor, fecha localizada, estrellas y comentario; nota de que solo clientes con servicio completado pueden reseñar |
| **i18n** | Claves review.* / public.reviews* en es/en |

---

## Verificaciones ejecutadas

- [x] curl API: review sobre reserva no completada → 409 · válida 5★ → creada y promedio recalculado (0/0 → 5/1) · duplicada → 409 · perfil público muestra autor "Laura", comentario y rating actualizado
- [x] **E2E Chrome headless (5/5 PASS)**: botón Calificar visible solo en COMPLETADA → 4★ + comentario → guardada y mostrada como "Tu reseña" → botón desaparece → perfil público muestra la reseña nueva con promedio dinámico correcto
- [x] Regresión: E2E Fases 1–5 en verde (10+8+12+7+5)
- [x] Responsive `/mensajes` OK (fase 5); páginas de esta fase usan layouts ya validados
- [x] `api` typecheck+build OK · `web` lint+build OK

## Bugs detectados y corregidos durante la verificación

- **API**: el include de `review` (myRating) solo estaba en la rama provider de `GET /bookings` — añadido también a la rama client (era la causa de que la UI no reflejara la reseña guardada).
- **Chat robustez**: `useJoinConversation` ahora re-emite join en cada evento `connect` del socket — si la conexión tarda o se recupera, el join ya no se pierde (elimina la flakiness intermitente del E2E de chat).
- Infra: procesos dev huérfanos con stdio descartado ocultaban logs del servidor; la API ahora daemoniza con log a archivo.

## Resultado

El círculo de confianza del directorio se cierra: solo quien contrató y terminó un servicio puede calificarlo, el promedio del proveedor se recalcula automáticamente y las reseñas verificadas son visibles en su ficha pública del catálogo.

## Notas técnicas para fases futuras

- El recálculo de rating es O(n) por reseña; con alto volumen conviene migrar a incremento incremental o materialized view.
- Respuesta del proveedor a reseñas y reportes de abuso: candidatos para Fase 9.
- "Más solicitados" y "Mejor calificados" del catálogo ya consumen estos campos sin cambios adicionales.
