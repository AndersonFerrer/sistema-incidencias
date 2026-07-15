# Capability Spec: `reportes` — Reportes con export PDF/Excel

**Capability**: `reportes`
**Project**: sistema-incidencias
**Scope**: Backend (new `reportes/` module with 2 endpoints — `GET /api/reportes` and `GET /api/reportes/exportar` — plus 2 PDF/Excel exporters using Apache PDFBox 3.0.3 + Apache POI 5.3.0) + Frontend (new `/reportes` private page with filter form + preview table + charts + export buttons) + sidebar link.

This capability spec is the synced baseline for the `reportes` capability after **one** archived change (`reportes-export`); the archive history below records what the change contributed and which drifts were applied during archive.

> **Archive history** (baseline evolution; each archive added/extended requirements on top of the prior baseline):
>
> - **`reportes-export`** (2026-07-15, archived): seeded the baseline. **Backend primary** — new `reportes/` module with `GET /api/reportes` (JSON preview) and `GET /api/reportes/exportar?formato={pdf|xlsx}` (synchronous binary download) endpoints; 11 prepared SQL statements (Q1 total, Q2/Q3 byEstadoAprobacion/byEstadoProceso, Q4 byCategoria, Q5 byPrioridad, Q6/Q7/Q8 three trend variants `date_trunc('day'|'week'|'month')`, Q9 resumenPorAgente, Q10 tiempoPromedioResolucionHoras, Q11 detalle LIMIT 50); per-role WHERE-injected scope (`ADMINISTRADOR` no scope, `AGENTE` forced `i.asignado_a = currentUser.id`, `USUARIO` forced `i.creado_por_usuario_id = currentUser.id`); half-open date predicate `[desde 00:00:00, hasta + 1 day 00:00:00)`; canonical zero-fill maps for estado aprobacion/proceso and prioridad; shared `ReporteDataset` between JSON and exporters (no DAO double-query); PDFBox + POI SXSSF exporters with deterministic Java2D trend PNG. **Frontend** — new `services/reportes-service.ts`, types/reportes.ts, `pages/reportes/{index,data}.tsx`, components (`reporte-filtros-form`, `reporte-charts`, `reporte-preview-table`, `reporte-export-buttons`, `reporte-error-alert`); private route inside `AppLayout`; sidebar item `Reportes` gains `to: "/reportes"`; native `<select>`/`<input type="date">` (no new npm package); `lib/http.ts` gains additive `responseType: "json" | "blob"`. **Postman** — new "Reportes" folder with 4 requests (ADMIN JSON, AGENTE drill-down JSON, ADMIN PDF, ADMIN XLSX) and 5 example bodies (ADMIN/AGENTE/USUARIO JSON, ADMIN PDF binary placeholder, 400 invalid `formato=csv`, ADMIN XLSX binary placeholder). 29 Given/When/Then scenarios covered. Verdict PASS. See `openspec/changes/archive/reportes-export/archive-report.md`.

> **Role-name canonicalization**: per `sistemaincidencias/AGENTS.md`, role codes are `ADMINISTRADOR`, `AGENTE`, `USUARIO`. All scenarios below use these canonical names.
>
> **Auth boundary**: all scenarios assume the request is `authenticated` (a valid `Authorization: Bearer <token>` is supplied). `SecurityConfig.java:42-49` enforces `.requestMatchers("/api/**").authenticated()` upstream of every controller. Both endpoints reuse the `validarAutenticado(token)` helper introduced by change `incidencias-rbac-agente`; no admin gate.
>
> **Resolved open questions** (from `proposal.md` §5, all defaults confirmed):
> - Q1 (PDF library): Apache PDFBox 3.0.3 (open source, Apache 2.0; iText 7 AGPL was discarded).
> - Q2 (UI range presets): combined — dropdown of preset (`7d|30d|90d|all|custom`) + conditional native `<input type="date">` for custom range.
> - Q3 (granularity): selectable — `diaria` | `semanal` | `mensual`, default `semanal`. SQL `date_trunc` accepts only literal enum-mapped values; no string interpolation.
> - Q4 (drill-down): optional `agenteId` — ADMINISTRADOR can narrow scope; AGENTE/USUARIO cannot widen it (server forces AGENTE to `currentUser.id` and ignores `agenteId` for USUARIO).
> - Q5 (sync vs async export): synchronous — controller returns `byte[]` directly. No job queue / polling in V1.

## ADDED Requirements

### Requirement: `GET /api/reportes` with JSON preview

The backend shall expose `GET /api/reportes` authenticated and return 200 with `filtro`, `kpis`, `byCategoria`, `tendencia`, `resumenPorAgente`, `tiempoPromedioResolucionHoras`, and `detalle`. Accepted query params: `desde`, `hasta`, `rango` (preset transport, optional), `agenteId` (UUID, optional), `granularidad` (`diaria|semanal|mensual`, default `semanal`). When `desde`/`hasta` are both present they override `rango`. `rango=all` removes the time predicate; `rango=7d|30d|90d` resolves to inclusive calendar dates; absence defaults to `30d`. `detalle` shall contain at most the 50 most recent incidences of the authorized scope.

#### Scenario: ADMINISTRADOR without filter sees all incidences in range
- GIVEN a valid JWT for `ADMINISTRADOR` and 20 visible incidences within the applied range
- WHEN `GET /api/reportes` is called without `agenteId`
- THEN THE SYSTEM returns 200 and computes every block from all 20 incidences.

#### Scenario: AGENTE sees only their own incidences
- GIVEN a valid JWT for `AGENTE` with 4 incidences assigned to them and 16 assigned to others
- WHEN `GET /api/reportes` is called
- THEN THE SYSTEM returns 200 and computes every block from only their 4 assigned incidences.

#### Scenario: USUARIO sees only their created incidences
- GIVEN a valid JWT for `USUARIO` who created 6 of the 20 incidences in range
- WHEN `GET /api/reportes` is called
- THEN THE SYSTEM returns 200 and computes every block from only those 6 created incidences.

#### Scenario: `desde` + `hasta` filters apply the range
- GIVEN incidences inside and outside the requested range
- WHEN `GET /api/reportes?desde=2026-07-01&hasta=2026-07-31` is called
- THEN THE SYSTEM includes only incidences whose `creadoEn` falls inclusively within both dates.

#### Scenario: `agenteId` drill-down filter narrows the dataset
- GIVEN an `ADMINISTRADOR` and an agent with 3 incidences in range
- WHEN `GET /api/reportes?agenteId={id}` is called
- THEN THE SYSTEM returns metrics, trend, and detail derived from only those 3 incidences.

#### Scenario: `granularidad` parameter affects trend buckets
- GIVEN incidences distributed across multiple days, weeks, and months
- WHEN the report is requested with `granularidad=diaria`, `semanal`, `mensual`, and without the parameter
- THEN THE SYSTEM groups by day-start, ISO-week-start, or month-start respectively, sorts ascending, and defaults to `semanal`.

#### Scenario: invalid token returns 401
- GIVEN a request with absent, expired, or malformed JWT
- WHEN `GET /api/reportes` is called
- THEN THE SYSTEM returns 401 without exposing report data.

### Requirement: `GET /api/reportes/exportar` with PDF/XLSX download

The backend shall generate synchronously the same authorized dataset as the JSON preview for `formato=pdf|xlsx`, return it as an attachment, and shall NOT create jobs or require polling.

#### Scenario: `formato=pdf` returns `Content-Type: application/pdf`
- GIVEN an authenticated user and a valid filter
- WHEN `GET /api/reportes/exportar?...&formato=pdf` is called
- THEN THE SYSTEM returns 200 with `Content-Type: application/pdf` and `Content-Disposition` with a `.pdf` filename.

#### Scenario: `formato=xlsx` returns `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- GIVEN an authenticated user and a valid filter
- WHEN `GET /api/reportes/exportar?...&formato=xlsx` is called
- THEN THE SYSTEM returns 200 with `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` and a `.xlsx` filename.

#### Scenario: invalid format returns 400
- GIVEN an authenticated user
- WHEN `GET /api/reportes/exportar?formato=csv` is called
- THEN THE SYSTEM returns 400 with a validation error and does not generate a file.

#### Scenario: empty range returns a valid PDF/XLSX with header
- GIVEN a valid range with no incidences in the user's scope
- WHEN exporting to PDF or XLSX
- THEN THE SYSTEM returns a valid file with header and column structure, but no detail rows.

### Requirement: Report by period (RF-41)

The system shall filter reports and exports by inclusive calendar dates and shall offer presets plus a custom range.

#### Scenario: `desde`/`hasta` honor inclusive timestamps
- GIVEN incidences at `desde 00:00:00`, at `hasta 23:59:59.999999`, and outside both limits
- WHEN that custom range is applied
- THEN THE SYSTEM includes the two boundary incidences and excludes the outsiders.

#### Scenario: presets `7d` / `30d` / `90d` / `all`
- GIVEN the current date and a history older than 90 days
- WHEN each preset is selected
- THEN THE SYSTEM applies the last 7, 30, or 90 inclusive calendar days; `all` removes the time bound; the default is `30d`.

### Requirement: Report by agent (RF-42)

The system shall allow drill-down by `agenteId` inside the authorized scope and shall expose per-visible-agent metrics.

#### Scenario: `agenteId` filters to a single agent
- GIVEN an `ADMINISTRADOR` with access to several agents
- WHEN the `agenteId` of one of them is applied
- THEN THE SYSTEM limits KPIs, distributions, trend, summary, and detail to that agent.

#### Scenario: without `agenteId`, includes all visible agents
- GIVEN incidences assigned to several agents within the per-role scope
- WHEN the report is requested without `agenteId`
- THEN THE SYSTEM includes one `resumenPorAgente` entry per visible agent with incidences.

### Requirement: Charts in report (RF-43)

The JSON response shall include data suitable for visualizations and a time series consistent with the applied granularity.

#### Scenario: JSON response includes time series by granularity
- GIVEN visible incidences distributed in the range
- WHEN `GET /api/reportes` is called with a valid granularity
- THEN THE SYSTEM returns `tendencia[]` with `bucketInicio` and `total` in ascending chronological order.

#### Scenario: empty series when no data
- GIVEN a range with no visible incidences
- WHEN `GET /api/reportes` is called
- THEN THE SYSTEM returns 200 with `tendencia=[]` and the visualizations show no invented values.

### Requirement: PDF/Excel export (RF-44)

The files shall preserve filters and per-role scope. The PDF shall be readable by standard viewers and the XLSX shall open in Excel or LibreOffice.

#### Scenario: PDF includes header + table + chart image
- GIVEN a report with data and a time series
- WHEN exporting with `formato=pdf`
- THEN THE SYSTEM generates a PDF with title, range/filters, data table, and a trend chart image.

#### Scenario: XLSX includes header + `Datos` sheet + `Charts` sheet
- GIVEN a report with data and visualizations
- WHEN exporting with `formato=xlsx`
- THEN THE SYSTEM generates a workbook with headers, a `Datos` sheet, and a `Charts` sheet with the chart image.

### Requirement: Frontend `/reportes` page

The application shall expose `/reportes` as a private page, consume the report endpoints, and keep preview + export synchronized with the active filter.

#### Scenario: filter form with presets + custom inputs + agent dropdown
- GIVEN an authenticated user on `/reportes`
- WHEN they view and modify the filters
- THEN THE SYSTEM shows `7d|30d|90d|all`, custom dates, granularity, and an agent selector appropriate for the role.

#### Scenario: preview table shows the same columns as XLSX
- GIVEN a JSON response with `detalle`
- WHEN the page renders the preview
- THEN THE SYSTEM shows the same detail columns in the same order defined in the XLSX `Datos` sheet.

#### Scenario: export buttons trigger download
- GIVEN a loaded report with valid filters
- WHEN the user clicks `Exportar PDF` or `Exportar Excel`
- THEN THE SYSTEM calls `/api/reportes/exportar` with the active format and filters and starts the corresponding download.

#### Scenario: loading state while fetching
- GIVEN an in-flight load or export
- WHEN the request has not yet finished
- THEN THE SYSTEM shows a loading state and disables actions that could duplicate the request.

#### Scenario: error toast on network failure
- GIVEN the page with or without a last valid report
- WHEN the load or export fails due to network or 5xx
- THEN THE SYSTEM shows a non-blocking toast and keeps the last valid preview, if any.

### Requirement: Sidebar link

The sidebar shall offer functional navigation to `/reportes` for the three authenticated roles.

#### Scenario: `Reportes` link appears for ADMINISTRADOR, AGENTE, USUARIO
- GIVEN a valid session for any of the three roles
- WHEN the private sidebar renders
- THEN THE SYSTEM shows the `Reportes` link.

#### Scenario: clickable link navigates to `/reportes`
- GIVEN a visible `Reportes` link
- WHEN the user activates it
- THEN THE SYSTEM navigates to `/reportes` without reloading the whole application.

### Requirement: Per-role scope

The backend shall apply the per-role scope for both JSON and exports: no extra scope for `ADMINISTRADOR`, `asignado_a=currentUser.id` for `AGENTE`, and `creado_por_usuario_id=currentUser.id` for `USUARIO`.

#### Scenario: ADMINISTRADOR sees all metrics
- GIVEN a valid JWT for `ADMINISTRADOR`
- WHEN querying or exporting a report without `agenteId`
- THEN THE SYSTEM includes all incidences of the requested period.

#### Scenario: AGENTE only sees their own incidences
- GIVEN a valid JWT for `AGENTE` and a tampered request with another agent's `agenteId`
- WHEN querying or exporting the report
- THEN THE SYSTEM forces the JWT's own id and never includes incidences assigned to others.

#### Scenario: USUARIO only sees their own incidences
- GIVEN a valid JWT for `USUARIO` and any `agenteId` sent by the client
- WHEN querying or exporting the report
- THEN THE SYSTEM ignores `agenteId` and includes only incidences created by that user.
