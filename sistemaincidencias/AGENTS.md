# AGENTS.md - Guia de trabajo del proyecto

Este archivo define las reglas que deben seguir los agentes al trabajar dentro del proyecto `sistemaincidencias`.

Antes de crear modelos, DAOs, SQL o mappers, revisar el contexto del DER en:

`docs/modelo_datos_der.md`

## Objetivo del proyecto

Construir un Sistema de Gestion de Incidencias con Java Spring Boot. El sistema debe permitir autenticacion, gestion de incidencias, aprobaciones, estados operativos, comentarios, adjuntos, usuarios, aplicativos cliente, categorias, notificaciones, dashboard y reportes.

## Regla tecnica principal

No usar:

- Spring Data JPA.
- JPA.
- Hibernate.
- JPQL.
- Anotaciones ORM como `@Entity`, `@Table`, `@Id`, `@OneToMany`, `@ManyToOne`, etc.

El acceso a base de datos debe hacerse con SQL nativo parametrizado.

El patron obligatorio para acceso a datos es DAO.

En este proyecto, el DAO reemplaza la idea de `Repository` de Spring Data. Es decir:

- No crear interfaces `extends JpaRepository`.
- No crear repositories de Spring Data.
- Crear clases DAO propias como `IncidenciaDao`, `UsuarioDao`, `CategoriaDao`.
- Cada DAO debe tener metodos claros de persistencia como `insertar`, `actualizar`, `buscarPorId`, `listar`, `eliminar`.
- El DAO no debe contener reglas de negocio; solo acceso a datos, SQL y mapeo delegado.

Se permite usar:

- `java.sql.Connection`, `PreparedStatement` y `ResultSet`.
- `DataSource`.
- `JdbcTemplate` solo si el docente lo acepta. Si hay duda, preferir `java.sql` manual.

## Arquitectura obligatoria

Trabajar por modulos funcionales. Cada modulo debe mantener separadas sus responsabilidades:

- `controller`: expone endpoints REST.
- `service`: contiene reglas de negocio, validaciones, transacciones y orquestacion.
- `dao`: implementa el patron DAO y ejecuta SQL nativo contra la base de datos. En este proyecto cumple el rol de capa repository, pero sin Spring Data.
- `mapper`: convierte `ResultSet` a objetos Java.
- `sql`: contiene constantes o builders de consultas SQL.
- `model`: clases POJO del dominio, sin ORM.
- `dto`: requests y responses de la API.

No poner SQL en controllers.
No poner reglas de negocio importantes en DAOs.
No devolver modelos internos directamente si existe un DTO adecuado.
No llamar a DAOs directamente desde controllers; siempre pasar por services.

## Programacion funcional

Usar programacion funcional de forma moderada y legible, especialmente en transformaciones, validaciones simples y conversiones de datos.

Aplicar cuando aporte claridad:

- `Optional<T>` para resultados que pueden no existir, por ejemplo `buscarPorId`.
- `Stream` para transformar listas, filtrar colecciones y mapear modelos a DTOs.
- `map`, `filter`, `orElseThrow`, `orElse`, `ifPresent` en flujos simples.
- Referencias a metodos cuando mejoren lectura.
- Funciones auxiliares pequeñas para validaciones reutilizables.

Evitar:

- Streams demasiado largos o dificiles de depurar.
- Lambdas con muchas lineas.
- Meter reglas transaccionales complejas dentro de streams.
- Usar programacion funcional para ocultar errores o excepciones importantes.

Ejemplo recomendado:

```java
return incidenciaDao.listar(filtro, pageRequest)
    .stream()
    .map(incidenciaMapper::toResumenResponse)
    .toList();
```

Ejemplo para busqueda:

```java
Incidencia incidencia = incidenciaDao.buscarPorId(id)
    .orElseThrow(() -> new RecursoNoEncontradoException("Incidencia no encontrada"));
```

## Paquetes recomendados

Usar como paquete base:

`com.integrador.sistemaincidencias`

Estructura sugerida:

```text
com.integrador.sistemaincidencias
  auth
    controller
    service
    dto
    jwt
  usuarios
    controller
    service
    dao
    mapper
    model
    dto
    sql
  incidencias
    controller
    service
    dao
    mapper
    model
    dto
    sql
  aplicativos
    controller
    service
    dao
    mapper
    model
    dto
    sql
  catalogos
    controller
    service
    dao
    mapper
    model
    dto
    sql
  notificaciones
    controller
    service
    dao
    mapper
    model
    dto
    sql
  reportes
    controller
    service
    dto
    exporter
  auditoria
    service
    dao
    mapper
    model
    sql
  shared
    exception
    validation
    response
    util
    pagination
    config
```

## Modelos principales

Mantener estos modelos del dominio:

- `Rol`
- `Usuario`
- `AplicativoCliente`
- `UsuarioExterno`
- `Categoria`
- `EstadoAprobacion`
- `EstadoProceso`
- `Incidencia`
- `Comentario`
- `Adjunto`
- `Aprobacion`
- `Notificacion`
- `HistorialIncidencia`

`Prioridad` debe manejarse como enum:

- `BAJA`
- `MEDIA`
- `ALTA`
- `CRITICA`

## Estados del sistema

La incidencia tiene dos dimensiones de estado:

### Estado de aprobacion

Representa la decision sobre la solicitud:

- `SOLICITADA`: estado inicial.
- `APROBADA`: decision positiva.
- `RECHAZADA`: decision negativa.

### Estado de proceso

Representa el avance operativo de atencion:

- `PENDIENTE`: estado inicial operativo.
- `EN_PROCESO`: incidencia en atencion.
- `FINALIZADA`: estado terminal operativo.

Reglas:

- Una incidencia nueva inicia como `SOLICITADA`.
- Si se aprueba, puede iniciar o continuar su proceso operativo en `PENDIENTE`.
- Si se rechaza, no debe avanzar a `EN_PROCESO`.
- El flujo de proceso debe respetar el campo `orden` de la tabla de estados.
- Si un estado de proceso es terminal, registrar `resueltoEn`.

## AplicativoCliente

La tabla `clientes` del DER debe tratarse en codigo como `AplicativoCliente`.

Representa el aplicativo o sistema de la empresa desde donde vienen las incidencias.

Debe permitir:

- Identificar origen de incidencia.
- Manejar `apiKey`.
- Asociar usuarios externos.
- Asociar categorias propias por aplicativo.

## Reglas de persistencia

Cada DAO debe:

- Usar SQL nativo.
- Usar parametros, nunca concatenar valores del usuario.
- Mapear resultados mediante `mapper`.
- Manejar `UUID`.
- Retornar `Optional<T>` cuando busque por id.
- Separar consultas largas en clases `Sql`.
- Representar la capa de persistencia/repository del proyecto sin depender de Spring Data.

Ejemplo de clases esperadas:

- `IncidenciaDao`
- `IncidenciaSql`
- `IncidenciaMapper`
- `UsuarioDao`
- `UsuarioSql`
- `UsuarioMapper`

No usar nombres como `IncidenciaRepository` salvo que el docente lo pida explicitamente. Para mantener claro el patron, preferir siempre el sufijo `Dao`.

Para filtros y paginacion usar SQL con:

- `WHERE`
- `ORDER BY`
- `LIMIT`
- `OFFSET`

Crear clases auxiliares como:

- `PageRequest`
- `PageResult<T>`
- `SortRequest`

## Transacciones

Las operaciones que afecten varias tablas deben ejecutarse de forma transaccional desde el service.

Ejemplos:

- Crear incidencia + registrar historial + crear notificacion.
- Aprobar incidencia + registrar aprobacion + registrar historial + notificar.
- Cambiar estado + registrar historial + notificar.
- Agregar comentario + registrar historial + notificar.

Si se usa `JdbcTemplate`, puede usarse `@Transactional`.
Si se usa `java.sql` manual, controlar `commit` y `rollback` con cuidado.

## Seguridad

Implementar:

- Login con credenciales.
- Password cifrado con `PasswordEncoder`.
- JWT si el alcance lo requiere.
- Validacion de usuario activo.
- Control de acceso por roles.

Roles minimos:

- `ADMINISTRADOR`
- `AGENTE`
- `USUARIO`

Reglas:

- Un usuario inactivo no puede iniciar sesion.
- Solo administrador gestiona usuarios, roles, estados, categorias y aplicativos.
- Agente puede atender, aprobar/rechazar y cambiar estados segun permisos.
- Usuario puede crear incidencias, consultar las suyas, comentar y adjuntar evidencia.

## Librerias del curso

Usar estas librerias cuando corresponda:

### Lombok

Usar en modelos, DTOs y clases simples:

- `@Getter`
- `@Setter`
- `@Builder`
- `@NoArgsConstructor`
- `@AllArgsConstructor`

Evitar abusar de `@Data` en clases donde `equals` o `hashCode` puedan ser delicados.

### Google Guava

Usar para:

- Utilidades de colecciones.
- Validaciones auxiliares.
- Cache local simple de catalogos de baja variacion, si se justifica.

No usar Guava para reemplazar reglas de negocio claras.

### Apache POI

Usar para:

- Exportar reportes a Excel.
- Generar hojas con metricas por estado, categoria, agente y periodo.

### Apache Commons

Usar para:

- Validacion de strings.
- Manejo de nombres de archivos.
- Extension y tipo de adjuntos.
- Utilidades de IO si se almacenan evidencias localmente.

### Logback

Configurar logs para:

- Errores.
- Login exitoso/fallido.
- Creacion de incidencias.
- Aprobaciones y rechazos.
- Cambios de estado.
- Operaciones administrativas.

## Endpoints base

Mantener rutas REST consistentes:

- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/incidencias`
- `GET /api/incidencias`
- `GET /api/incidencias/{id}`
- `PUT /api/incidencias/{id}`
- `PATCH /api/incidencias/{id}/estado`
- `PATCH /api/incidencias/{id}/aprobacion`
- `POST /api/incidencias/{id}/comentarios`
- `POST /api/incidencias/{id}/adjuntos`
- `GET /api/usuarios`
- `POST /api/usuarios`
- `GET /api/aplicativos`
- `POST /api/aplicativos`
- `GET /api/categorias`
- `POST /api/categorias`
- `GET /api/estados-proceso`
- `GET /api/estados-aprobacion`
- `GET /api/dashboard`
- `GET /api/reportes`
- `GET /api/reportes/exportar`
- `GET /api/notificaciones`

## Reglas de negocio importantes

- El correo de usuario debe ser unico.
- La categoria no debe eliminarse si tiene incidencias asociadas.
- El rol no debe eliminarse si tiene usuarios asignados.
- Toda accion critica debe registrar historial o log.
- Las notificaciones se generan al asignar, aprobar/rechazar, cambiar estado o comentar.
- Los filtros de incidencias deben soportar texto, estado de aprobacion, estado de proceso, prioridad, categoria, fechas, responsable y aplicativo.
- La paginacion debe evitar cargar todos los registros en memoria.

## Base de datos

Crear scripts SQL para:

- Tablas.
- Llaves primarias y foraneas.
- Indices.
- Datos iniciales.

Datos iniciales obligatorios:

- Roles: `ADMINISTRADOR`, `AGENTE`, `USUARIO`.
- Estados de aprobacion: `SOLICITADA`, `APROBADA`, `RECHAZADA`.
- Estados de proceso: `PENDIENTE`, `EN_PROCESO`, `FINALIZADA`.

Guardar scripts en una carpeta clara, por ejemplo:

```text
src/main/resources/db/scripts
```

## Orden de implementacion recomendado

1. Configuracion base, dependencias y paquetes.
2. Modelos POJO.
3. Scripts SQL de base de datos.
4. DAOs, SQL y mappers de catalogos.
5. Usuarios, roles y autenticacion.
6. Aplicativos cliente y categorias.
7. Incidencias con CRUD y filtros.
8. Aprobacion/rechazo.
9. Cambio de estado operativo.
10. Historial, comentarios y adjuntos.
11. Notificaciones.
12. Dashboard.
13. Reportes con Apache POI.
14. Pruebas y ajustes.

## Pruebas

Priorizar pruebas para:

- Servicios de negocio.
- DAOs con SQL real controlado.
- Filtros y paginacion.
- Seguridad por roles.
- Cambios de estado.
- Aprobacion y rechazo.

## Estilo de codigo

- Usar nombres en espanol si el resto del proyecto esta en espanol.
- Mantener metodos pequenos y claros.
- No duplicar SQL complejo.
- No mezclar controller, service y dao.
- No introducir frameworks no solicitados.
- Documentar solo lo necesario.
- Preferir errores claros mediante excepciones propias en `shared.exception`.
