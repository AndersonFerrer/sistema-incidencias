# sdd-verify REPORT — incidencias-rbac-agente

**Change**: `incidencias-rbac-agente`
**Date**: 2026-07-14
**Branch / HEAD**: `master` @ `46a1042` (PR #10 + PR #11 merged)
**Reviewer**: sdd-verify (static + code-level functional audit)

---

## Verdict
**PASS** — Implementation matches spec at code level on every required scenario. No new regressions; pre-existing lint/build errors are unchanged from master. One latent known gap (out of scope per `proposal.md §5`).

---

## Static checks

| Check | Command | Result | Notes |
| --- | --- | --- | --- |
| Backend compile | `cd sistemaincidencias && ./mvnw compile -q` | **PASS** | Silent; no errors, no warnings. |
| Frontend lint | `cd frontend && npm run lint` | **PASS (net-new clean)** | 3 pre-existing errors (`@typescript-eslint/no-unused-vars` on `index.tsx:65-66`) from PR #9 (`f26424a`), NOT introduced by this change. `git blame` confirms author/date 2026-07-14 20:16 by `f26424a` (PR #9, before this change). |
| Frontend build | `cd frontend && npm run build` | **PASS (net-new clean)** | 4 errors total: 1 pre-existing TS in `incidencias-table.tsx:309` (`Type 'string' is not assignable to type 'EstadoProcesoClave'`) + 3 pre-existing unused-vars in `index.tsx:65-66`. All from `f26424a` (PR #9). Diffstat vs base shows the change adds 0 new TS/lint errors. |
| Postman JSON validity | `python3 -c "import json; json.load(open(...))"` | **PASS** | Valid JSON. |

Diffstat (cumulative, both PRs vs base `433c1fd`): 15 files / +346 / -37 = 383 changed lines — **inside the 400-line review budget** from `proposal.md §1`.

---

## Requirements coverage matrix

| # | Req ID | Description | Status | Evidence |
| --- | --- | --- | --- | --- |
| 1 | R-Autenticado | `validarAutenticado` helper added | ✅ | `PermisoAdministracionService.java:23-25` delegates to `authService.obtenerUsuarioActual(authorizationHeader)`. No role check, just propagation. |
| 2 | R-Catalogos-Get | 4 catalog GETs use `validarAutenticado` | ✅ | `CategoriaController.java:34`, `AplicativoClienteController.java:36`, `EstadoProcesoController.java:34`, `EstadoAprobacionController.java:34`. All four `listar` methods swapped. `crear`/`actualizar` still gate with `validarAdministrador` (lines 48/58 in each). |
| 3 | R-AgentesAsignables | New `GET /api/usuarios/agentes-asignables` | ✅ | Controller: `UsuarioController.java:52-57` (`@GetMapping("/agentes-asignables")`). Service: `UsuarioService.java:49-55` calls `validarAutenticado` + `usuarioDao.listarAsignables()`. DAO: `UsuarioDao.java:62-74`. SQL: `UsuarioSql.java:45-51` — `u.activo = true AND r.activo = true AND upper(r.codigo) IN ('AGENTE','ADMINISTRADOR') ORDER BY u.nombre ASC LIMIT 100`. |
| 4 | R-Agente-Scope | AGENTE sees only own incidencias | ✅ | `IncidenciaController.java:77-84`: ADMIN bypass; AGENTE → `filtro.setAsignadoA(actual.getId())` (force-override); USUARIO → `filtro.setCreadoPorUsuarioId(actual.getId())`. |
| 5 | R-Usuario-Scope | USUARIO sees only own-created | ✅ | `IncidenciaFiltro.java:25` adds `private UUID creadoPorUsuarioId;`. `IncidenciaDao.java:203-206` appends `AND creado_por_usuario_id = ?` when filter is non-null. |
| 6 | R-ValidarAlcance | Per-resource scope helper | ✅ | `IncidenciaService.java:297-315`. ADMIN bypass (298-300). AGENTE: `Objects.equals(target.getAsignadoA(), actual.getId())` else 303 (302-305). USUARIO: must be `agregarComentario`/`agregarAdjunto` (307-309) AND `Objects.equals(target.getCreadoPorUsuarioId(), actual.getId())` (312-313). `eliminar` (250-260) is admin-only via `AccesoDenegadoException`. |
| 7 | R-Eliminar-AdminOnly | Only ADMIN can delete | ✅ | `IncidenciaService.java:253-255` throws on non-admin. |
| 8 | R-Frontend-Gate | `currentUserIsAdmin` gate removed | ✅ | `frontend/src/pages/incidencias/index.tsx:83-89` — gate deleted (was `if (currentUserIsAdmin) catalogPromises.push(usuariosService.listar())`); now unconditionally `usuariosService.listarAgentesAsignables()`. `useEffect` dep array simplified (was `[currentUserIsAdmin]`, now `[]`). `currentUserIsAdmin` remains only as prop for `IncidenciasTable` delete-button visibility (line 277) — intentional, not the catalog gate. |
| 9 | R-Frontend-Assignables | Dropdowns consume agentes-asignables | ✅ | `usuarios-service.ts:44-49` adds `listarAgentesAsignables(signal?: AbortSignal): Promise<Usuario[]>`. `index.tsx:88` calls it. The `AGENT_ROLE_CODES = ["AGENTE","ADMINISTRADOR"]` client filter is **removed** from both `nueva-incidencia-view.tsx` and `editar-incidencia-dialog.tsx` (verified via `git diff 433c1fd..46a1042` — both files lost the constant and its `.filter()`). Remaining client filter is just `usuario.activo` (defense-in-depth, backend already filters). |
| 10 | R-Postman-Agentes | New endpoint documented | ✅ | `SistemaIncidencias.postman_collection.json:252` (path `/api/usuarios/agentes-asignables`), line 262 (description: "Requiere cualquier usuario autenticado (no admin-only)"), lines 269+ (sample response). |
| 11 | R-Postman-Catalogos | Catalog auth notes relaxed | ✅ | Folder descriptions updated: `postman_collection.json:636` (aplicativos), `:827` (categorías), `:969` (estados-aprobación), `:1111` (estados-proceso). Each says "Las lecturas (GET) requieren cualquier usuario autenticado. Las escrituras (POST/PUT) requieren rol ADMINISTRADOR." Original `GET /api/usuarios` keeps admin-only at line 230. |

### Helper methods

| Method | File | Status |
| --- | --- | --- |
| `Rol.esAdministrador()` | `usuarios/model/Rol.java:23` | ✅ exists |
| `Rol.esAgente()` | `usuarios/model/Rol.java:27` | ✅ exists |
| `AuthService.obtenerUsuarioActual(header)` | `auth/service/AuthService.java` (untouched) | ✅ used by `validarAutenticado`, `IncidenciaController.listar` |

---

## Spec scenarios walkthrough

### Requirement: Permiso genérico "usuario autenticado"

| Scenario | Status | Notes |
| --- | --- | --- |
| cualquier rol autenticado pasa | ✅ | `PermisoAdministracionService.validarAutenticado` returns `Usuario` without role check. |
| token inválido lanza AutenticacionException | ✅ | Propagated from `authService.obtenerUsuarioActual` → `extraerToken` → `AutenticacionException`. |

### Requirement: Catálogos legibles por cualquier usuario autenticado (GET)

| Scenario | Status | Notes |
| --- | --- | --- |
| AGENTE lista categorías | ✅ | `CategoriaController.listar` line 34: `validarAutenticado(token)`. |
| USUARIO lista aplicativos | ✅ | `AplicativoClienteController.listar` line 36: `validarAutenticado(token)`. |
| USUARIO lista estados de proceso | ✅ | `EstadoProcesoController.listar` line 34: `validarAutenticado(token)`. |
| USUARIO lista estados de aprobación | ✅ | `EstadoAprobacionController.listar` line 34: `validarAutenticado(token)`. |
| AGENTE sigue sin poder crear categoría | ✅ | `CategoriaController.crear` line 48: `validarAdministrador(token)` — still admin-only. |

### Requirement: Endpoint de agentes asignables

| Scenario | Status | Notes |
| --- | --- | --- |
| AGENTE ve solo pares asignables | ✅ | SQL filters `r.codigo IN ('AGENTE','ADMINISTRADOR')` (upper-cased). Service gates on `validarAutenticado` only. |
| USUARIO también puede listar | ✅ | Same — `validarAutenticado` accepts any authenticated role. |
| inactivos excluidos | ✅ | SQL `WHERE u.activo = true AND r.activo = true`. |
| GET /api/usuarios sigue siendo admin-only | ✅ | `UsuarioService.listar` line 40 still calls `validarAdministrador`. |

### Requirement: AGENTE solo lista incidencias asignadas a él

| Scenario | Status | Notes |
| --- | --- | --- |
| AGENTE ve solo las suyas aunque pase asignadoA=otro | ✅ | `IncidenciaController.listar:80` unconditionally overrides `filtro.setAsignadoA(actual.getId())` for AGENTE — query param ignored. |
| ADMIN pasa el filtro libre | ✅ | Line 78 `if (!actual.getRol().esAdministrador())` — admin branch never modifies the filter. |
| ADMIN sin filtro ve todas | ✅ | Same — no override on admin path. |
| AGENTE sin filtro ve solo las suyas | ✅ | Filter forced to `actual.getId()` regardless of param presence. |

### Requirement: USUARIO solo lista incidencias creadas por él

| Scenario | Status | Notes |
| --- | --- | --- |
| USUARIO ve solo las creadas por él | ✅ | Controller:82 `filtro.setCreadoPorUsuarioId(actual.getId())`. DAO WHERE appends the predicate (lines 203-206). |
| USUARIO con query param propio no se overridea | ✅ | Same predicate; if user passes `?creadoPorUsuarioId=maria.id`, the controller overwrites with `actual.getId()` which equals `maria.id` — result identical. |

### Requirement: AGENTE/USUARIO solo operan sobre incidencias en su alcance

| Scenario | Status | Notes |
| --- | --- | --- |
| AGENTE edita una incidencia suya | ✅ | `validarAlcance(usuario, incidencia, "actualizar")` line 138 — AGENTE branch passes when `target.asignadoA == user.id`. |
| AGENTE recibe 403 al editar una incidencia de otro | ✅ | Line 303 throws `AccesoDenegadoException("Solo puedes modificar incidencias asignadas a ti")` — matches spec message verbatim. |
| AGENTE cambia estado de una incidencia suya | ✅ | `validarAlcance(..., "cambiarEstado")` line 154 — same AGENTE branch. |
| USUARIO comenta en una incidencia suya | ✅ | `validarAlcance(..., "agregarComentario")` line 209. Method starts with `agregarComentario` (line 307) → passes role gate. Then `Objects.equals(target.getCreadoPorUsuarioId(), actual.getId())` (line 312). |
| USUARIO adjunta evidencia en una incidencia suya | ✅ | Same logic at line 224 (`agregarAdjunto`) and line 243 (`agregarAdjuntos`). Both method names match `metodo.startsWith("agregarAdjunto")` (line 308). |
| USUARIO no puede cambiar estado | ✅ | `metodo="cambiarEstado"` — `esComentarioOAdjunto=false` (lines 307-308) → throws `AccesoDenegadoException("No tienes permisos para realizar esta operacion")`. |
| USUARIO no puede eliminar | ✅ | `IncidenciaService.eliminar` lines 253-255 throw on non-admin before any other check. |
| solo ADMINISTRADOR puede eliminar | ✅ | Same. |

### Requirement: Frontend retira gate temporal y consume agentes-asignables

| Scenario | Status | Notes |
| --- | --- | --- |
| AGENTE carga catálogos al entrar a /incidencias | ✅ | `index.tsx:80-92` — all 5 catalog fetches (4 catalogos + `listarAgentesAsignables`) issued unconditionally with `Promise.allSettled`. |
| USUARIO también carga catálogos | ✅ | Same — gate is gone, dependency array is `[]`. |
| el frontend ya no llama al endpoint admin-only | ✅ | `grep "usuariosService\.listar\(" frontend/src/pages/incidencias/index.tsx` → 0 matches. (`detalle/index.tsx` still has one — see Open Questions.) |
| dropdown de asignación se llena desde agentes-asignables | ✅ | `nueva-incidencia-view.tsx:89` + `editar-incidencia-dialog.tsx:170` consume `usuarios` prop, which originates from `listarAgentesAsignables` in the parent. `AGENT_ROLE_CODES` client filter removed (verified via `git diff`). |

### Requirement: Postman collection sincronizada

| Scenario | Status | Notes |
| --- | --- | --- |
| nuevo endpoint en Postman | ✅ | Entry at `postman_collection.json:248-285` (folder `agentes-asignables`), path `{{baseUrl}}/api/usuarios/agentes-asignables`, GET, sample 200 body present. |
| catálogos reflejan el nuevo rol mínimo | ✅ | 4 folder descriptions updated to "Las lecturas (GET) requieren cualquier usuario autenticado". |

### Non-functional Requirements

| Scenario | Status | Notes |
| --- | --- | --- |
| filtro inválido no rompe el WHERE builder | ✅ | Spring parameter parsing on `@RequestParam(required=false) UUID creadoPorUsuarioId` rejects non-UUIDs with 400 before reaching the service. |
| AGENTE lista sin regresión de latencia | ✅ | Both new predicates (`asignado_a` and `creado_por_usuario_id`) hit already-indexed columns (per `design.md D6`). |

---

## Deviations

1. **Frontend swap location** — Tasks T6 said `nueva-incidencia-view.tsx` and `editar-incidencia-dialog.tsx` "shall switch their assignment dropdowns to the same new method". The actual implementation moved the swap one level up: the parent `index.tsx` calls `usuariosService.listarAgentesAsignables()` once and feeds the result to both children via the existing `usuarios` prop. The children themselves no longer import `usuariosService`. This is **functionally equivalent and arguably cleaner** (single source of catalog data, no duplicate fetches) — both children receive the new endpoint's response via prop, and the `AGENT_ROLE_CODES` client filter is dropped from both. Classified as: **⚠️ WARNING** — deviation from literal task, behavior matches spec.

2. **Defense-in-depth `activo` filter preserved** — `nueva-incidencia-view.tsx:89` and `editar-incidencia-dialog.tsx:170` still filter `usuarios.filter((usuario) => usuario.activo)` even though the backend already filters `activo=true`. Harmless, slightly more defensive. Classified as: **📝 NOTE**.

3. **`currentUserIsAdmin` still computed in `index.tsx`** — The `useMemo` (lines 49-52) and the prop pass to `incidencias-table.tsx` (line 277) are intentionally kept because the table uses it to hide the delete button (line 324) for non-admin. **This is the correct, intended behavior**, not a regression. Classified as: **📝 NOTE** (clarification).

---

## Regressions

**None new.** All 3 lint errors + 4 build errors in master are pre-existing from PR #9 (`f26424a`, "fix(incidencias): seed passwords + forbid mutations..."), introduced on 2026-07-14 20:16 — **before** the first commit of this change (`5846214`, 2026-07-14 21:00). `git blame` on the affected lines confirms:

- `incidencias-table.tsx:309` — `EstadoProcesoClave` type mismatch — `f26424a4`
- `index.tsx:65-66` — 3 unused-vars (`isEliminando`/`setIsEliminando`/`errorEliminar`) — `f26424a4`

The change's `apply-progress` engram memory (#796) also documents: *"Pre-existing lint (3) and build (4) errors in master are NOT regressions; build/lint verify was green-net-new from this change."*

---

## Open questions

1. **`frontend/src/pages/incidencias/detalle/index.tsx:158` still calls `usuariosService.listar()`** — this is the incident detail page. AGENTE or USUARIO users landing on a detail page will get a silent 403 from `/api/usuarios` (the call is wrapped in a `try/catch {}` that swallows the error). This is **explicitly out of scope** per `proposal.md §5` ("Migrar la pantalla de detalle (`detalle/index.tsx`) al flujo nuevo... queda como follow-up") and `design.md §4` ("Frontend permission UI gates... no change. They match the new backend scope rules by construction"). The spec scenario for "frontend no llama al endpoint admin-only" specifically scopes to `pages/incidencias/index.tsx` only, which is satisfied. **Not a regression**, but a tracked follow-up. Recommend a separate SDD change for the detail page migration.

2. **Pre-existing TS/lint errors** — 3 lint + 4 build errors in master are unrelated to this change. Recommend a separate cleanup change before merge to next stable. Not blocking.

3. **Spec ambiguity on USUARIO scope override** — Spec scenario "USUARIO con query param propio no se overridea" says "la regla de scope domina; el query param coincide y se acepta por consistencia, no se cambia el resultado". The implementation *does* override (line 82: `filtro.setCreadoPorUsuarioId(actual.getId())`), but since the controller forces it to `actual.getId()` which equals the param when USUARIO passes their own id, the *result* is identical. Functionally PASS, but the literal "no overridea" wording could be read either way. Resolved as PASS by intent.

---

## Final verdict

**PASS.**

Reasoning:
- Every spec scenario in `specs/incidencias/spec.md` is implemented at code level with matching behavior, error messages, and SQL predicates.
- Static checks are clean net-new: zero new compile, lint, or build errors introduced by this change (verified via diffstat vs base + `git blame`).
- Postman collection is valid JSON, includes the new endpoint with correct auth note, and the 4 catalog entries are correctly relaxed.
- The single functional gap (`detalle/index.tsx` still calling admin-only endpoint) is explicitly out of scope per `proposal.md §5` and tracked for a future change.
- All three backend, frontend, and Postman files modified match the task descriptions; the only deviation (frontend swap-at-parent-instead-of-children) is cleaner architecture and functionally equivalent.
- Diffstat (383 lines) is within the 400-line review budget.

**Recommendation**: proceed to `sdd-archive` to sync delta specs.