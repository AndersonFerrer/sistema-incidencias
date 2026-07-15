# Tasks — incidencias-phase2-3

> Implementation task plan for the frontend-only Incidencias bug fixes + missing flows + UX polish change.
> Source: `proposal.md` (4-phase plan, 9 resolved assumptions) + `design.md` (13 sections, 4-slice work-unit plan) + `specs/incidencias/spec.md` (REQ-1..16 functional + NFR-1..8, 24 requirements total / 52 scenarios).
>
> **Workload warning**: this change forecasts ~2150 LOC across 7 new + 10 modified files — well above the 400-line review budget. The orchestrator must pause before the apply phase and ask the user to choose between `chained-prs` (recommended, 4–6 PRs) and a documented `size:exception` (fewer PRs, each one over budget). See **PR strategy** at the bottom.

## Forecast

| Slice | Tasks | LOC (target / ceiling) | Reviewable? |
|-------|-------|------------------------|-------------|
| A — Phase 1 bug fixes | 1, 2, 3, 4 | ~120 / ~125 | Yes, isolated. |
| B — Services + types + refactor | 5, 6, 7, 8, 9 | ~530 / ~560 | Borderline; orchestrator will surface PR strategy. |
| C — New dialogs + detalle wiring | 10, 11, 12, 13 | ~970 / ~1010 | Likely exceeds budget — split into C1/C2 or accept size:exception. |
| D — UX polish + role UI + verification | 14, 15, 16, 17, 18, 19 | ~530 / ~560 | Likely exceeds budget — split into D1/D2 or accept size:exception. |

Total forecast: **~2150 LOC across 19 tasks and 4 slices** (~7 new files + ~10 modified files). Review budget risk: **HIGH**.

Conventions: every commit follows Conventional Commits; each task ends with `frontend/` in a buildable state (`npm run lint` + `npm run build` clean); `frontend/AGENTS.md` and the `gestincidencias-frontend` skill are the layout authority; `lib/http.ts` already forwards `AbortSignal` to `fetch` (verified at line 27 in spec), so service signatures can declare `signal?: AbortSignal` without further plumbing.

---

## Slice A — Phase 1 bug fixes (~120 LOC)

Locks down the four production bugs (B1–B4) before any new feature work. Each task is small, isolated, and independently mergeable, so PR1 (Slice A) is a safe, low-risk drop that can ship alone.

### 1. Fix `handleArchivos` to persist selected files (BUG B1)

- Files: `frontend/src/pages/incidencias/components/nueva-incidencia-view.tsx`
- LOC estimate: ~+5
- Dependencies: none
- Acceptance:
  - `handleArchivos` body changes from the current mutation (likely just `Array.from(event.target.files ?? [])`) to `setArchivos(prev => [...prev, ...Array.from(event.target.files ?? [])])`.
  - Re-selecting files while a previous selection exists accumulates instead of replacing.
  - After `e.target.value = ""` clear, the same file can be re-selected without React key collisions.
  - TS compiles (`npm run build`).
  - Manual smoke: pick `a.txt`, then `b.png`, both chips appear in the list, then submit — POST `/api/incidencias` reaches the backend as `multipart/form-data` with both files under the `archivos` key.
- Slice: A
- Commit message: `fix(incidencias): persist selected files in crear form (BUG B1)`

### 2. Remove `console.log` debug from `incidents-service`

- Files: `frontend/src/services/incidents-service.ts`
- LOC estimate: ~−5
- Dependencies: none
- Acceptance:
  - The block at `incidents-service.ts:72-76` (or wherever the `[DEBUG service]` log lives) is deleted entirely.
  - No call sites depended on its side effects (it was a pure debug log per the proposal).
  - `npm run lint` passes with zero warnings; `npm run build` exits 0.
  - `rg "DEBUG service" frontend/src` returns no matches after the change.
  - Production bundle (inspect with `npm run build && grep -r "DEBUG service" dist/`) contains no `[DEBUG service]` string.
- Slice: A
- Commit message: `chore(incidencias): remove console.log debug from service`

### 3. Source `motivoRechazo` from `historial` (BUG B3 contract drift)

- Files: `frontend/src/types/incidencias.ts` (~−1 LOC — remove `motivoRechazo?: string | null` from `Incidencia`), `frontend/src/pages/incidencias/detalle/index.tsx` (~+15 LOC — replace the rejection-card read with a `historial` lookup)
- LOC estimate: ~+15
- Dependencies: none
- Acceptance:
  - `Incidencia` type no longer declares `motivoRechazo`. `IncidenciaResponse` from the backend never had the field per the spec note; this change aligns the frontend type with the real contract.
  - In `detalle/index.tsx`, where the rejection reason was previously read from `incidencia.motivoRechazo`, it now reads from `incidencia.historial.find(h => h.accion === "RECHAZADA")?.nota`.
  - When the lookup returns `undefined` (no rejected entry in `historial`), the rejection card renders the fallback string `"Sin motivo registrado"` instead of crashing or rendering an empty string.
  - TS compiles (`npm run build`).
  - Manual smoke: open any REJECTED `Incidencia` (or set one to RECHAZADA via the action button); rejection reason card shows the value that was passed when the rejection happened; if the historial entry is missing, fallback text is visible.
- Slice: A
- Commit message: `fix(incidencias): source motivoRechazo from historial (BUG B3 contract drift)`

### 4. Allow transition to terminal estados (BUG B4)

- Files: `frontend/src/pages/incidencias/detalle/index.tsx`
- LOC estimate: ~+5
- Dependencies: none
- Acceptance:
  - The `siguienteEstadoProceso` helper at `detalle/index.tsx:523-534` (or current location) is rewritten to filter by `estado.orden === actual.orden + 1` (per REQ-4), instead of `!estado.esTerminal` which currently excludes FINALIZADA from EN_PROCESO's transition options.
  - For an `EN_PROCESO` (orden=2) incidencia, the "Cambiar estado" select shows `Finalizada` (orden=3) as a selectable option.
  - For a `PENDIENTE` (orden=1) incidencia, only `En Proceso` (orden=2) is selectable; FINALIZADA does NOT appear (skip-ahead is not allowed).
  - TS compiles; no other dropdown logic regresses.
  - Manual smoke: open an `EN_PROCESO` incidencia, the dropdown contains "Finalizada"; selecting it + confirm calls `cambiarEstado` and the page reflects `FINALIZADA` after refetch.
- Slice: A
- Commit message: `fix(incidencias): allow transition to terminal estados (BUG B4)`

---

## Slice B — Services + types + refactor (~530 LOC)

Builds the dependency chain for Slice C: extended service surface, new types, page-local extractions (Header, Pagination, badge), and the AbortController + debounce plumbing in the list view. After PR2 (Slice B) lands, every consumer in Slice C already has a typed API to call.

> **LOC note**: Slice B as drafted is ~530 LOC, ~130 over the 400-line budget. The cheapest LOC saver is the already-decided move of UUID resolution + table sort from task 15 into Slice D (this is reflected in the task list below). Further trimming is possible (e.g., dropping per-row action labels from the badge), but is **not** recommended — the user was already given a recommended path and tasks 5–9 are tightly coupled.

### 5. Extend `incidents-service` with `actualizar` + `subirAdjuntos` + `eliminar`

- Files: `frontend/src/services/incidents-service.ts` (~+60 LOC)
- LOC estimate: ~+60
- Dependencies: 1, 2, 3, 4 (independent file — branches on already-merged changes)
- Acceptance:
  - `actualizar(id: number, input: ActualizarIncidenciaInput, { signal? } = {})` → PUT `/api/incidencias/{id}`. If `input.archivos.length > 0`, switch to `multipart/form-data` with all fields + the `archivos` key; otherwise JSON body via `JSON.stringify(payload)`. Matches backend controller `actualizar` vs `actualizarConArchivos` (verified in `IncidenciaController.java:97-113`).
  - `subirAdjuntos(id: number, files: File[], { signal? } = {})` → POST `/api/incidencias/{id}/adjuntos` as `multipart/form-data` with each file under the `archivos` key.
  - `eliminar(id: number, { signal? } = {})` → DELETE `/api/incidencias/{id}`; resolves on 204, throws on 4xx/5xx (handled by existing `apiRequest`).
  - All three signatures include `signal?: AbortSignal` (forwarded to `apiRequest`, which already forwards to `fetch`).
  - TS compiles; no `any`.
  - `npm run lint` passes.
- Slice: B
- Commit message: `feat(incidencias): add actualizar + subirAdjuntos + eliminar service methods`

### 6. Extend types with `ActualizarIncidenciaInput` + `DialogMode`

- Files: `frontend/src/types/incidencias.ts` (~+40 LOC)
- LOC estimate: ~+40
- Dependencies: none
- Acceptance:
  - `ActualizarIncidenciaInput` exported, with fields `titulo`, `descripcion`, `categoriaCodigo`, `prioridadCodigo`, `estadoProcesoCodigo`, `estadoAprobacionCodigo`, `asignadoAId?`, `archivos?: File[]` (matches `ActualizarIncidenciaRequest` on the backend, minus server-only concerns).
  - `IncidenciaDialogMode` discriminated union added with variants: `{ kind: "closed" } | { kind: "editar"; target: Incidencia } | { kind: "subirAdjuntos"; target: Incidencia } | { kind: "eliminar"; target: Incidencia }`. Per design note, the `target: Incidencia` is carried BY VALUE so the table can dispatch without maintaining a parallel map.
  - Existing types untouched (except the `motivoRechazo` removal from Slice A task 3).
  - TS compiles with zero errors.
- Slice: B
- Commit message: `feat(incidencias): add ActualizarIncidenciaInput + IncidenciaDialogMode types`

### 7. Extract `IncidenciasHeader` + `IncidenciasPagination` components

- Files: `frontend/src/pages/incidencias/components/incidencias-header.tsx` (NEW, ~50 LOC), `frontend/src/pages/incidencias/components/incidencias-pagination.tsx` (NEW, ~100 LOC), `frontend/src/pages/incidencias/index.tsx` (~−60 LOC extracted)
- LOC estimate: ~+90 net
- Dependencies: none (refactor only — behavior must be identical pre- and post-extraction)
- Acceptance:
  - `IncidenciasHeader` props: `{ totalShown: number; onNueva: () => void }`. Renders `h1 "Incidencias"`, the counter `Mostrando ${totalShown}`, and a `<Button>` "Nueva Incidencia" with `Plus` icon from `lucide-react` (mirrors the `UsuariosHeader` reference at `frontend/src/pages/usuarios/components/usuarios-header.tsx`).
  - `IncidenciasPagination` props: `{ page: number; limit: number; count: number; onPageChange: (page: number) => void }`. Renders `Mostrando X–Y` counter (clamping `X = 0` when `count === 0`) and `Prev` / `Next` `<Button>`s with `ChevronLeft` / `ChevronRight`. Prev disabled at `page === 0`; Next disabled when `count < limit`.
  - `incidencias/index.tsx` composition swaps the inline JSX for the two new components; no JSX behavior changes. Pagination UI moves out of `incidencias-table.tsx` if it was embedded there (per design note the table loses ~40 LOC, the page gains ~100 LOC).
  - TS compiles; lint clean.
  - Manual smoke: `/incidencias` looks and behaves identically to before; pagination now/update works.
- Slice: B
- Commit message: `refactor(incidencias): extract IncidenciasHeader + IncidenciasPagination`

### 8. Add `IncidenciaEstadoProcesoBadge` component

- Files: `frontend/src/pages/incidencias/components/incidencia-estado-proceso-badge.tsx` (NEW, ~40 LOC)
- LOC estimate: ~+40
- Dependencies: none
- Acceptance:
  - Props: `{ clave: "PENDIENTE" | "EN_PROCESO" | "FINALIZADA"; size?: "sm" | "md" }`.
  - Maps each clave to a shadcn `<Badge variant>` (e.g., `secondary` for `PENDIENTE`, `default` for `EN_PROCESO`, `outline`/`success` for `FINALIZADA`) and a human label (`Pendiente`, `En proceso`, `Finalizada`).
  - Page-local — not exported outside `frontend/src/pages/incidencias/components/` (per `gestincidencias-frontend` skill structure rules).
  - TS compiles; lint clean.
  - Manual smoke: a representative row in `incidencias-table.tsx` (or a hardcoded test render) shows the expected badge color + label.
- Slice: B
- Commit message: `feat(incidencias): add estadoProcesoBadge component`

### 9. `AbortController` + 300 ms debounce in list fetch

- Files: `frontend/src/pages/incidencias/index.tsx` (~+50 LOC — AbortController ref + debounce useEffect), `frontend/src/services/incidents-service.ts` (~+3 LOC — `signal` forwarding on existing list endpoints if not already wired)
- LOC estimate: ~+53
- Dependencies: 5, 6
- Acceptance:
  - `incidencias/index.tsx` keeps a `useRef<AbortController>('incidenciasFetch')` that aborts the previous fetch on every filter/state change. Mirror pattern from `frontend/src/pages/usuarios/index.tsx:101-121, 129-171` per design note.
  - Rapid filter typing produces a single in-flight request — the latest filter set wins; all prior requests are aborted before they can `setState` (verified by adding a 1 s `setTimeout` in dev and seeing the cancelled UI).
  - A local `useEffect` with `setTimeout(..., 300)` debounces the `texto` filter before it reaches the service. Other filters (estado, prioridad, etc.) apply immediately.
  - Service-layer edits: every list-style signature (`listar`, possibly existing endpoints) accepts `signal?: AbortSignal` and forwards it to `apiRequest`. `lib/http.ts` already passes `signal` to `fetch`, so this is plumbing only.
  - TS compiles; lint clean.
  - Manual smoke: type 10 characters in the search input — only the last request resolves; DevTools shows cancelled requests in the Network tab.
- Slice: B
- Commit message: `feat(incidencias): AbortController + 300ms debounce in list fetches`

---

## Slice C — New dialogs + detalle wiring (~970 LOC)

Replaces the missing Editar / Subir adjuntos / Eliminar flows with real dialogs and wires them into `detalle/index.tsx` alongside the toast / `AbortController` plumbing for the detail load. After PR3, every action against a persisted `Incidencia` is functional.

> **LOC warning**: Slice C is ~970 LOC — well above the 400-line review budget. **Recommended split** (orchestrator will surface to user at apply time):
>
> - **PR3 (Slice C1)** — task 10 only (`EditarIncidenciaDialog`) → ~280 LOC, under budget.
> - **PR4 (Slice C2)** — tasks 11 + 12 (`SubirAdjuntosDialog` + `ConfirmarEliminarIncidenciaDialog`) → ~290 LOC, under budget.
> - **PR5 (Slice C3 / wiring)** — task 13 (wiring + toast + AbortController in `detalle/index.tsx`) → ~400 LOC, under budget.
>
> Alternative: keep as a single PR with `size:exception` (≈970 LOC, ≈240% over budget). Not recommended.

### 10. `EditarIncidenciaDialog` (create + edit dual mode)

- Files: `frontend/src/pages/incidencias/components/editar-incidencia-dialog.tsx` (NEW, ~280 LOC)
- LOC estimate: ~+280
- Dependencies: 5, 6
- Acceptance:
  - Props: `{ mode: "crear" | "editar"; open: boolean; onOpenChange: (open: boolean) => void; initial?: Incidencia; catalogos: { categorias: CategoriaCatalogo[]; prioridades: PrioridadCatalogo[]; estadosProceso: EstadoProcesoCatalogo[]; estadosAprobacion: EstadoAprobacionCatalogo[]; usuarios: UsuarioCatalogo[] }; onSuccess: () => void; onError: (msg: string) => void }`.
  - Uses shadcn `Dialog` / `Field` / `FieldLabel` / `FieldError` / `FieldGroup` primitives (login-form style, per NFR-1 from the spec). No new shadcn installs required.
  - Fields: `titulo`, `descripcion`, `categoriaCodigo`, `prioridadCodigo`, `estadoProcesoCodigo` (only in `mode === "editar"`), `estadoAprobacionCodigo` (only in `mode === "editar"`), `asignadoAId?`, optional `archivos: File[]` (allowed in both modes for adding new adjuntos).
  - Client validation: required fields + titulo min length 5. Backend `mensaje` is surfaced via `onError`; per-field errors via inline `FieldError`.
  - Submit calls `incidentsService.actualizar(id, input)` (or `incidentsService.crear(...)` if `mode === "crear"` — but per the proposal the editar dialog handles both, since the underlying form fields are identical). Branch on `input.archivos.length > 0` to send multipart PUT vs JSON PUT.
  - Closes on success, resets local state, calls `onSuccess` to refetch parent.
  - TS compiles; lint clean.
  - Manual smoke: open any `Incidencia` from the detalle page, click "Editar", change the title, save, the page reflects the new title. Rejection/validation paths show inline `FieldError` (not browser native popups).
- Slice: C
- Commit message: `feat(incidencias): edit/create dialog with shadcn Field`

### 11. `SubirAdjuntosDialog` (drag & drop + per-file progress)

- Files: `frontend/src/pages/incidencias/components/subir-adjuntos-dialog.tsx` (NEW, ~180 LOC)
- LOC estimate: ~+180
- Dependencies: 5
- Acceptance:
  - Props: `{ open: boolean; onOpenChange: (open: boolean) => void; incidenciaId: number; onSuccess: () => void; onError: (msg: string) => void }`.
  - Two ways to add files: drag-and-drop on a styled dropzone (`onDragOver` + `onDrop`) AND click-to-browse via a hidden `<input type="file" multiple>`.
  - Each file in the local list renders as a row with: filename, size, a `<Progress>` bar (0 → 100 simulated via `requestAnimationFrame` — there is no chunked-upload endpoint on the backend per design note), and a remove (`X` icon) button.
  - Submit calls `incidentsService.subirAdjuntos(id, files)` once when all simulated progress bars reach 100%. Closes on success.
  - Per-file inline error (e.g., file too big) renders under the offending row without aborting the whole batch.
  - TS compiles; lint clean.
  - Manual smoke: open the dialog from the detalle page, drop 3 PDFs, watch 3 progress bars complete, submit, the adjuntos card on the parent page now shows all 3 new entries.
- Slice: C
- Commit message: `feat(incidencias): upload adjuntos dialog with drag&drop`

### 12. `ConfirmarEliminarIncidenciaDialog` (destructive confirmation)

- Files: `frontend/src/pages/incidencias/components/confirmar-eliminar-incidencia-dialog.tsx` (NEW, ~110 LOC)
- LOC estimate: ~+110
- Dependencies: 5
- Acceptance:
  - Props: `{ open: boolean; onOpenChange: (open: boolean) => void; target: Incidencia; onSuccess: () => void; onError: (msg: string) => void }`.
  - Renders the destructive shadcn variant with `AlertTriangle` icon, title "¿Eliminar la incidencia {target.codigo}?", body that quotes `target.titulo` and explains the cascade ("Esta acción no se puede deshacer. Se eliminarán también los comentarios, adjuntos e historial asociados.").
  - Cancel button (`<Button variant="outline">` "Cancelar"); confirm button (`<Button variant="destructive">` "Eliminar" with `Trash2` icon) that calls `incidentsService.eliminar(target.id)` on click.
  - Closes on success and calls `onSuccess`, which navigates the parent back to `/incidencias` (caller responsibility, no router import inside the dialog).
  - Inline `Alert variant="destructive"` shown inside the dialog if the backend rejects (e.g., 403, 404).
  - TS compiles; lint clean.
  - Manual smoke: open the dialog from the detalle page, click "Eliminar" — the row disappears from the list and the URL navigates back to `/incidencias`.
- Slice: C
- Commit message: `feat(incidencias): confirmar-eliminar dialog with cascade warning`

### 13. Detalle wiring: `DialogMode` state + 3 dialogs + toast + `AbortController`

- Files: `frontend/src/pages/incidencias/detalle/index.tsx` (~+400 LOC net, after ~−300 LOC extracted in Slice B task 16 + Slice D task 17)
- LOC estimate: ~+400
- Dependencies: 8, 10, 11, 12
- Acceptance:
  - Replaces the existing ad-hoc booleans (`rechazarAbierto`, `editarAbierto`, etc.) with a single `IncidenciaDialogMode` state (`useState<IncidenciaDialogMode>({ kind: "closed" })`).
  - Three action buttons on the page (Editar / Subir adjuntos / Eliminar) dispatch into `DialogMode`: `setDialogMode({ kind: "editar", target: incidencia })`, etc.
  - One `<Dialog>` root renders by discriminated union over `dialogMode.kind`. The existing `rechazar-incidencia-dialog` inner form is preserved (only the outer `Dialog` open/close state is refactored, per design note).
  - `AbortController` on `cargarDetalle` effect: navigate-away cancels the request (mirrors the Slice B pattern).
  - Success toast: `<Alert variant="default">` rendered at top of main content with `toastTimerRef` and 3000 ms auto-dismiss — appears on `crear`, `comentar`, `cambiar estado`, `aprobar`, `rechazar`, `actualizar`, `subirAdjuntos`, `eliminar`. Error toast: `<Alert variant="destructive">` with manual dismiss only (uses the existing `actionError` pattern for in-card failures).
  - On `eliminar` success, page navigates to `/incidencias` and triggers a list refetch (parent `IncidenciasPage` receives the `onSuccess` callback).
  - All four Slice A bug fixes (B1–B4) remain verified.
  - TS compiles; lint clean.
  - Manual smoke: full 29-item walkthrough per design §12 manual smoke checklist — every action button on the detalle page opens the correct dialog, submits, succeeds, and shows the expected toast; rejection and validation failures stay inline; navigating away mid-load aborts the request.
- Slice: C
- Commit message: `feat(incidencias): wire 3 new dialogs + toast + AbortController in detalle`

---

## Slice D — UX polish + role UI + verification (~530 LOC)

Closes out the change by wiring role-based UI gates, polishing the table (UUID → name resolution, real sort), giving the sidebar a real `estadoProceso` badge + specific icons, converting the historial card into a real timeline, and adding the verification report.

> **LOC warning**: Slice D is ~530 LOC — ~130 over the 400-line budget. **Recommended split** (orchestrator surfaces at apply time):
>
> - **PR? — D1** — tasks 14 + 15 (role-based UI + table UUID/sort polish) → ~170 LOC, under budget.
> - **PR? — D2** — tasks 16 + 17 + 18 (sidebar badge/icons + timeline + adjuntos card) → ~180 LOC, under budget.
> - Task 19 (verification report) rolls into whichever PR is last.
>
> Alternative: keep as a single PR with `size:exception` (≈530 LOC, ≈130 over budget). Acceptable but less reviewable than the split.

### 14. Role-based UI gating

- Files: `frontend/src/pages/incidencias/components/incidencias-table.tsx` (~+40 LOC — gate Editar/Eliminar actions per row), `frontend/src/pages/incidencias/detalle/index.tsx` (~+40 LOC — gate Editar, Aprobar/Rechazar, Cambiar estado, Eliminar sections), `frontend/src/pages/incidencias/components/nueva-incidencia-view.tsx` (~+10 LOC — gate action buttons in the new flow if any role restrictions apply)
- LOC estimate: ~+90
- Dependencies: 13
- Acceptance:
  - `useAuthStore.user.rol` drives visibility per the spec's role matrix:
    - `USUARIO`: only the "Comentarios" form + viewing.
    - `AGENTE`: above + Editar + Aprobar + Rechazar + Cambiar estado (no Eliminar).
    - `ADMINISTRADOR`: all of the above + Eliminar (per `sistemaincidencias/AGENTS.md` canonical role name; verified against the seed).
  - Backend authorization gaps (B8, B9) remain — UI gates only. A direct API call with the wrong role still succeeds against the current backend; the spec calls this out and the apply phase must NOT claim backend enforcement.
  - TS compiles; lint clean.
  - Manual smoke: log in as each of the three roles and verify that the buttons in the matching matrix appear/hide correctly. Non-admin users do NOT see "Eliminar" anywhere.
- Slice: D
- Commit message: `feat(incidencias): role-based UI gating (USUARIO/AGENTE/ADMIN)`

### 15. Table: UUID → name resolution + real client-side sort

- Files: `frontend/src/pages/incidencias/components/incidencias-table.tsx` (~+80 LOC)
- LOC estimate: ~+80
- Dependencies: 14
- Acceptance:
  - The "Asignado" column displays the user's full name (or "Sin asignar" when `asignadoA === null`), resolved from a lookup the page passes in (`{ usuarios: UsuarioCatalogo[]; asignadoA?: { id: string; nombre: string } | null }`). No raw UUIDs in the UI.
  - Click on the column header for `Título`, `Fecha de creación`, or `Prioridad` cycles asc → desc → none (matches the cycle the proposal locked in §4-f).
  - Sort is client-side over the currently-fetched page (no extra fetch needed); the state lives in `incidencias/index.tsx` and is passed to the table.
  - The header indicator (▲/▼) and `aria-sort` attribute reflect the active sort state.
  - TS compiles; lint clean.
  - Manual smoke: click "Título" — rows reorder alphabetically A→Z; click again — Z→A. Assignment cell shows a name, not a UUID.
- Slice: D
- Commit message: `feat(incidencias): UUID resolution + client-side sort in table`

### 16. Sidebar: `estadoProceso` badge + specific icons

- Files: `frontend/src/pages/incidencias/detalle/components/incidencia-sidebar.tsx` (~+60 LOC)
- LOC estimate: ~+60
- Dependencies: 8
- Acceptance:
  - The sidebar shows BOTH the `estadoAprobacion` badge (existing) AND the new `estadoProceso` badge (rendered via the new `IncidenciaEstadoProcesoBadge` from task 8) so the page exposes the full state machine.
  - Each row gets a field-specific icon (from the design's confirmed-available `lucide-react` roster): `User` for "Reportado por", `Briefcase` for "Asignado a", `Tag` for "Categoría", `Building2` for "Aplicativo", `KeyRound` (or `AlertTriangle`) for "Prioridad", `CalendarDays` for "Fecha de creación". No more monotematic `Calendar` icons everywhere.
  - TS compiles; lint clean.
  - Manual smoke: open any `Incidencia` detalle; the sidebar shows specific icons per field and both state badges are visible.
- Slice: D
- Commit message: `feat(incidencias): sidebar with estadoProceso badge + specific icons`

### 17. Historial as timeline with transitions

- Files: `frontend/src/pages/incidencias/detalle/components/incidencia-actividad-card.tsx` (~+80 LOC)
- LOC estimate: ~+80
- Dependencies: 8
- Acceptance:
  - The actividad card renders `incidencia.historial` as a vertical timeline: vertical line on the left, each entry gets a circular node with an action-specific icon.
  - Icon mapping (from the design's roster): `Plus` for `CREADA`, `Pencil` for `EDITADA`, `ArrowRight` for `CAMBIO_ESTADO` (with body rendering `{anterior} → {nuevo}` transition), `Check` for `APROBADA`, `X` for `RECHAZADA`, `MessageSquare` for `COMENTARIO_AGREGADO`, `Paperclip` for `ADJUNTO_AGREGADO`, `Trash2` for `ELIMINADA`.
  - Each row carries the timestamp (`h.fecha`) and the user name where applicable (`h.usuario.nombre`).
  - When `h.nota` is present (RECHAZADA, COMENTARIO_AGREGADO) it's rendered under the timestamp in italic muted text.
  - TS compiles; lint clean.
  - Manual smoke: an `Incidencia` with multiple historial entries (created → edited → comment → estado change → finalized) shows the timeline in order with correct icons and the `CAMBIO_ESTADO` transitions read as `Pendiente → En proceso`, `En proceso → Finalizada`.
- Slice: D
- Commit message: `feat(incidencias): historial as timeline with state transitions`

### 18. Adjuntos card: "Añadir adjuntos" button

- Files: `frontend/src/pages/incidencias/detalle/components/incidencia-adjuntos-card.tsx` (~+40 LOC)
- LOC estimate: ~+40
- Dependencies: 11
- Acceptance:
  - The adjuntos card renders an "Añadir adjuntos" button (`<Button variant="outline">` with `Paperclip`/`Upload` icon) at the top-right, visible only to authorized roles per task 14's gate.
  - Click opens `SubirAdjuntosDialog` via the parent's `dialogMode` setter: `setDialogMode({ kind: "subirAdjuntos", target: incidencia })`.
  - On dialog success, the adjuntos list refetches (the parent's `onSuccess` callback already exists from Slice C task 13).
  - TS compiles; lint clean.
  - Manual smoke: an `AGENTE` or `ADMINISTRADOR` user sees the "Añadir adjuntos" button; a `USUARIO` does not.
- Slice: D
- Commit message: `feat(incidencias): añadir adjuntos button on adjuntos card`

### 19. Verification (lint + build + manual smoke)

- Files: `openspec/changes/incidencias-phase2-3/verify-report.md` (NEW, optional)
- LOC estimate: 0 source
- Dependencies: 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18
- Acceptance (mapping to spec REQ-1..16 + NFR-1..8 and the design's 29-item manual smoke checklist):
  - `cd frontend && npm run lint` exits 0.
  - `cd frontend && npm run build` exits 0.
  - Manual smoke (verified against `http://127.0.0.1:5173/` with the backend running):
    - B1–B4 each fixed and verified against the live API.
    - List page: navigation works, debounced search filters, role + estado + prioridad filters apply, UUIDs are resolved to user names, sort works, pagination works, AbortController cancels stale requests.
    - Detalle page: every action button (Editar / Subir adjuntos / Cambiar estado / Aprobar / Rechazar / Eliminar) opens the correct dialog; submitting succeeds; success toast shows; the page refetches.
    - Role gates: logging in as `USUARIO` / `AGENTE` / `ADMINISTRADOR` matches the matrix in task 14.
    - Adjuntos card: "Añadir adjuntos" visible to AGENTE / ADMINISTRADOR; new files persist and re-render in the card.
    - Historial card: timeline shows correct icons and `{anterior} → {nuevo}` transitions.
    - Sidebar: both state badges visible, icons are field-specific.
    - No console errors in DevTools during the walkthrough.
  - The verify report is rolled into the apply phase as a `docs(incidencias): manual smoke verification checklist` commit (no application code touched in this task).
- Slice: D
- Commit message: `docs(incidencias): manual smoke verification checklist`

---

## PR strategy (chained PRs recommended)

| PR | Slices | Tasks | LOC estimate | Risk |
|----|--------|-------|--------------|------|
| PR1 | A | 1, 2, 3, 4 | ~120 | Low — isolated bug fixes. |
| PR2 | B | 5, 6, 7, 8, 9 | ~530 | Medium — slightly over 400 budget; orchestrator should surface options below. |
| PR3 | C1 | 10 | ~280 | Low — single new dialog. |
| PR4 | C2 | 11, 12 | ~290 | Low — two new dialogs, no wiring. |
| PR5 | C3 (wiring) | 13 | ~400 | Medium — biggest single file edit; at budget edge. |
| PR6 | D | 14, 15, 16, 17, 18, 19 | ~530 | Medium — slightly over budget; orchestrator should surface options below. |

If the 6-PR chain feels heavy, alternative groupings are all viable (this document tracks the 19-task work units; the orchestrator / apply phase collapses them into PRs at merge time):

- **3-PR with `size:exception`** — PR1 = Slice A (120), PR2 = Slice B + C (~1500, ~275% over budget), PR3 = Slice D + verification (~530, ~33% over budget). Smallest PR count, worst review surface.
- **4-PR with mid-size `size:exception`** — PR1 = A, PR2 = B, PR3 = C, PR4 = D + verification. Matches the slices 1:1. Over-budget on PR2 (+130), PR3 (+570), PR4 (+130). User accepts three `size:exception` notes.
- **6-PR chained (recommended)** — splits C and D into mid-sized PRs to keep each PR close to or under the 400-line budget; the verify report rolls into the last PR. Matches the table above.

### Decision needed before apply

The orchestrator must pause after this tasks file is written and ask the user to pick one of:

1. **chained-prs (recommended, 6 PRs)** — each PR ≤ 400 LOC (PR2 and PR6 still ~130 over; PR5 sits on the edge). Highest review quality.
2. **chained-prs (4 PRs by slice)** — `size:exception` documented once per over-budget PR. Lower PR count, each one larger.
3. **Single-chain (3 PRs)** — `size:exception` documented for the largest PR. Lightest PR overhead, heaviest reviewer load.

Apply phase must **NOT** begin until the user picks a strategy. Once chosen, the orchestrator sets `delivery_strategy` and `chain_strategy` in engram and the apply agent groups tasks into PRs accordingly.

---

## Cross-slice invariants

- Every service method that performs a fetch accepts `{ signal?: AbortSignal }` and forwards it (no manual `fetch` calls).
- All visible state changes after a mutation go through a refetch — no stale optimistic state.
- Every destructive action uses `<Button variant="destructive">` with the lucide `Trash2` icon.
- All icons come from the design-confirmed roster only (`Plus`, `Pencil`, `ArrowRight`, `Check`, `X`, `MessageSquare`, `Paperclip`, `User`, `Briefcase`, `Tag`, `Building2`, `Clock`, `CalendarDays`, `AlertTriangle`, `Trash2`, `KeyRound`, `MoreHorizontal`, `Upload`). No `Calendar` for non-date fields.
- Toast at top of main content (success path); destructive errors stay inline within their card.
- Role strings always use `ADMINISTRADOR` / `AGENTE` / `USUARIO` (canonical, per `sistemaincidencias/AGENTS.md`).
