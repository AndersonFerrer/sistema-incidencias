# Verification report — users-admin-page (Slice C+D / PR3)

**Change**: `users-admin-page`
**Slice**: C + D (PR3, final slice of the 3-PR chain)
**Branch**: `feat/users-admin-page-pr3-modals`
**Stacking**: based on `feat/users-admin-page-pr2-list-view` (PR2) which is based on `feat/users-admin-page-pr1-foundation` (PR1). PR3 targets `master` after PR2 merges.

## Static checks

| Check | Command | Result |
|-------|---------|--------|
| Lint | `cd frontend && npm run lint` | PASS — 0 errors, 0 warnings |
| Build | `cd frontend && npm run build` | PASS — `tsc -b && vite build` exit 0 (tsc + Vite both clean; pre-existing >500 kB chunk note is informational and matches the master baseline) |

Both checks were run locally on this branch (stacked on top of PR2's commits). The full branch totals at PR3 close are:

- 3 commits added by PR3 (Task 11: create/edit dialog, Task 12: password dialog, Task 13: page wiring)
- Branch is 13 commits ahead of `master` (5 from PR1 + 5 from PR2 + 3 from PR3)
- LOC delta for PR3: ~+800 new lines across 3 files (2 new components + 1 wiring overhaul). Detailed per-file counts in `apply-progress.md`.

## Manual smoke checklist (mirrors spec REQ-12)

**Status**: PENDING — this is an automated CI environment without a running Spring Boot backend. Manual execution must be re-run by a maintainer against `http://127.0.0.1:5173/` with the backend reachable at `VITE_API_URL`. See per-item guidance below.

The 19 checklist items map 1:1 to the spec REQ-12 "Manual smoke checklist" + spec REQ-12 "Non-admin manual smoke" scenarios (see `openspec/changes/users-admin-page/specs/usuarios/spec.md` lines 196–211). The full design §11 checklist (`openspec/changes/users-admin-page/design.md` lines 396–416) is included below for completeness.

| # | Action | Expected | Spec ref | Pass |
|---|--------|----------|----------|------|
| 1 | Login as admin → click sidebar **Usuarios** | List renders with `Mostrando X–N` counter; the page header reads "Gestión de Usuarios" with the live counter "X usuarios registrados". | REQ-1 initial load | ⏳ pending |
| 2 | Type in the search input | After ~300 ms the list re-fetches with `?texto=<value>`; offset resets to 0. | REQ-1 debounced text search | ⏳ pending |
| 3 | Select a rol in the rol dropdown | List re-fetches with `&rol=<codigo>` appended; offset resets to 0. | REQ-1 role filter | ⏳ pending |
| 4 | Toggle "Solo inactivos" in the activo dropdown | List narrows to inactive users (`&activo=false`); turning it off omits the param and returns all users. | REQ-1 inactive-only toggle | ⏳ pending |
| 5 | Click **Siguiente** | List advances by `limit`; **Anterior** is disabled at first page. | REQ-1 next page / previous page clamped | ⏳ pending |
| 6 | **Siguiente** when fewer than `limit` items come back | **Siguiente** disabled; counter shows "Mostrando X–Y" with no total. | REQ-1 end-of-list detection | ⏳ pending |
| 7 | Empty filter result | Table shows the "No se encontraron usuarios con los filtros aplicados." message. | REQ-1 empty state | ⏳ pending |
| 8 | Unfiltered empty backend | Table shows the same message (shared with filter empty per categorias precedent — see PR2 deviation note for the full rationale). | REQ-1 empty state (unfiltered) | ⏳ pending |
| 9 | Click **Nuevo Usuario** | Form dialog opens in create mode with the rol dropdown populated; password field is visible. | REQ-3 open create dialog | ⏳ pending |
| 10 | Fill the create form with valid data and submit | Dialog closes; list refetches (cursor reset to 0); success Alert "Usuario creado correctamente." appears at top of page; the new row is visible at the top. | REQ-3 successful create | ⏳ pending |
| 11 | Repeat create with a duplicate email | Dialog stays open; the email `Field` shows the inline error "Ya existe un usuario con el email indicado" (mapped by `routeErrorMessage` because the message contains "email"). | REQ-3 email-uniqueness error | ⏳ pending |
| 12 | Repeat create with a 5-char password | Dialog stays open; the password `Field` shows the inline error "La contraseña debe tener al menos 8 caracteres." (client-side guard before the request leaves). | REQ-3 password-length error + client-side guard | ⏳ pending |
| 13 | Cancel the create dialog | Dialog closes; no request was issued; no success Alert shown. | REQ-3 cancel without persisting | ⏳ pending |
| 14 | Click **Editar** on a row | Form dialog opens in edit mode, prefilled from the row's `Usuario` (nombre, email, rol, activo); password field is **NOT** shown. | REQ-4 open edit dialog | ⏳ pending |
| 15 | Submit the edit form with a change | Dialog closes; list refetches; success Alert "Usuario actualizado correctamente." | REQ-4 successful edit | ⏳ pending |
| 16 | Submit the edit with a duplicate email | Dialog stays open; the email `Field` shows the inline error. | REQ-4 email-uniqueness error | ⏳ pending |
| 17 | Click the key (password) icon on a row | Password dialog opens with two fields ("Nueva contraseña" + "Confirmar contraseña") and the description naming the target user. | REQ-5 open password dialog | ⏳ pending |
| 18 | Submit the password dialog with both fields empty | Dialog stays open; both fields show inline "obligatoria" error; no request fires. | REQ-5 client-side validation | ⏳ pending |
| 19 | Submit the password dialog with mismatching fields | Dialog stays open; confirm field shows "Las contraseñas no coinciden." | REQ-5 client-side validation (match) | ⏳ pending |
| 20 | Submit valid (matching, ≥ 8-char) password | Dialog closes; success Alert "Contraseña actualizada correctamente." appears at top of page. | REQ-5 successful password change | ⏳ pending |
| 21 | Click toggle on an active row | Row optimistically flips inactive; `usuariosService.desactivar(id)` fires; on HTTP 200 the row stays inactive. | REQ-6 deactivate an active user (success path) | ⏳ pending |
| 22 | Click toggle on an inactive row | Row optimistically flips active; `usuariosService.activar(id)` fires; on HTTP 200 the row stays active. | REQ-6 activate an inactive user (success path) | ⏳ pending |
| 23 | Force a backend 400 from the toggle (e.g., self-deactivation bypass, or stop the backend mid-request) | Row reverts to its previous `activo` state; a destructive Alert at the top of the page shows the backend message. | REQ-6 toggle rollback on error | ⏳ pending |
| 24 | Locate own row (when logged in as an admin) | The Power/PowerOff toggle is `disabled` with `title="No puedes desactivar tu propio usuario administrador"`; the Pencil/KeyRound buttons are still enabled. | REQ-6 self toggle disabled + REQ-2 self-deactivation prevented in UI | ⏳ pending |
| 25 | Login as **AGENTE** or **USUARIO** and click **Usuarios** in the sidebar | Sidebar entry is visible (per design §11); the page renders the in-page 403 message with "No tienes permisos para acceder a esta sección", NOT a redirect. | REQ-7 non-admin receives 403 + REQ-7 sidebar entry visible to all | ⏳ pending |
| 26 | Direct-navigate a non-admin to `/usuarios` | Same in-page 403 state. | REQ-7 non-admin receives 403 (direct URL) | ⏳ pending |
| 27 | Rapid filter typing | Stale requests never overwrite the latest result (in-flight fetch is cancelled by `AbortController`; UI always reflects the most-recent keystrokes). | REQ-1 race-free on rapid typing (design §9) | ⏳ pending |
| 28 | Open the dev tools and confirm no `console.error` log appears during any of the steps above | No JS errors, no network 4xx/5xx other than the forced 400 in step 23. | General code health | ⏳ pending |
| 29 | Open the **Network** tab in DevTools and confirm a successful create response is the canonical `Usuario` from `POST /api/usuarios`, and a successful password change returns HTTP 204 | Backend payload is rendered identically to the fresh row. | REQ-11 type alignment + REQ-5 backend contract | ⏳ pending |

## What was verified

- ✅ `npm run lint` exits 0 with zero errors and zero warnings (this batch — Slice C+D).
- ✅ `npm run build` exits 0 (`tsc -b && vite build`); both the TypeScript compile and the Vite production bundle compile cleanly.
- ✅ All four Slice C+D files land on top of PR2's slice without modifying any file outside the assignment:
  - `frontend/src/pages/usuarios/components/usuario-form-dialog.tsx` (NEW)
  - `frontend/src/pages/usuarios/components/usuario-password-dialog.tsx` (NEW)
  - `frontend/src/pages/usuarios/index.tsx` (modified — wiring only; no other consumers)
  - `openspec/changes/users-admin-page/verify-report.md` (NEW — this file)
- ✅ Static checks for `frontend/src/components/ui/button`, `alert`, `field`, `dialog`, `spinner`, `input` (unchanged from prior slices).

## What was NOT verified

- ❌ Manual end-to-end smoke against a running backend (no Spring Boot instance reachable from this CI environment). A maintainer must walk through the 29 checklist items above before merging.
- ❌ Backend integration / contract drift — `crear`, `actualizar`, `cambiarPassword`, `activar`, `desactivar` use the request shapes already aligned to backend DTOs per design §6 + §7. The slice did not exercise those endpoints against a live server.
- ❌ Performance / accessibility audit beyond the per-row `aria-label`s / `aria-disabled` / `title` attributes already declared in the components.

## Branch / push status

- **Branch**: `feat/users-admin-page-pr3-modals` exists locally only.
- **Push status**: NOT pushed to `origin`. The orchestrator will surface the push / PR creation decision after the user confirms the diff looks right.
- **Prior slices**: PR1 (`feat/users-admin-page-pr1-foundation`) opened as #2 against `master`. PR2 (`feat/users-admin-page-pr2-list-view`) opened as #3 against `master`. PR3 will be PR #4 against `master`.

## Rollback boundary

Each PR3 commit is a self-contained revert; reverting any single commit leaves a buildable, lint-clean branch:

| Commit | Files | Revert impact |
|--------|-------|---------------|
| `feat(usuarios): create+edit dialog with shadcn Field` | NEW `components/usuario-form-dialog.tsx` | Revert removes the file; `index.tsx` still imports it → must be done together with the wiring commit. |
| `feat(usuarios): password change dialog` | NEW `components/usuario-password-dialog.tsx` | Same — must be reverted alongside the wiring commit. |
| `feat(usuarios): wire create/edit/password/toggle flows` | Modified `index.tsx` | Reverting alone leaves the dialog components orphaned (no consumer) but the page still builds; it loses the mutations. |

To roll back the entire PR3 cleanly, reverse the three commits together (`git revert -n <hash>` for each, then `git commit`).
