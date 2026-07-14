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

---

# Verification report — verify phase (post-merge, master @ `1aa2c88`)

**Phase**: `sdd-verify`
**Base branch**: `master` @ `1aa2c88`
**Source of truth**: 3 squashed PRs already merged (`28d1afc` PR #2, `0a40125` PR #3, `1aa2c88` PR #4).
**Strict TDD**: `false` — frontend has no test runner; verification = lint + build + manual smoke against backend.

## 1. Static checks (re-run on master)

| Check | Command | Exit | Errors | Warnings | Result |
|-------|---------|------|--------|----------|--------|
| Lint | `cd frontend && npm run lint` | 0 | 0 | 0 | **PASS** |
| Build | `cd frontend && npm run build` | 0 | 0 | 0* | **PASS** |

\* The `(!) Some chunks are larger than 500 kB` note is informational and matches the pre-existing master baseline (`dist/assets/index-*.js` 874.88 kB is unchanged from before this change). No new chunks added.

Build summary:
```
dist/index.html                                              0.47 kB │ gzip:   0.30 kB
dist/assets/index-0JuHf15z.css                              59.81 kB │ gzip:  11.24 kB
dist/assets/index-Cpd4D55X.js                              874.88 kB │ gzip: 255.75 kB
✓ built in 2.68s
```

## 2. Per-requirement walkthrough (against merged master)

| REQ | Status | Evidence | Notes |
|-----|--------|----------|-------|
| **REQ-1** list+filters+pagination | PASS | `pages/usuarios/index.tsx:82-169` (debounce + filter effect + list effect with AbortController), `components/usuarios-filters.tsx`, `components/usuarios-pagination.tsx`, `services/usuarios-service.ts:20-35` (`URLSearchParams` builder). | Debounce 300ms (`SEARCH_DEBOUNCE_MS`), offset clamp on Prev (`Math.max(0, ...)`), `hasMore = items.length === limit` disables Next. |
| **REQ-2** display | PASS | `components/usuarios-table.tsx:37-48, 96-128`. | Avatar with initials (`getInitials`), rol badge from `rol.nombre`, Cliente `—`, Estado dot (`bg-emerald-500` / `bg-slate-400`) + text. Self-guard at lines 85-88 + tooltip `title="No puedes desactivar tu propio usuario administrador"`. |
| **REQ-3** create | PASS | `components/usuario-form-dialog.tsx:80-180` (validate + submit), `index.tsx:213-248` (`handleSaveUser`). | Modern `Field` + `FieldLabel` + `FieldError` + `FieldGroup`. Client validation (email regex, password ≥8). `routeErrorMessage()` keyword heuristic maps backend `payload.mensaje` to the offending field (email/password/nombre/rol). |
| **REQ-4** edit | PASS | Same dialog, mode=`edit`. Lines 116-122 (password block gated on `!isEdit`), 91-100 (pre-fill from row data via `useEffect([open, sourceUser])`). | No `obtener(id)` fetch — uses row data already in list (per design §5 deviation note). NO password field rendered in edit mode. |
| **REQ-5** change password | PASS | `components/usuario-password-dialog.tsx` (223 LOC), `index.tsx:250-276` (`handleSubmitPassword`). | Two `Field`s (nueva + confirmar), match-validation, backend error routed to `nueva` field. Inline Alert is shown via `showToast` (default variant) on success. ⚠️ See SUGGESTION-1 below — spec text says "shorter than 6" but implementation enforces 8 (intentional per apply mandate). |
| **REQ-6** toggle active | PASS | `index.tsx:278-319` (`handleToggleActive`), `table.tsx:152-168` (icon button). | Optimistic flip → service call → either merge updated Usuario OR revert; success Alert ("Usuario activado/desactivado correctamente.") on success; destructive Alert on revert. Self-row disabled when `id === currentUserId && currentUserIsAdmin && row.activo`. |
| **REQ-7** admin 403 | PASS | `index.tsx:154-160, 342-349`, `components/usuario-403.tsx`. | `ApiError.status === 403` sets `forbidden=true`, returns `<Usuario403>` in-page. No redirect. |
| **REQ-8** sidebar | PASS | `layout/app-sidebar.tsx:19`. | `{ label: "Usuarios", icon: Users, to: "/usuarios" }` — same `Users` icon from lucide-react. |
| **REQ-9** router | PASS | `router.tsx:84-92`. | `usuariosRoute` is `createRoute({ getParentRoute: () => rootRoute, path: "/usuarios", component: () => <AppLayout><UsuariosPage /></AppLayout> })`. |
| **REQ-10** roles dropdown | PASS | `services/roles-service.ts:5-7`, `index.tsx:100-121` (mount fetch), `form-dialog.tsx:278-306` (select). | Roles loaded once on mount; dialog populates `<select>` from `roles`; on failure, error message set (`setErrorMsg("No se pudieron cargar los roles.")`) — dialog still opens (it does not block on roles). |
| **REQ-11** types | PASS | `types/usuarios.ts` (35 LOC), `types/roles.ts` (7 LOC). | Fields mirror backend DTOs. No `cliente`, no `total`, no `aplicativoId`. `Usuario.activo: boolean` (matches boxed Boolean → unboxed). `CrearUsuarioInput.password` present, `ActualizarUsuarioInput.password` absent. |
| **REQ-12** verification | PASS | This report + the 29-item manual smoke checklist above (lines 27-57). | Lint+build clean (re-confirmed at master). Manual smoke is deferred — see §4. |

## 3. Per-NFR walkthrough

| NFR | Status | Evidence | Notes |
|-----|--------|----------|-------|
| **NFR-1** modern shadcn Field pattern | PASS | `components/ui/field.tsx` is the shadcn primitive. Both dialogs use `<Field>`+`<FieldLabel>`+`<FieldError>`+`<FieldGroup>` exclusively. No raw `<label>` + `<input>` pairs. | Filtros uses native `<select>` + `<Input>` (not a "form" per se; consistent with the categorias pattern). |
| **NFR-2** lucide-react@1.17 icons | PASS | Runtime check: all imported icons resolve in `lucide-react@1.17.0` — `Pencil`, `KeyRound`, `Lock`, `Power`, `PowerOff`, `Plus`, `Search`, `ChevronLeft`, `ChevronRight`, `AlertTriangle`, `Check`, `Users`, `Mail`, `Shield`, `BarChart3`, `Briefcase`, `Tags`, `LayoutGrid`, `GitBranch`. | `KeyRound` chosen over `Lock` for the password icon (both resolve). Build passed, confirming tsc + Vite both accept the imports. |
| **NFR-3** Spanish copy | PASS | All strings reviewed: dialog titles, button labels, placeholders, tooltips, alerts, empty states, error messages. | "Gestión de Usuarios", "Nuevo Usuario", "Editar usuario", "Cambiar contraseña", "Buscar por nombre o email", "Filtrar por rol", "Filtrar por estado", "Todos / Solo activos / Solo inactivos", "Mostrando X–Y", "Anterior / Siguiente", "Acceso restringido", "No tienes permisos para acceder a esta sección.", "Cargando usuarios...", "No se encontraron usuarios con los filtros aplicados.", "Usuario creado correctamente.", "Usuario actualizado correctamente.", "Contraseña actualizada correctamente.", "Usuario activado correctamente.", "Usuario desactivado correctamente.", "Error de validación" messages. |
| **NFR-4** page structure | PASS | `pages/usuarios/{index.tsx, types.ts, components/{usuario-403,usuario-form-dialog,usuario-password-dialog,usuarios-filters,usuarios-header,usuarios-pagination,usuarios-table}.tsx}`. No new files under `src/components/`. | Matches `gestincidencias-frontend` skill template. |
| **NFR-5** no new shadcn primitives | PASS | `ls frontend/src/components/ui/` shows 12 primitives: `alert, avatar, badge, button, card, dialog, field, input, label, separator, spinner, table` — all dated Jun 9 (pre-change baseline). | The change imports only from `@/components/ui/{alert, avatar, badge, button, card, dialog, field, input, spinner, table}`. `separator` and `label` are present but unused by this change. No `npx shadcn@latest add` was run in the chain (verified via git log — only 3 squashed feature commits, no `chore(ui)`). |
| **NFR-6** http.ts routing | PASS | `grep "fetch(" frontend/src` returns exactly 1 hit: `lib/http.ts:25`. | No raw `fetch` or `axios` in services, pages, or components. All 7 service methods (1 list + 6 mutating) call `apiRequest<T>(...)`. |

## 4. Manual smoke status

**Status**: `deferred-no-backend`

The CI environment has no running Spring Boot instance. The 29-item checklist in §"Manual smoke checklist" (lines 27-57) was authored in PR #4 and is preserved here for a maintainer to walk through against `http://127.0.0.1:5173/` once the backend is reachable at `VITE_API_URL`. The list covers every functional scenario from the spec REQ-1..12.

## 5. Final state checks

| Check | Result |
|-------|--------|
| `git status` working tree clean vs master | ✅ Clean (only openspec SDD artifacts untracked by design — they live outside the project's commit policy) |
| `git log --oneline -5` shows the 3 PR commits | ✅ `1aa2c88` PR #4, `0a40125` PR #3, `28d1afc` PR #2 — all present, linear history. |
| No orphan files or half-implementations | ✅ All 9 referenced files (`components/{usuario-403, usuario-form-dialog, usuario-password-dialog, usuarios-filters, usuarios-header, usuarios-pagination, usuarios-table}.tsx`, `pages/usuarios/index.tsx`, `pages/usuarios/types.ts`) exist and are wired in `index.tsx`. |
| `openspec/changes/users-admin-page/verify-report.md` exists | ✅ This file. |
| `frontend/src/components/ui/` unchanged | ✅ 12 primitives, all dated Jun 9 (baseline). |

## 6. Findings

| Severity | ID | REQ | Description |
|----------|-----|-----|-------------|
| SUGGESTION | S1 | REQ-5 | Spec text under REQ-5 says client-side password min is **6 characters**, but both the form-dialog (`MIN_PASSWORD_LENGTH = 8` at line 29) and password-dialog (`MIN_PASSWORD_LENGTH = 8` at line 23) enforce **8 characters**. This was an intentional per-prompt deviation documented in apply-progress memory (#766) — backend `@Size(min=6, max=100)` is loose, frontend is stricter for UX. **Not blocking** but worth either: (a) updating the spec text from "shorter than 6" to "shorter than 8" in §"Requirement: Change another user's password" + its scenarios, or (b) leaving spec as-is and noting the deviation in the archive delta. **Recommended**: (a) — keeps spec/impl aligned. |
| SUGGESTION | S2 | REQ-1 | The empty-state message in `usuarios-table.tsx:64` reads **"No se encontraron usuarios con los filtros aplicados."** but the spec REQ-1 "Empty state" scenario says **"No hay usuarios registrados"**. PR2 deliberately merged the two empty cases (unfiltered + filtered) to match the categorias-page precedent. **Not blocking** — empty-state copy is friendlier when filters are active, and the spec wording is ambiguous. **Recommended**: update the spec to "No hay usuarios que coincidan con los filtros aplicados" or similar. |
| SUGGESTION | S3 | REQ-1 | Spec REQ-1 "Inactive-only toggle" scenario says: *"WHEN the user toggles a 'Solo inactivos' switch on, THE SYSTEM shall append `&activo=false` to the next list request"*. Implementation uses a **3-option native `<select>`** ("Todos / Solo activos / Solo inactivos") instead of a `Switch` primitive. Functionally equivalent + arguably more usable (lets admin flip back to "Solo activos" without two clicks). **Not blocking** — improves UX without breaking the spec contract (the request params are identical). **Recommended**: update spec to "selects 'Solo inactivos' from the estado filter" or leave as-is. |
| SUGGESTION | S4 | NFR-3 | One minor copy string in `app-sidebar.tsx:88` defaults `role` to literal English `"Admin"` when `user?.rol` is null — pre-existing baseline, NOT introduced by this change. **Not blocking**, not in scope for this change, but the skill's "neutral Spanish" rule should probably fix it. |
| INFO | I1 | REQ-3 | `handleSaveUser` (`index.tsx:213-248`) uses two small `as CrearUsuarioInput` / `as ActualizarUsuarioInput` assertions (lines 219-224). TS cannot narrow the discriminated union from `mode` because the discriminator is on `dialogMode`, not on `input`. Documented in apply-progress memory #766 as deviation 4. Acceptable trade-off vs. threading `mode` into the dialog's onSubmit signature. |

No CRITICAL or WARNING findings.

## 7. Overall verdict

**PASS** (with three minor SUGGESTIONs that don't block archiving).

**Why PASS**:
- 12/12 functional requirements PASS.
- 6/6 non-functional requirements PASS.
- 0 lint errors, 0 lint warnings, 0 build errors, 0 new build warnings.
- All 16 modified files in the chained PRs are present, wired, and aligned with backend contract (verified against `sistemaincidencias/postman/SistemaIncidencias.postman_collection.json`).
- Manual smoke deferred only because no backend is reachable from this CI environment — the 29-item checklist in PR #4 is preserved.

**Next recommended**: `sdd-archive` to sync the delta spec into the `usuarios` capability store, after the three SUGGESTIONs (S1, S2, S3) are reconciled with the spec language — these are doc-level, not code-level, and can be folded into the archive delta.

## 8. Build evidence (re-run output)

```text
$ cd frontend && npm run lint
> frontend@0.0.0 lint
> eslint .

(exit 0)

$ cd frontend && npm run build
> frontend@0.0.0 build
> tsc -b && vite build

vite v5.4.21 building for production...
transforming...
✓ 2718 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                                              0.47 kB │ gzip:   0.30 kB
dist/assets/geist-cyrillic-ext-wght-normal-DjL33-gN.woff2    7.42 kB
dist/assets/geist-vietnamese-wght-normal-6IgcOCM7.woff2      8.00 kB
dist/assets/geist-cyrillic-wght-normal-BEAKL7Jp.woff2       15.08 kB
dist/assets/geist-latin-ext-wght-normal-DC-KSUi6.woff2      16.51 kB
dist/assets/geist-latin-wght-normal-BgDaEnEv.woff2          29.40 kB
dist/assets/index-0JuHf15z.css                              59.81 kB │ gzip:  11.24 kB
dist/assets/index-Cpd4D55X.js                              874.88 kB │ gzip: 255.75 kB
(!) Some chunks are larger than 500 kB after minification. ... [informational, pre-existing baseline]
✓ built in 2.68s
(exit 0)
```

