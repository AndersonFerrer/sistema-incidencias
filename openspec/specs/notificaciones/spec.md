# Capability Spec: `notificaciones` — Centro + badge + polling

**Capability**: `notificaciones`
**Project**: sistema-incidencias
**Scope**: Backend (new `notificaciones/` module + 5 endpoints + 6 generation hooks in `IncidenciaService`) + Frontend (topbar bell + badge + dropdown + `/notificaciones` page + 30 s polling).

This capability spec is the synced baseline for the `notificaciones` capability after **one** archived change (`notificaciones-realtime`); the archive history below records what the change contributed and which drifts were applied during archive.

> **Archive history** (baseline evolution; each archive added/extended requirements on top of the prior baseline):
>
> - **`notificaciones-realtime`** (2026-07-15, archived): seeded the baseline. **Backend primary** — new `notificaciones/` module with 5 endpoints (`GET /api/notificaciones`, `GET /api/notificaciones/no-leidas/count`, `PATCH /api/notificaciones/{id}/leida`, `POST /api/notificaciones/marcar-todas-leidas`, `DELETE /api/notificaciones/{id}`), 6 generation hooks in `IncidenciaService` (asignar, aprobar, rechazar, cambiar estado, comentar — con self-event suppression), `@Transactional` boundaries covering the mutation+history+notification writes, pagination size capped at 50 per RF, bulk endpoint returns `{actualizadas}` field, page size cap enforced server-side. **Frontend** — new `notificaciones-service.ts`, `use-notifications-polling.ts` hook (30s + `document.hidden` pause), topbar bell replacing hardcoded "4", `NotificationDropdown` panel, `/notificaciones` page with paginated table and "Solo no leídas" filter. 37 Given/When/Then scenarios covered (33 source-aligned PASS, 4 warnings). Verdict PASS. See `openspec/changes/archive/notificaciones-realtime/archive-report.md`.

> **Role canonicalization**: per `sistemaincidencias/AGENTS.md`, role codes are `ADMINISTRADOR`, `AGENTE`, `USUARIO`. Scenarios below use these canonical names.
>
> **Auth boundary**: all scenarios assume the request is `authenticated` (a valid `Authorization: Bearer <token>` is supplied). `SecurityConfig.java:42-49` enforces `.requestMatchers("/api/**").authenticated()` upstream of every controller. The new endpoints reuse the `validarAutenticado(token)` helper introduced by change `incidencias-rbac-agente`.
>
> **Persistence**: the `notificaciones` table already exists (`sistemaincidencias/src/main/resources/db/scripts/004_incidencias_relaciones.sql:171-199`) with columns `id`, `usuario_id`, `incidencia_id`, `cliente_id`, `tipo varchar(80)`, `titulo varchar(200)`, `descripcion text`, `leido_en timestamp`, `creado_en timestamp`. The API DTO field `leido: boolean` is derived as `leido_en IS NOT NULL`. **No new migration is required**.
>
> **Resolved defaults** (from `proposal.md §5`):
> - Q1 (real-time): polling 30 s from frontend to `GET /api/notificaciones/no-leidas/count`. No SSE.
> - Q2 (types enum): `INCIDENCIA_ASIGNADA | INCIDENCIA_APROBADA | INCIDENCIA_RECHAZADA | INCIDENCIA_ESTADO_CAMBIADO | INCIDENCIA_COMENTARIO`.
> - Q3 (push target): explicit `usuario_id` passed by callers; auto-events (actor == destinatario) are silenced.
> - Q4 (retention): no automatic delete; rows live until manual `DELETE` or DB cleanup. No scheduled job in V1.
> - Q5 (mark-as-read): explicit only — frontend NEVER calls `marcarLeida` automatically when rendering.

## ADDED Requirements

### Requirement: GET /api/notificaciones (paginated)

The backend shall expose `GET /api/notificaciones?page=0&size=20&soloNoLeidas=false` returning a paginated `PageResult<NotificacionResponse>` for the **authenticated** user. The query MUST filter `WHERE usuario_id = currentUser.id` at the SQL level (per-role scope is server-enforced; client cannot widen). Results MUST be ordered `creado_en DESC`. `page` defaults to `0`, `size` defaults to `20` (max `50`).

#### Scenario: retorna lista del usuario autenticado

- GIVEN a valid JWT for `AGENTE jose` and 7 notifications where `usuario_id = jose.id` plus 5 for other users
- WHEN `GET /api/notificaciones` is called
- THEN THE SYSTEM returns 200 with `contenido.length = 7` AND every item's `usuarioId == jose.id`.

#### Scenario: paginación `page=0&size=20`

- GIVEN a valid JWT for `USUARIO maria` and 35 notifications for maria
- WHEN `GET /api/notificaciones?page=0&size=20` is called
- THEN THE SYSTEM returns 200 with `contenido.length = 20`, `total = 35`.

#### Scenario: ordenado `creado_en DESC`

- GIVEN 5 notifications for the user spanning the last 5 days
- WHEN `GET /api/notificaciones` is called
- THEN THE SYSTEM returns 200 with `contenido` ordered by `creadoEn` DESC.

#### Scenario: filtro `soloNoLeidas=true` excluye leídas

- GIVEN 8 notifications: 3 with `leido_en IS NOT NULL`, 5 with `leido_en IS NULL`
- WHEN `GET /api/notificaciones?soloNoLeidas=true` is called
- THEN THE SYSTEM returns 200 with `contenido.length = 5` AND every item has `leido = false`.

#### Scenario: token inválido retorna 401

- GIVEN a request to `GET /api/notificaciones` with an expired or malformed JWT
- WHEN the request reaches `JwtAuthenticationFilter` upstream
- THEN THE SYSTEM returns 401 AND the controller is not invoked.

### Requirement: GET /api/notificaciones/no-leidas/count

The backend shall expose `GET /api/notificaciones/no-leidas/count` returning `{ total: long }` where `total = COUNT(*) WHERE usuario_id = currentUser.id AND leido_en IS NULL`. The count is the polling target for the topbar badge. MUST return `0` (not absent) when the user has no unread notifications.

#### Scenario: retorna integer count

- GIVEN a valid JWT for `AGENTE jose` and 5 unread notifications for jose
- WHEN `GET /api/notificaciones/no-leidas/count` is called
- THEN THE SYSTEM returns 200 with `{"total": 5}`.

#### Scenario: solo cuenta del usuario autenticado

- GIVEN 4 unread for `AGENTE jose` and 8 unread for `USUARIO maria`
- WHEN the endpoint is called with jose's JWT
- THEN THE SYSTEM returns 200 with `{"total": 4}` (NOT 12).

#### Scenario: count = 0 cuando todas leídas

- GIVEN the user with 6 notifications, all `leido_en IS NOT NULL`
- WHEN `GET /api/notificaciones/no-leidas/count` is called
- THEN THE SYSTEM returns 200 with `{"total": 0}` AND the frontend badge is hidden.

### Requirement: PATCH /api/notificaciones/{id}/leida

The backend shall expose `PATCH /api/notificaciones/{id}/leida` setting `leido_en = CURRENT_TIMESTAMP` WHERE `id = ? AND usuario_id = currentUser.id AND leido_en IS NULL`. The endpoint MUST be idempotent. Cross-user access returns 404 (not 403, to avoid leaking existence).

#### Scenario: marca como leída

- GIVEN a valid JWT and an unread notification `N1` owned by the user
- WHEN `PATCH /api/notificaciones/N1/leida` is called
- THEN THE SYSTEM returns 200 with `{id: N1, leidoEn: <timestamp>}` AND the DB row has `leido_en` populated.

#### Scenario: idempotente (segunda llamada no falla)

- GIVEN the same notification already marked as read
- WHEN `PATCH /api/notificaciones/N1/leida` is called again
- THEN THE SYSTEM returns 200 with the SAME `leidoEn` as the first call (no overwrite, no error).

#### Scenario: id de otro usuario retorna 404

- GIVEN a notification `N2` whose `usuario_id = otherUser.id`
- WHEN `PATCH /api/notificaciones/N2/leida` is called with the current user's JWT
- THEN THE SYSTEM returns 404 AND `N2` is NOT mutated.

#### Scenario: id inválido retorna 400

- GIVEN a valid JWT and `PATCH /api/notificaciones/not-a-uuid/leida`
- WHEN the controller parses the path variable
- THEN THE SYSTEM returns 400 (`ReglaNegocioException`).

### Requirement: POST /api/notificaciones/marcar-todas-leidas

The backend shall expose `POST /api/notificaciones/marcar-todas-leidas` updating `leido_en = CURRENT_TIMESTAMP` for all rows where `usuario_id = currentUser.id AND leido_en IS NULL`. Returns `{actualizadas: long}`.

#### Scenario: marca todas las del usuario

- GIVEN a valid JWT and 7 unread notifications for the user
- WHEN `POST /api/notificaciones/marcar-todas-leidas` is called
- THEN THE SYSTEM returns 200 with `{actualizadas: 7}` AND every notification now has `leido_en IS NOT NULL`.

#### Scenario: retorna count de marcadas + idempotente

- GIVEN 3 already-read and 4 unread for the user
- WHEN `POST /api/notificaciones/marcar-todas-leidas` is called twice consecutively
- THEN THE SYSTEM returns `{actualizadas: 4}` then `{actualizadas: 0}` AND only the user's rows are affected (no cross-user leakage).

### Requirement: DELETE /api/notificaciones/{id}

The backend shall expose `DELETE /api/notificaciones/{id}` to physically remove a single notification. Only the **owner** (matching `usuario_id`) can delete. 404 on cross-user or missing id, 400 on malformed UUID.

#### Scenario: elimina por id

- GIVEN a valid JWT and a notification `N1` owned by the user
- WHEN `DELETE /api/notificaciones/N1` is called
- THEN THE SYSTEM returns 204 AND the row no longer exists in DB.

#### Scenario: solo el dueño puede borrar (404 si no)

- GIVEN a notification `N2` whose `usuario_id = otherUser.id`
- WHEN `DELETE /api/notificaciones/N2` is called with the current user's JWT
- THEN THE SYSTEM returns 404 AND `N2` is NOT deleted.

#### Scenario: id inválido 400

- GIVEN a valid JWT and `DELETE /api/notificaciones/abc`
- WHEN the controller parses the path variable
- THEN THE SYSTEM returns 400.

### Requirement: Generación automática en eventos (RF-37)

`IncidenciaService` MUST insert a row into `notificaciones` after each of the following domain events, inside the **same `@Transactional` boundary** as the originating operation. Each hook computes `usuario_id` deterministically (Q3 = explicit push). The auto-event guard (`if (Objects.equals(usuarioDestinoId, actorId)) return;`) MUST be applied so a user is never notified of their own action.

#### Scenario: asignar incidencia → `INCIDENCIA_ASIGNADA` para `asignadoA`

- GIVEN an incidencia `I1` with `asignadoA = jose.id`, `creadoPorUsuarioId = maria.id` is being created/assigned by `maria`
- WHEN the `crear`/`actualizar` flow executes
- THEN THE SYSTEM inserts a row with `usuario_id = jose.id`, `tipo = INCIDENCIA_ASIGNADA`, `incidencia_id = I1` AND no row for `maria`.

#### Scenario: aprobar → `INCIDENCIA_APROBADA` para `creadoPorUsuarioId`

- GIVEN `aprobar` is called by `AGENTE jose` for `I2` whose `creadoPorUsuarioId = maria.id`
- WHEN the approve flow executes
- THEN THE SYSTEM inserts a row with `usuario_id = maria.id`, `tipo = INCIDENCIA_APROBADA`.

#### Scenario: rechazar → `INCIDENCIA_RECHAZADA` para `creadoPorUsuarioId`

- GIVEN `rechazar` is called with `motivoRechazo` for `I3` whose `creadoPorUsuarioId = maria.id`
- WHEN the reject flow executes
- THEN THE SYSTEM inserts a row with `usuario_id = maria.id`, `tipo = INCIDENCIA_RECHAZADA`, `descripcion` containing the reason.

#### Scenario: cambiar estado → `INCIDENCIA_ESTADO_CAMBIADO` para `asignadoA + creadoPorUsuarioId`

- GIVEN `I4` with `asignadoA = jose.id`, `creadoPorUsuarioId = maria.id`; state changes from `EN_PROCESO` to `FINALIZADA` by `jose`
- WHEN `cambiarEstado` executes
- THEN THE SYSTEM inserts TWO rows (one per destinatario) with `tipo = INCIDENCIA_ESTADO_CAMBIADO`.

#### Scenario: agregar comentario → `INCIDENCIA_COMENTARIO` para `asignadoA` (excluye autor)

- GIVEN `I5` with `asignadoA = jose.id`, `creadoPorUsuarioId = maria.id`; `AGENTE jose` posts a comment
- WHEN `agregarComentario` executes
- THEN THE SYSTEM inserts a row for `maria` only (`tipo = INCIDENCIA_COMENTARIO`) — jose (the author) does NOT receive a self-notification.

#### Scenario: auto-evento silenciado (actor == destinatario)

- GIVEN `USUARIO maria` comments on her own incidencia where both `asignadoA = maria.id` and `creadoPorUsuarioId = maria.id`
- WHEN `agregarComentario` executes
- THEN THE SYSTEM inserts ZERO new notification rows (auto-event guard fires).

#### Scenario: fallo en inserción hace rollback completo

- GIVEN the `aprobar` flow's transaction with a downstream failure during the `INSERT INTO notificaciones` step
- WHEN the JDBC driver throws an exception
- THEN THE SYSTEM rolls back the `aprobacion`, the `historial_incidencias` row, AND the failing `notificaciones` insert together — no partial commit.

### Requirement: Topbar bell + badge (RF-40)

`frontend/src/layout/app-header.tsx` shall display a bell icon for all authenticated roles. The numeric badge MUST reflect `notificacionesService.noLeidasCount()` polled every 30 s. The badge MUST be hidden when `count == 0`. Clicking the bell MUST open a dropdown panel showing the most recent 10 notifications (lazy fetch on open) with a "Ver todas" link to `/notificaciones`.

#### Scenario: bell icon visible para todos los roles

- GIVEN a logged-in user (any role) on any authenticated page
- WHEN the topbar renders
- THEN THE SYSTEM renders the bell icon AND the user can interact with it.

#### Scenario: badge muestra count de no-leídas

- GIVEN a logged-in user with 3 unread notifications
- WHEN the polled endpoint returns `{"total": 3}`
- THEN THE SYSTEM renders the bell with a red numeric badge showing `3`.

#### Scenario: badge oculto si count = 0

- GIVEN a logged-in user with 0 unread notifications
- WHEN the polled endpoint returns `{"total": 0}`
- THEN THE SYSTEM renders the bell WITHOUT a numeric badge overlay.

#### Scenario: click en bell abre dropdown con últimas 10

- GIVEN a logged-in user with 15 notifications
- WHEN the user clicks the bell
- THEN THE SYSTEM fetches `GET /api/notificaciones?size=10` and renders a dropdown listing the 10 newest, with a "Ver todas" link at the bottom routing to `/notificaciones`.

### Requirement: /notificaciones page (RF-38)

`frontend/src/pages/notificaciones/index.tsx` shall render the full notification center: paginated list (size 20), filter toggle "Solo no leídas", per-row "Marcar como leída" action, and bulk "Marcar todas como leídas" button. Clicking a notification row MUST mark it as read AND navigate to the related `/incidencias/{id}` page (when `incidencia_id IS NOT NULL`).

#### Scenario: lista paginada de notificaciones

- GIVEN a logged-in user with 35 notifications
- WHEN the page mounts
- THEN THE SYSTEM calls `GET /api/notificaciones?page=0&size=20` and renders 20 rows with pagination controls.

#### Scenario: click en item marca como leída + navega a incidencia

- GIVEN the user clicks on an unread notification row with `incidencia_id = I1`
- WHEN the click handler runs
- THEN THE SYSTEM calls `PATCH /api/notificaciones/{id}/leida` AND navigates to `/incidencias/I1`.

#### Scenario: "Marcar todas como leídas" funciona

- GIVEN the user clicks the "Marcar todas como leídas" button with multiple unread notifications
- WHEN the action fires
- THEN THE SYSTEM calls `POST /api/notificaciones/marcar-todas-leidas` AND refreshes the list (every row now shows `leido = true`).

#### Scenario: filtro "Solo no leídas" toggle

- GIVEN the user toggles the "Solo no leídas" filter ON
- WHEN the filter state changes
- THEN THE SYSTEM refetches `GET /api/notificaciones?page=0&size=20&soloNoLeidas=true` AND renders only unread rows.

### Requirement: Polling 30 s

The frontend MUST poll `GET /api/notificaciones/no-leidas/count` every 30 seconds while the app is open in an active tab. The polling MUST pause when `document.visibilityState === "hidden"` and resume when visible again. No long-poll, no SSE, no WebSocket.

#### Scenario: poll dispara cada 30 segundos

- GIVEN a logged-in user with the app open in an active tab
- WHEN 30 seconds elapse
- THEN THE SYSTEM issues `GET /api/notificaciones/no-leidas/count` exactly once (then waits another 30 s).

#### Scenario: poll pausa cuando tab inactivo

- GIVEN the polling loop is running
- WHEN the user switches to another tab (`document.visibilityState === "hidden"`)
- THEN THE SYSTEM does NOT issue further polling requests until the tab becomes visible again.

#### Scenario: nuevo count actualiza badge sin refresh

- GIVEN a logged-in user on `/dashboard` with the badge showing `3`
- WHEN another user triggers an `INCIDENCIA_ASIGNADA` for the current user AND the next poll fires
- THEN THE SYSTEM updates the badge from `3` to `4` without a page reload.

### Requirement: Per-role scope (server-enforced WHERE)

The per-user scope MUST be enforced at the SQL `WHERE usuario_id = currentUser.id` level by every read query (listar, count, recientes, marcar). No client-side filter, no custom header, no override query param can widen the scope.

#### Scenario: cada usuario solo ve SUS notificaciones

- GIVEN `AGENTE jose` (10 notifications) and `USUARIO maria` (8 notifications) in DB
- WHEN jose calls `GET /api/notificaciones` or `GET /api/notificaciones/no-leidas/count`
- THEN THE SYSTEM returns ONLY jose's rows AND every query is filtered server-side (no client header can widen it).

### Requirement: SecurityConfig sin cambios

`SecurityConfig.java` shall remain unmodified. The new endpoints under `/api/notificaciones/**` are covered by the existing `.requestMatchers("/api/**").authenticated()` chain. Per-role filtering happens at the service/DAO WHERE level, not via Spring Security matchers.

#### Scenario: SecurityConfig no es tocado por este cambio

- GIVEN a clean checkout of this change applied on top of master
- WHEN `git diff master..HEAD -- sistemaincidencias/src/main/java/com/integrador/sistemaincidencias/config/SecurityConfig.java` is executed
- THEN THE SYSTEM returns an empty diff.

## Out of scope (explicit non-requirements)

- **SSE / WebSocket push** — Q1 resolved to polling. SSE is a follow-up.
- **Email / SMS / mobile push** — RF-37..40 covers in-app only.
- **Notification preferences per user** (silence types, daily digest) — single global profile in V1.
- **Grouping / digesting** — each event = one row, no deduplication.
- **Auto-delete by age** — Q4 = A, manual only.
- **Auto-mark-as-read on view** — Q5 = A, explicit only.
- **`DELETE /api/notificaciones` (clear all for user)** — only single-delete in V1.
- **Hook in `IncidenciaService.eliminar`** — current silent-delete behavior remains.
- **Notificaciones desde `auth/`** (welcome) — out of scope.
- **WebSocket broker / Redis pub-sub** — single instance, polling is enough.
- **OpenAPI/Swagger documentation** — RNF-18. Postman collection IS updated.
- **Modificación de la tabla `notificaciones`** — schema is final; no migration needed.

## Acceptance criteria

- All 5 scenarios in `Requirement: GET /api/notificaciones (paginated)` pass.
- All 3 scenarios in `Requirement: GET /api/notificaciones/no-leidas/count` pass.
- All 4 scenarios in `Requirement: PATCH /api/notificaciones/{id}/leida` pass.
- All 2 scenarios in `Requirement: POST /api/notificaciones/marcar-todas-leidas` pass.
- All 3 scenarios in `Requirement: DELETE /api/notificaciones/{id}` pass.
- All 7 scenarios in `Requirement: Generación automática en eventos (RF-37)` pass.
- All 4 scenarios in `Requirement: Topbar bell + badge (RF-40)` pass.
- All 4 scenarios in `Requirement: /notificaciones page (RF-38)` pass.
- All 3 scenarios in `Requirement: Polling 30 s` pass.
- All 1 scenario in `Requirement: Per-role scope` pass.
- All 1 scenario in `Requirement: SecurityConfig sin cambios` pass.
- **Total scenarios**: 37.
- `./mvnw compile` clean.
- `npm run lint` clean.
- `npm run build` clean.
- Manual smoke (ADMINISTRADOR + AGENTE + USUARIO tokens) against a running backend exercises every flow.
- Sanity: `badge count == no-leidas/count.total` after every poll tick.