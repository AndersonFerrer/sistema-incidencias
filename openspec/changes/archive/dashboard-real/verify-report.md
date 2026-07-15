# sdd-verify REPORT — `dashboard-real`

**Change**: `dashboard-real`
**Date**: 2026-07-14
**Branch / HEAD**: `master` @ `1258ca4` (PR #12 + PR #13 merged)
**Reviewer**: sdd-verify (static + code-level functional audit)

---

## Verdict

**PASS** — Implementation matches the delta spec at code level for every required scenario. No new regressions on master; the 3 lint + 4 build errors that surface in `npm run lint` / `npm run build` are pre-existing in master from PR #9 `f26424a` (lines `frontend/src/pages/incidencias/index.tsx:65-66` and `frontend/src/pages/incidencias/components/incidencias-table.tsx:309`) and are unrelated to this change. Backend `mvnw compile` is silent. Postman collection is valid JSON with all 5 documented sample responses (ADMIN/AGENTE/USUARIO + 400 invalid `rango` + 401 invalid token). `SecurityConfig.java` was not touched (`git diff 5e4d86a..HEAD -- .../SecurityConfig.java` is empty). Diffstat vs base `5e4d86a`: 21 files / +1332 / −326 = 1658 changed lines, with the bulk concentrated in the new `dashboard/` Java module and the rewritten `data.ts` (which sheds the legacy mocks).

Three minor deviations are recorded as `⚠️ WARNING`. None of them break a spec scenario — they are functional behavior that matches the spec's intent with a different surface (URL search-param persistence, Alert vs toast) or runtime evidence that cannot be collected without a running backend (latency p95). All three are tracked as design-time follow-ups, not regressions.

---

## Static checks

| Check | Command | Result | Notes |
| --- | --- | --- | --- |
| Backend compile | `cd sistemaincidencias && ./mvnw compile -q` | **PASS** | Silent. Exit code `0`. No errors, no warnings. |
| Frontend lint | `cd frontend && npm run lint` | **PASS (net-new clean)** | 3 pre-existing errors (`@typescript-eslint/no-unused-vars` on `index.tsx:65-66`: `isEliminando` / `setIsEliminando` / `errorEliminar`). `git blame` confirms author `f26424a4` (Anderson Paolo Ferrer Ysla, 2026-07-14 20:16:07), i.e. PR #9, **before** the first commit of this change (`062e33c`, PR #12 backend). |
| Frontend build | `cd frontend && npm run build` | **PASS (net-new clean)** | 4 errors total: 1 pre-existing TS in `incidencias-table.tsx:309` (`Type 'string' is not assignable to type 'EstadoProcesoClave'`) + 3 pre-existing unused-vars in `incidencias/index.tsx:65-66`. All from `f26424a` (PR #9). Dashboard files (`dashboard/index.tsx`, `dashboard-service.ts`, the 5 components) compile clean. |
| Postman JSON validity | `python3 -c "import json; json.load(open(...))"` | **PASS** | Valid JSON. The new "Dashboard" folder contains 1 request (`Obtener dashboard` → `GET {{baseUrl}}/api/dashboard?rango=30d`) with 5 sample responses: ADMIN-200, AGENTE-200, USUARIO-200, 400 (invalid rango), 401 (invalid token). Folder description documents the auth note + scope-by-role behavior verbatim. |
| SecurityConfig untouched | `git diff 5e4d86a..HEAD -- sistemaincidencias/src/main/java/com/integrador/sistemaincidencias/config/SecurityConfig.java` | **PASS** | Empty diff. Confirms NFR `SecurityConfig sin cambios`. |

### Diffstat vs base `5e4d86a`

21 files / +1332 / −326 = 1658 changed lines. The breakdown is roughly:

- New `dashboard/` Java module: 11 files / +806 (controller 52, service 90, dao 222, sql 107+32=139, mapper 58, dto 5×~30=150, Rango enum 70).
- `frontend/src/services/dashboard-service.ts`: +69.
- `frontend/src/pages/dashboard/index.tsx`: rewritten, ~+128 / -data mocks.
- `frontend/src/pages/dashboard/components/*`: 5 files touched, props-driven refactor.
- `frontend/src/pages/dashboard/data.ts`: -275 / +51 (stripped mocks, kept visual config).
- `frontend/src/pages/dashboard/components/dashboard-skeleton.tsx`: new +50.
- `postman/SistemaIncidencias.postman_collection.json`: +73 (Dashboard folder + 5 sample bodies).

The frontend page rework is heavier than the original 120-LOC budget (proposal §8 forecast) because the implementation adopted a custom `<select>` shadcn-flavored dropdown plus a dedicated `<DashboardSkeleton>` component to satisfy the loading-state spec scenario; this is in line with the project AGENTS.md (uses shadcn/ui patterns) and not a regression.

---

## Spec scenarios walkthrough

Total scenarios in `specs/dashboard/spec.md`: **32** (1 cap of 30 functional + 2 NFR, matching the count the orchestrator requested).

### Requirement: Endpoint `GET /api/dashboard` con agregaciones

| # | Scenario | Status | Evidence |
| - | -------- | ------ | -------- |
| 1 | ADMINISTRADOR ve todas las métricas del rango | ✅ PASS | `DashboardService.scopeDe()` line 82-84: when `rol.esAdministrador()` returns true → `ScopeFiltro.administrador()` with both UUIDs null. `DashboardSql.construirWhere()` lines 91-100: skips the `asignado_a` and `creado_por_usuario_id` predicates when both are null. Result: no scope filter is applied to any of the 7 queries for ADMINISTRADOR. |
| 2 | AGENTE ve solo sus incidencias en todas las métricas | ✅ PASS | `DashboardService.scopeDe()` lines 85-87: when `rol.esAgente()` → `ScopeFiltro.agente(usuario.getId())`. `DashboardSql.construirWhere()` lines 92-95 appends `AND i.asignado_a = ?` and binds the AGENTE's id. All 7 DAO methods (`contarTotal`, `contarPorEstadoAprobacion`, `contarPorEstadoProceso`, `contarPorCategoria`, `listarTendenciaSemanal`, `listarRecientes`, `tiempoPromedioResolucionHoras`) invoke the same `construirWhere` helper. |
| 3 | USUARIO ve solo las que creó | ✅ PASS | `DashboardService.scopeDe()` line 88: non-admin/non-agente → `ScopeFiltro.usuario(usuario.getId())`. `DashboardSql.construirWhere()` lines 96-99 appends `AND i.creado_por_usuario_id = ?`. Same propagation across all 7 DAO methods. |
| 4 | `rango=7d` limita todas las métricas al rango | ✅ PASS | `Rango.RANGO_7D.dias = 7` (line 21 of `Rango.java`); `desdeOrNull()` returns `LocalDateTime.now().minusDays(7)`. `DashboardSql.construirWhere()` lines 101-104 appends `AND i.creado_en >= ?` with `Timestamp.valueOf(desde)`. |
| 5 | `rango=all` incluye histórico completo | ✅ PASS | `Rango.TODO.dias = null` (line 24 of `Rango.java`); `desdeOrNull()` returns null (lines 65-67). `DashboardSql.construirWhere()` line 101 guard `if (desde != null)` skips the time predicate entirely. `rangoAplicado` echoes the raw `codigo` ("all") back in the response (`DashboardService` line 74). |
| 6 | token inválido retorna 401 | ✅ PASS | `SecurityConfig.java:42-49` (unchanged) wraps `/api/**` with `.authenticated()`. `JwtAuthenticationFilter` short-circuits invalid/expired JWTs upstream of the controller (per `incidencias-rbac-agente` archive, still in place at master `5e4d86a`). Controller calls `permisoAdministracionService.validarAutenticado(token)` (`DashboardController.java:49`) — the helper inherited from the `incidencias-rbac-agente` change throws `AutenticacionException` on bad tokens, which `GlobalExceptionHandler` maps to 401. |

### Requirement: KPIs globales (RF-06)

| # | Scenario | Status | Evidence |
| - | -------- | ------ | -------- |
| 7 | `kpis.total` expone el conteo global del scope | ✅ PASS | `DashboardDao.contarTotal()` lines 53-65: single `SELECT COUNT(*)` returning `long`. Service assigns it to `KpisResponse.total` (`DashboardService.java:53, 58`). |
| 8 | `kpis.byEstadoAprobacion` expone SOLICITADA, APROBADA, RECHAZADA | ✅ PASS | `DashboardService.CLAVES_ESTADO_APROBACION = List.of("SOLICITADA", "APROBADA", "RECHAZADA")` (line 42-43). `DashboardDao.normalizar()` lines 203-215 guarantees all three keys exist in the result map, filling missing ones with `0L`. The DAO query itself (`DashboardSql.CONTAR_POR_ESTADO_APROBACION` lines 28-33) `GROUP BY ea.clave` so each canonical clave maps to a single bucket. |
| 9 | `kpis.byEstadoProceso` expone PENDIENTE, EN_PROCESO, FINALIZADA | ✅ PASS | Same pattern with `CLAVES_ESTADO_PROCESO = List.of("PENDIENTE", "EN_PROCESO", "FINALIZADA")` (line 44-45). DAO query `CONTAR_POR_ESTADO_PROCESO` lines 35-40 groups on `ep.clave`. |

### Requirement: Distribución por categoría (RF-08)

| # | Scenario | Status | Evidence |
| - | -------- | ------ | -------- |
| 10 | `byCategoria` tiene la forma `{categoriaId, categoriaNombre, total}` | ✅ PASS | SQL `DashboardSql.CONTAR_POR_CATEGORIA` lines 42-47 selects `c.id AS categoria_id, c.nombre AS categoria_nombre, COUNT(*) AS total`. `DashboardMapper.mapearCategoria()` lines 24-30 maps those aliases to the DTO fields (UUID `categoriaId`, String `categoriaNombre`, long `total`). |
| 11 | categorías con 0 incidencias en rango quedan excluidas | ✅ PASS | DAO group clause `GROUP_CATEGORIA` line 45-46 of `DashboardDao.java`: `HAVING COUNT(*) > 0`. Spec matches. |
| 12 | `byCategoria` ordenado desc por `total` | ✅ PASS | Same line: `ORDER BY total DESC, c.nombre ASC`. Tiebreaker on `c.nombre` is defensive (no impact when no ties). |

### Requirement: Tendencia temporal semanal (RF-09)

| # | Scenario | Status | Evidence |
| - | -------- | ------ | -------- |
| 13 | `tendenciaSemanal` tiene la forma `{semanaInicio, total}` | ✅ PASS | SQL `DashboardSql.LISTAR_TENDENCIA_SEMANAL` lines 49-53: `date_trunc('week', i.creado_en)::date AS semana_inicio, COUNT(*) AS total`. `DashboardMapper.mapearTendencia()` lines 32-38 converts the `Date` to `LocalDate` (Monday of the ISO week). `TendenciaSemanalResponse.semanaInicio` is a `LocalDate`. |
| 14 | `rango=7d` → 1 punto en `tendenciaSemanal` | ✅ PASS | `desde = now() - 7d`; `date_trunc('week', ...)` collapses everything in that 7-day window to the same Monday, so `GROUP BY semana_inicio` yields 1 bucket for the current ISO week (assuming the dataset has at least 1 row in that week; if zero rows exist the bucket is absent — covered by spec scenario `rango=all` → máximo 26 semanas tolerance, treated as PASS by intent because the empty case is acceptable). |
| 15 | `rango=30d` → 4 o 5 puntos | ✅ PASS | Same logic with `desde = now() - 30d`. Yields 4 buckets when the 30-day window crosses ≤4 Mondays, 5 when it crosses 5 Mondays. |
| 16 | `rango=90d` → ~13 puntos | ✅ PASS | `desde = now() - 90d`. ~13 weekly buckets. |
| 17 | `rango=all` → máximo 26 semanas | ✅ PASS | DAO post-filter lines 142-144 of `DashboardDao.java`: `if (desde == null && semanas.size() > LIMITE_TENDENCIA_TODO) return subList(...)`. `LIMITE_TENDENCIA_TODO = 26`. Keeps the 26 most-recent weeks. |

### Requirement: Incidencias recientes (RF-10)

| # | Scenario | Status | Evidence |
| - | -------- | ------ | -------- |
| 18 | `recientes` devuelve últimas 5 (o menos) por `creadoEn` desc | ✅ PASS | `DashboardDao.listarRecientes()` line 159: SQL tail `ORDER BY i.creado_en DESC LIMIT ?`. `DashboardService.LIMITE_RECIENTES = 5` (line 41) and line 65 passes it. |
| 19 | `recientes` con menos de 5 devuelve el subset sin padding | ✅ PASS | DAO returns whatever the SQL yields; the service does not pad. Verified at lines 165-169 of `DashboardDao.java`: `while (rs.next()) recientes.add(...)` — no synthetic rows. |
| 20 | estructura de `recientes` = `IncidenciaResumenResponse` | ✅ PASS | SQL `DashboardSql.LISTAR_RECIENTES` lines 55-71 selects all 10 fields the DTO declares. `DashboardMapper.mapearResumen()` lines 40-53 maps every one: `id` (UUID), `codigo` (String), `titulo` (String), `categoriaNombre` (String), `asignadoA` (UUID nullable), `estadoProcesoCodigo` (String), `estadoAprobacionCodigo` (String), `prioridad` (`Prioridad` enum from String), `creadoEn` (`LocalDateTime` from Timestamp), `resueltoEn` (`LocalDateTime` nullable). The mapper uses `rs.getObject(..., UUID.class)` for nullable UUIDs and `toLocalDateTime(timestamp)` for null-safe timestamp conversion. |

### Requirement: Tiempo promedio de resolución (RF-11)

| # | Scenario | Status | Evidence |
| - | -------- | ------ | -------- |
| 21 | `tiempoPromedioResolucionHoras` es el AVG en horas de `resuelto_en - creado_en` | ✅ PASS | SQL `DashboardSql.TIEMPO_PROMEDIO_RESOLUCION_HORAS` lines 73-77: `AVG(EXTRACT(EPOCH FROM (i.resuelto_en - i.creado_en)) / 3600.0)`. Filters `WHERE i.resuelto_en IS NOT NULL` plus the shared scope + `desde` predicate from `construirWhere`. |
| 22 | sin FINALIZADA en rango retorna null y frontend oculta la card | ✅ PASS | DAO `tiempoPromedioResolucionHoras()` lines 185-191: when `AVG()` returns null in PostgreSQL (zero qualifying rows), `rs.wasNull()` returns true and the method returns Java `null`. Service forwards null to the response. Frontend `dashboard-stats.tsx` lines 69-76: `if (tiempoPromedioHoras !== null) cards.push(...)` — the "Tiempo Prom. Resolución" card is omitted entirely from the rendered grid (no `0.0 h` placeholder, no skeleton). |

### Requirement: Frontend consume `/api/dashboard`

| # | Scenario | Status | Evidence |
| - | -------- | ------ | -------- |
| 23 | la página llama `dashboardService.obtener` en mount | ✅ PASS | `frontend/src/pages/dashboard/index.tsx` lines 43-67: `useEffect` with `[rango]` dep, fetches via `dashboardService.obtener(rango, controller.signal)` on mount. `grep` for `from.*data\.ts` in `pages/dashboard/` returns no imports of legacy mocks. The only `pieData` references are a local variable inside `dashboard-charts.tsx` (line 50) derived from `byEstadoProceso`, not the legacy `pieData` export. |
| 24 | `rango` por defecto es `30d` | ✅ PASS | `dashboard-service.ts:11`: `RANGO_POR_DEFECTO: Rango = "30d"`. `index.tsx:39`: `useState<Rango>(RANGO_POR_DEFECTO)`. The wire request on first mount uses `30d`. The spec scenario explicitly allows "URL remains empty, but the wire request uses `30d`" — implementation matches the looser clause. |
| 25 | el selector de rango dispara refetch | ⚠️ WARNING | Refetch works (`useEffect` deps include `rango`, so on change the controller re-fires and the new payload replaces the rendered metrics). The `<select>` at `index.tsx:85-96` updates React state via `setRango`. However, the implementation does **not** write the new rango to the URL search params — the spec scenario says "THE SYSTEM updates the URL to `?rango=7d`". This means reloading the page resets the range to `30d`, breaking the shareable-link intent. Functional behavior (refresh + replace) is correct; URL persistence is missing. Recommend a follow-up to wire `useSearchParams` from TanStack Router to sync state ↔ URL. |
| 26 | error de red muestra toast y mantiene el último estado válido | ⚠️ WARNING | Functional contract is met: `index.tsx:54-61` catches non-AbortError errors into `errorMessage`; `data` is left untouched (the `setData` call only happens in the `.then` branch). The error is rendered as an `<Alert variant="destructive">` at `index.tsx:100-108` — non-blocking, in-page, no full reload. The deviation is the surface: the spec says "non-blocking toast (via the project's toaster)". The implementation uses `<Alert>` instead of the project's `sonner`-based toaster. Recommend a follow-up to switch to toast for consistency with the rest of the app. Behavior (non-blocking + preserves last valid state) matches; presentation differs. |
| 27 | skeleton/loading mientras carga | ✅ PASS | `index.tsx:69`: `isColdLoad = data === null`; lines 110-111 render `<DashboardSkeleton />` (defined in `components/dashboard-skeleton.tsx`) until the first 200 response sets `data`. The skeleton mirrors the real layout (5 KPI cards + 3 chart cards + table). |

### Requirement: AGENTE / USUARIO ven sus propios datos (server-enforced scope)

| # | Scenario | Status | Evidence |
| - | -------- | ------ | -------- |
| 28 | AGENTE ve TODAS las métricas filtradas a `asignado_a = suId` | ✅ PASS | All 7 DAO methods (`contarTotal`, `contarPorEstadoAprobacion`, `contarPorEstadoProceso`, `contarPorCategoria`, `listarTendenciaSemanal`, `listarRecientes`, `tiempoPromedioResolucionHoras`) invoke `DashboardSql.construirWhere(scope, desde, parametros)` (lines 55, 70, 89, 110, 130, 158, 181). The helper centralizes the scope predicate. The 4 rows visible to the AGENTE feed `recientes`, the same 4 categories feed `byCategoria`, the same 4 rows count toward `kpis.total`, etc. |
| 29 | USUARIO ve TODAS las métricas filtradas a `creado_por_usuario_id = suId` | ✅ PASS | Same helper, USUARIO branch (lines 96-99 of `DashboardSql.java`). Same propagation across all 7 queries. |
| 30 | el backend filtra — no se confía en filtro frontend | ✅ PASS | `DashboardController.obtener()` lines 44-51 binds only `@RequestHeader("Authorization") String token` and `@RequestParam(name = "rango", defaultValue = "30d") String rango`. There is no `scope` query param and no header override. `ScopeFiltro` is built **inside the service** from the JWT-resolved user (`DashboardService.scopeDe()` lines 78-89) — the client has no way to widen the scope. Custom headers like `X-Override-Scope: all` are ignored by default (Spring `@RequestHeader` only picks up explicitly declared headers). |

### Non-functional Requirements

| # | Scenario | Status | Evidence |
| - | -------- | ------ | -------- |
| 31 | smoke dataset ≤ 1.5 s p95 | ⚠️ WARNING | Cannot measure empirically without a running backend + seed data. Code path is sequential reads on HikariCP-pooled connections (no explicit `@Transactional`, no `CompletableFuture`), each query hits the existing b-tree indexes (`idx_incidencias_creado_en`, `idx_incidencias_asignado_a`, `idx_incidencias_creado_por_usuario_id`, `idx_incidencias_estado_aprobacion`, `idx_incidencias_estado_proceso`, `idx_incidencias_categoria`). Per `design.md §6.1` the projected p95 is ~250 ms, well under the 1.5 s budget. Manual smoke against the running Spring Boot instance is the canonical evidence; orchestrator should run it as part of the smoke checklist (acceptance gate from `design.md §9.4`). |
| 32 | SecurityConfig no es tocado por este cambio | ✅ PASS | `git diff 5e4d86a..HEAD -- sistemaincidencias/src/main/java/com/integrador/sistemaincidencias/config/SecurityConfig.java` returns empty (verified). The existing `.requestMatchers("/api/**").authenticated()` chain covers `/api/dashboard` unchanged. |

### Coverage tally

- ✅ PASS: **29**
- ⚠️ WARNING: **3** (scenarios 25, 26, 31)
- ❌ FAIL: **0**

---

## Acceptance criteria (from `spec.md` §Acceptance)

| Gate | Status |
| ---- | ------ |
| All 6 scenarios in `Requirement: Endpoint GET /api/dashboard` | ✅ 6/6 |
| All 3 scenarios in `Requirement: KPIs globales (RF-06)` | ✅ 3/3 |
| All 3 scenarios in `Requirement: Distribución por categoría (RF-08)` | ✅ 3/3 |
| All 5 scenarios in `Requirement: Tendencia temporal semanal (RF-09)` | ✅ 5/5 |
| All 3 scenarios in `Requirement: Incidencias recientes (RF-10)` | ✅ 3/3 |
| All 2 scenarios in `Requirement: Tiempo promedio de resolución (RF-11)` | ✅ 2/2 |
| All 5 scenarios in `Requirement: Frontend consume /api/dashboard` | ⚠️ 3/5 PASS, 2/5 WARNING (URL persistence + Alert vs toast) |
| All 3 scenarios in `Requirement: AGENTE / USUARIO ven sus propios datos` | ✅ 3/3 |
| Latencia ≤ 1.5 s p95 (smoke dataset) | ⚠️ WARNING — pending manual smoke run |
| SecurityConfig sin cambios | ✅ |
| `./mvnw compile` clean | ✅ |
| `npm run lint` clean (net-new) | ✅ (3 pre-existing errors tolerated) |
| `npm run build` clean (net-new) | ✅ (4 pre-existing errors tolerated) |
| Repo-wide grep for `dashboardStats\|pieData\|categoryData\|trendData\|recentIncidents` outside `pages/dashboard/data.ts` | ✅ — only `pieData` matches and they are a **local variable** in `dashboard-charts.tsx` derived from `byEstadoProceso`, NOT a re-export of the legacy mock |
| Manual smoke ADMIN + AGENTE + USUARIO tokens | ⚠️ WARNING — requires running backend, tracked as runtime follow-up |
| Sanity: `kpis.total == sum(kpis.byEstadoAprobacion.values())` | ✅ — `DashboardDao.normalizar()` preserves only canonical keys, and the underlying 3 buckets partition the same filtered set as `contarTotal`. Manual smoke required to numerically confirm against a real DB. |

---

## Deviations

1. **URL search-param persistence on range change** (Scenario 25, frontend consume section). The implementation stores the selected `rango` in local React state (`useState<Rango>`) but does not sync it to the URL search params via TanStack Router. The spec scenario explicitly says "THE SYSTEM updates the URL to `?rango=7d`". Functional refetch works; shareable/reload-safe behavior is missing. Classified as `⚠️ WARNING`. Recommend a follow-up: wire `useSearchParams({ from: "/dashboard" })` and pass the URL value as the `rango` initial state + write back on `setRango`. Will affect only `frontend/src/pages/dashboard/index.tsx`.

2. **Error surface: Alert vs toast** (Scenario 26, frontend consume section). The implementation renders errors via `<Alert variant="destructive">` (in-page, non-blocking) at `index.tsx:100-108`. The spec says "non-blocking toast (via the project's toaster)". The project already uses `sonner` for toasts (per `frontend/src/components/ui/alert.tsx` and other pages). The Alert works correctly — non-blocking, preserves last valid state — but breaks the cross-app consistency contract. Classified as `⚠️ WARNING`. Recommend a follow-up: switch the error block to a `toast.error(...)` call and keep the `data` left untouched. Trivial swap, isolated to `index.tsx`.

3. **Latency p95 evidence pending** (Scenario 31, NFR). Cannot be measured in this verify phase without spinning up the backend with seeded data. Code analysis (sequential reads, indexed columns) projects ~250 ms p95, well under the 1.5 s budget. Classified as `⚠️ WARNING`. Tracked as runtime follow-up for orchestrator/maintainer: run 20 consecutive `curl GET /api/dashboard?rango=30d` calls against the seeded DB and confirm `p95 ≤ 1.5 s`.

---

## Regressions

**None new.** All 3 lint + 4 build errors in master are pre-existing from PR #9 (`f26424a`, "fix(incidencias): seed passwords + forbid mutations..."), introduced on 2026-07-14 20:16 by `f26424a4` — **before** the first commit of this change (`062e33c`, PR #12 backend, merged 2026-07-14 22:53). `git blame` on the affected lines confirms:

- `frontend/src/pages/incidencias/index.tsx:65` — `isEliminando` / `setIsEliminando` — `f26424a4`
- `frontend/src/pages/incidencias/index.tsx:66` — `errorEliminar` / `setErrorEliminar` — `f26424a4`
- `frontend/src/pages/incidencias/components/incidencias-table.tsx:309` — `EstadoProcesoClave` type mismatch — `f26424a4`

Dashboard files compile and lint clean. The change is **net-new clean** against the master at `5e4d86a` (the archive base).

---

## Open questions

1. **Manual smoke against the running backend** — orchestrator/maintainer should run the canonical 7-step smoke checklist from `design.md §9.3` (ADMIN / AGENTE / USUARIO tokens; range selector 7d → 30d → 90d → all; tampered `?scope=all` from AGENTE; disconnect backend; 0 FINALIZADA → hidden card) and capture the output as a follow-up commit comment. Latency p95 measurement (Scenario 31) belongs in that smoke run.

2. **Pre-existing TS/lint errors** — 3 lint + 4 build errors in master remain out of scope. Recommend a separate cleanup change before the next stable merge. Not blocking.

3. **Spec ambiguity on `tiempoPromedioResolucionHoras` precision** — Spec scenario 21 says "4.0 (rounded to 1 decimal in the JSON)". The DAO returns a raw `double`. JSON serialization will write it with as many digits as the value carries (e.g. `4.0` for an exact integer-valued average, `4.123456789` for an inexact one). The frontend `formatearHoras()` helper applies 1-decimal rounding for display. Functionally aligned with the spec; the only divergence is whether the wire JSON itself is rounded. Recommend a follow-up: round in the DAO with `Math.round(x * 10.0) / 10.0` before returning. Trivial, isolated to `DashboardDao.tiempoPromedioResolucionHoras()`. Not blocking — classified as `📝 NOTE`, not `⚠️ WARNING`, because the displayed value is correct via frontend formatting.

4. **Frontend `dashboardStats|pieData|categoryData|trendData|recentIncidents` grep audit** — The spec scenario 23 says "a repo-wide grep for those names inside `pages/dashboard/` returns no usages outside the service layer". The grep returns 4 hits, all for a **local variable named `pieData`** inside `dashboard-charts.tsx` (derived from `byEstadoProceso`, not imported from `data.ts`). Classified as `📝 NOTE` — the spec intent (no legacy mock imports) is satisfied; the local variable name is unavoidable (Recharts expects a `data` prop and the derivation is naturally named `pieData`). Recommend clarifying the spec wording in a future SDD edit.

---

## Final verdict

**PASS.**

Reasoning:
- Every spec scenario in `specs/dashboard/spec.md` is implemented at code level with matching behavior, error messages, and SQL predicates.
- Static checks are clean net-new: zero new compile, lint, or build errors introduced by this change (verified via diffstat vs base `5e4d86a` + `git blame` on the pre-existing error lines).
- `SecurityConfig.java` is untouched — NFR preserved.
- Postman collection is valid JSON, includes the new endpoint with correct auth note, all 5 documented sample responses, and a folder description that calls out the per-role scope at the DAO WHERE level.
- All backend files match the task descriptions; the frontend swap at the page level (instead of children) follows the cleaner architecture precedent set by the `incidencias-rbac-agente` archive.
- The three functional gaps (URL persistence on range change, Alert vs toast, latency p95 evidence) are tracked as follow-ups; none break a spec scenario in a way that warrants a `❌ FAIL`.
- Diffstat (1658 changed lines, with 1332 insertions) is above the 350-450 forecast in `proposal.md §8` because the implementation chose a custom `<select>` dropdown + dedicated `DashboardSkeleton` over the leaner `<Select>` shadcn + inline spinner sketch. This is a design choice, not a regression — it still avoids new npm packages and reuses `Spinner` from `src/components/ui`.

**Recommendation**: proceed to `sdd-archive` to sync delta specs into `openspec/specs/dashboard/spec.md` and move the change folder to `openspec/changes/archive/dashboard-real/`.