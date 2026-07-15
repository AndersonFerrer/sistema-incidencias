# Capability Spec: `incidencias` — frontend UX polish + backend RBAC + scope por rol

**Capability**: `incidencias`
**Project**: sistema-incidencias
**Scope**: Frontend + Backend + Postman collection. Covers authenticated users on `/incidencias` and `/incidencias/:id`, the backend RBAC enforcement on `IncidenciaController` (listar scope + per-resource mutation scope), the 4 catalog controllers (`CategoriaController`, `AplicativoClienteController`, `EstadoProcesoController`, `EstadoAprobacionController`) relaxed to `validarAutenticado` for `listar`, the new `GET /api/usuarios/agentes-asignables` endpoint for non-admin dropdowns, the new `validarAutenticado` helper in `PermisoAdministracionService`, and the corresponding frontend cleanup that drops the prior `currentUserIsAdmin` catalog gate.

This capability spec is the synced baseline for the `incidencias` capability after **two** archived changes (`incidencias-phase2-3` + `incidencias-rbac-agente`); the archive history below records what each change contributed and which drifts were applied during archive.

> **Archive history** (baseline evolution; each archive added/extended requirements on top of the prior baseline):
>
> - **`incidencias-phase2-3`** (2026-07-14, archived): seeded the baseline. **Frontend-only** — 15 functional requirements (B1–B4 production bug fixes, 3 new dialogs, `AbortController` cancellation, 300ms debounce, success toasts, role-based UI gating, sidebar timeline, table sort) + 8 non-functional requirements. Drifts **S1–S3** applied (empty-state copy `"—"` → `"Sin asignar"`, `detalle/index.tsx` LOC band relaxed from ~200 to ~400–850, `Field` primitive scoped to the 3 new dialogs only). See `openspec/changes/archive/incidencias-phase2-3/archive-report.md`.
> - **`incidencias-rbac-agente`** (2026-07-14, archived): **backend RBAC** + public catalogs + AGENTE/USUARIO scope. Added **7 functional requirements** (R-Autenticado helper, R-Catalogos-Get relaxed, R-AgentesAsignables endpoint, R-Agente-Scope, R-Usuario-Scope, R-ValidarAlcance, R-Frontend-Gate + R-Postman sync) + **2 non-functional requirements** (filter validation unchanged, no latency regression). Drift **D1** applied (USUARIO scope override wording clarification — see below). See `openspec/changes/archive/incidencias-rbac-agente/archive-report.md`.

> **Drift notes applied during archive — `incidencias-phase2-3`** (vs the original delta spec, see `openspec/changes/archive/incidencias-phase2-3/archive-report.md`):
>
> - **S1 (REQ-12 / Scenario "Unassigned renders dash")**: empty-state copy for `asignadoA === null` (or unresolvable assignee) updated from the literal em-dash `"—"` to the neutral Spanish string `"Sin asignar"`. Matches the actual implementation at `frontend/src/pages/incidencias/components/incidencias-table.tsx:291`. Functionally equivalent; the new copy is friendlier and matches the rest of the page's Spanish copy per NFR-3.
> - **S2 (NFR-7 / Scenario "Page sizes come down")**: the target LOC for `pages/incidencias/detalle/index.tsx` is relaxed from `~200 LOC` to a relaxed band. The shipped file is **811 LOC** because wiring the 3 new dialogs (Editar, SubirAdjuntos, ConfirmarEliminar) + `DialogMode` discriminated union + toast pattern + `AbortController` on `cargarDetalle` + catalog loading + approval/revision/rejection cards cannot realistically fit inside a 200-LOC ceiling. **Design §10 explicitly accepted this deviation**: extracted dialogs carry ~1450 LOC elsewhere; `detalle/index.tsx` retains the wiring/coordination layer. Future refactors may revisit this; the relaxed NFR-7 here reflects actual behavior.
> - **S3 (NFR-1 / Scenario "Field primitives are used")**: the `Field` / `FieldLabel` / `FieldDescription` / `FieldError` / `FieldGroup` primitive requirement is explicitly **scoped to the 3 new dialogs** (`EditarIncidenciaDialog`, `SubirAdjuntosDialog`) **only**. The pre-existing `nueva-incidencia-view.tsx` continues to use raw `<label>` + `<select>` + `<textarea>` markup — that legacy create form was **out of scope** per design §3.2 ("modern Field applied only to the 3 new dialogs in this change"). A follow-up change should migrate `nueva-incidencia-view.tsx` to the same `Field` primitive for full parity.

> **Drift notes applied during archive — `incidencias-rbac-agente`** (vs the original delta spec, see `openspec/changes/archive/incidencias-rbac-agente/archive-report.md`):
>
> - **D1 (REQ "USUARIO solo lista incidencias creadas por él" / Scenario "USUARIO con query param propio no se overridea")**: wording updated to reflect the actual implementation. The original delta said "la regla de scope domina; el query param coincide y se acepta por consistencia, **no se cambia el resultado**". The shipped code (`IncidenciaController.java:82`) **does** force-overwrite `filtro.setCreadoPorUsuarioId(actual.getId())` for any USUARIO caller — same pattern as the AGENTE branch. The result is byte-for-byte identical when the USUARIO passes `?creadoPorUsuarioId=<self.id>` (since `actual.getId()` equals the query param value), but the literal "no overridea" wording could mislead a future reader. Scenario body reworded: "the controller force-overwrites with `actual.getId()`; when the USUARIO passes their own id the result is unchanged; when they pass a different id the override scopes them down to their own creations per the RBAC rule." Resolved per verify-report §Open questions #3 by intent.

> **Role-name canonicalization**: per `sistemaincidencias/AGENTS.md` and the seed script, role codes are `ADMINISTRADOR`, `AGENTE`, `USUARIO`. All requirements below use these canonical names (not `ADMIN` shorthand).

## Purpose

The system shall provide authenticated users with a UI to manage incidencias — list with filters, pagination, and client-side sorting; detail view with comments, attachments, and approval flow; create, edit, attach-more, change process state, approve, reject, and delete operations — through the existing backend REST API. The change brings the Incidencias module to UX parity with the recently-shipped `/usuarios` page while reusing already-installed shadcn primitives and the existing `src/lib/http.ts` plumbing. Race-free fetches via `AbortController` and 300ms debounced text search are mandatory. Role-based UI gating is sourced from `useAuthStore.user.rol`.

The capability covers authenticated users on the `/incidencias` route and `/incidencias/:id` detail route.

## Requirements

### Requirement: Adjuntos se persisten al crear una incidencia

The create form (`pages/incidencias/components/nueva-incidencia-view.tsx`) shall store the files the user selects in component state, and submit them to the backend on form submission. The backend exposes `POST /api/incidencias` for both `application/json` (no files) and `multipart/form-data` (with files); the frontend MUST branch on the presence of files in state.

#### Scenario: Selecting one or more files stores them
- WHEN the user picks one or more files in the "Adjuntos" input (`incidencia-archivos`)
- THEN THE SYSTEM shall update the component's `archivos` state via `setArchivos(prev => [...prev, ...Array.from(event.target.files ?? [])])` and reset `event.target.value = ""` so picking the same filename twice still works.

#### Scenario: Submitting with files sends multipart
- WHEN the user submits the form and `archivos.length > 0`
- THEN THE SYSTEM shall issue `POST /api/incidencias` with `multipart/form-data` (per `IncidenciaController.crearConArchivos` at `IncidenciaController.java:89-95`) including `archivos[]` plus the form fields (`titulo`, `descripcion`, `clienteId`, `categoriaId`, `prioridad`, optional `usuarioExternoId`, optional `asignadoA`).

#### Scenario: Submitting without files sends JSON
- WHEN the user submits the form and `archivos.length === 0`
- THEN THE SYSTEM shall issue `POST /api/incidencias` with `application/json` (per `IncidenciaController.crear` at `IncidenciaController.java:81-87`) carrying only the textual fields.

### Requirement: No debug `console.log` in production service bundle

The `frontend/src/services/incidents-service.ts` module shall not emit any `console.log` call in the production bundle. The leftover diagnostic `[DEBUG service] crear() input.archivos: …` at `incidents-service.ts:72-76` is the exact block to remove.

#### Scenario: Production build has no debug log
- WHEN `npm run build` is run for production
- THEN THE SYSTEM shall produce a bundle in which a grep for `[DEBUG service]` returns zero matches. The `crear()` method shall still append `archivos` to the `FormData` (per `incidents-service.ts:77-79`) — only the diagnostic print is removed, not the upload.

### Requirement: Motivo de rechazo se obtiene del historial, no del modelo

The frontend `Incidencia` type shall not declare `motivoRechazo`. The rejection reason lives exclusively in the corresponding `IncidenciaHistorial` entry whose `accion === "RECHAZADA"` (`frontend/src/types/incidencias.ts:75-84`). Consumers on the detail page shall compute it on demand and render a friendly fallback when absent.

#### Scenario: Type without motivoRechazo
- THE SYSTEM shall remove the `motivoRechazo?: string | null` property from `Incidencia` (`types/incidencias.ts:16`). TypeScript SHALL report no compilation errors at `npm run build` after all consumers are updated.

#### Scenario: Render motivo from historial
- WHEN the detail page renders and `incidencia.estadoAprobacionId` resolves to an approval state whose `clave === "RECHAZADA"`
- THEN THE SYSTEM shall compute the rejection note as `incidencia.historial.find(h => h.accion === "RECHAZADA")?.nota ?? null` and display "Motivo: {nota}" when `nota` is non-empty, otherwise display "Sin motivo registrado".

### Requirement: Transición a estado de proceso terminal permitida desde UI

The detail page (`detalle/index.tsx`) shall offer the immediately-following process state as a transition target, matching the backend's `ordenDiff <= 1` rule observed in `IncidenciaService`. The current implementation filters out terminal states and therefore hides the legitimate "Mover a FINALIZADA" path from `EN_PROCESO`.

#### Scenario: EN_PROCESO exposes FINALIZADA
- WHEN the user views the detail of an incidencia whose current process state has `orden === 2` (`EN_PROCESO`) AND the approval state is `APROBADA`
- THEN THE SYSTEM shall render the "Mover a FINALIZADA" button (label: `Mover a {siguienteEstado.etiqueta}`) with the resulting state having `orden === 3`.

#### Scenario: Candidate computation
- THE SYSTEM shall compute next-state candidates as `estadosProceso.filter(e => e.activo && e.orden === estadoProcesoActual.orden + 1)` (one step forward), NOT `estadosProceso.filter(e => !e.esTerminal)` (which incorrectly drops the legitimate terminal target).

### Requirement: Editar una incidencia existente

An admin or agent shall be able to edit titulo, descripcion, categoriaId, prioridad, asignadoA, and to append new adjuntos in the same call, via the `EditarIncidenciaDialog` wired from a page-local `DialogMode` discriminated union.

#### Scenario: Edit button visibility
- WHEN `currentUser.rol` is `ADMINISTRADOR` or `AGENTE`
- THEN THE SYSTEM shall render the "Editar" affordance on the detail page card header. WHEN `currentUser.rol === "USUARIO"`, the affordance SHALL NOT be rendered.

#### Scenario: Prefilled edit dialog opens
- WHEN the user clicks "Editar"
- THEN THE SYSTEM shall open `EditarIncidenciaDialog` prefilled with the current `incidencia` values (`titulo`, `descripcion`, `categoriaId`, `prioridad`, `asignadoA`), showing existing adjuntos as read-only chips with an "Añadir nuevos" affordance for additional files.

#### Scenario: Submit edits with JSON (no new files)
- WHEN the user submits the dialog without adding any new files
- THEN THE SYSTEM shall issue `PUT /api/incidencias/{id}` (`IncidenciaController.actualizar`, `IncidenciaController.java:97-104`) with `application/json` carrying the editable fields.

#### Scenario: Submit edits with multipart (new files added)
- WHEN the user submits the dialog with new files staged in component state
- THEN THE SYSTEM shall issue `PUT /api/incidencias/{id}` (`IncidenciaController.actualizarConArchivos`, `IncidenciaController.java:106-113`) with `multipart/form-data` and the `archivos[]` field.

#### Scenario: Edit success closes dialog and refetches
- WHEN the backend returns HTTP 200
- THEN THE SYSTEM shall close the dialog, refetch the detail, and show a top-of-content success Alert with the message "Incidencia actualizada correctamente." auto-dismissed after 3000ms.

#### Scenario: Edit validation error mapped to field
- WHEN the backend returns HTTP 400 with a `@Valid` field message (e.g. from `ActualizarIncidenciaRequest.java:23-33`: `titulo`, `descripcion`, `categoriaId`, `prioridad`)
- THEN THE SYSTEM shall keep the dialog open and render the message inline on the corresponding `FieldError`. No toast shall be displayed.

### Requirement: Subir adjuntos a una incidencia existente

A user shall be able to append files to an incidencia via the `SubirAdjuntosDialog`, which sends them as `multipart/form-data` to `POST /api/incidencias/{id}/adjuntos` (`IncidenciaController.subirAdjuntos`, `IncidenciaController.java:155-162`).

#### Scenario: Open the subir-adjuntos dialog
- WHEN the user clicks "Añadir adjuntos" on `IncidenciaAdjuntosCard`
- THEN THE SYSTEM shall open `SubirAdjuntosDialog` with a drag&drop zone and a "click to browse" fallback file picker.

#### Scenario: Staging list shows file metadata
- WHEN the user drops or selects one or more files
- THEN THE SYSTEM shall display a list whose each entry shows filename, size (human-readable, e.g. `412 KB`), MIME type, a remove button, and a per-file progress bar (0-100%).

#### Scenario: Submit appends to existing adjuntos
- WHEN the user confirms the dialog and `archivos.length > 0`
- THEN THE SYSTEM shall issue `POST /api/incidencias/{id}/adjuntos` with `multipart/form-data` carrying `archivos` (repeatable). On HTTP 201, THE SYSTEM shall close the dialog, refetch the detail, and show a top-of-content success Alert with the message "N adjunto(s) agregado(s)." auto-dismissed after 3000ms.

#### Scenario: Submit failure surfaces inline
- WHEN the backend returns a non-2xx status
- THEN THE SYSTEM shall keep the dialog open, halt the progress indicators, and render an inline destructive Alert inside the dialog body.

### Requirement: Eliminar una incidencia con confirmación

An admin shall be able to delete an incidencia via `ConfirmarEliminarIncidenciaDialog`, which then sends `DELETE /api/incidencias/{id}` (returns HTTP 204 per `IncidenciaController.eliminar`, `IncidenciaController.java:164-171`).

#### Scenario: Trash icon visibility
- WHEN `currentUser.rol === "ADMINISTRADOR"` AND the user views the list table `incidencias-table.tsx`
- THEN THE SYSTEM shall render a Trash icon button on each non-self row. WHEN `currentUser.rol` is `AGENTE` or `USUARIO`, the icon SHALL NOT be rendered.

#### Scenario: Open confirmation dialog
- WHEN the admin clicks the Trash icon
- THEN THE SYSTEM shall open `ConfirmarEliminarIncidenciaDialog` whose body shows the `incidencia.codigo` and `incidencia.titulo`, plus a secondary paragraph explaining the cascade (comentarios, adjuntos, historial se eliminan) and a destructive red Cancel/Confirm pair.

#### Scenario: Confirm deletes and refreshes
- WHEN the admin confirms the dialog
- THEN THE SYSTEM shall issue `DELETE /api/incidencias/{id}`. On HTTP 204, THE SYSTEM shall optimistically remove the row from the list state, close the dialog, and show the success Alert "Incidencia eliminada correctamente." auto-dismissed after 3000ms.

#### Scenario: Delete failure reverts optimistic removal
- WHEN the backend returns a non-2xx status
- THEN THE SYSTEM shall revert the optimistic removal (reinsert the row in its original position), close the dialog, and render an inline destructive Alert at the top of the main content.

### Requirement: Fetches sin condiciones de carrera vía AbortController

The list page (`pages/incidencias/index.tsx`) and detail page (`pages/incidencias/detalle/index.tsx`) shall each own an `AbortController` per fetch, aborting the previous request before issuing a new one. The pattern is established in `pages/usuarios/index.tsx:101-121, 129-171`. `src/lib/http.ts` (`apiRequest`) already forwards `signal` to `fetch` per `RequestOptions`, so no library changes are required.

#### Scenario: List cancellation on filter change
- WHEN the user changes a filter or types in the debounced text input
- THEN THE SYSTEM shall call `controller.abort()` on any in-flight list request before issuing the next one.

#### Scenario: Detail cancellation on id change
- WHEN the `:id` route param changes (navigating from one detail to another)
- THEN THE SYSTEM shall abort the previous `incidentsService.obtenerDetalle(id, signal)` request before issuing the next one.

#### Scenario: Service signatures accept AbortSignal
- THE SYSTEM shall declare `signal?: AbortSignal` as the trailing optional parameter on `incidentsService.listar(...)` and `incidentsService.obtenerDetalle(...)`, matching the convention in `usuarios-service.ts:22, 37`.

### Requirement: Debounce del campo `texto` en filtros (300ms)

The text filter in `pages/incidencias/components/incidencias-filters.tsx` shall debounce keystrokes by 300ms before triggering a list fetch, matching `usuarios/index.tsx:88-97`.

#### Scenario: Typing in `texto` is debounced
- WHEN the user types characters into the `texto` field
- THEN THE SYSTEM shall wait 300ms of input silence before issuing the next `listar` request with `texto=<value>`, resetting `offset` to 0.

#### Scenario: Non-text filters are not debounced
- WHEN the user changes any other filter (estadoProceso, estadoAprobacion, prioridad, categoriaId, asignadoA, fechas)
- THEN THE SYSTEM shall issue the next `listar` request immediately with `offset=0`, no debounce.

### Requirement: Toast de éxito tras acción exitosa

Successful completion of `crear`, `actualizar`, `agregarComentario`, `cambiarEstado`, `aprobar`, `rechazar`, and `eliminar` shall display a top-of-content `Alert variant="default"` auto-dismissed after 3000ms (pattern from `usuarios/index.tsx:49-86`). Failures keep the existing inline destructive `Alert` rendered within the affected card.

#### Scenario: Toast on successful crear
- WHEN the create form submits successfully
- THEN THE SYSTEM shall show the success Alert "Incidencia creada correctamente." at the top of the main content, auto-dismissed after 3000ms.

#### Scenario: Toast on successful cambiar estado
- WHEN `incidentsService.cambiarEstado(...)` resolves AND the detail refetch completes
- THEN THE SYSTEM shall show the success Alert "Estado actualizado." at the top of the main content, auto-dismissed after 3000ms.

#### Scenario: Failure stays inline
- WHEN any of the actions above fails
- THEN THE SYSTEM shall NOT show a top toast; instead, an inline destructive `Alert` shall be rendered in the affected card with the error message.

### Requirement: Botones UI por rol del usuario autenticado

The detail page and the list table shall hide actions that the current user is not entitled to invoke in the UI, using `useAuthStore.user.rol` (`frontend/src/store/auth-store.ts:10`) as the single source of truth.

#### Scenario: USUARIO sees read-only
- WHEN `currentUser.rol === "USUARIO"`
- THEN THE SYSTEM shall hide Editar, Eliminar, Aprobar, Rechazar, and Cambiar estado (Mover a) buttons. Comentarios and Adjuntos viewing shall remain visible.

#### Scenario: AGENTE limited set
- WHEN `currentUser.rol === "AGENTE"`
- THEN THE SYSTEM shall show Aprobar, Rechazar, Cambiar estado, Editar. THE SYSTEM shall hide Eliminar.

#### Scenario: ADMINISTRADOR full set
- WHEN `currentUser.rol === "ADMINISTRADOR"`
- THEN THE SYSTEM shall show all action buttons (Editar, Eliminar, Aprobar, Rechazar, Cambiar estado).

### Requirement: Tabla muestra nombre del asignado en lugar del UUID

The `Asignado` column in `incidencias-table.tsx` shall resolve `incidencia.asignadoA` against the loaded `usuarios` catalog (`incidentsService.cargarDetalle` + `usuariosService.listar()`) and render the user's `nombre`. If `asignadoA` is `null` or the assignee is not in the loaded catalog, the cell renders the neutral Spanish string `"Sin asignar"` (see drift S1 above; the original delta spec said `"—"` but the implementation uses `"Sin asignar"` for friendlier UX and consistency with NFR-3 Spanish copy).

#### Scenario: Asignado column renders user name
- WHEN a row is rendered whose `incidencia.asignadoA` resolves to a `Usuario` in the loaded catalog
- THEN THE SYSTEM shall render that user's `nombre` in the Asignado cell. UUIDs SHALL NOT appear in the rendered cell text.

#### Scenario: Unassigned renders "Sin asignar"
- WHEN a row is rendered whose `incidencia.asignadoA === null` OR whose assignee is not in the loaded catalog
- THEN THE SYSTEM shall render the literal Spanish string `"Sin asignar"` in the Asignado cell (drift S1: replaces the original delta spec's `"—"` em-dash).

### Requirement: Sidebar muestra ambos estados (aprobación y proceso)

`pages/incidencias/detalle/components/incidencia-sidebar.tsx` shall render both `estadoAprobacionBadge` (existing) AND `estadoProcesoBadge` (new, page-local `pages/incidencias/components/incidencia-estado-proceso-badge.tsx`). The new badge resolves `incidencia.estadoProcesoId` against the loaded `estadosProceso` and renders `{clave} · {etiqueta}`.

#### Scenario: Both badges present in sidebar
- THE SYSTEM shall render two distinct badges in the sidebar: one for the approval state (existing) and one for the process state (new). Each badge MUST read its own backing catalog (approval → `estadosAprobacion`, process → `estadosProceso`) — no fall-through between them.

#### Scenario: Per-row icons are specific
- THE SYSTEM shall replace the previous monotematic `Calendar` icon used for every non-date sidebar row with a row-specific icon from the confirmed-available `lucide-react@1.17` roster: `User` / `UserCircle` (Solicitante variants), `Briefcase` (Asignado), `Tag` (Categoría), `Building2` (Cliente / aplicativo), `Clock` (Creado en), `CalendarDays` / `CalendarPlus` / `CalendarCheck` (Resuelto en / Actualizado en), `ShieldCheck` (Estado de aprobación), `GitBranch` (Estado de proceso), `Flag` (Prioridad). Labels disambiguated "Estado (aprob.)" / "Estado (proceso)".

### Requirement: Historial se renderiza como timeline

`pages/incidencias/detalle/components/incidencia-actividad-card.tsx` shall render the `incidencia.historial` array as a vertical timeline with a left rail, an action icon per entry, and a label. The action icon is selected per `IncidenciaHistorialAccion`.

#### Scenario: Vertical timeline with action icons
- WHEN the historial is non-empty
- THEN THE SYSTEM shall render a vertical timeline with a left rail, where each entry shows an action icon chosen from `Plus` (CREADA), `Pencil` (ACTUALIZADA / ASIGNADA), `ArrowRight` (ESTADO_CAMBIADO), `Check` (APROBADA), `X` (RECHAZADA), `MessageSquare` (COMENTARIO_AGREGADO), `Paperclip` (ADJUNTO_AGREGADO), `X` (ADJUNTO_ELIMINADO), `Clock` (fallback), plus a label derived from the entry's `usuarioId` lookup and `nota`.

#### Scenario: Cambio de estado formatted as transition
- WHEN a `ESTADO_CAMBIADO` entry is rendered
- THEN THE SYSTEM shall display "De {estadoAnterior.etiqueta} → {estadoNuevo.etiqueta}" using the `estadosProceso` catalog lookup for both `estadoProcesoAnteriorId` and `estadoProcesoNuevoId`.

### Requirement: Sort real en columnas de la tabla

`incidencias-table.tsx` shall re-sort the currently fetched page client-side when the user clicks a sortable column header. Sort state (column + direction) is held in component-local state; the request payload to the backend is unchanged.

#### Scenario: Sort by Título
- WHEN the user clicks the Título column header (current sort button is `ArrowUpDown`)
- THEN THE SYSTEM shall toggle the sort direction (asc ↔ desc) and re-sort the rendered page client-side by `incidencia.titulo` using locale-aware comparison.

#### Scenario: Sort by Fecha
- WHEN the user clicks the Fecha column header
- THEN THE SYSTEM shall toggle the sort direction and re-sort client-side by `incidencia.creadoEn`.

#### Scenario: Sort by Prioridad with custom order
- WHEN the user clicks the Prioridad column header
- THEN THE SYSTEM shall sort using the order `CRITICA > ALTA > MEDIA > BAJA` (descending priority) and toggle to inverse on second click.

#### Scenario: Non-sortable columns
- THE SYSTEM shall NOT sort on ID, Categoría, Asignado, or Acciones. Their column headers SHALL NOT render the sort affordance.

### Requirement: Service surface reaches the full IncidenciaController

`frontend/src/services/incidents-service.ts` shall expose all nine methods mapped to the backend's twelve endpoints, with `signal?: AbortSignal` as a trailing optional parameter on every method that performs a GET.

| # | Frontend method | HTTP | Backend endpoint | Method type |
|---|-----------------|------|------------------|-------------|
| 1 | `listar(filtros, signal?)` | GET | `/api/incidencias` | existing |
| 2 | `obtenerDetalle(id, signal?)` | GET | `/api/incidencias/{id}` | existing |
| 3 | `crear(input)` | POST | `/api/incidencias` (JSON if no files, multipart if files) | existing |
| 4 | `aprobarRechazar(id, accion, input)` | PATCH | `/api/incidencias/{id}/aprobacion?accion=` | existing |
| 5 | `cambiarEstado(id, input)` | PATCH | `/api/incidencias/{id}/estado` | existing |
| 6 | `agregarComentario(id, input)` | POST | `/api/incidencias/{id}/comentarios` | existing |
| 7 | `actualizar(id, input, signal?)` | PUT | `/api/incidencias/{id}` | **new** |
| 8 | `subirAdjuntos(id, files, signal?)` | POST | `/api/incidencias/{id}/adjuntos` | **new** |
| 9 | `eliminar(id, signal?)` | DELETE | `/api/incidencias/{id}` | **new** |

#### Scenario: Service module exposes the 9 methods
- THE SYSTEM shall export `incidentsService` with the nine members listed above. `npm run build` SHALL succeed with no TS errors related to method shape.

---

## Requirements added by `incidencias-rbac-agente` (archive 2026-07-14)

These 7 functional requirements were merged into this baseline from the delta spec at `openspec/changes/archive/incidencias-rbac-agente/specs/incidencias/spec.md` (originally proposed in `proposal.md §3.1`–`§3.6`). They extend the backend RBAC enforcement (helper + catalog relaxation + new endpoint + per-role listar scope + per-resource mutation scope), the frontend cleanup that removes the prior `currentUserIsAdmin` catalog gate, and the Postman sync.

### Requirement: Permiso genérico "usuario autenticado"

`PermisoAdministracionService.java` shall expose a new `validarAutenticado(String authorizationHeader): Usuario` helper that resolves the bearer token via `AuthService.obtenerUsuarioActual(...)`, returns the `Usuario` entity, and does NOT impose any role-based restriction. Any token that survives `AuthService` validation (active user, non-expired JWT) passes. This helper is the replacement for `validarAdministrador` on any endpoint that should be reachable by all 3 roles.

#### Scenario: cualquier rol autenticado pasa
- GIVEN a valid JWT bearer token for a user with role `AGENTE`
- WHEN `PermisoAdministracionService.validarAutenticado(header)` is invoked
- THEN THE SYSTEM returns the `Usuario` entity without throwing `AccesoDenegadoException`.

#### Scenario: token inválido lanza AutenticacionException
- GIVEN a JWT that fails `JwtService.validarToken` (expired, malformed, revoked)
- WHEN `validarAutenticado(header)` is invoked
- THEN THE SYSTEM propagates `AutenticacionException` (handled by `JwtAuthenticationFilter` upstream as 401).

### Requirement: Catálogos legibles por cualquier usuario autenticado (GET)

Los 4 catálogos de solo-lectura (`categorias`, `aplicativos`, `estados-proceso`, `estados-aprobacion`) shall be reachable by any authenticated user, not only `ADMINISTRADOR`. `POST`/`PUT`/`DELETE` siguen siendo admin-only. The relaxation is implemented by swapping `validarAdministrador(token)` → `validarAutenticado(token)` inside the `listar` methods of the 4 catalog controllers.

#### Scenario: AGENTE lista categorías
- GIVEN a JWT for a user with role `AGENTE`
- WHEN `GET /api/categorias` is called
- THEN THE SYSTEM returns 200 with the array of `CategoriaResponse` (no 403).

#### Scenario: USUARIO lista aplicativos
- GIVEN a JWT for a user with role `USUARIO`
- WHEN `GET /api/aplicativos` is called
- THEN THE SYSTEM returns 200 with the array of `AplicativoClienteResponse`.

#### Scenario: USUARIO lista estados de proceso
- GIVEN a JWT for a user with role `USUARIO`
- WHEN `GET /api/estados-proceso` is called
- THEN THE SYSTEM returns 200 with the array.

#### Scenario: USUARIO lista estados de aprobación
- GIVEN a JWT for a user with role `USUARIO`
- WHEN `GET /api/estados-aprobacion` is called
- THEN THE SYSTEM returns 200 with the array.

#### Scenario: AGENTE sigue sin poder crear categoría
- GIVEN a JWT for `AGENTE`
- WHEN `POST /api/categorias` is called
- THEN THE SYSTEM returns 403 with `mensaje = "Solo el administrador puede realizar esta operacion"` (write remains admin-only).

### Requirement: Endpoint de agentes asignables para no-administradores

THE SYSTEM shall expose `GET /api/usuarios/agentes-asignables` returning `List<UsuarioResponse>` filtered to users whose `rol.codigo IN ('AGENTE','ADMINISTRADOR')` AND `activo = true`. The endpoint is reachable by any authenticated user (gate: `validarAutenticado`), NOT `validarAdministrador`. Existing `GET /api/usuarios` keeps its admin-only restriction unchanged.

#### Scenario: AGENTE ve solo pares asignables
- GIVEN a JWT for `AGENTE` and a database with `USUARIO maria` + `AGENTE jose` + `AGENTE pedro` + `ADMINISTRADOR ana`
- WHEN `GET /api/usuarios/agentes-asignables` is called
- THEN THE SYSTEM returns `200` with `[{jose}, {pedro}, {ana}]` (3 entries — AGENTES + ADMINs, activos).

#### Scenario: USUARIO también puede listar agentes para asignar
- GIVEN a JWT for `USUARIO`
- WHEN `GET /api/usuarios/agentes-asignables` is called
- THEN THE SYSTEM returns 200 with the same filtered list.

#### Scenario: inactivos excluidos
- GIVEN a database where one `AGENTE` has `activo = false`
- WHEN `GET /api/usuarios/agentes-asignables` is called
- THEN THE SYSTEM excludes that user from the response.

#### Scenario: GET /api/usuarios sigue siendo admin-only
- GIVEN a JWT for `AGENTE`
- WHEN `GET /api/usuarios` (the original endpoint) is called
- THEN THE SYSTEM returns 403.

### Requirement: AGENTE solo lista incidencias asignadas a él

`IncidenciaController.listar` shall inject the calling `Usuario` from the bearer token before building the `IncidenciaFiltro`. When the caller's role is `AGENTE`, the `asignadoA` filter is forced to `currentUser.getId()` regardless of (and overriding) any `?asignadoA=` query param. ADMINISTRADOR passes the query param through unchanged. USUARIO behavior covered by separate requirement (below).

#### Scenario: AGENTE ve solo las suyas aunque pase asignadoA=otro
- GIVEN a JWT for `AGENTE jose` and a database with 3 incidencias: 1 asignada a `jose`, 1 asignada a `AGENTE pedro`, 1 sin asignar
- WHEN `GET /api/incidencias?asignadoA={pedro-id}` is called with jose's token
- THEN THE SYSTEM returns 200 with only the 1 incidencia de `jose` (query param ignored, scope forzado).

#### Scenario: ADMIN pasa el filtro libre
- GIVEN a JWT for `ADMINISTRADOR`
- WHEN `GET /api/incidencias?asignadoA={pedro-id}` is called
- THEN THE SYSTEM returns the incidencias de `pedro`.

#### Scenario: ADMIN sin filtro ve todas
- GIVEN a JWT for `ADMINISTRADOR` and a database with 25+ incidencias
- WHEN `GET /api/incidencias` is called with no filters
- THEN THE SYSTEM returns the full paginated list.

#### Scenario: AGENTE sin filtro ve solo las suyas
- GIVEN a JWT for `AGENTE jose` and a database with 25+ incidencias of which 4 assigned to jose
- WHEN `GET /api/incidencias` is called with no filters
- THEN THE SYSTEM returns only the 4 incidencias assigned to `jose`.

### Requirement: USUARIO solo lista incidencias creadas por él

`IncidenciaFiltro` shall gain a new nullable `creadoPorUsuarioId` field. `IncidenciaController.listar` shall map the caller's role to that filter when role is `USUARIO`: filter forced to `currentUser.getId()`. AGENTE keeps the AGENTE-scope rule; ADMINISTRADOR sees all. The DAO WHERE builder shall include `creado_por_usuario_id = ?` when the filter is non-null.

#### Scenario: USUARIO ve solo las creadas por él
- GIVEN a JWT for `USUARIO maria` and a database with 3 incidencias: 1 creada por `maria`, 1 creada por `USUARIO juan`, 1 creada por `ADMINISTRADOR ana`
- WHEN `GET /api/incidencias` is called with maria's token
- THEN THE SYSTEM returns only the 1 incidencia creada por maria.

#### Scenario: USUARIO con query param propio produce resultado idéntico
- GIVEN a JWT for `USUARIO maria`
- WHEN `GET /api/incidencias?creadoPorUsuarioId={maria-id}` is called
- THEN THE SYSTEM returns the same as sin filtro. (Drift D1 — the controller force-overwrites with `actual.getId()`; when the USUARIO passes their own id the result is unchanged; when they pass a different id the override scopes them down to their own creations per the RBAC rule.)

### Requirement: AGENTE/USUARIO solo operan sobre incidencias en su alcance

`IncidenciaService` shall expose a `validarAlcance(Usuario actual, Incidencia target)` rule. The rule applies to every state-changing method (`actualizar`, `actualizarConArchivos`, `cambiarEstado`, `aprobar`, `rechazar`, `agregarComentario`, `agregarAdjunto`, `agregarAdjuntos`) and to the read `obtener`. ADMINISTRADOR bypasses the rule. AGENTE passes only when `target.asignadoA == actual.id`. USUARIO passes only when `target.creadoPorUsuarioId == actual.id` AND only for `agregarComentario` and `agregarAdjunto(s)`; USUARIO may NOT `actualizar`, `cambiarEstado`, `aprobar`, `rechazar`, or `eliminar`.

#### Scenario: AGENTE edita una incidencia suya
- GIVEN a JWT for `AGENTE jose` and an incidencia assigned to jose
- WHEN `PUT /api/incidencias/{id}` is called
- THEN THE SYSTEM returns 200 with the updated resource.

#### Scenario: AGENTE recibe 403 al editar una incidencia de otro
- GIVEN a JWT for `AGENTE jose` and an incidencia assigned to `AGENTE pedro`
- WHEN `PUT /api/incidencias/{id}` is called
- THEN THE SYSTEM returns 403 with `mensaje = "Solo puedes modificar incidencias asignadas a ti"`.

#### Scenario: AGENTE cambia estado de una incidencia suya
- GIVEN a JWT for `AGENTE jose` and an incidencia assigned to jose with process state `EN_PROCESO`
- WHEN `PATCH /api/incidencias/{id}/estado` is called
- THEN THE SYSTEM returns 200 with the transitioned state.

#### Scenario: USUARIO comenta en una incidencia suya
- GIVEN a JWT for `USUARIO maria` and an incidencia created by maria
- WHEN `POST /api/incidencias/{id}/comentarios` is called
- THEN THE SYSTEM returns 201 with the new comentario.

#### Scenario: USUARIO adjunta evidencia en una incidencia suya
- GIVEN a JWT for `USUARIO maria` and an incidencia created by maria
- WHEN `POST /api/incidencias/{id}/adjuntos` (multipart or JSON) is called
- THEN THE SYSTEM returns 201 with the new adjunto(s).

#### Scenario: USUARIO no puede cambiar estado
- GIVEN a JWT for `USUARIO maria`
- WHEN `PATCH /api/incidencias/{id}/estado` is called
- THEN THE SYSTEM returns 403.

#### Scenario: USUARIO no puede eliminar
- GIVEN a JWT for `USUARIO maria`
- WHEN `DELETE /api/incidencias/{id}` is called
- THEN THE SYSTEM returns 403.

#### Scenario: solo ADMINISTRADOR puede eliminar
- GIVEN a JWT for `USUARIO` or `AGENTE`
- WHEN `DELETE /api/incidencias/{id}` is called
- THEN THE SYSTEM returns 403. (ADMINISTRADOR passes — required to align with the existing UI gate in `incidencias-table.tsx:324`.)

### Requirement: Frontend retira gate temporal y consume agentes-asignables

`frontend/src/pages/incidencias/index.tsx` shall remove the `currentUserIsAdmin` gate introduced in the prior bug-fix patch. `loadCatalogos()` shall call all 5 catalog endpoints unconditionally. The `usuarios` catalog shall be loaded via the new `usuariosService.listarAgentesAsignables()` method instead of the admin-gated `listar()`. `nueva-incidencia-view.tsx` and `editar-incidencia-dialog.tsx` shall switch their assignment dropdowns to the same new method.

#### Scenario: AGENTE carga catálogos al entrar a /incidencias
- GIVEN a logged-in AGENTE
- WHEN the `/incidencias` page mounts
- THEN THE SYSTEM issues `GET /api/categorias`, `/api/aplicativos`, `/api/estados-proceso`, `/api/estados-aprobacion`, `/api/usuarios/agentes-asignables` — all 5 return 200 — and the catalog state arrays populate normally (no `—` badges, no empty filters).

#### Scenario: USUARIO también carga catálogos
- GIVEN a logged-in USUARIO
- WHEN the `/incidencias` page mounts
- THEN THE SYSTEM receives 200 for all 5 catalog fetches.

#### Scenario: el frontend ya no llama al endpoint admin-only
- THE SYSTEM shall not call `GET /api/usuarios` from `pages/incidencias/index.tsx` (it remains the admin user-management page's exclusive caller). Grep returns zero matches other than in `pages/usuarios/`.

#### Scenario: dropdown de asignación se llena desde agentes-asignables
- GIVEN a logged-in AGENTE on the "Nueva Incidencia" form
- WHEN the assignment dropdown opens
- THEN THE SYSTEM shows AGENTES and ADMINs (active), excludes USUARIOs. Source: `GET /api/usuarios/agentes-asignables`.

### Requirement: Postman collection sincronizada

`sistemaincidencias/postman/SistemaIncidencias.postman_collection.json` shall document the new endpoint with method, path, auth requirement ("authenticated"), and a sample response shape. The relaxation of catalog GETs to "authenticated" (no longer admin-only) shall be reflected in each catalog entry's auth note.

#### Scenario: nuevo endpoint en Postman
- THE SYSTEM shall contain a Postman folder entry named "Usuarios - agentes asignables" (or equivalent) with `GET /api/usuarios/agentes-asignables`, marked as auth required, with an example 200 response body.

#### Scenario: catálogos reflejan el nuevo rol mínimo
- THE SYSTEM shall contain `GET /api/categorias`, `/api/aplicativos`, `/api/estados-proceso`, `/api/estados-aprobacion` marked as auth required (no longer "ADMINISTRADOR only").

## Non-functional Requirements

### Requirement: Modern shadcn Field en los diálogos nuevos (Field migration restricted to new dialogs)

All form fields inside the **new dialogs** (`EditarIncidenciaDialog`, `SubirAdjuntosDialog`) shall be composed with the modern shadcn `Field` / `FieldLabel` / `FieldDescription` / `FieldError` / `FieldGroup` primitives from `frontend/src/components/ui/field.tsx` (already installed per `gestincidencias-frontend` skill). **The pre-existing legacy create form `nueva-incidencia-view.tsx` remains on raw `<label>` + `<select>` + `<textarea>` markup** — migrating that file to the same `Field` primitive is **out of scope** for this change (drift S3 above; design §3.2) and is flagged as a follow-up cleanup. Raw markup is permitted only in pre-existing forms that this change did not introduce or rewrite.

#### Scenario: Field primitives are used in new dialogs
- THE SYSTEM shall use `<Field>` plus `<FieldLabel>`, `<FieldDescription>`, `<FieldError>`, `<Input>`, `<textarea>`, etc. from `@/components/ui/*` inside `EditarIncidenciaDialog` and `SubirAdjuntosDialog`.
- The legacy `nueva-incidencia-view.tsx` is allowed to retain raw `<label>` + `<select>` pairs until a separate follow-up change migrates it. This scope limitation is intentional and approved per design §3.2.

#### Scenario: No raw markup in newly-introduced forms
- Any form component **added or rewritten** by this change (`EditarIncidenciaDialog`, `SubirAdjuntosDialog`) SHALL NOT introduce raw `<label>` + `<input>` / `<select>` markup. Pre-existing forms (`nueva-incidencia-view.tsx`) are out of scope and retain their current markup.

### Requirement: Iconos restringidos al set confirmado de `lucide-react@1.17.0`

All action and navigation icons shall come from `lucide-react@1.17.0` and be limited to a confirmed-available set. The set in scope (confirmed at design §11 + verify-report NFR-2): `Plus`, `Pencil`, `ArrowRight`, `Check`, `X`, `MessageSquare`, `Paperclip`, `User`, `Briefcase`, `Tag`, `Building2`, `Clock`, `CalendarDays`, `AlertTriangle`, `Trash2`, `KeyRound`, `MoreHorizontal`, `Upload`, `ShieldCheck`, `GitBranch`, `Flag`, `UserCircle`, `CalendarPlus`, `CalendarCheck`, `Search`, `Calendar`, `Send`, `ArrowLeft`, `ArrowUpDown`, `ArrowUp`, `ArrowDown`, `ChevronLeft`, `ChevronRight`, `Download`, `FileImage`, `FileText`, `File` (as `FileIcon`).

#### Scenario: Build resolves all icon imports
- THE SYSTEM shall import only icons from the confirmed set above. `npm run build` SHALL pass with zero missing-export errors.

### Requirement: Copy de UI en español neutro

All user-facing strings (labels, buttons, placeholders, tooltips, empty states, error alerts, success alerts) shall be written in neutral Spanish, consistent with the rest of the app. The empty-state for an unassigned `Asignado` cell is `"Sin asignar"` (drift S1), not the original `"—"` em-dash.

#### Scenario: Copy is neutral Spanish
- THE SYSTEM shall render all visible strings in neutral Spanish; no English or mixed-language strings shall appear in the rendered UI for this capability.

### Requirement: Page layout sigue `gestincidencias-frontend`

The capability shall live entirely under `frontend/src/pages/incidencias/` (existing) and `frontend/src/pages/incidencias/components/` (and `frontend/src/pages/incidencias/detalle/components/`). Shared, multi-page widgets go to `frontend/src/components/` (none expected for this capability; the `incidencia-estado-proceso-badge` component is intentionally page-local per design §3.7).

#### Scenario: Folder structure matches skill
- NEW files shall live at `frontend/src/pages/incidencias/components/{editar-incidencia-dialog,subir-adjuntos-dialog,confirmar-eliminar-incidencia-dialog,incidencias-header,incidencias-pagination,incidencia-estado-proceso-badge}.tsx` and `frontend/src/pages/incidencias/detalle/components/{incidencia-sidebar,incidencia-actividad-card}.tsx`. No new directory shall be added under `frontend/src/components/`.

### Requirement: Sin nuevos shadcn primitives

No `npx shadcn@latest add …` invocation shall occur for this capability. The page shall use only the primitives already installed: `alert`, `avatar`, `badge`, `button`, `card`, `dialog`, `field`, `input`, `label`, `separator`, `spinner`, `table`.

#### Scenario: Imports use installed primitives
- THE SYSTEM shall import shadcn primitives only from `@/components/ui/{alert,avatar,badge,button,card,dialog,field,input,label,separator,spinner,table}`. No `npx shadcn@latest add` shall be run.

### Requirement: Todo request backend pasa por `src/lib/http.ts`

Every HTTP request shall flow through `src/lib/http.ts` via `incidentsService`. `apiRequest` already attaches `Authorization: Bearer <token>` and parses `payload.mensaje ?? payload.message` for errors; the capability shall not bypass it.

#### Scenario: Centralized HTTP path
- THE SYSTEM shall not call `fetch` or `axios` directly from page or dialog code. All HTTP calls shall flow through `apiRequest`.

### Requirement: Refactor de las páginas gordas a componentes reusables

The capability shall reduce the size of `pages/incidencias/index.tsx` (~237 LOC) and `pages/incidencias/detalle/index.tsx` (~534 LOC at the start of the change) by extracting reusable components into page-local files.

| Source file | Extracted components |
|-------------|----------------------|
| `pages/incidencias/index.tsx` | `IncidenciasHeader`, `IncidenciasPagination`, `IncidenciasEmptyState` |
| `pages/incidencias/detalle/index.tsx` | `EditarIncidenciaDialog`, `SubirAdjuntosDialog`, `ConfirmarEliminarIncidenciaDialog`, state management via a `DialogMode` discriminated union (`null \| { kind: "editar"; target: Incidencia } \| { kind: "subirAdjuntos"; target: Incidencia } \| { kind: "eliminar"; target: Incidencia }`) |

#### Scenario: Page sizes come down — relaxed band (drift S2)
- WHEN the refactor is committed
- THEN THE SYSTEM shall reduce `index.tsx` to ~250 LOC and `detalle/index.tsx` to the **~400–850 LOC** band (drift S2; absolute target ~200 LOC was relaxed). The extracted components live under `components/` and account for the bulk of the capability's net +2200 / −275 LOC diff (verify-report §NFR-7: shipped file is 252 LOC for `index.tsx`, 811 LOC for `detalle/index.tsx`).
- The page-level file retains: route composition, dialog-state wiring (`DialogMode` union), catalog loading, fetch coordination with `AbortController`, toast pattern, and the approval / revision / rejection cards. None of these can collapse further without losing functionality.
- A future refactor may revisit this; design §10 explicitly accepted the deviation, and this NFR-7 now reflects shipped behavior.

### Requirement: Sin nuevos paquetes npm

No new dependencies shall be added to `frontend/package.json` for this capability. The capability is an in-place refactor using already-installed: shadcn primitives, lucide-react, react, zustand, tanstack-router, tailwindcss v4.

#### Scenario: package.json untouched by this capability
- THE SYSTEM shall not modify `frontend/package.json` or `frontend/package-lock.json`. `npm run build` SHALL pass without requiring any install step.

---

## Non-functional Requirements added by `incidencias-rbac-agente` (archive 2026-07-14)

These 2 non-functional requirements were merged into this baseline from the delta spec at `openspec/changes/archive/incidencias-rbac-agente/specs/incidencias/spec.md`.

### Requirement: Validación de inputs del filtro no se relaja

`IncidenciaFiltro` accepts the new optional `creadoPorUsuarioId` UUID field. Bean validation on `IncidenciaFiltro` is not added (the field is a UUID or null) — input validation remains equivalent to the existing fields. Backend does not regress validation on the existing 9 filter fields.

#### Scenario: filtro inválido no rompe el WHERE builder
- WHEN a malformed `creadoPorUsuarioId` is supplied (not a UUID)
- THEN THE SYSTEM returns 400 from Spring's parameter parsing, not from business logic.

### Requirement: Performance no degrada en listar

The forced `asignadoA` / `creadoPorUsuarioId` filter on listar adds at most one extra equality predicate to the existing WHERE. The existing `idx_asignado_a` (or equivalent) used by the optional-filter path is reused. No new indexes required for this change.

#### Scenario: AGENTE lista sin regresión de latencia
- GIVEN the same data and filters used today
- WHEN the role-based filter is applied
- THEN THE SYSTEM responds in a time within the same order of magnitude (no extra round-trip; no new full-scan).

## Out of scope (explicit non-requirements)

The following are **explicitly NOT** required by this capability. Any implementation work for these belongs to a separate change.

- **Backend authorization on `IncidenciaController` (B8)** *(remaining after `incidencias-rbac-agente` archive)*: the 12 endpoints now enforce per-role listar scope + per-resource mutation scope (`validarAlcance`) per the `incidencias-rbac-agente` requirements added above. **Deleted B8**: B8's premise was "controller currently exposes all 12 endpoints to any authenticated user"; that premise no longer holds. Any further backend authorization work (e.g. finer-grained field-level permissions, time-bound role elevation) is a separate change.
- **Backend PUT validation against estado terminal / rechazada (B9)**: PUT against an incidencia already in a terminal or rejected state succeeds today; this capability does not fix that.
- **Notificaciones reales**: backend writes to the `notificaciones` table on key transitions; the frontend does not render those notifications in this capability.
- **`DELETE /api/incidencias/{id}/adjuntos/{adjuntoId}` individual adjunto removal**: no backend endpoint exists.
- **`motivoRechazo` field added to backend `IncidenciaResponse`**: contract change, out of scope; the rejection note stays sourced from `historial`.
- **Editar / eliminar comentario propio**: only append is wired; edit/delete own comment is a future change.
- **Field migration of `nueva-incidencia-view.tsx` to the modern shadcn `Field` primitive**: the legacy create form keeps its raw `<label>` + `<select>` markup (see NFR-1 / drift S3 + design §3.2). Follow-up cleanup is welcome but not part of this capability.
- **Self-profile / change-own-password**: separate change.
- **Roles CRUD UI**: separate change.
- **`DELETE /api/usuarios/{id}` (RF-33)**: backend endpoint not implemented; out of scope.
- **`DELETE /api/categorias/{id}`, `/api/estados-proceso/{id}`, `/api/estados-aprobacion/{id}`**: backend endpoints not implemented; out of scope (added by `incidencias-rbac-agente` archive).
- **USUARIO mutation scope beyond `agregarComentario` + `agregarAdjunto(s)`**: per the rbac archive, USUARIO is restricted to comment + attach on incidencias they created. Extending USUARIO mutations (e.g. letting them re-categorize their own incidencia) is a follow-up change (added by `incidencias-rbac-agente` archive).
- **Reportes + export PDF/Excel (RF-41..44)**: separate change (added by `incidencias-rbac-agente` archive).
- **Dashboard real con `GET /api/dashboard` (RF-06..11)**: separate change (added by `incidencias-rbac-agente` archive).
- **Configuración UI (RF-49..50)**: separate change (added by `incidencias-rbac-agente` archive).
- **Demo login fix (`POST /api/auth/demo`)**: user explicitly excluded from this change (added by `incidencias-rbac-agente` archive).
- **OpenAPI / Swagger (RNF-18)**: separate change (added by `incidencias-rbac-agente` archive).
- **Breadcrumb (RF-46)**: separate change (added by `incidencias-rbac-agente` archive).
- **Migration of `frontend/src/pages/incidencias/detalle/index.tsx` to consume `agentes-asignables`**: the detail page still calls the admin-only `usuariosService.listar()` at `detalle/index.tsx:158` and silently swallows the 403 via `try/catch {}`. AGENTE/USUARIO users landing on a detail page experience no error toast today. Migrating that page to the new endpoint and polishing the 403-state UI is a follow-up change — explicitly out of scope per `proposal.md §5` and `design.md §4` (added by `incidencias-rbac-agente` archive).
- **New SQL indexes for the added predicates**: the `creado_por_usuario_id` and `asignado_a` filters hit already-indexed columns; no new indexes added (added by `incidencias-rbac-agente` archive).

## Acceptance criteria

- All 15 functional + 8 non-functional requirements from `incidencias-phase2-3` are met (23/23 PASS per the phase2-3 verify-report).
- All 7 functional + 2 non-functional requirements added by `incidencias-rbac-agente` are met (9/9 PASS per the rbac verify-report).
- **Combined baseline**: 22 functional requirements + 10 non-functional requirements (32/32 PASS across the two verify-reports).
- `cd sistemaincidencias && ./mvnw compile` passes with no new errors (PASS per rbac verify-report; net-new clean).
- `cd frontend && npm run lint` passes net-new (3 pre-existing errors from PR #9 `f26424a` remain out of scope per rbac verify-report §Regressions).
- `cd frontend && npm run build` passes net-new (4 pre-existing errors from PR #9 `f26424a` remain out of scope per rbac verify-report §Regressions).
- Manual smoke walkthrough against the running backend exercises: the full `incidencias-phase2-3` smoke checklist (create with adjuntos (B1), no `console.log` (B2), motivo from historial (B3), move to `FINALIZADA` (B4), edit, upload more adjuntos, delete, role-based UI verification for `ADMINISTRADOR`/`AGENTE`/`USUARIO`) **plus** the `incidencias-rbac-agente` scenarios (5 catalog GETs at AGENTE+USUARIO return 200, 4 `agentes-asignables` scenarios, 4 AGENTE-list scope scenarios, 2 USUARIO-list scope scenarios, 8 `validarAlcance` mutation scope scenarios, 4 frontend cleanup scenarios, 2 Postman sync scenarios). CI environment is `deferred-no-backend`; a maintainer walks both checklists against the live Spring Boot instance.
- Pre-existing TS/lint errors in master (introduced by PR #9 `f26424a`, `incidencias-table.tsx:309` and `index.tsx:65-66`) are unrelated to this baseline and remain out of scope.
