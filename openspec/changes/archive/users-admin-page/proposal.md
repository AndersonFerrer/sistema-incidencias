# Proposal: Implement user management admin page (7 admin endpoints)

## 1. Title & metadata

| Field | Value |
| --- | --- |
| **Title** | Implement user management admin page (7 admin endpoints) |
| **Change name** | `users-admin-page` |
| **Status** | proposed |
| **Owner** | orchestrator |
| **Date** | 2026-07-14 |
| **Related exploration** | `openspec/changes/users-admin-page/exploration.md` |
| **Related memories** | `sdd/users-admin-page/explore`, `sdd/users-admin-page/preflight`, `sdd-init/sistema-incidencias`, `architecture/usuarios-backend` |
| **Scope** | Frontend only. No backend changes. |
| **Delivery mode** | automatic (assumptions documented, no clarifying questions asked) |

## 2. Why

The frontend already exposes a "Usuarios" entry in the sidebar (`frontend/src/layout/app-sidebar.tsx:19`), but it is currently a disabled stub — no `to` prop, not clickable. The backend already implements all 7 admin endpoints of `UsuarioController` (verified against `sistemaincidencias/src/main/java/com/integrador/sistemaincidencias/usuarios/controller/UsuarioController.java`, `UsuarioService.java`, DTOs, and `UsuarioSql.java`).

Without this page, admins have no UI to list, create, edit, toggle, or reset passwords for internal users — they must use the backend console or Postman. The page also closes the loop on the existing sidebar affordance.

This is a **frontend-only** change. The Postman collection is already in sync with the backend contracts; no controller/service/SQL/migration work is required.

## 3. What changes

### 3.1 New page: `frontend/src/pages/usuarios/`

Per the `gestincidencias-frontend` skill conventions (page folder with `index.tsx`, `components/`, optional `data.ts` / `types.ts`):

```
frontend/src/pages/usuarios/
  index.tsx                          # route composition: header, filters, table, pagination, dialogs
  components/
    usuarios-table.tsx               # <Table> wrapper, rows, action cell
    usuarios-filters.tsx             # text + rol + activo filters
    usuarios-pagination.tsx          # Prev/Next + "Mostrando X–Y" counter
    usuario-form-dialog.tsx          # create + edit (shared dialog; mode prop)
    usuario-password-dialog.tsx      # dedicated reset-password dialog
    usuario-estado-badge.tsx         # small badge for the "activo" cell
    usuario-empty-state.tsx          # 403 page state + empty result state
```

### 3.2 Service extension: `frontend/src/services/usuarios-service.ts`

Grow from 1 → 7 methods. All methods use `src/lib/http.ts` and read base URL from `VITE_API_URL` (already wired). Auth header is added by `http.ts` interceptor — no per-call token plumbing.

| Method | HTTP | Path | Purpose |
| --- | --- | --- | --- |
| `listar(params)` | GET | `/api/usuarios` | flat list with filters + offset/limit |
| `obtener(id)` | GET | `/api/usuarios/{id}` | single user detail |
| `crear(input)` | POST | `/api/usuarios` | create new user |
| `actualizar(id, input)` | PUT | `/api/usuarios/{id}` | edit user (no password) |
| `cambiarPassword(id, input)` | PATCH | `/api/usuarios/{id}/password` | dedicated password reset |
| `activar(id)` | PATCH | `/api/usuarios/{id}/activar` | soft-activate |
| `desactivar(id)` | PATCH | `/api/usuarios/{id}/desactivar` | soft-deactivate (self blocked by backend) |

### 3.3 New service: `frontend/src/services/roles-service.ts`

Small, dedicated to listing roles for the dropdown. Mirrors the one-service-per-domain convention already established for `categorias`, `aplicativos`. About 10 lines.

```ts
listar() → GET /api/roles
```

(Full roles CRUD is **out of scope** — see §5.)

### 3.4 Types

**Extend `frontend/src/types/usuarios.ts`** to mirror backend DTOs:

- `RolResponse` (already present)
- `UsuarioResponse` (already present; add `rol: RolResponse` if missing)
- `CrearUsuarioRequest` (nombre, email, password, rolCodigo, avatarUrl?, activo?)
- `ActualizarUsuarioRequest` (nombre, email, rolCodigo, avatarUrl?, activo?)
- `CambiarPasswordRequest` (newPassword)

**New `frontend/src/types/pagination.ts`** (frontend-only — backend has no `PageResult` for this endpoint):

```ts
type ListarUsuariosParams = { texto?: string; rol?: string; activo?: boolean; limit: number; offset: number };
type PaginationCursor = { offset: number; limit: number; hasMore: boolean };
```

### 3.5 Router

Register `/usuarios` private route inside `AppLayout` in `frontend/src/router.tsx`. Use existing `PrivateRoute`; no role check at the router level (backend enforces 403 → page renders in-page error state).

### 3.6 Sidebar

Enable the link in `frontend/src/layout/app-sidebar.tsx:19` by adding `to: "/usuarios"` prop. No other sidebar changes.

### 3.7 No backend changes

Backend Java sources untouched. Postman collection untouched (already covers all 7 endpoints).

## 4. Open questions — resolved as assumptions

The exploration surfaced 6 decisions. In automatic mode, each is resolved below with the chosen answer and the reason.

| # | Decision | Resolution | Reason |
| --- | --- | --- | --- |
| a | Sidebar admin gating | **Show "Usuarios" to all logged-in users**; render 403 in-page if non-admin accesses | Simpler, no flicker on role change, consistent with backend 403 behavior. Sidesteps the "where do admin flags come from in the sidebar" state-sync question. |
| b | Self-deactivation guard | **Disable toggle proactively + tooltip** "No puedes desactivar tu propio usuario administrador" | Mirrors backend rule (400 from service), prevents confusing server error, gives explicit guidance. |
| c | Delete action in v1 | **Omit the trash icon entirely** | Backend has no DELETE endpoint. Adding UI without a contract would be misleading. Future change adds delete end-to-end. |
| d | Pagination UX | **Prev/Next + counter** showing "Mostrando X–Y" | Backend returns flat list with no `total`. Honest copy. Matches `incidencias-table` style in the same app. "Load more" would force us to lie about progress. |
| e | Form fields pattern | **Modern shadcn `Field`** (login-form style) | Already installed, better accessibility (proper label/error association), denser dialog layout, current shadcn direction. |
| f | Rol dropdown source | **Dedicated service `roles-service.ts`** | One-service-per-domain is the established convention (categorias, aplicativos). Avoids inline fetch in the page. |

## 5. Out of scope

- **UsuarioExterno / "Solicitante" external users** — DAO exists in backend (`catalogos`), no controller, no UI integration possible.
- **Delete user** — no backend endpoint.
- **Avatar upload UI** — backend accepts only `avatarUrl` string, no multipart endpoint.
- **Change own password** — this page only manages other users. Self-password change is a separate "My profile" feature.
- **Roles CRUD UI** — only listing for the dropdown. The 5 `RolController` endpoints are a separate change.
- **Filter chips / saved views** — keep v1 with 3 simple inputs (texto, rol, activo).
- **Bulk actions** — no backend support.
- **Audit log viewer** — out of scope.

## 6. Dependencies

- **Backend running locally** for manual smoke (PostgreSQL + Spring Boot on `:8080`). No build artifacts from this change.
- **shadcn primitives already installed**: `alert`, `avatar`, `badge`, `button`, `card`, `dialog`, `field`, `input`, `label`, `separator`, `spinner`, `table`. **NO new shadcn install needed.**
  - Note: `dropdown-menu` / `select` / `popover` / `sheet` are NOT installed. The Rol dropdown will use a native `<select>` inside the `Field` block (lighter, accessible, no new install).
- **lucide-react@1.17.0** — only use icons verified to exist. Confirmed-available set: `Pencil`, `Power`, `PowerOff`, `Trash2` (not used), `Plus`, `Search`, `ChevronLeft`, `ChevronRight`, `AlertTriangle`, `KeyRound` (verify at build), `Mail`, `UserCheck`, `UserX` (verify at build). Any unverified icon must be confirmed before import.
- **Auth**: `src/lib/http.ts` already attaches `Authorization: Bearer <token>`. No auth wiring needed in this change.
- **Error display**: `http.ts` already reads `payload.mensaje ?? payload.message`. Inline form errors work out of the box for email-uniqueness, password-length, and self-deactivation errors.

## 7. Risk & review workload forecast

| Metric | Value |
| --- | --- |
| **Estimated changed lines** | **600–900** (1 page composition + 4–5 page components + 7-method service + 4 types + roles-service + router + sidebar) |
| **Exceeds 400-line review budget** | **YES** |
| **Delivery strategy** | `ask-on-risk` |
| **Escalation trigger** | At the start of the **tasks** phase, the orchestrator will pause and ask the user: split into chained PRs (e.g., services + types → page → modals) OR proceed with a `size:exception` single PR. |

### Functional risks

1. **Backend availability during dev** — manual smoke depends on running backend; mitigate by writing service methods that can be exercised against a typed mock once for offline validation.
2. **lucide-react icon drift** — verify each new icon import before build; default to confirmed-present icons if `KeyRound` / `UserX` are missing.
3. **Pagination UX without `total`** — counter copy ("Mostrando X–Y") must be honest; "has more" is inferred (`items.length === limit`) and may over/under-report on edge cases.
4. **Email uniqueness error UX** — must surface clearly in the form (handled by existing `http.ts` + `Field` error slot, but must be wired).
5. **Self-deactivation bypass** — UI guard is UX; backend 400 is the source of truth. If the UI guard fails, the backend still blocks.
6. **Role filter dropdown** — `roles-service` call is independent from `usuarios-service`; load order matters to avoid flicker.

### Non-risks (validated)

- No backend changes required.
- No breaking changes to other pages.
- No auth model changes (existing JWT flow covers it).
- No new shadcn primitive needed.
- No state-management changes (no Zustand store required — page-local hooks suffice).

## 8. Acceptance criteria (high-level, refined in spec phase)

- Admin can **list internal users** with filters (`texto`, `rol`, `activo`) and Prev/Next pagination over a flat-list backend.
- Admin can **create** a user with `nombre`, `email`, `password`, `rol`, optional `avatarUrl`, optional `activo`.
- Admin can **edit** a user (`nombre`, `email`, `rol`, `activo`, `avatarUrl`) but **NOT password** from the edit dialog.
- Admin can **reset another user's password** via a dedicated dialog (`cambiarPassword` endpoint).
- Admin can **toggle active/inactive** for any user except self — self toggle is disabled with tooltip.
- **Non-admin users** see the sidebar link and a friendly in-page 403 message when they navigate to `/usuarios` (no redirect, no flicker).
- **All forms surface backend validation errors inline** (email uniqueness, password length, role code not found, etc.).
- **Lint passes** (`npm run lint`).
- **Build passes** (`npm run build`).
- **Manual smoke** at `http://127.0.0.1:5173/usuarios` shows: list loads, filter narrows results, create/edit/reset/toggle each mutate correctly, pagination cursor advances, 403 state renders for non-admin.

## 9. Follow-ups (separate changes)

| # | Title | Reason |
| --- | --- | --- |
| 1 | Roles CRUD UI page | Consumes the 5 `RolController` endpoints (listar, obtener, crear, actualizar, eliminar). Needed once admin wants to manage the role catalog itself. |
| 2 | Delete user (backend + frontend) | Requires new backend endpoint + soft-delete semantics, plus UI action. Backend must decide hard-delete vs soft-delete vs archival. |
| 3 | UsuarioExterno controller + frontend integration | `UsuarioExterno` DAO exists but has no controller; required to surface "Solicitante" external users in any unified list. |
| 4 | Avatar upload | Requires backend multipart endpoint + storage decision (S3? local? DB BLOB?). Today's `avatarUrl` is a URL string only. |
| 5 | My-profile / change-own-password | Self-service password change and profile view. Separate UX, separate auth flow. |
| 6 | AplicativoCliente column | Current SQL JOIN is only `roles`; the Cliente column from the UI mock always renders "—" for v1. Future: extend SQL + DTO + UI to surface the assigned aplicativo. |

---

## Decision log (assumptions made in automatic mode)

These will be revisited at the spec phase. If any is wrong, the spec phase will surface it before any code is written.

1. ✅ Show "Usuarios" sidebar entry to all logged-in users; render 403 in-page.
2. ✅ Disable self-deactivation proactively with explanatory tooltip.
3. ✅ Omit delete action from v1; flag as follow-up.
4. ✅ Prev/Next pagination + "Mostrando X–Y" counter (no total available).
5. ✅ Modern shadcn `Field` pattern for create/edit/password forms.
6. ✅ Dedicated `roles-service.ts` for the Rol dropdown.
7. ✅ Native `<select>` inside `Field` for Rol dropdown (no shadcn `select` install).
8. ✅ Backend stays untouched; Postman stays untouched.
9. ✅ Single Zustand-less page — local hooks and per-component state only.
10. ✅ Pagination cursor is frontend-only (`offset`, `limit`, `hasMore`); backend `PageResult<T>` exists but is not used by `UsuarioController`.