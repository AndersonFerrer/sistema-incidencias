# Archive Report — `perfil-self` (verdict PASS)

**Change**: `perfil-self`
**Capability**: `usuarios` (MODIFIED — extended baseline; combined with `users-admin-page` seed)
**Project**: sistema-incidencias
**Archive date**: 2026-07-15
**Verdict**: PASS (sdd-verify: see `verify-report.md`)
**Source**: `openspec/changes/archive/perfil-self/verify-report.md` + engram topic `sdd/perfil-self/verify-report`

---

## 1. Verdict

**PASS** — sdd-verify verdict in `verify-report.md` confirms all 9 requirements and 28 Given/When/Then scenarios in the delta spec are aligned with master (`7c22c9f`). 9 of those scenarios have a passing JUnit 5 / Mockito unit test in `UsuarioServiceSelfTest`; the remaining 19 are frontend-only (no test runner in `strict_tdd: false`) and are covered by source inspection.

Backend `./mvnw compile -q` exit 0, `./mvnw test -q` exit 0 with **10/10 tests passing** (1 Spring context-load + 9 focused). Frontend `npm run lint` and `npm run build` net-new clean — only 3 lint + 4 build errors remain in `frontend/src/pages/incidencias/{index.tsx,components/incidencias-table.tsx}`, all blamed to `f26424a` (PR #9) before this change. **New static regressions: 0.** `SecurityConfig.java` not touched. Postman JSON valid with new "Perfil propio y eliminación lógica (change E)" doc block + 4 routes (`GET /me`, `PUT /me`, `PUT /me/password`, `DELETE /{id}`) and 4 sample responses (200/401/400-current-pwd/400-short-pwd).

---

## 2. Changes shipped

The `perfil-self` change shipped across **2 stacked PRs** plus 9 supporting fixup commits to `master`:

- **PR #20** (`71d963f`) — Slice A — Backend (T1–T4):
  - New DTOs `ActualizarPerfilRequest` (`@NotBlank @Size(max=150)` name + `@Size(max=500) @Pattern` HTTPS URL avatar) and `CambiarPasswordPropiaRequest` (`@NotBlank` current + `@NotBlank @Size(min=8,max=100)` new).
  - New SQL constant `UsuarioSql.ACTUALIZAR_PERFIL` updating only `nombre`, `avatar_url`, `actualizado_en`.
  - New DAO method `UsuarioDao.actualizarPerfil(UUID id, String nombre, String avatarUrl)` with prepared-statement bindings.
  - Four new service methods: `obtenerPerfil`, `actualizarPerfil`, `cambiarPasswordPropia`, `eliminar`. `cambiarPasswordPropia` enforces `passwordEncoder.matches` then `encode`. `eliminar` is ADMIN-only, refuses self-target, reuses `cambiarActivo(id, false)`.
  - Four new controller routes with static `/me` mappings that win over `/{id}` UUID routing: `GET /api/usuarios/me`, `PUT /api/usuarios/me`, `PUT /api/usuarios/me/password`, `DELETE /api/usuarios/{id}` (204 on success).
  - Focused unit tests: `UsuarioServiceSelfTest` with 9 tests across 3 nested classes (`SelfProfile`, `SelfPassword`, `AdminDelete`) plus one standalone `obtener_perfil_mapea`.
  - Postman collection updated with the 4 routes and 4 sample responses.

- **PR #21** (`7c22c9f`) — Slice B — Frontend (T5–T8):
  - `frontend/src/services/usuarios-service.ts` — `obtenerMiPerfil`, `actualizarMiPerfil`, `cambiarMiPassword`, `eliminar` wrappers using `apiRequest`.
  - `frontend/src/types/usuarios.ts` — `ActualizarPerfilPropioInput`, `CambiarPasswordPropiaInput`.
  - `frontend/src/store/auth-store.ts` — `syncProfile(payload)` maps `{nombre,email,avatarUrl}` onto the persisted `AuthUser` without changing role or token.
  - New `pages/perfil/` directory with `index.tsx` (route composition + role-aware tablist + fetch state) and three page-local components: `perfil-info-form.tsx`, `cambiar-password-form.tsx`, `perfil-danger-zone.tsx`.
  - New `pages/usuarios/components/usuario-delete-dialog.tsx` requiring the operator to type `ELIMINAR` before submitting.
  - `pages/usuarios/index.tsx` + `pages/usuarios/components/usuarios-table.tsx` extended with a `Trash2` action disabled for non-admin and self.
  - `router.tsx:117-125` registers `/perfil` inside `AppLayout`.
  - `layout/app-header.tsx:17` adds the route title "Mi perfil".
  - `layout/app-sidebar.tsx:156-164` adds a `Mi perfil` link in the user dropdown next to logout.

Master HEAD at archive: `7c22c9f`. **New static regressions introduced by this change: 0.** No new Maven dependencies; no new npm packages.

---

## 3. Requirements closed

From `docs/requerimientos.md` and the spec matrix:

- **RF-33** — Perfil propio: GET/PUT `/api/usuarios/me`, PUT `/api/usuarios/me/password`, DELETE `/api/usuarios/{id}`.
  - The `GET /api/auth/me` endpoint remains as the lightweight session probe; `GET /api/usuarios/me` is the richer contract used by the profile page.
- **RF-36** — Cambio de contraseña propia con verificación de la actual.

The change closes the "Self password change", "Self profile edit", "Delete user", and "My profile page" gaps that the `users-admin-page` baseline explicitly listed as out-of-scope.

---

## 4. Master commits

| SHA | Subject |
| --- | --- |
| `8368555` | feat(usuarios): add self-service DTOs and ACTUALIZAR_PERFIL SQL |
| `33067dc` | feat(usuarios): add actualizarPerfil DAO method for name+avatar only |
| `b99e83e` | feat(usuarios): implement self-profile, own password change and admin soft delete |
| `f5c4f71` | feat(usuarios): expose /me GET/PUT + /me/password and DELETE /{id} endpoints |
| `bf94e72` | test(usuarios): cover self-profile, own password change and admin soft delete |
| `4abc72b` | docs(postman): add self-profile and soft-delete endpoints to collection |
| `71d963f` | feat(usuarios): self-profile + own password change + admin soft delete (PR1 backend) (#20) |
| `cd87769` | feat(usuarios): add self-profile service wrappers and auth-store syncProfile |
| `32972fc` | feat(perfil): add /perfil page with three tabs and admin-only danger zone |
| `33adf39` | feat(usuarios): add admin-only Trash2 action with named confirmation dialog |
| `af855a7` | feat(sidebar): open /perfil from the user dropdown (logout moved next to it) |
| `7c22c9f` | feat(perfil): self-profile page + admin delete confirmation (PR2 frontend) (#21) |

---

## 5. Drift applied

One intentional drift documented for traceability (S4):

1. **Admin delete confirmation requires typing `ELIMINAR`** — the spec scenario simply says "Confirmar eliminación" and "Cancelar confirmación". The implementation adds a typed-text confirmation step (`ELIMINAR`, case-insensitive) before the destructive button is enabled. This strengthens the spec intent (explicit confirmation) without contradicting it; cancel still cancels and confirm still issues `DELETE /{id}` and refetches.

No blocking drift. All other spec scenarios match the implementation 1:1 (including the hard requirement that `email`, `rol`, and `activo` cannot be self-editable, which the implementation enforces via the DTO surface AND the `ACTUALIZAR_PERFIL` SQL column list).

---

## 6. Capability spec evolution

`openspec/specs/usuarios/spec.md` is now the canonical baseline combining both seeds (`users-admin-page` + `perfil-self`). The merged baseline contains:

- All 18 requirements (12 functional + 6 non-functional) + 44 scenarios from `users-admin-page`.
- All 9 new requirements + 28 scenarios from `perfil-self`.
- Updated Purpose section that now mentions the `/perfil` page and the soft-delete behavior.
- Updated Out-of-scope list that removes "Delete user" and "Self password change" (now in scope).
- Updated Acceptance criteria line counting 21 functional requirements + 6 NFR.
- New "Drift notes" bullet (S4) for the typed-confirmation deviation.

Header rewritten from "admin user-management page" to "admin user-management + self-service + soft delete" to reflect the combined scope.

---

## 7. Files

### Added (4 Java backend + 1 test + 5 frontend + 1 Postman)

Backend (`sistemaincidencias/src/main/java/com/integrador/sistemaincidencias/usuarios/`):
- `dto/ActualizarPerfilRequest.java`
- `dto/CambiarPasswordPropiaRequest.java`

Backend test:
- `src/test/java/com/integrador/sistemaincidencias/usuarios/service/UsuarioServiceSelfTest.java`

Frontend:
- `frontend/src/pages/perfil/index.tsx`
- `frontend/src/pages/perfil/components/perfil-info-form.tsx`
- `frontend/src/pages/perfil/components/cambiar-password-form.tsx`
- `frontend/src/pages/perfil/components/perfil-danger-zone.tsx`
- `frontend/src/pages/usuarios/components/usuario-delete-dialog.tsx`

Postman:
- `sistemaincidencias/postman/SistemaIncidencias.postman_collection.json` — new "Perfil propio y eliminación lógica (change E)" section.

### Modified (4 Java backend + 6 frontend)

Backend:
- `usuarios/controller/UsuarioController.java` (+30: 3 `/me` + 1 DELETE routes)
- `usuarios/service/UsuarioService.java` (+50: 4 service methods)
- `usuarios/dao/UsuarioDao.java` (+14: `actualizarPerfil`)
- `usuarios/sql/UsuarioSql.java` (+8: `ACTUALIZAR_PERFIL` constant)

Frontend:
- `frontend/src/router.tsx` (+9: `/perfil` route inside `AppLayout`)
- `frontend/src/layout/app-header.tsx` (+1: title entry)
- `frontend/src/layout/app-sidebar.tsx` (+9: `Mi perfil` dropdown link)
- `frontend/src/services/usuarios-service.ts` (+31: 4 self-service wrappers)
- `frontend/src/types/usuarios.ts` (+13: 2 self-service input types)
- `frontend/src/store/auth-store.ts` (+22: `syncProfile`)
- `frontend/src/pages/usuarios/index.tsx` (+30: `UsuarioDeleteDialog` wiring + `handleConfirmDelete`)
- `frontend/src/pages/usuarios/components/usuarios-table.tsx` (+14: `Trash2` button + self/non-admin guard)

### Not modified (deliberate)

- `sistemaincidencias/src/main/java/com/integrador/sistemaincidencias/shared/config/SecurityConfig.java` — existing `/api/**` filter chain already covers the new routes (admin-only and self-service paths inherit the same `Bearer` validation).
- `sistemaincidencias/src/main/java/com/integrador/sistemaincidencias/usuarios/service/PermisoAdministracionService.java` — `validarAutenticado` and `validarAdministrador` (added by `incidencias-rbac-agente`) are reused as-is.
- `frontend/src/lib/http.ts` — the centralized HTTP layer (with `Authorization: Bearer` attachment and `payload.mensaje ?? payload.message` normalization) is used unchanged through `apiRequest`.

---

## 8. Traceability

- **Proposal**: `openspec/changes/archive/perfil-self/proposal.md`
- **Spec (delta)**: `openspec/changes/archive/perfil-self/specs/usuarios/spec.md` — **synced into** `openspec/specs/usuarios/spec.md` (extended baseline).
- **Design**: `openspec/changes/archive/perfil-self/design.md`
- **Tasks**: `openspec/changes/archive/perfil-self/tasks.md`
- **Verify**: `openspec/changes/archive/perfil-self/verify-report.md`
- **Apply progress**: master commits `8368555` → `7c22c9f` (12 commits across both PRs).
- **Verify verdict**: engram topic `sdd/perfil-self/verify-report`.

---

## 9. Risks / follow-ups

1. **Manual smoke pending** — sdd-verify performed code-level audit plus the `UsuarioServiceSelfTest` suite. A real end-to-end smoke (ADMIN/AGENTE/USUARIO tokens hitting `/api/usuarios/me` + `/api/usuarios/me/password` + `DELETE /api/usuarios/{id}` with a populated PostgreSQL instance) was not run. Recommended as a follow-up validation step (can be done with Playwright CLI on the dev server).
2. **JWT revocation on soft delete** — design §6 notes that immediate global JWT revocation is not claimed because the auth filter validates JWT claims without an active-user lookup. Soft-deleted users cannot log in for new sessions but their existing tokens remain valid until expiry. If immediate revocation is needed, the auth filter must look up `usuario.activo` on every request.
3. **`AvatarFallback` still uses initials** — the header avatar reads `displayName.split(" ").map(...).join("").slice(0,2)`; the `avatarUrl` field is not consumed by `app-header.tsx` or `app-sidebar.tsx`. Future change could surface the avatar image in those components.
4. **URL `rango` sync** for `/perfil` is N/A here but worth noting: the new page is state-only.
5. **Browser back-button after delete** — `handleConfirmDelete` optimistically flips `activo=false` and shows a toast; if the user immediately hits "back" they may see a stale row. Trivial follow-up.
6. **`/perfil` for an inactive user** — if a user is soft-deleted while logged in, `/perfil` still loads via `GET /me` because the JWT is still valid. After expiry the user cannot re-login. Acceptable given current filter design.

---

## 10. Next recommended

Per the proposal matrix and the remaining un-implemented requirements:

1. **`configuracion-ui`** (change F) — config page for catalog CRUD + demo login fix + DELETE for catalog entries.
2. **Migration of `frontend/src/pages/incidencias/detalle/index.tsx`** to consume `/api/usuarios/agentes-asignables` (callers in `detalle/index.tsx` still hit the admin-only `/api/usuarios`).
3. **Pre-existing `incidencias/*` lint/build cleanup** — 3 unused-var + 1 type-mismatch errors in `pages/incidencias/index.tsx` and `pages/incidencias/components/incidencias-table.tsx` from PR #9. Out of scope for `perfil-self` but worth a dedicated cleanup PR.

---

## 11. SDD cycle complete

Change E `perfil-self` shipped through the full SDD lifecycle:

- ✅ `sdd-propose` → `proposal.md` (61 lines, 8 sections, 3 open questions resolved with defaults).
- ✅ `sdd-spec` → `specs/usuarios/spec.md` (9 ADDED requirements, 28 Given/When/Then scenarios).
- ✅ `sdd-design` → `design.md` (104 lines, 5 decisions D1–D5, mermaid data flow, security threat matrix).
- ✅ `sdd-tasks` → `tasks.md` (8 dependency-ordered tasks across 2 PRs).
- ✅ `sdd-apply PR1` → backend (PR #20 + 6 supporting fixup commits, +6 Java files / +tests / +Postman; BUILD SUCCESS).
- ✅ `sdd-apply PR2` → frontend (PR #21 + 3 supporting fixup commits, +5 frontend files / -0 deletions; lint+build net-new clean).
- ✅ `sdd-verify` → `verify-report.md` (PASS, 9/9 requirements aligned, 9/28 scenarios with passing tests, 28/28 source-audit aligned).
- ✅ `sdd-archive` → this report + `openspec/specs/usuarios/spec.md` extended baseline synced.

Verdict: **PASS**. Archived.