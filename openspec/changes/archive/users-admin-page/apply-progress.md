# Apply-progress — users-admin-page (Slice A)

> Slice implemented: **A** (PR1 foundation)
> Branch: `feat/users-admin-page-pr1-foundation`
> Push status: NOT pushed (orchestrator decision)

## Commits made (newest first)

| Hash | Message | Files | LOC |
|------|---------|-------|-----|
| `f71fe79` | feat(router): register /usuarios route and enable sidebar link | `app-sidebar.tsx`, `router.tsx` | +13 / -1 |
| `ccd6f56` | feat(usuarios): scaffold page with state and data wiring | `pages/usuarios/index.tsx`, `pages/usuarios/types.ts` | +83 / -0 |
| `64a088d` | feat(usuarios): add 7 admin service methods + roles service | `services/roles-service.ts`, `services/usuarios-service.ts` | +84 / -4 |
| `b8e42d7` | feat(usuarios): add frontend types mirroring backend DTOs | `types/roles.ts`, `types/usuarios.ts` | +31 / -7 |
| `8465348` | fix(http): forward AbortSignal to fetch | `lib/http.ts` | +2 / -1 |

**Totals**: +213 / -13 = +200 net LOC (under the 310 LOC ceiling).

## Files added (4)

| Path | LOC |
|------|-----|
| `frontend/src/types/roles.ts` | 7 |
| `frontend/src/services/roles-service.ts` | 12 |
| `frontend/src/pages/usuarios/index.tsx` | 66 |
| `frontend/src/pages/usuarios/types.ts` | 17 |

## Files modified (5)

| Path | LOC delta |
|------|-----------|
| `frontend/src/lib/http.ts` | +1 |
| `frontend/src/types/usuarios.ts` | +24 |
| `frontend/src/services/usuarios-service.ts` | +72 |
| `frontend/src/router.tsx` | +12 |
| `frontend/src/layout/app-sidebar.tsx` | +1 |

## Verification

| Check | Result |
|-------|--------|
| `cd frontend && npm run lint` | pass — 0 errors, 0 warnings |
| `cd frontend && npm run build` | pass — exit 0 (tsc + Vite both clean; pre-existing >500kB chunk note is informational, present on master too) |

## Deviations from design

1. **`usuariosService.listar()` params made optional with defaults**. Design §5 had `ListarUsuariosParams.limit` and `.offset` as required. Existing call sites in `incidencias/index.tsx:80` and `incidencias/detalle/index.tsx:100` invoke `usuariosService.listar()` with no args, which would break the build. Per Slice A scope rule (no edits outside the listed 5+5 files), modifying those pages was forbidden. Resolution: `params` is now `{ limit?, offset? }` with a `DEFAULT_LIMIT = 20` constant; existing callers keep working unchanged, new code in Slice B can still pass full params explicitly.

2. **`pages/usuarios/index.tsx` scaffold simplified**. The prompt listed 10 state hooks (`usuarios`, `loading`, `error`, `searchText`, `rolFilter`, `activoFilter`, `cursor`, `isFormOpen`, `selectedUser`, `dialogMode`) but the lint config (`noUnusedLocals: true` + `@typescript-eslint/no-unused-vars`) rejects unused setters. The slice ships with only the 3 state vars consumed right now (`usuarios`, `loading`, `error`); the rest are deferred to Slice B/C with a TODO comment marking the deferral. The full set of types (`PaginationCursor`, `FilterState`, `DialogMode`) is exported from `pages/usuarios/types.ts` so Slice B imports them directly.

## Outstanding for next slices

### Slice B — list view (5 tasks, ~440 LOC after Option B1 trim — still over 400 budget)

- Task 6 — `feat(usuarios): header with counter and Nuevo Usuario CTA` (~50 LOC, `components/usuarios-header.tsx`)
- Task 7 — `feat(usuarios): filters with debounced search, rol select, activo switch` (~90 LOC, `components/usuarios-filters.tsx`)
- Task 8 — `feat(usuarios): user table with avatar, badges, action icons` (~140 LOC, `components/usuarios-table.tsx`)
- Task 9 — `feat(usuarios): prev/next pagination with Mostrando X-Y counter` (~60 LOC, `components/usuarios-pagination.tsx`)
- Task 10 — `feat(usuarios): wire list view with filters, pagination and 403 handling` (~100 LOC, `components/usuario-403.tsx` + `index.tsx`)

**Reminder**: PR2 forecast exceeds 400-line review budget. User must pick: (a) `size:exception`, (b) split into PR2a + PR2b, or (c) merge A+B into PR1.

### Slice C — dialogs (3 tasks, ~370 LOC)

- Task 11 — `feat(usuarios): create+edit dialog with shadcn Field` (~200 LOC)
- Task 12 — `feat(usuarios): password change dialog` (~100 LOC)
- Task 13 — `feat(usuarios): wire create/edit/password/toggle flows` (~70 LOC)

### Slice D — verification (0 source LOC, lint + build + manual smoke checklist)

## Push status

Branch `feat/users-admin-page-pr1-foundation` is **local only**, NOT pushed to `origin`. Orchestrator will decide push/PR after user confirmation.

---

# Apply-progress — users-admin-page (Slice B)

> Slice implemented: **B** (PR2 list view)
> Branch: `feat/users-admin-page-pr2-list-view` (stacked on PR1's branch)
> Push status: NOT pushed (orchestrator decision)

## Commits made (newest first, PR2 only)

| Hash | Message | Files | LOC |
|------|---------|-------|-----|
| `9735fdc` | feat(usuarios): wire list view with filters, pagination and 403 handling | `components/usuario-403.tsx`, `pages/usuarios/index.tsx` | +221 / -38 |
| `f6624a8` | feat(usuarios): prev/next pagination with Mostrando X-Y counter | `components/usuarios-pagination.tsx` | +59 / -0 |
| `e84ec0b` | feat(usuarios): user table with avatar, badges, action icons | `components/usuarios-table.tsx` | +177 / -0 |
| `20d7197` | feat(usuarios): filters with debounced search, rol select, activo switch | `components/usuarios-filters.tsx` | +89 / -0 |
| `c12d808` | feat(usuarios): header with counter and Nuevo Usuario CTA | `components/usuarios-header.tsx` | +39 / -0 |

**PR2 totals**: +585 / -38 = **+547 net LOC** across 6 files.
**Branch totals** (PR1 + PR2): 10 commits, +798 / -51 = **+747 net LOC** across 15 files.

## Files added in Slice B (5)

| Path | LOC |
|------|-----|
| `frontend/src/pages/usuarios/components/usuarios-header.tsx` | 39 |
| `frontend/src/pages/usuarios/components/usuarios-filters.tsx` | 89 |
| `frontend/src/pages/usuarios/components/usuarios-table.tsx` | 177 |
| `frontend/src/pages/usuarios/components/usuarios-pagination.tsx` | 59 |
| `frontend/src/pages/usuarios/components/usuario-403.tsx` | 19 |

## Files modified in Slice B (1)

| Path | LOC delta (Slice B only) |
|------|--------------------------|
| `frontend/src/pages/usuarios/index.tsx` | +174 / -38 (net +136) — replaced scaffold with full Slice B wiring |

## Verification

| Check | Result |
|-------|--------|
| `cd frontend && npm run lint` | pass — 0 errors, 0 warnings |
| `cd frontend && npm run build` | pass — exit 0 (tsc + Vite both clean; pre-existing 864 kB chunk note is informational and matches master baseline) |

## Deviations from design / forecast

1. **PR2 total is +547 net LOC vs ~440 forecast** — user pre-accepted the over-budget via "Continuar con Slice B ahora". Two drivers:
   - **`usuarios-table.tsx` at 177 LOC vs ~140 ceiling** — 6 columns + 3 action buttons + accessibility props (aria-label per action, aria-disabled, title for self-guard) + avatar/estado/badge markup + empty/loading states filled the file to a feature-complete minimum. Cannot reasonably trim without dropping aria attributes.
   - **`index.tsx` delta +174 LOC vs ~100 forecast** — wiring needs more than the original estimate because it now declares 9 state hooks (filters, debouncedTexto, cursor, usuarios, roles, rolesLoading, loading, forbidden, errorMsg), 3 effects (debounce, roles-on-mount, fetch-on-change), and 4 callbacks. Dropping any of these would break the AbortController race-free promise in the design §1 and §9.
2. **`usuarios-pagination.tsx` props extended with `itemsShown`** — task spec listed `{ cursor, onPrev, onNext }` only, but the acceptance criterion "counter math correct (`offset + 1` to `offset + items.length`)" and the design §3 contract (`{ cursor, totalShown, onPrev, onNext }`) both require the items count. Followed design contract; renamed to `itemsShown` for parity with `usuarios.length` consumer.
3. **`activo` filter rendered as 3-state native `<select>` instead of Switch/Checkbox** — neither shadcn Switch nor Checkbox is installed (`frontend/src/components/ui/` contents: alert/avatar/badge/button/card/dialog/field/input/label/separator/spinner/table). Native `<select>` with Todos/Solo activos/Solo inactivos delivers the same UX without adding a shadcn primitive outside Slice B scope.
4. **Inline clear button removed from `usuarios-filters.tsx`** — task spec explicitly says "DO NOT add a 'Clear filters' inline button". The `onClear` prop stays in the component API so the page (Slice C wiring) can fire it from a page-level button. Per design §11 manual smoke step 5 ("Click Limpiar"), that page-level button is part of Slice C's role wiring; deferred.

## Self-deactivation guard verification

| Check | Status |
|-------|--------|
| `currentUser.id === row.id && currentUserIsAdmin && row.activo` → button disabled | ✓ |
| `title="No puedes desactivar tu propio usuario administrador"` | ✓ |
| `aria-disabled` mirrors `disabled` | ✓ |
| `aria-label` is dynamic (`Desactivar a ${nombre}` / `Activar a ${nombre}`) | ✓ |

## Outstanding for next slices

### Slice C — dialogs (3 tasks, ~370 LOC)
- Task 11 — `feat(usuarios): create+edit dialog with shadcn Field` (~200 LOC)
- Task 12 — `feat(usuarios): password change dialog` (~100 LOC)
- Task 13 — `feat(usuarios): wire create/edit/password/toggle flows` (~70 LOC) — replaces the `noop()` placeholders currently wired to `onEdit`/`onChangePassword`/`onToggleActive`/`onNuevo` in `index.tsx`

### Slice D — verification (0 source LOC, lint + build + manual smoke checklist)

## Push status

Branch `feat/users-admin-page-pr2-list-view` is **local only**, NOT pushed to `origin`. PR1's branch (`feat/users-admin-page-pr1-foundation`) is also still local — PR1 was opened via `gh` but the user has not confirmed push for PR2 yet. Orchestrator decision pending.
---

# Apply-progress — users-admin-page (Slice C+D, final slice / PR3)

> Slice implemented: **C+D** (PR3 — modal dialogs + verification report)
> Branch: `feat/users-admin-page-pr3-modals` (stacked on `feat/users-admin-page-pr2-list-view`, which is stacked on `feat/users-admin-page-pr1-foundation`)
> Base for PR: `master` once PR2 merges
> Push status: NOT pushed (orchestrator decision)

## Commits made (newest first, PR3 only)

| Hash | Message | Files | LOC |
|------|---------|-------|-----|
| `1faee17` | docs(usuarios): add manual smoke verification checklist | `openspec/changes/users-admin-page/verify-report.md` | +92 / -0 |
| `e215847` | feat(usuarios): wire create/edit/password/toggle flows | `pages/usuarios/index.tsx` | +219 / -10 (net +209) |
| `d4cffdf` | feat(usuarios): password change dialog | `components/usuario-password-dialog.tsx` | +223 / -0 |
| `92c411d` | feat(usuarios): create+edit dialog with shadcn Field | `components/usuario-form-dialog.tsx` | +356 / -0 |

**PR3 totals**: +890 / -10 = **+880 net LOC** across 4 files (2 new components + 1 modified page + 1 new markdown).

**Branch totals** vs `master`: 14 commits ahead, +1788 / -13 = **+1775 net LOC** across 18 files (5 from PR1 + 5 from PR2 + 4 from PR3).

## Files added in Slice C+D (3)

| Path | LOC |
|------|-----|
| `frontend/src/pages/usuarios/components/usuario-form-dialog.tsx` | 356 |
| `frontend/src/pages/usuarios/components/usuario-password-dialog.tsx` | 223 |
| `openspec/changes/users-admin-page/verify-report.md` | 92 |

## Files modified in Slice C+D (1)

| Path | LOC delta (PR3 only) |
|------|----------------------|
| `frontend/src/pages/usuarios/index.tsx` | +219 / -10 (net +209) — wired 6 new handlers (handleNuevoUsuario, handleEdit, handleChangePassword, handleSaveUser, handleSubmitPassword, handleToggleActive) + Alert state (top-of-page inline Alert with 3s setTimeout auto-dismiss) + reloadKey bumped in fetch effect deps; removed `noop()` placeholders |

## Verification (PR3)

| Check | Result |
|-------|--------|
| `cd frontend && npm run lint` | PASS — 0 errors, 0 warnings |
| `cd frontend && npm run build` | PASS — `tsc -b && vite build` exit 0; 874 kB chunk note is the pre-existing >500 kB informational present on master baseline (not a regression) |

Manual smoke checklist: **deferred** to `openspec/changes/users-admin-page/verify-report.md`. No backend reachable from this CI environment.

## Deviations from design / forecast

1. **PR3 total +880 net LOC vs ~370 forecast for Slice C+D**. Drivers:
   - **Dialogs are full-page stateful controlled components with own form state** (~580 LOC combined for the two dialogs vs ~300 forecast). Both dialogs hold internal validation state, expose Field-level invalid styling, use the modern `Field` / `FieldGroup` / `FieldLabel` / `FieldError` pattern (login-form precedent per spec NFR-1), and parse `ApiError.message` into a per-field error routed by simple keyword heuristics (email/contraseña/password/nombre/rol). They are also accessibility-complete (Dialog.Title + Dialog.Description per spec, individual `htmlFor` labels, `aria-invalid` on invalid inputs).
   - **`index.tsx` delta +219 / -10 vs ~70 forecast for Task 13** — the wiring is more elaborate than the bare handler count because the page now hosts:
     - `DialogMode` discriminated union state (`closed` | `create` | `edit;userId` | `password;userId`) — matches `pages/usuarios/types.ts` already exported.
     - `ToastAlert` state + `toastTimerRef` + 3 s `setTimeout` auto-dismiss + cleanup on unmount.
     - `reloadKey` bump in the fetch effect to guarantee a refetch after every successful mutation.
     - `dialogTarget` derived via `useMemo` (looks up the user from the in-memory `usuarios` list by `dialogMode.userId`, since the task prompt allows "use row data if already complete" instead of fetching `obtener()`).
     - 6 call `useCallback`-wrapped handlers, optimistic toggle with rollback in `handleToggleActive`.
   - **Lucide icons added**: `Check` and `AlertTriangle` (the latter replaces the previously iconless destructive Alert). Both verified to exist in `lucide-react@1.17.0` (`grep "declare const Check\\b"` and `declare const AlertTriangle` in `node_modules/lucide-react/dist/lucide-react.d.ts`).

2. **Client-side password minimum raised to 8 chars (vs backend `@Size(min=6,max=100)` and spec REQ-5 "shorter than 6")** — the prompt explicitly mandated `min 8 chars for password`. The client guard rejects earlier than the backend, which is a UX win (one less round-trip) and a documented deviation from spec. The backend `@Size(min=6,max=100)` still binds on the server side.

3. **Both dialogs route backend error messages by simple keyword heuristic** — per the design §8 plan and the prompt's "use `payload.mensaje` and route to the right field" mandate. The dialogs parse `ApiError.message` (which already maps `payload.mensaje ?? payload.message` per `lib/http.ts:42-44`) and route by `lower.includes("email"|"correo"|"contraseña"|"password"|"nombre"|"rol")` — falling back to a top-of-form `FieldError` for anything unrecognized. This matches the design contract; the spec scenario "Backend password error" is satisfied.

4. **`handleSaveUser` uses type assertions** (`as ActualizarUsuarioInput` / `as CrearUsuarioInput`) when dispatching to the service because TypeScript cannot narrow `CrearUsuarioInput | ActualizarUsuarioInput` from the discriminator alone (the discriminator is `mode`, which is owned by the dialog and not part of `input`). The narrower shape is enforced by the dialog itself (it builds the right shape based on its `mode` prop before calling `onSubmit(input)`); the assertion is safe and a single small `as` per branch is the cleanest approach without dragging a discriminator into `input` itself.

5. **`UsuarioPasswordDialog` accepts `usuario: Usuario | null`** (prompt signature said `usuario: Usuario`, but the page passes `null` when the dialog is closed to keep the prop contract "total"). This is a 1-line relaxation that also keeps the `key` prop consistent across open/closed transitions. Behavior is unchanged.

6. **No fetch to `usuariosService.obtener(id)` when opening edit mode** — per prompt's parenthetical "(or uses row data if already complete)". The table row carries the full `Usuario` (including `rol.codigo` and `activo`), which is all the form needs to prefill. If a backend update lands between page render and dialog open, the dialog may show stale data — recoverable by the user reopening from the refreshed list. Acceptable v1 trade-off.

## Self-deactivation guard verified

The PR2 self-guard wiring is unchanged by PR3 — it lives in `usuarios-table.tsx`. PR3 only adds the `handleToggleActive` page handler that the disabled button never reaches (since `disabled` on the button prevents the click from firing).

## Branch chain state

| PR | Branch | Commits ahead of `master` | LOC (+ / −) | Push status |
|----|--------|---------------------------|-------------|-------------|
| PR1 | `feat/users-admin-page-pr1-foundation` | 5 (subtract 0–4 to reach `master` directly) | +213 / -13 | Pushed (PR #2 opened) |
| PR2 | `feat/users-admin-page-pr2-list-view` (base PR1) | 10 | +798 / -51 | **Pushed** (PR #3 opened against `master`, base = PR1) |
| PR3 | `feat/users-admin-page-pr3-modals` (base PR2) | 14 | +1788 / -13 | **NOT pushed** — orchestrator will surface push decision after user confirms the diff |

## Outstanding / future work

**NONE for this change.** PR3 is the final slice of the chain. All four tasks (11, 12, 13, 14) are implemented. Verification (lint + build) is clean. The manual smoke checklist is captured in `verify-report.md` and awaits a maintainer with backend access.

