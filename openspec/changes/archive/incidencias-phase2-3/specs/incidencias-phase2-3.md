# Change-level overview: `incidencias-phase2-3`

**Status**: proposed → spec drafted (pending design phase)
**Capability affected**: `incidencias` (new capability spec — first formal spec for this capability)
**Project**: sistema-incidencias
**Mode**: hybrid SDD (engram + openspec)
**Phase**: spec
**Scope**: Frontend only. No backend changes. No Postman collection changes.

## 1. What this change does

Fixes four production-blocking bugs in the Incidencias module and brings the rest of the UX to parity with the recently-shipped `/usuarios` page. Adds three missing UI flows (editar, subir adjuntos a existente, eliminar) wired to already-implemented backend endpoints, and refactors two fat pages into reusable components.

## 2. Why

- `IncidenciasDetallePage` is the destination of every record in the system, yet ships with **4 silent-failure bugs** (B1–B4), **3 unwired backend endpoints** (PUT, POST `/adjuntos`, DELETE), and **UX gaps** that `/usuarios` already solved (AbortController, debounce, toasts, role-based UI, UUID → name, timeline, sort).
- The backend contract is stable and complete (Postman collection is in sync). This is a frontend-integration change only.

## 3. Backend endpoints consumed (12 total)

All under `IncidenciaController` (`@RequestMapping("/api/incidencias")`):

| # | Endpoint | New wiring? | Service method |
|---|----------|-------------|----------------|
| 1 | `GET /api/incidencias{?query}` | unchanged | `incidentsService.listar(filtros, signal?)` |
| 2 | `GET /api/incidencias/{id}` | unchanged | `incidentsService.obtenerDetalle(id, signal?)` |
| 3 | `POST /api/incidencias` JSON | unchanged | `incidentsService.crear(input)` |
| 4 | `POST /api/incidencias` multipart | unchanged | `incidentsService.crear(input)` (branch on `archivos.length`) |
| 5 | `PUT /api/incidencias/{id}` JSON | **wired (new)** | `incidentsService.actualizar(id, input, signal?)` |
| 6 | `PUT /api/incidencias/{id}` multipart | **wired (new)** | same (branch on `archivos.length`) |
| 7 | `PATCH /api/incidencias/{id}/estado` | unchanged | `incidentsService.cambiarEstado(id, input)` |
| 8 | `PATCH /api/incidencias/{id}/aprobacion?accion=aprobar\|rechazar` | unchanged | `incidentsService.aprobarRechazar(id, accion, input)` |
| 9 | `POST /api/incidencias/{id}/comentarios` | unchanged | `incidentsService.agregarComentario(id, input)` |
| 10 | `POST /api/incidencias/{id}/adjuntos` multipart | **wired (new)** | `incidentsService.subirAdjuntos(id, files, signal?)` |
| 11 | `DELETE /api/incidencias/{id}` | **wired (new)** | `incidentsService.eliminar(id, signal?)` |

(12th endpoint — `POST /api/incidencias/{id}/adjuntos` JSON for `CrearAdjuntoRequest` — is exposed by the controller but not surfaced in the UI per scope decision.)

No backend changes. No Postman changes.

## 4. Files to be added or modified

### Modified
- `frontend/src/services/incidents-service.ts` — 6 → 9 methods, add `signal?` to `listar`/`obtenerDetalle`/`actualizar`/`subirAdjuntos`/`eliminar`, drop `console.log` (B2).
- `frontend/src/pages/incidencias/index.tsx` — refactor: `IncidenciasHeader`, `IncidenciasPagination`, `IncidenciasEmptyState` extracted, AbortController added, Trash icon for ADMINISTRADOR role, UUID → user name in table.
- `frontend/src/pages/incidencias/detalle/index.tsx` — refactor: dialogs and DialogMode union extracted, AbortController added, role gating, "Mover a FINALIZADA" exposed, motivoRechazo reads from historial (B3, B4), toast wiring.
- `frontend/src/pages/incidencias/components/nueva-incidencia-view.tsx` — fix `handleArchivos` setArchivos wiring (B1), reset `event.target.value = ""`.
- `frontend/src/pages/incidencias/components/incidencias-filters.tsx` — debounce `texto` 300ms.
- `frontend/src/pages/incidencias/components/incidencias-table.tsx` — client-side sort, UUID → user name resolution.
- `frontend/src/pages/incidencias/detalle/components/incidencia-actividad-card.tsx` — vertical timeline with action icons.
- `frontend/src/pages/incidencias/detalle/components/incidencia-sidebar.tsx` — specific icons per row, `estadoProcesoBadge` slot.
- `frontend/src/types/incidencias.ts` — remove `motivoRechazo?` (B3); add `ActualizarIncidenciaInput`, `SubirAdjuntosInput`.

### Added (under `frontend/src/pages/incidencias/components/`)
- `editar-incidencia-dialog.tsx`
- `subir-adjuntos-dialog.tsx`
- `confirmar-eliminar-incidencia-dialog.tsx`
- `incidencias-header.tsx`
- `incidencias-pagination.tsx`
- `incidencias-empty-state.tsx`
- `estado-proceso-badge.tsx`

### NOT modified
- `sistemaincidencias/**` (backend Java sources untouched).
- `sistemaincidencias/postman/SistemaIncidencias.postman_collection.json`.
- `frontend/src/components/ui/*` (no new shadcn primitives).
- `frontend/src/lib/http.ts` (already supports `signal`; verified at `apiRequest` lines 18-30).
- `frontend/src/store/auth-store.ts` (already exposes `user.rol`).
- `frontend/package.json`.

## 5. Spec inventory

- **Capability delta file**: `openspec/changes/incidencias-phase2-3/specs/incidencias/spec.md`
- **Change-level overview** (this file): `openspec/changes/incidencias-phase2-3/specs/incidencias-phase2-3.md`
- **Functional requirements**: 15 (REQ-1 → REQ-15)
- **Non-functional requirements**: 8 (REQ-NFR-1 → REQ-NFR-8)
- **Total requirements**: 23
- **Total scenarios**: ~45 (38 functional + 7 NFR)
- **Out-of-scope items declared**: 8

## 6. Resolved assumptions (from proposal §4)

1. Edit dialog stays open and lets users add new adjuntos via multipart PUT (backend `actualizarConArchivos` already exists).
2. Subir adjuntos uses drag&drop + click-to-browse + per-file progress; one combined `multipart/form-data` request.
3. Eliminar confirmation copy: "¿Eliminar la incidencia {codigo}? Esta acción no se puede deshacer." with cascade explanation.
4. Role source: `useAuthStore.user.rol` (single source of truth).
5. Toast on success path for: crear, actualizar, agregarComentario, cambiarEstado, aprobar, rechazar, eliminar. Errors stay inline.
6. Sort is client-side (re-sort the fetched page).
7. `estadoProcesoBadge` is page-local: `pages/incidencias/components/estado-proceso-badge.tsx`.
8. Toast at top of main content; `actionError` stays inline within its card.

## 7. Open risks to track

| ID | Risk | Mitigation |
|----|------|-----------|
| R1 | LOC forecast ~1500-2000 vs 400-line review budget | `ask-on-risk` delivery strategy → orchestrator pauses at tasks phase to surface chained PRs vs `size:exception` |
| R2 | `siguienteEstadoProceso` (B4) order-diff semantics | Spec pins the helper to `e.orden === actual.orden + 1`; verify against `IncidenciaService` ladder (PENDIENTE=1, EN_PROCESO=2, FINALIZADA=3) at design and verify phase |
| R3 | Role-name inconsistency: orchestrator draft uses `ADMIN`; backend seed uses `ADMINISTRADOR` | Spec uses canonical `ADMINISTRADOR`, `AGENTE`, `USUARIO` per `sistemaincidencias/AGENTS.md`. Design and verify phases must enforce these strings in `useAuthStore.user.rol` checks |
| R4 | Multipart PUT (`actualizarConArchivos`, `IncidenciaController.java:106-113`) is uncommon; ensure no `@RequestPart` confusion with the actual `@ModelAttribute ActualizarIncidenciaRequest` | Verify at design phase against the existing `@ModelAttribute` binding and the `archivos: List<MultipartFile>` field on `ActualizarIncidenciaRequest` (`ActualizarIncidenciaRequest.java:37-38`) |
| R5 | Refactor of `detalle/index.tsx` from 534 LOC risks breaking dialog wiring / state / refs | Verify with manual smoke; `DialogMode` discriminated union formalized in REQ-NFR-7 |
| R6 | `motivoRechazo` consumer fallout (type removal touches `detalle/index.tsx:409`) | Single consumer; spec scenario locks the in-place rewrite path (historial lookup) |
| R7 | `lucide-react@1.17.0` icon drift (new icons in sidebar / timeline) | REQ-NFR-2 pins the confirmed-available set; build will fail loudly if any icon is missing |
| R8 | Race conditions in fallback not covered by AbortController (e.g. when user clicks Editar twice quickly) | Out of scope for this change; flagged for follow-up |

## 8. Acceptance criteria (top-level)

- All 15 functional requirements + 8 non-functional requirements are met (~45 scenarios).
- `npm run lint` clean.
- `npm run build` clean.
- Manual smoke walkthrough against the running backend exercises: create with adjuntos (B1 fix), no `console.log` (B2), motivo from historial (B3), move to `FINALIZADA` (B4), edit, upload more adjuntos, delete.
- Role-based UI verified for each of `ADMINISTRADOR`, `AGENTE`, `USUARIO`.
- Toasts visible for all 7 success actions; inline alerts visible for all failure paths.

## 9. Next phase

`sdd-design` — produce the technical design covering per-component contracts (props / state / effects), service signatures with `signal`, dialog wiring via `DialogMode` discriminated union, error-routing strategy (inline vs toast), the work-unit commit plan (likely chained PRs given ~1500-2000 LOC forecast), and the icon-roster check. The design phase will surface the chained-PR vs `size:exception` decision to the user before any implementation work begins.

## 10. References

- Proposal: `openspec/changes/incidencias-phase2-3/proposal.md`
- Exploration: `openspec/changes/incidencias-phase2-3/exploration.md`
- Reference design (recently-shipped pattern): `openspec/changes/archive/users-admin-page/design.md`
- Reference spec: `openspec/changes/archive/users-admin-page/specs/usuarios/spec.md`
- Engram topics: `sdd/incidencias-phase2-3/proposal`, `sdd/incidencias-phase2-3/explore`, `sdd/incidencias-phase2-3/preflight`, `sdd/users-admin-page/design`
- Skill: `gestincidencias-frontend`
