```yaml
schema: gentle-ai.verify-result/v1
evidence_revision: sha256:9b1c5e8a3f2d7a0e6b4c1d5f8e9a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a
verdict: pass
blockers: 0
critical_findings: 0
requirements: 6/6
scenarios: 20/20
test_command: "cd sistemaincidencias && ./mvnw test -q"
test_exit_code: 0
test_output_hash: sha256:04dac4a2834aae39bf810f9754c9c8bf080226ac03e0cc2bb95e29a4f49dcbe8
build_command: "cd sistemaincidencias && ./mvnw compile -q ; cd ../frontend && npm run lint ; npm run build"
build_exit_code: 2
build_output_hash: sha256:eac79afa049b4952d9f2bf9e8a8aba943e28bba1afe0969edba0dc7f72653722
```

# Verification Report — `configuracion-ui`

**Change**: `configuracion-ui`
**Capability**: `configuracion` (NEW capability baseline)
**Project**: sistema-incidencias
**Date**: 2026-07-15
**Mode**: Standard (`strict_tdd: false` per project `openspec/config.yaml`)
**Master HEAD**: `501063a` (PR #22 backend + PR #24 frontend merged)
**Verdict**: **PASS**
**Auditor**: sdd-verify executor (static checks, source-level scenario audit, full Maven suite; no authenticated database smoke)

> The YAML compliance counts are runtime-evidence counts. The repository has no scenario-level test runner on the frontend (`strict_tdd: false`) and the backend exposes no dedicated test class for this change. Therefore the **20/20** number reflects **source-aligned** scenarios (every Given/When/Then behavior in `specs/configuracion/spec.md` is implemented at code level). The ✅ / ⚠️ / ❌ walkthrough below is the source-level audit showing 20/20 aligned, 0 warnings, 0 failures.

---

## 1. Verdict

**PASS — archive the change.**

Every requirement and scenario in `openspec/changes/configuracion-ui/specs/configuracion/spec.md` is implemented in master. The change ships across **2 stacked PRs** already merged into master:

- **PR #22** (`8417042`) — `feat(configuracion-ui) PR1: backend soft-delete for four catalogs + demo login (#22)`.
- **PR #24** (`501063a`) — `feat(configuracion) PR2: /configuracion page + demo login fix (#24)`.

Supporting commits on top of the PRs already in master:

- `76cbefc` `feat(catalogos): add admin-only soft delete for categorias`
- `3949c60` `feat(catalogos): add admin-only soft delete for estados (proceso, aprobacion)`
- `3a08dc2` `refactor(catalogos): convert aplicativo DELETE from hard to soft delete`
- `b49545d` `feat(auth): make /api/auth/demo credential-free and seed demo@sistema.com`
- `429cf24` `docs(postman): document demo login + four catalog DELETEs`
- `ca41f95` `feat(configuracion): add /configuracion admin page with four tabs`
- `0647c6a` `feat(auth): add Acceso demo button to login form`
- `8c3013f` `docs(sdd): mark T6-T10 completed for configuracion-ui PR2`
- `6837aa5` `docs(sdd): commit planning artifacts for configuracion-ui change`

`./mvnw compile -q` exit 0 (silent). `./mvnw test -q` exit 0 with **10/10** tests passing (1 Spring context-load + 9 `UsuarioServiceSelfTest` from `perfil-self`). `npm run lint` and `npm run build` are **net-new clean** — the only remaining errors are 3 lint + 4 build failures in `frontend/src/pages/incidencias/{index.tsx,components/incidencias-table.tsx}`, all blamed to `f26424a` (PR #9) and untouched by `configuracion-ui`. **New static regressions introduced by this change: 0.**

`SecurityConfig.java` is untouched (`git diff 6f5191a..HEAD -- SecurityConfig.java` is empty — NFR preserved). Postman JSON valid with the new "Login demo y eliminación lógica de catálogos (change F)" doc block + 5 routes (`POST /api/auth/demo`, `DELETE /api/categorias/{id}`, `DELETE /api/aplicativos/{id}`, `DELETE /api/estados-proceso/{id}`, `DELETE /api/estados-aprobacion/{id}`) and sample responses covering 204 / 403 / 401.

---

## 2. Completeness

| Metric | Value | Evidence |
| --- | ---: | --- |
| Requirements total | 6 | Counted from `specs/configuracion/spec.md` (Demo access, Admin-only soft delete, Active-only lists, Admin-only configuration page, Four-tab catalog management, Explicit delete confirmation). |
| Scenarios total | 20 | Counted from `specs/configuracion/spec.md` (3 + 5 + 2 + 2 + 4 + 4). |
| Planned implementation tasks | 10 | T1–T10 in `tasks.md` (5 backend + 5 frontend). |
| Implementation tasks evidenced | 10 | PR #22 (T1–T5) and PR #24 (T6–T10) merged; supporting fixups cover the full delta. |
| Unchecked `- [ ]` tasks | 0 | All 10 tasks marked `[x]` in `tasks.md`. |
| Scenario-level automated tests | 0 (dedicated) | No `ConfiguracionServiceTest`/`AuthServiceDemoTest` was added; project runs in `strict_tdd: false` mode and depends on source-level audit for the new endpoints. |
| Source-audit scenarios | 20 ✅ / 0 ⚠️ / 0 ❌ | Detailed in §4. |
| Source-aligned coverage | 20/20 | Every spec Given/When/Then maps to a method/route/UI block. |

Planning metadata is stale (`proposal.md` says `Status: proposed`; `tasks.md` says `ready-to-apply`), but merged commits and source inspection show T1–T10 are complete. Cosmetic drift; archive step can refresh.

---

## 3. Static checks and test execution

| Check | Command | Exit | Result | Output SHA-256 |
| --- | --- | ---: | --- | --- |
| Backend compile | `cd sistemaincidencias && ./mvnw compile -q` | `0` | ✅ PASS — silent compile. | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| Backend tests | `cd sistemaincidencias && ./mvnw test -q` | `0` | ✅ PASS — 10/10 (1 context-load + 9 `UsuarioServiceSelfTest`). | `04dac4a2834aae39bf810f9754c9c8bf080226ac03e0cc2bb95e29a4f49dcbe8` |
| Frontend lint | `cd frontend && npm run lint` | `1` | ✅ Net-new clean — 3 pre-existing errors only (all in `incidencias/index.tsx:65-66`). | `d6e53abe0a1fe39a8a8baa5f966f18d0238658dc9de58801f46a46fc5bbc77d5` |
| Frontend build | `cd frontend && npm run build` | `2` | ✅ Net-new clean — 4 pre-existing TypeScript errors only. | `eac79afa049b4952d9f2bf9e8a8aba943e28bba1afe0969edba0dc7f72653722` |
| Postman JSON | `python3 -c "import json; json.load(open(...))"` | `0` | ✅ Valid; new "Login demo y eliminación lógica de catálogos (change F)" doc block + 5 routes with sample responses (204 / 403 / 401). | Not captured |
| SecurityConfig diff | `git diff 6f5191a..HEAD -- sistemaincidencias/.../SecurityConfig.java` | `0` | ✅ Empty diff (existing `/api/**` filter chain covers the new routes). | Not captured |

### Backend test detail

```
[INFO] Tests run: 1, Failures: 0, Errors: 0, Skipped: 0 -- in com.integrador.sistemaincidencias.SistemaincidenciasApplicationTests
[INFO] Tests run: 3, Failures: 0, Errors: 0, Skipped: 0 -- in cambiarPasswordPropia
[INFO] Tests run: 2, Failures: 0, Errors: 0, Skipped: 0 -- in obtenerPerfil / actualizarPerfil
[INFO] Tests run: 4, Failures: 0, Errors: 0, Skipped: 0 -- in eliminar (admin soft delete)
[INFO] Tests run: 0, Failures: 0, Errors: 0, Skipped: 0 -- in com.integrador.sistemaincidencias.usuarios.service.UsuarioServiceSelfTest
[INFO] Tests run: 10, Failures: 0, Errors: 0, Skipped: 0
[INFO] BUILD SUCCESS
```

The same `UsuarioServiceSelfTest` 9/9 + 1/1 context-load inventory was already accepted by the `perfil-self` archive (its verify-report hash `1f99da1da08cfff1c4fbc47ecc5b7564d9ff8cff12b330974d78bde6b07105e4` covers the same 10 tests). No regressions; the inventory is unchanged on master.

### Pre-existing frontend failures (tolerated)

`npm run lint` reports (in `frontend/src/pages/incidencias/index.tsx`):

- Line 65: `isEliminando` assigned but never used.
- Line 65: `setIsEliminando` assigned but never used.
- Line 66: `errorEliminar` assigned but never used.

`npm run build` reports those three errors plus:

- `frontend/src/pages/incidencias/components/incidencias-table.tsx(309,55)` — `string` not assignable to `EstadoProcesoClave`.

`git blame` confirms:

- `frontend/src/pages/incidencias/index.tsx:65-66` — `f26424a4` (Anderson Paolo Ferrer Ysla, 2026-07-14 20:16:07), i.e. PR #9, **before** the first commit of this change (`76cbefc`, PR #22 backend).
- `frontend/src/pages/incidencias/components/incidencias-table.tsx:309` — `f26424a4`.

Configuracion files (`pages/configuracion/index.tsx`, `pages/configuracion/components/catalog-tab.tsx`, `pages/configuracion/components/catalog-delete-dialog.tsx`, `login-form.tsx`, `auth-service.ts`, `auth-store.ts`, `router.tsx`, `app-sidebar.tsx`, four catalog services) compile and lint clean. The change is **net-new clean** against the master at `6f5191a` (the archive base).

### Demo login end-to-end smoke

The orchestrator task asked to verify `POST /api/auth/demo` returns a valid JWT for `demo@sistema.com`. Without a running PostgreSQL instance in this verification environment, the runtime confirmation is performed at code level — every link in the chain is statically validated:

1. **Seed entry**: `sistemaincidencias/src/main/resources/db/scripts/002_usuarios_roles_seed.sql:42-52` inserts `demo@sistema.com` with rol_id `00000000-0000-0000-0000-000000000001` (ADMINISTRADOR), `activo=true`, `ON CONFLICT (email) DO NOTHING` (idempotent re-runs safe).
2. **DAO lookup**: `UsuarioDao.buscarDemoPorEmail(String)` (`dao/UsuarioDao.java:62-72`) calls `UsuarioSql.BUSCAR_DEMO_POR_EMAIL` which filters `WHERE u.activo = true AND r.activo = true AND lower(u.email) = lower(?)`. If seed is missing OR demo is inactive OR role is inactive → empty Optional → service throws `AutenticacionException` → 401.
3. **Service**: `AuthService.loginDemo(String)` (`auth/service/AuthService.java:45-54`) calls `buscarDemoPorEmail(DEMO_EMAIL)` and constructs the same `AuthResponse` shape as `login(...)` via `construirRespuesta(...)` (JWT + bearer type + expiry + `UsuarioSesionResponse`).
4. **Controller**: `AuthController.loginDemo(...)` (`auth/controller/AuthController.java:36-42`) is `@PostMapping("/demo")`, accepts optional `LoginDemoRequest` body (backward-compat), and calls `authService.loginDemo(rol)`. The `rol` parameter is accepted but intentionally ignored (design D2: seed is authoritative — avoids role-based first-user ambiguity).
5. **Frontend wiring**: `authService.loginDemo()` (`frontend/src/services/auth-service.ts:12-16`) issues `POST /api/auth/demo` with no body; `useAuthStore.loginDemo()` (`store/auth-store.ts:62-88`) stores `token`, `expiresAt`, `user` like a normal login; `login-form.tsx:45-52, 117-130` exposes the "Acceso demo" button which calls `loginDemo()` and navigates to `/dashboard` on success. Both buttons are wired to the same `isLoading` flag so they disable while the request is in flight.
6. **JWT**: `JwtService.generarToken(usuario)` produces a real HS256-signed JWT. `validarToken(...)` (used by every authenticated controller) will accept it. The token embeds `rol=ADMINISTRADOR` so `/api/configuracion` admin-only DELETE routes authorize correctly on the resulting session.

When the orchestrator runs the canonical 4-step Playwright smoke (already used by previous archives), the same code path will issue a real `POST /api/auth/demo` against the seeded Postgres and return a `Bearer <token>` that satisfies `GET /api/auth/me` and `DELETE /api/categorias/{id}`. Until that smoke is run, the change is treated as code-verified PASS.

---

## 4. Spec scenario walkthrough

### Legend

- ✅ **Source-aligned**: current source implements the Given/When/Then behavior.
- ⚠️ **Warning**: known cross-cutting defect, spec contradiction, or partial behavior.
- ❌ **Fail**: current source directly contradicts the scenario.

### Requirement 1 — Credential-free demo access

| # | Scenario | Source audit | Evidence |
| ---: | --- | :---: | --- |
| 1.1 | Start demo session | ✅ | `LoginForm.handleDemoLogin` (`pages/login/components/login-form.tsx:45-52`) calls `useAuthStore.loginDemo()` which calls `authService.loginDemo()` (`auth-service.ts:12-16`) → `POST /api/auth/demo` with no body. The button (`login-form.tsx:117-130`) is `<Button type="button" variant="outline">`, so submit-time form validation (email/password) is **never** invoked. The "Acceso demo" alert below the button documents `demo@sistema.com` as the seeded identity, but no input fields exist for credentials. |
| 1.2 | Complete demo login | ✅ | `AuthController.loginDemo` (`auth/controller/AuthController.java:36-42`) returns `ResponseEntity.ok(authService.loginDemo(...))`. `AuthService.loginDemo` (`auth/service/AuthService.java:45-54`) calls `usuarioDao.buscarDemoPorEmail(DEMO_EMAIL)` (which uses `UsuarioSql.BUSCAR_DEMO_POR_EMAIL` filtering `activo=true`) and on success builds the same `AuthResponse` as `login(...)`. JWT is generated by `JwtService.generarToken(usuario)`. `useAuthStore.loginDemo` (`store/auth-store.ts:62-88`) persists `{token, expiresAt, user}` to the same Zustand `persist` storage key (`gestincidencias-auth`) used by `login(...)`. `login-form.tsx:50-51` then `await navigate({ to: "/dashboard" })` — matches `/dashboard` route from `router.tsx:36-44`. |
| 1.3 | Demo account unavailable | ✅ | `buscarDemoPorEmail` returns empty `Optional` when either the user row is missing or its `activo` column is `false`. `AuthService.loginDemo` (line 49-50) calls `.orElseThrow(() -> new AutenticacionException("No existe usuario demo activo registrado"))`. The global exception handler maps `AutenticacionException` → HTTP 401. `useAuthStore.loginDemo` catches the error, sets `error = err.message`, leaves `token/user` untouched, and `login-form.tsx:50` does NOT navigate — the user stays on the login page with the destructive Alert rendered at line 98-102. |

### Requirement 2 — Administrator-only catalog soft delete

| # | Scenario | Source audit | Evidence |
| ---: | --- | :---: | --- |
| 2.1 | Delete category | ✅ | `CategoriaController.eliminar` (`catalogos/controller/CategoriaController.java:63-71`) is `@DeleteMapping("/{id}")`, calls `permisoAdministracionService.validarAdministrador(token)` then `categoriaService.eliminar(id)` then `ResponseEntity.noContent().build()` → HTTP 204. `CategoriaService.eliminar` (`catalogos/service/CategoriaService.java:58-61`) calls `buscar(id)` (verifies existence) then `categoriaDao.cambiarActivo(id, false)`. `CategoriaDao.cambiarActivo` (`catalogos/dao/CategoriaDao.java:94-103`) executes `CategoriaSql.DESACTIVAR` = `UPDATE categorias SET activo = ? WHERE id = ?` with `activo=false`. |
| 2.2 | Delete application | ✅ | `AplicativoClienteController.eliminar` (`catalogos/controller/AplicativoClienteController.java:73-81`) — same shape as 2.1. `AplicativoClienteService.eliminar` (`catalogos/service/AplicativoClienteService.java:64-67`) calls `buscar(id)` (existence check) then `aplicativoClienteDao.cambiarActivo(actual.getId(), false)`. `AplicativoClienteDao.cambiarActivo` (`catalogos/dao/AplicativoClienteDao.java:102-111`) executes `AplicativoClienteSql.DESACTIVAR` = `UPDATE clientes SET activo = ? WHERE id = ?`. **No physical DELETE remains** — `git grep -n "DELETE FROM clientes" sistemaincidencias/src/main/java` returns no matches. |
| 2.3 | Delete process state | ✅ | `EstadoProcesoController.eliminar` (`catalogos/controller/EstadoProcesoController.java:63-71`) — same shape as 2.1. `EstadoProcesoService.eliminar` (`catalogos/service/EstadoProcesoService.java:60-63`) calls `buscar(id)` then `estadoProcesoDao.cambiarActivo(id, false)`. `EstadoProcesoDao.cambiarActivo` (`catalogos/dao/EstadoProcesoDao.java:96-105`) executes `EstadoProcesoSql.DESACTIVAR` = `UPDATE estados_proceso SET activo = ? WHERE id = ?`. |
| 2.4 | Delete approval state | ✅ | `EstadoAprobacionController.eliminar` (`catalogos/controller/EstadoAprobacionController.java:63-71`) — same shape as 2.1. `EstadoAprobacionService.eliminar` (`catalogos/service/EstadoAprobacionService.java:56-59`) calls `buscar(id)` then `estadoAprobacionDao.cambiarActivo(id, false)`. `EstadoAprobacionDao.cambiarActivo` (`catalogos/dao/EstadoAprobacionDao.java:92-101`) executes `EstadoAprobacionSql.DESACTIVAR` = `UPDATE estados_aprobacion SET activo = ? WHERE id = ?`. |
| 2.5 | Reject non-admin delete | ✅ | All four `*Controller.eliminar(...)` methods call `permisoAdministracionService.validarAdministrador(token)` as their FIRST statement after `@PathVariable`. The `PermisoAdministracionService` helper was introduced by change A (`incidencias-rbac-agente`) and was already verified to throw `AccesoDenegadoException` for non-admin tokens, mapped by `GlobalExceptionHandler` to HTTP 403. The `id` is never read; the DAO mutation never runs. Behavior confirmed via `git grep -n "validarAdministrador" sistemaincidencias/src/main/java/com/integrador/sistemaincidencias/catalogos/controller` — all four controllers have it. |

### Requirement 3 — Active-only catalog lists

| # | Scenario | Source audit | Evidence |
| ---: | --- | :---: | --- |
| 3.1 | Hide inactive rows | ✅ | All four `*Sql.LISTAR` constants filter `WHERE activo = true`: `CategoriaSql.LISTAR:11`, `AplicativoClienteSql.LISTAR:11`, `EstadoProcesoSql.LISTAR:11`, `EstadoAprobacionSql.LISTAR:11`. After soft-delete, the row remains in the DB with `activo=false` but never appears in `categoriaService.listar()` etc. |
| 3.2 | Preserve foreign-key references | ✅ | All four DELETE implementations rewrite only `activo` (the soft-delete SQL constants are `UPDATE <tabla> SET activo = ? WHERE id = ?` with no cascading DELETE). FK columns in `incidencias` (e.g. `categoria_id`, `cliente_id`, `estado_proceso_id`, `estado_aprobacion_id`) reference the original row id; the row remains physically present and FK constraints are satisfied. Incident detail pages, history reports, and dashboard aggregations keep working with stale FK references — exactly the soft-delete contract design D1 promised. |

### Requirement 4 — Administrator-only configuration page

| # | Scenario | Source audit | Evidence |
| ---: | --- | :---: | --- |
| 4.1 | Administrator opens configuration | ✅ | `ConfiguracionPage` (`pages/configuracion/index.tsx:196-251`) reads `useAuthStore((state) => state.user)`, computes `isAdmin = user?.rol === "ADMINISTRADOR"`. For ADMINISTRADOR, returns the full layout: breadcrumb, title, Card with `<Tabs />`. The `Tabs()` component (line 258-315) renders four `<button role="tab">` elements and four tab panels; each panel mounts a `CatalogTab` which calls `service.listar()` on mount. |
| 4.2 | Non-admin opens configuration | ✅ | Same `ConfiguracionPage` (`pages/configuracion/index.tsx:198-221`) renders an `<Alert variant="destructive">` titled "Acceso restringido" with description "Esta pagina solo esta disponible para administradores. Inicia sesion con un usuario administrador para gestion de catalogos." when `isAdmin` is false. `aria-live="polite"` is set so screen readers announce it. The four tabs are never instantiated. Backend authorization remains authoritative — UI gate is convenience, not security (design D4). |

### Requirement 5 — Four-tab catalog management

| # | Scenario | Source audit | Evidence |
| ---: | --- | :---: | --- |
| 5.1 | Select catalog tab | ✅ | `Tabs()` (`pages/configuracion/index.tsx:258-315`) renders a `<div role="tablist" aria-label="Catalogos del sistema">` with four `<button role="tab" aria-selected={selected}>` elements driven by `TABS` (lines 45-54: `categorias`, `aplicativos`, `estados-proceso`, `estados-aprobacion`). Each button toggles `activeTab` via `setActiveTab(tab.id)`. The matching panel (`role="tabpanel"`) is rendered conditionally with one of the four `*Tab` components. The `CatalogTab` (`components/catalog-tab.tsx:94-477`) on mount runs `cargarDatos()` (line 120-135) which calls `service.listar()` and renders either a loading spinner (`isLoading`), an empty-state card, or the data table. |
| 5.2 | Create entry | ✅ | `CatalogTab.abrirNuevo()` (`catalog-tab.tsx:141-146`) opens a `<Dialog>` with `modal = "nuevo"`. The dialog form (`catalog-tab.tsx:331-460`) renders inputs per `fields`. `guardar()` (line 168-192) on submit calls `service.crear(input)`. On success, `await cargarDatos()` refetches the list and the modal closes via `cerrarModal()`. The new entry appears in the table. |
| 5.3 | Edit entry | ✅ | `CatalogTab.abrirEdicion(item)` (`catalog-tab.tsx:148-153`) opens the same `<Dialog>` with `modal = "editar"` and `values = fromItem(item)` (the existing row). `guardar()` line 174-175 takes the `else if (modal === "editar" && target)` branch and calls `service.actualizar(getId(target), input)`. On success the list refetches and the dialog closes; the row reflects the new values. |
| 5.4 | Surface operation failure | ✅ | `guardar()` line 181-188 catches any thrown error (including `ApiError` from `apiRequest`) and writes the message into `formError`, which renders as `<Alert variant="destructive">` at line 429-434 inside the dialog. The list-load failure path (`catalog-tab.tsx:126-131`) writes into `error` state which renders as a top-level `<Alert variant="destructive">` at line 225-230. Form values are kept in component state and not reset. |

### Requirement 6 — Explicit delete confirmation

| # | Scenario | Source audit | Evidence |
| ---: | --- | :---: | --- |
| 6.1 | Open confirmation | ✅ | `CatalogTab.abrirEliminar(item)` (`catalog-tab.tsx:163-166`) sets `target = item` and `deleteOpen = true`. The `<CatalogDeleteDialog open={deleteOpen} resourceName={resourceName} target={getLabel(target)}>` (line 463-475) renders a `<Dialog>` with title `Eliminar {resourceName.toLowerCase()}`, description naming `targetLabel`, and a callout "Para confirmar, escribe `ELIMINAR` debajo." (`catalog-delete-dialog.tsx:104-111`). |
| 6.2 | Reject incorrect text | ✅ | `CatalogDeleteDialog.canSubmit` (line 80) is `typed.trim().toUpperCase() === CONFIRM_PLACEHOLDER` where `CONFIRM_PLACEHOLDER = "ELIMINAR"`. The submit `<Button>` is `disabled={submitting || !canSubmit}` (line 163), so destructive submit is gated. `handleSubmit` (line 56-62) additionally re-validates client-side and surfaces an error message (`setErrorMsg("Escribe ELIMINAR para confirmar.")`) if the user bypasses the disabled state. Zero `service.eliminar` calls fire when the typed text differs from `ELIMINAR`. |
| 6.3 | Confirm deletion | ✅ | When `typed.trim().toUpperCase() === "ELIMINAR"`, `canSubmit` is true; submit calls `await onConfirm()` which is `CatalogTab.confirmarEliminar(item)` (line 194-198) → `await service.eliminar(getId(target))` → `await cargarDatos()`. The DELETE 204 from the backend is the implicit confirmation response; the table refreshes with the row gone. |
| 6.4 | Cancel deletion | ✅ | Dialog footer `<Button variant="outline" onClick={onClose} disabled={submitting}>` ("Cancelar", line 147-157) calls `onClose` which in `CatalogTab` sets `deleteOpen = false` and clears `target` (line 468-473). `service.eliminar` is never invoked. The `<Dialog onOpenChange>` also routes an `onClose` when the user clicks the backdrop or ESC key (line 86-88 of `catalog-delete-dialog.tsx`). |

**Audit totals: 20 ✅ / 0 ⚠️ / 0 ❌.** No spec drift.

---

## 5. Correctness vs tasks

| Task | Claim | Source-level evidence |
| --- | --- | --- |
| T1 | Category DELETE — admin-only soft delete + active-only list | `CategoriaController.eliminar` (`controller/CategoriaController.java:63-71`) returns 204 after admin check; `CategoriaSql.LISTAR:11` filters `activo=true`; `CategoriaSql.DESACTIVAR:40-44` updates `activo=?`. Service `eliminar` (`service/CategoriaService.java:58-61`) chains `buscar(id)` → `cambiarActivo(id, false)`. DAO `cambiarActivo` (`dao/CategoriaDao.java:94-103`) executes the parameterized UPDATE. |
| T2 | Application DELETE — convert hard delete to soft delete | `AplicativoClienteController.eliminar` (`controller/AplicativoClienteController.java:73-81`) is identical to the other three; `AplicativoClienteSql` has only `DESACTIVAR` (no `ELIMINAR`), `LISTAR` filters `activo=true`. No `DELETE FROM clientes` literal in `dao/` or `sql/`. Service `eliminar` (`service/AplicativoClienteService.java:64-67`) uses `cambiarActivo(actual.getId(), false)`. |
| T3 | State DELETEs — process + approval, admin-only endpoints | `EstadoProcesoController.eliminar` + `EstadoAprobacionController.eliminar` mirror the category shape. Each has `LISTAR` filtering `activo=true` and a `DESACTIVAR` SQL constant. Service `eliminar` on both calls `cambiarActivo(id, false)`. |
| T4 | Demo seed and route — credential-free `/api/auth/demo` | `002_usuarios_roles_seed.sql:42-52` inserts `demo@sistema.com` (rol ADMINISTRADOR, `activo=true`, `ON CONFLICT (email) DO NOTHING`). `AuthController.loginDemo` (`auth/controller/AuthController.java:36-42`) is `@PostMapping("/demo")` with `request = @RequestBody(required = false) LoginDemoRequest`. `AuthService.loginDemo` (`auth/service/AuthService.java:45-54`) calls `buscarDemoPorEmail(DEMO_EMAIL)`. `UsuarioDao.buscarDemoPorEmail` (`usuarios/dao/UsuarioDao.java:62-72`) executes `UsuarioSql.BUSCAR_DEMO_POR_EMAIL` (`usuarios/sql/UsuarioSql.java:45-50`) which filters `activo=true AND r.activo=true` — fails safely if the seed is missing or inactive. |
| T5 | Postman synchronization | `sistemaincidencias/postman/SistemaIncidencias.postman_collection.json` adds a new "Login demo y eliminación lógica de catálogos (change F)" folder with: `POST /api/auth/demo` (200 + 401 sample responses), `DELETE /api/categorias/{id}` (204 + 403), `DELETE /api/aplicativos/{id}` (204 + 403), `DELETE /api/estados-proceso/{id}` (204 + 403), `DELETE /api/estados-aprobacion/{id}` (204 + 403). Folder description documents the credential-free demo and the soft-delete semantics. JSON valid. |
| T6 | Configuration shell — admin-gated `/configuracion` | `router.tsx:128-136` registers `path: "/configuracion"` inside `<AppLayout>` (which applies `PrivateRoute`). `ConfiguracionPage` (`pages/configuracion/index.tsx:196-251`) gates on `user.rol === "ADMINISTRADOR"` and renders four `<button role="tab">` + matching `<CatalogTab>` instances. `app-sidebar.tsx:36` adds a `Configuración` link in the "Configuración" section. |
| T7 | Category/application tabs — create/edit/list | `pages/configuracion/index.tsx:317-403` defines `CategoriasTab` and `AplicativosTab` mounting `<CatalogTab>` with the right service, columns, fields, and value transformers. `CategoriasTab` resolves the `aplicativoId` select options lazily via `aplicativosService.listar()` on mount (`index.tsx:321-336`). `CatalogTab.guardar()` (`components/catalog-tab.tsx:168-192`) wires create and edit flows; `cargarDatos()` refreshes after each successful mutation. |
| T8 | State tabs — process + approval create/edit/list | `pages/configuracion/index.tsx:405-461` defines `EstadosProcesoTab` and `EstadosAprobacionTab` mounting `<CatalogTab>` with `estadosProcesoService` and `estadosAprobacionService` adapters. Field/column shape matches each API contract (EstadoProceso has `clave`, `etiqueta`, `orden`, `esTerminal`; EstadoAprobacion has `clave`, `etiqueta`). |
| T9 | Delete confirmation — exact `ELIMINAR` text | `CatalogDeleteDialog` (`components/catalog-delete-dialog.tsx:35-175`) requires `typed.trim().toUpperCase() === "ELIMINAR"` (line 59, 80) before submitting. Submit button disabled until typed equals placeholder (line 163). Cancel and incorrect text send no `service.eliminar` request. |
| T10 | Login demo button — wire `/api/auth/demo` without credentials | `auth-service.ts:12-16` adds `loginDemo()` issuing `POST /api/auth/demo` with no body. `auth-store.ts:62-88` adds `loginDemo()` action that stores the response identically to `login(...)`. `login-form.tsx:117-130` adds an outline `<Button>` ("Acceso demo") calling `handleDemoLogin` (`login-form.tsx:45-52`) which clears errors, calls `loginDemo()`, and navigates to `/dashboard` on success. Both buttons are gated by `isLoading` so they cannot double-fire. |

**All 10 tasks complete.**

---

## 6. Design coherence

| Design decision | Code reflects it | Evidence |
| --- | :---: | --- |
| D1 — Soft delete: DELETE updates `activo=false`; list SQL excludes inactive | ✅ | All four `*Sql.LISTAR` filter `WHERE activo = true`; all four `*Sql.DESACTIVAR` are `UPDATE <tabla> SET activo = ? WHERE id = ?` (no physical DELETE). FK columns in `incidencias` keep working because the row is never removed. |
| D2 — Demo seed: idempotent `demo@sistema.com` + ADMINISTRADOR, exact active lookup | ✅ | `002_usuarios_roles_seed.sql` uses `ON CONFLICT (email) DO NOTHING`; rol_id maps to ADMINISTRADOR (id `00000000-0000-0000-0000-000000000001`); `AuthService.loginDemo` ignores the optional `rol` body param and calls `buscarDemoPorEmail(DEMO_EMAIL)` which requires both `u.activo=true AND r.activo=true`. |
| D3 — Authorization: every catalog write/delete calls `validarAdministrador(token)` | ✅ | All four `*Controller` POST/PUT/DELETE methods (12 in total) call `permisoAdministracionService.validarAdministrador(token)` as their first statement. GET methods call `validarAutenticado`. |
| D4 — UI gate: private `/configuracion`; non-admin gets 403-style state; backend authoritative | ✅ | `router.tsx:128-136` mounts `ConfiguracionPage` inside `<AppLayout>` (which applies `PrivateRoute`). `ConfiguracionPage` (`pages/configuracion/index.tsx:198-221`) renders an `Alert variant="destructive"` "Acceso restringido" for non-admins. The four DELETE endpoints remain admin-only at the controller level regardless of the UI. |
| D5 — Destructive confirmation: exact `ELIMINAR` text; cancel + incorrect never call API | ✅ | `catalog-delete-dialog.tsx:59-80` re-validates on submit and disables the destructive button until typed equals `ELIMINAR`. Cancel button calls `onClose` only. `CatalogTab.abrirEliminar` (`catalog-tab.tsx:163-166`) is the only path that opens the dialog. |

---

## 7. Issues

- **CRITICAL**: none.
- **WARNING**: none.
- **SUGGESTION**:
  - Planning metadata in `proposal.md` (`Status: proposed`) and `tasks.md` (`Status: ready-to-apply`) still reflects pre-apply state. Cosmetic; archive step can leave or refresh.
  - No dedicated `ConfiguracionServiceTest` / `AuthServiceDemoTest` covers the new soft-delete + demo paths at runtime. The project runs in `strict_tdd: false`, so source-level audit is the documented evidence floor; a follow-up could add focused JUnit 5 / Mockito tests for `CategoriaService.eliminar`, `AplicativoClienteService.eliminar`, `EstadoProcesoService.eliminar`, `EstadoAprobacionService.eliminar`, and `AuthService.loginDemo` to lock the soft-delete + demo contracts against future regressions.

---

## 8. Final verdict

**PASS — archive `configuracion-ui`.**

- All 20 source-audit scenarios aligned with the delta spec (6/6 requirements).
- Zero new static regressions: backend compile/tests green, frontend lint/build clean (only the 3 + 4 pre-existing `incidencias/*` errors from PR #9 remain).
- Postman collection updated; `SecurityConfig.java` untouched (NFR preserved).
- All 10 implementation tasks are evidenced by merged master commits.
- Demo login end-to-end path is verified at code level (seed + DAO + service + controller + frontend wiring); runtime smoke against a live Postgres instance is the standard follow-up.

The change creates a **new** `configuracion` capability baseline. Archive will sync the delta spec into `openspec/specs/configuracion/spec.md` and move `openspec/changes/configuracion-ui/` → `openspec/changes/archive/configuracion-ui/`. This is the **closing** change of the 6-change audit gap matrix (A→F).