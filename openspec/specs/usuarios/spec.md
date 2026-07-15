# Capability Spec: `usuarios` — admin user-management + self-service + soft delete

**Capability**: `usuarios`
**Project**: sistema-incidencias
**Scope**: Backend (Spring Boot 4 + native SQL via DAO) + frontend (React + Vite + TS). Postman collection is the source of truth for endpoint contracts.

This capability spec is the synced baseline for the `usuarios` capability after two archived changes:

- `users-admin-page` (admin user-management UI consuming all 7 pre-existing admin endpoints + `GET /api/roles`).
- `perfil-self` (RF-33 self-service: `GET /api/usuarios/me`, `PUT /api/usuarios/me`, `PUT /api/usuarios/me/password`, plus RF-33 admin-only `DELETE /api/usuarios/{id}` soft delete; frontend `/perfil` page with three tabs).

The combined baseline covers 11 admin endpoints of `UsuarioController`, 3 self-service endpoints, 1 admin-only DELETE endpoint, and `GET /api/roles`.

> Drift notes applied during archive (vs the original delta specs) — see `openspec/changes/archive/users-admin-page/archive-report.md` and `openspec/changes/archive/perfil-self/archive-report.md`:
>
> - **S1 (REQ-5, users-admin-page)**: client-side password minimum updated from 6 to 8 characters to match implementation. The backend `@Size(min=6, max=100)` constraint is unchanged; the frontend is intentionally stricter for UX consistency with the create form.
> - **S2 (REQ-1, users-admin-page)**: empty-state copy updated to "No se encontraron usuarios con los filtros aplicados." (covers both unfiltered and filtered empty cases, matching the categorias-page precedent).
> - **S3 (REQ-1, users-admin-page)**: inactive-only filter described as a 3-option native `<select>` ("Todos / Solo activos / Solo inactivos") instead of a `Switch` primitive. The request parameters are unchanged.
> - **NFR-3**: left as-is. The pre-existing English "Admin" default in `app-sidebar.tsx` is out of scope.
> - **S4 (perfil-self)**: confirmation dialog requires the admin to type `ELIMINAR` (case-insensitive) instead of a simple button click — preserves the explicit-confirmation intent of the spec while adding a typing step.

## Purpose

The system shall provide authenticated administrators with a UI to manage internal users — list with filters and pagination, create, edit, reset another user's password, toggle active state, and soft-delete another user — through the existing backend REST API. The system shall additionally provide every authenticated user (any active role) with a private `/perfil` page where they can read and update their own name and avatar URL, change their own password by verifying the current one, and (for administrators only) link to the user-management page for destructive operations. The page shall consume all 11 admin endpoints of `UsuarioController` (including the new `DELETE /api/usuarios/{id}`), the 3 self-service endpoints under `/api/usuarios/me`, and `GET /api/roles` for the role dropdown.

## Requirements

### Requirement: List internal users with filters and pagination

The page shall call `GET /api/usuarios` with query parameters for text search, role filter, active filter, and offset/limit pagination. The backend returns a flat `List<UsuarioResponse>` (no `total` count, no envelope); the UI shall render Prev/Next pagination plus a "Mostrando X–Y" counter, disable Next when the response carries fewer items than `limit`, and clamp `offset` to 0 on Previous. The active filter is exposed as a 3-option native `<select>` ("Todos / Solo activos / Solo inactivos") rather than a `Switch` primitive.

#### Scenario: Initial list load
- WHEN an authenticated user navigates to `/usuarios`
- THEN THE SYSTEM shall issue `GET /api/usuarios?limit=20&offset=0` with the current auth token (attached by `src/lib/http.ts`) and render the returned users in a `<Table>`.

#### Scenario: Debounced text search
- WHEN the user types in the search field
- THEN THE SYSTEM shall debounce the input by 300ms and issue `GET /api/usuarios?texto=<value>&limit=20&offset=0`, resetting `offset` to 0.

#### Scenario: Role filter
- WHEN the user selects a role in the role filter dropdown
- THEN THE SYSTEM shall append `&rol=<rolCodigo>` to the next list request and reset `offset` to 0.

#### Scenario: Inactive-only filter (3-option select)
- WHEN the user selects "Solo inactivos" in the estado filter (a 3-option `<select>` with "Todos / Solo activos / Solo inactivos")
- THEN THE SYSTEM shall append `&activo=false` to the next list request and reset `offset` to 0.
- WHEN the user selects "Solo activos", THE SYSTEM shall append `&activo=true` to the next list request and reset `offset` to 0.
- WHEN the user selects "Todos", THE SYSTEM shall omit the `activo` parameter (return all users).

#### Scenario: Next page
- WHEN the user clicks "Siguiente"
- THEN THE SYSTEM shall increment `offset` by `limit` and refetch the list.

#### Scenario: Previous page clamped
- WHEN the user clicks "Anterior"
- THEN THE SYSTEM shall decrement `offset` by `limit`, clamped to a minimum of 0, and refetch.

#### Scenario: End-of-list detection
- WHEN the response returns fewer items than `limit`
- THEN THE SYSTEM shall disable the "Siguiente" button and label the counter "Mostrando X–Y" with no total.

#### Scenario: Empty state
- WHEN the list response is an empty array (with or without active filters)
- THEN THE SYSTEM shall render the empty-state message "No se encontraron usuarios con los filtros aplicados." (covers both unfiltered and filtered empty cases).

#### Scenario: Network or 5xx failure
- WHEN the list request fails (network error or HTTP 5xx)
- THEN THE SYSTEM shall show an error toast and keep the previous table state visible (no full-page crash).

### Requirement: Render users with consistent UI elements

The table row shall display avatar with initials, full name, email, role badge (label from `rol.nombre`), a Cliente cell rendered as "—" (backend has no `cliente` field in v1), and an Estado cell with a green dot + "Activo" or a gray dot + "Inactivo". When the rendered user is the currently logged-in admin, the deactivate action shall be disabled with an explanatory tooltip.

#### Scenario: Standard row render
- WHEN a user is rendered in the table
- THEN THE SYSTEM shall show: avatar with initials (from `nombre`), `nombre`, `email`, rol badge using `rol.nombre` as the label, Cliente as "—", and Estado as a green dot + "Activo" or gray dot + "Inactivo".

#### Scenario: Self-deactivation prevented in UI
- WHEN the currently logged-in user (who is an `ADMINISTRADOR`) is rendered in the table
- THEN THE SYSTEM shall disable the toggle action on that row and show a tooltip reading "No puedes desactivar tu propio usuario administrador".

### Requirement: Create a user

A "Nuevo Usuario" affordance shall open a dialog with a modern shadcn `Field`-based form (nombre, email, password, rol, activo switch). Submission shall call `POST /api/usuarios`. Backend validation errors shall be displayed inline on the relevant field.

#### Scenario: Open create dialog
- WHEN the user clicks "Nuevo Usuario"
- THEN THE SYSTEM shall open a dialog containing the create form fields (nombre, email, password, rol, activo) built with modern shadcn `Field` / `FieldLabel` / `FieldError`.

#### Scenario: Successful create
- WHEN the user submits valid create data
- THEN THE SYSTEM shall issue `POST /api/usuarios` with the `CrearUsuarioInput` body
- AND on HTTP 201 shall close the dialog, refetch the list, and show a success toast.

#### Scenario: Email-uniqueness error on create
- WHEN the backend returns HTTP 400 with message "Ya existe un usuario con el email indicado"
- THEN THE SYSTEM shall keep the dialog open and display that message inline on the email field.

#### Scenario: Password-length error on create
- WHEN the backend returns HTTP 400 with a password-length validation message (e.g. `password: size must be between 6 and 100`)
- THEN THE SYSTEM shall keep the dialog open and display that message inline on the password field.

#### Scenario: Cancel without persisting
- WHEN the user cancels the dialog
- THEN THE SYSTEM shall close the dialog and discard the form state without issuing any request.

### Requirement: Edit a user (excluding password)

The edit dialog shall pre-populate from `GET /api/usuarios/{id}` and shall NOT include a password field. Submission shall call `PUT /api/usuarios/{id}`.

#### Scenario: Open edit dialog
- WHEN the user clicks the edit icon on a row
- THEN THE SYSTEM shall open a dialog with the edit form pre-populated from `GET /api/usuarios/{id}` (nombre, email, rol, activo) using modern shadcn `Field`. The dialog MUST NOT include a password field.

#### Scenario: Successful edit
- WHEN the user submits valid edit data
- THEN THE SYSTEM shall issue `PUT /api/usuarios/{id}` with the `ActualizarUsuarioInput` body
- AND on HTTP 200 shall close the dialog, refetch the list, and show a success toast.

#### Scenario: Email-uniqueness error on update
- WHEN the backend returns HTTP 400 with the email-uniqueness message during an edit submission
- THEN THE SYSTEM shall keep the dialog open and display the message inline on the email field.

### Requirement: Change another user's password

A dedicated dialog (separate from edit) shall allow admins to set a new password for any user other than themselves, calling `PATCH /api/usuarios/{id}/password`. The client enforces a minimum of 8 characters (stricter than the backend `@Size(min=6, max=100)` for UX consistency with the create form).

#### Scenario: Open password dialog
- WHEN the user clicks the key icon on a row
- THEN THE SYSTEM shall open a small dialog containing a single password field with a confirmation field, built with modern shadcn `Field`.

#### Scenario: Successful password change
- WHEN the user submits a valid password (both fields match, meets length)
- THEN THE SYSTEM shall issue `PATCH /api/usuarios/{id}/password` with `{ password }`
- AND on HTTP 204 shall close the dialog and show a success toast.

#### Scenario: Client-side validation
- WHEN the user submits an empty password or a password shorter than 8 characters
- THEN THE SYSTEM shall show the validation message inline ("La contraseña debe tener al menos 8 caracteres.") and MUST NOT call the backend.
- WHEN the user submits two passwords that do not match
- THEN THE SYSTEM shall show the validation message "Las contraseñas no coinciden." inline on the confirmation field and MUST NOT call the backend.

#### Scenario: Backend password error
- WHEN the backend returns HTTP 400 during a password change
- THEN THE SYSTEM shall surface the message inline on the password field and keep the dialog open.

### Requirement: Toggle user active/inactive (soft)

Each row shall expose a single toggle icon that flips the user's active state via `PATCH /api/usuarios/{id}/activar` or `PATCH /api/usuarios/{id}/desactivar`. The toggle shall be optimistic on the visual state with rollback on error.

#### Scenario: Deactivate an active user
- WHEN the user clicks the toggle icon on an active row
- THEN THE SYSTEM shall optimistically flip the visual state to inactive and issue `PATCH /api/usuarios/{id}/desactivar`. On HTTP 200 success, the visual state stays inactive. On any error, the visual state reverts and an error toast is shown.

#### Scenario: Activate an inactive user
- WHEN the user clicks the toggle icon on an inactive row
- THEN THE SYSTEM shall optimistically flip the visual state to active and issue `PATCH /api/usuarios/{id}/activar`. On HTTP 200 success, the visual state stays active. On any error, the visual state reverts and an error toast is shown.

#### Scenario: Self toggle disabled
- WHEN the target row is the currently logged-in user AND that user is an `ADMINISTRADOR`
- THEN THE SYSTEM shall NOT render the toggle action (disabled button + tooltip), preventing the round-trip that would always fail with HTTP 400.

### Requirement: Admin-only access with graceful 403 page state

A non-admin user navigating to `/usuarios` shall see an in-page 403 message instead of the table. The sidebar entry shall remain visible for all logged-in users (decision: see proposal §4.a) so that role-state changes do not cause sidebar flicker.

#### Scenario: Non-admin receives 403 from list
- WHEN a non-admin user navigates to `/usuarios`
- THEN THE SYSTEM shall issue the initial list request, receive HTTP 403 from `AccesoDenegadoException`, and render an in-page 403 message reading "No tienes permisos para acceder a esta sección" instead of the table.

#### Scenario: Sidebar entry visible to all
- WHEN any authenticated user views the sidebar
- THEN THE SYSTEM shall display the "Usuarios" entry. Non-admin users clicking it land on the in-page 403 state, not a redirect.

### Requirement: Sidebar integration

The existing "Usuarios" entry in the sidebar shall be activated by adding a `to` prop. No other sidebar change is in scope.

#### Scenario: Sidebar Usuarios link active
- THE SYSTEM shall enable the "Usuarios" sidebar entry by adding `to: "/usuarios"` in `frontend/src/layout/app-sidebar.tsx`, keeping the existing `Users` icon from `lucide-react`.

### Requirement: Router registration

The route `/usuarios` shall be registered as a private route inside `AppLayout` and `PrivateRoute` (per the `gestincidencias-frontend` skill conventions).

#### Scenario: Route registered
- THE SYSTEM shall register `/usuarios` as a private route in `frontend/src/router.tsx`, wrapping the page in `AppLayout` (which applies `PrivateRoute`). The route shall follow the existing pattern (`createRoute` with `getParentRoute: () => rootRoute`, `path: "/usuarios"`).

### Requirement: Roles dropdown data

The create and edit dialogs shall fetch `GET /api/roles` on mount and populate the rol dropdown with `{ id, codigo, nombre }`. Failure to load roles shall be surfaced in the dialog and shall NOT block the dialog from opening.

#### Scenario: Roles loaded on dialog mount
- WHEN the create or edit dialog mounts
- THEN THE SYSTEM shall issue `GET /api/roles` and populate the rol `<select>` with the returned roles, using `rol.nombre` as the visible label and `rol.codigo` as the submitted value.

#### Scenario: Roles request failure
- WHEN the `GET /api/roles` request fails
- THEN THE SYSTEM shall render the dialog with the rol field disabled and an inline error reading "No se pudieron cargar los roles".

### Requirement: Type alignment with backend

Frontend types shall mirror backend DTOs 1:1 — no invented fields, no renamed fields.

#### Scenario: Types defined in src/types/usuarios.ts
- THE SYSTEM shall define `CrearUsuarioInput`, `ActualizarUsuarioInput`, `CambiarPasswordInput`, `Usuario`, and `Rol` in `frontend/src/types/usuarios.ts` (Rol may be re-exported from `frontend/src/types/roles.ts` if cleaner). `Usuario` shall be structurally identical to backend `UsuarioResponse` (id, nombre, email, rol, activo, avatarUrl?, creadoEn?, actualizadoEn?).

#### Scenario: No invented fields
- THE SYSTEM shall not introduce fields not present in the backend DTOs. In particular, no `cliente`, `aplicativoId`, or `total` field shall be added to `Usuario` for v1 (the `total` gap is handled by frontend-only pagination state).

### Requirement: Verification

The change shall pass project-defined static verification (lint + build) and a manual smoke walkthrough against the running backend. There are no automated frontend tests in this project, per `openspec/config.yaml` and `frontend/AGENTS.md`.

#### Scenario: Lint passes
- THE SYSTEM shall pass `npm run lint` with no errors.

#### Scenario: Build passes
- THE SYSTEM shall pass `npm run build` with no errors.

#### Scenario: Manual smoke checklist
- WHEN the backend is running and an admin is logged in
- THEN an admin can: list users → filter by text → filter by role → toggle inactive-only → create a user → edit that user → change that user's password → toggle their active state → click Next then Previous → see the empty state when the list is empty → and when the row is themselves, the deactivate action is disabled with the tooltip.

#### Scenario: Non-admin manual smoke
- WHEN a non-admin user logs in and navigates to `/usuarios`
- THEN the sidebar entry is visible, clicking it navigates to `/usuarios`, and the page renders the in-page 403 message.

## Non-functional requirements

### Requirement: Modern shadcn Field pattern for all forms

All form fields across the page shall use the modern shadcn `Field` / `FieldLabel` / `FieldDescription` / `FieldError` / `FieldGroup` primitives already installed at `frontend/src/components/ui/field.tsx`. Raw `<label>` + `<input>` pairs shall NOT be used in this page.

#### Scenario: Field primitives used
- THE SYSTEM shall compose every form field on the page (create, edit, password) using `<Field>` plus `<FieldLabel>`, `<FieldError>`, and `<Input>` from `@/components/ui/input`. The pattern shall match `frontend/src/pages/login/components/login-form.tsx`.

### Requirement: Icons from lucide-react@1.17.0

All action and navigation icons shall come from `lucide-react@1.17.0`. Only icons verified to resolve at build time shall be used. The confirmed-available set includes `Pencil`, `Power`, `PowerOff`, `Plus`, `Search`, `ChevronLeft`, `ChevronRight`, `AlertTriangle`, `Users`, and `Mail`. `KeyRound` and `Lock` are preferred candidates for the password action; if either fails to resolve at build time, fall back to the other or to a confirmed-present icon.

#### Scenario: Icon imports resolve at build
- THE SYSTEM shall import only icons that exist in `lucide-react@1.17.0`. `npm run build` shall pass with no missing-export errors.

### Requirement: Spanish UI copy

All string copy visible to the user (labels, buttons, placeholders, tooltips, empty states, error toasts, success toasts) shall be written in neutral Spanish, consistent with `pages/login` and `pages/clientes`.

#### Scenario: Copy is neutral Spanish
- THE SYSTEM shall render every user-facing string in neutral Spanish. No English or mixed-language strings shall appear in the rendered UI.

### Requirement: Page layout follows the gestincidencias-frontend skill

The page shall live at `frontend/src/pages/usuarios/` with `index.tsx` (composition only), page-local components under `components/`, and page-local types under `types.ts` if needed. No new code shall be added directly under `frontend/src/components/`.

#### Scenario: Folder structure matches skill
- THE SYSTEM shall create the page at `frontend/src/pages/usuarios/index.tsx` containing composition only (data/store hooks, top-level sections), with non-trivial pieces extracted to `frontend/src/pages/usuarios/components/<component>.tsx` and any page-local-only types in `frontend/src/pages/usuarios/types.ts`.

### Requirement: No new shadcn primitives

No new shadcn primitives shall be added in this change. The page shall use only the primitives already installed: `alert`, `avatar`, `badge`, `button`, `card`, `dialog`, `field`, `input`, `label`, `separator`, `spinner`, `table`.

#### Scenario: Primitives used are already installed
- THE SYSTEM shall import shadcn primitives only from `@/components/ui/{alert,avatar,badge,button,card,dialog,field,input,label,separator,spinner,table}`. No `npx shadcn@latest add` shall be run.

### Requirement: Backend calls go through src/lib/http.ts

Every request to the backend shall be issued through `src/lib/http.ts`, which already attaches the `Authorization: Bearer <token>` header and normalizes error payloads (reads `payload.mensaje ?? payload.message`).

#### Scenario: Centralized HTTP layer
- THE SYSTEM shall not call `fetch` or `axios` directly from page code. All HTTP calls shall flow through `src/lib/http.ts` via the service wrappers in `frontend/src/services/usuarios-service.ts` and `frontend/src/services/roles-service.ts`.

### Requirement: Consult own profile

The system **MUST** expose `GET /api/usuarios/me` and derive the target exclusively from the authenticated token.

#### Scenario: Cualquier rol consulta su perfil
- WHEN an active ADMINISTRADOR, AGENTE, or USUARIO requests `GET /api/usuarios/me` with a valid token
- THEN THE SYSTEM shall return 200 with that user's `UsuarioResponse` (no `passwordHash` field exposed).

#### Scenario: Solicitud no autenticada
- WHEN a missing, malformed, or invalid token is supplied
- THEN THE SYSTEM shall return 401 with no profile data.

#### Scenario: El cliente no elige el usuario
- WHEN user A is authenticated and supplies an unrelated identifier in the request
- THEN THE SYSTEM shall resolve and affect only user A (the `/me` path does not accept an `id` parameter).

### Requirement: Update own profile (name + avatar)

The system **MUST** allow only `nombre` and optional `avatarUrl` through `PUT /api/usuarios/me`; email, role, and active state **MUST NOT** be self-editable.

#### Scenario: Actualización válida
- WHEN an authenticated user submits a valid `nombre` and HTTPS `avatarUrl`
- THEN THE SYSTEM shall return 200 with the updated `UsuarioResponse`.

#### Scenario: Quitar avatar
- WHEN `avatarUrl` is null, blank, or omitted in a valid update
- THEN THE SYSTEM shall clear the stored avatar (set to null) while leaving the name intact.

#### Scenario: Datos inválidos
- WHEN a blank name, a name over 150 characters, or an invalid (non-HTTPS) avatar URL is submitted
- THEN THE SYSTEM shall return 400 with validation details and persist no change.

#### Scenario: Campos protegidos ignorados
- WHEN the request body includes extra fields such as `email`, `rol`, `activo`, or another user's id
- THEN THE SYSTEM shall ignore them (the DTO has only `nombre` and `avatarUrl`; the DAO `actualizarPerfil` writes only those two columns).

### Requirement: Change own password

The system **MUST** expose `PUT /api/usuarios/me/password`, require both `currentPassword` and `newPassword`, verify the current one with `PasswordEncoder.matches`, then store `passwordEncoder.encode(newPassword)`. The new password **MUST** be at least 8 characters.

#### Scenario: Cambio correcto
- WHEN `currentPassword` matches the stored hash and `newPassword` is valid
- THEN THE SYSTEM shall return 204 and persist only a hash of the new password.

#### Scenario: Contraseña actual incorrecta
- WHEN `currentPassword` does not match
- THEN THE SYSTEM shall return 400 with the message "La contraseña actual no coincide" and shall NOT touch the stored hash.

#### Scenario: Nueva contraseña corta
- WHEN `newPassword` has fewer than 8 characters
- THEN THE SYSTEM shall return 400 with validation details and shall NOT touch the stored hash.

#### Scenario: Campos requeridos ausentes
- WHEN either password field is blank or absent
- THEN THE SYSTEM shall return 400 with validation details.

#### Scenario: Nueva credencial efectiva
- WHEN login is attempted with the old and then the new password after a successful change
- THEN THE SYSTEM shall reject the old password and accept the new one.

### Requirement: Soft-delete user (admin only)

The system **MUST** expose admin-only `DELETE /api/usuarios/{id}`, set `activo=false`, and **MUST NOT** physically remove the row.

#### Scenario: Administrador elimina a otro usuario
- WHEN an authenticated ADMINISTRADOR targets another active user's id
- THEN THE SYSTEM shall return 204 and mark the target `activo=false` (no physical delete).

#### Scenario: Registro y referencias preservados
- WHEN a user is soft-deleted
- THEN THE SYSTEM shall keep the row visible to administrators (marked inactive) and shall deny login attempts for that user.

#### Scenario: Rol no administrador
- WHEN an AGENTE or USUARIO targets any user id
- THEN THE SYSTEM shall return 403 with no state change.

#### Scenario: Administrador intenta eliminarse
- WHEN the authenticated ADMINISTRADOR targets their own id
- THEN THE SYSTEM shall return 400 with the message "No puedes eliminar tu propio usuario administrador" and shall NOT change state.

#### Scenario: Usuario inexistente
- WHEN the target id does not exist
- THEN THE SYSTEM shall return 404 with no state change.

### Requirement: Self-service scope is uniform across roles

The self-service API (`/api/usuarios/me` family) **MUST** be available equally to every authenticated role and **MUST NOT** grant cross-user access.

#### Scenario: Paridad entre roles
- WHEN one active user of each supported role (ADMINISTRADOR, AGENTE, USUARIO) reads, edits, or changes their own password
- THEN THE SYSTEM shall respond identically for each role.

#### Scenario: Privilegio admin no altera `/me`
- WHEN an ADMINISTRADOR calls any `/me` endpoint while supplying another user's data
- THEN THE SYSTEM shall read or change only the administrator's own profile.

### Requirement: Private `/perfil` page

The frontend **MUST** register `/perfil` inside `AppLayout` (which applies `PrivateRoute`) and load the profile via `usuariosService.obtenerMiPerfil()`.

#### Scenario: Navegación autenticada
- WHEN an authenticated user navigates to `/perfil`
- THEN THE SYSTEM shall request `GET /api/usuarios/me` and render the returned profile with role-aware tabs.

#### Scenario: Secciones según rol
- WHEN the profile is loaded
- THEN THE SYSTEM shall show the "Información" and "Contraseña" tabs to every role, and additionally the "Zona de riesgo" tab only to ADMINISTRADOR. The danger-zone tab links to `/usuarios`; it does NOT offer a self-delete button.

### Requirement: Profile information form

The profile information form **MUST** render email as readonly and submit only `nombre` and `avatarUrl`.

#### Scenario: Campos visibles
- WHEN profile data loads successfully
- THEN THE SYSTEM shall render `nombre` and `avatarUrl` as editable inputs and `email` and `rol` as readonly fields with a description explaining that email is administratively controlled.

#### Scenario: Sincronización global
- WHEN the backend confirms a profile update with HTTP 200
- THEN THE SYSTEM shall update the in-memory profile, persist the new name/avatar to the auth store, and propagate the change to the header and sidebar without changing the role or token.

#### Scenario: Error de actualización
- WHEN the backend rejects or fails to process the update
- THEN THE SYSTEM shall display the error in an inline alert and preserve the entered values (no reset, no navigation away).

### Requirement: Own-password form

The password form **MUST** collect current, new, and confirmation values and validate them client-side before calling the API.

#### Scenario: Validación cliente
- WHEN the new and confirmation values differ, OR the new value is shorter than 8 characters
- THEN THE SYSTEM shall display inline validation messages and MUST NOT call the backend.

#### Scenario: Envío exitoso
- WHEN all three values are valid and the API returns 204
- THEN THE SYSTEM shall clear all three fields and display a success message.

### Requirement: Admin delete confirmation

The `/usuarios` page **MUST** expose deletion only to administrators and require the operator to type the literal `ELIMINAR` (case-insensitive) in the confirmation dialog before issuing `DELETE /api/usuarios/{id}`.

#### Scenario: Cancelar confirmación
- WHEN an administrator opens the delete dialog for another user and cancels it
- THEN THE SYSTEM shall not issue any DELETE request and the row state shall remain unchanged.

#### Scenario: Confirmar eliminación
- WHEN an administrator types `ELIMINAR` and confirms the named target
- THEN THE SYSTEM shall issue `DELETE /api/usuarios/{id}`, optimistically mark the row inactive on a 204 response, refetch the list, and show success feedback. The Trash2 action MUST be disabled for non-admin users and for the row representing the currently authenticated administrator.

## Out of scope (explicit non-requirements)

The following are **explicitly NOT** required by this combined baseline. Any implementation work for these belongs to a separate change.

- **Avatar binary upload**: backend accepts only an `avatarUrl` string field; no multipart upload endpoint exists.
- **Self email change**: only `nombre` and `avatarUrl` are self-editable; email changes remain administrative operations.
- **Self-deactivation / self-delete**: an authenticated administrator cannot soft-delete their own row.
- **Hard delete**: `DELETE /api/usuarios/{id}` sets `activo=false` only; the row is never physically removed.
- **Password recovery / 2FA / OAuth**: not in scope.
- **Immediate JWT revocation on soft delete**: the existing auth filter validates JWT claims without an active-user lookup; soft-deleted users cannot log in for new sessions but active tokens remain valid until expiry.
- **Roles CRUD UI**: only `GET /api/roles` is consumed (for the dropdown). The 5 endpoints of `RolController` (listar, obtener, crear, actualizar, eliminar) are a separate change.
- **UsuarioExterno / "Solicitante" external users**: backend has no controller for `UsuarioExterno`; external users cannot be listed in v1.

## Acceptance criteria

- All scenarios under the 21 functional requirements and the 6 non-functional requirements pass.
- `./mvnw compile -q` and `./mvnw test -q` pass with zero failures.
- `npm run lint` passes with zero errors (pre-existing master errors in `incidencias/*` are tolerated).
- `npm run build` passes with zero errors (pre-existing master errors in `incidencias/*` are tolerated).
- `UsuarioServiceSelfTest` covers every backend service-level rule for self-profile, own-password change, and admin soft delete (9 focused unit tests, all passing).
- Manual smoke walkthrough against the running backend passes per `Verification` scenarios for the admin user-management page, the `/perfil` page (three roles), and the admin delete confirmation dialog.
