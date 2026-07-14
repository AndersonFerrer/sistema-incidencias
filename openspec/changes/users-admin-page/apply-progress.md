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