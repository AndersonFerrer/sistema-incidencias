# Tasks: Reportes con export PDF/Excel (change C)

**Capability**: `reportes`
**Change**: `reportes-export`
**Date**: 2026-07-14
**Status**: PR1 applied (ready-to-verify). PR2 exporters applied (T6-T8 complete, pending PR verification). PR3 pending.
**Strategy**: stacked-to-master with 3 PRs. PR1 = backend module + endpoints; PR2 = exporters (PDF + Excel); PR3 = frontend.

## Review Workload Forecast

Estimated changed lines: 850 total (PR1 ~400, PR2 ~200, PR3 ~250). Delivery strategy: ask-on-risk, resolved by the supplied stacked-to-master split with `size:exception` for each PR (pre-approved by maintainer per project convention).

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test | Runtime harness | Rollback boundary |
|---|---|---|---|---|---|
| PR1 | Backend module + 2 endpoints + Postman | PR 1 | `cd sistemaincidencias && ./mvnw compile` | ADMIN/AGENTE/USUARIO `curl GET /api/reportes` and `/api/reportes/exportar` | `reportes/` module + Postman entries |
| PR2 | PDF + Excel exporters | PR 2 | `cd sistemaincidencias && ./mvnw compile` | `curl ?formato=pdf` + `curl ?formato=xlsx` Content-Type checks | `exporter/` package + ReporteService.exportar branch |
| PR3 | Frontend `/reportes` page | PR 3 | `cd frontend && npm run lint && npm run build` | ADMIN/AGENTE/USUARIO browser smoke | `pages/reportes/` + sidebar entry + http blob support |

PR2 starts only after PR1 lands; PR3 starts only after PR2 lands. Strict TDD is skipped because test infrastructure is unavailable; verification is compile, lint/build, and manual smoke (matches `dashboard-real` convention).

## PR1 — Backend module + endpoints (T1-T5, ~400 LOC)

- [x] T1. Add Apache PDFBox dependency
- [x] T2. Create reportes package structure with placeholder classes
- [x] T3. ReporteSql + ReporteDao (6 logical query groups, 11 prepared statements)
- [x] T4. Reporte DTOs + ENUMs
- [x] T5. ReporteService + ReporteController + Postman

### T1. Add Apache PDFBox dependency
- **Where**: `sistemaincidencias/pom.xml`.
- **Action**: add `<dependency><groupId>org.apache.pdfbox</groupId><artifactId>pdfbox</artifactId><version>3.0.3</version></dependency>` (verify 3.x latest at apply time). Apache POI 5.3.0 is already declared — do not modify it.
- **Done when**: `./mvnw dependency:tree | grep pdfbox` shows `pdfbox:jar:3.0.3`; `./mvnw compile` passes.

### T2. Create reportes package structure with placeholder classes
- **Where**: `sistemaincidencias/src/main/java/com/integrador/sistemaincidencias/reportes/{controller,service,dao,mapper,sql,exporter,dto}/`.
- **Action**: create empty placeholder classes (`ReporteController`, `ReporteService`, `ReporteDao`, `ReporteMapper`, `ReporteSql`, `ReporteExcelExporter`, `ReportePdfExporter`, all DTOs) so the package skeleton is committed in one slice.
- **Done when**: `./mvnw compile` passes; package directories exist.

### T3. ReporteSql + ReporteDao (6 logical query groups, 11 prepared statements)
- **Where**: `sistemaincidencias/src/main/java/com/integrador/sistemaincidencias/reportes/sql/ReporteSql.java`, `sistemaincidencias/src/main/java/com/integrador/sistemaincidencias/reportes/dao/ReporteDao.java`, `sistemaincidencias/src/main/java/com/integrador/sistemaincidencias/reportes/mapper/ReporteMapper.java`.
- **Action**:
  - `ReporteSql`: declare 11 complete prepared statements (no string interpolation) — Q1 total, Q2 byEstadoAprobacion, Q3 byEstadoProceso, Q4 byCategoria, Q5 byPrioridad, Q6/Q7/Q8 three trend variants (`date_trunc('day'/'week'/'month')`, selected via `Granularidad` enum constant), Q9 resumenPorAgente, Q10 tiempoPromedioResolucionHoras, Q11 detalle LIMIT 50. Every statement shares the same per-role WHERE predicate: `((? = 'ADMINISTRADOR') OR (? = 'AGENTE' AND i.asignado_a = ?) OR (? = 'USUARIO' AND i.creado_por_usuario_id = ?))` plus half-open date predicate plus optional `agenteId`.
  - `ReporteDao`: 9 methods exposing the dataset (`contarTotal`, `contarPorEstadoAprobacion`, `contarPorEstadoProceso`, `contarPorCategoria`, `contarPorPrioridad`, `listarTendencia(filtro, granularidad)`, `listarResumenPorAgente`, `tiempoPromedioResolucionHoras`, `listarDetalle(filtro, limite)`). Reuse `ScopeFiltro`-style per-role parameter binding (no JPA). Bind dates twice, role constants, UUIDs as `Types.OTHER` when null, `LIMIT` separately.
  - `ReporteMapper`: maps `ResultSet` to DTOs using null-safe getters; UUIDs via `getObject(..., UUID.class)`, timestamps as `LocalDateTime`, `Prioridad.valueOf`.
- **Done when**: `./mvnw compile` passes; all DAO methods are callable; SQL contains no raw user input.

### T4. Reporte DTOs + ENUMs
- **Where**: `sistemaincidencias/src/main/java/com/integrador/sistemaincidencias/reportes/dto/*.java`.
- **Action**: define `ReporteRequest` (transport filter: `LocalDate desde`, `LocalDate hasta`, `String rango`, `UUID agenteId`, `String granularidad`), `ReporteResponse` (response container), `ReporteFiltroAplicado`, `ReporteKpiResponse` (total + 3 maps), `ReporteConteoEstadoResponse`, `ReporteConteoCategoriaResponse`, `ReporteConteoPrioridadResponse`, `ReporteTendenciaResponse`, `ReporteResumenAgenteResponse`. Add `ReporteGranularidad` enum (`DIARIA|SEMANAL|MENSUAL`, default `SEMANAL`) and `ReporteFormato` enum (`JSON|PDF|XLSX`). Reuse `dashboard/dto/IncidenciaResumenResponse` for `detalle` (do not duplicate). Lombok `@Getter/@Builder/@NoArgsConstructor/@AllArgsConstructor`; camelCase JSON via getters.
- **Done when**: `./mvnw compile` passes; DTOs are Jackson-serializable.

### T5. ReporteService + ReporteController + Postman
- **Where**: `sistemaincidencias/src/main/java/com/integrador/sistemaincidencias/reportes/service/ReporteService.java`, `sistemaincidencias/src/main/java/com/integrador/sistemaincidencias/reportes/controller/ReporteController.java`, `sistemaincidencias/postman/SistemaIncidencias.postman_collection.json`.
- **Action**:
  - `ReporteService`: own normalization — resolve `rango` preset to inclusive dates (default `30d`); convert `[desde, hasta]` to `[desde 00:00:00, hasta + 1 day 00:00:00)`; reject `desde > hasta` with 400; parse granularity to enum; build `ReporteScope` from `validarAutenticado` user (ADMINISTRADOR → no scope, AGENTE → forced `currentUser.id`, USUARIO → forced `creado_por_usuario_id`); call the 9 DAO methods in sequence; normalize canonical zero maps (`SOLICITADA/APROBADA/RECHAZADA`, `PENDIENTE/EN_PROCESO/FINALIZADA`, `BAJA/MEDIA/ALTA/CRITICA`); skip Q9 for USUARIO; expose `construir(usuario, request) → ReporteResponse` and a placeholder `exportar(usuario, request, formato) → byte[]` (wired in PR2).
  - `ReporteController`: thin — inject `ReporteService` and `PermisoAdministracionService`; `GET /api/reportes?desde&hasta&rango&agenteId&granularidad` (default `semanal`, default range `30d`) returns `ReporteResponse`; `GET /api/reportes/exportar?formato` returns `ResponseEntity<byte[]>` with `application/pdf` or `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` and `Content-Disposition: attachment; filename="reporte-{rango}.{ext}"`. `csv`/missing/invalid format → 400. `SecurityConfig` is not touched (`/api/**` already `.authenticated()`).
  - Postman: add `Reportes` folder with 4 requests (ADMIN JSON, AGENTE drill-down JSON, ADMIN PDF, ADMIN XLSX) and example responses (ADMIN JSON, AGENTE JSON, USUARIO JSON, ADMIN PDF binary placeholder).
- **Done when**: `./mvnw compile` passes; Postman JSON parses; ADMIN `curl GET /api/reportes?rango=30d` returns 200 with `ReporteResponse` shape; PR1 PR opened (size:exception approved).

## PR2 — Exporters (T6-T8, ~200 LOC)

- [x] T6. PdfReporteExporter (Apache PDFBox 3.x)
- [x] T7. XlsxReporteExporter (Apache POI streaming)
- [x] T8. Wire exporters + Postman binary examples

### T6. PdfReporteExporter (Apache PDFBox 3.x)
- **Where**: `sistemaincidencias/src/main/java/com/integrador/sistemaincidencias/reportes/exporter/ReportePdfExporter.java`, `ReporteChartRenderer.java`.
- **Action**: `ReporteChartRenderer` builds a deterministic Java2D trend PNG in memory from `List<ReporteTendenciaResponse>` (no external chart library). `ReportePdfExporter.exportar(ReporteDataset)` creates `PDDocument` (A4 portrait, Helvetica, wrapped text), opens `PDPageContentStream` per page, lays out header (title + filters + generation timestamp), KPI table (label/value), por-estado tables, por-categoría, por-prioridad, tendencia (table + chart PNG embedded via `PDImageXObject`), por-agente (skipped for USUARIO), detalle table (XLSX-aligned columns, max 50), footer `Página X de Y`. Use `try-with-resources` / `try/finally` to close every `PDPageContentStream` and dispose `PDDocument`. Empty range still emits header + zero-valued KPIs + empty table state (no invented data).
- **Done when**: `./mvnw compile` passes; `curl ?formato=pdf` returns `Content-Type: application/pdf`; PDF opens in Adobe/Chrome.

### T7. XlsxReporteExporter (Apache POI streaming)
- **Where**: `sistemaincidencias/src/main/java/com/integrador/sistemaincidencias/reportes/exporter/ReporteExcelExporter.java`.
- **Action**: `SXSSFWorkbook` (keeps rows off heap), `try-with-resources` to call `dispose()`. Sheets in order: `Resumen` (title + filters + KPI label/value), `Datos` (exact preview columns: `ID, Código, Título, Categoría, Asignado a, Estado proceso, Estado aprobación, Prioridad, Creado en, Resuelto en` — max 50 rows, headers always present), `Charts` (embedded PNG from `ReporteChartRenderer` + bucket/total data table), `Por estado` / `Por categoría` / `Por prioridad` / `Tendencia` (dimension tables with totals), `Por agente` (admin/agent scope only). Bold headers, frozen first row, dates as `yyyy-mm-dd HH:mm`, numeric cells numeric not strings. Empty range keeps all sheets with valid headers.
- **Done when**: `./mvnw compile` passes; `curl ?formato=xlsx` returns `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`; workbook opens in Excel/LibreOffice with 6-7 sheets.

### T8. Wire exporters + Postman binary examples
- **Where**: `ReporteService.exportar(...)`; `ReporteController.exportar(...)`; Postman `Reportes` folder.
- **Action**: service `exportar(usuario, request, formato)` reuses the same `ReporteDataset` (does not call DAO twice) and routes to `ReportePdfExporter` or `ReporteExcelExporter`; controller attaches the correct media type + `Content-Disposition`. Postman: complete the PDF and XLSX examples (binary placeholder is acceptable; manually verified `Content-Type` per scenario).
- **Done when**: Postman JSON validates; `curl ?formato=pdf` returns `application/pdf`; `curl ?formato=xlsx` returns openxmlformats; PR2 PR opened.

## PR3 — Frontend (T9-T13, ~250 LOC)

### T9. `reportes-service.ts` + shared types
- **Where**: `frontend/src/services/reportes-service.ts`, `frontend/src/types/reportes.ts`.
- **Action**: define `ReporteFiltro` (`desde?`, `hasta?`, `rango?`, `agenteId?`, `granularidad?`), `ReporteResponse`, KPI/chart/agent/detail types matching backend camelCase. Service exports `obtener(filtro, signal?)` (JSON via `apiRequest`) plus `descargarPdf(filtro, signal?)` and `descargarExcel(filtro, signal?)` returning `Promise<Blob>`. Use `URLSearchParams` to build query strings and reuse `apiRequest`. A small `iniciarDescarga(blob, filename)` helper creates an object URL, clicks an `<a download>`, then revokes the URL.
- **Done when**: `npm run lint` adds no new errors; types align with backend.

### T10. `reporte-filters.tsx` (preset + custom + agente + granularidad)
- **Where**: `frontend/src/pages/reportes/components/reporte-filters.tsx`, `frontend/src/pages/reportes/data.ts`.
- **Action**: `Select` for preset (`7d|30d|90d|all|custom`) — when `custom`, render two native date inputs (`YYYY-MM-DD`, no locale ambiguity); role-aware agent `Select` populated from `GET /api/usuarios/agentes-asignables` (USUARIO hides it, AGENTE sees only self, ADMINISTRADOR sees all); `Select` for granularidad (`Diaria|Semanal|Mensual`, default `Semanal`); `Aplicar` button triggers parent refetch. `data.ts` exports preset labels, chart colors, status/priority labels — no mock report rows.
- **Done when**: TypeScript types align; form renders all controls for each role.

### T11. `reporte-charts.tsx` + `reporte-preview-table.tsx`
- **Where**: `frontend/src/pages/reportes/components/reporte-charts.tsx`, `frontend/src/pages/reportes/components/reporte-preview-table.tsx`.
- **Action**: `reporte-charts.tsx` renders 4 Recharts sections (por estado proceso, por categoría, tendencia with shared trend chart config, por agente when scope allows). Empty series show explicit empty state (no invented points). `reporte-preview-table.tsx` renders the same 10 columns in the exact XLSX order, max 50 rows.
- **Done when**: `npm run build` passes; renders without console errors with smoke dataset.

### T12. `reporte-export-buttons.tsx` + `reporte-error-toast.tsx`
- **Where**: `frontend/src/pages/reportes/components/reporte-export-buttons.tsx`, `frontend/src/pages/reportes/components/reporte-error-toast.tsx`.
- **Action**: presentational PDF/Excel buttons with spinner; on click, call `reportesService.descargarPdf` / `descargarExcel`, then `iniciarDescarga(blob, "reporte.{ext}")`. Buttons disabled while `exporting`. `reporte-error-toast.tsx` is a fixed, dismissible, non-blocking surface using existing `Alert` (`role="alert"`); no toast dependency added.
- **Done when**: download triggers on click in browser smoke; error path keeps last valid preview.

### T13. `/reportes` page + router + sidebar + http blob support
- **Where**: `frontend/src/pages/reportes/index.tsx`, `frontend/src/router.tsx`, `frontend/src/layout/app-sidebar.tsx`, `frontend/src/lib/http.ts`.
- **Action**:
  - `index.tsx`: page composition — owns `preset`, `desde`, `hasta`, `agenteId`, `granularidad`, `reporte`, `agentes`, `loading`, `exporting`, `errorMessage`; loads initial report with 30-day preset; loads assignable users only for ADMINISTRADOR/AGENTE; aborts previous request on filter change; cold load shows skeleton, refetch keeps previous report; KPI cards from `reporte.kpis`; zero-data message for empty ranges.
  - `router.tsx`: import `ReportesPage`, register private `/reportes` route inside `AppLayout`, add to `routeTree`. `PrivateRoute` in `AppLayout` remains the single auth guard.
  - `app-sidebar.tsx:20`: change `{ label: "Reportes", icon: BarChart3 }` → `{ label: "Reportes", icon: BarChart3, to: "/reportes" }` so the existing `Link` branch renders active/inactive navigation instead of the dead `<button>`.
  - `lib/http.ts`: add optional `responseType?: "json" | "blob"` to `RequestOptions`; when `"blob"`, call `response.blob()` instead of `response.json()`. JSON callers are unaffected (default stays JSON).
- **Done when**: `npm run lint` and `npm run build` pass; sidebar shows the new `Reportes` link; `/reportes` renders inside `AppLayout`; ADMIN downloads PDF + XLSX and AGENTE sees own data only; PR3 PR opened.

## Definition of done

- T1-T13 complete; PR1 → PR2 → PR3 land sequentially on master.
- Each PR carries a `size:exception` label (pre-approved by maintainer per project convention; PR1 ~400 LOC, PR2 ~200 LOC, PR3 ~250 LOC — total ~850 LOC).
- `./mvnw compile`, `npm run build`, and `npm run lint` pass (only the same pre-existing master lint errors are tolerated).
- Manual smoke proves ADMIN sees all, AGENTE sees assigned-only, USUARIO sees creator-only; ADMIN downloads a valid PDF and XLSX; empty range still emits valid files.
- `proposal.md` status updated to `ready-to-verify`; `apply-progress.md` records timestamps per task.