# Tasks — users-admin-page

> Slice boundaries, dependency graph, and acceptance for the frontend user-management admin page.
> Source: `proposal.md` (Approach 2: Prev/Next + counter) + `design.md` (4-slice work-unit plan) + `specs/usuarios/spec.md` (REQ-1..12, NFR-1..6).

## Forecast

| Slice | Tasks | LOC (target / ceiling) | Reviewable? |
|-------|-------|------------------------|-------------|
| A — Foundation | 1, 2, 3, 4, 5 | ~200 / ~310 | Yes, isolated. |
| B — List view | 6, 7, 8, 9, 10 | ~400 / ~440 (after Option B1 trim) | Borderline; orchestrator will surface PR strategy to the user. |
| C — Dialogs | 11, 12, 13 | ~370 | Yes. |
| D — Verification | 14 | 0 source (smoke checklist only) | n/a (rolls into PR3 verify step). |

Recommended PR strategy: 3 chained PRs (Slice A → Slice B → Slice C with Slice D as a verification checklist appended to PR3). Slice B will still exceed the 400-line review budget after the recommended trim; orchestrator should ask the user to choose between chained PRs and a documented `size:exception` before apply begins.

Conventions: every commit follows Conventional Commits; each task ends with the repo in a buildable state; `frontend/AGENTS.md` and `gestincidencias-frontend` skill are the layout authority.

---

## Slice A — Foundation

Locks down the dependency chain: `lib/http.ts` → types → services → router/sidebar → page scaffold. Each task is small and isolated, so PR1 (Slice A) is a safe, reviewable drop.

### 1. Add AbortSignal forwarding to `lib/http.ts`

- Files: `frontend/src/lib/http.ts`
- LOC: ~3 added
- Dependencies: none
- Acceptance:
  - `RequestOptions` extends `RequestInit & { token?: string | null }` (no change) plus a new `signal?: AbortSignal` is forwarded to `fetch(...)`.
  - TS typecheck passes (`npm run build`).
  - Manual smoke: any caller passing an `AbortSignal` from `AbortController` cancels the in-flight `fetch` when the controller aborts (slice A task 5 wires the first such caller; this task is the prerequisite).
- Slice: A
- Commit message: `fix(http): forward AbortSignal to fetch`

### 2. Define frontend types matching backend DTOs

- Files: `frontend/src/types/usuarios.ts` (extend the existing 18-byte stub), `frontend/src/types/roles.ts` (NEW)
- LOC: ~65 added
- Dependencies: 1
- Acceptance:
  - `Usuario` gains the admin-page fields used by the table/filters: `Rol` becomes a flat object `{ codigo: string; nombre: string }` (keep the existing `Rol.id` if reused elsewhere or split it into `RolDto` for the list response and `RolCatalogo` for the dropdown).
  - New request payloads: `CrearUsuarioRequest`, `ActualizarUsuarioRequest`, `CambiarPasswordRequest`.
  - New response types: `ListarUsuariosParams`, `PageState<T>` (items + offset/limit used by the local Prev/Next controller), `ApiErrorMensaje` (alias for `{ mensaje: string }` if the existing inline shape ever moves).
  - `roles.ts` exports `RolCatalogo = { codigo: string; nombre: string }` (or whatever the GET /api/roles response actually is — confirm via Postman).
  - No `any`. TS compiles with zero errors.
- Slice: A
- Commit message: `feat(usuarios): add frontend types mirroring backend DTOs`

### 3. Extend `usuarios-service` to 7 methods and create `roles-service`

- Files: `frontend/src/services/usuarios-service.ts` (extend the 8-byte stub), `frontend/src/services/roles-service.ts` (NEW)
- LOC: ~120 added
- Dependencies: 2
- Acceptance:
  - `usuariosService.listar(params)` keeps the existing call but takes `{ q?, rolCodigo?, activo?, page?, limit?, signal? }` and builds query via `URLSearchParams`.
  - Six new methods, each with a typed signature and passing `signal` through:
    - `obtenerPorId(id, { signal? })`
    - `crear(payload, { signal? })`
    - `actualizar(id, payload, { signal? })`
    - `cambiarPassword(id, payload, { signal? })`
    - `alternarActivo(id, { signal? })`
  - `rolesService.listar({ signal? })` returns `RolCatalogo[]` and is the **only** exported method (no `obtener` per design learning).
  - Each method is `await apiRequest<T>(...)`, never raw `fetch`.
  - No consumer yet (page doesn't exist) — the typecheck verifies the signatures, integration is verified in Slice B/C.
- Slice: A
- Commit message: `feat(usuarios): add 7 admin service methods + roles service`

### 4. Enable sidebar `Usuarios` link and register `/usuarios` route

- Files: `frontend/src/layout/app-sidebar.tsx` (~1 LOC — set `to: "/usuarios"` on the existing `{ label: "Usuarios", icon: Users }` entry), `frontend/src/router.tsx` (~10 LOC — add a `usuariosRoute` patterned on `categoriasRoute`)
- LOC: ~11 added
- Dependencies: none (route can point at a placeholder component that renders `<div>Cargando…</div>` until task 5 ships the real page)
- Acceptance:
  - Navigating to `http://127.0.0.1:5173/usuarios` does NOT 404 — it renders the placeholder inside `AppLayout` + `PrivateRoute`.
  - Sidebar item is clickable and active-state styling works (`to` is set).
  - No regressions on other routes (`/dashboard`, `/incidencias`, `/clientes`, `/categorias`).
- Slice: A
- Commit message: `feat(router): register /usuarios route and enable sidebar link`

### 5. Create page folder, page-local types, and composition skeleton

- Files: `frontend/src/pages/usuarios/index.tsx` (NEW, ~80 LOC stub), `frontend/src/pages/usuarios/types.ts` (NEW, ~30 LOC)
- LOC: ~110 added
- Dependencies: 3, 4
- Acceptance:
  - Folder structure matches the skill template: `pages/usuarios/{index.tsx,types.ts,components/}`.
  - `index.tsx` declares the page-local state hooks (e.g., `filters`, `page`, `status`, `forbidden`, the `AbortController` ref), an effect that calls `usuariosService.listar(...)` once on mount, and renders a heading + four placeholder `<div>`s (header / filters / table / pagination) where Slice B components will mount.
  - `types.ts` holds page-local view models (e.g., `UsuariosFilters`, `DialogMode`, `AlertState`) NOT mirrored in `types/usuarios.ts`.
  - First list call works, renders "No hay usuarios" or row placeholders. No UI components yet.
  - No other page imports from this folder.
- Slice: A
- Commit message: `feat(usuarios): scaffold page with state and data wiring`

---

## Slice B — List view (header, filters, table, pagination, 403)

Implements the read path. Once PR2 lands, an admin can open `/usuarios`, search/filter/paginate, and a non-admin sees the 403 in-page state.

> **LOC note**: Slice B as drafted estimates ~510 LOC. Option B1 (recommended) tightens the filters component to ~90 LOC ceiling and trims the wiring in task 10 by ~40 LOC (skip the auto-focus on first input, drop the explicit empty-state copy variant, fold the "limpiar filtros" inline button into the page-level effect). After B1, Slice B lands at ~440 LOC — still over the 400-line review budget. The orchestrator will surface this and ask for the user's call (chained PRs vs. `size:exception`) before apply begins.

### 6. `UsuariosHeader` component (counter + `Nuevo Usuario` CTA)

- Files: `frontend/src/pages/usuarios/components/usuarios-header.tsx` (NEW)
- LOC: ~50
- Dependencies: 5
- Acceptance:
  - Props: `{ totalShown: number; onNuevo: () => void }`.
  - Renders an `h1` ("Usuarios"), the counter `Mostrando ${totalShown}` and a `<Button>` labelled "Nuevo Usuario" with `Plus` icon from `lucide-react`.
  - Counter updates when the list shrinks/grows (verified by manually toggling `limit`).
- Slice: B
- Commit message: `feat(usuarios): header with counter and Nuevo Usuario CTA`

### 7. `UsuariosFilters` component (debounced search + rol select + activo switch)

- Files: `frontend/src/pages/usuarios/components/usuarios-filters.tsx` (NEW)
- LOC: ~90 (Option B1 ceiling — down from ~200 if full polish)
- Dependencies: 5
- Acceptance:
  - Props: `{ value: UsuariosFilters; onChange: (next) => void; roles: RolCatalogo[]; loading: boolean }`.
  - Three controls: search input (`Search` icon, 300 ms debounce), rol `<select>` (native, populated from `roles`), activo toggle (`Switch` shadcn primitive).
  - Debounce implemented inline (no separate `useDebounce` hook, per B1 simplification) — `useEffect` + `setTimeout` within the component, local `pending` state mirrors `value`.
  - Rol dropdown disabled while `loading === true`.
  - The "clear filters" affordance is a single `<button type="reset">` on the wrapping `<form>` (no inline chip UI), per B1.
- Slice: B
- Commit message: `feat(usuarios): filters with debounced search, rol select, activo switch`

### 8. `UsuariosTable` component (avatar, badges, action icons)

- Files: `frontend/src/pages/usuarios/components/usuarios-table.tsx` (NEW)
- LOC: ~140
- Dependencies: 5
- Acceptance:
  - Props: `{ rows: Usuario[]; onEditar: (id) => void; onPassword: (id) => void; onToggleActivo: (id, activo) => void; currentUserId: string; currentUserIsAdmin: boolean }`.
  - Columns: `Avatar` (initials fallback, sourced from shadcn/ui) + name, email, rol badge, estado badge, three action buttons (`Pencil`, password icon (lucide `KeyRound` if present else `Lock`), `Power`/`PowerOff` based on `activo`).
  - The toggle button is disabled with `title="No puedes desactivar tu propio usuario administrador"` when `currentUserId === row.id && currentUserIsAdmin` (UI guard; backend 400 is the source of truth).
  - Empty-state renders the categories-page "—" pattern (`pages/categorias/index.tsx:330` precedent).
- Slice: B
- Commit message: `feat(usuarios): user table with avatar, badges, action icons`

### 9. `UsuariosPagination` component (Prev/Next + counter)

- Files: `frontend/src/pages/usuarios/components/usuarios-pagination.tsx` (NEW)
- LOC: ~60
- Dependencies: 5
- Acceptance:
  - Props: `{ page: number; limit: number; count: number; onPageChange: (page: number) => void }`.
  - Renders `Mostrando X–Y` (X = `page * limit + 1`, Y = `page * limit + count`, with X clamped to `0` when `count === 0`) plus `<Button>`s for `Prev` (`ChevronLeft`) and `Next` (`ChevronRight`).
  - Prev is disabled when `page === 0`. Next is disabled when `count < limit` (i.e., no more pages).
- Slice: B
- Commit message: `feat(usuarios): prev/next pagination with Mostrando X-Y counter`

### 10. `Usuario403` component and page wiring (filters + pagination + 403)

- Files: `frontend/src/pages/usuarios/components/usuario-403.tsx` (NEW, ~30), `frontend/src/pages/usuarios/index.tsx` (~70 lines added — wire header, filters, table, pagination, 403, AbortController cleanup)
- LOC: ~100 added
- Dependencies: 6, 7, 8, 9
- Acceptance:
  - `Usuario403` props: `{ onVolver: () => void }`. Renders an inline `Alert` with `AlertTriangle` icon, title "Acceso restringido", body "No tienes permisos para administrar usuarios.", and a `<Button>` labelled "Volver al dashboard".
  - `index.tsx` mounts the four Slice B components, wires the filter `onChange` to local state, the page navigation to the pagination component, and the toggle/edit/password callbacks to `console.log` placeholders (Slice C replaces those).
  - On a 403 from `usuariosService.listar(...)`, `index.tsx` sets `forbidden = true` and short-circuits to `<Usuario403>` instead of the table.
  - Effect cleanup aborts the in-flight `AbortController` so rapid filter typing cancels stale requests.
  - No regressions: previously passing REQ-8/REQ-9 (sidebar + router) from Slice A still pass.
- Slice: B
- Commit message: `feat(usuarios): wire list view with filters, pagination and 403 handling`

---

## Slice C — Dialogs and mutating flows

Replaces the console.log placeholders from Slice B with real dialogs (create/edit, password change, toggle-active) and adds an inline `Alert` toast substitute for success/error feedback.

### 11. `UsuarioFormDialog` (create + edit)

- Files: `frontend/src/pages/usuarios/components/usuario-form-dialog.tsx` (NEW)
- LOC: ~200
- Dependencies: 5
- Acceptance:
  - Props: `{ mode: "crear" | "editar"; open: boolean; onOpenChange: (open) => void; initial?: Usuario; roles: RolCatalogo[]; onSuccess: () => void; onError: (msg: string) => void }`.
  - Uses the `Dialog`/`Field`/`FieldLabel`/`FieldError`/`FieldGroup` shadcn primitives (login-form style, per NFR-1). No new shadcn installs.
  - Fields: `nombre`, `email`, `rolCodigo` (native `<select>`), `activo` (only in `mode === "editar"`). `password` only in `mode === "crear"` (min length 8; backend validates via 400).
  - Validation: client-side `required` + email shape + password length ≥ 8. On submit, calls `usuariosService.crear` or `usuariosService.actualizar`.
  - Backend `mensaje` is mapped to the offending field via `http.ts` (`payload.mensaje` → inline `FieldError`); full-page-level errors go through `onError`.
- Slice: C
- Commit message: `feat(usuarios): create+edit dialog with shadcn Field`

### 12. `UsuarioPasswordDialog` (admin-triggered reset)

- Files: `frontend/src/pages/usuarios/components/usuario-password-dialog.tsx` (NEW)
- LOC: ~100
- Dependencies: 5
- Acceptance:
  - Props: `{ open: boolean; onOpenChange: (open) => void; targetId: string; targetName: string; onSuccess: () => void; onError: (msg: string) => void }`.
  - Two `Field`s: `nuevaPassword` (min 8), `confirmarPassword` (must match).
  - Submit calls `usuariosService.cambiarPassword(id, { nuevaPassword })`.
  - Close + reset on success; inline `FieldError` on mismatch / 400 from backend.
- Slice: C
- Commit message: `feat(usuarios): password change dialog`

### 13. Page wiring for create/edit/password/toggle and inline `Alert`

- Files: `frontend/src/pages/usuarios/index.tsx` (~70 lines added — dialog state, modal discriminated union, toggle handler, success/destructive `Alert` + 3s `setTimeout` auto-dismiss)
- LOC: ~70 added
- Dependencies: 11, 12
- Acceptance:
  - `Modal` discriminated union mirrors the categorias pattern (`mode: null | "crear" | "editar" | "password"`) so a single `<Dialog>` switches content by mode.
  - Row `Editar` → opens `mode: "editar"`. Row password action → opens `mode: "password"`. Header `Nuevo Usuario` → opens `mode: "crear"`. Row `Power`/`PowerOff` → calls `usuariosService.alternarActivo` directly (no dialog).
  - After every successful mutation, the list refetches via a `reloadKey` bumped in state (no stale data).
  - Success: `Alert variant="default"` shows "Usuario guardado" / "Contraseña actualizada" / "Estado actualizado", auto-dismisses after 3 s. Error: `Alert variant="destructive"` with the backend `mensaje`, manual dismiss only.
  - All three rows still trigger `console.log` removal — i.e., no leftover placeholders.
- Slice: C
- Commit message: `feat(usuarios): wire create/edit/password/toggle flows`

---

## Slice D — Verification

No source changes. This slice exists so the apply phase produces an explicit verification report before the change is archived.

### 14. Lint + build + manual smoke checklist

- Files: none
- LOC: 0 source
- Dependencies: 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13
- Acceptance (mapping to spec REQ-12 and the design's manual smoke checklist):
  - `cd frontend && npm run lint` exits 0.
  - `cd frontend && npm run build` exits 0.
  - Manual smoke (verified against `http://127.0.0.1:5173/`):
    - Sidebar `Usuarios` link is clickable; lands on `/usuarios`.
    - Admin session: list renders, debounced search filters, Rol dropdown filters, Activo switch filters, Prev/Next paginates.
    - Non-admin session: `/usuarios` renders the inline 403 component (not a redirect).
    - `Nuevo Usuario` opens dialog, submit persists, success Alert shows, list refetches.
    - Row `Editar` opens dialog pre-filled, submit persists, success Alert shows, list refetches.
    - Row password action opens dialog, mismatch shows inline error, success persists.
    - Row toggle: success path persists; self-admin row is disabled with the tooltip; a forced backend 400 from a tampered request surfaces the destructive Alert.
    - Rapid filter typing never produces a stale list (AbortController cancels in-flight fetch).
- Slice: D
- Commit message: `chore(usuarios): verification report` only if any documentation/test artifact is added (likely no commit needed for a 0-LOC slice).

---

## PR strategy (chained PRs recommended)

| PR | Slices | LOC estimate | Risk |
|----|--------|--------------|------|
| PR1 | A | ~310 | Low — isolated foundation. |
| PR2 | B | ~440 (after Option B1 trim; still over 400 budget) | Medium-High — `size:exception` needed OR further trimming required. |
| PR3 | C + D | ~370 + 0 source | Medium — only mutating flows remain; verification rolls into PR3. |

Because even after the recommended Option B1 trim PR2 still exceeds the 400-line review budget, the orchestrator should pause and ask the user one of:

1. Accept `size:exception` for PR2 (single PR over budget with explicit justification).
2. Trim PR2 further (e.g., split `usuarios-table.tsx` + `usuarios-filters.tsx` into one PR and `usuarios-pagination.tsx` + wiring + `usuario-403.tsx` into another — yields PR2a + PR2b, both under 400).
3. Combine A + B into PR1 (foundation + list view) and leave C as PR2 — keeps both PRs close to budget but loses isolation.

Apply phase must NOT begin until the user picks a path.
