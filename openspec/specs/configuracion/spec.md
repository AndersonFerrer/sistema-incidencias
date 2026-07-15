# Capability Spec: `configuracion` — Unified configuration catalog management

**Capability**: `configuracion`
**Project**: sistema-incidencias
**Scope**: Backend (admin-only soft DELETE for `categorias`, `aplicativos` (clientes), `estados-proceso`, `estados-aprobacion`; `POST /api/auth/demo`; seeded `demo@sistema.com` / `demo123`) + Frontend (private admin-gated `/configuracion` page with four tabs + `ELIMINAR` confirmation modal + "Acceso demo" login button).

This capability spec is the synced baseline for the `configuracion` capability after **one** archived change (`configuracion-ui`); the archive history below records what the change contributed and which drifts were applied during archive.

> **Archive history** (baseline evolution; each archive added/extended requirements on top of the prior baseline):
>
> - **`configuracion-ui`** (2026-07-15, archived): seeded the baseline. **Backend primary** — admin-only `DELETE /api/categorias/{id}`, `DELETE /api/aplicativos/{id}`, `DELETE /api/estados-proceso/{id}`, `DELETE /api/estados-aprobacion/{id}` all rewritten as soft-delete (`activo=false`); `LISTAR` queries for all four catalogs now filter `WHERE activo = true`; aplicativo DELETE converted from hard to soft. New `POST /api/auth/demo` (no body) authenticates the seeded `demo@sistema.com` / `demo123` / ADMINISTRADOR account. New SQL constant `UsuarioSql.BUSCAR_DEMO_POR_EMAIL` filters `WHERE u.activo = true AND r.activo = true` so the endpoint fails safely when the seed is missing or inactive. **Frontend** — new private admin-gated `/configuracion` page with four tabs (Categorías, Aplicativos, Estados Proceso, Estados Aprobación); each tab backs list/create/edit/soft-delete through a shared `CatalogTab` shell; destructive actions gated by `CatalogDeleteDialog` requiring the operator to type the literal word `ELIMINAR`. Login form exposes an "Acceso demo" outline button calling `POST /api/auth/demo` and navigating to `/dashboard` on success; the auth store mirrors the demo login flow identically to a normal login. **Postman** — new "Login demo y eliminación lógica de catálogos (change F)" folder with 5 routes (demo POST + four DELETEs) and sample responses (200 / 204 / 401 / 403). 20 Given/When/Then scenarios across 6 requirements covered. Verdict PASS. See `openspec/changes/archive/configuracion-ui/archive-report.md`.

> **Role-name canonicalization**: per `sistemaincidencias/AGENTS.md`, role codes are `ADMINISTRADOR`, `AGENTE`, `USUARIO`. All scenarios below use these canonical names.
>
> **Auth boundary**: all `POST / PUT / DELETE` scenarios assume a valid `Authorization: Bearer <token>` AND `ADMINISTRADOR` role (enforced by `PermisoAdministracionService.validarAdministrador(token)` inside every catalog write/delete controller method, introduced by change `incidencias-rbac-agente`). All `GET` scenarios assume only `validarAutenticado(token)` (any authenticated role). `POST /api/auth/demo` is the single permitted-when-anonymous endpoint and resolves a fixed seeded user; it does not require credentials.
>
> **Soft-delete contract**: `DELETE` on a catalog row sets `activo = false` (no physical deletion). The row remains stored and preserves any incoming or outgoing foreign-key references from `incidencias` (`categoria_id`, `cliente_id`, `estado_proceso_id`, `estado_aprobacion_id`). Subsequent `LISTAR` calls filter `WHERE activo = true` so the row is hidden from selection lists but still resolvable by id for FK integrity.
>
> **Resolved open questions** (from `proposal.md` §5, all defaults confirmed):
> - Q1 (demo mechanism): seeded `demo@sistema.com` / `demo123` with ADMINISTRADOR role + `POST /api/auth/demo` (no body).
> - Q2 (delete mode): soft (`activo = false`), preserving references.
> - Q3 (confirmation): exact literal `ELIMINAR` typed into a modal input before the destructive action fires, matching the profile-admin pattern.

## ADDED Requirements

### Requirement: Credential-free demo access (RF-02)

The system MUST authenticate a seeded demo user without typed credentials and MUST preserve normal credential login.

#### Scenario: Start demo session
- GIVEN the login page
- WHEN the operator selects "Acceso demo"
- THEN THE SYSTEM runs demo authentication without any form credential being submitted.

#### Scenario: Complete demo login
- GIVEN `demo@sistema.com` is an active ADMINISTRADOR seeded by `002_usuarios_roles_seed.sql`
- WHEN `POST /api/auth/demo` is invoked
- THEN THE SYSTEM returns 200 with `AuthResponse` (JWT + bearer type + expiry + `UsuarioSesionResponse`), the auth store persists the JWT exactly like a normal login, and the operator lands on `/dashboard`.

#### Scenario: Demo account unavailable
- GIVEN the demo user is absent OR `activo = false` OR its role is `activo = false`
- WHEN demo access is requested
- THEN THE SYSTEM returns 401, the auth store does NOT persist a session, and the operator stays on the login page with the error rendered in the destructive Alert.

### Requirement: Administrator-only catalog soft delete (RF-49 / RF-50)

The API MUST expose admin-only soft DELETE for `/api/categorias/{id}`, `/api/aplicativos/{id}`, `/api/estados-proceso/{id}`, and `/api/estados-aprobacion/{id}`. Every DELETE MUST call `PermisoAdministracionService.validarAdministrador(token)` and set `activo = false` (no physical deletion).

#### Scenario: Delete category
- GIVEN an active category row and an ADMINISTRADOR JWT
- WHEN `DELETE /api/categorias/{id}` is invoked
- THEN THE SYSTEM returns 204, the row's `activo` is set to `false`, and the row is removed from subsequent `LISTAR` results.

#### Scenario: Delete application (cliente)
- GIVEN an active `clientes` row and an ADMINISTRADOR JWT
- WHEN `DELETE /api/aplicativos/{id}` is invoked
- THEN THE SYSTEM returns 204, the row's `activo` is set to `false`, and the row is removed from subsequent `LISTAR` results.

#### Scenario: Delete process state
- GIVEN an active `estados_proceso` row and an ADMINISTRADOR JWT
- WHEN `DELETE /api/estados-proceso/{id}` is invoked
- THEN THE SYSTEM returns 204, the row's `activo` is set to `false`, and the row is removed from subsequent `LISTAR` results.

#### Scenario: Delete approval state
- GIVEN an active `estados_aprobacion` row and an ADMINISTRADOR JWT
- WHEN `DELETE /api/estados-aprobacion/{id}` is invoked
- THEN THE SYSTEM returns 204, the row's `activo` is set to `false`, and the row is removed from subsequent `LISTAR` results.

#### Scenario: Reject non-admin delete
- GIVEN an authenticated AGENTE or USUARIO JWT
- WHEN any of the four catalog DELETEs is invoked
- THEN THE SYSTEM returns 403 and changes nothing (no DAO mutation runs).

### Requirement: Active-only catalog lists

The four catalog list endpoints MUST omit rows with `activo = false`.

#### Scenario: Hide inactive rows
- GIVEN a database with both active and inactive rows in `categorias`, `clientes`, `estados_proceso`, `estados_aprobacion`
- WHEN any of the four `LISTAR` endpoints is invoked
- THEN THE SYSTEM returns only the rows where `activo = true`.

#### Scenario: Preserve foreign-key references
- GIVEN an existing incidencia that references a catalog row by id
- WHEN that catalog row is soft-deleted
- THEN THE SYSTEM keeps the row physically stored, the incidencia FK stays valid, and historical aggregations can still resolve the referenced catalog row by id.

### Requirement: Administrator-only configuration page

The frontend MUST expose `/configuracion` only to authenticated ADMINISTRADOR users; non-admins see an access-restricted state. Backend authorization remains authoritative.

#### Scenario: Administrator opens configuration
- GIVEN an authenticated ADMINISTRADOR
- WHEN `/configuracion` is opened
- THEN THE SYSTEM renders the configuration page with the four tab buttons (Categorías, Aplicativos, Estados Proceso, Estados Aprobación).

#### Scenario: Non-admin opens configuration
- GIVEN an authenticated AGENTE or USUARIO
- WHEN `/configuracion` is opened
- THEN THE SYSTEM renders an access-restricted alert and never instantiates the four catalog tabs.

### Requirement: Four-tab catalog management

The page MUST provide four named tabs with list, create, edit, loading, error, and empty states. Each tab refreshes after every successful mutation and surfaces API errors as actionable destructive Alerts.

#### Scenario: Select catalog tab
- GIVEN the configuration page as ADMINISTRADOR
- WHEN any of the four tabs is selected
- THEN THE SYSTEM renders the matching `CatalogTab` with active rows and CRUD actions.

#### Scenario: Create entry
- GIVEN valid catalog input
- WHEN the admin creates a new entry from the form dialog
- THEN THE SYSTEM posts to the matching endpoint, refreshes the active list, and shows the new row.

#### Scenario: Edit entry
- GIVEN an existing active row
- WHEN the admin saves valid changes from the form dialog
- THEN THE SYSTEM puts the updated values to the matching endpoint and refreshes the list with the new data.

#### Scenario: Surface operation failure
- GIVEN a catalog request fails (network error, 4xx, or 5xx)
- WHEN the operation completes
- THEN THE SYSTEM renders an actionable destructive Alert with the server-provided message and keeps the form values intact.

### Requirement: Explicit delete confirmation

The frontend MUST require the operator to type the exact literal word `ELIMINAR` before issuing any catalog DELETE. Cancel and incorrect text must not send a request.

#### Scenario: Open confirmation
- GIVEN an entry selected for deletion from a catalog tab
- WHEN delete is chosen
- THEN THE SYSTEM opens a modal that identifies the target by name and instructs the operator to type `ELIMINAR`.

#### Scenario: Reject incorrect text
- GIVEN the confirmation modal is open
- WHEN the typed text differs from `ELIMINAR` (case-insensitive trim)
- THEN THE SYSTEM keeps the destructive button disabled and no DELETE request is sent.

#### Scenario: Confirm deletion
- GIVEN the typed text equals `ELIMINAR` (case-insensitive trim)
- WHEN the admin confirms
- THEN THE SYSTEM issues exactly one DELETE to the matching endpoint and refreshes the active list.

#### Scenario: Cancel deletion
- GIVEN the confirmation modal is open
- WHEN the admin cancels (button, backdrop click, or ESC key)
- THEN THE SYSTEM closes the modal without sending any DELETE request.