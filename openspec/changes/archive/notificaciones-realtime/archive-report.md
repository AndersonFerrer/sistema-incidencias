# Archive Report — `notificaciones-realtime` (verdict PASS)

**Change**: `notificaciones-realtime`
**Capability**: `notificaciones` (NEW capability baseline)
**Project**: sistema-incidencias
**Archive date**: 2026-07-15
**Verdict**: PASS (sdd-verify re-verification after fix PR #19: see `verify-report.md`)
**Source**: `openspec/changes/archive/notificaciones-realtime/verify-report.md` + engram topic `sdd/notificaciones-realtime/verify-report`

---

## 1. Verdict

**PASS — re-verified.** First verification returned FAIL with 4 contract blockers; fix PR #19 resolved all of them. Second verification: 33/37 scenarios source-aligned PASS, 4 documented warnings (none blocking). Zero new regressions. Pre-existing 3 lint + 4 build errors in master (introduced by PR #9 `f26424a`, before this change) are documented and remain out of scope.

---

## 2. Changes shipped

The `notificaciones-realtime` change shipped across **3 commits** to `master`:

- **PR #17** (`aa5b2b4`) — Backend module + 5 endpoints + 6 IncidenciaService hooks:
  - New `notificaciones/` module: `Notificacion` POJO, `NotificacionTipo` enum (5 values), `NotificacionResponse` + `NotificacionCountResponse` DTOs, `NotificacionMapper`, `NotificacionSql` (6 fragments), `NotificacionDao` (6 methods, all per-user WHERE), `NotificacionService` (CRUD + `crear(...)` helper + `crearParaUsuario(...)` with auto-event guard), `NotificacionController` (5 endpoints).
  - `IncidenciaService` modified to inject `NotificacionService` and call hooks at `crear`, `actualizar`, `aprobar`, `rechazar`, `cambiarEstado`, `agregarComentario`.
  - Postman: new "Notificaciones" folder with 5 requests + 13 sample responses.
- **PR #18** (`8371f82`) — Frontend:
  - New `frontend/src/services/notificaciones-service.ts` (5 methods + colocated types).
  - New `frontend/src/hooks/use-notifications-polling.ts` (30s polling, pauses on `document.hidden`, refresh on visibility regain).
  - New `frontend/src/components/notifications/notification-dropdown.tsx` (last-10 dropdown, lazy fetch, click-to-mark-read, "Ver todas" link).
  - New `frontend/src/pages/notificaciones/index.tsx` + `notificaciones-table.tsx` + `notificaciones-pagination.tsx` (paginated list, "Solo no leídas" filter, "Marcar todas" button).
  - `frontend/src/layout/app-header.tsx`: hardcoded "4" badge replaced with real count from polling hook; `NotificationDropdown` mounted on bell click; `/notificaciones` route title added.
  - `frontend/src/router.tsx`: `/notificaciones` private route registered in `AppLayout`.
- **PR #19** (`2568f15`) — Fix verification gaps:
  1. New DTO `NotificacionBulkResponse` returns `{actualizadas}` (not `{total}`) per spec.
  2. `agregarComentario` hook now also notifies `creadoPorUsuarioId` (in addition to `asignadoA`), respecting self-event suppression.
  3. `@Transactional` boundaries on `IncidenciaService` mutation methods that call `NotificacionService.crearParaUsuario` + on `NotificacionService.crear` itself. One transaction spans incidence + history + notification writes.
  4. Pagination `size` capped at 50 (was default 100) on `GET /api/notificaciones`.

Master HEAD at archive: `2568f15`. Diffstat vs base `5cb23ec`: 28 files / +3280 / −42 = ~3322 changed lines. All PRs labeled `enhancement` + `size:exception` (per project convention for >400-LOC changes).

---

## 3. Requirements closed

From `docs/requerimientos.md` and the spec matrix:
- **RF-37** Tiempo real: polling 30s implemented (no SSE for v1; follow-up noted).
- **RF-38** Centro de notificaciones: `/notificaciones` page with paginated history.
- **RF-39** Marcar como leída: individual (`PATCH /api/notificaciones/{id}/leida`) + bulk (`POST /api/notificaciones/marcar-todas-leidas`).
- **RF-40** Badge: count in topbar via `GET /api/notificaciones/no-leidas/count`, polled every 30s, hidden when count = 0.

---

## 4. Master commits

| SHA | Subject |
| --- | --- |
| `aa5b2b4` | feat(notificaciones) PR1: backend module + 5 endpoints + IncidenciaService hooks (#17) |
| `8371f82` | feat(notificaciones) PR2: frontend topbar bell + dropdown + /notificaciones page + polling (#18) |
| `2568f15` | fix(notificaciones): verify-gaps 1-4 (bulk field, comment target, transactional, page cap) (#19) |

---

## 5. Drift applied

None blocking. Four warnings documented in `verify-report.md` §6:
1. **Malformed UUID path variables still map to 500** — pre-existing cross-cutting bug, explicitly non-required for `notificaciones-realtime`. Affects `/api/incidencias/{id}` and other controllers with `@PathVariable UUID`. Tracked as follow-up.
2. **State-change scenario self-contradiction** — scenario 21 expects two rows when actor == assignee, contradicting the spec's mandatory self-event suppression. Implementation correctly suppresses; spec scenario needs future revision.
3. **Postman `Marcar todas como leidas` description drift** — minor doc field misalignment. Non-blocking.
4. **No scenario-level runtime evidence** — structural (project lacks test infrastructure beyond `contextLoads`). Documented as recommendation.

The 5th was initially a blocker (no runtime tests); the 4 actually-blocked contract issues were all resolved by PR #19.

---

## 6. Capability spec evolution

`openspec/specs/notificaciones/spec.md` is now the canonical baseline (NEW capability). It contains:
- All 37 Given/When/Then scenarios from `openspec/changes/archive/notificaciones-realtime/specs/notificaciones/spec.md`.
- An "Archive history" blockquote noting `notificaciones-realtime` as the seed.
- Header rewritten from "delta spec" to "synced baseline".

---

## 7. Files

### Added (8 backend + 9 frontend)
- `sistemaincidencias/.../notificaciones/{model,dao,sql,service,controller,dto,mapper}/*.java` (8 files)
- `frontend/src/services/notificaciones-service.ts`
- `frontend/src/hooks/use-notifications-polling.ts`
- `frontend/src/components/notifications/notification-dropdown.tsx`
- `frontend/src/pages/notificaciones/index.tsx`
- `frontend/src/pages/notificaciones/components/notificaciones-table.tsx`
- `frontend/src/pages/notificaciones/components/notificaciones-pagination.tsx`

### Modified (2 backend + 2 frontend)
- `sistemaincidencias/.../incidencias/service/IncidenciaService.java` (+73 / −11): injection + 6 hooks.
- `sistemaincidencias/postman/SistemaIncidencias.postman_collection.json`: Notificaciones folder.
- `frontend/src/layout/app-header.tsx` (+39 / −10): bell + dropdown.
- `frontend/src/router.tsx` (+12): /notificaciones route.

### Not modified (deliberate)
- `sistemaincidencias/src/main/resources/db/scripts/`: existing `notificaciones` table from script 004 used as-is (NO migration).
- `sistemaincidencias/.../shared/config/SecurityConfig.java`: existing `/api/**` auth filter covers new endpoints.
- `frontend/src/lib/http.ts`: existing `apiRequest` works for JSON; dropdown uses raw `fetch` for last-10 lazy load.

---

## 8. Traceability

- **Proposal**: `openspec/changes/archive/notificaciones-realtime/proposal.md`
- **Spec**: `openspec/changes/archive/notificaciones-realtime/specs/notificaciones/spec.md` (delta) → `openspec/specs/notificaciones/spec.md` (baseline)
- **Design**: `openspec/changes/archive/notificaciones-realtime/design.md`
- **Tasks**: `openspec/changes/archive/notificaciones-realtime/tasks.md`
- **Verify**: `openspec/changes/archive/notificaciones-realtime/verify-report.md`
- **Apply progress**: engram observation #822 (`sdd/notificaciones-realtime/apply-progress`).
- **Verify verdict**: engram topic `sdd/notificaciones-realtime/verify-report`.
- **Fix evidence**: engram topic `sdd/notificaciones-realtime/verify-fix`.

---

## 9. Risks / follow-ups

1. **SSE for true real-time** — current polling 30s is acceptable per design but adds latency. If sub-5s notifications are needed, introduce SSE on a dedicated endpoint.
2. **Malformed UUID 500** — pre-existing cross-cutting bug. Add `MethodArgumentTypeMismatchException` handler to `GlobalExceptionHandler` returning 400.
3. **Spec scenario self-contradiction** — scenario 21 needs revision to align with the rest of the spec.
4. **Notification retention** — currently no auto-delete. Add a cleanup job if table grows unbounded.
5. **Grouping/digesting** — out of scope; if user load gets noisy, consider daily digest.
6. **Push to mobile/email** — out of scope.
7. **Scenario-level tests** — recommend adding focused service/DAO tests (ownership, idempotence, recipient calculation, transaction rollback) when test infra becomes available.

---

## 10. Next recommended

Per `audit/requirements-coverage` engram topic:

1. **`perfil-self`** (change E) — backend `PUT /api/usuarios/{id}/password` for self-change + `DELETE /api/usuarios/{id}` + frontend `/perfil` page.
2. **`configuracion-ui`** (change F) — config page for catalog CRUD + DELETE for catalog entries + demo login fix.
3. **Migration of `frontend/src/pages/incidencias/detalle/index.tsx`** to consume `/api/usuarios/agentes-asignables` (callers in `detalle/index.tsx:117, 158` still hit the admin-only `/api/usuarios`).
4. **Cross-cutting `MethodArgumentTypeMismatchException` handler** to convert malformed UUIDs to 400.

---

## 11. SDD cycle complete

Change D `notificaciones-realtime` shipped through the full SDD lifecycle:
- ✅ `sdd-propose` → `proposal.md` (389 lines, 11 sections, 5 open questions resolved).
- ✅ `sdd-spec` → `specs/notificaciones/spec.md` (37 Given/When/Then scenarios).
- ✅ `sdd-design` → `design.md` (500 lines, 6 SQL queries, 7 architectural decisions, mermaid data flow).
- ✅ `sdd-tasks` → `tasks.md` (10 dependency-ordered tasks across 2 PRs).
- ✅ `sdd-apply PR1` → backend (PR #17, +1237 LOC, mvn compile exit 0).
- ✅ `sdd-apply PR2` → frontend (PR #18, +1058 / −10 LOC, lint+build net-new clean).
- ✅ `sdd-verify` → `verify-report.md` (FAIL → 4 blockers).
- ✅ `sdd-apply` fix → (PR #19, +126 / −16 LOC, mvn compile exit 0).
- ✅ `sdd-verify` retry → PASS (33/37 scenarios source-aligned, 0 new regressions).
- ✅ `sdd-archive` → this report + `openspec/specs/notificaciones/spec.md` baseline synced.

Verdict: **PASS**. Archived.