# Modelo de datos DER - Sistema de Incidencias

Este documento transcribe el diagrama entidad-relacion para usarlo como contexto al modelar clases, DAOs, SQL y mappers.

Imagen base: `../../proyecto/DIagrama Entidad Relacion.jpeg`

## Convenciones de modelado

- La base de datos usa identificadores `uuid`.
- El proyecto no debe usar JPA, Hibernate, Spring Data ni JPQL.
- Las tablas se consultan con SQL nativo desde clases DAO.
- En codigo, la tabla `clientes` debe representarse como `AplicativoCliente`, porque identifica el aplicativo o sistema origen de las incidencias.
- Las relaciones se implementan mediante llaves foraneas y se resuelven en DAOs con `JOIN` cuando sea necesario.

## Tablas principales

### roles

Catalogo de roles internos del sistema.

| Campo | Tipo | Descripcion |
|---|---|---|
| `id` | uuid | Llave primaria. |
| `codigo` | varchar | Codigo unico del rol. Ejemplo: `ADMINISTRADOR`, `AGENTE`, `USUARIO`. |
| `nombre` | varchar | Nombre visible del rol. |
| `descripcion` | varchar | Descripcion funcional del rol. |
| `activo` | boolean | Indica si el rol esta disponible. |

Relaciones:

- `roles.id` se referencia desde `usuarios.rol_id`.

### usuarios

Usuarios internos que acceden al backoffice.

| Campo | Tipo | Descripcion |
|---|---|---|
| `id` | uuid | Llave primaria. |
| `nombre` | varchar | Nombre del usuario. |
| `email` | varchar | Correo de acceso. Debe ser unico. |
| `password_hash` | varchar | Contrasena cifrada. |
| `rol_id` | uuid | FK hacia `roles.id`. |
| `activo` | boolean | Indica si el usuario puede iniciar sesion. |
| `avatar_url` | varchar | URL o ruta del avatar. |
| `creado_en` | timestamp | Fecha de creacion. |
| `actualizado_en` | timestamp | Fecha de ultima actualizacion. |

Relaciones:

- Muchos usuarios pertenecen a un rol.
- Un usuario puede crear muchas incidencias mediante `incidencias.creado_por_usuario_id`.
- Un usuario puede tener muchas incidencias asignadas mediante `incidencias.asignado_a`.
- Un usuario puede escribir muchos comentarios.
- Un usuario puede subir muchos adjuntos.
- Un usuario puede revisar muchas aprobaciones.
- Un usuario puede recibir muchas notificaciones.
- Un usuario puede generar muchos registros de historial.

### clientes

Representa aplicativos cliente o sistemas de la empresa desde donde se registran incidencias.

Nombre recomendado en codigo: `AplicativoCliente`.

| Campo | Tipo | Descripcion |
|---|---|---|
| `id` | uuid | Llave primaria. |
| `nombre` | varchar | Nombre del aplicativo cliente. |
| `api_key` | varchar | Clave usada para identificar o integrar el aplicativo. |
| `activo` | boolean | Indica si el aplicativo esta habilitado. |
| `creado_en` | timestamp | Fecha de creacion. |

Relaciones:

- Un aplicativo cliente tiene muchos usuarios externos.
- Un aplicativo cliente tiene muchas categorias.
- Un aplicativo cliente puede originar muchas incidencias.
- Un aplicativo cliente puede asociarse a muchas notificaciones.

### usuarios_externos

Usuarios provenientes de aplicativos cliente externos.

| Campo | Tipo | Descripcion |
|---|---|---|
| `id` | uuid | Llave primaria. |
| `cliente_id` | uuid | FK hacia `clientes.id`. |
| `external_id` | varchar | Identificador del usuario en el aplicativo origen. |
| `nombre` | varchar | Nombre del usuario externo. |
| `email` | varchar | Correo del usuario externo. |

Relaciones:

- Muchos usuarios externos pertenecen a un aplicativo cliente.
- Un usuario externo puede reportar muchas incidencias mediante `incidencias.usuario_externo_id`.

### categorias

Catalogo de categorias por aplicativo cliente.

| Campo | Tipo | Descripcion |
|---|---|---|
| `id` | uuid | Llave primaria. |
| `cliente_id` | uuid | FK hacia `clientes.id`. |
| `nombre` | varchar | Nombre de la categoria. |
| `descripcion` | varchar | Descripcion de la categoria. |
| `activo` | boolean | Indica si la categoria esta disponible. |
| `creado_en` | timestamp | Fecha de creacion. |

Relaciones:

- Muchas categorias pertenecen a un aplicativo cliente.
- Una categoria puede clasificar muchas incidencias mediante `incidencias.categoria_id`.

Regla:

- No eliminar una categoria si tiene incidencias asociadas. Preferir desactivar.

### estados_proceso

Catalogo configurable del avance operativo de una incidencia.

| Campo | Tipo | Descripcion |
|---|---|---|
| `id` | uuid | Llave primaria. |
| `clave` | varchar | Codigo del estado. Ejemplo: `PENDIENTE`, `EN_PROCESO`, `FINALIZADA`. |
| `etiqueta` | varchar | Texto visible del estado. |
| `es_terminal` | boolean | Indica si el estado cierra el flujo operativo. |
| `orden` | int | Orden del flujo. |

Relaciones:

- `estados_proceso.id` se referencia desde `incidencias.estado_proceso_id`.
- `estados_proceso.id` se referencia desde `historial_incidencias.estado_proceso_anterior_id`.
- `estados_proceso.id` se referencia desde `historial_incidencias.estado_proceso_nuevo_id`.

Estados iniciales recomendados:

- `PENDIENTE`
- `EN_PROCESO`
- `FINALIZADA`

### estados_aprobacion

Catalogo de decision de aprobacion o rechazo de una incidencia.

| Campo | Tipo | Descripcion |
|---|---|---|
| `id` | uuid | Llave primaria. |
| `clave` | varchar | Codigo del estado. Ejemplo: `SOLICITADA`, `APROBADA`, `RECHAZADA`. |
| `etiqueta` | varchar | Texto visible del estado. |

Relaciones:

- `estados_aprobacion.id` se referencia desde `incidencias.estado_aprobacion_id`.
- `estados_aprobacion.id` se referencia desde `aprobaciones.estado_aprobacion_id`.

Estados iniciales recomendados:

- `SOLICITADA`
- `APROBADA`
- `RECHAZADA`

### incidencias

Entidad central del sistema.

| Campo | Tipo | Descripcion |
|---|---|---|
| `id` | uuid | Llave primaria. |
| `codigo` | varchar | Codigo unico visible de la incidencia. |
| `titulo` | varchar | Titulo breve. |
| `descripcion` | text | Descripcion detallada. |
| `cliente_id` | uuid | FK hacia `clientes.id`. Aplicativo origen. |
| `estado_proceso_id` | uuid | FK hacia `estados_proceso.id`. Estado operativo actual. |
| `estado_aprobacion_id` | uuid | FK hacia `estados_aprobacion.id`. Decision actual. |
| `prioridad` | varchar | Prioridad: `BAJA`, `MEDIA`, `ALTA`, `CRITICA`. |
| `categoria_id` | uuid | FK hacia `categorias.id`. |
| `creado_por_usuario_id` | uuid | FK hacia `usuarios.id`. Usuario interno creador. |
| `usuario_externo_id` | uuid | FK hacia `usuarios_externos.id`. Usuario externo reportante. |
| `asignado_a` | uuid | FK hacia `usuarios.id`. Agente responsable. |
| `creado_en` | timestamp | Fecha de creacion. |
| `actualizado_en` | timestamp | Fecha de ultima actualizacion. |
| `resuelto_en` | timestamp | Fecha de resolucion o finalizacion. |

Relaciones:

- Una incidencia pertenece a un aplicativo cliente.
- Una incidencia pertenece a una categoria.
- Una incidencia tiene un estado de proceso actual.
- Una incidencia tiene un estado de aprobacion actual.
- Una incidencia puede ser creada por un usuario interno.
- Una incidencia puede ser reportada por un usuario externo.
- Una incidencia puede estar asignada a un agente.
- Una incidencia tiene muchos comentarios.
- Una incidencia tiene muchos adjuntos.
- Una incidencia tiene muchas aprobaciones historicas.
- Una incidencia tiene muchas notificaciones.
- Una incidencia tiene muchos registros de historial.

Reglas:

- Al crear, asignar `estado_aprobacion_id = SOLICITADA`.
- Si se aprueba, usar `estado_aprobacion_id = APROBADA` y `estado_proceso_id = PENDIENTE`.
- Si se rechaza, usar `estado_aprobacion_id = RECHAZADA` y no permitir avance operativo.
- Si el estado de proceso es terminal, registrar `resuelto_en`.

### comentarios

Comentarios o notas asociadas a una incidencia.

| Campo | Tipo | Descripcion |
|---|---|---|
| `id` | uuid | Llave primaria. |
| `incidencia_id` | uuid | FK hacia `incidencias.id`. |
| `autor_id` | uuid | FK hacia `usuarios.id`. |
| `contenido` | text | Texto del comentario. |
| `creado_en` | timestamp | Fecha de creacion. |
| `actualizado_en` | timestamp | Fecha de edicion. |

Relaciones:

- Muchos comentarios pertenecen a una incidencia.
- Muchos comentarios son escritos por un usuario.

### adjuntos

Archivos adjuntos o evidencias de una incidencia.

| Campo | Tipo | Descripcion |
|---|---|---|
| `id` | uuid | Llave primaria. |
| `incidencia_id` | uuid | FK hacia `incidencias.id`. |
| `subido_por` | uuid | FK hacia `usuarios.id`. |
| `nombre_archivo` | varchar | Nombre original o normalizado del archivo. |
| `tipo_mime` | varchar | Tipo MIME. |
| `tamaño_bytes` | int | Tamano del archivo en bytes. |
| `url` | varchar | URL o ruta de almacenamiento. |
| `subido_en` | timestamp | Fecha de carga. |

Relaciones:

- Muchos adjuntos pertenecen a una incidencia.
- Muchos adjuntos son subidos por un usuario.

Nota para codigo:

- Si se prefiere evitar `ñ` en Java, mapear el campo SQL `tamaño_bytes` a la propiedad `tamanoBytes`.

### aprobaciones

Historial de decisiones de aprobacion o rechazo de una incidencia.

| Campo | Tipo | Descripcion |
|---|---|---|
| `id` | uuid | Llave primaria. |
| `incidencia_id` | uuid | FK hacia `incidencias.id`. |
| `revisado_por` | uuid | FK hacia `usuarios.id`. |
| `estado_aprobacion_id` | uuid | FK hacia `estados_aprobacion.id`. |
| `motivo_rechazo` | text | Motivo cuando la decision es rechazo. |
| `decidido_en` | timestamp | Fecha de decision. |

Relaciones:

- Muchas aprobaciones pertenecen a una incidencia.
- Muchas aprobaciones son realizadas por un usuario revisor.
- Cada aprobacion apunta a un estado de aprobacion.

Regla:

- `incidencias.estado_aprobacion_id` guarda el estado actual.
- `aprobaciones` guarda el historial de decisiones.

### notificaciones

Alertas generadas por eventos del sistema.

| Campo | Tipo | Descripcion |
|---|---|---|
| `id` | uuid | Llave primaria. |
| `usuario_id` | uuid | FK hacia `usuarios.id`. Destinatario. |
| `incidencia_id` | uuid | FK hacia `incidencias.id`. Puede ser nulo si la alerta no depende de incidencia. |
| `cliente_id` | uuid | FK hacia `clientes.id`. Contexto del aplicativo. |
| `tipo` | varchar | Tipo de notificacion. |
| `titulo` | varchar | Titulo visible. |
| `descripcion` | text | Detalle de la notificacion. |
| `leido_en` | timestamp | Fecha de lectura. Nulo si no fue leida. |
| `creado_en` | timestamp | Fecha de creacion. |

Relaciones:

- Muchas notificaciones pertenecen a un usuario.
- Una notificacion puede estar asociada a una incidencia.
- Una notificacion puede estar asociada a un aplicativo cliente.

Eventos recomendados:

- Incidencia asignada.
- Incidencia aprobada.
- Incidencia rechazada.
- Cambio de estado de proceso.
- Nuevo comentario.

### historial_incidencias

Auditoria de cambios relevantes de una incidencia.

| Campo | Tipo | Descripcion |
|---|---|---|
| `id` | uuid | Llave primaria. |
| `incidencia_id` | uuid | FK hacia `incidencias.id`. |
| `usuario_id` | uuid | FK hacia `usuarios.id`. Usuario que realizo la accion. |
| `accion` | varchar | Tipo de accion registrada. |
| `estado_proceso_anterior_id` | uuid | FK hacia `estados_proceso.id`. |
| `estado_proceso_nuevo_id` | uuid | FK hacia `estados_proceso.id`. |
| `nota` | text | Comentario o detalle del cambio. |
| `creado_en` | timestamp | Fecha del evento. |

Relaciones:

- Muchos registros de historial pertenecen a una incidencia.
- Muchos registros de historial son generados por un usuario.
- El historial puede apuntar al estado de proceso anterior y nuevo.

Acciones recomendadas:

- `CREADA`
- `ACTUALIZADA`
- `ASIGNADA`
- `APROBADA`
- `RECHAZADA`
- `CAMBIO_ESTADO`
- `COMENTARIO_AGREGADO`
- `ADJUNTO_AGREGADO`
- `FINALIZADA`

## Resumen de llaves foraneas

| Tabla | Campo FK | Referencia |
|---|---|---|
| `usuarios` | `rol_id` | `roles.id` |
| `usuarios_externos` | `cliente_id` | `clientes.id` |
| `categorias` | `cliente_id` | `clientes.id` |
| `incidencias` | `cliente_id` | `clientes.id` |
| `incidencias` | `estado_proceso_id` | `estados_proceso.id` |
| `incidencias` | `estado_aprobacion_id` | `estados_aprobacion.id` |
| `incidencias` | `categoria_id` | `categorias.id` |
| `incidencias` | `creado_por_usuario_id` | `usuarios.id` |
| `incidencias` | `usuario_externo_id` | `usuarios_externos.id` |
| `incidencias` | `asignado_a` | `usuarios.id` |
| `comentarios` | `incidencia_id` | `incidencias.id` |
| `comentarios` | `autor_id` | `usuarios.id` |
| `adjuntos` | `incidencia_id` | `incidencias.id` |
| `adjuntos` | `subido_por` | `usuarios.id` |
| `aprobaciones` | `incidencia_id` | `incidencias.id` |
| `aprobaciones` | `revisado_por` | `usuarios.id` |
| `aprobaciones` | `estado_aprobacion_id` | `estados_aprobacion.id` |
| `notificaciones` | `usuario_id` | `usuarios.id` |
| `notificaciones` | `incidencia_id` | `incidencias.id` |
| `notificaciones` | `cliente_id` | `clientes.id` |
| `historial_incidencias` | `incidencia_id` | `incidencias.id` |
| `historial_incidencias` | `usuario_id` | `usuarios.id` |
| `historial_incidencias` | `estado_proceso_anterior_id` | `estados_proceso.id` |
| `historial_incidencias` | `estado_proceso_nuevo_id` | `estados_proceso.id` |

## Indices recomendados

Crear indices para consultas frecuentes:

- `usuarios.email`
- `usuarios.rol_id`
- `incidencias.codigo`
- `incidencias.cliente_id`
- `incidencias.estado_proceso_id`
- `incidencias.estado_aprobacion_id`
- `incidencias.categoria_id`
- `incidencias.asignado_a`
- `incidencias.creado_en`
- `comentarios.incidencia_id`
- `adjuntos.incidencia_id`
- `notificaciones.usuario_id`
- `notificaciones.leido_en`
- `historial_incidencias.incidencia_id`

## Notas para DAOs y SQL

- Usar `JOIN` para vistas de detalle de incidencia.
- Usar `LEFT JOIN` cuando una relacion pueda ser nula, por ejemplo `usuario_externo_id`, `asignado_a` o `resuelto_en`.
- Usar `COUNT(*)` separado para paginacion.
- Usar `LIMIT` y `OFFSET` para listados.
- Usar filtros dinamicos parametrizados para incidencias.
- No cargar todos los registros en memoria para luego filtrar.
- Mantener los SQL largos en clases `Sql`, por ejemplo `IncidenciaSql`.
- Mantener el mapeo en clases `Mapper`, por ejemplo `IncidenciaMapper`.
