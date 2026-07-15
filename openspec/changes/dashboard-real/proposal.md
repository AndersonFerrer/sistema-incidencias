# Proposal: Dashboard real con `GET /api/dashboard`

## 1. Title & metadata

| Field | Value |
| --- | --- |
| **Title** | Dashboard real con `GET /api/dashboard` (RF-06..11 + RNF-01) |
| **Change name** | `dashboard-real` |
| **Status** | proposed |
| **Owner** | orchestrator |
| **Date** | 2026-07-14 |
| **Related exploration** | engram topic `audit/requirements-coverage` (gap matrix entry "Dashboard mocks") |
| **Related change** | `incidencias-rbac-agente` (archived) — proves the RBAC-scope pattern reused in `dashboard.listar` |
| **Scope** | **Backend primary** (nuevo módulo `dashboard/` + 1 endpoint) + **Frontend** (reemplazar mocks en `pages/dashboard/data.ts` por fetch real) |
| **Delivery mode** | ask-on-risk |
| **Pace** | auto |
| **Artifact store** | both (engram + openspec) |
| **Delivery strategy** | ask-on-risk |
| **Review budget** | 500 líneas |

## 2. Why

La página `DashboardPage` (`frontend/src/pages/dashboard/index.tsx`) se renderiza hoy desde `data.ts` con 13 incidencias hardcodeadas (`dashboardStats`, `pieData`, `categoryData`, `trendData`, `recentIncidents`). Tres consecuencias:

1. **Bloqueo de decisión**: Usuarios autenticados ven métricas ficticias. Ni ADMINISTRADOR puede auditar carga real, ni AGENTE puede medir su propia cola, ni USUARIO puede saber el estado de "las suyas".
2. **RF-06..11 sin cobertura**: `grep /api/dashboard` no devuelve nada en `sistemaincidencias/`. Los 6 requerimientos del bloque 1.2 de `docs/requerimientos.md` están implementados solo en UI con datos muertos.
3. **RNF-01 verificable solo con datos reales**: "Dashboard < 3 s" requiere agregaciones SQL reales; los mocks no ejercen el path crítico.

**Por qué ahora**: change A (`incidencias-rbac-agente`) dejó sentado el patrón de inyección de scope-por-rol en el controller (`IncidenciaController.listar`) y el helper `validarAutenticado`. Reutilizarlo evita re-trabajo y mantiene la consistencia del RBAC.

## 3. What changes

### 3.1 Backend: nuevo módulo `dashboard/` (siguiendo la arquitectura de AGENTS.md)

Estructura nueva, copiando el patrón de `incidencias/`:

```
sistemaincidencias/src/main/java/com/integrador/sistemaincidencias/dashboard/
  controller/DashboardController.java
  service/DashboardService.java
  dao/DashboardDao.java
  mapper/DashboardMapper.java
  sql/DashboardSql.java
  dto/
    DashboardResponse.java
    KpisResponse.java
    ConteoEstadoResponse.java
    CategoriaCountResponse.java
    TendenciaSemanalResponse.java
    IncidenciaResumenResponse.java   # NUEVO — slim DTO para `recientes`
```

### 3.2 Backend: único endpoint `GET /api/dashboard`

- **Ruta**: `GET /api/dashboard?rango=30d` (rango: `7d` | `30d` | `90d` | `all`, default `30d`).
- **Auth**: `validarAutenticado(token)` (heredado de change A).
- **Scope por rol** (reusa el patrón de `IncidenciaController.listar`):
  - `ADMINISTRADOR`: ve todo.
  - `AGENTE`: ve solo `incidencias.asignado_a = currentUser.id`.
  - `USUARIO`: ve solo `incidencias.creado_por_usuario_id = currentUser.id`.
- **Service** orquesta **6 queries parametrizadas** ejecutadas en una sola transacción de lectura:

| # | DAO method | SQL base | Devuelve |
|---|---|---|---|
| 1 | `contarTotal(scope)` | `SELECT COUNT(*) FROM incidencias WHERE <scope>` | `long` |
| 2 | `contarPorEstadoAprobacion(scope)` | `SELECT ea.codigo, COUNT(*) FROM incidencias i JOIN estados_aprobacion ea ON ... GROUP BY ea.codigo` | `Map<String,Long>` |
| 3 | `contarPorEstadoProceso(scope)` | análogo con `estados_proceso` | `Map<String,Long>` |
| 4 | `contarPorCategoria(scope)` | `SELECT c.nombre, COUNT(*) ... GROUP BY c.nombre` | `List<CategoriaCountResponse>` |
| 5 | `listarTendenciaSemanal(scope, rango)` | `SELECT date_trunc('week', creado_en) AS semana, COUNT(*) FILTER (WHERE ...) ... GROUP BY semana` | `List<TendenciaSemanalResponse>` |
| 6 | `listarRecientes(scope, 5)` | `SELECT ... ORDER BY creado_en DESC LIMIT 5` | `List<IncidenciaResumenResponse>` |
| 7 | `tiempoPromedioResolucionHoras(scope)` | `SELECT AVG(EXTRACT(EPOCH FROM (resuelto_en - creado_en))/3600.0) FROM incidencias WHERE resuelto_en IS NOT NULL AND <scope>` | `Double` (nullable → 0.0) |

### 3.3 Response shape

```java
public class DashboardResponse {
    KpisResponse kpis;                          // total + byEstadoAprobacion + byEstadoProceso
    List<CategoriaCountResponse> byCategoria;
    List<TendenciaSemanalResponse> tendenciaSemanal;
    List<IncidenciaResumenResponse> recientes;  // size = 5
    Double tiempoPromedioResolucionHoras;
    String rangoAplicado;                       // "30d" (eco del query param)
}
```

`KpisResponse`:
```java
long total;
Map<String, Long> byEstadoAprobacion;  // {"SOLICITADA": 3, "APROBADA": 5, "RECHAZADA": 1}
Map<String, Long> byEstadoProceso;     // {"PENDIENTE": 4, "EN_PROCESO": 3, "FINALIZADA": 2}
```

### 3.4 Frontend: reemplazo de mocks por fetch real

- `frontend/src/services/dashboard-service.ts` (**nuevo**): método `obtener(rango?: Rango, signal?)` que llama `GET /api/dashboard?rango=30d` vía `src/lib/http.ts`. Tipo de retorno `Dashboard` vive aquí o en `src/types/dashboard.ts` (re-exportar desde `data.ts` actual).
- `frontend/src/pages/dashboard/index.tsx`: convertir a componente de efecto — `useEffect` carga al montar, `useState` para loading/error. Selector de rango (`Select` shadcn) actualiza URL search param y refetchea.
- `frontend/src/pages/dashboard/components/dashboard-stats.tsx`: aceptar `kpis` + `tiempoPromedioHoras` como props (eliminar `import` de `data.ts:dashboardStats`).
- `frontend/src/pages/dashboard/components/dashboard-charts.tsx`: aceptar `byCategoria`, `tendenciaSemanal`, distribución por estado general (derivada de `kpis.byEstadoProceso`) como props.
- `frontend/src/pages/dashboard/components/recent-incidents-table.tsx`: aceptar `recientes` como prop; mapear `IncidenciaResumenResponse` → filas (campos: `codigo`, `titulo`, `estadoProcesoCodigo`, `prioridad`, `categoriaNombre`, `asignadoA` opcional, `creadoEn`).
- `frontend/src/pages/dashboard/data.ts`: **se vacía** — solo conserva `chartColors`, `pieColors`, `statusLabels`, `priorityLabels` (config visual estática, no datos). El array `incidents` (mock) y los derivados se eliminan.

> **Nota**: el frontend ya tiene `shadcn` instalado y `lucide-react` con iconos. Se reusa el componente `Select` y un `Spinner` local — sin deps nuevas.

### 3.5 Postman

- Agregar request `GET /api/dashboard?rango=30d` en `sistemaincidencias/postman/SistemaIncidencias.postman_collection.json` (carpeta "Dashboard"), con auth note "authenticated (any role, scope por rol)" y 3 ejemplos de respuesta: ADMIN token, AGENTE token, USUARIO token.

### 3.6 SecurityConfig

**No requiere cambios**. `SecurityConfig.java:47` ya tiene `requestMatchers("/api/**").authenticated()`. El nuevo endpoint queda cubierto sin tocar la cadena.

## 4. Files affected

### Added
- `sistemaincidencias/src/main/java/com/integrador/sistemaincidencias/dashboard/controller/DashboardController.java`
- `sistemaincidencias/src/main/java/com/integrador/sistemaincidencias/dashboard/service/DashboardService.java`
- `sistemaincidencias/src/main/java/com/integrador/sistemaincidencias/dashboard/dao/DashboardDao.java`
- `sistemaincidencias/src/main/java/com/integrador/sistemaincidencias/dashboard/mapper/DashboardMapper.java`
- `sistemaincidencias/src/main/java/com/integrador/sistemaincidencias/dashboard/sql/DashboardSql.java`
- `sistemaincidencias/src/main/java/com/integrador/sistemaincidencias/dashboard/dto/DashboardResponse.java`
- `sistemaincidencias/src/main/java/com/integrador/sistemaincidencias/dashboard/dto/KpisResponse.java`
- `sistemaincidencias/src/main/java/com/integrador/sistemaincidencias/dashboard/dto/ConteoEstadoResponse.java`
- `sistemaincidencias/src/main/java/com/integrador/sistemaincidencias/dashboard/dto/CategoriaCountResponse.java`
- `sistemaincidencias/src/main/java/com/integrador/sistemaincidencias/dashboard/dto/TendenciaSemanalResponse.java`
- `sistemaincidencias/src/main/java/com/integrador/sistemaincidencias/dashboard/dto/IncidenciaResumenResponse.java`
- `frontend/src/services/dashboard-service.ts`
- `frontend/src/types/dashboard.ts` (opcional — solo si los tipos son compartidos con `pages/dashboard/`)

### Modified
- `frontend/src/pages/dashboard/index.tsx` (page → fetch + estado)
- `frontend/src/pages/dashboard/components/dashboard-stats.tsx` (props en lugar de import estático)
- `frontend/src/pages/dashboard/components/dashboard-charts.tsx` (props)
- `frontend/src/pages/dashboard/components/recent-incidents-table.tsx` (props + mapping DTO)
- `frontend/src/pages/dashboard/data.ts` (vaciar datos, conservar config visual)
- `sistemaincidencias/postman/SistemaIncidencias.postman_collection.json` (nuevo request)

**No modificados**:
- `SecurityConfig.java` (ya cubierto).
- Controllers/DAO/SQL existentes de `incidencias/` (el dashboard consume, no muta).

## 5. Open questions — to resolve before spec phase

**Q1 (CRÍTICO — bloqueante para spec):**
Rango temporal por defecto del dashboard y opciones disponibles en la UI.

- **A.** `rango=30d` por defecto, selector expone `7d | 30d | 90d | all`. (Propuesta — alineado con RF-26 "filtro por rango de fechas".)
- **B.** `rango=all` por defecto (dashboard refleja TODO el histórico; sin selector en V1).
- **C.** Solo `rango=30d` hardcoded; sin selector. (Más simple — pero deja RF-26 parcialmente fuera de scope.)

**Q2 (CRÍTICO — bloqueante para spec):**
Estructura del dashboard para AGENTE vs USUARIO.

- **A.** **Misma estructura, datos filtrados**: ambas ven las 6 secciones; solo cambian los conteos (`recientes` y `tiempoPromedioResolucionHoras` reflejan el scope). (Propuesta — coherente con change A: scope = filtro del mismo recurso.)
- **B.** **Widgets distintos por rol**: AGENTE ve además "tiempo promedio de mis resoluciones"; USUARIO ve "estado de mis solicitudes". (Más rico — pero casi duplica la pantalla.)
- **C.** **Sin distinción**: AGENTE/USUARIO ven un subconjunto del dashboard ADMIN (solo KPIs + recientes).

**Q3 (NO bloqueante — default propuesto):**
Resolución temporal de la serie `tendenciaSemanal`.

- **A.** **Diaria** (último mes granular) cuando `rango <= 30d`; **semanal** cuando `rango > 30d`. (Más útil, pero requiere lógica de switching.)
- **B.** **Siempre semanal** (fija, alineada con RF-09 "semanal o mensual"). (Propuesta — simple, suficiente para RF-09.)

**Q4 (NO bloqueante — default propuesto):**
Cálculo de `tiempoPromedioResolucionHoras`.

- **A.** `AVG(EXTRACT(EPOCH FROM (resuelto_en - creado_en)) / 3600.0)` sobre las incidencias con `resuelto_en IS NOT NULL` dentro del scope. (Propuesta — alineada con AGENTS.md "si el estado es terminal, registrar resuelto_en".)
- **B.** Excluir incidencias rechazadas (`estado_aprobacion_id = RECHAZADA`).
- **C.** Excluir incidencias resueltas en menos de 1 minuto (filtro de outliers por creación+cancelación inmediata).

## 6. Out of scope (explicit non-requirements)

- **Tiempo real (websockets / SSE)**: NO se implementa `push` de actualizaciones. RNF-01 dice "refreshable" → la página refetchea al cambiar de ruta o rango. (RF-37..40 vive en su propio cambio.)
- **Drill-down desde gráfico a lista filtrada**: clickear una barra del `byCategoria` NO navega a `/incidencias?categoria=…`. Queda como follow-up de UX.
- **Export PDF/Excel del dashboard**: RF-44 vive en el cambio de Reportes.
- **Dashboards personalizados por usuario (layouts custom)**: fuera de alcance del MVP.
- **Integración BI externa** (Metabase, PowerBI, etc.).
- **Cache del backend** (Caffeine, Redis): el primer corte es SQL directo. Si RNF-01 falla en cargas grandes, se añade en follow-up.
- **GET `/api/dashboard/agente/{id}`** (RF-42 "reporte por agente"): vive en el cambio de Reportes.
- **Modificación del frontend `/incidencias`** (la integración de filtros vive en otro cambio).
- **DELETE de categorías/estados** (referenciado por `frontend/.../categorias/index.tsx` per audit #794).

## 7. Dependencies

- **Hard**: change A `incidencias-rbac-agente` (archived en master 5e4d86a). Sin él: AGENTE/USUARIO ven datos de ADMINISTRADOR. Patrón de `validarAutenticado` y la inyección de `@RequestHeader("Authorization")` ya están disponibles en `IncidenciaController` y `PermisoAdministracionService`.
- **Soft**: `frontend/.agents/skills/gestincidencias-frontend/SKILL.md` (estructura de `services/` y `pages/`).
- **Reusables**: `IncidenciaResumenResponse` se introduce NUEVO en este cambio (no existía; el brief del usuario lo asume, pero el codebase aún no lo tiene). Se construye mínimo: `id`, `codigo`, `titulo`, `categoriaNombre`, `asignadoA`, `estadoProcesoCodigo`, `estadoAprobacionCodigo`, `prioridad`, `creadoEn`, `resueltoEn`.
- **Sin nuevos paquetes npm ni Maven**.

## 8. Risk & review workload forecast

- **Líneas estimadas**: ~350-450 total
  - Backend: ~250 (controller 30, service 60, dao 110, sql 30, mapper 20, 6 dtos ~60)
  - Frontend: ~120 (service 30, refactor 3 componentes 60, page 30)
  - Postman: ~30
- **Riesgos funcionales**:
  - **Query 6-en-1**: una sola pantalla depende de 7 queries secuenciales. Mitigación: el service usa una conexión del pool (sin transacción explícita — todo read-only), ejecuta en serie. Si latencia > 1s, se refactoriza a `CompletableFuture` con pool del doble de cores en follow-up (no en este cambio).
  - **Mapeo zona horaria**: `date_trunc('week', creado_en)` corre en zona horaria del servidor PostgreSQL. Documentar el comportamiento esperado para `recientes` (timestamps ya vienen `LocalDateTime` per `Incidencia.java` — sin tz implicada).
  - **`tiempoPromedioResolucionHoras` NULL cuando no hay finalizadas**: el mapper retorna `0.0` y el front muestra "0.0 h" hasta que haya datos. Alternativa: ocultar la card si es `0.0`. **Decisión propuesta: ocultar**.
- **No riesgos**:
  - Sin nuevos permisos nuevos en `SecurityConfig`.
  - Sin nuevas deps.
  - Sin impacto en otros endpoints (el dashboard es netamente de lectura).

## 9. Acceptance criteria (high-level — refined in spec phase)

- `GET /api/dashboard?rango=30d` retorna 200 con la forma `DashboardResponse` para ADMIN, AGENTE, USUARIO autenticados.
- ADMIN ve todas las incidencias del rango; AGENTE ve solo las asignadas; USUARIO ve solo las creadas por él.
- `total` y los `byEstadoAprobacion`/`byEstadoProceso` cuadran entre sí (`total == sum(byEstadoAprobacion)`).
- `byCategoria` no incluye categorías con 0 incidencias en el rango (o sí, según decisión de Q1 — propuesto: solo > 0).
- `tendenciaSemanal` retorna puntos ordenados cronológicamente ascendente, sin huecos.
- `recientes` retorna exactamente 5 elementos ordenados por `creadoEn DESC` (o menos si no hay 5).
- `tiempoPromedioResolucionHoras` es 0.0 si no hay finalizadas en el rango; coincide con cálculo manual en `psql` (sanity check en apply).
- P95 de la llamada < 1.5s con dataset de smoke (< 1000 incidencias, requisito RNF-01 indirecto).
- Frontend `/dashboard` muestra los mismos 6 bloques que el mock actual pero con datos reales. Al cambiar el selector de rango, refetchea y actualiza. `npm run lint` y `npm run build` pasan limpios.
- `frontend/src/pages/dashboard/data.ts` ya no exporta `incidents` ni los arrays derivados (`categoryData`, `trendData`, `pieData`, `recentIncidents`, `dashboardStats`). Solo conserva config visual.
- Postman collection incluye `GET /api/dashboard` con 3 ejemplos (uno por rol).
- Backend `./mvnw compile` sin errores.

## 10. Follow-ups (future SDD changes)

- Drill-down chart → lista filtrada (UX).
- Cache Caffeine del endpoint si RNF-01 no se cumple en producción.
- `tiempoPromedioResolucionHoras` por agente (RF-42, vive en Reportes).
- Notificaciones RF-37..40 (otro cambio).
- Reportes + export PDF/Excel RF-41..44 (otro cambio).
- OpenAPI/Swagger (RNF-18).
- Breadcrumb / Configuración UI / Demo login (audit #794).

## 11. References

- `docs/requerimientos.md` §1.2 (RF-06..11) y §2.1 (RNF-01).
- `sistemaincidencias/AGENTS.md` líneas 41-56 (arquitectura por módulos), 234-256 (DAO + SQL), 360-386 (endpoints base — `/api/dashboard` ya estaba planeado), 446-454 (Postman sync).
- `openspec/changes/archive/incidencias-rbac-agente/proposal.md` §3.3 y §3.4 (patrón scope-por-rol en controller + `validarAlcance` en service).
- `openspec/changes/archive/incidencias-rbac-agente/tasks.md` T5b (inyección de `authService.obtenerUsuarioActual` en controller).
- `frontend/src/pages/dashboard/data.ts` (mocks actuales).
- `frontend/.agents/skills/gestincidencias-frontend/SKILL.md` (reglas de página).
- Engram topic `audit/requirements-coverage` (#794) — gap matrix completo.
