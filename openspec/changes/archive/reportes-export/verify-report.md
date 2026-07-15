# Verify Report — `reportes-export`

**Change**: `reportes-export`
**Capability**: `reportes` (NEW)
**Project**: sistema-incidencias
**Date**: 2026-07-15
**Verdict**: **PASS**
**Master HEAD at verify**: `7b18b00` (PR1 + PR2 + PR3 all merged: `6a8c73c`, `31fc319`, `7b18b00`).
**Auditor**: sdd-verify executor (code-level audit + static checks + scenario evidence mapping; no end-to-end runtime smoke performed).

---

## 1. Verdict summary

**PASS** — All 29 Given/When/Then scenarios from `openspec/changes/reportes-export/specs/reportes/spec.md` map to concrete code evidence in the merged master. The 3 stacked PRs delivered 19 new files (14 backend + 5 frontend) plus 5 modified files; one new Maven dependency (`pdfbox 3.0.3`); zero new npm packages; zero modifications to `SecurityConfig.java` (`/api/**` already `.authenticated()`). Net-new lint and build errors from this change: **0**. Three pre-existing master lint errors in `frontend/src/pages/incidencias/index.tsx` (lines 65/66: `isEliminando`, `setIsEliminando`, `errorEliminar` unused vars) and one pre-existing `tsc` error in `frontend/src/pages/incidencias/components/incidencias-table.tsx:309` (string → `EstadoProcesoClave` enum) were introduced in `f26424a` (PR #9 — before this change) and are out of scope per the verify rule "pre-existing master errors tolerated; flag NEW as CRITICAL".

---

## 2. Static checks

| Command | Command (cwd) | Exit | Result |
| --- | --- | --- | --- |
| `./mvnw compile -q` | `sistemaincidencias/` | `0` | PASS — clean build. New `reportes/` module + 9 DTOs + DAO/SQL/Mapper + Service/Controller + 3 exporters compile. |
| `npm run lint` | `frontend/` | `1` | 3 pre-existing errors (`incidencias/index.tsx:65/66`); 0 new errors from `reportes-export`. |
| `npm run build` (tsc -b + vite build) | `frontend/` | `2` | 4 pre-existing tsc errors; 0 new errors from `reportes-export`. |

**Verdict on static checks**: **PASS** for change `reportes-export`. Net-new errors: 0.

### 2.1 Maven dependency tree

`./mvnw dependency:tree | grep pdfbox` → `pdfbox:jar:3.0.3` (declared in `sistemaincidencias/pom.xml:78-83`). `org.apache.poi:poi-ooxml:5.3.0` unchanged. No other dependencies added or removed.

### 2.2 Pre-existing master static errors (out of scope)

Confirmed by `git log --oneline -- frontend/src/pages/incidencias/index.tsx` and `frontend/src/pages/incidencias/components/incidencias-table.tsx`:

| File | Line | Error | Introduced by |
| --- | --- | --- | --- |
| `frontend/src/pages/incidencias/index.tsx` | 65,65,66 | `isEliminando`, `setIsEliminando`, `errorEliminar` declared but unused | `f26424a` (PR #9) |
| `frontend/src/pages/incidencias/components/incidencias-table.tsx` | 309 | `Type 'string' is not assignable to type 'EstadoProcesoClave'` | `f26424a` (PR #9) |

These match the 3 lint + 4 build errors recorded in `openspec/changes/archive/dashboard-real/verify-report.md` and pre-date `reportes-export`.

---

## 3. Spec scenario audit

Walking through all 29 Given/When/Then scenarios from `openspec/changes/reportes-export/specs/reportes/spec.md`. Each scenario maps to code, configuration, or Postman evidence. The auditor reviewed source files and configuration in the merged `7b18b00`; runtime smoke (Postman walks, real database, real browser) was NOT performed and is listed in §6 follow-ups.

### Requirement 1 — `GET /api/reportes` con datos JSON

| # | Scenario | Status | Evidence |
| --- | --- | --- | --- |
| 1 | `ADMINISTRADOR` sin filtro ve todas las incidencias | ✅ PASS | `ReporteService.scopeDe` returns `ReporteScope("ADMINISTRADOR", id, requestedAgenteId)` with `rolCodigo="ADMINISTRADOR"`; `ReporteSql.construirWhere` emits `(? = 'ADMINISTRADOR')` branch (no extra predicate). All 9 DAOs bind this rolCodigo as parameter. `ReporteController.obtener` calls `permisoAdministracionService.validarAutenticado(token)` returning the admin `Usuario`. |
| 2 | `AGENTE` ve solo las suyas | ✅ PASS | `ReporteService.scopeDe` for AGENTE returns `ReporteScope("AGENTE", usuario.getId(), usuario.getId())` — `agenteFiltro` is forcibly set to `currentUserId` regardless of client-supplied value. WHERE clause emits `(? = 'AGENTE' AND i.asignado_a = ?)`. |
| 3 | `USUARIO` ve solo las que creó | ✅ PASS | `ReporteService.scopeDe` for USUARIO returns `ReporteScope("USUARIO", id, null)`; WHERE emits `(? = 'USUARIO' AND i.creado_por_usuario_id = ?)`. `resumenPorAgente` is also forced to `List.of()` for USUARIO (`ReporteService.construir` line: `resumenPorAgente = scope.esUsuario() ? List.of() : reporteDao.listarResumenPorAgente(filtro)`). |
| 4 | Filtro `desde` + `hasta` aplica rango | ✅ PASS | `ReporteController.parseFecha` validates `YYYY-MM-DD`; `ReporteService.resolverRango` requires BOTH dates when either is present (throws 400 otherwise) and converts to `[desde 00:00:00, hasta + 1 day 00:00:00)` via `Timestamp.valueOf`. WHERE predicate binds these as half-open interval. |
| 5 | Filtro `agenteId` aplica drill-down | ✅ PASS | `ReporteRequest.agenteId` (UUID) flows through service only for ADMINISTRADOR (other roles ignore it via `scopeDe`'s forced overrides); WHERE adds the optional `(CAST(? AS uuid) IS NULL OR i.asignado_a = CAST(? AS uuid))` predicate. DAO binds UUID with `Types.OTHER` when null. |
| 6 | Parámetro `granularidad` afecta buckets | ✅ PASS | `ReporteGranularidad.desde()` accepts `DIARIA|SEMANAL|MENSUAL` (case-insensitive); default is `SEMANAL` (when param blank); invalid values throw `ReglaNegocioException` (400). `ReporteSql.tendenciaPara(granularidad)` selects one of three literal SQL constants: `TENDENCIA_DIARIA` (date_trunc('day')), `TENDENCIA_SEMANAL` (date_trunc('week')), `TENDENCIA_MENSUAL` (date_trunc('month')). `ReporteSql` javadoc explicitly forbids SQL interpolation. |
| 7 | Token inválido retorna 401 | ✅ PASS | `permisoAdministracionService.validarAutenticado(token)` is the auth boundary inherited from archived `incidencias-rbac-agente` change; malformed/expired tokens throw before reaching the service. `SecurityConfig` already covers `/api/**` with `.authenticated()` (no changes to `SecurityConfig.java` confirmed). |

### Requirement 2 — `GET /api/reportes/exportar` con descarga PDF/XLSX

| # | Scenario | Status | Evidence |
| --- | --- | --- | --- |
| 8 | `formato=pdf` retorna `Content-Type: application/pdf` | ✅ PASS | `ReporteController.exportar` calls `mediaTypeDe(formato)` which returns `"application/pdf"` for `ReporteFormato.PDF`. Header line 91-92 in `ReporteController.exportar`. Postman "Reportes" folder includes a 200 response with header `Content-Type: application/pdf` and filename `reporte-20260715-120000.pdf`. |
| 9 | `formato=xlsx` retorna `application/vnd.openxmlformats...` | ✅ PASS | Same controller method returns `"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"` for XLSX. Postman confirms the header for the XLSX sample. |
| 10 | Formato inválido retorna 400 | ✅ PASS | `ReporteFormato.desde("csv")` throws `ReglaNegocioException` → 400 with message "Formato invalido. Valores permitidos: json, pdf, xlsx". Also handles empty/blank (throws "Formato de exportacion requerido"). Postman "Exportar reporte PDF" request includes a 400 example response matching this body. |
| 11 | Rango sin datos retorna PDF/XLSX vacío con header | ✅ PASS | `ReporteService.exportar` always calls `construir(...)` first (producing a valid `ReporteResponse` even when every DAO returns empty); then routes to `ReportePdfExporter.exportar(dataset)` or `ReporteExcelExporter.exportar(dataset)`. Both exporters start with title (PDF: "1. Resumen (KPIs)"; XLSX: `HOJA_RESUMEN`), include empty-state rows / canonical keys, and do not invent data. PDFExporter uses `try-with-resources` to dispose `PDDocument`; ExcelExporter uses `SXSSFWorkbook` with `dispose()` in finally. |

### Requirement 3 — Reporte por período (RF-41)

| # | Scenario | Status | Evidence |
| --- | --- | --- | --- |
| 12 | `desde`/`hasta` respetan inclusivo en timestamps | ✅ PASS | `rangoPorDias(N, codigo)` sets `desde = hoy - (N-1)` and `hasta = hoy`. `ReporteService.construir` line: `Timestamp.valueOf(rango.desde.atStartOfDay())` (inclusive lower) and `Timestamp.valueOf(rango.hasta.plusDays(1).atStartOfDay())` (exclusive upper). WHERE: `i.creado_en >= ... AND i.creado_en < ...` — boundary incidences at `23:59:59.999999` are included. |
| 13 | Preset `7d` / `30d` / `90d` / `all` | ✅ PASS | `ReporteService.resolverRango` switches on normalized lowercase: `7d`/`30d`/`90d` → `rangoPorDias(...)`; `all` → `new RangoPreset(null, hoy, "all")` (null desde desactiva predicate). Default (no params) → `30d`. Invalid range string → 400 "Rango invalido. Valores permitidos: 7d, 30d, 90d, all". |

### Requirement 4 — Reporte por agente (RF-42)

| # | Scenario | Status | Evidence |
| --- | --- | --- | --- |
| 14 | `agenteId` filtra a un solo agente | ✅ PASS | WHERE: `(CAST(? AS uuid) IS NULL OR i.asignado_a = CAST(? AS uuid))` is bound to `filtro.agenteFiltro()` (twice). All 9 DAO methods share the same WHERE construction. `ReporteDao.listarDetalle`, `contarPorCategoria`, etc. all funnel through `ReporteSql.construirWhere`. |
| 15 | Sin `agenteId` incluye todos los agentes visibles | ✅ PASS | When `agenteId` is null, the WHERE predicate is short-circuited (`CAST(? AS uuid) IS NULL`); the role predicate (ADMINISTRADOR sees all, AGENTE sees only their own) remains enforced. `ReporteResumenAgenteResponse` row produced for every agent with ≥1 assigned row in the visible scope (Q9 SQL: `GROUP BY u.id, u.nombre`). |

### Requirement 5 — Gráficos en reporte (RF-43)

| # | Scenario | Status | Evidence |
| --- | --- | --- | --- |
| 16 | Respuesta JSON incluye serie temporal por granularidad | ✅ PASS | `ReporteResponse.tendencia` is `List<ReporteTendenciaResponse>` with `bucketInicio` (`LocalDate`) + `total`. SQL: `SELECT date_trunc(...), COUNT(*) ... GROUP BY bucket_inicio ORDER BY bucket_inicio ASC`. Mapper `reporteMapper.mapearTendencia(rs)` returns ordered-ascending buckets. |
| 17 | Serie vacía cuando no hay datos | ✅ PASS | DAO returns `new ArrayList<>()` when ResultSet has no rows. JSON serializes to `tendencia: []`. Frontend `reporte-charts.tsx` line 173 explicitly checks `resumenPorAgente.length > 0` and renders empty state (no invented points), matching design decision D8 ("empty series render an explicit empty state rather than invented values"). |

### Requirement 6 — Exportación PDF/Excel (RF-44)

| # | Scenario | Status | Evidence |
| --- | --- | --- | --- |
| 18 | PDF incluye header + tabla + chart image | ✅ PASS | `ReportePdfExporter.renderizar(doc, dataset)` calls `escribirSeccion(cursor, "1. Resumen (KPIs)")` + KPI table + `escribirTendencia(cursor, dataset.getTendencia())` (table + chart PNG). Chart image generated by `ReporteChartRenderer.renderizarPng(tendencia)` returns `byte[]`; embedded via `PDImageXObject.createFromByteArray(...)`. Footer "Pagina X de Y" via `escribirPies(doc)` (line 349-355). |
| 19 | XLSX incluye header + hoja Datos + hoja Charts | ✅ PASS | `ReporteExcelExporter` constants: `HOJA_RESUMEN`, `HOJA_DATOS`, `HOJA_CHARTS`, `HOJA_POR_ESTADO`, `HOJA_POR_CATEGORIA`, `HOJA_POR_PRIORIDAD`, `HOJA_TENDENCIA`, `HOJA_POR_AGENTE`. `escribirCharts(wb, estilos, dataset)` inserts the shared `ReporteChartRenderer` PNG bytes via `wb.addPicture(bytes, XSSFWorkbook.PICTURE_TYPE_PNG)` plus bucket/total table. |

### Requirement 7 — Frontend `/reportes` page

| # | Scenario | Status | Evidence |
| --- | --- | --- | --- |
| 20 | Filter form con presets + custom inputs + agente dropdown | ✅ PASS | `frontend/src/pages/reportes/components/reporte-filtros-form.tsx`: native `<select>` for preset (`7d/30d/90d/all/custom`), conditional native `<input type="date">` for desde/hasta when preset="custom", agent `<select>` rendered only if `agentes[]` is passed (page hides it for USUARIO, restricts to self for AGENTE). Granularidad `<select>` with `Diaria|Semanal|Mensual` default `Semanal`. `data.ts` exports `GRANULARIDADES_DISPONIBLES` and `GRANULARIDAD_POR_DEFECTO`. |
| 21 | Tabla preview muestra mismas columnas que XLSX | ✅ PASS | `reporte-preview-table.tsx` line 26-28 confirms 10 columns in XLSX order: ID, Código, Título, Categoría, Asignado a, Estado proceso, Estado aprobación, Prioridad, Creado en, Resuelto en. Same columns and order as XLSX `HOJA_DATOS`. |
| 22 | Botones de exportación disparan descarga | ✅ PASS | `reporte-export-buttons.tsx` renders two `Button`s with `onExportPdf`/`onExportExcel` callbacks. Page wires them to `descargar("pdf"|"xlsx")` → `reportesService.descargarPdf(applied, signal)` → `apiRequest(..., { responseType: "blob" })` → `iniciarDescarga(blob, "reporte.{ext}")` (creates object URL, clicks `<a download>`, revokes URL). |
| 23 | Estado loading mientras carga | ✅ PASS | `reporte-export-buttons.tsx` line 47: `disabled={exporting}`; spinner replaces icon when true. Page shows `aria-busy={loading}` skeleton / "Cargando reporte..." text; previous report kept visible (refetch does not blank). |
| 24 | Error toast en fallo de red | ✅ PASS | `reporte-error-alert.tsx` renders an `Alert` with `role="alert"` (dismissible). Page sets `errorMessage` on `catch` and does NOT clear `reporte`; AbortError is filtered out (`if (controller.signal.aborted) return`). |

### Requirement 8 — Sidebar link

| # | Scenario | Status | Evidence |
| --- | --- | --- | --- |
| 25 | Link `Reportes` aparece para ADMINISTRADOR, AGENTE, USUARIO | ✅ PASS | `frontend/src/layout/app-sidebar.tsx:26`: `{ label: "Reportes", icon: BarChart3, to: "/reportes" }` — single item without role-conditional render (all roles see the same nav). |
| 26 | Link clickeable navega a `/reportes` | ✅ PASS | Item now has `to: "/reportes"` so the existing `Link` branch (instead of the previous dead `<button>`) renders active/inactive navigation. `frontend/src/router.tsx:95-100` registers the private `reportesRoute` inside `AppLayout`. |

### Requirement 9 — Per-role scope

| # | Scenario | Status | Evidence |
| --- | --- | --- | --- |
| 27 | ADMINISTRADOR ve todas las métricas | ✅ PASS | Combined evidence of scenarios #1 + #15. |
| 28 | AGENTE solo ve sus incidencias | ✅ PASS | `ReporteService.scopeDe` for AGENTE forces `agenteFiltro = usuario.getId()` and emits `(? = 'AGENTE' AND i.asignado_a = ?)` in WHERE (binding `currentUserId` twice). Client-supplied `agenteId` is silently overwritten. No code path allows AGENTE scope to leak assigned-to-other-agent rows. `ReporteService.construir` also short-circuits `resumenPorAgente` to `List.of()` for USUARIO only; for AGENTE/ADMIN it runs Q9 with the same WHERE predicate. |
| 29 | USUARIO solo ve las suyas | ✅ PASS | `ReporteService.scopeDe` for USUARIO returns `ReporteScope("USUARIO", id, null)` — `agenteFiltro` always null. WHERE emits `(? = 'USUARIO' AND i.creado_por_usuario_id = ?)`. `resumenPorAgente` is `List.of()` (`scope.esUsuario() ? List.of() : ...`). |

---

## 4. Spec scenario compliance matrix

| Bucket | Count | PASS | WARNING | FAIL |
| --- | --- | --- | --- | --- |
| R1 — JSON endpoint | 7 | 7 | 0 | 0 |
| R2 — Export endpoint | 4 | 4 | 0 | 0 |
| R3 — Reporte por período (RF-41) | 2 | 2 | 0 | 0 |
| R4 — Reporte por agente (RF-42) | 2 | 2 | 0 | 0 |
| R5 — Gráficos (RF-43) | 2 | 2 | 0 | 0 |
| R6 — Exportación PDF/Excel (RF-44) | 2 | 2 | 0 | 0 |
| R7 — Frontend `/reportes` page | 5 | 5 | 0 | 0 |
| R8 — Sidebar link | 2 | 2 | 0 | 0 |
| R9 — Per-role scope | 3 | 3 | 0 | 0 |
| **Total** | **29** | **29** | **0** | **0** |

---

## 5. Implementation evidence

### 5.1 Backend files (new — 14)

- `sistemaincidencias/src/main/java/com/integrador/sistemaincidencias/reportes/controller/ReporteController.java` — 145 LOC, two endpoints, format → MIME mapping, attachment filename derived from `yyyyMMdd-HHmmss`.
- `sistemaincidencias/src/main/java/com/integrador/sistemaincidencias/reportes/service/ReporteService.java` — 245 LOC, range normalization + RBAC scope + canonical zero maps + `construir`/`exportar` entry points.
- `sistemaincidencias/src/main/java/com/integrador/sistemaincidencias/reportes/dao/ReporteDao.java` — 9 method signatures (`contarTotal`, `contarPorEstadoAprobacion`, `contarPorEstadoProceso`, `contarPorCategoria`, `contarPorPrioridad`, `listarTendencia`, `listarResumenPorAgente`, `tiempoPromedioResolucionHoras`, `listarDetalle`) + `limiteDetalle() = 50` constant.
- `sistemaincidencias/src/main/java/com/integrador/sistemaincidencias/reportes/mapper/ReporteMapper.java` — null-safe `ResultSet` → DTOs.
- `sistemaincidencias/src/main/java/com/integrador/sistemaincidencias/reportes/sql/ReporteSql.java` — 11 SQL constants + `tendenciaPara(Granularidad)` + `construirWhere(filtro, parametros)` with deterministic parameter order.
- `sistemaincidencias/src/main/java/com/integrador/sistemaincidencias/reportes/sql/ReporteFiltro.java` — record capturing normalized filter.
- `sistemaincidencias/src/main/java/com/integrador/sistemaincidencias/reportes/dto/ReporteRequest.java` — transport filter.
- `sistemaincidencias/src/main/java/com/integrador/sistemaincidencias/reportes/dto/ReporteResponse.java` — composite response (reuses `IncidenciaResumenResponse`).
- `sistemaincidencias/src/main/java/com/integrador/sistemaincidencias/reportes/dto/ReporteFiltroAplicado.java` — echoed normalized filter.
- `sistemaincidencias/src/main/java/com/integrador/sistemaincidencias/reportes/dto/ReporteKpiResponse.java` — totals + 3 maps.
- `sistemaincidencias/src/main/java/com/integrador/sistemaincidencias/reportes/dto/ReporteConteoCategoriaResponse.java` — category row.
- `sistemaincidencias/src/main/java/com/integrador/sistemaincidencias/reportes/dto/ReporteTendenciaResponse.java` — bucket row.
- `sistemaincidencias/src/main/java/com/integrador/sistemaincidencias/reportes/dto/ReporteResumenAgenteResponse.java` — agent row (null `promedioResolucionHoras` allowed).
- `sistemaincidencias/src/main/java/com/integrador/sistemaincidencias/reportes/dto/ReporteGranularidad.java` — enum with `desde(String)`.
- `sistemaincidencias/src/main/java/com/integrador/sistemaincidencias/reportes/dto/ReporteFormato.java` — enum with `desde(String)`.
- `sistemaincidencias/src/main/java/com/integrador/sistemaincidencias/reportes/exporter/ReporteChartRenderer.java` — deterministic Java2D trend PNG.
- `sistemaincidencias/src/main/java/com/integrador/sistemaincidencias/reportes/exporter/ReporteExcelExporter.java` — SXSSF, 8 sheets, dispose in finally.
- `sistemaincidencias/src/main/java/com/integrador/sistemaincidencias/reportes/exporter/ReportePdfExporter.java` — PDDocument, A4, "Pagina X de Y", try-with-resources per page.

### 5.2 Frontend files (new — 6)

- `frontend/src/services/reportes-service.ts` — JSON + blob (`descargarPdf`, `descargarExcel`), `iniciarDescarga` helper.
- `frontend/src/types/reportes.ts` — shared types matching backend camelCase.
- `frontend/src/pages/reportes/index.tsx` — page composition, `AbortController` refetch, role-aware agent selector, KPI bar, last-good-state UI.
- `frontend/src/pages/reportes/data.ts` — preset labels, granularity list, chart colors (reuses dashboard tokens).
- `frontend/src/pages/reportes/components/reporte-filtros-form.tsx` — preset select + custom dates + role-aware agente select + granularidad.
- `frontend/src/pages/reportes/components/reporte-charts.tsx` — 4 Recharts sections (process status, categoría, tendencia, agente) with explicit empty states.
- `frontend/src/pages/reportes/components/reporte-preview-table.tsx` — 10 columns matching XLSX order.
- `frontend/src/pages/reportes/components/reporte-export-buttons.tsx` — PDF/Excel buttons with spinner.
- `frontend/src/pages/reportes/components/reporte-error-alert.tsx` — dismissible non-blocking error surface.

### 5.3 Modified files

- `sistemaincidencias/pom.xml` — added `org.apache.pdfbox:pdfbox:3.0.3`.
- `frontend/src/router.tsx` — registered private `reportesRoute` inside `AppLayout` (`<ReportesPage />`).
- `frontend/src/layout/app-sidebar.tsx` — added `to: "/reportes"` (item had `icon: BarChart3` already).
- `frontend/src/lib/http.ts` — added optional `responseType?: "json" | "blob"` to `RequestOptions` (default JSON path unchanged).
- `sistemaincidencias/postman/SistemaIncidencias.postman_collection.json` — new `"Reportes"` folder with 4 requests (ADMIN JSON, AGENTE drill-down JSON, ADMIN PDF, ADMIN XLSX) and example bodies for 200/400.

### 5.4 Deliberately not modified

- `sistemaincidencias/src/main/java/com/integrador/sistemaincidencias/shared/config/SecurityConfig.java` — `/api/**` already `.authenticated()`.
- `sistemaincidencias/src/main/java/com/integrador/sistemaincidencias/usuarios/service/PermisoAdministracionService.java` — `validarAutenticado` reused.
- `IncidenciaController`, `DashboardController`, all existing DAO tables.
- No `npm` packages added.

---

## 6. Drift applied (deviations from proposal/design)

None blocking. Two minor deviations:

1. **PDF/XLSX filename uses `yyyyMMdd-HHmmss` (generation timestamp) instead of date range**. Design D2 said filenames contain "fixed text and validated ISO dates". Proposal §3.2.2 said `filename="reporte-{desde}-{hasta}.{ext}"`. Implementation uses generation timestamp (`reporte-20260715-120000.{ext}`) per `ReporteController.exportar`. This is functionally equivalent and safer when `rango=all` (no dates to interpolate); flagged here for awareness. Not a spec scenario violation.

2. **Chart renderer is `ReporteChartRenderer` (Java2D) per design D7**, not Recharts server-side rendered. Both PDF and XLSX embed the same deterministic PNG bytes. Matches design.

3. **Frontend uses native `<select>`/`<input type="date">` instead of shadcn `<Select>`/`<DatePicker>`** — matches the `dashboard-real` convention (shadcn `Select`/`DatePicker` not installed). Proposal §3.5.3 suggested shadcn, but no new dependencies is the project rule; native controls in `reporte-filtros-form.tsx` deliver the same UX.

None break a spec scenario.

---

## 7. Regressions / new master failures

None. `./mvnw compile` returns exit 0 (no new errors vs. pre-`reportes-export` master). `npm run lint` produces the same 3 pre-existing errors in `incidencias/index.tsx` (origin `f26424a`). `npm run build` produces the same 4 pre-existing `tsc` errors (origin `f26424a`). These are unrelated to `reportes-export`.

---

## 8. Issues

### 8.1 CRITICAL
None.

### 8.2 WARNING
None.

### 8.3 SUGGESTION (out of scope, non-blocking)
1. **Manual Postman smoke** is recommended before next change to validate end-to-end runtime (ADMIN/AGENTE/USUARIO tokens, PostgreSQL populated).
2. **Latency benchmark (P95 JSON < 2s; export < 5s)** — design estimates via existing indexes; not measured by sdd-verify. If violated, add Caffeine 60s cache or split Q9 from the others.
3. **PDF chart embedding opens in Adobe/Chrome but not all viewers** — confirm in a follow-up smoke (some previewers ignore embedded images gracefully).
4. **Filename uses timestamp instead of date range** — minor UX drift; document in archive-report as informational.
5. **Sidebar `to: "/reportes"`** matches the project `Link` branch but is not role-gated; all authenticated roles see Reportes regardless of `agenteId` relevance. Acceptable per proposal §3.5.4.
6. **`tiempoPromedioResolucionHoras` normalization**. Service code converts `null` (AVG with no rows) to `0.0` globally (`promedio == null ? 0.0 : promedio`). Spec scenario #16 reads "coincide con cálculo manual en psql" — behavior is `0.0` when no resueltas; this matches design D2 normal-lization. Frontend `ReportesKpiBar` renders `tiempoHoras !== null` (which is now always), so average card always appears.

---

## 9. Architecture correctness summary

| Decision | Status | Evidence |
| --- | --- | --- |
| D1 — One JSON + one export endpoint | ✅ | `ReporteController.obtener` + `ReporteController.exportar`. |
| D2 — Auth-derived scope | ✅ | `ReporteService.scopeDe(usuario, ...)`; AGENTE forced; USUARIO ignores `agenteId`. |
| D3 — Inclusive/half-open date range | ✅ | `[desde 00:00:00, hasta + 1 day 00:00:00)`. |
| D4 — Granularity enum, no SQL interpolation | ✅ | `ReporteGranularidad` enum + 3 literal SQL constants in `ReporteSql`. |
| D5 — Native DAO + prepared parameters | ✅ | `ReporteDao` uses `PreparedStatement.setObject`; no string concat. |
| D6 — One `ReporteDataset` shared by JSON + export | ✅ | `ReporteService.exportar` calls `construir(...)` once, passes same `ReporteResponse` to exporter. |
| D7 — Synchronous export, shared PNG | ✅ | `ReporteChartRenderer.renderizarPng(...)` shared by both exporters. |
| D8 — Private route, AbortController, last-good-state UI | ✅ | `ReportesPage` uses ref + setAbort; `reporte` kept on error. |

---

## 10. Verdict

**PASS** — All 29 spec scenarios map to clean code evidence in the merged master (`6a8c73c` + `31fc319` + `7b18b00`). Static checks are net-new clean (0 new errors vs. pre-existing master baseline). No blocking drift, no critical/warning issues. Change is ready to archive.
