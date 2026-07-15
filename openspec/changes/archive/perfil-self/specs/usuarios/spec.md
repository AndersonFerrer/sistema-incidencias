# Delta for `usuarios`: perfil propio y eliminación lógica

**Change**: `perfil-self`
**Scope note**: `GET /api/auth/me` already exists and remains unchanged; this delta adds the richer `/api/usuarios/me` contract.

## ADDED Requirements

### Requirement: Consultar el perfil propio

The system **MUST** expose `GET /api/usuarios/me` and derive the target exclusively from the authenticated token.

#### Scenario: Cualquier rol consulta su perfil
- GIVEN an active ADMINISTRADOR, AGENTE, or USUARIO with a valid token
- WHEN `GET /api/usuarios/me` is requested
- THEN the system returns 200 with that user's `UsuarioResponse` and never a password hash

#### Scenario: Solicitud no autenticada
- GIVEN a missing, malformed, or invalid token
- WHEN `GET /api/usuarios/me` is requested
- THEN the system returns 401 without profile data

#### Scenario: El cliente no elige el usuario
- GIVEN user A is authenticated and supplies an unrelated identifier
- WHEN a `/api/usuarios/me` operation is requested
- THEN the system resolves and affects only user A

### Requirement: Actualizar el perfil propio

The system **MUST** allow only `nombre` and optional `avatarUrl` through `PUT /api/usuarios/me`; email, role, and active state **MUST NOT** be self-editable.

#### Scenario: Actualización válida
- GIVEN an authenticated user and valid `nombre` and HTTPS `avatarUrl`
- WHEN `PUT /api/usuarios/me` is submitted
- THEN the system returns 200 with the updated profile

#### Scenario: Quitar avatar
- GIVEN an authenticated user with an avatar
- WHEN `avatarUrl` is null, blank, or omitted in a valid update
- THEN the stored avatar becomes null while the name remains valid

#### Scenario: Datos inválidos
- GIVEN a blank name, name over 150 characters, or invalid avatar URL
- WHEN the profile update is submitted
- THEN the system returns 400 and persists no profile change

#### Scenario: Campos protegidos ignorados
- GIVEN a body also contains email, role, active state, or another user id
- WHEN `PUT /api/usuarios/me` is submitted
- THEN those protected values remain unchanged

### Requirement: Cambiar la contraseña propia

The system **MUST** expose `PUT /api/usuarios/me/password`, require `currentPassword` and `newPassword`, and enforce at least 8 characters for the new password.

#### Scenario: Cambio correcto
- GIVEN `currentPassword` matches the authenticated user's hash and `newPassword` is valid
- WHEN the password request is submitted
- THEN the system returns 204 and stores only a hash of the new password

#### Scenario: Contraseña actual incorrecta
- GIVEN `currentPassword` does not match
- WHEN the password request is submitted
- THEN the system returns 400 and leaves the existing hash unchanged

#### Scenario: Nueva contraseña corta
- GIVEN `newPassword` has fewer than 8 characters
- WHEN the password request is submitted
- THEN the system returns 400 and leaves the existing hash unchanged

#### Scenario: Campos requeridos ausentes
- GIVEN either password field is blank or absent
- WHEN the password request is submitted
- THEN the system returns 400 validation details

#### Scenario: Nueva credencial efectiva
- GIVEN a successful password change
- WHEN login is attempted with the old and then the new password
- THEN the old password fails and the new password succeeds

### Requirement: Eliminar usuarios mediante soft delete

The system **MUST** expose admin-only `DELETE /api/usuarios/{id}`, set `activo=false`, and **MUST NOT** physically remove the row.

#### Scenario: Administrador elimina a otro usuario
- GIVEN an ADMINISTRADOR targets another active user
- WHEN `DELETE /api/usuarios/{id}` is requested
- THEN the system returns 204 and marks the target inactive

#### Scenario: Registro y referencias preservados
- GIVEN a user was soft-deleted
- WHEN an administrator obtains that user and the user attempts login
- THEN the record remains visible as inactive and login is denied

#### Scenario: Rol no administrador
- GIVEN an AGENTE or USUARIO targets any user
- WHEN `DELETE /api/usuarios/{id}` is requested
- THEN the system returns 403 and changes nothing

#### Scenario: Administrador intenta eliminarse
- GIVEN the authenticated administrator targets their own id
- WHEN `DELETE /api/usuarios/{id}` is requested
- THEN the system returns 400 and remains active

#### Scenario: Usuario inexistente
- GIVEN the target id does not exist
- WHEN an administrator requests deletion
- THEN the system returns 404 and changes nothing

### Requirement: Alcance self-service por rol

The self-service API **MUST** be available equally to every authenticated role and **MUST NOT** grant cross-user access.

#### Scenario: Paridad entre roles
- GIVEN one active user of each supported role
- WHEN each reads, edits, or changes their own password
- THEN each receives the same self-service behavior

#### Scenario: Privilegio admin no altera `/me`
- GIVEN an administrator is authenticated
- WHEN the administrator calls a `/me` endpoint with another user's data
- THEN only the administrator's own profile can be read or changed

### Requirement: Página privada de perfil

The frontend **MUST** register `/perfil` inside `AppLayout` and load profile data through `usuariosService`.

#### Scenario: Navegación autenticada
- GIVEN an authenticated user navigates to `/perfil`
- WHEN the page mounts
- THEN it requests `/api/usuarios/me` and renders the returned profile

#### Scenario: Secciones según rol
- GIVEN the profile is loaded
- WHEN its tabs are rendered
- THEN every role sees Información and Contraseña, while only ADMINISTRADOR sees Zona de riesgo linking to user management

### Requirement: Formulario de información personal

The profile information form **MUST** render email readonly and submit only name and avatar URL.

#### Scenario: Campos visibles
- GIVEN profile data loaded successfully
- WHEN the information tab renders
- THEN name and avatar are editable while email and role are readonly

#### Scenario: Sincronización global
- GIVEN a successful profile update
- WHEN the 200 response is received
- THEN the page, persisted auth store, header, and sidebar show the updated name/avatar

#### Scenario: Error de actualización
- GIVEN the backend rejects or cannot process the update
- WHEN the form receives the error
- THEN it shows an inline/error alert and preserves the entered values

### Requirement: Formulario de contraseña propia

The password form **MUST** collect current, new, and confirmation values and validate them before calling the API.

#### Scenario: Validación cliente
- GIVEN new and confirmation differ, or the new value is shorter than 8 characters
- WHEN the user submits
- THEN inline validation appears and no request is sent

#### Scenario: Envío exitoso
- GIVEN all three values are valid and the API returns 204
- WHEN submission completes
- THEN the fields are cleared and a success message is shown

### Requirement: Confirmación administrativa de eliminación

The `/usuarios` page **MUST** expose deletion only to administrators and require explicit confirmation.

#### Scenario: Cancelar confirmación
- GIVEN an administrator opens deletion for another user
- WHEN the confirmation dialog is cancelled
- THEN no DELETE request is sent and the row is unchanged

#### Scenario: Confirmar eliminación
- GIVEN an administrator confirms the named target
- WHEN DELETE returns 204
- THEN the list is refreshed or marks that row inactive and shows success feedback

## Out of scope

Self email changes, avatar upload, hard delete, self-deactivation, 2FA, OAuth, token revocation, and password recovery are not required by this delta.
