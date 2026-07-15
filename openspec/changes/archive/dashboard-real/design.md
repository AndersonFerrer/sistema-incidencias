# Design: Dashboard real con `GET /api/dashboard`

**Capability**: `dashboard` (NEW)
**Change**: `dashboard-real`
**Date**: 2026-07-14
**Status**: designed
**Depends on**: `incidencias-rbac-agente` (archived) — reuses the `validarAutenticado` helper and the per-role WHERE-injection pattern in the controller.

## 1. Architectural decisions

### D1 — Single endpoint `GET /api/dashboard` with 7 sub-queries instead of multiple endpoints

Two options were considered:

- **(a) Split into separate endpoints per block** (`/api/dashboard/kpis`, `/api/dashboard/categorias`, `/api/dashboard/tendencia`, …): clean REST semantics, but the frontend ends up with **7 round-trips per page load** and 7 AbortControllers. Perceptibly slower, more failure modes, network chatter multiplied.
- **(b) Single endpoint that orchestrates the 7 aggregations internally** and returns one composed `DashboardResponse`: one round-trip, one AbortSignal, one loading state, one error path. The controller stays thin (≤ 20 lines); the service orchestrates the 7 DAO calls and composes the response.

**Decision: (b).** Aligns with the user's current mental model ("the Dashboard page → one response"). `frontend/src/pages/dashboard/` already fetches once and renders 6 sections; making the wire contract match eliminates waterfall rendering. Trade-off is a slightly heavier controller-level response (~5-10 KB JSON) which is trivial at this scale.

### D2 — Server-side filtering only (DAO WHERE scope), never trust client

The per-role scope must be enforced at the SQL layer:

- ADMINISTRADOR → no extra predicate.
- AGENTE → `AND i.asignado_a = ?` (current user id).
- USUARIO → `AND i.creado_por_usuario_id = ?` (current user id).

The controller injects the override from `authService.obtenerUsuarioActual(token)` **before** calling the service — same pattern as `IncidenciaController.listar` (archive design D4). Any client hint (custom header `X-Override-Scope: all`, extra query param `?scope=all`) is ignored; the server is source of truth. This is enforced by spec scenario `el backend filtra — no se confía en filtro frontend`.

**Why this matters**: AGENTEs sending `?scope=all` cannot widen their view. USUARIOs cannot leak other people's data by tampering with the request. The frontend range selector (`7d|30d|90d|all`) ONLY affects the time filter, not the scope.

### D3 — Read-only, no explicit `@Transactional` wrapping (single connection, sequential reads)

The 7 aggregations are independent reads. Per proposal §8 ("riesgos funcionales"): they execute serially on a single pooled connection without an explicit transaction wrapping — read-only access pattern, HikariCP `autoCommit=true` (default) is sufficient.

**Trade-off**: 7 sequential queries block ~7 × query-time on the connection. For smoke dataset (<1000 rows, ~10-30 ms per query), expected total is 70-210 ms well under the 1.5 s p95 budget. **Parallelization via `CompletableFuture` is a follow-up**, not in this change — the proposal explicitly defers it.

If a regression surfaces in production, the next step is to wrap the 7 in a parallel pipeline with a dedicated `ExecutorService` and JOIN both grouped-key and ranged queries via Postgres `cost-based optimization` over per-user filtered subqueries (not in MVP).

### D4 — WHERE-builder with parametric `LocalDateTime desde`, NEVER concatenate from user input

Per `AGENTS.md` §14 (DAO rules) and following `IncidenciaDao.construirWhere`:

- The `rango` query param is validated to a 4-value enum `{7d, 30d, 90d, all}` in the controller.
- The service computes `LocalDateTime desde = (rango == all) ? null : LocalDateTime.now().minusDays(N)` and passes it as a Timestamp parameter to each DAO method.
- The DAO appends `AND i.creado_en >= ?` only when `desde != null` and binds via `PreparedStatement.setObject`. **Never uses SQL string concatenation with user data.**
- For `rango == all`: no time-bound clause; same `WHERE` builder returns just the optional scope fragment.

This stays consistent with the existing `IncidenciaDao` pattern (archive reference: line 211 of the existing DAO uses `Timestamp.valueOf(filtro.getDesde().atStartOfDay())`).

### D5 — Reuse `IncidenciaResumenResponse` instead of fat `IncidenciaResponse`

`IncidenciaResponse` (existing) carries `descripcion`, `clienteId`, `estadoProcesoId`, `estadoAprobacionId`, `usuarioExternoId`, `actualizadoEn`, etc. — 14 fields, most irrelevant to a dashboard summary.

The new `IncidenciaResumenResponse` (introduced here, per spec) carries only the dashboard-relevant subset: `id`, `codigo`, `titulo`, `categoriaNombre`, `asignadoA`, `estadoProcesoCodigo`, `estadoAprobacionCodigo`, `prioridad`, `creadoEn`, `resueltoEn` (10 fields). Smaller JSON, no leakage of internal UUIDs the dashboard doesn't render, no need to denormalize state names client-side.

The existing `IncidenciaResponse` is NOT touched. This is purely additive.

### D6 — No new DB indexes; existing b-tree indexes cover the workload

All 7 aggregations hit columns that already have b-tree indexes from migration `V003__catalogos_base.sql` and `scripts/004_incidencias_relaciones.sql`:

| Index (existing) | Column | Used by |
|---|---|---|
| `idx_incidencias_creado_en` | `creado_en` | rango bound (queries 1-7) |
| `idx_incidencias_asignado_a` | `asignado_a` | AGENTE scope, recientes ORDER BY candidate |
| `idx_incidencias_creado_por_usuario` | `creado_por_usuario_id` | USUARIO scope |
| `idx_incidencias_estado_aprobacion` | `estado_aprobacion_id` | GROUP BY (query 2) |
| `idx_incidencias_estado_proceso` | `estado_proceso_id` | GROUP BY (query 3) |
| `idx_incidencias_categoria` | `categoria_id` | GROUP BY (query 4), JOIN |
| `idx_estados_aprobacion_clave` | `upper(clave)` | JOIN to `estados_aprobacion` |
| `idx_incidencias_cliente` | `cliente_id` | not strictly needed for V1 |

No `CREATE INDEX` in this change. Confirmed by reading `scripts/004_incidencias_relaciones.sql` lines 238-269.

### D7 — Caching is explicit follow-up; first cut executes SQL directly

Per proposal §6 ("Cache del backend (Caffeine, Redis): el primer corte es SQL directo. Si RNF-01 falla en cargas grandes, se añade en follow-up."): no `Caffeine`, no `Redis`, no `@Cacheable`. The 7 sub-queries are fast enough for the smoke dataset. The Postman collection smoke test against ≤1000 rows is the verification budget; p95 must be ≤1.5 s.

If a regression hits production, a Caffeine `CacheBuilder` keyed on `(userId, rango)` with `expireAfterWrite(60s)` is the proposed follow-up (already noted in `proposal.md §10`).

### D8 — Frontend range selector triggers refetch, not client-side filter

The range selector is not a client-side filter — it re-issues the wire request. This matches the spec (`el selector de rango dispara refetch`) and matches the architectural principle that filtering happens server-side (D2). The `rango` value is stored in URL search params so the page is shareable and reload-safe.

The frontend also keeps the last successful response in state; on error, a toast shows but the previous state stays on screen (spec: `error de red muestra toast y mantiene el último estado válido`).

## 2. Backend architecture

### 2.1 Module structure (new `dashboard/` package)

New module following `AGENTS.md` §6 (módulos funcionales) and mirroring `incidencias/`:

```
sistemaincidencias/src/main/java/com/integrador/sistemaincidencias/dashboard/
  controller/DashboardController.java     # ~25 LOC
  service/DashboardService.java           # ~100 LOC, orchestrates 7 DAO calls
  dao/DashboardDao.java                   # ~120 LOC, 7 methods, parametric
  sql/DashboardSql.java                   # SQL constants + WHERE builder helpers
  mapper/DashboardMapper.java             # ResultSet → DTO conversions
  dto/
    DashboardResponse.java                # composes KpisResponse + lists
    KpisResponse.java                     # total + byEstadoAprobacion + byEstadoProceso
    CategoriaConteoResponse.java          # {categoriaId, categoriaNombre, total}
    TendenciaSemanalResponse.java         # {semanaInicio (LocalDate), total}
    IncidenciaResumenResponse.java        # NEW slim DTO for recientes
```

Naming follows the existing project convention (`IncidenciaDao`, `IncidenciaSql`, `IncidenciaMapper`); same suffixes everywhere.

### 2.2 Controller — `DashboardController.java`

```java
package com.integrador.sistemaincidencias.dashboard.controller;

@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService dashboardService;
    private final PermisoAdministracionService permisoService;

    @GetMapping
    public ResponseEntity<DashboardResponse> obtener(
            @RequestHeader("Authorization") String token,
            @RequestParam(name = "rango", defaultValue = "30d") String rango) {
        // 1. validate rango
        Rango rangoValido = Rango.from(rango); // throws ReglaNegocioException on invalid
        // 2. resolve current user (auth-only, no role gate)
        Usuario actual = permisoService.validarAutenticado(token);
        // 3. delegate to service
        return ResponseEntity.ok(dashboardService.construir(actual, rangoValido));
    }

    private enum Rango {
        RANGO_7D(7, "7d"), RANGO_30D(30, "30d"), RANGO_90D(90, "90d"), TODO(null, "all");
        private static Rango from(String s) { ... } // throws ReglaNegocioException
    }
}
```

- The controller does NOT call DAOs directly (AGENTS.md §10). It validates input, resolves the user, and delegates.
- No changes to `SecurityConfig.java` (covered by `requestMatchers("/api/**").authenticated()` — see spec NFR §`SecurityConfig sin cambios`).
- `validarAutenticado` (added by archive change A) is reused; no `validarAdministrador`.

### 2.3 Service — `DashboardService.java`

Orchestrates the 7 DAO calls. ~100 LOC, no business rules beyond composition:

```java
public DashboardResponse construir(Usuario actual, Rango rango) {
    ScopeFiltro scope = ScopeFiltro.de(actual);                  // builds {asignadoA | creadoPorUsuarioId | null}
    LocalDateTime desde = rango == Rango.TODO ? null : LocalDateTime.now().minusDays(rango.dias);

    KpisResponse kpis = kpisDe(scope, desde);
    List<CategoriaConteoResponse> byCategoria = categoriaDao.contarPorCategoria(scope, desde);
    List<TendenciaSemanalResponse> tendencia = dashboardDao.listarTendenciaSemanal(scope, desde, rango);
    List<IncidenciaResumenResponse> recientes = dashboardDao.listarRecientes(scope, desde, 5);
    Double tiempo = dashboardDao.tiempoPromedioResolucionHoras(scope, desde);

    return DashboardResponse.builder()
            .kpis(kpis)
            .byCategoria(byCategoria)
            .tendenciaSemanal(tendencia)
            .recientes(recientes)
            .tiempoPromedioResolucionHoras(tiempo)             // null when no FINALIZADA
            .rangoAplicado(rango.codigo)                        // "7d"|"30d"|"90d"|"all"
            .build();
}

private record ScopeFiltro(UUID asignadoA, UUID creadoPorUsuarioId) {
    static ScopeFiltro de(Usuario u) {
        if (u.getRol().esAdministrador()) return new ScopeFiltro(null, null);
        if (u.getRol().esAgente())         return new ScopeFiltro(u.getId(), null);
        return new ScopeFiltro(null, u.getId());                  // USUARIO
    }
}
```

The 7 DAO calls run sequentially on one connection per call (HikariCP, no explicit TX). This is sufficient per D3.

### 2.4 DAO — `DashboardDao.java`

`@Component` with constructor injection of `DataSource` + `DashboardMapper`. 7 methods, each one HTTP GET-able as a single SQL round-trip.

Key methods:

```java
public long contarTotal(ScopeFiltro scope, LocalDateTime desde) { ... }
public Map<String, Long> contarPorEstadoAprobacion(ScopeFiltro scope, LocalDateTime desde) { ... }
public Map<String, Long> contarPorEstadoProceso(ScopeFiltro scope, LocalDateTime desde) { ... }
public List<CategoriaConteoResponse> contarPorCategoria(ScopeFiltro scope, LocalDateTime desde) { ... }
public List<TendenciaSemanalResponse> listarTendenciaSemanal(ScopeFiltro scope, LocalDateTime desde, Rango rango) { ... }
public List<IncidenciaResumenResponse> listarRecientes(ScopeFiltro scope, LocalDateTime desde, int limite) { ... }
public Double tiempoPromedioResolucionHoras(ScopeFiltro scope, LocalDateTime desde) { ... }
```

Returns `null` (not `0.0`) from `tiempoPromedioResolucionHoras` when no rows match; the service forwards null to the response. Mapper handles `OptionalDouble` → nullable `Double`.

### 2.5 SQL strategy — `DashboardSql.java`

All queries use **parametric bindings only**. Per AGENTS.md §14: "usar parametros, nunca concatenar valores del usuario". The validated enum `rango` and the resolved `ScopeFiltro` come from `DashboardService`, never raw from the request.

Helper for the shared scope+time WHERE fragment (used in 7/7 queries):

```sql
-- Applied to every query in the dashboard.
WHERE 1 = 1
  [AND i.asignado_a = ?]            -- if scope.asignadoA != null (AGENTE)
  [AND i.creado_por_usuario_id = ?] -- if scope.creadoPorUsuarioId != null (USUARIO)
  [AND i.creado_en >= ?]            -- if desde != null (rango != 'all')
```

Each query below is fully written and lifted directly by the apply agent.

---

**Q1 — `contarTotal(scope, desde)`**

```sql
SELECT COUNT(*)
FROM incidencias i
WHERE 1 = 1
  [AND i.asignado_a = ?]
  [AND i.creado_por_usuario_id = ?]
  [AND i.creado_en >= ?]
```

Bind order: `assignedScopeParam(0..1)`, `createdAtParam(0..1)`. Returns 1 row × 1 column → `long`.

---

**Q2 — `contarPorEstadoAprobacion(scope, desde)`**

```sql
SELECT ea.clave AS estado_aprobacion_codigo,
       COUNT(*)   AS total
FROM incidencias i
INNER JOIN estados_aprobacion ea ON ea.id = i.estado_aprobacion_id
WHERE 1 = 1
  [AND i.asignado_a = ?]
  [AND i.creado_por_usuario_id = ?]
  [AND i.creado_en >= ?]
GROUP BY ea.clave
```

Returns `<clave, total>`. Service fills missing keys (`SOLICITADA`, `APROBADA`, `RECHAZADA`) with 0 to honor spec scenario `byEstadoAprobacion expone SOLICITADA, APROBADA y RECHAZADA`.

---

**Q3 — `contarPorEstadoProceso(scope, desde)`**

```sql
SELECT ep.clave AS estado_proceso_codigo,
       COUNT(*)  AS total
FROM incidencias i
INNER JOIN estados_proceso ep ON ep.id = i.estado_proceso_id
WHERE 1 = 1
  [AND i.asignado_a = ?]
  [AND i.creado_por_usuario_id = ?]
  [AND i.creado_en >= ?]
GROUP BY ep.clave
```

Same pattern as Q2; fills `PENDIENTE`, `EN_PROCESO`, `FINALIZADA` defaults to 0.

---

**Q4 — `contarPorCategoria(scope, desde)`**

```sql
SELECT c.id     AS categoria_id,
       c.nombre AS categoria_nombre,
       COUNT(*) AS total
FROM incidencias i
INNER JOIN categorias c ON c.id = i.categoria_id
WHERE 1 = 1
  [AND i.asignado_a = ?]
  [AND i.creado_por_usuario_id = ?]
  [AND i.creado_en >= ?]
GROUP BY c.id, c.nombre
HAVING COUNT(*) > 0
ORDER BY total DESC, c.nombre ASC
```

Excludes categorias with 0 (HAVING) — matches spec. ORDER BY desc by total matches `byCategoria ordenado desc por total`.

---

**Q5 — `listarTendenciaSemanal(scope, desde, rango)`**

```sql
SELECT date_trunc('week', i.creado_en)::date AS semana_inicio,
       COUNT(*)                                AS total
FROM incidencias i
WHERE 1 = 1
  [AND i.asignado_a = ?]
  [AND i.creado_por_usuario_id = ?]
  [AND i.creado_en >= ?]
GROUP BY semana_inicio
ORDER BY semana_inicio ASC
```

Bucket truncation uses PostgreSQL `date_trunc('week', …)` — assumes PostgreSQL (project standard; per migration `V003__catalogos_base.sql`). `date_trunc('week', timestamp)` returns the Monday of the ISO week in the session's timezone.

For `rango == TODO` (`all`): cap at the latest 26 weekly buckets (~6 months) to honor spec scenario `rango=all` → máximo 26 semanas. Implementation wraps the query: when `rango == TODO`, replace `GROUP BY` clause with one on `(SELECT semana_inicio FROM (... ) z ORDER BY semana_inicio DESC LIMIT 26)` — done via a service-layer post-filter on the limited result. **Service-level decision, NOT a string concat.** Simpler approach: do a single full query, then trim in Java:

```java
List<TendenciaSemanalResponse> cruda = ejecutarQ5(scope, /*sin desde*/);
if (rango == Rango.TODO && cruda.size() > 26) {
    return cruda.subList(cruda.size() - 26, cruda.size()); // keep the 26 most recent weeks
}
return cruda;
```

---

**Q6 — `listarRecientes(scope, desde, limite)`**

```sql
SELECT i.id                    AS incidencia_id,
       i.codigo                AS incidencia_codigo,
       i.titulo                AS incidencia_titulo,
       c.nombre                AS categoria_nombre,
       i.asignado_a            AS asignado_a,
       ep.clave                AS estado_proceso_codigo,
       ea.clave                AS estado_aprobacion_codigo,
       i.prioridad             AS prioridad,
       i.creado_en             AS creado_en,
       i.resuelto_en           AS resuelto_en
FROM incidencias i
INNER JOIN categorias c  ON c.id = i.categoria_id
INNER JOIN estados_proceso ep ON ep.id = i.estado_proceso_id
INNER JOIN estados_aprobacion ea ON ea.id = i.estado_aprobacion_id
WHERE 1 = 1
  [AND i.asignado_a = ?]
  [AND i.creado_por_usuario_id = ?]
  [AND i.creado_en >= ?]
ORDER BY i.creado_en DESC
LIMIT ?
```

`limite` is bound (default 5; passed from controller as a constant — never raw from request). The result maps via `DashboardMapper.mapResumen(rs)` to `IncidenciaResumenResponse`.

---

**Q7 — `tiempoPromedioResolucionHoras(scope, desde)`**

```sql
SELECT AVG(EXTRACT(EPOCH FROM (i.resuelto_en - i.creado_en)) / 3600.0) AS promedio_horas
FROM incidencias i
WHERE i.resuelto_en IS NOT NULL
  [AND i.asignado_a = ?]
  [AND i.creado_por_usuario_id = ?]
  [AND i.creado_en >= ?]
```

`AVG()` over zero rows returns `NULL` in PostgreSQL → DAO returns `Double` (nullable); service forwards it. When null, frontend OMITS the card entirely per spec scenario `sin FINALIZADA en rango retorna null y el frontend oculta la card`.

---

### 2.6 Endpoint contract — `GET /api/dashboard?rango=30d`

- **Route**: `GET /api/dashboard`
- **Auth**: `Authorization: Bearer <token>` — enforced by `JwtAuthenticationFilter` chain (SecurityConfig line 47 covers `/api/**`).
- **Query**: `rango ∈ {7d, 30d, 90d, all}` — default `30d`. Invalid value → 400 `ReglaNegocioException`.
- **Response (200)**: `DashboardResponse` (below).
- **Errors**: 401 (invalid/missing token, filter short-circuits), 400 (invalid `rango`).

```java
public class DashboardResponse {
    private KpisResponse kpis;
    private List<CategoriaConteoResponse> byCategoria;
    private List<TendenciaSemanalResponse> tendenciaSemanal;
    private List<IncidenciaResumenResponse> recientes;          // size 0..5
    private Double tiempoPromedioResolucionHoras;               // null → frontend omits card
    private String rangoAplicado;                              // "30d"
}
```

### 2.7 Files added (backend)

- `sistemaincidencias/src/main/java/com/integrador/sistemaincidencias/dashboard/controller/DashboardController.java`
- `sistemaincidencias/src/main/java/com/integrador/sistemaincidencias/dashboard/service/DashboardService.java`
- `sistemaincidencias/src/main/java/com/integrador/sistemaincidencias/dashboard/dao/DashboardDao.java`
- `sistemaincidencias/src/main/java/com/integrador/sistemaincidencias/dashboard/sql/DashboardSql.java`
- `sistemaincidencias/src/main/java/com/integrador/sistemaincidencias/dashboard/mapper/DashboardMapper.java`
- `sistemaincidencias/src/main/java/com/integrador/sistemaincidencias/dashboard/dto/DashboardResponse.java`
- `sistemaincidencias/src/main/java/com/integrador/sistemaincidencias/dashboard/dto/KpisResponse.java`
- `sistemaincidencias/src/main/java/com/integrador/sistemaincidencias/dashboard/dto/CategoriaConteoResponse.java`
- `sistemaincidencias/src/main/java/com/integrador/sistemaincidencias/dashboard/dto/TendenciaSemanalResponse.java`
- `sistemaincidencias/src/main/java/com/integrador/sistemaincidencias/dashboard/dto/IncidenciaResumenResponse.java`

## 3. Frontend architecture

### 3.1 Service layer

New file `frontend/src/services/dashboard-service.ts`, following the same pattern as `incidents-service.ts`:

```typescript
import { apiRequest } from "@/lib/http"

export type Rango = "7d" | "30d" | "90d" | "all"
export const RANGO_POR_DEFECTO: Rango = "30d"

export type Kpis = {
  total: number
  byEstadoAprobacion: Record<string, number>
  byEstadoProceso: Record<string, number>
}

export type CategoriaConteo = {
  categoriaId: string
  categoriaNombre: string
  total: number
}

export type TendenciaSemanal = {
  semanaInicio: string  // ISO LocalDate (YYYY-MM-DD, server's Monday-of-week)
  total: number
}

export type IncidenciaResumen = {
  id: string
  codigo: string
  titulo: string
  categoriaNombre: string
  asignadoA: string | null
  estadoProcesoCodigo: string
  estadoAprobacionCodigo: string
  prioridad: Prioridad
  creadoEn: string
  resueltoEn: string | null
}

export type Dashboard = {
  kpis: Kpis
  byCategoria: CategoriaConteo[]
  tendenciaSemanal: TendenciaSemanal[]
  recientes: IncidenciaResumen[]
  tiempoPromedioResolucionHoras: number | null
  rangoAplicado: Rango
}

export const dashboardService = {
  obtener(rango: Rango = RANGO_POR_DEFECTO, signal?: AbortSignal): Promise<Dashboard> {
    return apiRequest<Dashboard>(`/api/dashboard?rango=${rango}`, { method: "GET", signal })
  },
}
```

`Prioridad` is re-used from `@/types/incidencias` (already exported). Types are colocated with the service since they are not consumed elsewhere (proposal §3.4 marks `types/dashboard.ts` as optional, only if shared with other pages — not the case here, so colocated in the service file).

### 3.2 Page refactor — `pages/dashboard/index.tsx`

Becomes a fetch-effect component. Stays inside `AppLayout`/`PrivateRoute` (frontend AGENTS.md — no duplicated auth redirects).

```typescript
export function DashboardPage() {
  const user = useAuthStore((state) => state.user)
  const displayName = user?.nombre ?? "Invitado"

  const [rango, setRango] = useState<Rango>(RANGO_POR_DEFECTO)
  const [data, setData] = useState<Dashboard | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<ApiError | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    dashboardService
      .obtener(rango, controller.signal)
      .then((payload) => {
        setData(payload)
        setError(null)
      })
      .catch((err) => {
        if (err.name !== "AbortError") setError(err)
      })
      .finally(() => setLoading(false))
    return () => controller.abort()
  }, [rango])

  return (
    <div className="flex flex-col gap-3">
      <header className="flex items-end justify-between gap-3">
        <section className="flex flex-col gap-0.5">
          <h1 className="text-2xl font-bold tracking-tight text-slate-950">Dashboard</h1>
          <p className="text-xs text-slate-500">Bienvenido, {displayName}. ...</p>
        </section>
        <Select value={rango} onValueChange={(v) => setRango(v as Rango)}>
          <SelectItem value="7d">Últimos 7 días</SelectItem>
          <SelectItem value="30d">Últimos 30 días</SelectItem>
          <SelectItem value="90d">Últimos 90 días</SelectItem>
          <SelectItem value="all">Todo el histórico</SelectItem>
        </Select>
      </header>

      {/* Loading skeleton mientras no haya data */}
      {loading && data === null ? (
        <DashboardSkeleton />
      ) : (
        <>
          <DashboardStats
            kpis={data!.kpis}
            tiempoPromedioHoras={data!.tiempoPromedioResolucionHoras}
          />
          <DashboardCharts
            byCategoria={data!.byCategoria}
            tendenciaSemanal={data!.tendenciaSemanal}
            byEstadoProceso={data!.kpis.byEstadoProceso}
          />
          <RecentIncidentsTable recientes={data!.recientes} />

          {/* Error toast — keeps last valid state per spec D8 */}
          {error && (
            <SonnerToaster toast={{ title: "Error al cargar el dashboard", description: error.message }} />
          )}
        </>
      )}
    </div>
  )
}
```

The page keeps the previous valid state on error: when `error` is set, `data` is left untouched, the toast appears, and the dashboard still renders. On a fresh remount with no prior data, the skeleton shows until first successful fetch.

### 3.3 Components — props-driven (no `import "data.ts"`)

| Component | New props | Change |
|---|---|---|
| `dashboard-stats.tsx` | `kpis: Kpis`, `tiempoPromedioHoras: number \| null` | drops `import { dashboardStats } from "data.ts"`; renders KPI cards from props, OMITS the "Tiempo Prom." card when `tiempoPromedioHoras === null` |
| `dashboard-charts.tsx` | `byCategoria: CategoriaConteo[]`, `tendenciaSemanal: TendenciaSemanal[]`, `byEstadoProceso: Record<string, number>` | drops `import { categoryData, pieData, trendData } from "data.ts"`; derives pieData from byEstadoProceso |
| `recent-incidents-table.tsx` | `recientes: IncidenciaResumen[]` | drops `import { recentIncidents } from "data.ts"`; maps `IncidenciaResumen` rows. `StatusBadge`/`PriorityBadge` updated to accept backend codes (`SOLICITADA`, `APROBADA`, …) |

### 3.4 `data.ts` — visual config only

After the change, `frontend/src/pages/dashboard/data.ts` keeps **only static visual config** (no mocked data):

```typescript
// Kept: visual config (colors, label maps used by the new components).
export const chartColors = { ... }
export const pieColors = [ ... ]
export const statusLabels: Record<string, string> = {
  SOLICITADA: "Solicitada", ACEPTADA: "Aceptada", PENDIENTE: "Pendiente",
  EN_PROCESO: "En Proceso", FINALIZADA: "Finalizada", RECHAZADA: "Rechazada",
  APROBADA: "Aprobada",
}
export const priorityLabels: Record<Prioridad, string> = {
  BAJA: "Baja", MEDIA: "Media", ALTA: "Alta", CRITICA: "Crítica",
}
```

Removed: `incidents`, `dashboardStats`, `pieData`, `categoryData`, `trendData`, `recentIncidents`. Removed types: `Incident`, `IncidentStatus`, `IncidentPriority` — the components now consume `Dashboard` types from `dashboard-service.ts`.

A repo-wide grep for `dashboardStats|pieData|categoryData|trendData|recentIncidents` outside `pages/dashboard/data.ts` (legacy visual-config file) must return 0 matches after this change — this is a spec scenario acceptance criterion.

### 3.5 Files modified (frontend)

- `frontend/src/pages/dashboard/index.tsx` — fetch-effect, range selector, error + loading state.
- `frontend/src/pages/dashboard/components/dashboard-stats.tsx` — props in, no `data.ts` import.
- `frontend/src/pages/dashboard/components/dashboard-charts.tsx` — props in, derive pieData from byEstadoProceso.
- `frontend/src/pages/dashboard/components/recent-incidents-table.tsx` — props in, map IncidenciaResumen rows.
- `frontend/src/pages/dashboard/components/status-badges.tsx` — update enums/labels to match backend codes.
- `frontend/src/pages/dashboard/data.ts` — strip mocks, keep visual config.

### 3.6 Files added (frontend)

- `frontend/src/services/dashboard-service.ts`

## 4. Files affected (complete list)

### Added (backend)

| File | One-line description |
|---|---|
| `sistemaincidencias/src/main/java/com/integrador/sistemaincidencias/dashboard/controller/DashboardController.java` | REST controller, `GET /api/dashboard?rango=` |
| `sistemaincidencias/src/main/java/com/integrador/sistemaincidencias/dashboard/service/DashboardService.java` | Orchestrates 7 DAO calls, builds DashboardResponse |
| `sistemaincidencias/src/main/java/com/integrador/sistemaincidencias/dashboard/dao/DashboardDao.java` | 7 native-SQL methods with parametric bindings |
| `sistemaincidencias/src/main/java/com/integrador/sistemaincidencias/dashboard/sql/DashboardSql.java` | SQL constants + scope/rango WHERE fragment builders |
| `sistemaincidencias/src/main/java/com/integrador/sistemaincidencias/dashboard/mapper/DashboardMapper.java` | `ResultSet → DTO` for list items |
| `sistemaincidencias/src/main/java/com/integrador/sistemaincidencias/dashboard/dto/DashboardResponse.java` | Top-level response composing Kpis + lists + rangoAplicado |
| `sistemaincidencias/src/main/java/com/integrador/sistemaincidencias/dashboard/dto/KpisResponse.java` | `{total, byEstadoAprobacion, byEstadoProceso}` |
| `sistemaincidencias/src/main/java/com/integrador/sistemaincidencias/dashboard/dto/CategoriaConteoResponse.java` | `{categoriaId, categoriaNombre, total}` |
| `sistemaincidencias/src/main/java/com/integrador/sistemaincidencias/dashboard/dto/TendenciaSemanalResponse.java` | `{semanaInicio (LocalDate), total}` |
| `sistemaincidencias/src/main/java/com/integrador/sistemaincidencias/dashboard/dto/IncidenciaResumenResponse.java` | Slim DTO for `recientes` (NEW; not reused from `IncidenciaResponse`) |

### Added (frontend)

| File | One-line description |
|---|---|
| `frontend/src/services/dashboard-service.ts` | Service with `obtener(rango, signal)` + colocated `Dashboard` types |

### Modified

| File | Change |
|---|---|
| `frontend/src/pages/dashboard/index.tsx` | Becomes fetch-effect; range selector; loading + error state |
| `frontend/src/pages/dashboard/components/dashboard-stats.tsx` | Accepts `kpis` + `tiempoPromedioHoras` props; drops import from `data.ts` |
| `frontend/src/pages/dashboard/components/dashboard-charts.tsx` | Accepts `byCategoria`, `tendenciaSemanal`, `byEstadoProceso` props |
| `frontend/src/pages/dashboard/components/recent-incidents-table.tsx` | Accepts `recientes` prop; maps `IncidenciaResumen` |
| `frontend/src/pages/dashboard/components/status-badges.tsx` | Updates enum keys to backend codes (SOLICITADA / APROBADA / RECHAZADA, etc.) |
| `frontend/src/pages/dashboard/data.ts` | Strip all mocks; retain `chartColors`, `pieColors`, `statusLabels`, `priorityLabels` |
| `sistemaincidencias/postman/SistemaIncidencias.postman_collection.json` | Add "Dashboard" folder with `GET /api/dashboard?rango=30d` + 3 sample responses |

### Not modified (deliberate)

| File | Why |
|---|---|
| `sistemaincidencias/.../config/SecurityConfig.java` | Already covers `/api/**` with `.authenticated()` (line 47) — verified by spec NFR `SecurityConfig sin cambios` |
| `sistemaincidencias/.../auth/jwt/JwtAuthenticationFilter.java` | No change; existing chain authenticates `/api/dashboard` |
| `sistemaincidencias/.../usuarios/service/PermisoAdministracionService.java` | `validarAutenticado` already exists (added by archive change A) |
| `sistemaincidencias/.../incidencias/...` | The dashboard reads from `incidencias`; doesn't mutate. No changes. |
| `frontend/src/pages/dashboard/components/stat-card.tsx`, `chart-card.tsx` | Pure presentation; no props changes |
| `frontend/src/lib/http.ts` | Existing `apiRequest<Dashboard>` pattern works as-is |

## 5. Data flow

```mermaid
sequenceDiagram
    autonumber
    participant U as User (browser)
    participant P as DashboardPage (React)
    participant SVC as dashboardService
    participant HTTP as apiRequest (lib/http.ts)
    participant FLT as JwtAuthenticationFilter
    participant CTRL as DashboardController
    participant SRV as DashboardService
    participant DAO as DashboardDao
    participant DB as PostgreSQL

    U->>P: navigate to /dashboard
    P->>P: useState(rango=30d), useEffect fires
    P->>SVC: obtener("30d", AbortSignal)
    SVC->>HTTP: GET /api/dashboard?rango=30d  + Bearer token
    HTTP->>FLT: Authorization: Bearer <token>
    FLT->>FLT: jwtService.validarToken() / usuarioDao.buscarPorId()
    FLT-->>CTRL: passes to /api/** chain (authenticated)
    CTRL->>CTRL: rangoValido = Rango.from("30d")  // validates enum
    CTRL->>SRV: construir(usuarioActual, RANGO_30D)
    SRV->>SRV: scope = ScopeFiltro.de(usuarioActual)\n(AGENTE→asignadoA, USUARIO→creadoPor, ADMIN→none)
    SRV->>SRV: desde = LocalDateTime.now().minusDays(30)
    par 7 sequential reads (single connection, no TX)
        SRV->>DAO: contarTotal(scope, desde)
        DAO->>DB: SELECT COUNT(*) FROM incidencias WHERE ...
        DB-->>DAO: long
        SRV->>DAO: contarPorEstadoAprobacion(scope, desde)
        DAO->>DB: GROUP BY ea.clave
        DB-->>DAO: Map<SOLICITADA|APROBADA|RECHAZADA, Long>
        SRV->>DAO: contarPorEstadoProceso(scope, desde)
        SRV->>DAO: contarPorCategoria(scope, desde)
        SRV->>DAO: listarTendenciaSemanal(scope, desde, RANGO_30D)
        SRV->>DAO: listarRecientes(scope, desde, 5)  LIMIT 5
        SRV->>DAO: tiempoPromedioResolucionHoras(scope, desde)  AVG(EXTRACT(EPOCH...)/3600)
    end
    DAO-->>SRV: collected results
    SRV-->>CTRL: DashboardResponse composed
    CTRL-->>HTTP: 200 OK + JSON
    HTTP-->>SVC: typed payload (Dashboard)
    SVC-->>P: data + error=null; loading=false
    P->>U: render DashboardStats / Charts / RecentIncidentsTable
    Note over P,U: Subsequent range change → useEffect re-fires with new AbortController
```

**Failure paths**:

- `401` (invalid/expired JWT) → `JwtAuthenticationFilter` short-circuits chain before controller → `apiRequest` throws `ApiError(401)` → page shows toast.
- `400` (invalid `rango`) → controller throws `ReglaNegocioException` → GlobalExceptionHandler returns 400 → toast.
- 5xx / network failure → `apiRequest` throws → page catches (other than `AbortError`), shows toast, **keeps last successful state on screen** (matches spec scenario `error de red muestra toast y mantiene el último estado válido`).

## 6. Performance considerations

### 6.1 NFR ≤ 1.5 s p95 (smoke dataset < 1000 incidencias)

Expected per-query cost (PG planner with existing indexes):

| Query | Estimated time | Index used |
|---|---|---|
| `contarTotal` | 5-15 ms | `idx_incidencias_creado_en` + scope index |
| `contarPorEstadoAprobacion` | 10-25 ms | `idx_incidencias_estado_aprobacion` |
| `contarPorEstadoProceso` | 10-25 ms | `idx_incidencias_estado_proceso` |
| `contarPorCategoria` | 20-40 ms | `idx_incidencias_categoria` |
| `listarTendenciaSemanal` | 30-60 ms | `idx_incidencias_creado_en` + GROUP BY week |
| `listarRecientes` (LIMIT 5 + 3 JOINs) | 10-30 ms | `idx_incidencias_creado_en` (ORDER BY) |
| `tiempoPromedioResolucionHoras` | 15-40 ms | `idx_incidencias_creado_en` |

Sequential total: ~100-235 ms + ~7 × HikariCP acquire (~5-30 ms each = 35-210 ms) → **worst-case ~445 ms; expected at p95 ~250 ms**. Well under 1.5 s budget for the spec target.

### 6.2 Index recommendations (none new)

Per D6: existing indexes suffice. No `CREATE INDEX` in this change. If smoke testing reveals a planner regression (sequential scans when range is small), a follow-up may add composite indexes like `(asignado_a, creado_en)` or `(creado_por_usuario_id, creado_en)` — out of scope here.

### 6.3 Caching strategy (deferred)

Per D7 — explicit follow-up only. If RNF-01 fails in production:

```java
// FICTIONAL — DO NOT IMPLEMENT IN THIS CHANGE
@Cacheable(value = "dashboard", key = "#currentUser.id + ':' + #rango")
public DashboardResponse construir(Usuario currentUser, Rango rango) { ... }
```

Caffeine cache, key = `(userId, rango)`, `expireAfterWrite(60s)`. Tracked in `proposal.md §10` ("Cache Caffeine del endpoint si RNF-01 no se cumple").

## 7. Security

### 7.1 Auth boundary

- The endpoint sits under `/api/**`, which is covered by `SecurityConfig.java:42-49`:

  ```java
  .requestMatchers("/api/**").authenticated()
  ```

- `JwtAuthenticationFilter` validates the JWT and populates `SecurityContext` upstream of every controller. No additional auth wiring is needed.
- 401 is returned by the filter before the controller is invoked (spec scenario `token inválido retorna 401`).

### 7.2 Authorization — per-role scope at the DAO WHERE level (D2)

- ADMINISTRADOR → no extra predicate → `kpis.total` reflects every row in range.
- AGENTE → `WHERE i.asignado_a = ?` (current user's id). Cannot see USUARIO-created work not assigned to them.
- USUARIO → `WHERE i.creado_por_usuario_id = ?` (current user's id). Cannot see any AGENTE/ADMINISTRADOR-area data.

**Client tampering is rejected** at the service: `authService.obtenerUsuarioActual(token)` reads from the JWT, not from headers/query. Any `?scope=all` is ignored (the controller does not even bind a `scope` query param). Spec scenario `el backend filtra — no se confía en filtro frontend` proves this.

### 7.3 Other security rules preserved

- No new `permitAll()` chain. The endpoint requires auth.
- No SQL string interpolation with user data (per AGENTS.md §14). `rango` is enum-validated; `desde` is computed in the service from the enum (`LocalDateTime.now().minusDays(N)`) and bound as a `Timestamp`.
- No new fields added to `IncidenciaResponse`; the new `IncidenciaResumenResponse` only exposes safe fields (`asignadoA` is a UUID without email/name, `creadoEn`/`resueltoEn` are timestamps).
- The DB credentials and connection pooling are unchanged.

## 8. Out of scope

(Same as `proposal.md §6`; mirrored here for spec traceability.)

- **Tiempo real (websockets / SSE)** — no push channel. RF-37..40 lives elsewhere.
- **Drill-down chart → lista filtrada** — clicking a bar does NOT navigate to `/incidencias?categoria=…`. UX follow-up.
- **Export PDF/Excel del dashboard** — RF-44 lives in the Reportes change.
- **`GET /api/dashboard/agente/{id}`** — RF-42, Reportes change.
- **Dashboards personalizados por usuario** — out of MVP.
- **Cache del backend (Caffeine, Redis)** — explicit follow-up only if RNF-01 fails.
- **Integración BI externa** (Metabase, PowerBI).
- **Frontend integration with `/incidencias` filters** — the `/incidencias` page is not touched.
- **`DELETE` de categorías/estados** — audit #794, follow-up.
- **OpenAPI/Swagger documentation** — RNF-18. Postman collection update IS in scope.

## 9. Test strategy

### 9.1 Unit tests — Spring Boot Test + H2 in-memory

For the `DashboardDao` SQL correctness (the highest-risk layer):

| Test | Given | Expect |
|---|---|---|
| `contarTotal_returnsTotalFilteredByScope` | Seed 25 incidencias (4 AGENTE, 6 USUARIO, 15 ADMIN); query as AGENTE | `4` |
| `contarPorEstadoAprobacion_keysAlwaysPresent` | Seed 5 SOLICITADA, 5 APROBADA | map has all 3 keys (SOLICITADA/APROBADA/RECHAZADA), RECHAZADA defaults to 0 |
| `contarPorCategoria_excludesZeroCount_categorias` | Seed 3 categorías with rows, 2 without | `byCategoria.length == 3` |
| `contarPorCategoria_sortsDescByTotal` | Seed Hardware=10, Software=5, Red=3 | returned order matches `[Hardware, Software, Red]` |
| `listarTendenciaSemanal_bucketsLimitedTo26_whenRangoAll` | Seed 100 weeks of data | result has exactly 26 weeks, the most recent |
| `listarRecientes_returnsOrderedDescByCreadoEn_limit5` | Seed 12 incidencias | result length = 5, ordered desc |
| `tiempoPromedioResolucionHoras_returnsNull_whenNoFinalizadas` | No `resuelto_en` rows | result is `null` |
| `tiempoPromedioResolucionHoras_returnsAverage_whenFinalizadas` | 3 FINALIZADA with durations 2h/4h/6h | result = 4.0 |

These tests need real SQL (PostgreSQL `date_trunc` syntax). Use **Testcontainers + PostgreSQL 15** (matches prod). H2 won't replicate `date_trunc` exactly; use Testcontainers in `test` scope.

### 9.2 Integration tests — `@SpringBootTest` + MockMvc

| Test | Setup | Assert |
|---|---|---|
| `getDashboard_asAdmin_returnsAllScoped` | Mock JWT for ADMIN, seed DB | 200; `kpis.total == seedTotal` |
| `getDashboard_asAgente_filtersAsignadoA` | Mock JWT for AGENTE, seed 25 with 4 assigned | 200; `kpis.total == 4`; `byCategoria` reflects only those 4 |
| `getDashboard_asUsuario_filtersCreadoPor` | Mock JWT for USUARIO, seed 25 with 6 created-by | 200; `kpis.total == 6` |
| `getDashboard_rango7d_limitsByCreadoEn` | Seed 20 recent + 50 old | 200; `kpis.total == 20` |
| `getDashboard_rangoAll_returnsFullHistory` | Seed 100 spanning 12 months | 200; `kpis.total == 100`; `rangoAplicado == "all"` |
| `getDashboard_invalidRango_returns400` | Mock JWT, `rango=foo` | 400; `ReglaNegocioException` |
| `getDashboard_invalidToken_returns401` | Mock expired JWT | 401; controller NOT invoked |
| `getDashboard_clientTamperScopeIgnored` | Mock AGENTE JWT + custom header `X-Override-Scope: all` | 200; `kpis.total == 4` (not 25) — scope is server-derived |

### 9.3 Manual smoke

Verified locally against the running backend (post-merge):

1. Login as ADMINISTRADOR → `/dashboard` shows total = all in 30d range.
2. Login as AGENTE → `/dashboard` shows total = only assigned to me.
3. Login as USUARIO → `/dashboard` shows total = only mine.
4. Switch range 7d → 30d → 90d → all; metrics update accordingly.
5. With a USUARIO token, hit `GET /api/dashboard?rango=30d&scope=all` via curl — still returns only USUARIO's data.
6. Disconnect the backend → frontend shows toast + keeps last good render.
7. With 0 FINALIZADA in range → "Tiempo Prom." card is hidden entirely.

### 9.4 Acceptance gates

- `./mvnw compile` clean.
- `./mvnw test` passes (Testcontainers PostgreSQL).
- `npm run lint` clean.
- `npm run build` clean.
- `git diff master..HEAD -- sistemaincidencias/.../config/SecurityConfig.java` empty (NFR preserved).
- Repo-wide grep for `dashboardStats|pieData|categoryData|trendData|recentIncidents` outside `data.ts` → 0 matches.
- Sanity check: `kpis.total == sum(kpis.byEstadoAprobacion.values())` for every role.

## 10. Open questions

None blocking. `proposal.md §5` resolved all four questions in the spec resolution notes (Q1→A, Q2→A, Q3→B, Q4→A). Reaffirmed by this design:

1. **Q1 — Default range `30d` + selector `7d|30d|90d|all`**: encoded in `Rango` enum + frontend `<Select>`.
2. **Q2 — Same layout, scope-filtered**: scope injection at DAO level only; components identical.
3. **Q3 — Always weekly resolution**: `date_trunc('week', creado_en)` constant.
4. **Q4 — AVG over FINALIZADA only**: WHERE clause `resuelto_en IS NOT NULL`, null vs `0.0` semantics propagated to frontend (hide-card behavior).

Non-blocking minor decisions deferred:

- Whether to add a `DashboardQueryMetrics` Micrometer counter for observability — easy to add later; not gating.
- Whether to add a `?incluirFinalizadas=false` toggle to `tiempoPromedioResolucionHoras` — not in spec; would change the semantic.
- Whether to expose `cantidadAsignadosAtrasados` (RF-12) as a 7th block — out of MVP; tracked in `proposal.md §10`.
