# Change-level overview: `users-admin-page`

**Status**: proposed → spec drafted (pending design phase)
**Capability affected**: `usuarios`
**Project**: sistema-incidencias
**Mode**: hybrid SDD (engram + openspec)
**Phase**: spec

## 1. What this change does

Implements the user-management admin page in the React frontend, consuming all 7 admin endpoints of the backend `UsuarioController` plus `GET /api/roles` for the role dropdown. Closes the loop on the existing disabled "Usuarios" sidebar entry.

## 2. Why

The "Usuarios" entry in `frontend/src/layout/app-sidebar.tsx:19` exists but is a disabled stub (no `to` prop). The backend already implements and exposes all 7 endpoints (verified against `UsuarioController.java`, DTOs, `UsuarioService.java`, `UsuarioSql.java`, and the Postman collection). Without this page, admins have no UI for user management — they must use Postman or the backend console.

## 3. Backend endpoints consumed

All 7 endpoints of `UsuarioController` plus 1 from `RolController`:

| # | Method | Path | Used for |
|---|--------|------|----------|
| 1 | GET    | `/api/usuarios`                          | List with filters and offset/limit |
| 2 | GET    | `/api/usuarios/{id}`                     | Pre-populate edit dialog |
| 3 | POST   | `/api/usuarios`                          | Create user |
| 4 | PUT    | `/api/usuarios/{id}`                     | Edit user (no password) |
| 5 | PATCH  | `/api/usuarios/{id}/password`            | Reset another user's password |
| 6 | PATCH  | `/api/usuarios/{id}/activar`             | Soft-activate |
| 7 | PATCH  | `/api/usuarios/{id}/desactivar`          | Soft-deactivate (self-blocked by backend) |
| 8 | GET    | `/api/roles`                             | Populate rol dropdown |

No backend changes. No Postman changes (already in sync).

## 4. Files to be added or modified

### Modified

- `frontend/src/services/usuarios-service.ts` — 1 → 7 methods, add filter/pagination params.
- `frontend/src/types/usuarios.ts` — add `CrearUsuarioInput`, `ActualizarUsuarioInput`, `CambiarPasswordInput`.
- `frontend/src/router.tsx` — register `/usuarios` private route inside `AppLayout`.
- `frontend/src/layout/app-sidebar.tsx` — add `to: "/usuarios"` to the existing "Usuarios" entry.

### Added

- `frontend/src/services/roles-service.ts` — `rolesService.listar()`.
- `frontend/src/pages/usuarios/index.tsx` — page composition (route-level).
- `frontend/src/pages/usuarios/components/usuarios-table.tsx` — table + rows + actions.
- `frontend/src/pages/usuarios/components/usuarios-filters.tsx` — text + role + activo filters.
- `frontend/src/pages/usuarios/components/usuarios-pagination.tsx` — Prev/Next + counter.
- `frontend/src/pages/usuarios/components/usuario-form-dialog.tsx` — create + edit dialog (shared, mode prop).
- `frontend/src/pages/usuarios/components/usuario-password-dialog.tsx` — dedicated reset-password dialog.
- `frontend/src/pages/usuarios/components/usuario-estado-badge.tsx` — small badge for Estado cell.
- `frontend/src/pages/usuarios/components/usuario-empty-state.tsx` — 403 in-page state + empty result state.

### NOT modified

- Backend Java sources (`UsuarioController`, `UsuarioService`, `UsuarioSql`, DTOs, mappers, exception handlers).
- `sistemaincidencias/postman/SistemaIncidencias.postman_collection.json`.
- `frontend/src/components/auth/private-route.tsx` (no role check; backend enforces).
- `frontend/src/components/ui/*` (no new shadcn primitives).
- No Zustand store.

## 5. Key design decisions (resolved in proposal §4)

1. **Sidebar admin gating**: show "Usuarios" to all logged-in users; render 403 in-page for non-admins.
2. **Self-deactivation**: disable toggle proactively with explanatory tooltip.
3. **Delete action**: omitted (no backend endpoint).
4. **Pagination UX**: Prev/Next + "Mostrando X–Y" counter (backend returns flat list, no total).
5. **Form fields pattern**: modern shadcn `Field` (login-form style).
6. **Rol dropdown**: dedicated `roles-service.ts` (one-service-per-domain convention).
7. **Rol picker**: native `<select>` inside `<Field>` (no shadcn `select` installed).
8. **Backend untouched, Postman untouched**.

## 6. Spec inventory

- **Capability delta**: `openspec/changes/users-admin-page/specs/usuarios/spec.md`
- **Functional requirements**: 12 (REQ-1 through REQ-12)
- **Non-functional requirements**: 6 (REQ-NFR-1 through REQ-NFR-6)
- **Total requirements**: 18
- **Total scenarios**: 44 (38 functional + 6 non-functional)
- **Out-of-scope items declared**: 5

## 7. Open risks to track

| Risk | Mitigation |
|------|-----------|
| Review budget exceeded (~600–900 LOC vs 400 budget) | Tasks phase will offer chained PRs or `size:exception` per delivery strategy `ask-on-risk`. |
| `lucide-react@1.17` icon drift | Build-time fallback: if `KeyRound`/`Lock` missing, use a confirmed-present icon. |
| Pagination honesty without `total` | Copy uses "Mostrando X–Y" with no total claim; Next disabled on short pages. |
| Email-uniqueness / password-length error wiring | `http.ts` already exposes `payload.mensaje`; scenarios require inline display on the relevant field. |
| Self-deactivation bypass | UI guard is UX only; backend 400 is source of truth. |

## 8. Acceptance criteria (top-level)

- All 18 requirements (44 scenarios) pass.
- `npm run lint` clean.
- `npm run build` clean.
- Manual smoke walkthrough against running backend passes for admin and non-admin users.

## 9. Next phase

`sdd-design` — produce the technical design covering page composition, component contracts, service signatures, error-routing strategy, and the work-unit commit plan. The design phase will surface the chained-PR vs `size:exception` decision to the user before any implementation work begins.
