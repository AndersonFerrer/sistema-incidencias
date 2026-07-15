# Proposal: RBAC + catálogos públicos + scope AGENTE en incidencias

## 1. Title & metadata

| Field | Value |
| --- | --- |
| **Title** | RBAC + catálogos públicos + scope AGENTE en incidencias |
| **Change name** | `incidencias-rbac-agente` |
| **Status** | proposed |
| **Owner** | orchestrator |
| **Date** | 2026-07-14 |
| **Related exploration** | audit gap matrix captured in engram topic `audit/requirements-coverage` |
| **Related memories** | `bugfix/Promise-all catalog rejection on AGENTE login` (the Promise.allSettled fix already shipped in `incidencias/index.tsx` is partially absorbed by this change) |
| **Scope** | **Backend primary**, frontend only minimally (revert the temporary `currentUserIsAdmin` gate on `loadCatalogos`). |
| **Delivery mode** | ask-on-risk |
| **Pace** | auto |
| **Artifact store** | both (engram + openspec) |
| **Delivery strategy** | ask-on-risk |
| **Review budget** | 400 lines |

## 2. Why

La auditoría de los 75 requerimientos (`docs/requerimientos.md`) contra el código actual reveló que el sistema tiene RBAC casi ausente en el módulo de incidencias. El AGENTE — el rol que más trabaja en el día a día — está bloqueado de facto:

1. **`IncidenciaController.listar`** no inyecta ningún scope por rol. Un `AGENTE` autenticado ve TODAS las incidencias, no solo las asignadas a él. (Evidencia: `IncidenciaController.java:48-74` solo respeta `asignadoA` si el caller lo pasa como query param; ningún filtro por rol existe en el paquete `incidencias/`. Confirmado además por `SecurityConfig.java:42-49` que solo exige `authenticated()`.)

2. **Catálogos (READ) requieren `ADMINISTRADOR`** vía `PermisoAdministracionService.validarAdministrador()`. AGENTE y USUARIO reciben 403 de:
   - `GET /api/categorias` (`CategoriaController.java:34`)
   - `GET /api/aplicativos` (`AplicativoClienteController.java:36`)
   - `GET /api/estados-proceso` (`EstadoProcesoController.java:34`)
   - `GET /api/estados-aprobacion` (`EstadoAprobacionController.java:34`)
   Resultado: el frontend de `/incidencias` se queda sin catálogos cuando entra un AGENTE/USUARIO. La página queda con tablas vacías y badges `—`/`Sin asignar` aunque haya datos.

3. **`UsuarioController.listar`** también exige admin. AGENTE no puede listar pares (otros AGENTES) para asignarles una incidencia. El dropdown de asignación está roto para AGENTE.

4. **Mutaciones sin scope**: PUT/PATCH/DELETE/PATCH-estado/PATCH-aprobacion/POST-comentarios/POST-adjuntos sobre `IncidenciaController` aceptan cualquier usuario autenticado. AGENTE puede modificar cualquier incidencia sin importar si está asignada a él.

5. **El fix sintomático** previo (`Promise.all` → `Promise.allSettled` + gate `currentUserIsAdmin` para `/api/usuarios` en `frontend/src/pages/incidencias/index.tsx`) evita el crash visible pero no resuelve la raíz. Con esta propuesta ese gate se puede retirar.

El resto de la auditoría (dashboard mocks, notificaciones, reportes, perfil, configuración, OpenAPI/Swagger, breadcrumb) queda como **cambios SDD posteriores** documentados en engram `audit/requirements-coverage`. Este cambio es independiente y desbloquea todo lo demás que dependa de "AGENTE puede trabajar con sus incidencias".

## 3. What changes

### 3.1 Backend: extender `PermisoAdministracionService` → `PermisoAutorizacionService`

Renombrar `PermisoAdministracionService` (de `usuarios/service/`) a `PermisoAutorizacionService` y agregar tres métodos sin romper los call-sites existentes:

```java
public Usuario validarAdministrador(String header) { /* existing */ }
public Usuario validarAutenticado(String header)   /* new: any logged-in user */
public Usuario validarAccesoIncidencia(String header, UUID incidenciaId)  /* new: ADMIN bypass, AGENTE exige incidencia.asignadoA == user.id, otros 403 */
```

`validarAccesoIncidencia` necesita que el service cargue la incidencia por id para revisar `asignadoA`. Esto podría meter dependencia al `IncidenciaDao` (cross-module). Para evitar acoplamiento feo, mejor: hacer el chequeo en el `IncidenciaService` por método, pasando el `Usuario` ya validado. La validación de scope vive en `IncidenciaService` (regla de negocio). El service nuevo solo expone `validarAutenticado`.

**Decisión arquitectónica:** No crear `PermisoAutorizacionService` cross-cutting. En su lugar:
- `validarAdministrador()` queda como está (para endpoints admin-only).
- **Nuevo** `validarAutenticado()` se agrega al mismo `PermisoAdministracionService` (renombrar archivo a `PermisoAutorizacionService` o simplemente agregar el método — **decisión: solo agregar el método, no renombrar**, para evitar refactor masivo sin valor).
- El scope-per-role AGENTE/USUARIO sobre incidencias se valida dentro de cada método de `IncidenciaService` con `authService.obtenerUsuarioActual(token)` + check `rol.esAdministrador()` / `incidencia.getAsignadoA() == user.id`.

### 3.2 Backend: `GET` de catálogos → `validarAutenticado` (cualquier usuario autenticado)

Modificar 4 controllers (solo sus métodos `listar`):

| Controller | Línea del check actual | Cambio |
| --- | --- | --- |
| `CategoriaController.listar` | 34 | `validarAdministrador` → `validarAutenticado` |
| `AplicativoClienteController.listar` | 36 | igual |
| `EstadoProcesoController.listar` | 34 | igual |
| `EstadoAprobacionController.listar` | 34 | igual |

Los métodos `GET /{id}` ya no tienen check (per audit) — quedan igual.
Los métodos `POST`/`PUT` siguen con `validarAdministrador` (admin gestiona catálogos per `AGENTS.md:303`).

### 3.3 Backend: `IncidenciaController.listar` inyecta scope por rol

Insertar `@RequestHeader("Authorization") String token` en `listar(...)`. Antes de construir el `IncidenciaFiltro`:

```java
Usuario actual = authService.obtenerUsuarioActual(token);
if (actual.getRol().esAdministrador()) {
    // filtro del query param sin tocar
} else if (actual.getRol().esAgente()) {
    // AGENTE: forzar asignadoA = actual.getId(), IGNORAR query param
    filtro.setAsignadoA(actual.getId());
} else {
    // USUARIO: ver Open Question §4
}
```

Resultado: AGENTE ve solo incidencias asignadas a él sin importar el filtro del query string. ADMINISTRADOR sigue con el filtro libre.

### 3.4 Backend: nuevos guards en `IncidenciaService` para mutaciones

Para cada método de mutación (`actualizar`, `actualizarConArchivos`, `cambiarEstado`, `aprobar`, `rechazar`, `agregarComentario`, `agregarAdjunto`, `agregarAdjuntos`, `eliminar`):

```java
private void validarAlcance(Usuario actual, Incidencia incidencia) {
    if (actual.getRol().esAdministrador()) return;
    if (actual.getRol().esAgente()) {
        if (!Objects.equals(incidencia.getAsignadoA(), actual.getId())) {
            throw new AccesoDenegadoException("Solo puedes modificar incidencias asignadas a ti");
        }
    } else {
        // USUARIO: per AGENTS.md puede comentar y adjuntar evidencia en las suyas
        // Open Question §4 — por ahora, negamos todo lo demás
        if (method != agregarComentario && method != agregarAdjunto*) { throw AccesoDenegadoException }
        if (!Objects.equals(incidencia.getCreadoPorUsuarioId(), actual.getId())) { throw }
    }
}
```

`get` simple (`obtenerDetalle`) también valida: AGENTE solo si asignado, USUARIO solo si creador, ADMIN siempre.

Para `eliminar`: solo ADMIN (per `openspec/specs/incidencias/spec.md:194-196` ya en archive — alinea con el comportamiento UI actual que oculta el botón al AGENTE).

### 3.5 Backend: nuevo endpoint `GET /api/usuarios/agentes-asignables`

Para que el AGENTE pueda poblar el dropdown de asignación de su formulario de crear/editar, sin saltarse el admin-only sobre `GET /api/usuarios`:

- Ruta: `GET /api/usuarios/agentes-asignables`
- Auth: `validarAutenticado` (no admin)
- Filtro SQL: `rol.codigo IN ('AGENTE','ADMINISTRADOR') AND activo = true`
- Response: `List<UsuarioResponse>` (mismo DTO existente)
- Postman: agregar entrada en `SistemaIncidencias.postman_collection.json`

Esto es deliberadamente un endpoint nuevo (no una relajación de `GET /api/usuarios`) para preservar la regla "Solo administrador gestiona usuarios" del AGENTS.md.

### 3.6 Frontend: revertir gate temporal y consumir nuevo endpoint

En `frontend/src/pages/incidencias/index.tsx`:
- Quitar el `currentUserIsAdmin` gate en `loadCatalogos()`. Como los catálogos ya son públicos (paso 3.2), se cargan siempre.
- Quitar también `agregarAdjuntos` y `eliminar` del fetch de `usuarios` — reemplazar con `usuariosService.listarAgentesAsignables()` (nuevo método del service).

Nuevo método en `frontend/src/services/usuarios-service.ts`:
```ts
listarAgentesAsignables(signal?: AbortSignal): Promise<Usuario[]>
```

En `frontend/src/pages/incidencias/components/nueva-incidencia-view.tsx` y `editar-incidencia-dialog.tsx`:
- Reemplazar la llamada a `usuariosService.listar()` con `usuariosService.listarAgentesAsignables()`.
- (El filtro AGENT_ROLE_CODES existente dentro de `editar-incidencia-dialog.tsx:171-178` se vuelve innecesario — el backend ya filtra. Mantener el filtro de `rol.activo === true` por seguridad.)

### 3.7 Files modified

| File | Reason |
| --- | --- |
| `sistemaincidencias/.../usuarios/service/PermisoAdministracionService.java` | Agregar `validarAutenticado(token)` |
| `sistemaincidencias/.../usuarios/controller/UsuarioController.java` | Nuevo `GET /agentes-asignables` (validarAutenticado) |
| `sistemaincidencias/.../usuarios/service/UsuarioService.java` | Nuevo método `listarAgentesAsignables(token)` |
| `sistemaincidencias/.../usuarios/dao/UsuarioDao.java` (+ `UsuarioSql.java`) | Nuevo método `listarAsignables()` con filtro `rol IN ('AGENTE','ADMINISTRADOR') AND activo` |
| `sistemaincidencias/.../catalogos/controller/CategoriaController.java` | `listar` → `validarAutenticado` |
| `sistemaincidencias/.../catalogos/controller/AplicativoClienteController.java` | igual |
| `sistemaincidencias/.../catalogos/controller/EstadoProcesoController.java` | igual |
| `sistemaincidencias/.../catalogos/controller/EstadoAprobacionController.java` | igual |
| `sistemaincidencias/.../incidencias/controller/IncidenciaController.java` | `listar` y otras mutaciones aceptan `@RequestHeader("Authorization")` + propagan al service |
| `sistemaincidencias/.../incidencias/service/IncidenciaService.java` | En cada método aplicar `validarAlcance(actual, incidencia)`; el filtro en `listar` para AGENTE fuerza `asignadoA = user.id` |
| `sistemaincidencias/postman/SistemaIncidencias.postman_collection.json` | Documentar `GET /api/usuarios/agentes-asignables` |
| `frontend/src/services/usuarios-service.ts` | Nuevo método `listarAgentesAsignables(signal?)` |
| `frontend/src/pages/incidencias/index.tsx` | Quitar el gate `currentUserIsAdmin` introducido por el fix anterior; cargar catálogos y agentes-asignables siempre |
| `frontend/src/pages/incidencias/components/nueva-incidencia-view.tsx` | Cambiar `usuariosService.listar()` por `listarAgentesAsignables()` |
| `frontend/src/pages/incidencias/components/editar-incidencia-dialog.tsx` | igual |
| `docs/modelo_datos_der.md` (opcional) | Si `IncidenciaFiltro` necesita campo nuevo para USUARIO — ver §4 |

### 3.8 Files added

- `sistemaincidencias/src/main/java/com/integrador/sistemaincidencias/usuarios/dto/AgentesAsignablesResponse.java` — si se quiere separar del `UsuarioResponse` (decisión: reusar `UsuarioResponse`, no crear nuevo DTO).

## 4. Open questions — to resolve before spec phase

**Q1 (CRÍTICO — bloqueante para spec):**
¿Qué debe ver el USUARIO en `GET /api/incidencias`?

- **A.** Igual que AGENTE: solo incidencias donde `creadoPorUsuarioId == currentUser.id`. Requiere agregar `creadoPorUsuarioId` a `IncidenciaFiltro` (no existe hoy; `Incidencia.java:27` lo tiene pero el filtro no). Cambio SQL + filtro.
- **B.** USUARIO no debe listar; solo ver detalle de las suyas por id directo. List endpoint solo ADMIN/AGENTE.
- **C.** USUARIO ve todo (comportamiento actual — sin cambio).

El AGENTS.md línea 305 dice "consultar las suyas", lo que sugiere **A**.

**Q2 (NO bloqueante — default propuesto):**
¿Mantener el nombre `PermisoAdministracionService` o renombrar a `PermisoAutorizacionService`?

Propuesta: **no renombrar**. Solo agregar el método nuevo. Renombrar es refactor sin valor y rompe git history sin motivo.

## 5. Out of scope (explicit non-requirements)

- **USUARIO scope en mutaciones distintas a `agregarComentario` y `agregarAdjunto(s)`** — si Q1=Q1.0.A, se reduce al mínimo (comentar/adjuntar solo en las suyas).
- **DELETE /api/usuarios/{id}** (RF-33) — endpoint no existe y no se agrega acá.
- **DELETE /api/categorias/{id}, /api/estados-proceso/{id}, /api/estados-aprobacion/{id}** — backend endpoints faltan; fuera de scope de este cambio.
- **Notificaciones reales** (RF-37..40) — cambio SDD posterior.
- **Reportes + export PDF/Excel** (RF-41..44) — cambio SDD posterior.
- **Dashboard real** (RF-06..11) — cambio SDD posterior.
- **Self-profile / change-own-password** (RF-36) — cambio SDD posterior.
- **Demo login fix** (RF-02) — usuario pidió explícitamente NO incluirlo en este cambio.
- **OpenAPI/Swagger** (RNF-18).
- **Breadcrumb** (RF-46).
- **`@PreAuthorize` annotations** — el proyecto sigue el patrón imperativo con `PermisoAdministracionService`. No introducir AOP/Spring Security method security por consistencia.
- **Migrar la pantalla de detalle (`detalle/index.tsx`)** al flujo nuevo de "AGENTE no ve incidencias no asignadas". El front redirige con toast si llega a una incidencia que no le pertenece (catch del 403 del nuevo `validarAlcance`). UI pulida para ese edge case queda como follow-up.

## 6. Dependencies

- Backend corriendo localmente (Spring Boot + PostgreSQL) para smoke manual.
- Postman collection sigue siendo la fuente de verdad del contrato HTTP — actualizado por 3.7.
- Ningún paquete nuevo.

## 7. Risk & review workload forecast

- **Estimated changed lines**: ~250-350 (backend ~200, frontend ~50, postman ~30, docs ~30).
- **Dentro del review budget** (400 líneas).
- **Functional risks**:
  - **Scope slip**: si `validarAlcance` se mete en muchos métodos se vuelve boilerplate. Mitigación: extraer helper `private` en `IncidenciaService` y un solo test mental de la regla.
  - **Side effect en listar**: si el AGENTE tenía una URL guardada con `?asignadoA=otro-uuid`, ahora se le overridea. Decisión intencional (la consigna es "solo las suyas"); documentar en Postman.
  - **Drop de `validarAdministrador` en catalog GETs**: ¿alguien dependía del 403 ahí? Auditoría dice que no. Confirmar durante apply.
- **Non-risks**: Postman se mantiene sincronizado, no se cambian DTOs (se reusan), ningún path nuevo, sin nuevas deps.

## 8. Acceptance criteria (high-level — refined in spec phase)

- `GET /api/categorias`, `/api/aplicativos`, `/estados-proceso`, `/estados-aprobacion` retornan 200 para AGENTE y USUARIO autenticados (antes: 403).
- `GET /api/usuarios` sigue 403 para AGENTE/USUARIO.
- `GET /api/usuarios/agentes-asignables` retorna 200 con la lista filtrada para cualquier usuario autenticado.
- `GET /api/incidencias?asignadoA=otro-uuid` con token de AGENTE retorna solo las del AGENTE, ignorando el query param.
- AGENTE autenticado recibe 403 al intentar `PUT /api/incidencias/{id}` sobre una incidencia no asignada a él.
- AGENTE autenticado puede `PUT /api/incidencias/{id}` sobre una incidencia suya, con misma forma que ADMIN.
- USUARIO autenticado no puede listar incidencias (o solo ve las suyas — depende de Q1).
- Frontend `/incidencias` carga catálogos correctamente al login como AGENTE sin error 403.
- Frontend `loadCatalogos` ya no contiene el gate `currentUserIsAdmin` (limpieza del fix anterior).
- Postman collection incluye la nueva entrada con path, método, rol requerido y ejemplo de respuesta.
- `npm run lint` y `npm run build` del frontend siguen limpios.
- El backend compila (`./mvnw compile`) sin errores y los tests existentes (si hay) siguen verdes.

## 9. Follow-ups (future SDD changes)

- Dashboard real desde `/api/dashboard`
- Notificaciones + tiempo real
- Reportes + export POI
- Perfil self-service
- Configuración UI + DELETE catálogos
- OpenAPI/Swagger
- Breadcrumb / navegación
- USUARIO scope en mutaciones más allá de comentario/adjunto (si Q1=A)
- Demo login mapping faltante (`POST /api/auth/demo`)

## 10. References

- `docs/requerimientos.md` RF-05, RF-15, RF-12..28, RNF-06, RNF-08
- `sistemaincidencias/AGENTS.md` líneas 300-305 (reglas de seguridad por rol)
- `openspec/specs/incidencias/spec.md:344` (deferred B8)
- Engram topic `audit/requirements-coverage` (matriz completa)
- Engram topic `bugfix/Promise-all catalog rejection on AGENTE login` (síntoma + fix absorbido por este cambio)
