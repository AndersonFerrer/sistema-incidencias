# Design: Perfil propio y eliminación lógica de usuarios

**Capability**: `usuarios` (MODIFIED)
**Change**: `perfil-self` · **Date**: 2026-07-15 · **Status**: designed

## 1. Decisions (D1–D5)

| ID | Decision | Rationale / rejected alternative |
|---|---|---|
| D1 | `/api/usuarios/me` resolves the user from `Authorization` through `validarAutenticado`; it accepts no target id. | Prevents IDOR. Reusing `/{id}` with client-provided ids would mix self-service and admin authorization. |
| D2 | Own-password change requires `currentPassword`, verifies with `PasswordEncoder.matches`, then stores `encode(newPassword)`. | A token alone must not authorize credential replacement. Admin reset remains the separate existing PATCH flow. |
| D3 | `DELETE /api/usuarios/{id}` is ADMIN-only soft delete (`activo=false`), returns 204, and rejects deleting the current admin. | Preserves foreign-key references and matches the existing `desactivar` rule; hard delete is unsafe. |
| D4 | Self-editable fields are only `nombre` and `avatarUrl`; email, role and active state are immutable through `/me`. | Email/role changes affect identity and authorization and remain administrative operations. |
| D5 | `/perfil` owns personal actions; destructive target-user deletion stays in `/usuarios`. The admin-only “Zona de riesgo” tab links there rather than offering self-delete. | Keeps the self-only route coherent and reuses the existing admin table/confirmation pattern. |

## 2. Backend architecture

`UsuarioController` adds three self-service routes plus the RF-33 admin route:

| Method | Route | Body | Result |
|---|---|---|---|
| GET | `/api/usuarios/me` | — | 200 `UsuarioResponse` |
| PUT | `/api/usuarios/me` | `ActualizarPerfilRequest { nombre, avatarUrl? }` | 200 `UsuarioResponse` |
| PUT | `/api/usuarios/me/password` | `CambiarPasswordPropiaRequest { currentPassword, newPassword }` | 204 |
| DELETE | `/api/usuarios/{id}` | — | 204 |

`GET /api/auth/me` remains unchanged. `ActualizarPerfilRequest` uses `@NotBlank`, name max 150, avatar max 500 and the existing HTTPS URL pattern. `CambiarPasswordPropiaRequest` requires both fields and `@Size(min=8,max=100)` for `newPassword`.

`UsuarioService` adds `obtenerPerfil`, `actualizarPerfil`, `cambiarPasswordPropia`, and `eliminar`. Self methods call `validarAutenticado`; delete calls `validarAdministrador`, checks `admin.id != targetId`, verifies existence, then reuses `usuarioDao.cambiarActivo(id,false)`. Password persistence reuses `cambiarPassword`.

Exactly one DAO method is new: `actualizarPerfil(UUID id, String nombre, String avatarUrl)`. `UsuarioSql.ACTUALIZAR_PERFIL` updates only those columns plus `actualizado_en`; all values use `PreparedStatement` bindings.

## 3. Frontend architecture

- `frontend/src/pages/perfil/index.tsx`: route composition, fetch state, active tab and auth-store synchronization.
- Page-local components: `perfil-info-form.tsx`, `cambiar-password-form.tsx`, `perfil-danger-zone.tsx`. Tabs use accessible local buttons (`role=tablist`), avoiding a new dependency.
- `usuariosService` adds `obtenerPerfil`, `actualizarPerfil`, `cambiarPasswordPropia`, and `eliminar`; shared input types live in `src/types/usuarios.ts`.
- `auth-store.ts` adds `syncProfile(usuario)` to map `nombre/email/avatarUrl` while preserving the session role code. Header/sidebar account blocks link to `/perfil`; `app-header.tsx` adds its route title.
- The existing `/usuarios` page adds `UsuarioDeleteDialog`, a `delete` dialog mode, and a `Trash2` table action disabled for the current administrator. Confirmation names the target and refetches after 204.

## 4. Files affected

| Action | Paths |
|---|---|
| Add | `usuarios/dto/ActualizarPerfilRequest.java`, `usuarios/dto/CambiarPasswordPropiaRequest.java` |
| Modify | `usuarios/{controller/UsuarioController,service/UsuarioService,dao/UsuarioDao,sql/UsuarioSql}.java` |
| Modify | `sistemaincidencias/postman/SistemaIncidencias.postman_collection.json` |
| Add | `frontend/src/pages/perfil/index.tsx`, `frontend/src/pages/perfil/components/{perfil-info-form,cambiar-password-form,perfil-danger-zone}.tsx` |
| Add | `frontend/src/pages/usuarios/components/usuario-delete-dialog.tsx` |
| Modify | `frontend/src/{router.tsx,services/usuarios-service.ts,types/usuarios.ts,store/auth-store.ts}` |
| Modify | `frontend/src/layout/{app-header,app-sidebar}.tsx`, `frontend/src/pages/usuarios/{index.tsx,types.ts,components/usuarios-table.tsx}` |

No schema migration, Maven package, or npm package is added.

## 5. Data flow

```mermaid
sequenceDiagram
    actor U as User
    participant P as React page
    participant H as apiRequest
    participant C as UsuarioController
    participant S as UsuarioService
    participant D as UsuarioDao
    participant DB as PostgreSQL
    U->>P: Open /perfil
    P->>H: GET /api/usuarios/me + Bearer
    H->>C: authenticated request
    C->>S: obtenerPerfil(header)
    S->>S: validarAutenticado → current Usuario
    S-->>P: 200 UsuarioResponse
    U->>P: Save name/avatar
    P->>C: PUT /api/usuarios/me
    C->>S: actualizarPerfil(header, request)
    S->>D: actualizarPerfil(current.id, nombre, avatar)
    D->>DB: parameterized UPDATE
    DB-->>P: 200; syncProfile()
    U->>C: PUT /me/password or ADMIN DELETE /{id}
    C->>S: verify current password or admin+non-self
    S->>D: cambiarPassword(hash) or cambiarActivo(false)
    D-->>U: 204
```

## 6. Security

- New self routes always re-read the active user through `AuthService`; client ids and protected fields cannot widen scope.
- Wrong current password yields 400 without writing; hashes never enter responses or logs. BCrypt is the existing `PasswordEncoder` bean.
- DELETE returns 403 for non-admin, 400 for admin self-target, and 404 for unknown id. Soft-deleted users cannot log in; immediate global JWT revocation is not claimed because the current filter validates claims without an active-user lookup.
- Static `/me` mappings must be tested so they are not consumed by `/{id}` UUID routing.

**Threat matrix**: documentation-like paths, Git selection, commit state, push state, and PR commands are all **N/A**—this change adds HTTP/UI routes only and executes no files, shell, VCS, subprocess, or PR automation.

## 7. Out of scope

Self email changes, avatar binary upload, hard delete, self-deactivation, password recovery, 2FA, OAuth, refresh-token rotation, immediate JWT revocation, and changes to the existing admin password-reset endpoint.

## 8. Test strategy

| Layer | Coverage | Command / approach |
|---|---|---|
| Backend unit | Self resolution, protected fields, `matches` before `encode`, min-8 validation, admin/non-admin/non-self delete | JUnit 5 + Mockito already available; `cd sistemaincidencias && ./mvnw test` |
| Controller contract | 200/204/400/401/403/404 and `/me` vs `/{id}` route precedence | MockMvc where practical; Postman examples for all four routes |
| Frontend static | Types, route registration, service contracts, store mapping | `cd frontend && npm run lint && npm run build` |
| Manual smoke | Three roles read/edit own profile; wrong/current password paths; admin confirm/cancel delete; non-admin has no delete action | Browser at `http://127.0.0.1:5173/` + Postman |
