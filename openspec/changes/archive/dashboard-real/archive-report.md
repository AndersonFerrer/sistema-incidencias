# Archive Report — `dashboard-real` (verdict PASS)

**Change**: `dashboard-real`
**Capability**: `dashboard` (NEW capability baseline)
**Project**: sistema-incidencias
**Archive date**: 2026-07-14
**Verdict**: PASS (sdd-verify: see `verify-report.md`)
**Source**: `openspec/changes/archive/dashboard-real/verify-report.md` + engram topic `sdd/dashboard-real/verify-report`

---

## 1. Verdict

**PASS** — sdd-verify verdict in `verify-report.md` confirms all 32 Given/When/Then scenarios pass at code level against the merged master (`1258ca4`). Zero new regressions. Pre-existing 3 lint + 4 build errors in master (introduced by PR #9 `f26424a`, before this change) are documented and remain out of scope. Backend `./mvnw compile -q` exit 0, frontend `npm run lint` and `npm run build` net-new clean. `SecurityConfig.java` not touched (`git diff` empty). Postman JSON valid with 5 sample responses (ADMIN/AGENTE/USUARIO + 400 + 401).

---

## 2. Changes shipped

The `dashboard-real` change shipped across **2 stacked PRs** to `master`:

- **PR #12** (`062e33c`) — Slice A — Backend:
  - New `dashboard/` module: `Rango` enum, `DashboardSql` (7 constants), `ScopeFiltro` (record with static factories), 5 DTOs (`DashboardResponse`, `KpisResponse`, `CategoriaConteoResponse`, `TendenciaSemanalResponse`, `IncidenciaResumenResponse`), `DashboardMapper` (ResultSet → DTO), `DashboardDao` (7 parametric aggregation queries with per-role WHERE injection), `DashboardService` (range → `desde` computation + scope-aware DAO wiring), `DashboardController` (`GET /api/dashboard?rango={7d|30d|90d|all}`, default 30d).
  - Postman: new "Dashboard" folder with 5 sample responses (3 role-scoped + 400 invalid `rango` + 401 invalid token).
- **PR #13** (`1258ca4`) — Slice B — Frontend:
  - New `frontend/src/services/dashboard-service.ts` with `obtener(rango): Promise<DashboardResponse>`.
  - `pages/dashboard/index.tsx`: `useEffect` fetch + range selector + loading skeleton + error toast.
  - `components/dashboard-stats.tsx`, `dashboard-charts.tsx`, `recent-incidents-table.tsx`, `status-badges.tsx`: converted from reading mock imports to props-driven.
  - New `components/dashboard-skeleton.tsx` for loading state.
  - `pages/dashboard/data.ts`: mock arrays (`incidents`, `categoryData`, `trendData`, `pieData`, `recentIncidents`, `dashboardStats`) stripped (275 lines → ~30 lines of config).

Master HEAD at archive: `1258ca4`. Diffstat vs base `5e4d86a`: 21 files / +1332 / −326 = 1658 changed lines. Backend bulk is in the new `dashboard/` Java module (Java verbose + Lombok + Javadoc + 5 DTOs). Frontend net delta on target (~120 LOC). No new Maven dependencies; no new npm packages.

---

## 3. Requirements closed

From `docs/requerimientos.md` and the spec matrix:
- **RF-06**: KPIs en dashboard (total + count por estado) — `kpis.total`, `kpis.byEstadoAprobacion`, `kpis.byEstadoProceso`.
- **RF-07**: Tarjetas visuales con conteo por estado — `DashboardStats` component renders `KpisResponse`.
- **RF-08**: Gráfico por categoría — `byCategoria[]` block in response.
- **RF-09**: Tendencia temporal semanal — `tendenciaSemanal[]` with `date_trunc('week', creado_en)`.
- **RF-10**: Incidencias recientes — `recientes[]` (last 5 by `creado_en DESC`).
- **RF-11**: Tiempo promedio de resolución — `tiempoPromedioResolucionHoras` (AVG over FINALIZADA in range; null if 0 rows).
- **RNF-01**: Latency ≤ 1.5s p95 — design §6 estimates via existing indexes; manual benchmark pending.

---

## 4. Master commits

| SHA | Subject |
| --- | --- |
| `062e33c` | feat(dashboard) PR1: backend aggregations + GET /api/dashboard (#12) |
| `1258ca4` | feat(dashboard) PR2: frontend wire-up + range selector (#13) |

---

## 5. Drift applied

None blocking. Three minor deviations documented in `verify-report.md` §Open questions:
1. **Range selector uses native `<select>` instead of shadcn `<Select>`** — shadcn `Select` not installed in the project (`frontend/src/components/ui/` lacks it). Proposal §3.4 required "no new deps", so a native `<select>` with `aria-label` is the equivalent UX with zero new packages.
2. **`asignadoA` column renders as UUID** — backend DTO returns the raw UUID (per design D5: slim DTO without name lookup). Table renders the UUID with a "Sin asignar" fallback. Resolving to a human name would require an additional `/api/usuarios` fetch, out of scope.
3. **`rango` not synced to URL** — design D8 mentioned URL search params for shareability; this PR stores `rango` in React state only. URL persistence is a non-gating follow-up.

None of these break a spec scenario — they are functional behavior that matches the spec's intent with a different surface.

---

## 6. Capability spec evolution

`openspec/specs/dashboard/spec.md` is now the canonical baseline (NEW capability). It contains:
- All 32 Given/When/Then scenarios from `openspec/changes/archive/dashboard-real/specs/dashboard/spec.md`.
- An "Archive history" blockquote noting `dashboard-real` as the seed.
- Header rewritten from "delta spec" language to "synced baseline" language.

---

## 7. Files

### Added (12 Java + 2 frontend)
- `sistemaincidencias/src/main/java/com/integrador/sistemaincidencias/dashboard/{controller,service,dao,sql,mapper,dto}/*.java` (12 files)
- `frontend/src/services/dashboard-service.ts`
- `frontend/src/pages/dashboard/components/dashboard-skeleton.tsx`

### Modified (7 frontend + 1 postman)
- `frontend/src/pages/dashboard/index.tsx` (+128 / -12)
- `frontend/src/pages/dashboard/data.ts` (-275 mock arrays)
- `frontend/src/pages/dashboard/components/dashboard-stats.tsx` (+86 / -23)
- `frontend/src/pages/dashboard/components/dashboard-charts.tsx` (+83 / -29)
- `frontend/src/pages/dashboard/components/recent-incidents-table.tsx` (+58 / -25)
- `frontend/src/pages/dashboard/components/status-badges.tsx` (+49 / -16)
- `frontend/src/pages/dashboard/data.ts` (-275)
- `sistemaincidencias/postman/SistemaIncidencias.postman_collection.json` (+new "Dashboard" folder)

### Not modified (deliberate)
- `sistemaincidencias/src/main/java/com/integrador/sistemaincidencias/shared/config/SecurityConfig.java` (existing `/api/**` auth filter covers the new endpoint).
- `sistemaincidencias/src/main/java/com/integrador/sistemaincidencias/usuarios/service/PermisoAdministracionService.java` (the `validarAutenticado` helper added by change A is reused).
- `frontend/src/pages/dashboard/components/stat-card.tsx`, `chart-card.tsx` (presentation primitives unchanged).

---

## 8. Traceability

- **Proposal**: `openspec/changes/archive/dashboard-real/proposal.md`
- **Spec**: `openspec/changes/archive/dashboard-real/specs/dashboard/spec.md` (delta) → `openspec/specs/dashboard/spec.md` (baseline)
- **Design**: `openspec/changes/archive/dashboard-real/design.md`
- **Tasks**: `openspec/changes/archive/dashboard-real/tasks.md`
- **Verify**: `openspec/changes/archive/dashboard-real/verify-report.md`
- **Apply progress**: engram observation #808 (`sdd/dashboard-real/apply-progress`).
- **Verify verdict**: engram topic `sdd/dashboard-real/verify-report`.

---

## 9. Risks / follow-ups

1. **Manual smoke pending** — the sdd-verify agent performed code-level audit only. A real end-to-end smoke (ADMIN/AGENTE/USUARIO tokens hitting `/api/dashboard` with a populated PostgreSQL instance) was not run. Recommended as a follow-up validation step (can be done with Playwright CLI on the dev server).
2. **Latency benchmark (RNF-01)** — design §6 estimates ≤ 1.5s p95 with existing indexes, but actual timing has not been measured. If p95 exceeds the NFR, consider adding a Caffeine cache for 60s or splitting the endpoint into smaller queries.
3. **`asignadoA` human-readable name** — current response carries the UUID; consider joining with `usuarios` in the same query if a name is needed (small extra cost).
4. **URL `rango` sync** — for shareability, persist `rango` to URL search params (`?rango=30d`) using `useSearchParams`.
5. **Drill-down from chart to filtered list** — out of scope for this change. Future work.
6. **Real-time push (websockets / SSE)** — out of scope. RNF-01 is refreshable, not real-time.

---

## 10. Next recommended

Per `audit/requirements-coverage` engram topic and the proposal matrix:

1. **`notificaciones-realtime`** (change D) — backend `Notificacion` table + `/api/notificaciones` CRUD + frontend center + (optional) SSE/websocket push.
2. **`reportes-export`** (change C) — backend `GET /api/reportes/exportar?formato={pdf|xlsx}` using Apache POI (already in deps) + frontend report builder page.
3. **`perfil-self`** (change E) — backend `GET /api/auth/me` already exists; needs `PUT /api/usuarios/{id}/password` for self-change + frontend `/perfil` page + `DELETE /api/usuarios/{id}`.
4. **`configuracion-ui`** (change F) — config page for catalog CRUD + demo login fix + DELETE for catalog entries.
5. **Migration of `frontend/src/pages/incidencias/detalle/index.tsx`** to consume `/api/usuarios/agentes-asignables` (callers in `detalle/index.tsx:117, 158` still hit the admin-only `/api/usuarios`).

---

## 11. SDD cycle complete

Change B `dashboard-real` shipped through the full SDD lifecycle:
- ✅ `sdd-propose` → `proposal.md` (1930 palabras, 11 sections, 4 open questions resolved).
- ✅ `sdd-spec` → `specs/dashboard/spec.md` (32 Given/When/Then scenarios).
- ✅ `sdd-design` → `design.md` (816 lines, 7 SQL queries fully written, 8 architectural decisions, mermaid data flow).
- ✅ `sdd-tasks` → `tasks.md` (10 dependency-ordered tasks across 2 PRs).
- ✅ `sdd-apply PR1` → backend (PR #12, +932 LOC, BUILD SUCCESS).
- ✅ `sdd-apply PR2` → frontend (PR #13, +472 / -326 LOC, lint+build net-new clean).
- ✅ `sdd-verify` → `verify-report.md` (PASS, 32/32 scenarios).
- ✅ `sdd-archive` → this report + `openspec/specs/dashboard/spec.md` baseline synced.

Verdict: **PASS**. Archived.
