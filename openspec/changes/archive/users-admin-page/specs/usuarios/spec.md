# Delta Spec: `usuarios` capability — admin user-management page

**Change**: `users-admin-page`
**Capability**: `usuarios`
**Scope**: Frontend only (React + Vite + TS). Backend `UsuarioController` and `RolController` are already implemented and stay untouched. Postman collection stays untouched.

This delta adds the **admin user-management page** to the existing `usuarios` capability. The capability previously had only a single read method (`GET /api/usuarios`); this delta expands the surface to a full CRUD-ish admin UX (list, create, edit, reset password, toggle active) plus the supporting service, types, router entry, and sidebar wiring.

## Purpose

The system shall provide authenticated administrators with a UI to manage internal users — list with filters and pagination, create, edit, reset another user's password, and toggle active state — through the existing backend REST API. The page shall consume all 7 admin endpoints of `UsuarioController` plus `GET /api/roles` for the role dropdown.

## Requirements

### Requirement: List internal users with filters and pagination

The page shall call `GET /api/usuarios` with query parameters for text search, role filter, active filter, and offset/limit pagination. The backend returns a flat `List<UsuarioResponse>` (no `total` count, no envelope); the UI shall render Prev/Next pagination plus a "Mostrando X–Y" counter, disable Next when the response carries fewer items than `limit`, and clamp `offset` to 0 on Previous.

#### Scenario: Initial list load
- WHEN an authenticated user navigates to `/usuarios`
- THEN THE SYSTEM shall issue `GET /api/usuarios?limit=20&offset=0` with the current auth token (attached by `src/lib/http.ts`) and render the returned users in a `<Table>`.

#### Scenario: Debounced text search
- WHEN the user types in the search field
- THEN THE SYSTEM shall debounce the input by 300ms and issue `GET /api/usuarios?texto=<value>&limit=20&offset=0`, resetting `offset` to 0.

#### Scenario: Role filter
- WHEN the user selects a role in the role filter dropdown
- THEN THE SYSTEM shall append `&rol=<rolCodigo>` to the next list request and reset `offset` to 0.

#### Scenario: Inactive-only toggle
- WHEN the user toggles a "Solo inactivos" switch on
- THEN THE SYSTEM shall append `&activo=false` to the next list request and reset `offset` to 0.
- WHEN the user toggles it off, THE SYSTEM shall omit the `activo` parameter (return all users).

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
- WHEN the list response is an empty array
- THEN THE SYSTEM shall render the empty-state message "No hay usuarios registrados".

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

A dedicated dialog (separate from edit) shall allow admins to set a new password for any user other than themselves, calling `PATCH /api/usuarios/{id}/password`.

#### Scenario: Open password dialog
- WHEN the user clicks the key icon on a row
- THEN THE SYSTEM shall open a small dialog containing a single password field with a confirmation field, built with modern shadcn `Field`.

#### Scenario: Successful password change
- WHEN the user submits a valid password (both fields match, meets length)
- THEN THE SYSTEM shall issue `PATCH /api/usuarios/{id}/password` with `{ password }`
- AND on HTTP 204 shall close the dialog and show a success toast.

#### Scenario: Client-side validation
- WHEN the user submits an empty password or a password shorter than 6 characters
- THEN THE SYSTEM shall show the validation message inline and MUST NOT call the backend.

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

## Out of scope (explicit non-requirements)

The following are **explicitly NOT** required by this delta. Any implementation work for these belongs to a separate change.

- **Delete user**: backend exposes no `DELETE /api/usuarios/{id}` endpoint; no delete action is rendered in v1.
- **Avatar upload**: backend accepts only an `avatarUrl` string field; no multipart upload endpoint exists.
- **Self password change**: this page manages other users only. The "My profile" / change-own-password feature is a separate change.
- **Roles CRUD UI**: only `GET /api/roles` is consumed (for the dropdown). The 5 endpoints of `RolController` (listar, obtener, crear, actualizar, eliminar) are a separate change.
- **UsuarioExterno / "Solicitante" external users**: backend has no controller for `UsuarioExterno`; external users cannot be listed in v1.

## Acceptance criteria

- All scenarios under the 12 functional requirements and the 6 non-functional requirements pass.
- `npm run lint` passes with zero errors.
- `npm run build` passes with zero errors.
- Manual smoke walkthrough against the running backend passes per `Verification` scenarios.
