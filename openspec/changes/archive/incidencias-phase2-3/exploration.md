# Exploration: incidencias-phase2-3

## Why this exploration exists

This change covers **Phase 1 (4 critical bugs) + Phase 2 (3 services + 3 dialogs + refactor) + Phase 3 (race conditions + UX polish)** for the Incidencias module. The exploration below captures the comprehensive gap analysis done before proposing the work. Full report lives here; previews are mirrored to engram topic `sdd/incidencias-phase2-3/explore`.

## Module scope

- **Backend**: `sistemaincidencias/src/main/java/com/integrador/sistemaincidencias/incidencias/`
  - `controller/IncidenciaController.java` (12 endpoints, all under `authenticated()` — no role check)
  - `service/IncidenciaService.java`
  - Postman contract: `sistemaincidencias/postman/SistemaIncidencias.postman_collection.json`
- **Frontend**: `frontend/src/pages/incidencias/` + `frontend/src/services/incidents-service.ts` + `frontend/src/types/incidencias.ts`
  - `index.tsx` (237 LOC, list page + filters + table + new-incidence view)
  - `detalle/index.tsx` (534 LOC, detail page — extensive single-file composition)
  - `components/{incidencias-table, incidencias-filters, nueva-incidencia-view, ...}.tsx`
  - `detalle/components/{incidencia-sidebar, incidencia-actividad-card, ...}.tsx`
- **Reference pattern**: `frontend/src/pages/usuarios/` (recently shipped, ~960 LOC, chained 3 PRs, passed verify with 18/18 requirements)

## Inventory of gaps found

### A. Critical bugs (Phase 1, blockers for production)

| ID | Location | Symptom | Root cause |
| --- | --- | --- | --- |
| **B1** | `nueva-incidencia-view.tsx:100-106` | Adjuntos subidos se pierden | `handleArchivos` does NOT call `setArchivos(prev => [...prev, ...Array.from(event.target.files ?? [])])`; the input change handler only reads files without persisting them in state |
| **B2** | `incidents-service.ts:72-76` | Debug `console.log` left in code | `console.log("[DEBUG service] crear() input.archivos:", ...)` — left from development |
| **B3** | `types/incidencias.ts:16` | `motivoRechazo` shows `undefined` in UI | Field is declared on `Incidencia` but the backend `IncidenciaResponse` does not include it. The actual rejection reason lives in `incidencia.historial` entries with `accion === "RECHAZADA"`, field `nota` |
| **B4** | `detalle/index.tsx:523-534` | Cannot move to `FINALIZADA` | `siguienteEstadoProceso` filters out terminal states. The backend permits advancing to FINALIZADA when allowed by the order diff, but the frontend list never shows it |

### B. Missing UI flows (Phase 2)

| ID | Gap | Backend support |
| --- | --- | --- |
| **B5** | No "Editar" button on detail page | `PUT /api/incidencias/{id}` exists |
| **B6** | No "Eliminar" button on detail page | `DELETE /api/incidencias/{id}` exists |
| **D7** | Cannot upload adjuntos to an existing incidencia | `POST /api/incidencias/{id}/adjuntos` exists (multipart) |
| **D9** | Approval select shows even for already-approved/terminal | UI only — needs `disabled` per state |

### C. Backend security / correctness gaps (deferred — out of scope)

| ID | Issue | Why deferred |
| --- | --- | --- |
| **B8** | `IncidenciaController` does not inject `PermisoAdministracionService`; any authenticated user can hit every endpoint | Requires backend change; separate future change |
| **B9** | PUT does not validate `estadoProceso` against terminal/rechazada | Requires backend change; separate future change |
| **Future** | No real notificaciones (backend inserts only, no email) | Separate change |
| **Future** | No `DELETE /api/incidencias/{id}/adjuntos/{adjuntoId}` endpoint | No frontend UI either |

### D. UX gaps compared to the recently-shipped `/usuarios` page (Phase 3)

| Area | Current state | Reference (`/usuarios`) |
| --- | --- | --- |
| Race conditions on fetch | No `AbortController`; rapid filter changes overlap and last-writer-wins | `usuarios/index.tsx:101-121, 129-171` uses AbortController per effect |
| Filter debounce | `texto` triggers refetch on every keystroke | `usuarios-filters.tsx` debounces 300ms |
| Success feedback | Errors shown as inline destructive Alert; success is silent | `usuarios/index.tsx:49-86` shows default Alert with 3s auto-dismiss via `toastTimerRef` |
| Role-based UI | Buttons visible to all roles | Wired `useAuthStore.user.rol` to conditionally render Editar/Eliminar/Aprobar |
| Asignado column | Shows raw UUID | `usuarios-table.tsx` resolves UUID to user name via the users catalog |
| Sidebar monotematic | Single `Calendar` icon repeated | `incidencia-sidebar.tsx` should use specific icons (User, Briefcase, Tag, Building2) |
| estadoProceso badge | Missing from sidebar | Add badge component |
| Historial view | Plain list | Should be a timeline with action icons (Plus, Pencil, ArrowRight, Check, X, MessageSquare, Paperclip) and resolved state transitions |
| Table sort | Sort buttons present but do nothing | Implement real sort for `titulo`, `creadoEn`, `prioridad` |
| Component extraction | `incidencias/index.tsx` 237 LOC, `detalle/index.tsx` 534 LOC | Extract `IncidenciasHeader`, `IncidenciasPagination`, `EditarIncidenciaDialog`, `ConfirmarEliminarIncidenciaDialog`, `SubirAdjuntosDialog` |

## Suggested 4-phase plan

- **Phase 1 — bug fixes** (4 small surgical edits, ~5 LOC net, ships fast)
- **Phase 2 — services + dialogs + refactor** (3 services + 3 dialogs + extract components)
- **Phase 3 — polish + race conditions** (AbortController, debounce, toast, role-based UI, table polish, timeline, sort)
- **Phase 4 — backend enhancements** (separate future change; covers B8, B9, notificaciones, motivoRechazo in `IncidenciaResponse`, DELETE adjunto)

## Key files referenced in the proposed change

- `frontend/src/services/incidents-service.ts` (122 LOC → ~180 LOC after 3 new methods)
- `frontend/src/pages/incidencias/index.tsx` (237 LOC, refactor + bug B4 if exposed there)
- `frontend/src/pages/incidencias/detalle/index.tsx` (534 LOC, extensive)
- `frontend/src/pages/incidencias/components/nueva-incidencia-view.tsx` (bug B1)
- `frontend/src/pages/incidencias/components/incidencias-filters.tsx` (debounce + role)
- `frontend/src/pages/incidencias/components/incidencias-table.tsx` (sort + UUID resolution)
- `frontend/src/pages/incidencias/detalle/components/incidencia-actividad-card.tsx` (timeline)
- `frontend/src/pages/incidencias/detalle/components/incidencia-sidebar.tsx` (icons + estadoProceso badge)
- `frontend/src/types/incidencias.ts` (bug B3 type fix + extend if needed for new dialogs)
- 3 new files under `frontend/src/pages/incidencias/components/`
