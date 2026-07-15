# Proposal: Fix critical bugs + complete missing incident flows + UX polish

## 1. Title & metadata

| Field | Value |
| --- | --- |
| **Title** | Fix critical bugs + complete missing incident flows + UX polish |
| **Change name** | `incidencias-phase2-3` |
| **Status** | proposed |
| **Owner** | orchestrator |
| **Date** | 2026-07-14 |
| **Related exploration** | `openspec/changes/incidencias-phase2-3/exploration.md` |
| **Related memories** | `sdd/incidencias-phase2-3/explore`, `sdd/incidencias-phase2-3/preflight`, `sdd/users-admin-page/design`, `sdd/users-admin-page/verify-report` |
| **Scope** | Frontend only. No backend changes. |
| **Delivery mode** | automatic (assumptions documented, no clarifying questions asked) |
| **Pace** | auto |
| **Artifact store** | both (engram + openspec) |
| **Delivery strategy** | ask-on-risk |
| **Review budget** | 400 lines |

## 2. Why

The Incidencias (incidents) module is the heart of the application — it is the destination of every record created by the rest of the system — but currently ships with:

- **4 bugs causing silent failures**:
  - **B1**: adjuntos are dropped silently when creating an incidencia (`handleArchivos` does not call `setArchivos`).
  - **B2**: a `console.log("[DEBUG service]...")` is left in `incidents-service.ts`.
  - **B3**: `motivoRechazo` shows `undefined` because the field is declared on the `Incidencia` TypeScript type but the backend `IncidenciaResponse` does not include it; the actual rejection reason lives in `incidencia.historial` entries with `accion === "RECHAZADA"`.
  - **B4**: "Mover a Finalizada" never appears because `siguienteEstadoProceso` filters out terminal states.
- **3 incomplete UI flows**: Editar (PUT exists), Subir adjuntos a existente (POST exists), Eliminar (DELETE exists). Backend endpoints are implemented; the frontend just never wires them.
- **Race conditions + UX gaps** compared to the recently-shipped `/usuarios` page: no AbortController on fetches, no debounce on the `texto` filter, no post-action success toast, no role-based UI gating, sidebar monotematic icons, UUIDs displayed raw in the table, sort buttons dead, no timeline view for historial.

This change is **frontend-only**. The backend contracts are stable and already cover the full surface — the Postman collection is the source of truth.

## 3. What changes

### 3.1 Service extension: `frontend/src/services/incidents-service.ts`

Grow from 6 → 9 methods. All methods use `src/lib/http.ts` (via `apiRequest`) and read base URL from `VITE_API_URL` (already wired). Auth header is added by the `http.ts` interceptor.

| # | Method | HTTP | Path | Body | Purpose |
| - | --- | --- | --- | --- | --- |
| 1 | `listar(filtros, signal?)` | GET | `/api/incidencias{?query}` | — | existing |
| 2 | `obtenerDetalle(id, signal?)` | GET | `/api/incidencias/{id}` | — | existing |
| 3 | `crear(input)` | POST | `/api/incidencias` | `multipart/form-data` | existing |
| 4 | `aprobarRechazar(id, accion, input)` | PATCH | `/api/incidencias/{id}/aprobacion?accion=` | JSON | existing |
| 5 | `cambiarEstado(id, input)` | PATCH | `/api/incidencias/{id}/estado` | JSON | existing |
| 6 | `agregarComentario(id, input)` | POST | `/api/incidencias/{id}/comentarios` | JSON | existing |
| 7 | **`actualizar(id, input, signal?)`** | PUT | `/api/incidencias/{id}` | JSON or multipart (when `archivos` is non-empty) | **new** — supports editing fields AND uploading new adjuntos in the same call |
| 8 | **`subirAdjuntos(id, files, signal?)`** | POST | `/api/incidencias/{id}/adjuntos` | multipart (field `archivos`, repeatable) | **new** — appends to existing adjuntos |
| 9 | **`eliminar(id, signal?)`** | DELETE | `/api/incidencias/{id}` | — | **new** — soft-delete cascade (comentarios, adjuntos, historial) |

### 3.2 New types

Extend `frontend/src/types/incidencias.ts` (small additions only — no breaking changes):

```ts
export type ActualizarIncidenciaInput = {
  titulo?: string
  descripcion?: string
  clienteId?: string
  categoriaId?: string
  prioridad?: Prioridad
  asignadoA?: string | null
  archivos?: File[] // optional — when present, PUT is sent as multipart
}

export type SubirAdjuntosInput = {
  archivos: File[]
}
```

Fix **B3**: drop `motivoRechazo?: string | null` from `Incidencia`. The rejection reason lives in the historial entry accessed via:

```ts
incidencia.historial.find(h => h.accion === "RECHAZADA")?.nota
```

UI consumers in `detalle/index.tsx` and the new `incidencia-actividad-card` will read from there.

### 3.3 New dialogs (under `frontend/src/pages/incidencias/components/`)

Per the `gestincidencias-frontend` skill conventions:

```
frontend/src/pages/incidencias/components/
  editar-incidencia-dialog.tsx          # ~180 LOC — modern shadcn Field, JSON OR multipart body
  subir-adjuntos-dialog.tsx            # ~150 LOC — drag&drop + multi-file, per-file progress
  confirmar-eliminar-incidencia-dialog.tsx  # ~70 LOC — destructive confirmation
```

Each dialog:

- Uses shadcn `Dialog`, `Field`, `Button`, `Alert` (already installed).
- Uses lucide icons (confirmed-only list, see §6).
- Receives the current `Incidencia` (or `IncidenciaDetalle`) and triggers the matching service method on submit.
- Reports success/failure to the parent (toast + refetch on success, inline destructive Alert on failure).

### 3.4 Component extraction

Refactor existing fat files into smaller, page-local components:

| Source file | Extracted components |
| --- | --- |
| `frontend/src/pages/incidencias/index.tsx` (237 LOC) | `IncidenciasHeader`, `IncidenciasPagination` |
| `frontend/src/pages/incidencias/detalle/index.tsx` (534 LOC) | `EditarIncidenciaDialog` (imported from components/), `ConfirmarEliminarIncidenciaDialog`, `SubirAdjuntosDialog`, `IncidenciaAccionesCard` (or equivalent) |

Goal: `index.tsx` files stay under ~200 LOC for readability. Mirrors the `/usuarios` refactor pattern.

### 3.5 Bug fixes (Phase 1, blockers)

| ID | File | Change |
| --- | --- | --- |
| **B1** | `nueva-incidencia-view.tsx:100-106` | Fix `handleArchivos` so it actually calls `setArchivos(prev => [...prev, ...Array.from(event.target.files ?? [])])`. Also reset `event.target.value = ""` so re-picking the same file works. |
| **B2** | `incidents-service.ts:72-76` | Remove the `console.log("[DEBUG service] crear() input.archivos:", ...)` block. |
| **B3** | `types/incidencias.ts:16` | Drop `motivoRechazo?: string \| null` from `Incidencia`. Update consumers to read from `incidencia.historial` instead. |
| **B4** | `detalle/index.tsx:523-534` | Fix `siguienteEstadoProceso` to include terminal states (so `FINALIZADA` becomes selectable when permitted by the order diff rule). Verify against the backend `estadoProcesoService.orden` ladder. |

### 3.6 UX polish (Phase 3)

Adopt patterns from the recently-shipped `/usuarios` page:

- **Race-free fetches**: convert `cargarDetalle` and the `incidencias/index.tsx` `useEffect` to the **AbortController** pattern (`usuarios/index.tsx:101-121, 129-171`).
- **Debounce**: add `debounceRef` + `SEARCH_DEBOUNCE_MS = 300` for the `texto` filter in `incidencias-filters.tsx`.
- **Toast on success**: add a top-of-content `Alert variant="default"` with `toastTimerRef` (3s auto-dismiss) for: crear, comentar, cambiar estado, aprobar, rechazar, eliminar. Pattern from `usuarios/index.tsx:49-86`. Errors keep using the inline destructive Alert.
- **Role-based UI**: wire `useAuthStore.user.rol` (already exists) to conditionally show:
  - Edit button — only `ADMIN` or `AGENTE`
  - Eliminar button — only `ADMIN`
  - Aprobar / Rechazar — only `ADMIN` or `AGENTE`
  - Comentarios — all roles
- **Table**: resolve `asignadoA` UUID to user name via the existing `usuarios` catalog (mirrors `usuarios-table.tsx`).
- **Sidebar**: add `estadoProcesoBadge`; replace monotematic `Calendar` icons with specific icons per row (`User`, `Briefcase`, `Tag`, `Building2`, etc.).
- **Actividad card**: convert to a timeline with action icons (`Plus`, `Pencil`, `ArrowRight`, `Check`, `X`, `MessageSquare`, `Paperclip`); resolve `estadoProcesoAnteriorId`/`Nuevo` against `estadosProceso`.
- **Sort**: implement real client-side sort by `titulo`, `creadoEn`, `prioridad` in `incidencias-table.tsx`. Backend already sorts by `creado_en DESC`; new sort options re-sort the fetched page client-side.

### 3.7 Files modified

| File | Reason |
| --- | --- |
| `frontend/src/services/incidents-service.ts` | 6 → 9 methods + AbortSignal params + remove B2 console.log |
| `frontend/src/pages/incidencias/index.tsx` | Refactor + AbortController + bug B4 if exposed here |
| `frontend/src/pages/incidencias/detalle/index.tsx` | Extensive: dialog wiring + bug B4 + toast + role-based UI |
| `frontend/src/pages/incidencias/components/nueva-incidencia-view.tsx` | Bug B1 (handleArchivos) |
| `frontend/src/pages/incidencias/components/incidencias-filters.tsx` | Debounce + role-based visibility (if applicable) |
| `frontend/src/pages/incidencias/components/incidencias-table.tsx` | Sort + UUID → user name resolution |
| `frontend/src/pages/incidencias/detalle/components/incidencia-actividad-card.tsx` | Timeline + action icons |
| `frontend/src/pages/incidencias/detalle/components/incidencia-sidebar.tsx` | Per-row icons + estadoProceso badge |
| `frontend/src/types/incidencias.ts` | Bug B3 (drop `motivoRechazo`) + new `ActualizarIncidenciaInput`, `SubirAdjuntosInput` |

### 3.8 Files added

Under `frontend/src/pages/incidencias/components/`:

- `editar-incidencia-dialog.tsx`
- `subir-adjuntos-dialog.tsx`
- `confirmar-eliminar-incidencia-dialog.tsx`
- `incidencias-header.tsx` (extracted from `index.tsx`)
- `incidencias-pagination.tsx` (extracted from `index.tsx`)
- `estado-proceso-badge.tsx` (page-local, only used in sidebar/activity)

## 4. Open questions — RESOLVED AS ASSUMPTIONS

The exploration surfaced 9 decisions that, under `auto` pace, are resolved as assumptions and documented here for traceability:

a. **Should editar open in a dialog or replace the current view?** → **ASSUMPTION: dialog** (same pattern as `usuario-form-dialog.tsx`). Keeps the detail page visible underneath for context.

b. **Subir adjuntos dialog: drag&drop or just file input?** → **ASSUMPTION: drag&drop zone + "click to browse" fallback + file list with remove button + per-file progress bar**.

c. **Eliminar confirmation: dialog text content?** → **ASSUMPTION: "¿Eliminar la incidencia {codigo}? Esta acción no se puede deshacer."** + secondary text explaining cascade (comentarios, adjuntos, historial se borran). Destructive button styled red.

d. **Role-based UI for edit/eliminate buttons: where to source role?** → **ASSUMPTION: `useAuthStore.user.rol`** (already exists from `auth-store.ts`). Single source of truth.

e. **Toast for what actions?** → **ASSUMPTION**: toast on `crear`, `comentar`, `cambiar estado`, `aprobar`, `rechazar`, `eliminar` (success path). Errors use the existing destructive Alert inline. Pattern: `Alert variant="default"` auto-dismiss 3s at top of page.

f. **Sort implementation: client-side or server-side?** → **ASSUMPTION: client-side**. Backend already sorts by `creado_en DESC`. New sort options re-sort the fetched page client-side. (Sorting across pages would require server-side support — out of scope.)

g. **Where to put `estadoProcesoBadge` component?** → **ASSUMPTION**: `frontend/src/pages/incidencias/components/estado-proceso-badge.tsx` (page-local, since it's only used in sidebar/activity).

h. **Toast position relative to existing `actionError` Alert?** → **ASSUMPTION: toast at top of main content area, `actionError` stays inline within its card**. They serve different purposes (transient vs contextual).

i. **Edit dialog: support adding new adjuntos during edit?** → **ASSUMPTION: yes**. PUT supports multipart. User can add new files during edit (existing ones preserved per backend).

## 5. Out of scope (explicit non-requirements)

- **Backend authorization fix on `IncidenciaController`** (B8)
- **Backend PUT validation against estado terminal/rechazada** (B9)
- **Notificaciones reales** (backend inserts in `notificaciones` table)
- **`DELETE /api/incidencias/{id}/adjuntos/{adjuntoId}` endpoint** (no backend support)
- **`motivoRechazo` agregado a `IncidenciaResponse`** (contract change)
- **Editar comentario propio / eliminar comentario**
- **Self-profile / change-own-password**
- **Roles CRUD UI**
- **My-profile**

## 6. Dependencies

- Backend running locally for manual smoke (Spring Boot + PostgreSQL). The Postman collection is the contract source.
- shadcn primitives already installed: `alert`, `avatar`, `badge`, `button`, `card`, `dialog`, `field`, `input`, `label`, `separator`, `spinner`, `table`. **No new shadcn install required.**
- `lucide-react@1.17.0` — only use confirmed icons: `Plus`, `Pencil`, `ArrowRight`, `Check`, `X`, `MessageSquare`, `Paperclip`, `User`, `Briefcase`, `Tag`, `Building2`, `AlertTriangle`, `Trash2`, `KeyRound`. Verify each before commit.
- **No new npm packages.**

## 7. Risk & review workload forecast

- **Estimated changed lines**: **~1500-2000** (4 services + 3 dialogs + extensive refactor + bug fixes + polish).
- **Likely exceeds 400-line review budget**.
- Per `ask-on-risk` delivery strategy, the orchestrator will pause at tasks phase and ask: **chained PRs OR `size:exception`**.
- **Functional risks**:
  - **B1 (handleArchivos)** might have been "intentional" by the previous author — confirm semantics before changing (read git blame if available; verify the file is not used in any flow that expects the current behaviour).
  - **State machine for `siguienteEstadoProceso`** (B4) needs careful review — must match the backend order diff ≤ 1 rule and the terminal-state semantics.
  - **Refactor of `detalle/index.tsx`** from 534 LOC to smaller components risks breaking wiring (state, refs, callbacks). Verify with manual smoke.
  - **Multipart PUT** for `actualizar` is less common than JSON PUT; verify the backend accepts multipart at `PUT /api/incidencias/{id}` (read the controller method + Postman entry).
- **Non-risks** (validated):
  - No backend changes.
  - No breaking API contract changes (only internal TypeScript adjustments — `motivoRechazo` field was a TypeScript-only lie, never round-tripped from the backend).
  - No auth model changes.
  - All shadcn primitives needed are already installed.

## 8. Acceptance criteria (high-level — refined in spec phase)

- All 4 bugs fixed and verified: handleArchivos persists files, no `console.log`, `motivoRechazo` shows correctly from historial, "Mover a Finalizada" appears.
- Editar dialog opens, prefills, submits PUT (JSON or multipart), refetches detalle, toast shown.
- Subir adjuntos dialog accepts multi-file with drag&drop, shows progress, submits POST, refetches detalle.
- Eliminar dialog asks for confirmation, submits DELETE, redirects to list, toast shown.
- List and detalle use `AbortController` for race-free fetches.
- Filters debounce `texto` (300ms).
- All success actions show toast (crear, comentar, cambiar estado, aprobar, rechazar, eliminar).
- Edit button hidden for `USUARIO` role; Eliminar button hidden for `USUARIO` role; Aprobar/Rechazar hidden for `USUARIO` role.
- Table shows user names (not UUIDs) in Asignado column.
- Sidebar shows both `estadoAprobacion` and `estadoProceso` badges.
- Historial shows as a timeline with action icons + resolved state transitions.
- Sort buttons functional for `titulo`, `creadoEn`, `prioridad`.
- `npm run lint` and `npm run build` pass clean.
- Manual smoke walkthrough against running backend exercises: create, edit, change state to `FINALIZADA`, subir adjuntos, eliminar.

## 9. Follow-ups (separate future changes)

- **Backend**: B8 (auth on `IncidenciaController`), B9 (validar PUT contra estado terminal), notificaciones reales, DELETE adjunto, `motivoRechazo` en `IncidenciaResponse`.
- **Frontend**: editar/eliminar comentarios, my-profile, roles CRUD UI.

## 10. References

- Reference design (recently-shipped pattern): `openspec/changes/archive/users-admin-page/design.md`
- Reference verify: `openspec/changes/archive/users-admin-page/verify-report.md`
- Engram topics: `sdd/users-admin-page/design`, `sdd/users-admin-page/verify-report`, `sdd/incidencias-phase2-3/explore`, `sdd/incidencias-phase2-3/preflight`
- Skill: `gestincidencias-frontend` (frontend conventions, Postman as contract source)
