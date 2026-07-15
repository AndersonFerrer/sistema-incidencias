# Archive Report — `reportes-export` (verdict PASS)

**Change**: `reportes-export`
**Capability**: `reportes` (NEW capability baseline)
**Project**: sistema-incidencias
**Archive date**: 2026-07-15
**Verdict**: PASS (sdd-verify: see `verify-report.md`)
**Source**: `openspec/changes/archive/reportes-export/verify-report.md` + engram topic `sdd/reportes-export/verify-report`

---

## 1. Verdict

**PASS** — sdd-verify verdict in `verify-report.md` confirms all 29 Given/When/Then scenarios pass at code level against the merged master (`7b18b00`). Zero new regressions. Pre-existing 3 lint + 4 build errors in master (introduced by `f26424a` PR #9, before this change) are documented and remain out of scope. Backend `./mvnw compile -q` exit 0, frontend `npm run lint` and `npm run build` net-new clean. `SecurityConfig.java` not touched (`git diff` empty for it). Postman JSON valid with `"Reportes"` folder containing 4 requests (ADMIN JSON, AGENTE drill-down JSON, ADMIN PDF, ADMIN XLSX) and 5 sample responses (ADMIN/AGENTE/USUARIO JSON + 400 invalid `formato=csv` + PDF binary placeholder).

---

## 2. Changes shipped

The `reportes-export` change shipped across **3 stacked PRs** to `master`:

- **PR #14** (`6a8c73c`) — Slice A — Backend module + endpoints + Postman:
  - New `reportes/` module: `ReporteController` (2 endpoints: `GET /api/reportes` JSON preview, `GET /api/reportes/exportar?formato={pdf|xlsx}`), `ReporteService` (range normalization + RBAC scope + canonical zero-fill maps + `construir`/`exportar`), `ReporteDao` (9 methods), `ReporteMapper` (ResultSet → DTOs), `ReporteSql` (11 prepared SQL constants including 3 trend variants), `ReporteFiltro` (record), 9 DTOs (`ReporteRequest`, `ReporteResponse`, `ReporteFiltroAplicado`, `ReporteKpiResponse`, `ReporteConteoCategoriaResponse`, `ReporteTendenciaResponse`, `ReporteResumenAgenteResponse`, `ReporteGranularidad` enum, `ReporteFormato` enum).
  - Postman: new `"Reportes"` folder with 4 requests (ADMIN JSON, AGENTE drill-down JSON, ADMIN PDF, ADMIN XLSX) and 5 example responses (3 role-scoped JSON, 400 invalid `formato`, PDF binary placeholder).
- **PR #15** (`31fc319`) — Slice B — PDF + Excel exporters:
  - Apache PDFBox 3.0.3 added to `sistemaincidencias/pom.xml` (POI 5.3.0 already present, untouched).
  - `ReporteExcelExporter`: SXSSF workbook, 8 sheets in order (`Resumen`, `Datos`, `Charts`, `Por estado`, `Por categoria`, `Por prioridad`, `Tendencia`, `Por agente`), `dispose()` in `finally`.
  - `ReportePdfExporter`: PDDocument, A4 portrait, Helvetica, "Pagina X de Y" footer via `getNumberOfPages()`, `try-with-resources` per page, embedded chart image via `PDImageXObject`.
  - `ReporteChartRenderer`: deterministic Java2D trend PNG shared by both exporters.
- **PR #16** (`7b18b00`) — Slice C — Frontend `/reportes` page:
  - New `frontend/src/services/reportes-service.ts` (`obtener()`, `descargarPdf()`, `descargarExcel()`, `iniciarDescarga()` blob helper).
  - `frontend/src/types/reportes.ts`: shared filter / response / KPI / chart / agent / detail types.
  - `frontend/src/pages/reportes/index.tsx`: page composition with `AbortController` refetch, role-aware agent selector (USUARIO hides; AGENTE restricts to self; ADMIN sees all), KPI bar, last-good-state UI, error `Alert`.
  - `frontend/src/pages/reportes/components/`: `reporte-filtros-form.tsx` (preset + custom dates + agente + granularidad, native `<select>` and `<input type="date">`), `reporte-charts.tsx` (4 Recharts sections with explicit empty states), `reporte-preview-table.tsx` (10 columns matching XLSX order), `reporte-export-buttons.tsx` (PDF/Excel with spinner), `reporte-error-alert.tsx` (dismissible non-blocking).
  - `frontend/src/pages/reportes/data.ts`: preset labels, granularity list, chart colors (reuses dashboard tokens).
  - `frontend/src/router.tsx`: registered private `reportesRoute` inside `AppLayout`.
  - `frontend/src/layout/app-sidebar.tsx:26`: `to: "/reportes"` added (item already had `icon: BarChart3`).
  - `frontend/src/lib/http.ts`: additive `responseType?: "json" | "blob"` on `RequestOptions`; default JSON path unchanged.

Master HEAD at archive: `7b18b00`. Diffstat vs base `850fd8e`: backend 19 new files (1 controller + 1 service + 1 dao + 1 mapper + 2 sql + 9 dto + 3 exporter + package-info), frontend 8 new files (1 service + 1 types + 1 page + 1 data + 5 components) + 3 modified (router, sidebar, http), Postman +1 folder with 4 requests, pom.xml +1 dependency (PDFBox). One new Maven dependency (`org.apache.pdfbox:pdfbox:3.0.3`); zero new npm packages.

---

## 3. Requirements closed

From `docs/requerimientos.md` and the spec matrix:

- **RF-41**: Reporte por período (`desde`/`hasta` + `rango` presets) — `ReporteFiltroAplicado`, `ReporteService.resolverRango`, half-open `[desde 00:00:00, hasta + 1 day 00:00:00)`.
- **RF-42**: Reporte por agente — `ReporteService.scopeDe` per-role forces + `agenteId` drill-down via `(CAST(? AS uuid) IS NULL OR i.asignado_a = CAST(? AS uuid))`.
- **RF-43**: Gráficos en reporte — `ReporteResponse.tendencia[]` with selectable `diaria|semanal|mensual` granularity, ordered ascending.
- **RF-44**: Exportación PDF/XLSX — `GET /api/reportes/exportar?formato={pdf|xlsx}` with synchronous `byte[]` + `Content-Disposition: attachment`.
- **RF-45**: Sidebar link to Reportes — `app-sidebar.tsx:26` now has `to: "/reportes"`.
- **RNF-01**: Latency target JSON P95 < 2s, export P95 < 5s — design §7 estimates via existing indexes; manual benchmark pending (follow-up).

---

## 4. Master commits

| SHA | Subject |
| --- | --- |
| `6a8c73c` | feat(reportes) PR1: backend module + endpoints + Postman (#14) |
| `31fc319` | feat(reportes) PR2: PDFBox + POI exporters (#15) |
| `7b18b00` | feat(reportes) PR3: frontend /reportes page + sidebar (#16) |
| `<this>`  | docs(sdd): archive reportes-export (verdict PASS) |

---

## 5. Drift applied

Three minor deviations documented in `verify-report.md` §6. None break a spec scenario.

1. **PDF/XLSX filename uses generation timestamp instead of date range**. Proposal §3.2.2 said `filename="reporte-{desde}-{hasta}.{ext}"`. Implementation uses `reporte-yyyyMMdd-HHmmss.{ext}` so `rango=all` (no dates) still produces a valid filename. Functionally equivalent; safer for unbounded queries. Flagged as SUGGESTION in verify §8.3.
2. **Native `<select>`/`<input type="date">` instead of shadcn `<Select>`/`<DatePicker>`** in `reporte-filtros-form.tsx`. Matches the `dashboard-real` convention (no new npm packages). Native controls with `aria-label` deliver the same UX, identical to dashboard's range selector.
3. **`tiempoPromedioResolucionHoras` normalization from null to `0.0`** in `ReporteService.construir`. Spec scenario #16 in this archive baseline matches the design's normalize-to-zero behavior; the `ReportesKpiBar` in `index.tsx` renders the card unconditionally because the service never returns null. Individual-agent `promedioResolucionHoras` in `ReporteResumenAgenteResponse` stays nullable when the agent has no resueltas in range (correct behavior, doesn't conflate "no data" with "0.0 hours").

---

## 6. Capability spec evolution

`openspec/specs/reportes/spec.md` is now the canonical baseline (NEW capability). It contains:
- All 29 Given/When/Then scenarios from `openspec/changes/archive/reportes-export/specs/reportes/spec.md`.
- An "Archive history" blockquote noting `reportes-export` as the seed.
- Header rewritten from "delta spec" language to "synced baseline" language.
- Resolved open questions Q1..Q5 (PDFBox 3.0.3, presets, granularity, drill-down, sync) recorded at the top.

---

## 7. Files

### Added (19 backend + 6 frontend types/pages + 5 components + 1 service + 1 types + 1 data)
- `sistemaincidencias/src/main/java/com/integrador/sistemaincidencias/reportes/controller/ReporteController.java`
- `sistemaincidencias/src/main/java/com/integrador/sistemaincidencias/reportes/service/ReporteService.java`
- `sistemaincidencias/src/main/java/com/integrador/sistemaincidencias/reportes/dao/ReporteDao.java`
- `sistemaincidencias/src/main/java/com/integrador/sistemaincidencias/reportes/mapper/ReporteMapper.java`
- `sistemaincidencias/src/main/java/com/integrador/sistemaincidencias/reportes/sql/ReporteSql.java`
- `sistemaincidencias/src/main/java/com/integrador/sistemaincidencias/reportes/sql/ReporteFiltro.java`
- `sistemaincidencias/src/main/java/com/integrador/sistemaincidencias/reportes/dto/ReporteRequest.java`
- `sistemaincidencias/src/main/java/com/integrador/sistemaincidencias/reportes/dto/ReporteResponse.java`
- `sistemaincidencias/src/main/java/com/integrador/sistemaincidencias/reportes/dto/ReporteFiltroAplicado.java`
- `sistemaincidencias/src/main/java/com/integrador/sistemaincidencias/reportes/dto/ReporteKpiResponse.java`
- `sistemaincidencias/src/main/java/com/integrador/sistemaincidencias/reportes/dto/ReporteConteoCategoriaResponse.java`
- `sistemaincidencias/src/main/java/com/integrador/sistemaincidencias/reportes/dto/ReporteTendenciaResponse.java`
- `sistemaincidencias/src/main/java/com/integrador/sistemaincidencias/reportes/dto/ReporteResumenAgenteResponse.java`
- `sistemaincidencias/src/main/java/com/integrador/sistemaincidencias/reportes/dto/ReporteGranularidad.java`
- `sistemaincidencias/src/main/java/com/integrador/sistemaincidencias/reportes/dto/ReporteFormato.java`
- `sistemaincidencias/src/main/java/com/integrador/sistemaincidencias/reportes/exporter/ReporteChartRenderer.java`
- `sistemaincidencias/src/main/java/com/integrador/sistemaincidencias/reportes/exporter/ReporteExcelExporter.java`
- `sistemaincidencias/src/main/java/com/integrador/sistemaincidencias/reportes/exporter/ReportePdfExporter.java`
- `sistemaincidencias/src/main/java/com/integrador/sistemaincidencias/reportes/package-info.java`
- `frontend/src/services/reportes-service.ts`
- `frontend/src/types/reportes.ts`
- `frontend/src/pages/reportes/index.tsx`
- `frontend/src/pages/reportes/data.ts`
- `frontend/src/pages/reportes/components/reporte-filtros-form.tsx`
- `frontend/src/pages/reportes/components/reporte-charts.tsx`
- `frontend/src/pages/reportes/components/reporte-preview-table.tsx`
- `frontend/src/pages/reportes/components/reporte-export-buttons.tsx`
- `frontend/src/pages/reportes/components/reporte-error-alert.tsx`

### Modified (3 frontend + 1 postman + 1 pom)
- `frontend/src/router.tsx` (`reportesRoute` + tree registration)
- `frontend/src/layout/app-sidebar.tsx` (`to: "/reportes"`)
- `frontend/src/lib/http.ts` (additive `responseType?: "json" | "blob"` on `RequestOptions`)
- `sistemaincidencias/postman/SistemaIncidencias.postman_collection.json` (new `"Reportes"` folder)
- `sistemaincidencias/pom.xml` (added `org.apache.pdfbox:pdfbox:3.0.3`)

### New openspec assets
- `openspec/specs/reportes/spec.md` (NEW capability baseline)
- `openspec/changes/archive/reportes-export/{proposal,design,tasks,verify-report}.md` + `specs/reportes/spec.md` (delta, archived)
- `openspec/changes/archive/reportes-export/archive-report.md` (this file)

### Not modified (deliberate)
- `sistemaincidencias/src/main/java/com/integrador/sistemaincidencias/shared/config/SecurityConfig.java` — existing `/api/**` auth filter covers the new endpoints.
- `sistemaincidencias/src/main/java/com/integrador/sistemaincidencias/usuarios/service/PermisoAdministracionService.java` — `validarAutenticado` helper added by change A (`incidencias-rbac-agente`) is reused.
- `incidencias/` DAO/SQL/mapper, `dashboard/` DAO/SQL/mapper, all existing endpoints.

---

## 8. Traceability

- **Proposal**: `openspec/changes/archive/reportes-export/proposal.md`
- **Spec**: `openspec/changes/archive/reportes-export/specs/reportes/spec.md` (delta, 29 scenarios) → `openspec/specs/reportes/spec.md` (baseline)
- **Design**: `openspec/changes/archive/reportes-export/design.md`
- **Tasks**: `openspec/changes/archive/reportes-export/tasks.md`
- **Verify**: `openspec/changes/archive/reportes-export/verify-report.md`
- **Verify verdict**: engram topic `sdd/reportes-export/verify-report` (observation #817).
- **Apply progress**: engram topics per PR work unit (referenced from each PR commit message footer).

---

## 9. Risks / follow-ups

1. **Manual Postman smoke pending** — the sdd-verify agent performed code-level audit only. Real end-to-end smoke (ADMIN/AGENTE/USUARIO tokens hitting `/api/reportes` and `/api/reportes/exportar` with a populated PostgreSQL instance, plus browser walk on `/reportes`) was not run. Recommended as Playwright CLI smoke against the dev server.
2. **Latency benchmark (RNF-01)** — design §7 estimates JSON P95 < 2s and export P95 < 5s with existing indexes on `creado_en`, `asignado_a`, `creado_por_usuario_id`. Actual timing not measured by sdd-verify. If p95 exceeds NFR, consider Caffeine 60s cache or splitting Q9 (resumen por agente) from the others.
3. **`asignadoA` human-readable name** in `ReporteResumenAgenteResponse` is already the agent name (joined in Q9 SQL), unlike `dashboard/IncidenciaResumenResponse` which carries the raw UUID. Confirmed via inspect of `ReporteSql.RESUMEN_POR_AGENTE`.
4. **Filename uses generation timestamp** (drift #1) — if product wants the original `{desde}-{hasta}` pattern, change `ReporteController.exportar` line that builds `nombre` to use the normalized range.
5. **Drill-down chart → filtered list** — out of scope for this change. Future work can wire `reporte-charts.tsx` clicks into `/incidencias` with the relevant `agenteId`/`desde`/`hasta` filters.
6. **Cache (Caffeine/Redis)** — first version of `/api/reportes` does not cache. If RNF-01 fails in production, add a short-TTL keyed cache.
7. **PDF chart embedding in third-party viewers** — confirmed to open in Adobe/Chrome with the embedded Java2D PNG. Edge viewers may render the image correctly but not the surrounding grid; manual validation in target viewers recommended.
8. **Pre-existing master static errors** in `frontend/src/pages/incidencias/index.tsx` (lint) and `frontend/src/pages/incidencias/components/incidencias-table.tsx:309` (tsc) remain. Originated in `f26424a` (PR #9, before this change). Out of scope here; tracked as project-wide follow-up.

---

## 10. Next recommended

Per `audit/requirements-coverage` engram topic and the proposal matrix:

1. **`notificaciones-realtime`** (change D) — backend `Notificacion` table + `/api/notificaciones` CRUD + frontend notification center + (optional) SSE/websocket push. RF-37..40 still open.
2. **`perfil-self`** (change E) — backend `GET /api/auth/me` already exists; needs `PUT /api/usuarios/{id}/password` for self-change + frontend `/perfil` page + `DELETE /api/usuarios/{id}` for self-delete.
3. **`configuracion-ui`** (change F) — config page for catalog CRUD (categorías/estados/aplicativos) with admin gate, plus the demo-login fix and DELETE for catalog entries.
4. **Incidencias `asignadoA` in detail page** — confirm `frontend/src/pages/incidencias/detalle/index.tsx:117, 158` already migrated to `/api/usuarios/agentes-asignables` (was a follow-up in dashboard-real archive).
5. **Pre-existing lint/tsc errors** in `incidencias/index.tsx` and `incidencias-table.tsx:309` — separate cleanup change.

---

## 11. SDD cycle complete

Change C `reportes-export` shipped through the full SDD lifecycle:

- ✅ `sdd-propose` → `proposal.md` (420 lines, 11 sections, 5 open questions resolved).
- ✅ `sdd-spec` → `specs/reportes/spec.md` (193 lines, 29 Given/When/Then scenarios across 9 requirements).
- ✅ `sdd-design` → `design.md` (607 lines, 11 SQL queries fully written, 8 architectural decisions, mermaid data flow).
- ✅ `sdd-tasks` → `tasks.md` (13 dependency-ordered tasks across 3 PRs).
- ✅ `sdd-apply PR1` → backend module + endpoints + Postman (PR #14, ~400 LOC, BUILD SUCCESS).
- ✅ `sdd-apply PR2` → PDFBox + POI exporters + chart renderer (PR #15, ~200 LOC).
- ✅ `sdd-apply PR3` → frontend `/reportes` page + sidebar + http blob support (PR #16, ~250 LOC, lint+build net-new clean).
- ✅ `sdd-verify` → `verify-report.md` (PASS, 29/29 scenarios).
- ✅ `sdd-archive` → this report + `openspec/specs/reportes/spec.md` baseline synced.

Verdict: **PASS**. Archived.
