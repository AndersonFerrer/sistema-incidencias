# Capability Spec: `incidencias` — RBAC + catálogos públicos + scope AGENTE/USUARIO (delta)

**Capability**: `incidencias` (extends seeded baseline)
**Project**: sistema-incidencias
**Change**: `incidencias-rbac-agente`
**Scope**: **Backend primary** (controllers, services, DAO, SQL, Postman). Frontend minimal cleanup (revert the temporary `currentUserIsAdmin` gate introduced by the prior fix absorbed into this change). No DTO breaking changes — the new catalog read access uses existing endpoints with relaxed check; the new `agentes-asignables` endpoint reuses the existing `UsuarioResponse`.

> **Role-name canonicalization**: per `sistemaincidencias/AGENTS.md`, role codes are `ADMINISTRADOR`, `AGENTE`, `USUARIO`. All scenarios below use these canonical names.
>
> **Auth boundary**: all scenarios assume the request is `authenticated` (a valid `Authorization: Bearer <token>` is supplied). `SecurityConfig.java:42-49` enforces `.requestMatchers("/api/**").authenticated()` upstream of every controller. Per-role authorization is checked at the service layer via `PermisoAdministracionService` or its added helper (this change).

## ADDED Requirements

### Requirement: Permiso genérico "usuario autenticado"

`PermisoAdministracionService.java` shall expose a new `validarAutenticado(String authorizationHeader): Usuario` helper that resolves the bearer token via `AuthService.obtenerUsuarioActual(...)`, returns the `Usuario` entity, and does NOT impose any role-based restriction. Any token that survives `AuthService` validation (active user, non-expired JWT) passes. This helper is the replacement for `validarAdministrador` on any endpoint that should be reachable by all 3 roles.

#### Scenario: cualquier rol autenticado pasa
- GIVEN a valid JWT bearer token for a user with role `AGENTE`
- WHEN `PermisoAdministracionService.validarAutenticado(header)` is invoked
- THEN THE SYSTEM returns the `Usuario` entity without throwing `AccesoDenegadoException`.

#### Scenario: token inválido lanza AutenticacionException
- GIVEN a JWT that fails `JwtService.validarToken` (expired, malformed, revoked)
- WHEN `validarAutenticado(header)` is invoked
- THEN THE SYSTEM propagates `AutenticacionException` (handled by `JwtAuthenticationFilter` upstream as 401).

### Requirement: Catálogos legibles por cualquier usuario autenticado (GET)

Los 4 catálogos de solo-lectura (`categorias`, `aplicativos`, `estados-proceso`, `estados-aprobacion`) shall be reachable by any authenticated user, not only `ADMINISTRADOR`. `POST`/`PUT`/`DELETE` siguen siendo admin-only. The relaxation is implemented by swapping `validarAdministrador(token)` → `validarAutenticado(token)` inside the `listar` methods of the 4 catalog controllers.

#### Scenario: AGENTE lista categorías
- GIVEN a JWT for a user with role `AGENTE`
- WHEN `GET /api/categorias` is called
- THEN THE SYSTEM returns 200 with the array of `CategoriaResponse` (no 403).

#### Scenario: USUARIO lista aplicativos
- GIVEN a JWT for a user with role `USUARIO`
- WHEN `GET /api/aplicativos` is called
- THEN THE SYSTEM returns 200 with the array of `AplicativoClienteResponse`.

#### Scenario: USUARIO lista estados de proceso
- GIVEN a JWT for a user with role `USUARIO`
- WHEN `GET /api/estados-proceso` is called
- THEN THE SYSTEM returns 200 with the array.

#### Scenario: USUARIO lista estados de aprobación
- GIVEN a JWT for a user with role `USUARIO`
- WHEN `GET /api/estados-aprobacion` is called
- THEN THE SYSTEM returns 200 with the array.

#### Scenario: AGENTE sigue sin poder crear categoría
- GIVEN a JWT for `AGENTE`
- WHEN `POST /api/categorias` is called
- THEN THE SYSTEM returns 403 with `mensaje = "Solo el administrador puede realizar esta operacion"` (write remains admin-only).

### Requirement: Endpoint de agentes asignables para no-administradores

THE SYSTEM shall expose `GET /api/usuarios/agentes-asignables` returning `List<UsuarioResponse>` filtered to users whose `rol.codigo IN ('AGENTE','ADMINISTRADOR')` AND `activo = true`. The endpoint is reachable by any authenticated user (gate: `validarAutenticado`), NOT `validarAdministrador`. Existing `GET /api/usuarios` keeps its admin-only restriction unchanged.

#### Scenario: AGENTE ve solo pares asignables
- GIVEN a JWT for `AGENTE` and a database with `USUARIO maria` + `AGENTE jose` + `AGENTE pedro` + `ADMINISTRADOR ana`
- WHEN `GET /api/usuarios/agentes-asignables` is called
- THEN THE SYSTEM returns `200` with `[{jose}, {pedro}, {ana}]` (3 entries — AGENTES + ADMINs, activos).

#### Scenario: USUARIO también puede listar agentes para asignar
- GIVEN a JWT for `USUARIO`
- WHEN `GET /api/usuarios/agentes-asignables` is called
- THEN THE SYSTEM returns 200 with the same filtered list.

#### Scenario: inactivos excluidos
- GIVEN a database where one `AGENTE` has `activo = false`
- WHEN `GET /api/usuarios/agentes-asignables` is called
- THEN THE SYSTEM excludes that user from the response.

#### Scenario: GET /api/usuarios sigue siendo admin-only
- GIVEN a JWT for `AGENTE`
- WHEN `GET /api/usuarios` (the original endpoint) is called
- THEN THE SYSTEM returns 403.

### Requirement: AGENTE solo lista incidencias asignadas a él

`IncidenciaController.listar` shall inject the calling `Usuario` from the bearer token before building the `IncidenciaFiltro`. When the caller's role is `AGENTE`, the `asignadoA` filter is forced to `currentUser.getId()` regardless of (and overriding) any `?asignadoA=` query param. ADMINISTRADOR passes the query param through unchanged. USUARIO behavior covered by separate requirement (below).

#### Scenario: AGENTE ve solo las suyas aunque pase asignadoA=otro
- GIVEN a JWT for `AGENTE jose` and a database with 3 incidencias: 1 asignada a `jose`, 1 asignada a `AGENTE pedro`, 1 sin asignar
- WHEN `GET /api/incidencias?asignadoA={pedro-id}` is called with jose's token
- THEN THE SYSTEM returns 200 with only the 1 incidencia de `jose` (query param ignored, scope forzado).

#### Scenario: ADMIN pasa el filtro libre
- GIVEN a JWT for `ADMINISTRADOR`
- WHEN `GET /api/incidencias?asignadoA={pedro-id}` is called
- THEN THE SYSTEM returns the incidencias de `pedro`.

#### Scenario: ADMIN sin filtro ve todas
- GIVEN a JWT for `ADMINISTRADOR` and a database with 25+ incidencias
- WHEN `GET /api/incidencias` is called with no filters
- THEN THE SYSTEM returns the full paginated list.

#### Scenario: AGENTE sin filtro ve solo las suyas
- GIVEN a JWT for `AGENTE jose` and a database with 25+ incidencias of which 4 assigned to jose
- WHEN `GET /api/incidencias` is called with no filters
- THEN THE SYSTEM returns only the 4 incidencias assigned to `jose`.

### Requirement: USUARIO solo lista incidencias creadas por él

`IncidenciaFiltro` shall gain a new nullable `creadoPorUsuarioId` field. `IncidenciaController.listar` shall map the caller's role to that filter when role is `USUARIO`: filter forced to `currentUser.getId()`. AGENTE keeps the AGENTE-scope rule; ADMINISTRADOR sees all. The DAO WHERE builder shall include `creado_por_usuario_id = ?` when the filter is non-null.

#### Scenario: USUARIO ve solo las creadas por él
- GIVEN a JWT for `USUARIO maria` and a database with 3 incidencias: 1 creada por `maria`, 1 creada por `USUARIO juan`, 1 creada por `ADMINISTRADOR ana`
- WHEN `GET /api/incidencias` is called with maria's token
- THEN THE SYSTEM returns only the 1 incidencia creada por maria.

#### Scenario: USUARIO con query param propio no se overridea
- GIVEN a JWT for `USUARIO maria`
- WHEN `GET /api/incidencias?creadoPorUsuarioId={maria-id}` is called
- THEN THE SYSTEM returns the same as sin filtro (la regla de scope domina; el query param coincide y se acepta por consistencia, no se cambia el resultado).

### Requirement: AGENTE/USUARIO solo operan sobre incidencias en su alcance

`IncidenciaService` shall expose a `validarAlcance(Usuario actual, Incidencia target)` rule. The rule applies to every state-changing method (`actualizar`, `actualizarConArchivos`, `cambiarEstado`, `aprobar`, `rechazar`, `agregarComentario`, `agregarAdjunto`, `agregarAdjuntos`) and to the read `obtener`. ADMINISTRADOR bypasses the rule. AGENTE passes only when `target.asignadoA == actual.id`. USUARIO passes only when `target.creadoPorUsuarioId == actual.id` AND only for `agregarComentario` and `agregarAdjunto(s)`; USUARIO may NOT `actualizar`, `cambiarEstado`, `aprobar`, `rechazar`, or `eliminar`.

#### Scenario: AGENTE edita una incidencia suya
- GIVEN a JWT for `AGENTE jose` and an incidencia assigned to jose
- WHEN `PUT /api/incidencias/{id}` is called
- THEN THE SYSTEM returns 200 with the updated resource.

#### Scenario: AGENTE recibe 403 al editar una incidencia de otro
- GIVEN a JWT for `AGENTE jose` and an incidencia assigned to `AGENTE pedro`
- WHEN `PUT /api/incidencias/{id}` is called
- THEN THE SYSTEM returns 403 with `mensaje = "Solo puedes modificar incidencias asignadas a ti"`.

#### Scenario: AGENTE cambia estado de una incidencia suya
- GIVEN a JWT for `AGENTE jose` and an incidencia assigned to jose with process state `EN_PROCESO`
- WHEN `PATCH /api/incidencias/{id}/estado` is called
- THEN THE SYSTEM returns 200 with the transitioned state.

#### Scenario: USUARIO comenta en una incidencia suya
- GIVEN a JWT for `USUARIO maria` and an incidencia created by maria
- WHEN `POST /api/incidencias/{id}/comentarios` is called
- THEN THE SYSTEM returns 201 with the new comentario.

#### Scenario: USUARIO adjunta evidencia en una incidencia suya
- GIVEN a JWT for `USUARIO maria` and an incidencia created by maria
- WHEN `POST /api/incidencias/{id}/adjuntos` (multipart or JSON) is called
- THEN THE SYSTEM returns 201 with the new adjunto(s).

#### Scenario: USUARIO no puede cambiar estado
- GIVEN a JWT for `USUARIO maria`
- WHEN `PATCH /api/incidencias/{id}/estado` is called
- THEN THE SYSTEM returns 403.

#### Scenario: USUARIO no puede eliminar
- GIVEN a JWT for `USUARIO maria`
- WHEN `DELETE /api/incidencias/{id}` is called
- THEN THE SYSTEM returns 403.

#### Scenario: solo ADMINISTRADOR puede eliminar
- GIVEN a JWT for `USUARIO` or `AGENTE`
- WHEN `DELETE /api/incidencias/{id}` is called
- THEN THE SYSTEM returns 403. (ADMINISTRADOR passes — required to align with the existing UI gate in `incidencias-table.tsx:324`.)

### Requirement: Frontend retira gate temporal y consume agentes-asignables

`frontend/src/pages/incidencias/index.tsx` shall remove the `currentUserIsAdmin` gate introduced in the prior bug-fix patch. `loadCatalogos()` shall call all 5 catalog endpoints unconditionally. The `usuarios` catalog shall be loaded via the new `usuariosService.listarAgentesAsignables()` method instead of the admin-gated `listar()`. `nueva-incidencia-view.tsx` and `editar-incidencia-dialog.tsx` shall switch their assignment dropdowns to the same new method.

#### Scenario: AGENTE carga catálogos al entrar a /incidencias
- GIVEN a logged-in AGENTE
- WHEN the `/incidencias` page mounts
- THEN THE SYSTEM issues `GET /api/categorias`, `/api/aplicativos`, `/api/estados-proceso`, `/api/estados-aprobacion`, `/api/usuarios/agentes-asignables` — all 5 return 200 — and the catalog state arrays populate normally (no `—` badges, no empty filters).

#### Scenario: USUARIO también carga catálogos
- GIVEN a logged-in USUARIO
- WHEN the `/incidencias` page mounts
- THEN THE SYSTEM receives 200 for all 5 catalog fetches.

#### Scenario: el frontend ya no llama al endpoint admin-only
- THE SYSTEM shall not call `GET /api/usuarios` from `pages/incidencias/index.tsx` (it remains the admin user-management page's exclusive caller). Grep returns zero matches other than in `pages/usuarios/`.

#### Scenario: dropdown de asignación se llena desde agentes-asignables
- GIVEN a logged-in AGENTE on the "Nueva Incidencia" form
- WHEN the assignment dropdown opens
- THEN THE SYSTEM shows AGENTES and ADMINs (active), excludes USUARIOs. Source: `GET /api/usuarios/agentes-asignables`.

### Requirement: Postman collection sincronizada

`sistemaincidencias/postman/SistemaIncidencias.postman_collection.json` shall document the new endpoint with method, path, auth requirement ("authenticated"), and a sample response shape. The relaxation of catalog GETs to "authenticated" (no longer admin-only) shall be reflected in each catalog entry's auth note.

#### Scenario: nuevo endpoint en Postman
- THE SYSTEM shall contain a Postman folder entry named "Usuarios - agentes asignables" (or equivalent) with `GET /api/usuarios/agentes-asignables`, marked as auth required, with an example 200 response body.

#### Scenario: catálogos reflejan el nuevo rol mínimo
- THE SYSTEM shall contain `GET /api/categorias`, `/api/aplicativos`, `/api/estados-proceso`, `/api/estados-aprobacion` marked as auth required (no longer "ADMINISTRADOR only").

## Non-functional Requirements

### Requirement: Validación de inputs del filtro no se relaja

`IncidenciaFiltro` accepts the new optional `creadoPorUsuarioId` UUID field. Bean validation on `IncidenciaFiltro` is not added (the field is a UUID or null) — input validation remains equivalent to the existing fields. Backend does not regress validation on the existing 9 filter fields.

#### Scenario: filtro inválido no rompe el WHERE builder
- WHEN a malformed `creadoPorUsuarioId` is supplied (not a UUID)
- THEN THE SYSTEM returns 400 from Spring's parameter parsing, not from business logic.

### Requirement: Performance no degrada en listar

The forced `asignadoA` / `creadoPorUsuarioId` filter on listar adds at most one extra equality predicate to the existing WHERE. The existing `idx_asignado_a` (or equivalent) used by the optional-filter path is reused. No new indexes required for this change.

#### Scenario: AGENTE lista sin regresión de latencia
- GIVEN the same data and filters used today
- WHEN the role-based filter is applied
- THEN THE SYSTEM responds in a time within the same order of magnitude (no extra round-trip; no new full-scan).

## Out of scope (explicit non-requirements)

- USUARIO mutating endpoints beyond `agregarComentario` and `agregarAdjunto(s)` (further restrictions/permissions are a follow-up change).
- `DELETE /api/categorias/{id}`, `/api/estados-proceso/{id}`, `/api/estados-aprobacion/{id}`, `/api/usuarios/{id}` — backend endpoints missing entirely.
- Notificaciones reales (RF-37..40).
- Reportes + export PDF/Excel (RF-41..44).
- Dashboard real (RF-06..11) with `/api/dashboard` endpoint.
- Self-profile / change-own-password (RF-36).
- Configuración UI (RF-49..50).
- Demo login fix (`POST /api/auth/demo` mapping).
- OpenAPI/Swagger.
- Breadcrumb.
- Migration of `nueva-incidencia-view.tsx` raw `<label>` markup to modern `Field` primitive (drift S3 from `archive/incidencias-phase2-3/`).
- UI/UX of "AGENTE landed on detail page of a non-owned incidencia" edge case — backend returns 403, frontend just shows a toast and redirects; polished 403-state design is a follow-up.
- Adding new SQL indexes — current indexes are sufficient for the added predicates.

## Acceptance criteria

- All 5 scenarios in `Requirement: Catálogos legibles...` return the documented status.
- All 4 scenarios in `Requirement: Endpoint de agentes asignables...` pass.
- All 4 scenarios in `Requirement: AGENTE solo lista...` pass.
- All 2 scenarios in `Requirement: USUARIO solo lista...` pass.
- All 8 scenarios in `Requirement: AGENTE/USUARIO solo operan...` pass.
- All 4 scenarios in `Requirement: Frontend retira gate...` pass.
- All 2 scenarios in `Requirement: Postman collection...` pass.
- `./mvnw compile` clean; no new compile errors.
- `npm run lint` clean (no new errors).
- `npm run build` clean (no new errors related to this change; pre-existing 4 errors in master stay out of scope).
- Manual smoke (admin + agente + usuario) against running backend exercises all scenarios above.
