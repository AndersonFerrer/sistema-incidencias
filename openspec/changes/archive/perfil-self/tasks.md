# Tasks: Perfil propio y eliminación lógica (change E)

**Capability**: `usuarios` · **Change**: `perfil-self` · **Status**: ready-to-apply
**Strategy**: stacked-to-main in 2 PRs. PR1 backend contract; PR2 frontend after PR1 merges.

## Review Workload Forecast

| Field | Value |
|---|---|
| Estimated changed lines | ~350–500 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR1 backend → PR2 frontend |
| Delivery strategy | ask-on-risk, resolved by the requested two-PR option |
| Chain strategy | stacked-to-main |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Focused test command | Runtime harness | Rollback boundary |
|---|---|---|---|---|
| PR1 | Self-profile/password + admin soft delete | `cd sistemaincidencias && ./mvnw test` | Postman: four new routes as ADMIN/AGENTE/USUARIO | Usuario Java changes + Postman entries |
| PR2 | `/perfil` + confirmed delete UI | `cd frontend && npm run lint && npm run build` | Browser `/perfil` for 3 roles and `/usuarios` admin delete | Frontend-only paths |

## PR1 — Backend (T1–T4)

### T1. Add self-service request contracts
- **Where**: `usuarios/dto/{ActualizarPerfilRequest,CambiarPasswordPropiaRequest}.java`; **Action**: add name/avatar and current/new-password validation (new password min 8); **Done when**: invalid bodies map to 400 and Maven compiles.

### T2. Add profile-only persistence
- **Where**: `usuarios/sql/UsuarioSql.java`, `usuarios/dao/UsuarioDao.java`; **Action**: add parameterized `ACTUALIZAR_PERFIL` and `actualizarPerfil(id,nombre,avatarUrl)` only; **Done when**: email/role/active columns cannot be changed by this method.

### T3. Implement service rules
- **Where**: `usuarios/service/UsuarioService.java`; **Action**: implement own read/update, `matches`→`encode` password change, and ADMIN non-self soft delete reusing existing DAO methods; **Done when**: role, wrong-password, not-found, and self-delete outcomes match the 28 spec scenarios.

### T4. Expose and prove backend contracts
- **Where**: `usuarios/controller/UsuarioController.java`, `src/test/**/UsuarioServiceTest.java`, Postman collection; **Action**: add three `/me` routes plus DELETE, focused tests, and examples; **Done when**: `/me` wins over `/{id}`, status codes are correct, and `./mvnw test` passes.

## PR2 — Frontend (T5–T8)

### T5. Extend client contracts and session sync
- **Where**: `frontend/src/{types/usuarios.ts,services/usuarios-service.ts,store/auth-store.ts}`; **Action**: add four wrappers/input types and `syncProfile`; **Done when**: calls use `apiRequest` and store role/token remain unchanged.

### T6. Build the profile page
- **Where**: `frontend/src/pages/perfil/index.tsx` and `components/{perfil-info-form,cambiar-password-form,perfil-danger-zone}.tsx`; **Action**: implement loading/error state and accessible role-aware tabs; **Done when**: email is readonly, client password validation blocks bad requests, and success updates global identity.

### T7. Add confirmed admin deletion UI
- **Where**: `frontend/src/pages/usuarios/{index.tsx,types.ts,components/usuarios-table.tsx,components/usuario-delete-dialog.tsx}`; **Action**: add `Trash2`, non-self guard, named confirmation, cancel and refetch flow; **Done when**: only ADMIN can confirm and 204 renders the target inactive.

### T8. Wire navigation and verify
- **Where**: `frontend/src/router.tsx`, `layout/{app-header,app-sidebar}.tsx`; **Action**: register/link `/perfil`, add title, then run static and three-role browser smoke; **Done when**: `npm run lint`, `npm run build`, and all manual profile/delete paths pass.
