# Tasks: Dashboard real (change B)

**Capability**: `dashboard`
**Change**: `dashboard-real`
**Date**: 2026-07-14
**Status**: ready-to-apply
**Strategy**: stacked-to-master with 2 PRs. PR1 = backend; PR2 = frontend.

## Review Workload Forecast

Estimated changed lines: 350-450. Delivery strategy: ask-on-risk, resolved by the supplied stacked-to-master split.

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Focused test | Runtime harness | Rollback boundary |
|---|---|---|---|---|
| PR1 | Dashboard endpoint and Postman | `cd sistemaincidencias && ./mvnw compile` | ADMIN `curl GET /api/dashboard?rango=30d` | `dashboard/` module and Postman entry |
| PR2 | Real-data dashboard UI | `cd frontend && npm run lint && npm run build` | ADMIN/AGENTE/USUARIO browser smoke | Dashboard service/page/components/data |

PR2 starts only after PR1 lands. Strict TDD is skipped because test infrastructure is unavailable; verification is compile, lint/build, and manual smoke.

## PR1 — Backend (T1-T6, ~250 LOC)

### T1. Create dashboard package structure ✅
- **Where**: `sistemaincidencias/src/main/java/com/integrador/sistemaincidencias/dashboard/{controller,service,dao,mapper,sql}/`; **Action**: created package directories via the initial class imports (no package-info.java needed); **Done when**: `./mvnw compile` passes.
- **Status**: shipped on commit `d476aef` (scaffold + SQL constants + Rango enum).

### T2. Implement `DashboardDao` + `DashboardSql` ✅
- **Where**: `sistemaincidencias/src/main/java/com/integrador/sistemaincidencias/dashboard/dao/DashboardDao.java`, `sistemaincidencias/src/main/java/com/integrador/sistemaincidencias/dashboard/sql/DashboardSql.java` (+ `ScopeFiltro.java`); **Action**: seven parameterized methods for total, approval/process states, category, weekly trend, recent five, and average resolution time; shared `construirWhere` helper binds scope/time via `PreparedStatement.setObject`; **Done when**: all methods are callable and compile.
- **Status**: shipped on commits `d476aef` (SQL) + `f2a6b88` (DAO).

### T3. Implement `DashboardMapper` ✅
- **Where**: `sistemaincidencias/src/main/java/com/integrador/sistemaincidencias/dashboard/mapper/DashboardMapper.java`; **Action**: maps `ResultSet` rows to category, trend, and recent DTOs using existing conventions and null-safe getters; **Done when**: compilation passes without null-field NPE risk.
- **Status**: shipped on commit `a6fc0d7`.

### T4. Add dashboard DTOs ✅
- **Where**: `sistemaincidencias/src/main/java/com/integrador/sistemaincidencias/dashboard/dto/{DashboardResponse,KpisResponse,CategoriaConteoResponse,TendenciaSemanalResponse,IncidenciaResumenResponse}.java`; **Action**: defined the specified JSON contract with Lombok `@Getter`, `@Builder`, `@NoArgsConstructor`/`@AllArgsConstructor`. Naming uses the codebase's `*Response` suffix per design.md; `IncidenciaResumenResponse` was introduced fresh (NOT pre-existing).; **Done when**: DTOs compile and serialize.
- **Status**: shipped on commit `a6fc0d7`.

### T5. Implement `DashboardService` ✅
- **Where**: `sistemaincidencias/src/main/java/com/integrador/sistemaincidencias/dashboard/service/DashboardService.java`; **Action**: maps `7d|30d|90d|all` to `desde` via `Rango.desdeOrNull()`, derives ADMIN/AGENTE/USUARIO scope through `ScopeFiltro` factories from the JWT-resolved user, calls all DAO methods, and composes the response (normalizing KPI maps so canonical keys are always present); **Done when**: service compiles and is callable.
- **Status**: shipped on commit `6c904e0`.

### T6. Add controller and Postman contract ✅
- **Where**: `sistemaincidencias/src/main/java/com/integrador/sistemaincidencias/dashboard/controller/DashboardController.java`, `sistemaincidencias/postman/SistemaIncidencias.postman_collection.json`; **Action**: exposes authenticated `GET /api/dashboard?rango=30d` (default `30d`), validates `rango` via `Rango.desde()` (400 on invalid), resolves user via `PermisoAdministracionService.validarAutenticado`. Postman folder "Dashboard" added with 5 sample responses (ADMIN/AGENTE/USUARIO + 400 invalid rango + 401 invalid token).; **Done when**: Maven compiles, Postman JSON parses, and ADMIN curl returns 200.
- **Status**: shipped on commit `6c904e0`. PR opened: https://github.com/AndersonFerrer/sistema-incidencias/pull/12

## PR2 — Frontend (T7-T10, ~120 LOC)

### T7. Add `dashboard-service.ts`
- **Where**: `frontend/src/services/dashboard-service.ts`; **Action**: define response types and `obtener(range: Range, signal?)` via `apiRequest` using wire param `rango`; **Done when**: lint adds no new errors.

### T8. Refactor dashboard page
- **Where**: `frontend/src/pages/dashboard/index.tsx`; **Action**: replace mocks with abortable `useEffect`, URL-backed range selector, cold-load skeleton, and error toast preserving last valid data; **Done when**: frontend build passes.

### T9. Refactor dashboard components to props
- **Where**: `frontend/src/pages/dashboard/components/{dashboard-stats,dashboard-charts,recent-incidents-table,status-badges}.tsx`; **Action**: consume service DTO props, backend status/priority codes, and hide null average-time card; **Done when**: TypeScript aligns with the backend contract.

### T10. Remove dashboard mocks
- **Where**: `frontend/src/pages/dashboard/data.ts`; **Action**: remove `incidents`, `categoryData`, `trendData`, `pieData`, `recentIncidents`, and `dashboardStats`; retain visual config only; **Done when**: build passes and removed exports have no consumers.

## Definition of done

- T1-T10 complete; PR1 lands before PR2 starts; every task remains under 200 changed lines.
- `./mvnw compile`, `npm run build`, and `npm run lint` pass; only the same 3 pre-existing master lint errors are tolerated.
- Manual smoke proves ADMIN sees all, AGENTE sees assigned-only, and USUARIO sees creator-only data.
- `proposal.md` status is `ready-to-verify`; `apply-progress.md` records timestamps per task.
