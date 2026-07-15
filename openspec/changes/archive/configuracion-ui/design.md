# Design: Unified configuration catalog management

## 1. Decisions (D1–D5)

- **D1 — Soft delete:** DELETE updates `activo=false`; list SQL excludes inactive rows. This preserves FK references from incidencias.
- **D2 — Demo seed:** Add idempotent `demo@sistema.com` with password `demo123` and ADMINISTRADOR role. `/api/auth/demo` resolves this exact active account, avoiding role-based first-user ambiguity.
- **D3 — Authorization:** Controllers call `PermisoAdministracionService.validarAdministrador(token)` for every catalog write/delete. Existing authenticated GET behavior remains.
- **D4 — UI gate:** Add private `/configuracion`; render the existing 403 pattern for non-admins and keep backend authorization authoritative.
- **D5 — Destructive confirmation:** A page-local modal requires exact `ELIMINAR` before one DELETE request; cancel and incorrect text never call the API.

## 2. Backend

Add `@DeleteMapping("/{id}")` to category, process-state, and approval-state controllers. Convert the existing aplicativo DELETE from physical deletion to deactivation. Add matching service methods, DAO update methods, and SQL constants. Change all four `LISTAR` queries to `WHERE activo = true`.

Expose `POST /api/auth/demo` in `AuthController` without credentials. Reuse JWT response construction, but make `AuthService.loginDemo()` load the exact seeded email and verify it is active. Keep the password hash in the seed for normal login compatibility. Update the demo seed and Postman contract to document the no-body request.

## 3. Frontend

Create `src/pages/configuracion/index.tsx` and page-local catalog components following the existing `CategoriasPage` pattern: tab state, fetch/loading/error/empty states, dialogs, and refresh after mutations. Reuse shadcn `Tabs`, `Dialog`, `Input`, `Table`, `Button`, and `Spinner`; keep feature components under `pages/configuracion/components/`.

Add state types/services for both state catalogs. Existing category/application services already wrap DELETE and will be aligned with soft-delete semantics. Add `authService.loginDemo()` and an auth-store action that stores its response like normal login. Add the “Acceso demo” button to `login-form.tsx`. Register the route and a sidebar link; the page checks `user.rol === "ADMINISTRADOR"`.

## 4. Files affected

| Area | Files |
|---|---|
| Backend | Four catalog controllers/services/DAOs/SQL; `AuthController`, `AuthService`; `db/scripts/002_usuarios_roles_seed.sql`; Postman collection |
| Frontend | `router.tsx`, `app-sidebar.tsx`, `login-form.tsx`, `auth-service.ts`, `auth-store.ts`; new `pages/configuracion/`, state services, and state types |

## 5. Data flow

```mermaid
sequenceDiagram
  participant U as Admin
  participant UI as Config UI
  participant API as REST API
  participant P as Permission service
  participant S as Catalog service
  participant D as Catalog DAO
  participant DB as PostgreSQL
  U->>UI: Open /configuracion or submit action
  UI->>API: GET/POST/PUT/DELETE catalog endpoint
  API->>P: Validate JWT and admin for writes
  P-->>API: Authorized or 403
  API->>S: Execute catalog operation
  S->>D: Read or update active row
  D->>DB: Parameterized SQL
  DB-->>D: Rows / update count
  D-->>S: Domain result
  S-->>API: DTO / 204
  API-->>UI: Response; UI refreshes active list
```

Demo flow is `LoginForm → authStore.loginDemo → POST /api/auth/demo → exact active seed user → JWT → /dashboard`.

## 6. Security

`/api/auth/demo` is the only new public operation and returns a token only for the fixed active demo account. Catalog GETs require authentication; POST/PUT/DELETE require administrator authorization in the controller. UI gating is convenience, not a security boundary. Soft delete preserves FK integrity and prevents destructive catalog removal.

## 7. Out of scope

Restore/reactivate UI, bulk catalog operations, catalog import/export, production demo-account administration, and changes to incident workflows.

## 8. Test strategy

- **Backend:** service/DAO checks for `activo=false`, active-only lists, four 204 responses, 403 non-admin responses, FK preservation, and demo seed login; run Maven tests/build and Postman smoke requests.
- **Frontend:** manually verify admin/non-admin routing, all four tabs, CRUD refresh, inactive filtering, exact confirmation text, and demo redirect; run `npm run lint` and `npm run build`.

## Threat Matrix

All rows are **N/A**: this change adds application HTTP routing only, not documentation execution, Git repository selection, commit/push automation, PR commands, shell commands, subprocesses, or executable-file classification. No threat-matrix RED tests are required.

## Migration / Rollout

No schema migration required. Run the idempotent seed script in environments using manual scripts; existing hard-deleted aplicativo rows cannot be restored by this change.

## Open Questions

None; proposal defaults Q1–Q3 are accepted for implementation.
