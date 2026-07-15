# Proposal: Reportes y exportación PDF/Excel (RF-41..44 + RF-45 sidebar)

## 1. Title & metadata

| Field | Value |
| --- | --- |
| **Title** | Reportes y Estadísticas con exportación PDF/Excel (RF-41..44) + link sidebar (RF-45) |
| **Change name** | `reportes-export` |
| **Status** | proposed |
| **Owner** | orchestrator |
| **Date** | 2026-07-14 |
| **Related exploration** | engram topic `audit/requirements-coverage` (gap matrix entry "Reportes module missing" — RF-41..44 sin cobertura) |
| **Related change** | `dashboard-real` (archived en master 850fd8e) — patrón `validarAutenticado` + scope-por-rol + agregaciones SQL parametrizadas reusables; `incidencias-rbac-agente` (archived) — patrón scope-por-rol en controller. |
| **Scope** | **Backend primary** (nuevo módulo `reportes/` con controller + service + dao + sql + mapper + dto + exporter) + **Frontend** (nueva página `/reportes` con filtros, preview, gráficos y botones de exportación) + **infra** (Postman + sidebar). |
| **Delivery mode** | ask-on-risk |
| **Pace** | auto |
| **Artifact store** | both (engram + openspec) |
| **Delivery strategy** | ask-on-risk |
| **Review budget** | 900 líneas (medium-large — incluye 2 exporters) |

## 2. Why

El módulo `reportes/` **no existe hoy** en `sistemaincidencias/`:

- `grep -r "reportes" sistemaincidencias/src/main/java` solo devuelve el paquete declarado en `AGENTS.md:148` (carpeta vacía).
- `sistemaincidencias/pom.xml` ya incluye `poi-ooxml 5.3.0` (Apache POI), pero **NO** incluye PDFBox ni iText — falta la dependencia para RF-44.
- `frontend/src/pages/` tiene `dashboard/`, `incidencias/`, `usuarios/`, `clientes/`, `categorias/`, `login/` — **NO existe** `reportes/`.
- `frontend/src/layout/app-sidebar.tsx:20` muestra el item "Reportes" pero como `<button>` (sin `to`) — está muerto, no navega.

Tres consecuencias operativas:

1. **Bloqueo de cierre del bloque 1.6 de `docs/requerimientos.md`**: RF-41 (reporte por período), RF-42 (reporte por agente), RF-43 (gráficos) y RF-44 (exportación PDF/Excel) están **abiertos**. La auditoría `requirements-coverage` (#794) los lista como gaps.
2. **RF-45 incompleto**: el sidebar anuncia "Reportes" pero la ruta no existe → UX rota.
3. **Dependencia conceptual con change B**: la página `/reportes` necesitará los mismos KPIs de `/api/dashboard` (RF-09..11 ya entregados). Sin un módulo `reportes/` propio, RF-42 "métricas por agente" (no "agente específico") no tiene endpoint donde vivir.

**Por qué ahora**: change A (`incidencias-rbac-agente`) y change B (`dashboard-real`) dejaron sentados los patrones de scope-por-rol en controllers (`IncidenciaController.listar`) + `validarAutenticado` + agregaciones SQL parametrizadas (DAO sin JPA per AGENTS.md). El módulo `reportes/` los reusa — sin ellos, este change duplicaría RBAC y agregaciones.

## 3. What changes

### 3.1 Backend: nuevo módulo `reportes/`

Estructura nueva siguiendo `AGENTS.md:148` + patrón `incidencias/` + `dashboard/`:

```
sistemaincidencias/src/main/java/com/integrador/sistemaincidencias/reportes/
  controller/ReporteController.java
  service/ReporteService.java
  dao/ReporteDao.java
  mapper/ReporteMapper.java
  sql/ReporteSql.java
  exporter/
    ReporteExcelExporter.java
    ReportePdfExporter.java
  dto/
    ReporteRequest.java              # filtros: desde, hasta, agenteId, granularidad
    ReporteResponse.java             # cuerpo JSON para vista previa
    ReporteResumenAgenteResponse.java
    ReporteTendenciaResponse.java
    ReporteConteoEstadoResponse.java
    ReporteConteoCategoriaResponse.java
    ReporteConteoPrioridadResponse.java
    ReporteKpiResponse.java          # sub-DTO con totales
```

> AGENTS.md línea 148 declara `controller / service / dto / exporter`; añadimos `dao / mapper / sql` por la regla DAO (sin JPA). Justificación documentada en `tasks.md` T0.

### 3.2 Backend: dos endpoints nuevos

#### 3.2.1 `GET /api/reportes?desde=&hasta=&agenteId=&granularidad=&formato=json`

- **Ruta**: `GET /api/reportes`.
- **Auth**: `validarAutenticado(token)` (reusa helper de change A).
- **Query params**:
  - `desde` (LocalDate, requerido, default = hace 30 días).
  - `hasta` (LocalDate, requerido, default = hoy).
  - `agenteId` (UUID, opcional — drill-down por agente para RF-42).
  - `granularidad` (`diaria | semanal | mensual`, default `semanal` — alineado con RF-09).
  - `formato` (`json | pdf | xlsx`, default `json`).
- **Scope por rol** (reusa patrón `IncidenciaController.listar`):
  - `ADMINISTRADOR`: ve todas las incidencias del rango; `agenteId` opcional.
  - `AGENTE`: `agenteId` **forzado a `currentUser.id`** aunque el cliente envíe otro (RBAC estricto).
  - `USUARIO`: solo incidencias con `creado_por_usuario_id = currentUser.id`; `agenteId` se ignora (RF-42 no aplica a este rol).
- **Service** orquesta **6 queries parametrizadas** ejecutadas en serie (read-only, sin transacción explícita):

| # | DAO method | SQL base | Devuelve |
|---|---|---|---|
| 1 | `contarTotal(scope)` | `SELECT COUNT(*) FROM incidencias WHERE <scope> AND creado_en BETWEEN ? AND ?` | `long` |
| 2 | `contarPorEstadoAprobacion(scope)` | `SELECT ea.codigo, COUNT(*) FROM incidencias i JOIN estados_aprobacion ea ... WHERE <scope> GROUP BY ea.codigo` | `Map<String,Long>` |
| 3 | `contarPorEstadoProceso(scope)` | análogo con `estados_proceso` | `Map<String,Long>` |
| 4 | `contarPorCategoria(scope)` | `SELECT c.nombre, COUNT(*) FROM incidencias i JOIN categorias c ... GROUP BY c.nombre` | `List<ConteoCategoria>` |
| 5 | `contarPorPrioridad(scope)` | `SELECT prioridad, COUNT(*) ... GROUP BY prioridad` | `Map<Prioridad,Long>` |
| 6 | `listarTendencia(scope, granularidad)` | `SELECT date_trunc('<granularidad>', creado_en) AS bucket, COUNT(*) ... GROUP BY bucket ORDER BY bucket` | `List<Tendencia>` |
| 7 | `listarResumenPorAgente(scope)` | `SELECT asignado_a, COUNT(*) total, COUNT(*) FILTER (WHERE resuelto_en IS NOT NULL) resueltas, AVG(...) FILTER (WHERE resuelto_en IS NOT NULL) promedio_horas FROM incidencias WHERE <scope> AND asignado_a IS NOT NULL GROUP BY asignado_a` | `List<ResumenAgente>` |
| 8 | `tiempoPromedioResolucionHoras(scope)` | `SELECT AVG(EXTRACT(EPOCH FROM (resuelto_en - creado_en))/3600.0) WHERE resuelto_en IS NOT NULL AND <scope>` | `Double` (nullable → 0.0) |

> Las 8 queries son **simétricas a las 7 del dashboard** (change B). La query 7 (resumen por agente) es la **extensión RF-42** — vive en reportes, no en dashboard, para mantener dashboard compacto.

#### 3.2.2 `GET /api/reportes/exportar?desde=&hasta=&agenteId=&granularidad=&formato=pdf|xlsx`

- **Ruta**: `GET /api/reportes/exportar`.
- **Diferencia con 3.2.1**: si `formato=pdf|xlsx`, el service reusa el mismo dataset pero **no serializa JSON** — delega a `ReportePdfExporter` o `ReporteExcelExporter` y devuelve `byte[]` con `Content-Type: application/pdf` o `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` y `Content-Disposition: attachment; filename="reporte-{desde}-{hasta}.{ext}"`.
- **Decisión de implementación**: el controller **NO** duplica lógica — un único `ReporteService.generar(filtro, formato)` retorna `byte[]` para `pdf|xlsx` o `ReporteResponse` para `json`. La rama JSON se sirve en 3.2.1; la rama binaria en 3.2.2. **Alternativa evaluada**: 3.2.1 acepta `formato=pdf|xlsx` y devuelve binario (un solo endpoint). Se descartó para mantener 3.2.1 legible en Postman y alinear con `docs/analisis_uml_planeacion.md:578-579` que lista 2 rutas separadas.

#### 3.2.3 Filtro de agentes (sin endpoint nuevo)

El dropdown de la UI llama **`GET /api/usuarios/agentes-asignables`** (ya existe en `UsuarioController:52`). **NO** creamos `/api/reportes/agentes`. Documentado en tasks T3 como dependencia reutilizada.

### 3.3 Response shape (JSON)

```java
public class ReporteResponse {
    ReporteFiltroAplicado filtro;          // eco de {desde, hasta, agenteId, granularidad}
    ReporteKpiResponse kpis;               // total + byEstadoAprobacion + byEstadoProceso + byPrioridad
    List<ConteoCategoria> byCategoria;
    List<Tendencia> tendencia;             // bucketInicio + total (granularidad = diaria|semanal|mensual)
    List<ResumenAgente> resumenPorAgente;  // vacío si rol != ADMINISTRADOR/AGENTE
    Double tiempoPromedioResolucionHoras;
    List<IncidenciaResumenResponse> detalle; // top 50 ordenadas por creado_en DESC (preview tabla)
}
```

`ReporteKpiResponse`:
```java
long total;
Map<String, Long> byEstadoAprobacion;   // {"SOLICITADA": 3, ...}
Map<String, Long> byEstadoProceso;      // {"PENDIENTE": 4, ...}
Map<String, Long> byPrioridad;          // {"ALTA": 8, ...}
```

`ResumenAgenteResponse`:
```java
UUID agenteId;
String agenteNombre;
long totalAsignadas;
long resueltas;
long pendientes;
long enProceso;
Double promedioResolucionHoras;         // null si resueltas == 0
```

### 3.4 Exporter

#### 3.4.1 Excel (`ReporteExcelExporter.java`)

- **Lib**: `org.apache.poi` (ya en `pom.xml:78`, versión `5.3.0`).
- **Hojas** (workbook `SXSSFWorkbook` para > 100k filas sin OOM):
  1. **Resumen**: kpis en formato tabla fija (A1:B6).
  2. **Por estado aprobación** + **Por estado proceso** + **Por prioridad** + **Por categoría** (4 hojas, una por dimensión, con totales al pie).
  3. **Tendencia**: columnas `Bucket inicio | Total`.
  4. **Por agente**: columnas `Agente | Total asignadas | Resueltas | Pendientes | En proceso | Promedio (h)`.
  5. **Detalle (top 50)**: reusa el slim DTO `IncidenciaResumenResponse` (creado en change B).

#### 3.4.2 PDF (`ReportePdfExporter.java`)

- **Lib propuesta**: **Apache PDFBox 3.0.3** (a añadir a `pom.xml`).
- **Razón**: open source (licencia Apache 2.0, sin regalías). iText 7 es AGPL — exigiría abrir todo el código del proyecto bajo AGPL, no viable para un curso/proyecto integrador. PDFBox es más simple para reportes tabulares (sin layout complejo).
- **Layout** (sin imágenes, todo texto + tablas):
  1. **Header**: título "Reporte de Incidencias {rango}" + fecha de generación + filtros aplicados.
  2. **Sección KPIs**: tabla 2 columnas (etiqueta + valor).
  3. **Sección Por estado**: tabla fija (estado + total).
  4. **Sección Por categoría** + **Por prioridad** (mismo formato).
  5. **Sección Tendencia**: tabla bucket + total.
  6. **Sección Por agente** (si rol ADMIN/AGENTE): tabla con agente + métricas.
  7. **Footer**: número de página `Page X of Y` (PDFBox `PDPageContentStream` + `showText`).

> **NO incluir gráficos en el PDF** (RF-43 vive en la UI; el PDF refleja datos tabulares). Decisión Q1 a confirmar en spec phase.

### 3.5 Frontend: nueva página `/reportes`

#### 3.5.1 Estructura

```
frontend/src/pages/reportes/
  index.tsx                       # página principal
  components/
    reporte-filters.tsx           # form: rango fechas (preset + custom) + agente + granularidad
    reporte-preview-table.tsx     # tabla detalle top 50 (reutiliza estilo de recent-incidents-table)
    reporte-charts.tsx            # adapta dashboard-charts.tsx para serie temporal configurable
    reporte-export-buttons.tsx    # botones "Descargar PDF" / "Descargar Excel" (calls /api/reportes/exportar)
  data.ts                         # constantes: presets de fecha (último mes, trimestre, año)
  types.ts                        # tipos compartidos con services/reportes-service.ts
```

#### 3.5.2 Service (`frontend/src/services/reportes-service.ts`)

```ts
export const reportesService = {
  obtener(filtro: ReporteFiltro, signal?: AbortSignal): Promise<ReporteResponse>;
  descargarPdf(filtro: ReporteFiltro): Promise<Blob>;
  descargarExcel(filtro: ReporteFiltro): Promise<Blob>;
}
```

- Usa `src/lib/http.ts` (regla de `frontend/AGENTS.md`).
- Para los métodos `descargar*`, usa `http.get(url, { responseType: 'blob' })` y dispara descarga vía `URL.createObjectURL` + `<a download>`.

#### 3.5.3 UI

- Filtros arriba: `Select` (shadcn) para **preset** (`Último mes`, `Último trimestre`, `Último año`, `Personalizado`) + 2 `DatePicker` cuando es personalizado + `Select` para agente (de `/api/usuarios/agentes-asignables`, opcional) + `Select` para granularidad (`Diaria`, `Semanal`, `Mensual`).
- Centro: 4 `chart-card` (reutiliza `dashboard-charts.tsx` con props para serie temporal configurable) — by estado, by categoría, tendencia, por agente.
- Abajo: `reporte-preview-table.tsx` con top 50 detalle.
- Footer: 2 botones `Descargar PDF` / `Descargar Excel` (deshabilitados durante loading).
- Estado: `useState` para `filtro`, `reporte`, `loading`, `error`. `useEffect` carga al montar con defaults `desde=hace-30-días`, `hasta=hoy`, `granularidad=semanal`.

#### 3.5.4 Permisos por rol

- USUARIO: el dropdown "Agente" se **oculta** (no aplica scope).
- AGENTE: el dropdown muestra solo su propio nombre (opcionalmente selectable, pero el backend fuerza su id).
- ADMINISTRADOR: dropdown con todos los agentes.

### 3.6 Sidebar update (RF-45)

`frontend/src/layout/app-sidebar.tsx:20` ya tiene `{ label: "Reportes", icon: BarChart3 }` pero **sin `to`** — se renderiza como `<button>` muerto. Cambio mínimo:

```ts
{ label: "Reportes", icon: BarChart3, to: "/reportes" }
```

### 3.7 Ruta TanStack Router

Nueva entrada en `frontend/src/routes/__private.tsx` (o equivalente según convención del proyecto — confirmar en tasks T5b):

```ts
const route = createFileRoute("/_app/reportes")({
  component: ReportesPage,
})
```

### 3.8 Postman

- 2 requests nuevos en `sistemaincidencias/postman/SistemaIncidencias.postman_collection.json`, carpeta nueva **"Reportes"**:
  - `GET /api/reportes?desde=2026-06-14&hasta=2026-07-14&granularidad=semanal` (ADMIN).
  - `GET /api/reportes?desde=...&hasta=...&agenteId=...` (AGENTE drill-down).
  - `GET /api/reportes/exportar?...&formato=pdf` → guardar response como `*.pdf`.
  - `GET /api/reportes/exportar?...&formato=xlsx` → guardar response como `*.xlsx`.
- 4 ejemplos de respuesta: ADMIN JSON, AGENTE JSON, USUARIO JSON, ADMIN PDF binario.

### 3.9 SecurityConfig

**No requiere cambios**. `SecurityConfig.java` ya cubre `/api/**` con `.authenticated()` (per change B referencia). Los nuevos endpoints quedan cubiertos sin tocar la cadena.

### 3.10 Dependencias Maven

Añadir `pom.xml`:

```xml
<dependency>
    <groupId>org.apache.pdfbox</groupId>
    <artifactId>pdfbox</artifactId>
    <version>3.0.3</version>
</dependency>
```

> Apache POI (`poi-ooxml 5.3.0`) **ya está** — no se modifica.

## 4. Files affected

### Added (backend)

- `sistemaincidencias/src/main/java/com/integrador/sistemaincidencias/reportes/controller/ReporteController.java`
- `sistemaincidencias/src/main/java/com/integrador/sistemaincidencias/reportes/service/ReporteService.java`
- `sistemaincidencias/src/main/java/com/integrador/sistemaincidencias/reportes/dao/ReporteDao.java`
- `sistemaincidencias/src/main/java/com/integrador/sistemaincidencias/reportes/mapper/ReporteMapper.java`
- `sistemaincidencias/src/main/java/com/integrador/sistemaincidencias/reportes/sql/ReporteSql.java`
- `sistemaincidencias/src/main/java/com/integrador/sistemaincidencias/reportes/exporter/ReporteExcelExporter.java`
- `sistemaincidencias/src/main/java/com/integrador/sistemaincidencias/reportes/exporter/ReportePdfExporter.java`
- `sistemaincidencias/src/main/java/com/integrador/sistemaincidencias/reportes/dto/ReporteRequest.java`
- `sistemaincidencias/src/main/java/com/integrador/sistemaincidencias/reportes/dto/ReporteResponse.java`
- `sistemaincidencias/src/main/java/com/integrador/sistemaincidencias/reportes/dto/ReporteFiltroAplicado.java`
- `sistemaincidencias/src/main/java/com/integrador/sistemaincidencias/reportes/dto/ReporteKpiResponse.java`
- `sistemaincidencias/src/main/java/com/integrador/sistemaincidencias/reportes/dto/ReporteConteoEstadoResponse.java`
- `sistemaincidencias/src/main/java/com/integrador/sistemaincidencias/reportes/dto/ReporteConteoCategoriaResponse.java`
- `sistemaincidencias/src/main/java/com/integrador/sistemaincidencias/reportes/dto/ReporteConteoPrioridadResponse.java`
- `sistemaincidencias/src/main/java/com/integrador/sistemaincidencias/reportes/dto/ReporteTendenciaResponse.java`
- `sistemaincidencias/src/main/java/com/integrador/sistemaincidencias/reportes/dto/ReporteResumenAgenteResponse.java`

### Added (frontend)

- `frontend/src/pages/reportes/index.tsx`
- `frontend/src/pages/reportes/components/reporte-filters.tsx`
- `frontend/src/pages/reportes/components/reporte-preview-table.tsx`
- `frontend/src/pages/reportes/components/reporte-charts.tsx`
- `frontend/src/pages/reportes/components/reporte-export-buttons.tsx`
- `frontend/src/pages/reportes/data.ts`
- `frontend/src/pages/reportes/types.ts`
- `frontend/src/services/reportes-service.ts`

### Modified

- `sistemaincidencias/pom.xml` — agregar `pdfbox 3.0.3`.
- `frontend/src/layout/app-sidebar.tsx` (línea 20) — añadir `to: "/reportes"` al item Reportes.
- `frontend/src/routes/*` (o equivalente) — registrar ruta `/reportes`.
- `sistemaincidencias/postman/SistemaIncidencias.postman_collection.json` — agregar carpeta "Reportes" con 4 requests.

**No modificados**:
- `SecurityConfig.java` (ya cubierto por `requestMatchers("/api/**").authenticated()`).
- `IncidenciaController`, `DashboardController`, `IncidenciaDao`, `DashboardDao` (los reportes **leen** de `incidencias`; no mutan).

## 5. Open questions — to resolve before spec phase

**Q1 (CRÍTICO — bloqueante para spec):**
Librería PDF para el exportador.

- **A.** **Apache PDFBox 3.0.3** (open source, Apache 2.0, sin regalías, simple para tablas). (Propuesta — recomendada.)
- **B.** iText 7 (más rico para layouts complejos, pero **AGPL** — exigiría abrir todo el proyecto bajo AGPL, no viable).
- **C.** OpenPDF (fork open source de iText 4 / LGPL). Intermedio, pero menos mantenido.

**Q2 (CRÍTICO — bloqueante para spec):**
Presets de fecha en la UI.

- **A.** **Ambos**: dropdown de preset (`Último mes`, `Último trimestre`, `Último año`, `Personalizado`) + 2 `DatePicker` cuando es personalizado. (Propuesta — UX completa sin sobrecargar.)
- **B.** Solo presets, sin custom range. (Más simple pero menos flexible para análisis ad-hoc.)
- **C.** Solo custom range (2 inputs fecha). (Más flexible pero menos descubrible.)

**Q3 (CRÍTICO — bloqueante para spec):**
Granularidad de la serie temporal.

- **A.** **Diaria / Semanal / Mensual** seleccionable, default `Semanal`. (Propuesta — alineada con RF-09.)
- **B.** Fija `Semanal`. (Más simple, pero pierde análisis diario para rangos cortos.)
- **C.** Auto-switch: diaria si `rango <= 30d`, semanal si `30d < rango <= 180d`, mensual en caso contrario.

**Q4 (CRÍTICO — bloqueante para spec):**
Drill-down por agente individual (`agenteId` en query).

- **A.** **Sí**, opcional. Cuando se envía, el reporte filtra a las incidencias de ese agente. (Propuesta — habilita RF-42 "reporte por agente".)
- **B.** Sí, pero solo ADMINISTRADOR puede enviarlo (AGENTE/USUARIO lo ignoran).
- **C.** No — solo reporte global por período (RF-42 se cubre con `resumenPorAgente` agregado, no drill-down).

**Q5 (NO bloqueante — default propuesto):**
Generación síncrona vs asíncrona.

- **A.** **Síncrona** — controller devuelve `byte[]` directamente. (Propuesta — dataset esperado < 50k filas; latencia < 3s aceptable.)
- **B.** Asíncrona con job queue (Spring `@Async` + tabla `reporte_jobs` + polling/SSE). (Más robusto para datasets grandes; **out of scope** para V1.)

## 6. Out of scope (explicit non-requirements)

- **Reportes programados / email delivery** (cron + SMTP): fuera de V1.
- **Plantillas de reporte personalizables por usuario**: solo plantilla fija del sistema.
- **Integración BI externa** (Metabase, PowerBI, Superset).
- **Webhooks** (notificar al completar un export).
- **Multi-tenant scoping** (single-tenant asume este proyecto).
- **Versionado de reportes / historial**: cada export es one-shot, no se archiva.
- **Cache del backend** (Caffeine, Redis): primera versión SQL directo. Si RNF-01 falla, follow-up.
- **Gráficos embebidos en el PDF** (RF-43 vive en la UI; el PDF es tabular). Si Q1 confirma PDFBox, en follow-up se evalúa soporte de charts.
- **Drill-down desde gráfico a lista filtrada** (UX follow-up).
- **Modificación del frontend `/incidencias`** (este change solo agrega `/reportes`).
- **Cambio al módulo de notificaciones** (RF-37..40 vive en su propio change).
- **Soporte multi-formato adicional** (CSV, JSON exportado como archivo): no en V1.

## 7. Dependencies

- **Hard — change A** `incidencias-rbac-agente` (archived en master): patrón `validarAutenticado` + scope-por-rol en controller.
- **Hard — change B** `dashboard-real` (archived en master 850fd8e): agregaciones SQL parametrizadas + `IncidenciaResumenResponse` slim DTO reusado en `detalle`.
- **Hard — endpoint existente** `GET /api/usuarios/agentes-asignables` (en `UsuarioController:52`): reusado para el dropdown de la UI. No se crea `/api/reportes/agentes`.
- **Soft — skill** `frontend/.agents/skills/gestincidencias-frontend/SKILL.md` (estructura `services/` + `pages/`).
- **Maven nueva**: `org.apache.pdfbox:pdfbox:3.0.3`.
- **Maven existente**: `org.apache.poi:poi-ooxml:5.3.0` (sin cambios).
- **Sin nuevos paquetes npm** (Recharts + shadcn ya disponibles per change B).

## 8. Risk & review workload forecast

- **Líneas estimadas**: ~700-900 total
  - Backend: ~500 (controller 50, service 100, dao 110, sql 30, mapper 30, 9 dtos ~90, exporter Excel 60, exporter PDF 80).
  - Frontend: ~250 (page 50, 4 components 130, service 40, types/data 30).
  - Postman: ~50 (4 requests con ejemplos).
  - Config: ~20 (pom + sidebar + ruta).
- **Riesgos funcionales**:
  - **Memoria en Excel**: con > 50k filas, `SXSSFWorkbook` requiere `dispose()` explícito en `try-with-resources`. Documentado en tasks T2b.
  - **Memoria en PDF**: PDFBox carga todo en `PDDocument`; mismo `try-with-resources`.
  - **i18n labels del PDF**: headers en español ("Reporte de Incidencias", "Total asignadas"). Centralizar en `messages.properties` si se requiere i18n futuro.
  - **Granularidad `diaria` con rango `all`**: podría generar miles de buckets. Mitigación: limitar a 365 buckets máximos en la query (`LIMIT 365`) o switch a `semanal` automáticamente.
  - **Drill-down por agente sin métricas** (agente sin incidencias en rango): `promedioResolucionHoras = null`, no `0.0`, para distinguir de "resolvió en 0h".
- **No riesgos**:
  - Sin nuevos permisos en `SecurityConfig`.
  - Sin impacto en endpoints existentes (solo lectura de `incidencias`).
  - Sin nuevas entidades / migraciones SQL.

## 9. Acceptance criteria (high-level — refined in spec phase)

- `GET /api/reportes?desde=&hasta=&granularidad=semanal` retorna 200 con la forma `ReporteResponse` para los 3 roles.
- ADMIN recibe todas las incidencias del rango; AGENTE recibe solo las asignadas a él; USUARIO recibe solo las que creó.
- `total == sum(byEstadoAprobacion)` y `total == sum(byEstadoProceso)` (consistencia interna).
- `byCategoria` y `byPrioridad` no incluyen claves con 0 incidencias en el rango.
- `tendencia` retorna puntos ordenados cronológicamente ascendente, con bucketInicio respetando la granularidad.
- `resumenPorAgente` es **vacío** para USUARIO; para ADMIN y AGENTE, una fila por agente con al menos 1 incidencia en el rango.
- `tiempoPromedioResolucionHoras` es `0.0` si no hay finalizadas en el rango; coincide con cálculo manual en `psql`.
- `GET /api/reportes/exportar?formato=pdf` retorna `Content-Type: application/pdf` con `Content-Disposition: attachment`. El PDF se abre en lectores estándar (Adobe, Chrome) y muestra las 6 secciones.
- `GET /api/reportes/exportar?formato=xlsx` retorna `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`. El XLSX abre en Excel/LibreOffice con 6-7 hojas según rol.
- P95 de la llamada JSON < 2s con dataset de smoke (< 5000 incidencias). P95 de exportación binaria < 5s.
- Frontend `/reportes` muestra los filtros, 4 cards de gráficos, tabla de detalle top 50 y 2 botones de export. Al cambiar cualquier filtro, refetchea. Los botones se deshabilitan durante loading.
- USUARIO NO ve el dropdown "Agente"; AGENTE ve el dropdown pero el backend fuerza su id.
- Sidebar `app-sidebar.tsx:20` ahora navega a `/reportes` (es `<Link>` con `to`, no `<button>`).
- `npm run lint` y `npm run build` pasan limpios.
- `./mvnw compile` sin errores.
- Postman collection incluye 4 requests en carpeta "Reportes".

## 10. Follow-ups (future SDD changes)

- Cache Caffeine del endpoint si RNF-01 no se cumple en producción.
- Generación asíncrona de exports grandes (job queue + polling).
- Gráficos embebidos en PDF (si la lib lo soporta limpiamente).
- Reportes programados / email delivery.
- Drill-down chart → lista filtrada (UX).
- Export CSV / JSON.
- Multi-tenant scoping si el proyecto pasa a SaaS.

## 11. References

- `docs/requerimientos.md` §1.6 (RF-41..44) y §1.7 (RF-45 sidebar).
- `docs/analisis_uml_planeacion.md` líneas 577-579 (`GET /api/reportes`, `GET /api/reportes/exportar`).
- `sistemaincidencias/AGENTS.md` líneas 148 (paquete `reportes`), 234-256 (DAO + SQL), 360-386 (endpoints base), 446-454 (Postman sync), 585 (orden implementación paso 13 = "Reportes con Apache POI").
- `sistemaincidencias/pom.xml` (Apache POI 5.3.0 ya incluido; PDFBox a añadir).
- `frontend/src/layout/app-sidebar.tsx:20` (item Reportes sin `to` — bug a corregir).
- `frontend/src/pages/` (no existe `reportes/`).
- `sistemaincidencias/.../usuarios/controller/UsuarioController.java:52` (`/api/usuarios/agentes-asignables` — reusado).
- `openspec/changes/archive/incidencias-rbac-agente/proposal.md` (patrón scope-por-rol).
- `openspec/changes/archive/dashboard-real/proposal.md` (agregaciones SQL parametrizadas + `IncidenciaResumenResponse` reusado).
- `frontend/.agents/skills/gestincidencias-frontend/SKILL.md` (estructura de página).
- `frontend/AGENTS.md` (rutas privadas, `src/lib/http.ts`, Postman sync).
- Engram topic `audit/requirements-coverage` (#794) — gap matrix RF-41..44 + RF-45 sidebar.