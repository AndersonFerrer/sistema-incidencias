# Proposal: Perfil propio y eliminación lógica de usuarios

## 1. Title & metadata

| Field | Value |
|---|---|
| **Change** | `perfil-self` (E de 6; RF-33 + RF-36) |
| **Status** | proposed |
| **Date** | 2026-07-15 |
| **Scope** | Backend + frontend |
| **Artifact store** | hybrid (OpenSpec + Engram) |
| **Delivery strategy** | ask-on-risk; budget 400 líneas |

## 2. Why

El backend ya administra usuarios y expone `GET /api/auth/me`, pero no permite que una persona consulte/edite su perfil ni cambie su propia contraseña verificando la actual. Tampoco existe el `DELETE` exigido por RF-33. Esto obliga a depender de un administrador incluso para cambios personales y deja incompleto el flujo administrativo con confirmación.

## 3. What changes

### Backend
- Tres endpoints self-service autenticados: `GET /api/usuarios/me`, `PUT /api/usuarios/me` y `PUT /api/usuarios/me/password`.
- Un endpoint administrativo adicional: `DELETE /api/usuarios/{id}`, implementado como `activo=false` y respuesta `204`.
- DTOs separados para perfil y contraseña propia; `PasswordEncoder.matches/encode` verifica y reemplaza el hash.
- Un método DAO nuevo, `actualizarPerfil(id, nombre, avatarUrl)`; password y eliminación reutilizan `cambiarPassword` y `cambiarActivo`.
- Actualización obligatoria de Postman. Sin dependencias nuevas.

### Frontend
- Ruta privada `/perfil` con tabs locales: información, contraseña y zona de riesgo visible a ADMINISTRADOR.
- Componentes page-local para formulario de perfil y contraseña; email readonly.
- `usuarios-service.ts`, tipos y auth store se sincronizan tras editar el perfil.
- `/usuarios` añade acción `Trash2` + diálogo de confirmación para eliminar a otro usuario.

### Capability contract
- **Modified capability**: `usuarios` — añade perfil propio, cambio de contraseña propia y eliminación lógica administrativa.
- **New capabilities**: None.

## 4. Files affected

- Backend: `usuarios/controller/UsuarioController.java`, `service/UsuarioService.java`, `dao/UsuarioDao.java`, `sql/UsuarioSql.java`, nuevos DTOs y Postman.
- Frontend: `src/pages/perfil/**` (nuevo), `router.tsx`, `layout/{app-header,app-sidebar}.tsx`, `services/usuarios-service.ts`, `types/usuarios.ts`, `store/auth-store.ts`, `pages/usuarios/**`.

## 5. Open questions

- **Q1 — DELETE**: soft o hard. **Default: soft**, consistente con `desactivar` y preserva referencias.
- **Q2 — autorización**: solo ADMIN o auto-desactivación. **Default: solo ADMIN y nunca sobre sí mismo**.
- **Q3 — campos self-editables**: **Default: nombre + avatar URL; email readonly** y solo modificable por admin.

## 6. Out of scope

Cambio de email propio, carga binaria de avatar, 2FA, OAuth, revocación inmediata de JWT y eliminación física.

## 7. Dependencies

Depende de change A archivado (`incidencias-rbac-agente`) para `validarAutenticado`/`validarAdministrador`. Reutiliza BCrypt ya configurado y los patrones de `users-admin-page`.

## 8. Effort, risk and success

- **Estimate**: medium, ~250–350 LOC de producción; incluyendo pruebas, Postman y wiring, el diff revisable puede acercarse a ~350–500. Por ello se recomiendan dos unidades backend → frontend.
- **Risks**: colisión `/me` vs `/{id}` y sesiones JWT previas al soft delete. Mitigar con mappings estáticos explícitos, resolución server-side del usuario y smoke de usuario inactivo.
- **Rollback**: revertir rutas/DTOs/DAO y UI; no hay migración ni pérdida de datos porque DELETE solo cambia `activo`.
- **Success**: los tres roles gestionan su perfil; contraseña incorrecta no modifica el hash; solo ADMIN elimina a otro usuario; email/rol/activo no cambian por self-service; Maven, lint y build pasan.
