# Design: RBAC + catálogos públicos + scope AGENTE/USUARIO

**Capability**: `incidencias`
**Change**: `incidencias-rbac-agente`
**Date**: 2026-07-14
**Status**: designed

## 1. Architectural decisions

### D1 — Auth helper added to existing `PermisoAdministracionService` (no rename)

Two options were considered:

- **(a) rename to `PermisoAutorizacionService` + add `validarAutenticado`**: more semantically accurate but touches many call-sites and pollutes git history with renames.
- **(b) keep the name, just add a new method `validarAutenticado`**: preserves history; the name "PermisoAdministracionService" still fits because it remains a permission gate (just no longer admin-only); cost is one mildly inconsistent method name.

**Decision: (b).** Lowest blast radius. Future renames can happen in a dedicated cleanup change.

### D2 — Scope checks live in `IncidenciaService`, not at controller layer

The natural place for "AGENTE only if assigned, USUARIO only if creator" is `IncidenciaService`, because:

- It's a business rule, not transport authorization.
- The service already loads the incidencia by id (for `obtener`, `actualizar`, etc.), so the comparison is local.
- It avoids cross-module coupling (no need for `IncidenciaDao` inside `PermisoAdministracionService`).
- Controller-layer enforcement via `@PreAuthorize` would require Spring AOP enablement and is inconsistent with the existing imperative pattern.

`PermisoAdministracionService` stays a thin role gate; `IncidenciaService` owns the per-resource rule. This keeps the codepath plain-Java and matches `AGENTS.md:283-292`.

### D3 — New `agentes-asignables` endpoint instead of relaxing `GET /api/usuarios`

Three options were considered:

- **(a) relax `GET /api/usuarios` to "any authenticated"**: simple, but violates `AGENTS.md:303` ("Solo administrador gestiona usuarios").
- **(b) keep admin-only AND have the frontend filter AGENTEs client-side**: leaks all users' emails/names to AGENTE via the network response, even if UI hides them. Privacy violation.
- **(c) new endpoint `GET /api/usuarios/agentes-asignables`**: scope is explicit, response is the minimum needed for assignment, no leakage, no policy violation.

**Decision: (c).** The endpoint is small, the SQL is one query, and the response reuses `UsuarioResponse` (no new DTO).

### D4 — Override vs accept `?asignadoA=` query param for AGENTE

When `AGENTE jose` calls `GET /api/incidencias?asignadoA=pedro-id`, should the backend:

- (a) **Override** the param to `jose.id` (silently — AGENTE gets his own).
- (b) **Honor** the param (let him read pedro's, return scope-violation later).
- (c) **Reject** the request with 403.

**Decision: (a).** The audit found that the unauthenticated-style "AGENTE sees all" is itself a privacy violation; option (b) reproduces the bug. Option (c) is technically defensible but breaks any pre-saved admin-made links that AGENTE picks up. Override is the most secure and least surprising: the AGENTE's session always shows his own work, regardless of what client/UI asks. Documented in spec scenario `AGENTE ve solo las suyas aunque pase asignadoA=otro`.

### D5 — Frontend cleanup rolls back the prior fix, doesn't add new gate

The earlier `Promise.allSettled` patch gates `usuariosService.listar()` behind `currentUserIsAdmin`. With the catalog and `agentes-asignables` relaxation in this change, that gate becomes either unnecessary (catalogos públicos) or undesirable (the right call now is the new endpoint). The fix is removed in the same commit to keep the codebase coherent.

### D6 — No new SQL indexes

The added `creado_por_usuario_id = ?` predicate and the forced `asignado_a = ?` predicate both hit already-utilized columns in `Incidencia`. The existing indexes from migration scripts (`idx_asignado_a`, `idx_creado_por_usuario_id`) cover both. Verified by reading `incidencias/sql/IncidenciaSql.java` — both columns appear in the WHERE builder.

## 2. Files modified (backend)

### `usuarios/service/PermisoAdministracionService.java`
- Add `validarAutenticado(String header): Usuario`. Resolve `header` → `Usuario` via `authService.obtenerUsuarioActual(header)`. Return the entity. No role check. Throw `AutenticacionException` if the header is missing/malformed (propagated from `AuthService.extraerToken`).

### `catalogos/controller/CategoriaController.java` (and the 3 siblings)
- In `listar(...)`, replace `permisoAdministracionService.validarAdministrador(token)` with the new `validarAutenticado(token)`.
- Do NOT touch `obtener(id)`, `crear(...)`, `actualizar(...)` — only `listar` is in scope.

### `usuarios/controller/UsuarioController.java` + `UsuarioService.java` + `UsuarioDao.java` + `UsuarioSql.java`
- Add new method `listarAgentesAsignables(String header)`.
- Controller maps `GET /api/usuarios/agentes-asignables` → service.
- Service: call `validarAutenticado(header)`, then `usuarioDao.listarAsignables()`.
- DAO method: SQL = `SELECT ... FROM usuarios u JOIN roles r ON u.rol_id = r.id WHERE r.codigo IN ('AGENTE','ADMINISTRADOR') AND u.activo = true ORDER BY u.nombre ASC LIMIT 100`.
- Reuses existing `LimiteMaximo` constant if present, else default to 100.

### `incidencias/controller/IncidenciaController.java`
- `listar(...)` accepts `@RequestHeader("Authorization") String token`.
- Inside, before building `IncidenciaFiltro`:
  ```java
  Usuario actual = authService.obtenerUsuarioActual(token);
  IncidenciaFiltro filtro = IncidenciaFiltro.builder()...build();
  if (!actual.getRol().esAdministrador()) {
      if (actual.getRol().esAgente()) {
          filtro.setAsignadoA(actual.getId()); // override any query param
      } else {
          filtro.setCreadoPorUsuarioId(actual.getId());
      }
  }
  return incidenciaService.listar(filtro, PageRequest.of(page, size));
  ```
- All other methods that already take `@RequestHeader("Authorization")` keep that signature; the service injects the scope check.

### `incidencias/dto/IncidenciaFiltro.java`
- Add `private UUID creadoPorUsuarioId;` (Lombok `@Builder` covers builder).

### `incidencias/service/IncidenciaService.java`
- Private helper:
  ```java
  private void validarAlcance(Usuario actual, Incidencia target, String metodo) {
      if (actual.getRol().esAdministrador()) return;
      if (actual.getRol().esAgente()) {
          if (!Objects.equals(target.getAsignadoA(), actual.getId())) {
              throw new AccesoDenegadoException("Solo puedes modificar incidencias asignadas a ti");
          }
          return;
      }
      // USUARIO
      boolean esComentarioOAdjunto = metodo.startsWith("agregarComentario") || metodo.startsWith("agregarAdjunto");
      if (!esComentarioOAdjunto) {
          throw new AccesoDenegadoException("No tienes permisos para realizar esta operacion");
      }
      if (!Objects.equals(target.getCreadoPorUsuarioId(), actual.getId())) {
          throw new AccesoDenegadoException("Solo puedes operar sobre incidencias creadas por ti");
      }
  }
  ```
- Call it at the top of `obtener`, `actualizar`, `actualizarConArchivos`, `cambiarEstado`, `aprobar`, `rechazar`, `agregarComentario`, `agregarAdjunto`, `agregarAdjuntos`. Skip in `eliminar` — instead, gate by role (admin only) at the top of the method.

### `incidencias/dao/IncidenciaDao.java` + `IncidenciaSql.java`
- Extend WHERE builder to include `creado_por_usuario_id = ?` if the new filter field is non-null.
- Reuses existing parameter binding pattern (`appendIfPresent` style; check existing code for the precise convention).

### `sistemaincidencias/postman/SistemaIncidencias.postman_collection.json`
- New folder entry for `GET /api/usuarios/agentes-asignables`.
- Update 4 catalog entries: change role-required note from `ADMINISTRADOR` to `authenticated`.

## 3. Files modified (frontend)

### `frontend/src/services/usuarios-service.ts`
- Add `listarAgentesAsignables(signal?: AbortSignal): Promise<Usuario[]>` calling `GET /api/usuarios/agentes-asignables`.

### `frontend/src/pages/incidencias/index.tsx`
- Remove the `currentUserIsAdmin` gate from `loadCatalogos()`. The `usuarios` fetch changes from `usuariosService.listar()` to `usuariosService.listarAgentesAsignables()`.
- All other behavior unchanged.

### `frontend/src/pages/incidencias/components/nueva-incidencia-view.tsx`
- Replace `usuariosService.listar()` with `usuariosService.listarAgentesAsignables()`.
- The `AGENT_ROLE_CODES` filter at line 31 (`["AGENTE", "ADMINISTRADOR"]`) is kept as a defense-in-depth client filter — the backend already returns only these roles.

### `frontend/src/pages/incidencias/components/editar-incidencia-dialog.tsx`
- Same swap: `usuariosService.listar()` → `usuariosService.listarAgentesAsignables()`.
- The `AGENT_ROLE_CODES` filter at line 43 is kept.

## 4. Files not modified (deliberate)

- `IncidenteService.obtener` post-process: not changed. The 403/404 distinction from `RecursoNoEncontradoException` is preserved.
- `SecurityConfig.java`: no change. All decisions happen at the service layer per D2.
- `JwtAuthenticationFilter.java`: no change.
- `AuthController.java`: no change (user explicitly excluded demo-login fix).
- Frontend permission UI gates (`useAuthStore.user.rol` reads in `detalle/index.tsx`, `incidencias-table.tsx`): no change. They match the new backend scope rules by construction.

## 5. Migration & data

- No DB migration. The `agentes-asignables` query uses existing columns. The `creadoPorUsuarioId` filter uses an existing column + index.
- No data backfill.
- No feature flag — this change is a behavior correction. Existing users (especially AGENTEs) may notice: **a smaller list** (only assigned to them) and **available catalogs** (no more 403 on the page). That is the intended improvement.

## 6. Rollback plan

- Revert the backend changes to controllers + DAO WHERE clause → catalog GETs become admin-only again, AGENTE sees all incidencias.
- Revert frontend `usuariosService.listarAgentesAsignables` removal → frontend hits the admin-gated `/api/usuarios` (gets 403, breaks AGENTE again).
- Re-apply the prior `currentUserIsAdmin` gate in `loadCatalogos`.

Estimated rollback time: < 1 hour (all changes are localized; no DB or external state).

## 7. Test plan

- Unit/manual: 25+ curl-driven scenarios matching each `### Scenario` in the spec.
- Manual smoke against running backend:
  - Login as ADMIN → catalogs + all incidencias + admin user-management still work.
  - Login as AGENTE → catalogs load, only own incidencias list, edit/change-state works on own, fails on others, agents-asignables lists peers.
  - Login as USUARIO → catalogs load, only own-created incidencias list, can comment+attach on own, cannot edit/change-state/delete on anything.
- `npm run lint` + `npm run build` clean.
- `./mvnw compile` clean.

## 8. Out-of-scope / future

Captured in `proposal.md §9` and `spec.md §Out of scope`. No additional follow-up beyond what's listed there.
