# Capability Spec: `reportes` — Reportes con export PDF/Excel

**Capability**: `reportes` (NEW)
**Project**: sistema-incidencias
**Change**: `reportes-export`
**Scope**: Backend (new `reportes/` module with 2 endpoints + 2 exporters) + Frontend (new `/reportes` page with filter form + preview + charts + export buttons).

> **Roles canónicos**: `ADMINISTRADOR`, `AGENTE`, `USUARIO`.
>
> **Decisiones resueltas**: PDF con Apache PDFBox 3.x; rangos `7d`, `30d`, `90d`, `all` más fechas personalizadas; granularidad `diaria`, `semanal`, `mensual` con default `semanal`; `agenteId` opcional; exportación síncrona.

## ADDED Requirements

### Requirement: `GET /api/reportes` con datos JSON

El backend **MUST** exponer `GET /api/reportes` autenticado y devolver 200 con `filtro`, `kpis`, `byCategoria`, `tendencia`, `resumenPorAgente`, `tiempoPromedioResolucionHoras` y `detalle`. Los filtros aceptados **MUST** ser `desde`, `hasta`, `agenteId` y `granularidad`; `detalle` **MUST** contener como máximo las 50 incidencias más recientes del alcance.

#### Scenario: ADMINISTRADOR sin filtro ve todas las incidencias
- GIVEN un JWT válido de `ADMINISTRADOR` y 20 incidencias visibles dentro del rango aplicado
- WHEN solicita `GET /api/reportes` sin `agenteId`
- THEN THE SYSTEM retorna 200 y calcula todos los bloques con las 20 incidencias.

#### Scenario: AGENTE ve solo las suyas
- GIVEN un JWT válido de `AGENTE` con 4 incidencias asignadas y otras 16 asignadas a terceros
- WHEN solicita `GET /api/reportes`
- THEN THE SYSTEM retorna 200 y calcula todos los bloques únicamente con sus 4 incidencias asignadas.

#### Scenario: USUARIO ve solo las que creó
- GIVEN un JWT válido de `USUARIO` que creó 6 de las 20 incidencias del rango
- WHEN solicita `GET /api/reportes`
- THEN THE SYSTEM retorna 200 y calcula todos los bloques únicamente con esas 6 incidencias.

#### Scenario: filtro `desde` + `hasta` aplica rango
- GIVEN incidencias dentro y fuera del rango solicitado
- WHEN solicita `GET /api/reportes?desde=2026-07-01&hasta=2026-07-31`
- THEN THE SYSTEM incluye solo incidencias cuyo `creadoEn` pertenece inclusivamente a ambas fechas.

#### Scenario: filtro `agenteId` aplica drill-down
- GIVEN un `ADMINISTRADOR` y un agente con 3 incidencias dentro del rango
- WHEN solicita `GET /api/reportes?agenteId={id}`
- THEN THE SYSTEM retorna métricas, serie y detalle derivados únicamente de esas 3 incidencias.

#### Scenario: parámetro `granularidad` afecta buckets
- GIVEN incidencias distribuidas en varios días, semanas y meses
- WHEN solicita el reporte con `granularidad=diaria`, `semanal`, `mensual` y sin el parámetro
- THEN THE SYSTEM agrupa por inicio de día, semana ISO o mes respectivamente, ordena ascendentemente y usa `semanal` por defecto.

#### Scenario: token inválido retorna 401
- GIVEN una solicitud con JWT ausente, vencido o malformado
- WHEN solicita `GET /api/reportes`
- THEN THE SYSTEM retorna 401 sin exponer datos del reporte.

### Requirement: `GET /api/reportes/exportar` con descarga PDF/XLSX

El backend **MUST** generar de forma síncrona el mismo dataset autorizado que la vista JSON para `formato=pdf|xlsx`, retornarlo como attachment y **MUST NOT** crear jobs ni requerir polling.

#### Scenario: `formato=pdf` retorna `Content-Type: application/pdf`
- GIVEN un usuario autenticado y un filtro válido
- WHEN solicita `GET /api/reportes/exportar?...&formato=pdf`
- THEN THE SYSTEM retorna 200 con `Content-Type: application/pdf` y `Content-Disposition` con nombre `.pdf`.

#### Scenario: `formato=xlsx` retorna `application/vnd.openxmlformats`
- GIVEN un usuario autenticado y un filtro válido
- WHEN solicita `GET /api/reportes/exportar?...&formato=xlsx`
- THEN THE SYSTEM retorna 200 con `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` y nombre `.xlsx`.

#### Scenario: formato inválido retorna 400
- GIVEN un usuario autenticado
- WHEN solicita `GET /api/reportes/exportar?formato=csv`
- THEN THE SYSTEM retorna 400 con un error de validación y no genera archivo.

#### Scenario: rango sin datos retorna PDF/XLSX vacío con header
- GIVEN un rango válido sin incidencias dentro del alcance del usuario
- WHEN exporta en PDF o XLSX
- THEN THE SYSTEM retorna un archivo válido con encabezado y estructura de columnas, sin filas de detalle.

### Requirement: Reporte por período (RF-41)

El sistema **MUST** filtrar reportes y exportaciones por fechas calendario inclusivas y **MUST** ofrecer presets junto con un rango personalizado.

#### Scenario: `desde`/`hasta` respetan inclusivo en timestamps
- GIVEN incidencias en `desde 00:00:00`, en `hasta 23:59:59.999999` y fuera de ambos límites
- WHEN aplica ese rango personalizado
- THEN THE SYSTEM incluye las dos incidencias limítrofes y excluye las exteriores.

#### Scenario: preset `7d` / `30d` / `90d` / `all`
- GIVEN la fecha actual y un historial con más de 90 días
- WHEN selecciona cada preset
- THEN THE SYSTEM aplica los últimos 7, 30 o 90 días calendario inclusivos; `all` elimina el límite temporal; el default es `30d`.

### Requirement: Reporte por agente (RF-42)

El sistema **MUST** permitir drill-down por `agenteId` dentro del alcance autorizado y exponer métricas por agente visible.

#### Scenario: `agenteId` filtra a un solo agente
- GIVEN un `ADMINISTRADOR` con acceso a varios agentes
- WHEN aplica el `agenteId` de uno de ellos
- THEN THE SYSTEM limita KPIs, distribuciones, tendencia, resumen y detalle a ese agente.

#### Scenario: sin `agenteId` incluye todos los agentes visibles
- GIVEN incidencias asignadas a varios agentes dentro del alcance por rol
- WHEN solicita el reporte sin `agenteId`
- THEN THE SYSTEM incluye una entrada de `resumenPorAgente` por cada agente visible con incidencias.

### Requirement: Gráficos en reporte (RF-43)

La respuesta JSON **MUST** incluir datos aptos para visualizaciones y una serie temporal coherente con la granularidad aplicada.

#### Scenario: respuesta JSON incluye serie temporal por granularidad
- GIVEN incidencias visibles distribuidas en el rango
- WHEN solicita `GET /api/reportes` con una granularidad válida
- THEN THE SYSTEM retorna `tendencia[]` con `bucketInicio` y `total` en orden cronológico ascendente.

#### Scenario: serie vacía cuando no hay datos
- GIVEN un rango sin incidencias visibles
- WHEN solicita `GET /api/reportes`
- THEN THE SYSTEM retorna 200 con `tendencia=[]` y visualizaciones sin valores inventados.

### Requirement: Exportación PDF/Excel (RF-44)

Los archivos **MUST** preservar filtros y alcance por rol. El PDF **MUST** ser legible por visores estándar y el XLSX **MUST** abrir en Excel o LibreOffice.

#### Scenario: PDF incluye header + tabla + chart image
- GIVEN un reporte con datos y una serie temporal
- WHEN exporta con `formato=pdf`
- THEN THE SYSTEM genera un PDF con título, rango/filtros, tabla de datos y una imagen del gráfico de tendencia.

#### Scenario: XLSX incluye header + hoja Datos + hoja Charts
- GIVEN un reporte con datos y visualizaciones
- WHEN exporta con `formato=xlsx`
- THEN THE SYSTEM genera un workbook con encabezados, hoja `Datos` y hoja `Charts` con gráfico o imagen equivalente.

### Requirement: Frontend `/reportes` page

La aplicación **MUST** exponer `/reportes` como página privada, consumir los endpoints de reportes y mantener preview y exportaciones sincronizados con el filtro activo.

#### Scenario: filter form con presets + custom inputs + agente dropdown
- GIVEN un usuario autenticado en `/reportes`
- WHEN visualiza y modifica los filtros
- THEN THE SYSTEM muestra `7d|30d|90d|all`, fechas personalizadas, granularidad y selector de agente según su rol.

#### Scenario: tabla preview muestra mismas columnas que XLSX
- GIVEN una respuesta JSON con `detalle`
- WHEN la página renderiza el preview
- THEN THE SYSTEM muestra las mismas columnas de detalle y el mismo orden definidos en la hoja `Datos` del XLSX.

#### Scenario: botones de exportación disparan descarga
- GIVEN un reporte cargado con filtros válidos
- WHEN pulsa `Exportar PDF` o `Exportar Excel`
- THEN THE SYSTEM llama `/api/reportes/exportar` con el formato y filtros activos e inicia la descarga correspondiente.

#### Scenario: estado loading mientras carga
- GIVEN una carga o exportación en curso
- WHEN la solicitud aún no finaliza
- THEN THE SYSTEM muestra estado de carga y deshabilita acciones que puedan duplicar la solicitud.

#### Scenario: error toast en fallo de red
- GIVEN la página con o sin un último reporte válido
- WHEN la carga o exportación falla por red o respuesta 5xx
- THEN THE SYSTEM muestra un toast no bloqueante y conserva el último preview válido, si existe.

### Requirement: Sidebar link

El sidebar **MUST** ofrecer navegación funcional a `/reportes` para los tres roles autenticados.

#### Scenario: link `Reportes` aparece para ADMINISTRADOR, AGENTE, USUARIO
- GIVEN una sesión válida de cualquiera de los tres roles
- WHEN se renderiza el sidebar privado
- THEN THE SYSTEM muestra el enlace `Reportes`.

#### Scenario: link clickeable navega a `/reportes`
- GIVEN el enlace `Reportes` visible
- WHEN el usuario lo activa
- THEN THE SYSTEM navega a `/reportes` sin recargar toda la aplicación.

### Requirement: Per-role scope

El backend **MUST** aplicar el alcance por rol en JSON y exportaciones: sin restricción adicional para `ADMINISTRADOR`, `asignado_a=currentUser.id` para `AGENTE` y `creado_por_usuario_id=currentUser.id` para `USUARIO`.

#### Scenario: ADMINISTRADOR ve todas las métricas
- GIVEN un JWT válido de `ADMINISTRADOR`
- WHEN consulta o exporta un reporte sin `agenteId`
- THEN THE SYSTEM incluye todas las incidencias del período solicitado.

#### Scenario: AGENTE solo ve sus incidencias
- GIVEN un JWT válido de `AGENTE` y una solicitud manipulada con el `agenteId` de otro agente
- WHEN consulta o exporta el reporte
- THEN THE SYSTEM fuerza su propio id y nunca incluye incidencias asignadas a terceros.

#### Scenario: USUARIO solo ve las suyas
- GIVEN un JWT válido de `USUARIO` y cualquier `agenteId` enviado por el cliente
- WHEN consulta o exporta el reporte
- THEN THE SYSTEM ignora `agenteId` e incluye solo incidencias creadas por ese usuario.
