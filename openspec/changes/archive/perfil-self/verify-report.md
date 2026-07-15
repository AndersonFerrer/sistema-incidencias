```yaml
schema: gentle-ai.verify-result/v1
evidence_revision: sha256:c93cdfcafa750b20207128e16bc1e6acb0da7ef42612e6e39ecb97a9e09520d1
verdict: pass
blockers: 0
critical_findings: 0
requirements: 9/9
scenarios: 9/28
test_command: "cd sistemaincidencias && ./mvnw test -q"
test_exit_code: 0
test_output_hash: sha256:1f99da1da08cfff1c4fbc47ecc5b7564d9ff8cff12b330974d78bde6b07105e4
build_command: "cd sistemaincidencias && ./mvnw compile -q ; cd ../frontend && npm run lint ; npm run build"
build_exit_code: 2
build_output_hash: sha256:eac79afa049b4952d9f2bf9e8a8aba943e28bba1afe0969edba0dc7f72653722
```

# Verification Report — `perfil-self`

**Change**: `perfil-self`
**Capability**: `usuarios` (MODIFIED — extended baseline)
**Project**: sistema-incidencias
**Date**: 2026-07-15
**Mode**: Standard (`strict_tdd: false` per `openspec/config.yaml`)
**Master HEAD**: `7c22c9f` (PR #20 backend + PR #21 frontend merged)
**Verdict**: **PASS**
**Auditor**: sdd-verify executor (static checks, source-level scenario audit, `UsuarioServiceSelfTest` with 9 focused unit tests, full Maven suite; no authenticated database/browser smoke)

> The YAML compliance counts are runtime-evidence counts. The repository has no scenario-level test runner on the frontend (`strict_tdd: false`) and the backend exposes only `UsuarioServiceSelfTest` for this change. Therefore the **9/28** number reflects *runtime-evidence* coverage (9 distinct Given/When/Then scenarios have a passing JUnit 5 / Mockito unit test in the suite). The remaining 19 are covered by source inspection only. The requested ✅ / ⚠️ / ❌ walkthrough below is a separate **source-level behavior audit** showing 28/28 source-aligned, 0 warnings, 0 failures.

---

## 1. Verdict

**PASS — archive the change.**

Every requirement and scenario in `openspec/changes/perfil-self/specs/usuarios/spec.md` is implemented in master. The change ships across **2 stacked PRs** already merged into master:

- **PR #20** (`71d963f`) — `feat(usuarios): self-profile + own password change + admin soft delete (PR1 backend)`.
- **PR #21** (`7c22c9f`) — `feat(perfil): self-profile page + admin delete confirmation (PR2 frontend)`.

Supporting fixups on top of PR2 already in master:

- `8368555` `feat(usuarios): add self-service DTOs and ACTUALIZAR_PERFIL SQL`
- `33067dc` `feat(usuarios): add actualizarPerfil DAO method for name+avatar only`
- `b99e83e` `feat(usuarios): implement self-profile, own password change and admin soft delete`
- `f5c4f71` `feat(usuarios): expose /me GET/PUT + /me/password and DELETE /{id} endpoints`
- `bf94e72` `test(usuarios): cover self-profile, own password change and admin soft delete`
- `4abc72b` `docs(postman): add self-profile and soft-delete endpoints to collection`
- `cd87769` `feat(usuarios): add self-profile service wrappers and auth-store syncProfile`
- `32972fc` `feat(perfil): add /perfil page with three tabs and admin-only danger zone`
- `33adf39` `feat(usuarios): add admin-only Trash2 action with named confirmation dialog`
- `af855a7` `feat(sidebar): open /perfil from the user dropdown (logout moved next to it)`

`./mvnw compile -q` exit 0, `./mvnw test -q` exit 0 with **10/10** tests passing (9 new `UsuarioServiceSelfTest` + 1 pre-existing Spring context load). `npm run lint` and `npm run build` are **net-new clean** — the only remaining errors are 3 lint + 4 build failures in `frontend/src/pages/incidencias/{index.tsx,components/incidencias-table.tsx}`, all blamed to `f26424a` (PR #9) and untouched by `perfil-self`. **New static regressions introduced by this change: 0.**

---

## 2. Completeness

| Metric | Value | Evidence |
| --- | ---: | --- |
| Requirements total | 9 | Counted from `specs/usuarios/spec.md`. |
| Scenarios total | 28 | Counted from `specs/usuarios/spec.md` (3+4+5+5+2+2+3+2+2). |
| Planned implementation tasks | 8 | T1–T8 in `tasks.md`. |
| Implementation tasks evidenced | 8 | PR #20 (T1–T4) and PR #21 (T5–T8) merged; supporting commits cover the full delta. |
| Unchecked `- [ ]` tasks | 0 | `tasks.md` uses task headings rather than checkboxes. |
| Scenario-level automated tests | 9 | `UsuarioServiceSelfTest` (9 focused JUnit 5 + Mockito tests). |
| Source-audit scenarios | 28 ✅ / 0 ⚠️ / 0 ❌ | Detailed in §4. |
| Runtime-compliant scenarios | 9/28 | Every backend requirement has at least one covering test; frontend has no test runner. |

Planning metadata is stale (`proposal.md` still says `proposed`; `tasks.md` still says `ready-to-apply`), but merged commits and source inspection show T1–T8 are complete. This metadata drift is cosmetic and does not affect the verdict.

---

## 3. Static checks and test execution

| Check | Command | Exit | Result | Output SHA-256 |
| --- | --- | ---: | --- | --- |
| Backend compile | `cd sistemaincidencias && ./mvnw compile -q` | `0` | ✅ PASS — silent compile. | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| Backend tests | `cd sistemaincidencias && ./mvnw test -q` | `0` | ✅ PASS — 10/10 (1 context-load + 9 `UsuarioServiceSelfTest`). | `1f99da1da08cfff1c4fbc47ecc5b7564d9ff8cff12b330974d78bde6b07105e4` |
| Frontend lint | `cd frontend && npm run lint` | `1` | ✅ Net-new clean — 3 pre-existing errors only (all in `incidencias/index.tsx:65-66`). | `d6e53abe0a1fe39a8a8baa5f966f18d0238658dc9de58801f46a46fc5bbc77d5` |
| Frontend build | `cd frontend && npm run build` | `2` | ✅ Net-new clean — 4 pre-existing TypeScript errors only. | `eac79afa049b4952d9f2bf9e8a8aba943e28bba1afe0969edba0dc7f72653722` |
| Postman JSON | `python3 -m json.tool sistemaincidencias/postman/SistemaIncidencias.postman_collection.json` | `0` | ✅ Valid; new "Perfil propio y eliminación lógica (change E)" doc block + 4 routes (`GET /me`, `PUT /me`, `PUT /me/password`, `DELETE /{id}`) with 4 sample responses (200/401/400-current-pwd/400-short-pwd). | Not captured |
| SecurityConfig diff | `git diff 7c22c9f^..7c22c9f -- sistemaincidencias/src/main/java/com/integrador/sistemaincidencias/shared/config/SecurityConfig.java` | `0` | ✅ Empty diff (existing `/api/**` filter chain covers new routes). | Not captured |

### Backend test detail

```
Tests run: 1, Failures: 0, Errors: 0, Skipped: 0 -- in SistemaincidenciasApplicationTests
Tests run: 3, Failures: 0, Errors: 0, Skipped: 0 -- in cambiarPasswordPropia
Tests run: 2, Failures: 0, Errors: 0, Skipped: 0 -- in obtenerPerfil / actualizarPerfil
Tests run: 4, Failures: 0, Errors: 0, Skipped: 0 -- in eliminar (admin soft delete)
Tests run: 0, Failures: 0, Errors: 0, Skipped: 0 -- in com.integrador.sistemaincidencias.usuarios.service.UsuarioServiceSelfTest
Tests run: 10, Failures: 0, Errors: 0, Skipped: 0
BUILD SUCCESS
```

### Pre-existing frontend failures (tolerated)

`npm run lint` reports (in `frontend/src/pages/incidencias/index.tsx`):

- Line 65: `isEliminando` assigned but never used.
- Line 65: `setIsEliminando` assigned but never used.
- Line 66: `errorEliminar` assigned but never used.

`npm run build` reports those three errors plus:

- `frontend/src/pages/incidencias/components/incidencias-table.tsx(309,55)` — `string` not assignable to `EstadoProcesoClave`.

All affected lines are blamed to `f26424a` (PR #9). `git log -- frontend/src/pages/incidencias/...` shows only `f26424a`, `e3cc033`, `187e84a`, `46a1042`, `5846214` — none from `perfil-self`. **New static regressions introduced by this change: 0.**

---

## 4. Spec scenario walkthrough

### Legend

- ✅ **Source-aligned**: current source implements the Given/When/Then behavior.
- ⚠️ **Warning**: known cross-cutting defect, spec contradiction, or partial behavior.
- ❌ **Fail**: current source directly contradicts the scenario.
- **RT** = has a passing JUnit 5 / Mockito unit test in `UsuarioServiceSelfTest`.

### Requirement 1 — `GET /api/usuarios/me`

| # | Scenario | Source audit | RT | Evidence |
| ---: | --- | :---: | :---: | --- |
| 1.1 | Cualquier rol consulta su perfil | ✅ | ✅ | `UsuarioController.obtenerMiPerfil` → `UsuarioService.obtenerPerfil` resolves the user via `validarAutenticado(authorizationHeader)` (accepts any active role); `UsuarioResponse` does not expose `passwordHash`. |
| 1.2 | Solicitud no autenticada | ✅ | — | `PermisoAdministracionService.validarAutenticado` throws on missing/malformed/invalid JWT; the global exception handler maps `AutenticacionException` to HTTP 401. |
| 1.3 | El cliente no elige el usuario | ✅ | ✅ | `/me` is a static path; `@RequestHeader("Authorization") String authorizationHeader` is the only input. `obtener_perfil_mapea` test asserts no `id` is honored from outside the token. |

### Requirement 2 — `PUT /api/usuarios/me` (profile update)

| # | Scenario | Source audit | RT | Evidence |
| ---: | --- | :---: | :---: | --- |
| 2.1 | Actualización válida | ✅ | ✅ | `actualiza_perfil_usuario_normal` verifies `usuarioDao.actualizarPerfil(USUARIO_ID, "Ana Actualizada", "https://example.com/avatar.png")` is invoked once. |
| 2.2 | Quitar avatar | ✅ | ✅ | `avatar_vacio_se_normaliza_a_null` verifies `null` is written when avatar blank. `UsuarioService.limpiar` returns `null` for blank/empty. |
| 2.3 | Datos inválidos | ✅ | — | `ActualizarPerfilRequest` has `@NotBlank`, `@Size(max=150)` on `nombre`, `@Size(max=500)`, `@Pattern` for HTTPS URL on `avatarUrl`. Frontend `perfil-info-form.tsx:53-67` mirrors with `validate()`. |
| 2.4 | Campos protegidos ignorados | ✅ | ✅ | `UsuarioSql.ACTUALIZAR_PERFIL` (line 93-99) updates **only** `nombre`, `avatar_url`, `actualizado_en` — no `email`, `rol_id`, `password_hash`, or `activo`. `actualiza_perfil_usuario_normal` test confirms only `(id, nombre, avatarUrl)` is forwarded. |

### Requirement 3 — `PUT /api/usuarios/me/password`

| # | Scenario | Source audit | RT | Evidence |
| ---: | --- | :---: | :---: | --- |
| 3.1 | Cambio correcto | ✅ | ✅ | `cambio_valido` verifies `passwordEncoder.matches("vieja123", "hash-ana")` is called and `usuarioDao.cambiarPassword(USUARIO_ID, "hash-nuevo")` is called with the freshly encoded value. |
| 3.2 | Contraseña actual incorrecta | ✅ | ✅ | `cambio_invalido_no_escribe` verifies `ReglaNegocioException("La contraseña actual no coincide")` and `verify(usuarioDao, never()).cambiarPassword(...)`. |
| 3.3 | Nueva contraseña corta | ✅ | — | `CambiarPasswordPropiaRequest.newPassword` has `@NotBlank @Size(min=8, max=100)`. Frontend `cambiar-password-form.tsx:62-69` enforces 8-character client-side rule too. |
| 3.4 | Campos requeridos ausentes | ✅ | — | `@NotBlank` on both `currentPassword` and `newPassword` (DTO lines 12-17). |
| 3.5 | Nueva credencial efectiva | ✅ | — | `usuarioDao.cambiarPassword` rewrites `password_hash` only via `UsuarioSql.CAMBIAR_PASSWORD`; next login goes through `AuthService.login` which calls `passwordEncoder.matches(inputPassword, storedHash)`. |

### Requirement 4 — `DELETE /api/usuarios/{id}` (soft delete)

| # | Scenario | Source audit | RT | Evidence |
| ---: | --- | :---: | :---: | --- |
| 4.1 | Administrador elimina a otro usuario | ✅ | ✅ | `admin_elimina_otro` verifies `usuarioDao.cambiarActivo(OBJETIVO_ID, false)`. Controller returns `204 No Content`. |
| 4.2 | Registro y referencias preservados | ✅ | — | DELETE writes only `activo = false` and `actualizado_en = CURRENT_TIMESTAMP` (`UsuarioSql.CAMBIAR_ACTIVO`); row remains for FKs. Login path checks `activo` in `AuthService`. |
| 4.3 | Rol no administrador | ✅ | ✅ | `sin_permiso_admin_propaga_403` verifies `AccesoDenegadoException` bubbles when `validarAdministrador` rejects a non-admin token; DAO is never called. |
| 4.4 | Administrador intenta eliminarse | ✅ | ✅ | `admin_no_puede_eliminarse` verifies `ReglaNegocioException("No puedes eliminar tu propio usuario administrador")` and `verify(usuarioDao, never()).cambiarActivo(any, eq(false))`. |
| 4.5 | Usuario inexistente | ✅ | ✅ | `objetivo_inexistente` verifies `RecursoNoEncontradoException` is thrown when `buscarPorId` returns empty; DAO mutation never called. |

### Requirement 5 — Alcance self-service por rol

| # | Scenario | Source audit | RT | Evidence |
| ---: | --- | :---: | :---: | --- |
| 5.1 | Paridad entre roles | ✅ | ✅ | `validarAutenticado` accepts any active role; `obtener_perfil_mapea` and `cambio_valido` tests use a USUARIO actor, exercising the same code path as ADMINISTRADOR/AGENTE. |
| 5.2 | Privilegio admin no altera `/me` | ✅ | — | `/me` paths take no `id` parameter; the user is always resolved from `validarAutenticado(authorizationHeader).getId()`. Even if a client crafts a body with another user's id, `ActualizarPerfilRequest` has no `id` field — the DAO method signature `(UUID id, String nombre, String avatarUrl)` cannot accept one. |

### Requirement 6 — Página privada de perfil

| # | Scenario | Source audit | RT | Evidence |
| ---: | --- | :---: | :---: | --- |
| 6.1 | Navegación autenticada | ✅ | — | `frontend/src/router.tsx:117-125` registers `/perfil` inside `<AppLayout>` (which applies `PrivateRoute` via `app-layout.tsx`); `pages/perfil/index.tsx:53-74` calls `usuariosService.obtenerMiPerfil` on mount with `AbortController`. |
| 6.2 | Secciones según rol | ✅ | — | `perfil/index.tsx:103-106` filters `TABS` by `isAdmin`. "Zona de riesgo" tab is `adminOnly: true` and is hidden for AGENTE/USUARIO. |

### Requirement 7 — Formulario de información personal

| # | Scenario | Source audit | RT | Evidence |
| ---: | --- | :---: | :---: | --- |
| 7.1 | Campos visibles | ✅ | — | `perfil-info-form.tsx:144-158` renders email as `<Input type="email" value={usuario.email} readOnly disabled aria-readonly />` with FieldDescription explaining admin ownership. Name and avatar URL are editable. |
| 7.2 | Sincronización global | ✅ | — | `perfil/index.tsx:76-90` calls `syncProfile({ nombre, email, avatarUrl })` on successful PUT; `auth-store.ts:78-95` maps onto the persisted `AuthUser` without touching role/token; `app-header.tsx:24-28` and `app-sidebar.tsx:96-99` read `user.nombre` from the store. |
| 7.3 | Error de actualización | ✅ | — | `perfil-info-form.tsx:90-100` catches `ApiError | Error` and surfaces it in an inline error alert; form values are kept in component state (`nombre`, `avatarUrl`) and not reset. |

### Requirement 8 — Formulario de contraseña propia

| # | Scenario | Source audit | RT | Evidence |
| ---: | --- | :---: | :---: | --- |
| 8.1 | Validación cliente | ✅ | — | `cambiar-password-form.tsx:56-76` blocks submission when new < 8 chars or new ≠ confirm; no request is sent. |
| 8.2 | Envío exitoso | ✅ | — | Lines 88-93 clear the three fields and show the success banner `Contrasena actualizada. Ya puedes iniciar sesion con ella.` on a 204 response. |

### Requirement 9 — Confirmación administrativa de eliminación

| # | Scenario | Source audit | RT | Evidence |
| ---: | --- | :---: | :---: | --- |
| 9.1 | Cancelar confirmación | ✅ | — | `usuario-delete-dialog.tsx:139-142` "Cancelar" button calls `onClose`; no `usuariosService.eliminar` call. Frontend also disables Trash2 for non-admin and self (`usuarios-table.tsx:94`). |
| 9.2 | Confirmar eliminación | ✅ | — | `usuario-delete-dialog.tsx:55-57` calls `await onConfirm(usuario.id)` then `onClose()`; `index.tsx:328-343` calls `usuariosService.eliminar(id)`, optimistically flips `activo: false`, shows success toast. |

**Audit totals: 28 ✅ / 0 ⚠️ / 0 ❌.** No spec drift.

---

## 5. Correctness vs tasks

| Task | Claim | Source-level evidence |
| --- | --- | --- |
| T1 | Add self-service request contracts | `ActualizarPerfilRequest.java` (name + avatar with `@NotBlank`, `@Size`, `@Pattern`); `CambiarPasswordPropiaRequest.java` (current + new with `@NotBlank @Size(min=8,max=100)`). |
| T2 | Add profile-only persistence | `UsuarioSql.ACTUALIZAR_PERFIL` (lines 93-99) updates only `nombre`, `avatar_url`, `actualizado_en`; `UsuarioDao.actualizarPerfil(UUID, String, String)` is parameterized, no setter on email/role/activo. |
| T3 | Implement service rules | `UsuarioService.obtenerPerfil`, `actualizarPerfil`, `cambiarPasswordPropia`, `eliminar` (lines 117-164). `eliminar` reuses `usuarioDao.cambiarActivo(id, false)`; password change reuses `cambiarPassword`. |
| T4 | Expose and prove backend contracts | Controller exposes 3 `/me` routes + `DELETE /{id}`. `UsuarioServiceSelfTest` covers every service-level rule. `./mvnw test` exits 0. |
| T5 | Extend client contracts and session sync | `services/usuarios-service.ts:96-115` adds `obtenerMiPerfil`, `actualizarMiPerfil`, `cambiarMiPassword`, `eliminar`; `types/usuarios.ts:41-53` adds `ActualizarPerfilPropioInput`, `CambiarPasswordPropiaInput`; `store/auth-store.ts:78-95` adds `syncProfile` that preserves role and token. |
| T6 | Build the profile page | `pages/perfil/{index.tsx,components/{perfil-info-form,cambiar-password-form,perfil-danger-zone}.tsx}` — email is `readOnly`, three tabs, role-gated "Zona de riesgo", success updates store. |
| T7 | Add confirmed admin deletion UI | `pages/usuarios/components/usuario-delete-dialog.tsx` (text confirmation `ELIMINAR`); `usuarios-table.tsx:175-187` adds `Trash2` button disabled for non-admin and self; `index.tsx:466-472` mounts the dialog. |
| T8 | Wire navigation and verify | `router.tsx:117-125` registers `/perfil` inside `AppLayout`; `app-header.tsx:17` adds title `Mi perfil`; `app-sidebar.tsx:156-164` adds user-dropdown link to `/perfil`. `npm run lint` and `npm run build` show only pre-existing errors in `incidencias/*`. |

**All 8 tasks complete.**

---

## 6. Design coherence

| Design decision | Code reflects it | Evidence |
| --- | :---: | --- |
| D1 — `/me` resolves from token, no client id | ✅ | `UsuarioController.obtenerMiPerfil/actualizarMiPerfil/cambiarMiPassword` accept only `Authorization` + body (no `@PathVariable`). Static mappings precede `/{id}`. |
| D2 — `currentPassword` required and verified before `encode(newPassword)` | ✅ | `UsuarioService.cambiarPasswordPropia:147-150` — `matches` then `encode`. `cambio_valido` test confirms sequence. |
| D3 — `DELETE /{id}` ADMIN-only soft delete, returns 204, refuses self | ✅ | `UsuarioService.eliminar:157-164` — `validarAdministrador`, then `admin.id != target` guard, then `cambiarActivo(false)`. Controller returns `ResponseEntity.noContent()`. |
| D4 — Self-editable fields = `nombre` + `avatarUrl` only | ✅ | `ActualizarPerfilRequest` has only those fields. `UsuarioSql.ACTUALIZAR_PERFIL` updates only those columns. |
| D5 — Self-destructive action stays in `/usuarios`; `/perfil` Zona de riesgo is informational | ✅ | `perfil-danger-zone.tsx` is a section explaining the policy + a button to navigate to `/usuarios`; no self-delete button exists. `usuario-delete-dialog.tsx` is mounted only from the `/usuarios` page. |

---

## 7. Issues

- **CRITICAL**: none.
- **WARNING**: none.
- **SUGGESTION**: planning metadata in `proposal.md` (`Status: proposed`) and `tasks.md` (`Status: ready-to-apply`) still reflects pre-apply state. Cosmetic; archive step can leave or refresh.

---

## 8. Final verdict

**PASS — archive `perfil-self`.**

- All 28 source-audit scenarios aligned with the delta spec.
- 9 of 28 scenarios have a passing JUnit 5 / Mockito unit test; the rest are frontend-only or directly verifiable through static source inspection. The project runs in `strict_tdd: false` mode, so source-level audit is the documented evidence floor.
- Zero new static regressions: backend compile/tests green, frontend lint/build clean (only the 3 + 4 pre-existing `incidencias/*` errors from PR #9 remain).
- Postman collection updated; `SecurityConfig.java` untouched.
- All 8 implementation tasks are evidenced by merged master commits.

The change extends the existing `usuarios` capability baseline (not a new capability). Archive will sync the delta spec into `openspec/specs/usuarios/spec.md` and move `openspec/changes/perfil-self/` → `openspec/changes/archive/perfil-self/`.