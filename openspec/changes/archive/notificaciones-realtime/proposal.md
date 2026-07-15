# Proposal: Notificaciones en tiempo real + centro + badge (RF-37..40)

## 1. Title & metadata

| Field | Value |
| --- | --- |
| **Title** | Notificaciones en tiempo real con centro, badge en topbar y hook de generacion automatica (RF-37, RF-38, RF-39, RF-40) |
| **Change name** | `notificaciones-realtime` |
| **Status** | proposed |
| **Owner** | orchestrator |
| **Date** | 2026-07-15 |
| **Related exploration** | engram topic `audit/requirements-coverage` (#794) — gap matrix entry "Notificaciones (RF-37..40)" |
| **Related change** | `dashboard-real` (archived en master 850fd8e) — patron de modulo `dashboard/` reutilizado como template para `notificaciones/` |
| **Scope** | **Backend primary** (nuevo modulo `notificaciones/` + 5 endpoints + tabla ya existente + hooks de generacion en `IncidenciaService`) + **Frontend** (bell + badge wire-up en `app-header.tsx`, panel dropdown, page `/notificaciones`, polling 30 s) |
| **Delivery mode** | ask-on-risk |
| **Pace** | auto |
| **Artifact store** | both (engram + openspec) |
| **Delivery strategy** | ask-on-risk |
| **Review budget** | 600 lineas |

## 2. Why

El flujo critico del sistema (asignacion, aprobacion, rechazo, cambio de estado, comentario nuevo) ya esta implementado en `IncidenciaService` y dispara `registrarHistorial` (ver `sistemaincidencias/src/main/java/com/integrador/sistemaincidencias/incidencias/service/IncidenciaService.java:317-334`). Sin embargo, **el usuario no se entera de lo que pasa en sus incidencias** sin refrescar la pagina.

Tres consecuencias:

1. **Bloqueo operativo**: AGENTE no sabe cuando una incidencia nueva le cae asignada. USUARIO no sabe cuando su solicitud fue aprobada/rechazada. ADMINISTRADOR no sabe cuando un comentario nuevo aparece en una incidencia escalada.
2. **RF-37..40 sin cobertura backend**: la unica fila en el modulo `notificaciones/` planeado por AGENTS.md (`sistemaincidencias/AGENTS.md:140-148`) esta vacia. `grep -r "/api/notificaciones" sistemaincidencias/` no devuelve ningun controller. La tabla `notificaciones` existe (`db/scripts/004_incidencias_relaciones.sql:171-199`) pero sin ninguna clase Java que la use.
3. **Mock visible en UI**: `frontend/src/layout/app-header.tsx:43-53` ya dibuja una `Bell` con un badge hardcoded `4`. Eso compromete la apariencia profesional y entrana a cualquier observador que el backend "no esta conectado".

**Por que ahora**: changes A (`incidencias-rbac-agente`, archived master 5e4d86a) y B (`dashboard-real`, archived master 850fd8e) ya dejaron sentado el patron de inyeccion de `validarAutenticado` + scope-por-rol + modulo funcional completo (`controller/service/dao/mapper/model/dto/sql`). El modulo `notificaciones/` es la pieza natural que sigue en el orden de implementacion de AGENTS.md (#11 "Notificaciones"). Reutilizar el patron evita re-trabajo y mantiene la consistencia del RBAC.

## 3. What changes

### 3.1 Backend: nuevo modulo `notificaciones/`

La tabla `notificaciones` **ya existe** en `sistemaincidencias/src/main/resources/db/scripts/004_incidencias_relaciones.sql:171-199` con el siguiente esquema:

```sql
CREATE TABLE IF NOT EXISTS notificaciones (
    id uuid PRIMARY KEY,
    usuario_id uuid NOT NULL,           -- destinatario (FK usuarios)
    incidencia_id uuid,                 -- origen del evento (FK incidencias, nullable)
    cliente_id uuid,                    -- contexto aplicativo cliente (FK clientes, nullable)
    tipo varchar(80) NOT NULL,          -- INCIDENCIA_ASIGNADA | INCIDENCIA_APROBADA | etc.
    titulo varchar(200) NOT NULL,
    descripcion text,                   -- cuerpo del mensaje
    leido_en timestamp without time zone,
    creado_en timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

> **Reconciliacion con el brief (asumida en este proposal)**: el brief inicial del usuario describia los campos como `mensaje, leida, leida_en`. El esquema vivo en BD usa `titulo, descripcion, leido_en`. **Decision propuesta y adoptada por defecto**: alinearse al esquema persistido. Justificacion: las columnas ya tienen datos en BD; un `ALTER TABLE` con rename obliga a migracion fisica y a reescribir los inserts de seed; el principio AGENTS.md "DB truth" manda. Si en spec el usuario pide revertir, se anade un `005_notificaciones_renombre.sql` y se aplaza.

La capa Java se crea copiando el patron de `dashboard/`:

```
sistemaincidencias/src/main/java/com/integrador/sistemaincidencias/notificaciones/
  controller/NotificacionController.java
  service/NotificacionService.java
  dao/NotificacionDao.java
  mapper/NotificacionMapper.java
  sql/NotificacionSql.java
  model/Notificacion.java
  dto/
    NotificacionResponse.java          # fila del centro
    NotificacionResumenResponse.java    # slim para dropdown del topbar (ultimas 10)
    NoLeidasCountResponse.java         # { total: long }
    MarcarLeidaResponse.java           # { id, leidoEn }
```

### 3.2 SQL: sin nuevo script en la decision por defecto

La tabla ya existe con sus 5 indices (`usuario_id`, `incidencia_id`, `cliente_id`, `leido_en`, `creado_en` en `004_incidencias_relaciones.sql:292-305`). Bajo la decision por defecto adoptada en §3.1 (alinearse al esquema persistido `titulo, descripcion, leido_en`), **NO se crea ningun script nuevo** — la migracion queda implicita en `004_incidencias_relaciones.sql`.

Solo si en la fase de spec el usuario revierte esa decision se crea `sistemaincidencias/src/main/resources/db/scripts/005_notificaciones_renombre.sql` con `ALTER TABLE notificaciones RENAME COLUMN ...`. Esto se documenta en tasks.md como `T-SQL-OPTIONAL`.

### 3.3 Backend: 5 endpoints REST

Todos bajo el prefijo `/api/notificaciones`, autenticados con el header `Authorization: Bearer <jwt>` (helper `validarAutenticado` ya disponible), scope por rol:

- **ADMINISTRADOR**: puede listar/ver las suyas propias (no hay admin-global de notificaciones — RF-40 no lo pide).
- **AGENTE / USUARIO**: solo ven sus propias notificaciones.

| # | Verbo | Ruta | Proposito | Request | Response |
| - | --- | --- | --- | --- | --- |
| 1 | `GET` | `/api/notificaciones` | Listar todas las del usuario, paginadas, mas recientes primero | query: `page`, `size`, `soloNoLeidas?` | `PageResult<NotificacionResponse>` |
| 2 | `GET` | `/api/notificaciones/recientes` | Ultimas 10 del usuario autenticado (para el dropdown del topbar) | — | `List<NotificacionResumenResponse>` |
| 3 | `GET` | `/api/notificaciones/no-leidas/count` | Conteo de no-leidas para el badge | — | `NoLeidasCountResponse { total: long }` |
| 4 | `PATCH` | `/api/notificaciones/{id}/leida` | Marcar UNA como leida (RF-39 individual). 404 si no pertenece al usuario autenticado | path: `id` | `MarcarLeidaResponse { id, leidoEn }` |
| 5 | `POST` | `/api/notificaciones/marcar-todas-leidas` | Marcar TODAS las del usuario autenticado como leidas (RF-39 bulk) | — | `{ actualizadas: long }` |

> **Endpoints opcionales fuera del MVP** (en §6 "Out of scope" se confirma): `DELETE /api/notificaciones/{id}` y SSE stream.

### 3.4 Backend: `NotificacionService.crear(...)` + hooks en `IncidenciaService`

API interna para que otros modulos generen notificaciones:

```java
public NotificacionResponse crear(
    UUID usuarioDestinoId,
    TipoNotificacion tipo,
    UUID incidenciaId,         // nullable si el evento no es por incidencia
    UUID clienteId,            // nullable
    String titulo,
    String descripcion
);
```

El `service` debe ser **interno** (no expuesto en controller) — otros services Java lo invocan dentro de la misma transaccion.

#### Hooks a insertar en `IncidenciaService`

| Metodo existente en `IncidenciaService` | Condicion | Llamada | Destinatario | Tipo | Mensaje |
| --- | --- | --- | --- | --- | --- |
| `crearIncidencia` (line 99) | siempre | despues de `registrarHistorial(CREADA)` | `asignadoA ?? creadoPorUsuarioId` | `INCIDENCIA_ASIGNADA` (si hay asignado) sino no notificar | `"Incidencia INC-2026-X asignada"` |
| `aprobar` (line 171) | siempre | despues de `registrarHistorial(APROBADA)` | `incidencia.creadoPorUsuarioId` | `INCIDENCIA_APROBADA` | `"Tu solicitud INC-2026-X fue aprobada"` |
| `rechazar` (line 187) | siempre | despues de `registrarHistorial(RECHAZADA)` | `incidencia.creadoPorUsuarioId` | `INCIDENCIA_RECHAZADA` | `"Tu solicitud INC-2026-X fue rechazada. Motivo: {motivoRechazo}"` |
| `cambiarEstado` (line 151) | siempre | despues de `registrarHistorial(CAMBIO_ESTADO)` | `incidencia.creadoPorUsuarioId` + `incidencia.asignadoA` (si distintos del autor) | `INCIDENCIA_ESTADO_CAMBIADO` | `"Incidencia INC-2026-X cambio a {nuevoEstado.codigo}"` |
| `agregarComentario` (line 206) | siempre | despues de `registrarHistorial(COMENTARIO_AGREGADO)` | `incidencia.creadoPorUsuarioId` + `incidencia.asignadoA` (si distintos del autor del comentario) | `INCIDENCIA_COMENTARIO` | `"Nuevo comentario en INC-2026-X: \"{preview 60 chars}\""` |
| `crearIncidencia` | si `actualizar.asignadoA != anterior.asignadoA` | — | nuevo `asignadoA` | `INCIDENCIA_ASIGNADA` | `"Incidencia INC-2026-X asignada"` |

**No-op policy**: si el destinatario coincide con el actor actual (no tiene sentido que ADMINISTRADOR se auto-notifique sus propias acciones), la llamada es silenciosa (`Optional.empty()` o `void` con guard al inicio).

**Manejo transaccional**: la insercion de la notificacion se hace dentro del mismo `@Transactional` boundary del metodo del service que la origina (helper `connection` con `JdbcTemplate`). Si la insercion falla, **rollback completo** del flujo padre (una aprobacion sin notificacion es peor que una aprobacion fallida). Esto alinea con AGENTS.md:270-282.

### 3.5 Enum `TipoNotificacion`

```java
public enum TipoNotificacion {
    INCIDENCIA_ASIGNADA,
    INCIDENCIA_APROBADA,
    INCIDENCIA_RECHAZADA,
    INCIDENCIA_ESTADO_CAMBIADO,
    INCIDENCIA_COMENTARIO
}
```

Valor `varchar(80)` en BD. El mapper hace `rs.getString("tipo")` → `TipoNotificacion.valueOf(...)` con `IllegalArgumentException` mapeado a 500 (defensiva — un valor invalido indica corrupcion de datos).

### 3.6 Real-time strategy: polling (default) vs SSE (opcional)

**Default de este cambio**: el frontend hace **polling cada 30 s** al endpoint `GET /api/notificaciones/no-leidas/count`. Justificacion:

- Cero infraestructura nueva (no hay broker, no hay WebSocket, no hay SSE en Spring Security default).
- RNF-01 dice "refreshable"; el badge se considera refreshable a 30 s.
- La tabla ya tiene `idx_notificaciones_leido_en` + `idx_notificaciones_usuario` del script 004.

**SSE queda como follow-up** (ver §6 y §10). Si en el apply se decide incluir SSE, se anade un endpoint `GET /api/notificaciones/stream` (text/event-stream) con `Last-Event-ID` basico, pero **NO es parte de este proposal**.

### 3.7 Frontend: bell + badge wire-up en `app-header.tsx`

`frontend/src/layout/app-header.tsx` ya tiene el boton bell con badge hardcoded `4` en lineas 43-53. Cambios:

1. Quitar el badge hardcoded (`<span ...>4</span>` → conditional `{count > 0 && <span ...>{count}</span>}`).
2. Agregar `useQuery` o hook equivalente apuntando a `notificacionesService.noLeidasCount()` con `refetchInterval: 30_000` y `refetchOnWindowFocus: true`.
3. Convertir el `<button>` en un Popover de shadcn (o dropdown simple con estado local) que en `onClick` carga `notificacionesService.recientes()` (ultimas 10) y las renderiza como una lista con link "Ver todas" → `/notificaciones`.

Estado local minimo:

```ts
const [abierto, setAbierto] = useState(false)
const { data: count } = useNotificacionesNoLeidas()  // pollling 30 s
const { data: recientes } = useNotificacionesRecientes(abierto)  // fetch on open
```

Si no hay `react-query` instalado, se reusa el patron de `useEffect + useState` ya presente en `frontend/src/pages/dashboard/index.tsx` (verificado en archive `dashboard-real/verify-report.md`).

### 3.8 Frontend: nuevo service `frontend/src/services/notificaciones-service.ts`

```ts
import { apiRequest } from "@/lib/http"

export type TipoNotificacion = "INCIDENCIA_ASIGNADA" | "INCIDENCIA_APROBADA" | "INCIDENCIA_RECHAZADA" | "INCIDENCIA_ESTADO_CAMBIADO" | "INCIDENCIA_COMENTARIO"

export type Notificacion = { id, usuarioId, incidenciaId, clienteId, tipo, titulo, descripcion, creadoEn, leidoEn? }

export type Page<T> = { contenido: T[]; total: number; page: number; size: number }

export const notificacionesService = {
  listar(params: { page?: number; size?: number; soloNoLeidas?: boolean }, signal?: AbortSignal) { ... },
  recientes(signal?: AbortSignal) { ... },
  noLeidasCount(signal?: AbortSignal) { ... },
  marcarLeida(id: string) { ... },
  marcarTodasLeidas() { ... },
}
```

Reusa el patron de `dashboard-service.ts` (verificado) y `incidents-service.ts`.

### 3.9 Frontend: nueva page `/notificaciones`

Estructura siguiendo `.agents/skills/gestincidencias-frontend/SKILL.md`:

```
frontend/src/pages/notificaciones/
  index.tsx                 # composicion: header + filtros + tabla + paginacion
  components/
    notificaciones-table.tsx
    notificaciones-filters.tsx        # checkbox "solo no leidas"
    notificaciones-pagination.tsx
    notificacion-empty-state.tsx       # primer uso sin notificaciones
```

Listado paginado (size 20 por default), columna tipo con etiqueta legible (`"Asignada"`, `"Aprobada"`...), columna leida con `Badge` shadcn variant `secondary` si `leidoEn` no es null, accion `Marcar leida` por fila + boton bulk `Marcar todas` en el header.

Ruta en `frontend/src/router.tsx`:

```tsx
const notificacionesRoute = createRoute({
  getParentRoute: appLayoutRoute,
  path: "/notificaciones",
  component: NotificacionesPage,
})
```

Page es **privada** → reusa `AppLayout` + `PrivateRoute` (ya configurado). No agrega redirect interno.

### 3.10 Postman

Agregar request `GET /api/notificaciones` (+ 4 variantes: recientes, no-leidas count, marcar una, marcar todas) en `sistemaincidencias/postman/SistemaIncidencias.postman_collection.json` carpeta "Notificaciones", con auth header y 1 ejemplo de respuesta por rol (ADMIN, AGENTE, USUARIO).

### 3.11 SecurityConfig

**No requiere cambios**. `SecurityConfig.java` ya tiene `requestMatchers("/api/**").authenticated()` (verificado en `dashboard-real/proposal.md:110` y en archive precedent). Los 5 endpoints caen bajo la regla general.

## 4. Files affected

### Added

- `sistemaincidencias/src/main/java/com/integrador/sistemaincidencias/notificaciones/controller/NotificacionController.java`
- `sistemaincidencias/src/main/java/com/integrador/sistemaincidencias/notificaciones/service/NotificacionService.java`
- `sistemaincidencias/src/main/java/com/integrador/sistemaincidencias/notificaciones/dao/NotificacionDao.java`
- `sistemaincidencias/src/main/java/com/integrador/sistemaincidencias/notificaciones/mapper/NotificacionMapper.java`
- `sistemaincidencias/src/main/java/com/integrador/sistemaincidencias/notificaciones/sql/NotificacionSql.java`
- `sistemaincidencias/src/main/java/com/integrador/sistemaincidencias/notificaciones/model/Notificacion.java`
- `sistemaincidencias/src/main/java/com/integrador/sistemaincidencias/notificaciones/model/TipoNotificacion.java` (enum)
- `sistemaincidencias/src/main/java/com/integrador/sistemaincidencias/notificaciones/dto/NotificacionResponse.java`
- `sistemaincidencias/src/main/java/com/integrador/sistemaincidencias/notificaciones/dto/NotificacionResumenResponse.java`
- `sistemaincidencias/src/main/java/com/integrador/sistemaincidencias/notificaciones/dto/NoLeidasCountResponse.java`
- `sistemaincidencias/src/main/java/com/integrador/sistemaincidencias/notificaciones/dto/MarcarTodasLeidasResponse.java`
- `sistemaincidencias/src/main/resources/db/scripts/005_notificaciones_renombre.sql` (solo si spec revierte la decision por defecto de §3.1)
- `frontend/src/services/notificaciones-service.ts`
- `frontend/src/pages/notificaciones/index.tsx`
- `frontend/src/pages/notificaciones/components/notificaciones-table.tsx`
- `frontend/src/pages/notificaciones/components/notificaciones-filters.tsx`
- `frontend/src/pages/notificaciones/components/notificaciones-pagination.tsx`
- `frontend/src/pages/notificaciones/components/notificacion-empty-state.tsx`
- `frontend/src/types/notificaciones.ts` (opcional — solo si los tipos son compartidos con `pages/notificaciones/`)

### Modified

- `sistemaincidencias/src/main/java/com/integrador/sistemaincidencias/incidencias/service/IncidenciaService.java` (6 puntos de inyeccion de `notificacionService.crear(...)` despues de cada `registrarHistorial`)
- `frontend/src/layout/app-header.tsx` (bell + badge wire-up + Popover con lista)
- `frontend/src/router.tsx` (ruta `/notificaciones`)
- `sistemaincidencias/postman/SistemaIncidencias.postman_collection.json` (carpeta "Notificaciones", 5 requests)

### No modificados

- `SecurityConfig.java` (ya cubierto).
- `db/scripts/004_incidencias_relaciones.sql` (la tabla ya existe con todos los indices necesarios — ver §3.1).
- Otros modulos Java (`dashboard/`, `reportes/`, `usuarios/`, `auth/`) — este cambio solo agrega `notificaciones/` y toca `incidencias/service/`.

## 5. Open questions — to resolve before spec phase

**Q1 (CRITICO — bloqueante para spec):**
Estrategia de tiempo real (RF-37 "tiempo real").

- **A.** **Polling 30 s** a `GET /api/notificaciones/no-leidas/count` desde el frontend, + fetch on open del Popover. (Propuesta — cero infra nueva, alineado con RNF-01 "refreshable", cubre RF-37 interpretado como "near-real-time".)
- **B.** **SSE** en `GET /api/notificaciones/stream` (`text/event-stream` nativo del browser `EventSource`). Mas complejo de testear y de asegurar reconexion automatica; sin broker.
- **C.** **WebSocket** (`Spring WebSocketHandler` + STOMP). Requiere broker; descartado por alcance MVP.
- **Default propuesto**: A (polling 30 s) — se alinea con la decision del cambio `dashboard-real` de no introducir infraestructura para refrescar UI. SSE queda como follow-up en §10.

**Q2 (CRITICO — bloqueante para spec):**
Set exacto de tipos de notificacion soportados en V1 (alineado con RF-37 que enumera 5 eventos).

- **A.** **Los 5**: `INCIDENCIA_ASIGNADA`, `INCIDENCIA_APROBADA`, `INCIDENCIA_RECHAZADA`, `INCIDENCIA_ESTADO_CAMBIADO`, `INCIDENCIA_COMENTARIO`. (Propuesta — cobertura completa RF-37, enum unico en backend `TipoNotificacion.java`.)
- **B.** **Solo alta prioridad** (ASIGNADA, APROBADA, RECHAZADA) y dejar ESTADO_CAMBIADO + COMENTARIO como follow-up. Reduce ruido.
- **C.** **Extender** la lista en follow-up segun feedback operacional, sin cerrarla en V1.

**Q3 (CRITICO — bloqueante para spec):**
Comportamiento cuando **actor del evento == destinatario** (un AGENTE se auto-asigna, un USUARIO comenta su propia solicitud, etc.) y alcance del push (todos los relevantes vs uno explicito).

- **A.** **Silenciar auto-eventos** (`if (Objects.equals(usuarioDestinoId, actorId)) return;`) + destinatario **explicito** por hook (cada metodo de `IncidenciaService` pasa el destinatario resuelto). (Propuesta — evita spam, contrato explicito.)
- **B.** Silenciar auto-eventos + push a **todos los relevantes** del incidente (creador + asignado + ultimo comentarista). Mas completo pero incrementa ruido.
- **C.** Siempre notificar aunque sea a uno mismo (traza completa de auditoria).

**Q4 (NO bloqueante — default propuesto):**
Politica de retencion: cuanto tiempo viven las notificaciones en BD antes de borrarse.

- **A.** **Sin auto-delete**: vive hasta que el usuario las marque o se borre manualmente. (Propuesta — minima complejidad, sin job scheduler.)
- **B.** Auto-delete a **90 dias** (job `@Scheduled` corriendo a las 03:00).
- **C.** Auto-delete a **30 dias**, archivado en tabla `notificaciones_historico`.

**Q5 (NO bloqueante — default propuesto):**
Marcar como leida al **ver** la notificacion (auto vs explicito).

- **A.** **Solo explicito**: el usuario debe hacer click en "Marcar leida" o en el item del Popover. El frontend NO dispara `marcarLeida` automaticamente al renderizar. (Propuesta — preserva la intencion del usuario; permite seguir acumulando no-leidas como recordatorio.)
- **B.** **Auto al abrir el Popover**: al expandir el dropdown del topbar, todas las 10 visibles se marcan leidas en bulk (POST `/marcar-todas-leidas` con subset).
- **C.** **Auto al abrir la page `/notificaciones`**: las del viewport visible se marcan; las demas al hacer click en "Cargar mas" (scroll infinito).

## 6. Out of scope (explicit non-requirements)

- **Email / push notifications** (extension del servicio a otros canales): RF-37..40 solo cubre el canal in-app.
- **Mobile push** (APNs / FCM): no aplica a V1 web-only.
- **Notification preferences por usuario** (silenciar cierto tipo, digest diario): se mantiene un unico perfil global "todas las notificaciones, todas las categorias".
- **Grouping / digesting** (3 comentarios del mismo incidente en una sola notificacion agrupada): cada evento genera su propia fila. Sin deduplicacion.
- **SSE / WebSocket push** (Q1 opcion B/C): polling 30 s es suficiente para V1. SSE queda como follow-up §10.
- **Borrado fisico automatico por antiguedad** (Q4 opciones B/C): la limpieza es manual.
- **DELETE `/api/notificaciones/{id}`**: no se implementa en V1. Si el usuario quiere "borrar", usa `Marcar leida`. Borrar fisico queda como follow-up si UX lo pide.
- **Limpieza masiva por administrador** (RF-??): no especificado. Admin no tiene vista de notificaciones de otros.
- **Notificaciones desde `Comentario` o `Adjunto` sobre incidencias en estados terminales** (RF-37 reza "cambios de estado, comentarios relevantes" — se interpreta que CUALQUIER comentario es relevante; si el UX spec requiere filtrar "comentarios del solicitante", queda como follow-up).
- **Modificar `IncidenciaService.eliminar`** (line 250) para emitir `INCIDENCIA_ELIMINADA` a los participantes: el flujo actual borra fisicamente sin notificar; queda como follow-up.
- **Hooks desde `auth/`** (notificar "bienvenida" al registrarse): no se hace en V1.
- **Servicio de WebSocket broker / Redis pub-sub**: la arquitectura es single-instance en V1 (PostgreSQL es suficiente).

## 7. Dependencies

- **Hard**: change A `incidencias-rbac-agente` (archived en master 5e4d86a) — provee `validarAutenticado`, `validarAlcance`, `authService.obtenerUsuarioActual`. Tambien: change B `dashboard-real` (archived en master 850fd8e) — patron completo `controller/service/dao/mapper/model/dto/sql` reutilizado por `notificaciones/`. Change C `reportes-export` (archived en master 5cb23ec) — confirma que el `app-sidebar` y el router estan estabilizados.
- **Soft**: `frontend/.agents/skills/gestincidencias-frontend/SKILL.md` (estructura `services/` + `pages/`); `frontend/.agents/skills/shadcn/SKILL.md` (Popover, Badge si no estan ya en `src/components/ui`).
- **Reusables**:
  - `authService.obtenerUsuarioActual(authorizationHeader)` (existente) para inyectar el destinatario de las queries `WHERE usuario_id = ?`.
  - `JdbcTemplate` (configurado en change A) para todas las queries del nuevo DAO.
  - `PageRequest` / `PageResult<T>` (ya en `shared/pagination`) para respuesta paginada.
  - `Notificacion` model ya documentado en `sistemaincidencias/AGENTS.md:183` como modelo principal — la propuesta **lo concreta**.
- **Sin nuevos paquetes Maven ni npm**.

## 8. Effort estimate

- **Tamanio**: 550-650 lineas totales
  - Backend Java: ~350 (controller 60, service 90, dao 80, sql 25, mapper 25, model+enum 20, 4 DTOs ~50)
  - Frontend TS: ~180 (service 60, page 50, 4 componentes 70)
  - Hooks en `IncidenciaService`: ~50 (6 puntos de inyeccion con guard de auto-notificacion)
  - Postman: ~40
  - Migracion SQL (opcional, solo si spec revierte la decision por defecto de §3.1): ~20
- **Esfuerzo cognitivo**: **grande** (modulo backend completo + wiring transaccional con 6 hooks + frontend polling con popover + reconciliacion de campos)
- **Riesgos**:
  - **R1**: inyeccion de `NotificacionService` en `IncidenciaService` rompe tests existentes del modulo `incidencias/` si los mocks no se actualizan. Mitigacion: el proyecto no tiene aun suite de tests extensa (verificado en archive `incidencias-rbac-agente/verify-report.md`); el riesgo es bajo pero debe explicitarse en tasks.md.
  - **R2**: si `titulo` se genera como `"Incidencia INC-2026-XXXXXXXX asignada"`, el codigo de la incidencia no estaba asignado cuando `crearIncidencia` ejecuta `notificacionService.crear(...)` — verificar orden de operaciones (debe ir **despues** de `incidenciaDao.insertar`, igual que el historial).
  - **R3**: `JdbcTemplate` debe estar `@Transactional` y la insercion de la notificacion debe estar en la **misma** transaccion que el `registrarHistorial`. Si el servicio de `IncidenciaService` se ejecuta sin `@Transactional`, la generacion de notificacion queda en una transaccion propia — aceptable como fallback, pero **menos consistente**.
- **No riesgos**:
  - Sin nuevos permisos en `SecurityConfig`.
  - Sin nuevas deps Maven / npm.
  - Sin cambios a la BD salvo q Q1 = B.
  - Sin impacto en `dashboard/` ni `reportes/`.
- **Estrategia de delivery recomendada**: split en 2 PRs
  - **PR1 (backend)**: modulo `notificaciones/` + 5 endpoints + Postman + script SQL (si aplica). Verificable con curl. ~400 lineas.
  - **PR2 (frontend + hooks)**: page `/notificaciones` + service `notificaciones-service.ts` + wire-up bell en `app-header.tsx` + 6 hooks en `IncidenciaService`. Verificable en navegador. ~250 lineas.

## 9. Acceptance criteria (high-level — refined in spec phase)

- El endpoint `GET /api/notificaciones` retorna 200 con `PageResult<NotificacionResponse>` paginando 20 por default, ordenando por `creadoEn DESC`.
- Cada llamada a `IncidenciaService.aprobar/rechazar/cambiarEstado/agregarComentario/actualizar(asignadoA)/crear(asignadoA)` genera **al menos una** fila en `notificaciones` para el destinatario correcto, dentro de la misma transaccion.
- `GET /api/notificaciones/no-leidas/count` retorna `{ total: N }` con `N >= 0` consistente con la cantidad de filas `WHERE usuario_id = ? AND leido_en IS NULL`.
- `PATCH /api/notificaciones/{id}/leida` solo aplica cuando la fila pertenece al usuario autenticado; en otro caso retorna 404 (no 403, para no filtrar existencia).
- `POST /api/notificaciones/marcar-todas-leidas` actualiza todas las filas del usuario autenticado y retorna `{ actualizadas: N }`.
- El bell en `app-header.tsx` muestra el badge con el conteo real (no "4" hardcoded); al hacer click abre un Popover con las ultimas 10 + boton "Ver todas" → `/notificaciones`.
- La page `/notificaciones` permite filtrar por "solo no leidas", marcar individualmente, marcar todas en bulk.
- Polling cada 30 s al endpoint `no-leidas/count` actualiza el badge automaticamente sin recargar la pagina.
- Backend `./mvnw compile` sin errores; frontend `npm run lint` y `npm run build` pasan limpios.
- Postman collection incluye los 5 requests con ejemplos de respuesta para los 3 roles.
- Si un usuario es actor y destinatario a la vez (auto-evento), la notificacion se silencia (Q2 default = A).

## 10. Follow-ups (future SDD changes)

- SSE stream en `GET /api/notificaciones/stream` (Q1 opcion B) si la latencia de polling resulta molesta en pruebas reales.
- Marcado automatico como leida al **abrir la page `/notificaciones`** con debounce (Q5 / UX polishing).
- DELETE `/api/notificaciones/{id}` + `DELETE /api/notificaciones` (clear all para el usuario).
- Hook en `IncidenciaService.eliminar` (line 250) para emitir `INCIDENCIA_ELIMINADA`.
- Retention policy automatica (job `@Scheduled`) segun Q4 opcion B/C.
- Preferences por usuario (silenciar tipos especificos) — `GET/PUT /api/notificaciones/preferencias`.
- Email digest diario/semanal via `shared/mail` (canal secundario).
- Integracion con notificaciones Slack / Teams via webhook.
- UI: marcar como leida al hacer hover sobre el item del Popover (atajo UX).
- Cache del badge (Caffeine TTL 10 s) si RNF-01 falla con muchos usuarios concurrentes.

## 11. References

- `docs/requerimientos.md` §1.5 (RF-37..40).
- `docs/analisis_uml_planeacion.md` line 555 (reglas de generacion: asignar, aprobar/rechazar, cambiar estado, comentar), line 580 (`GET /api/notificaciones` endpoint base), line 663 (Fase 7: pruebas de notificaciones).
- `sistemaincidencias/AGENTS.md` line 11 (objetivo incluye "notificaciones"), lines 140-148 (paquete `notificaciones` planeado), line 183 (modelo `Notificacion` en lista de modelos principales), lines 277-279 (transacciones con notificacion), lines 393-394 (regla: "notificaciones se generan al asignar, aprobar/rechazar, cambiar estado o comentar"), lines 446-454 (Postman sync).
- `sistemaincidencias/src/main/resources/db/scripts/004_incidencias_relaciones.sql:171-199` (tabla `notificaciones` con su esquema completo + lineas 292-305 con 5 indices).
- `sistemaincidencias/src/main/java/com/integrador/sistemaincidencias/incidencias/service/IncidenciaService.java` (hooks a injectar: `crearIncidencia` line 99, `actualizarIncidencia` line 136, `cambiarEstado` line 151, `aprobar` line 171, `rechazar` line 187, `agregarComentario` line 206).
- `frontend/src/layout/app-header.tsx:43-53` (bell con badge hardcoded — punto a wire-up).
- `openspec/changes/archive/dashboard-real/proposal.md` (template de estructura + patron de modulo completo §3.1).
- `openspec/changes/archive/incidencias-rbac-agente/proposal.md` (patron de `validarAutenticado` + inyeccion de `authService.obtenerUsuarioActual`).
- `frontend/src/services/dashboard-service.ts` y `frontend/src/services/incidents-service.ts` (patron de service con `apiRequest` + tipos + `buildQuery`).
- `frontend/.agents/skills/gestincidencias-frontend/SKILL.md` (reglas de page, componentes y servicios).
- Engram topic `audit/requirements-coverage` (#794) — gap matrix completo del que este change es la entrada D de 6.
