# Capability Spec: `dashboard` — Dashboard real con agregaciones PostgreSQL

**Capability**: `dashboard` (NEW)
**Project**: sistema-incidencias
**Change**: `dashboard-real`
**Scope**: **Backend primary** (nuevo módulo `dashboard/` + 1 endpoint `GET /api/dashboard`) + **Frontend** (reemplazar los mocks de `pages/dashboard/data.ts` por un fetch real contra el nuevo endpoint).

> **Role-name canonicalization**: per `sistemaincidencias/AGENTS.md`, role codes are `ADMINISTRADOR`, `AGENTE`, `USUARIO`. All scenarios below use these canonical names.
>
> **Auth boundary**: all scenarios assume the request is `authenticated` (a valid `Authorization: Bearer <token>` is supplied). `SecurityConfig.java:42-49` enforces `.requestMatchers("/api/**").authenticated()` upstream of every controller. The new endpoint reuses the `validarAutenticado(token)` helper introduced by change `incidencias-rbac-agente`; no admin gate.
>
> **Resolved open questions** (from `proposal.md` §5, all defaults confirmed):
> - Q1 (time range): `rango ∈ {7d, 30d, 90d, all}`, default `30d`.
> - Q2 (role structure): same dashboard layout for all 3 roles; data is scope-filtered per role.
> - Q3 (tendencia resolution): always weekly (`date_trunc('week', creado_en)`).
> - Q4 (tiempo promedio): `AVG(EXTRACT(EPOCH FROM (resuelto_en - creado_en)) / 3600.0)` over `resuelto_en IS NOT NULL` in range; if no rows, return `null` and frontend hides the card.

## ADDED Requirements

### Requirement: Endpoint `GET /api/dashboard` con agregaciones

The backend shall expose `GET /api/dashboard?rango={7d|30d|90d|all}` (default `30d`) returning a `DashboardResponse` composed of 6 blocks: `kpis`, `byCategoria`, `tendenciaSemanal`, `recientes`, `tiempoPromedioResolucionHoras`, `rangoAplicado`. The endpoint authenticates via `validarAutenticado(token)` and applies per-role scope injection at the DAO WHERE builder (no role = all, `AGENTE` = `asignado_a = currentUser.id`, `USUARIO` = `creado_por_usuario_id = currentUser.id`). The `rango` query param bounds all 7 underlying aggregations by `creado_en` (KPIs, byCategoria, tendenciaSemanal, recientes, tiempoPromedioResolucionHoras) — it does not relax the role scope.

#### Scenario: ADMINISTRADOR ve todas las métricas del rango (sin scope por rol)
- GIVEN a valid JWT for `ADMINISTRADOR ana` and a database with 25+ incidencias where 3 are assigned to `AGENTE jose`, 5 are created by `USUARIO maria`, and the remainder are owned by ana or unassigned — all within the last 30 days
- WHEN `GET /api/dashboard?rango=30d` is called
- THEN THE SYSTEM returns 200 with `DashboardResponse` whose `kpis.total` counts ALL 25+ rows in range (no `asignado_a` and no `creado_por_usuario_id` predicate applied to ana's queries).

#### Scenario: AGENTE ve solo sus incidencias en todas las métricas
- GIVEN a valid JWT for `AGENTE jose` and a database with 25+ incidencias in range of which exactly 4 have `asignado_a = jose.id`
- WHEN `GET /api/dashboard?rango=30d` is called
- THEN THE SYSTEM returns 200 with `DashboardResponse` whose `kpis.total = 4` AND every other block (`byEstadoAprobacion`, `byEstadoProceso`, `byCategoria`, `tendenciaSemanal`, `recientes`, `tiempoPromedioResolucionHoras`) reflects only those 4 rows.

#### Scenario: USUARIO ve solo las que creó
- GIVEN a valid JWT for `USUARIO maria` and a database with 25+ incidencias in range of which exactly 6 have `creado_por_usuario_id = maria.id`
- WHEN `GET /api/dashboard?rango=30d` is called
- THEN THE SYSTEM returns 200 with `DashboardResponse` whose `kpis.total = 6` AND every other block reflects only those 6 rows.

#### Scenario: `rango=7d` limita todas las métricas al rango
- GIVEN a valid JWT for `ADMINISTRADOR` and a database with 20 incidencias in the last 7 days and 50 older than 7 days
- WHEN `GET /api/dashboard?rango=7d` is called
- THEN THE SYSTEM returns 200 with `DashboardResponse` whose `kpis.total = 20` AND `tendenciaSemanal.length = 1`.

#### Scenario: `rango=all` incluye histórico completo
- GIVEN a valid JWT for `ADMINISTRADOR` and a database with 100 incidencias spanning the last 12 months
- WHEN `GET /api/dashboard?rango=all` is called
- THEN THE SYSTEM returns 200 with `DashboardResponse` whose `kpis.total = 100` AND `rangoAplicado = "all"` (no time-bound filter on `creado_en`).

#### Scenario: token inválido retorna 401
- GIVEN a request to `GET /api/dashboard` with an expired or malformed JWT
- WHEN the request reaches `JwtAuthenticationFilter` upstream
- THEN THE SYSTEM returns 401 and the controller is not invoked (filter short-circuits the chain).

### Requirement: KPIs globales (RF-06)

`DashboardResponse.kpis` shall expose `total`, `byEstadoAprobacion`, and `byEstadoProceso`, satisfying RF-06 (total + counts per state) and RF-07 (visual state cards derived from these maps).

#### Scenario: `kpis.total` expone el conteo global del scope
- GIVEN a valid JWT and a scope-filtered set of 25 incidencias
- WHEN `GET /api/dashboard?rango=30d` is called
- THEN THE SYSTEM returns 200 with `kpis.total = 25`.

#### Scenario: `kpis.byEstadoAprobacion` expone `SOLICITADA`, `APROBADA` y `RECHAZADA`
- GIVEN a valid JWT and a scope-filtered set with N SOLICITADA, M APROBADA, K RECHAZADA (N + M + K = total)
- WHEN `GET /api/dashboard?rango=30d` is called
- THEN THE SYSTEM returns 200 with `kpis.byEstadoAprobacion` containing exactly the keys `SOLICITADA`, `APROBADA`, `RECHAZADA` (values = N, M, K respectively; missing keys default to `0`).

#### Scenario: `kpis.byEstadoProceso` expone `PENDIENTE`, `EN_PROCESO` y `FINALIZADA`
- GIVEN a valid JWT and a scope-filtered set with some PENDIENTE, EN_PROCESO, FINALIZADA
- WHEN `GET /api/dashboard?rango=30d` is called
- THEN THE SYSTEM returns 200 with `kpis.byEstadoProceso` containing exactly the keys `PENDIENTE`, `EN_PROCESO`, `FINALIZADA`.

### Requirement: Distribución por categoría (RF-08)

`DashboardResponse.byCategoria` shall be `List<CategoriaCountResponse>` per RF-08. Each item carries `categoriaId`, `categoriaNombre`, `total`. Categorías sin incidencia dentro del scope + rango quedan excluidas; el array se ordena desc por `total`.

#### Scenario: `byCategoria` tiene la forma `{categoriaId, categoriaNombre, total}`
- GIVEN a valid JWT and a scope-filtered set with at least 1 incidencia in each of 3 categorías
- WHEN `GET /api/dashboard?rango=30d` is called
- THEN THE SYSTEM returns 200 with `byCategoria` as an array where every item carries `categoriaId` (UUID), `categoriaNombre` (string, no nulo), and `total` (long ≥ 1).

#### Scenario: categorías con 0 incidencias en rango quedan excluidas
- GIVEN a valid JWT and a database with 5 categorías (`Hardware`, `Software`, `Red`, `Seguridad`, `Otro`) of which only `Hardware`, `Software`, `Red` have any incidencia in the scope-filtered set
- WHEN `GET /api/dashboard?rango=30d` is called
- THEN THE SYSTEM returns 200 with `byCategoria.length = 3` and `Seguridad` / `Otro` are NOT present in the array.

#### Scenario: `byCategoria` ordenado desc por `total`
- GIVEN a valid JWT and a scope-filtered set where `Hardware` has 10, `Software` has 5, `Red` has 3
- WHEN `GET /api/dashboard?rango=30d` is called
- THEN THE SYSTEM returns 200 with `byCategoria` in the order `[{Hardware, 10}, {Software, 5}, {Red, 3}]`.

### Requirement: Tendencia temporal semanal (RF-09)

`DashboardResponse.tendenciaSemanal` shall be `List<TendenciaSemanalResponse>` per RF-09. Per Q3=B the resolution is always weekly (`date_trunc('week', creado_en)`). Each item carries `semanaInicio` (ISO date — Monday of that ISO week, server timezone) and `total` (long). The number of buckets is bounded by `rango` (see scenarios below). The array is ordered ascending by `semanaInicio` (no gaps inside the range).

#### Scenario: `tendenciaSemanal` tiene la forma `{semanaInicio, total}`
- GIVEN a valid JWT and a scope-filtered set spanning multiple weeks
- WHEN `GET /api/dashboard?rango=30d` is called
- THEN THE SYSTEM returns 200 with `tendenciaSemanal` where each item carries `semanaInicio` (ISO `LocalDate`, debe coincidir con el lunes de la semana ISO correspondiente) and `total` (long ≥ 0).

#### Scenario: `rango=7d` → 1 punto en `tendenciaSemanal`
- GIVEN a valid JWT and a database with incidencias spread across multiple weeks
- WHEN `GET /api/dashboard?rango=7d` is called
- THEN THE SYSTEM returns 200 with `tendenciaSemanal.length = 1` (single weekly bucket covering the current ISO week).

#### Scenario: `rango=30d` → 4 o 5 puntos en `tendenciaSemanal`
- GIVEN a valid JWT
- WHEN `GET /api/dashboard?rango=30d` is called
- THEN THE SYSTEM returns 200 with `tendenciaSemanal.length ∈ [4, 5]` (4 buckets for partial current week + 3 prior, or 5 depending on day-of-week alignment).

#### Scenario: `rango=90d` → ~13 puntos en `tendenciaSemanal`
- GIVEN a valid JWT
- WHEN `GET /api/dashboard?rango=90d` is called
- THEN THE SYSTEM returns 200 with `tendenciaSemanal.length ∈ [12, 14]` (≈13 weekly buckets for the last 90 days).

#### Scenario: `rango=all` → máximo 26 semanas (6 meses) en `tendenciaSemanal`
- GIVEN a valid JWT and a database with incidencias spanning more than 6 months
- WHEN `GET /api/dashboard?rango=all` is called
- THEN THE SYSTEM returns 200 with `tendenciaSemanal.length ≤ 26` (capped at the latest 26 weekly buckets, oldest dropped).

### Requirement: Incidencias recientes (RF-10)

`DashboardResponse.recientes` shall be `List<IncidenciaResumenResponse>` per RF-10. Each item is the new slim DTO introduced by this change, carrying `id`, `codigo`, `titulo`, `categoriaNombre`, `asignadoA`, `estadoProcesoCodigo`, `estadoAprobacionCodigo`, `prioridad`, `creadoEn`, `resueltoEn`. The array returns the most-recent-by-`creadoEn` rows within the scope + rango, up to a maximum of 5; fewer is fine.

#### Scenario: `recientes` devuelve últimas 5 (o menos) por `creadoEn` desc
- GIVEN a valid JWT and a scope-filtered set with 12+ incidencias in range
- WHEN `GET /api/dashboard?rango=30d` is called
- THEN THE SYSTEM returns 200 with `recientes.length = 5` and the array ordered by `creadoEn` DESC (newest first).

#### Scenario: `recientes` con menos de 5 devuelve el subset sin padding
- GIVEN a valid JWT and a scope-filtered set with only 3 incidencias in range
- WHEN `GET /api/dashboard?rango=30d` is called
- THEN THE SYSTEM returns 200 with `recientes.length = 3` (no placeholders, no nulls — fewer-than-5 is a valid response).

#### Scenario: estructura de `recientes` = `IncidenciaResumenResponse`
- GIVEN a valid JWT and at least 1 incidencia in the scope-filtered set
- WHEN `GET /api/dashboard?rango=30d` is called
- THEN THE SYSTEM returns 200 with every item in `recientes` carrying the fields `id` (UUID), `codigo` (string), `titulo` (string), `categoriaNombre` (string), `asignadoA` (UUID or null), `estadoProcesoCodigo` (string), `estadoAprobacionCodigo` (string), `prioridad` (string — `BAJA|MEDIA|ALTA|CRITICA`), `creadoEn` (LocalDateTime ISO), `resueltoEn` (LocalDateTime ISO or null).

### Requirement: Tiempo promedio de resolución (RF-11)

`DashboardResponse.tiempoPromedioResolucionHoras` shall satisfy RF-11 per Q4=A: it equals `AVG(EXTRACT(EPOCH FROM (resuelto_en - creado_en)) / 3600.0)` over the scope-filtered set with `resuelto_en IS NOT NULL` within `rango`. When no qualifying rows exist, the value is `null` and the frontend MUST hide the corresponding card entirely (no `0.0 h` placeholder).

#### Scenario: `tiempoPromedioResolucionHoras` es el AVG en horas de `resuelto_en - creado_en`
- GIVEN a valid JWT and a scope-filtered set with 3 FINALIZADA incidencias in range with `resuelto_en - creado_en` durations of `2h`, `4h`, `6h` respectively
- WHEN `GET /api/dashboard?rango=30d` is called
- THEN THE SYSTEM returns 200 with `tiempoPromedioResolucionHoras = 4.0` (average of 2, 4, 6, rounded to 1 decimal in the JSON).

#### Scenario: sin FINALIZADA en rango retorna null y el frontend oculta la card
- GIVEN a valid JWT and a scope-filtered set with 0 FINALIZADA incidencias in range (only PENDIENTE / EN_PROCESO / SOLICITADA / APROBADA / RECHAZADA present)
- WHEN `GET /api/dashboard?rango=30d` is called
- THEN THE SYSTEM returns 200 with `tiempoPromedioResolucionHoras = null` AND the frontend dashboard view OMITS the "tiempo promedio" card entirely (no `0.0 h` placeholder, no skeleton for it).

### Requirement: Frontend consume `/api/dashboard`

`frontend/src/pages/dashboard/index.tsx` shall be converted from a mock-data component to a fetch-effect component. On mount it calls `dashboardService.obtener(rango, signal?)` via `useEffect`, stores the response in `useState`, and renders a loading skeleton during the fetch plus a toast on error. A range selector (`Select` shadcn) updates the URL search param and triggers a refetch. `frontend/src/pages/dashboard/data.ts` shall be emptied of all data mocks (`incidents`, `dashboardStats`, `pieData`, `categoryData`, `trendData`, `recentIncidents`) — only static visual config (`chartColors`, `pieColors`, `statusLabels`, `priorityLabels`) remains.

#### Scenario: la página llama `dashboardService.obtener` en mount
- GIVEN a logged-in user (any role) navigating to `/dashboard`
- WHEN the page mounts
- THEN THE SYSTEM issues `GET /api/dashboard?rango=30d` exactly once via `dashboardService.obtener`, receives 200, and renders the dashboard with real data. The page MUST NOT `import` `incidents`, `dashboardStats`, `pieData`, `categoryData`, `trendData`, or `recentIncidents` from `pages/dashboard/data.ts` (a repo-wide grep for those names inside `pages/dashboard/` returns no usages outside the service layer).

#### Scenario: `rango` por defecto es `30d`
- GIVEN a logged-in user navigating to `/dashboard` without a `?rango=` query param in the URL
- WHEN the page mounts
- THEN THE SYSTEM calls `GET /api/dashboard?rango=30d` AND the URL search param is normalized to `?rango=30d` (or remains empty, but the wire request uses `30d`).

#### Scenario: el selector de rango dispara refetch
- GIVEN a logged-in user on `/dashboard?rango=30d` with valid data already rendered
- WHEN the user changes the range selector to `7d`
- THEN THE SYSTEM updates the URL to `?rango=7d`, calls `GET /api/dashboard?rango=7d`, and replaces the rendered metrics (KPIs, charts, recientes, tiempo promedio) with the new payload — without a full page reload.

#### Scenario: error de red muestra toast y mantiene el último estado válido
- GIVEN a logged-in user on `/dashboard?rango=30d` with valid data already rendered
- WHEN the next refetch (after a range change or remount) returns a 5xx response or a network error
- THEN THE SYSTEM displays a non-blocking toast (via the project's toaster) with an error message AND keeps the previously rendered valid dashboard state on screen (no full-page error boundary, no blank dashboard).

#### Scenario: skeleton/loading mientras carga
- GIVEN a logged-in user navigating to `/dashboard` for the first time (cold load, no cached payload, no previous successful response in state)
- WHEN the fetch to `GET /api/dashboard?rango=30d` is in-flight
- THEN THE SYSTEM renders a skeleton placeholder (animated boxes / `Spinner`) in place of the KPIs cards, charts, and `recientes` table until the 200 response arrives.

### Requirement: AGENTE / USUARIO ven sus propios datos (server-enforced scope)

The per-role scope is enforced exclusively at the backend DAO WHERE builder. AGENTE tokens see only `incidencias.asignado_a = currentUser.id`; USUARIO tokens see only `incidencias.creado_por_usuario_id = currentUser.id`. ADMINISTRADOR sees all. The filter is applied to ALL 7 underlying queries (KPIs total, byEstadoAprobacion, byEstadoProceso, byCategoria, tendenciaSemanal, recientes, tiempoPromedioResolucionHoras). Any client-supplied override hint (custom header, extra query param) is ignored — the server is the source of truth.

#### Scenario: AGENTE ve TODAS las métricas filtradas a `asignado_a = suId`
- GIVEN a JWT for `AGENTE jose` and a database with 25+ incidencias in range of which exactly 4 have `asignado_a = jose.id`
- WHEN `GET /api/dashboard?rango=30d` is called
- THEN THE SYSTEM applies `WHERE asignado_a = jose.id` to all 7 queries AND the 4 metrics are returned consistently across blocks (e.g. the same 4 ids appear in `recientes`, the same 4 categories feed `byCategoria`).

#### Scenario: USUARIO ve TODAS las métricas filtradas a `creado_por_usuario_id = suId`
- GIVEN a JWT for `USUARIO maria` and a database with 25+ incidencias in range of which exactly 6 have `creado_por_usuario_id = maria.id`
- WHEN `GET /api/dashboard?rango=30d` is called
- THEN THE SYSTEM applies `WHERE creado_por_usuario_id = maria.id` to all 7 queries AND the 6 metrics are returned consistently across blocks.

#### Scenario: el backend filtra — no se confía en filtro frontend
- GIVEN a JWT for `AGENTE jose` (with only 4 assigned incidencias in range) and a tampered client request that adds a custom header (e.g. `X-Override-Scope: all`) or a query param (e.g. `?scope=all`) trying to widen the data
- WHEN `GET /api/dashboard?rango=30d` is called
- THEN THE SYSTEM IGNORES the client-side override AND still applies `WHERE asignado_a = jose.id` at the DAO level — jose sees metrics derived from exactly his 4 rows, regardless of what the client tried to send.

## Non-functional Requirements

### Requirement: Latencia del endpoint ≤ 1.5 s p95 con dataset de smoke

The 7 underlying aggregations are read-only and execute serially on a single pooled connection (no explicit transaction wrapping). For the smoke dataset (< 1000 incidencias, < 100 categorías) used in local validation, `GET /api/dashboard?rango=30d` shall respond in ≤ 1.5 s at p95, consistent with RNF-01 ("dashboard < 3 s"). No new indexes are introduced in this change — the existing `idx_asignado_a` / `idx_creado_por_usuario_id` indexes (if present) and the `creado_en` predicate use the default b-tree.

#### Scenario: smoke dataset responde dentro del presupuesto
- GIVEN a populated local PostgreSQL with < 1000 incidencias and the schema seeded via the project's `data.sql`
- WHEN `GET /api/dashboard?rango=30d` is invoked 20 consecutive times from a warm client
- THEN THE SYSTEM returns 200 for every call AND the p95 wall-clock latency measured on the client is ≤ 1.5 s.

### Requirement: SecurityConfig sin cambios

`SecurityConfig.java` shall remain unmodified. The endpoint `/api/dashboard` is covered by the existing `.requestMatchers("/api/**").authenticated()` chain (line 47). Per-role authorization is handled at the service layer via `validarAutenticado` plus DAO WHERE injection — not via Spring Security matchers.

#### Scenario: SecurityConfig no es tocado por este cambio
- GIVEN a clean checkout of this change applied on top of master (5e4d86a)
- WHEN `git diff master..HEAD -- sistemaincidencias/src/main/java/com/integrador/sistemaincidencias/config/SecurityConfig.java` is executed
- THEN THE SYSTEM returns an empty diff (no modifications to `SecurityConfig.java`).

## Out of scope (explicit non-requirements)

- **Tiempo real (websockets / SSE)** — RF-37..40. The dashboard refreshes only on mount, on route change, and on explicit range selector change. No push channel.
- **Drill-down chart → lista filtrada** — Clicking a `byCategoria` bar does NOT navigate to `/incidencias?categoria=…`. This UX lives in a follow-up change.
- **Export PDF/Excel del dashboard** — RF-44. Lives in the Reportes change.
- **`GET /api/dashboard/agente/{id}`** — RF-42 (reporte por agente). Lives in the Reportes change.
- **Dashboards personalizados por usuario (layouts custom)** — Out of MVP scope.
- **Cache del backend (Caffeine, Redis)** — First cut executes the 7 queries directly. If RNF-01 fails in production, cache is a follow-up.
- **Integración BI externa** (Metabase, PowerBI, etc.).
- **Frontend integration with `/incidencias`** filters — the `/incidencias` page is not touched by this change.
- **`DELETE` de categorías/estados** — referenced by `frontend/.../categorias/index.tsx` (audit #794); out of scope here.
- **OpenAPI/Swagger documentation** for the new endpoint (RNF-18). Postman collection update IS in scope.

## Acceptance criteria

- All 6 scenarios in `Requirement: Endpoint GET /api/dashboard con agregaciones` pass.
- All 3 scenarios in `Requirement: KPIs globales (RF-06)` pass.
- All 3 scenarios in `Requirement: Distribución por categoría (RF-08)` pass.
- All 5 scenarios in `Requirement: Tendencia temporal semanal (RF-09)` pass.
- All 3 scenarios in `Requirement: Incidencias recientes (RF-10)` pass.
- All 2 scenarios in `Requirement: Tiempo promedio de resolución (RF-11)` pass.
- All 5 scenarios in `Requirement: Frontend consume /api/dashboard` pass.
- All 3 scenarios in `Requirement: AGENTE / USUARIO ven sus propios datos (server-enforced scope)` pass.
- All 1 scenario in `Requirement: Latencia del endpoint ≤ 1.5 s p95 con dataset de smoke` passes.
- All 1 scenario in `Requirement: SecurityConfig sin cambios` passes.
- `./mvnw compile` clean; no new compile errors.
- `npm run lint` clean (no new errors).
- `npm run build` clean (no new errors related to this change).
- Repo-wide grep for `dashboardStats`, `pieData`, `categoryData`, `trendData`, `recentIncidents` outside `pages/dashboard/data.ts` (the legacy visual-config file) returns zero matches in `pages/dashboard/`.
- Manual smoke (ADMINISTRADOR + AGENTE + USUARIO tokens) against a running backend exercises all scenarios above. Sanity check: `kpis.total == sum(kpis.byEstadoAprobacion.values())` for every role.
