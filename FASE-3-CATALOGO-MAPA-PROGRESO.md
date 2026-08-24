# Fase 3 — Catálogo público + mapa · PROGRESO

> Documento de cierre de fase. Estado: **COMPLETADA** (24/08/2026).
> Seguimiento global: [`PROGRESO.md`](./PROGRESO.md) · Plan maestro: `../PlanDesarrolloApp/plan-desarrollo-link-es.md`

Entregable según plan (sección 8): *catálogo navegable sin login, con búsqueda por cercanía funcional*.

**Decisión de mapa**: el plan fijaba Mapbox GL JS (requiere token de API). Se decidió con el usuario usar **Leaflet + tiles OpenStreetMap/CARTO**, sin token y gratuito; la vista lista/mapa y los pines siguen el mismo sistema de diseño. Migrar a Mapbox después es directo si se requiere.

---

## ✅ Lo realizado

### Backend (`api/`)

| Entregado | Detalle |
|---|---|
| **PostGIS** | `docker-compose.yml` migrado a imagen `postgis/postgis:16-3.5-alpine` (mismo volumen de datos) + migración `20260824170000_postgis_extension` con `CREATE EXTENSION postgis`. Verificado PostGIS 3.5 |
| **`GET /public/providers`** | Búsqueda pública sin login. Filtros: texto (`q` sobre negocio/headline/bio/títulos de servicio), categoría (perfil **o** servicios), radio (`radiusKm`) y orden (`distance`/`rating`/`bookings`). Distancia calculada en SQL con **PostGIS** (`ST_Distance`/`ST_DWithin` sobre geography 4326); "Más solicitados" cuenta reservas ACCEPTED+COMPLETED. Devuelve fichas públicas: negocio, headline, verificación, rating, categorías, ciudad, coordenadas del área de servicio y `distanceKm`. Nunca expone dirección exacta ni contacto (privacidad plan sección 3.2) |
| **`GET /public/providers/:id`** | Perfil público completo: bio, categorías, servicios activos con precio (decimal → number), radio de cobertura |

### Frontend (`web/`)

| Entregado | Detalle |
|---|---|
| **Leaflet** | `leaflet@1.9 + react-leaflet@5`, CSS importado; tiles **CARTO light_all/dark_all** que cambian con el tema claro/oscuro (el mapa tiene versión por modo, según plan sección 3.1) |
| **Pines propios** | `divIcon` con el lenguaje visual del sistema: punto clay con borde panel; borde/punto moss para verificados. Popup alineado al diseño con nombre, rating, distancia en mono y botón "Ver perfil" |
| **Anillo de proximidad (firma)** | Punto del cliente en carbono con **anillo concéntrico animado** (`@keyframes linkes-pulse` en clay), replicando el elemento de firma del mockup dentro del mapa real |
| **Home `/`** | Hero con promesa del producto ("alguien de confianza cerca de ti") + buscador que navega a `/buscar?q=…` · grilla de categorías (con conteo de subcategorías) · sección "Mejor calificados" con cards reales · CTA al mapa. Reemplazó el redirect a `/design-system` (ruta conservada) |
| **Búsqueda `/buscar`** | Vista dividida **45% lista / 55% mapa** en escritorio (plan sección 3); en móvil mapa 45vh arriba + lista debajo. Filtros: texto (submit explícito), categoría (select raíces+subcategorías, sincronizado con URL), chips de radio ≤1/≤5/≤10 km + "Toda la ciudad", orden por cercanía/calificación/solicitudes. Geolocalización con `navigator.geolocation`; si se rechaza/no existe → modo "toca tu posición en el mapa". Contador de resultados con distancia del más cercano. Cards sincronizadas con pines: hover/selección resalta pin y viceversa (opacidad). Estados vacíos con dirección visual |
| **Perfil público `/proveedores/:id`** | Cabecera tipo ficha (inicial, verificado/en verificación, rating mono, ciudad, radio), chips de categorías, bio, lista de servicios con precio `$xx.xx / hora|proyecto` en IBM Plex Mono, CTA "Solicitar servicio" → login (flujo real llega en Fase 4), nota de privacidad |
| **Navegación** | Topbar: marca ahora enlaza a `/`; enlace "Buscar" visible ≥768px con estado activo |

---

## Verificaciones ejecutadas

- [x] curl API: búsqueda por rating (10 proveedores), distancia real desde San Salvador (1.18–8.67 km ordenados), texto "plomer" (coincidencias por nombre de negocio), más solicitados, detalle con servicios y precios
- [x] **E2E Chrome headless (12/12 PASS)** con geolocalización simulada (permiso concedido + coordenadas falsas): Home completa → búsqueda por texto desde home → botón ubicación habilita radios → orden por cercanía muestra "1.2 km" real → filtro radio reduce resultados (10→8) → mapa Leaflet montado con pines → perfil público con servicios
- [x] Responsive sin overflow en 375/768/1280 en `/`, `/buscar` y `/proveedores/:id` (corregido overflow de grid sin pista explícita en móvil)
- [x] Regresión: E2E Fase 1 (10/10) y Fase 2 (8/8) siguen en verde
- [x] `api` typecheck+build OK · `web` lint+build OK

## Resultado

El catálogo público está navegable sin login: home con buscador y categorías, búsqueda con mapa en vivo y distancias PostGIS reales, filtros de radio/categoría/texto con ordenamiento por cercanía, y perfiles públicos de proveedor. La cercanía verificable (punto + anillo + distancia en mono) ya es la huella visual del producto.

## Notas técnicas para fases futuras

- Clústeres de pines (plan sección 3.2) pospuestos hasta tener densidad real de datos; con ≤60 resultados no satura.
- El fallback manual usa click-en-mapa; geocodificación por texto (Nominatim/Places) queda como mejora opcional.
- `ST_DWithin` usa las columnas float existentes; si el catálogo crece mucho, considerar columna `geography` generada con índice GIST.
- Los proveedores creados por tests E2E quedan en la DB local (sin impacto en producción).
