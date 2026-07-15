# Capability Spec: `incidencias` — phase 2 / 3 delta

**Capability**: `incidencias`
**Project**: sistema-incidencias
**Change**: `incidencias-phase2-3`
**Scope**: Frontend only. No backend changes. No Postman collection changes. All 12 endpoints of `IncidenciaController` (`sistemaincidencias/src/main/java/com/integrador/sistemaincidencias/incidencias/controller/IncidenciaController.java`) stay untouched.

> **Baseline note**: This is the first formal spec written for the `incidencias` capability. There is no existing `openspec/specs/incidencias/spec.md` to delta against, so the archive step at the end of this change will **seed** the capability spec from this delta. All requirements below use the `## ADDED Requirements` form. Future changes will use `## MODIFIED Requirements` / `## REMOVED Requirements` against the seeded baseline.
>
> **Role-name correction**: The orchestrator draft used role shorthand `ADMIN`. Per `sistemaincidencias/AGENTS.md` and the seed script, the canonical role codes are `ADMINISTRADOR`, `AGENTE`, `USUARIO`. This spec uses the canonical names. See risk R3 in the change-level overview.

## Purpose

Extend the existing Incidencias capability with bug fixes (`B1`–`B4`), three missing service flows (`actualizar`, `subirAdjuntos`, `eliminar`), three new dialog components wired to those flows, role-based UI gating sourced from `useAuthStore.user.rol`, race-free fetches via `AbortController`, debounced text search, post-action success toasts, polymorphic sidebar / timeline icons, and client-side table sorting. The end state brings the Incidencias module to UX parity with the recently-shipped `/usuarios` page while reusing already-installed shadcn primitives and the existing `src/lib/http.ts` plumbing.

The capability covers authenticated users on the `/incidencias` route and `/incidencias/:id` detail route.

## ADDED Requirements

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

The `Asignado` column in `incidencias-table.tsx` shall resolve `incidencia.asignadoA` against the loaded `usuarios` catalog (`incidentsService.cargarDetalle` + `usuariosService.listar()`) and render the user's `nombre`. If `asignadoA` is `null`, the cell renders the literal em-dash character.

#### Scenario: Asignado column renders user name
- WHEN a row is rendered whose `incidencia.asignadoA` resolves to a `Usuario` in the loaded catalog
- THEN THE SYSTEM shall render that user's `nombre` in the Asignado cell. UUIDs SHALL NOT appear in the rendered cell text.

#### Scenario: Unassigned renders dash
- WHEN a row is rendered whose `incidencia.asignadoA === null` OR whose assignee is not in the loaded catalog
- THEN THE SYSTEM shall render "—" in the Asignado cell.

### Requirement: Sidebar muestra ambos estados (aprobación y proceso)

`pages/incidencias/detalle/components/incidencia-sidebar.tsx` shall render both `estadoAprobacionBadge` (existing) AND `estadoProcesoBadge` (new, page-local `pages/incidencias/components/estado-proceso-badge.tsx`). The new badge resolves `incidencia.estadoProcesoId` against the loaded `estadosProceso` and renders `{clave} · {etiqueta}`.

#### Scenario: Both badges present in sidebar
- THE SYSTEM shall render two distinct badges in the sidebar: one for the approval state (existing) and one for the process state (new). Each badge MUST read its own backing catalog (approval → `estadosAprobacion`, process → `estadosProceso`) — no fall-through between them.

#### Scenario: Per-row icons are specific
- THE SYSTEM shall replace the current monotematic `Calendar` icon used for every sidebar row with a row-specific icon from the confirmed-available set: `User` (Solicitante), `Briefcase` (Asignado), `Tag` (Categoría), `Building2` (Cliente / aplicativo), `Clock` (Creado en), `CalendarDays` (Resuelto en / Actualizado en).

### Requirement: Historial se renderiza como timeline

`pages/incidencias/detalle/components/incidencia-actividad-card.tsx` shall render the `incidencia.historial` array as a vertical timeline with a left rail, an action icon per entry, and a label. The action icon is selected per `IncidenciaHistorialAccion`.

#### Scenario: Vertical timeline with action icons
- WHEN the historial is non-empty
- THEN THE SYSTEM shall render a vertical timeline with a left rail, where each entry shows an action icon chosen from `Plus` (CREADA), `Pencil` (ACTUALIZADA), `ArrowRight` (ESTADO_CAMBIADO), `Check` (APROBADA), `X` (RECHAZADA), `MessageSquare` (COMENTARIO_AGREGADO), `Paperclip` (ADJUNTO_AGREGADO), plus a label derived from the entry's `usuarioId` lookup and `nota`.

#### Scenario: Cambio de estado formatted as transition
- WHEN a `CAMBIO_ESTADO` entry is rendered
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

## Non-functional Requirements

### Requirement: Modern shadcn Field en todos los formularios

All form fields across the page (create, edit, subir-adjuntos) shall be composed with the modern shadcn `Field` / `FieldLabel` / `FieldDescription` / `FieldError` / `FieldGroup` primitives from `frontend/src/components/ui/field.tsx` (already installed per `gestincidencias-frontend` skill). Raw `<label>` + `<input>` pairs shall not be introduced in this change.

#### Scenario: Field primitives are used
- THE SYSTEM shall use `<Field>` plus `<FieldLabel>`, `<FieldError>`, `<Input>`, `<textarea>`, etc. from `@/components/ui/*` inside `EditarIncidenciaDialog` and `SubirAdjuntosDialog`, replacing the raw markup currently in `nueva-incidencia-view.tsx:177-329` where the modern pattern is not used.

### Requirement: Iconos restringidos al set confirmado de `lucide-react@1.17.0`

All action and navigation icons shall come from `lucide-react@1.17.0` and be limited to a confirmed-available set. The set in scope: `Plus`, `Pencil`, `ArrowRight`, `Check`, `X`, `MessageSquare`, `Paperclip`, `User`, `Briefcase`, `Tag`, `Building2`, `Clock`, `CalendarDays`, `AlertTriangle`, `Trash2`, `KeyRound`, `MoreHorizontal`, `Upload`.

#### Scenario: Build resolves all icon imports
- THE SYSTEM shall import only icons from the confirmed set above. `npm run build` SHALL pass with zero missing-export errors.

### Requirement: Copy de UI en español neutro

All user-facing strings (labels, buttons, placeholders, tooltips, empty states, error alerts, success alerts) shall be written in neutral Spanish, consistent with the rest of the app.

#### Scenario: Copy is neutral Spanish
- THE SYSTEM shall render all visible strings in neutral Spanish; no English or mixed-language strings shall appear in the rendered UI for this change.

### Requirement: Page layout sigue `gestincidencias-frontend`

The change shall live entirely under `frontend/src/pages/incidencias/` (existing) and `frontend/src/pages/incidencias/components/` (and `frontend/src/pages/incidencias/detalle/components/`). Shared, multi-page widgets go to `frontend/src/components/` (none expected in this change).

#### Scenario: Folder structure matches skill
- NEW files shall live at `frontend/src/pages/incidencias/components/{editar-incidencia-dialog,subir-adjuntos-dialog,confirmar-eliminar-incidencia-dialog,incidencias-header,incidencias-pagination,estado-proceso-badge}.tsx` and `frontend/src/pages/incidencias/detalle/components/{incidencia-sidebar,incidencia-actividad-card}.tsx`. No new directory shall be added under `frontend/src/components/`.

### Requirement: Sin nuevos shadcn primitives

No `npx shadcn@latest add …` invocation shall occur in this change. The page shall use only the primitives already installed: `alert`, `avatar`, `badge`, `button`, `card`, `dialog`, `field`, `input`, `label`, `separator`, `spinner`, `table`.

#### Scenario: Imports use installed primitives
- THE SYSTEM shall import shadcn primitives only from `@/components/ui/{alert,avatar,badge,button,card,dialog,field,input,label,separator,spinner,table}`. No `npx shadcn@latest add` shall be run.

### Requirement: Todo request backend pasa por `src/lib/http.ts`

Every HTTP request shall flow through `src/lib/http.ts` via `incidentsService`. `apiRequest` already attaches `Authorization: Bearer <token>` and parses `payload.mensaje ?? payload.message` for errors; the change shall not bypass it.

#### Scenario: Centralized HTTP path
- THE SYSTEM shall not call `fetch` or `axios` directly from page or dialog code. All HTTP calls shall flow through `apiRequest`.

### Requirement: Refactor de las páginas gordas a componentes reusables

The change shall reduce the size of `pages/incidencias/index.tsx` (~237 LOC) and `pages/incidencias/detalle/index.tsx` (~534 LOC) by extracting the following components:

| Source file | Extracted components |
|-------------|----------------------|
| `pages/incidencias/index.tsx` | `IncidenciasHeader`, `IncidenciasPagination`, `IncidenciasEmptyState` |
| `pages/incidencias/detalle/index.tsx` | `EditarIncidenciaDialog`, `SubirAdjuntosDialog`, `ConfirmarEliminarIncidenciaDialog`, state management via a `DialogMode` discriminated union (`null \| { kind: "editar" } \| { kind: "subirAdjuntos" } \| { kind: "eliminar" }`) |

#### Scenario: Page sizes come down
- WHEN the refactor is committed
- THEN THE SYSTEM shall reduce `index.tsx` and `detalle/index.tsx` each to roughly 200 LOC or less, with the extracted components living under `components/`.

### Requirement: Sin nuevos paquetes npm

No new dependencies shall be added to `frontend/package.json`. The change is an in-place refactor using already-installed: shadcn primitives, lucide-react, react, zustand, tanstack-router, tailwindcss v4.

#### Scenario: package.json untouched by this change
- THE SYSTEM shall not modify `frontend/package.json` or `frontend/package-lock.json`. `npm run build` SHALL pass without requiring any install step.

## Out of scope (explicit non-requirements)

The following are **explicitly NOT** required by this delta. Any implementation work for these belongs to a separate change.

- **Backend authorization on `IncidenciaController` (B8)**: controller currently exposes all 12 endpoints to any authenticated user. UI-side role gating is a UX guard only, not authorization.
- **Backend PUT validation against estado terminal / rechazada (B9)**: PUT against an incidencia already in a terminal or rejected state succeeds today; this change does not fix that.
- **Notificaciones reales**: backend writes to the `notificaciones` table on key transitions; the frontend does not render those notifications in this change.
- **`DELETE /api/incidencias/{id}/adjuntos/{adjuntoId}` individual adjunto removal**: no backend endpoint exists.
- **`motivoRechazo` field added to backend `IncidenciaResponse`**: contract change, out of scope; the rejection note stays sourced from `historial`.
- **Editar / eliminar comentario propio**: only append is wired; edit/delete own comment is a future change.
- **Self-profile / change-own-password**: separate change.
- **Roles CRUD UI**: separate change.

## Acceptance criteria

- All 15 functional requirements + 8 non-functional requirements are met.
- `npm run lint` passes with zero errors.
- `npm run build` passes with zero errors.
- Manual smoke walkthrough against the running backend exercises: create with adjuntos, edit, change state to `FINALIZADA`, subir adjuntos, eliminar, plus role-based UI verification for each role.
