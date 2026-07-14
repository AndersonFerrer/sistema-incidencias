# 📋 CASOS DE PRUEBA - SISTEMA DE INCIDENCIAS

## **MÓDULO DE AUTENTICACIÓN**

### **CP-AUTH-001: Login exitoso con credenciales válidas**
| Elemento | Valor |
|----------|-------|
| **ID Único** | CP-AUTH-001 |
| **Descripción del Escenario** | Autenticar usuario válido en el sistema |
| **Precondiciones** | - Base de datos con usuario activo<br/>- Usuario: admin@empresa.com / contraseña: 123456 |
| **Datos de Entrada** | Email: admin@empresa.com<br/>Contraseña: 123456 |
| **Pasos de Ejecución** | 1. POST /api/auth/login<br/>2. Enviar JSON con email y contraseña<br/>3. Validar respuesta |
| **Resultado Esperado** | - Status: 200 OK<br/>- Retorna JWT token válido<br/>- Retorna datos de usuario (nombre, rol, permisos) |
| **Resultado Obtenido** | *(Por registrar después de ejecutar)* |
| **Estado** | PENDIENTE ⏳ |

---

### **CP-AUTH-002: Login fallido con contraseña incorrecta**
| Elemento | Valor |
|----------|-------|
| **ID Único** | CP-AUTH-002 |
| **Descripción del Escenario** | Intentar autenticar con contraseña inválida |
| **Precondiciones** | - Base de datos con usuario: admin@empresa.com<br/>- Contraseña correcta: 123456 |
| **Datos de Entrada** | Email: admin@empresa.com<br/>Contraseña: incorrecta123 |
| **Pasos de Ejecución** | 1. POST /api/auth/login<br/>2. Enviar JSON con email y contraseña incorrecta<br/>3. Validar respuesta de error |
| **Resultado Esperado** | - Status: 401 Unauthorized<br/>- Mensaje: "Credenciales inválidas"<br/>- No retorna token |
| **Resultado Obtenido** | *(Por registrar después de ejecutar)* |
| **Estado** | PENDIENTE ⏳ |

---

### **CP-AUTH-003: Login con email no registrado**
| Elemento | Valor |
|----------|-------|
| **ID Único** | CP-AUTH-003 |
| **Descripción del Escenario** | Intentar autenticar con email no existente |
| **Precondiciones** | - Base de datos sin usuario: noexiste@empresa.com |
| **Datos de Entrada** | Email: noexiste@empresa.com<br/>Contraseña: 123456 |
| **Pasos de Ejecución** | 1. POST /api/auth/login<br/>2. Enviar JSON con email no registrado<br/>3. Validar respuesta de error |
| **Resultado Esperado** | - Status: 401 Unauthorized<br/>- Mensaje: "Usuario no encontrado"<br/>- No retorna token |
| **Resultado Obtenido** | *(Por registrar después de ejecutar)* |
| **Estado** | PENDIENTE ⏳ |

---

### **CP-AUTH-004: Obtener información de sesión actual**
| Elemento | Valor |
|----------|-------|
| **ID Único** | CP-AUTH-004 |
| **Descripción del Escenario** | Recuperar datos del usuario autenticado |
| **Precondiciones** | - Usuario autenticado con JWT válido<br/>- Token: eyJhbGciOiJIUzI1NiIs... |
| **Datos de Entrada** | Header Authorization: Bearer eyJhbGciOiJIUzI1NiIs... |
| **Pasos de Ejecución** | 1. GET /api/auth/me<br/>2. Incluir token en header Authorization<br/>3. Validar respuesta |
| **Resultado Esperado** | - Status: 200 OK<br/>- Retorna: {id, email, nombre, apellido, rol}<br/>- Email: admin@empresa.com |
| **Resultado Obtenido** | *(Por registrar después de ejecutar)* |
| **Estado** | PENDIENTE ⏳ |

---

## **MÓDULO DE INCIDENCIAS**

### **CP-INC-001: Crear incidencia sin archivos**
| Elemento | Valor |
|----------|-------|
| **ID Único** | CP-INC-001 |
| **Descripción del Escenario** | Crear nueva incidencia con datos válidos sin archivos adjuntos |
| **Precondiciones** | - Usuario autenticado (token válido)<br/>- Cliente, categoría existen en BD<br/>- Cliente ID: 550e8400-e29b-41d4-a716-446655440000<br/>- Categoría ID: 660e8400-e29b-41d4-a716-446655440000 |
| **Datos de Entrada** | - titulo: "Error en módulo de reportes"<br/>- descripcion: "El sistema no genera reportes PDF"<br/>- clienteId: 550e8400-e29b-41d4-a716-446655440000<br/>- categoriaId: 660e8400-e29b-41d4-a716-446655440000<br/>- prioridad: "ALTA"<br/>- asignadoA: null |
| **Pasos de Ejecución** | 1. POST /api/incidencias (application/json)<br/>2. Enviar CrearIncidenciaRequest<br/>3. Incluir token en Authorization header<br/>4. Validar respuesta |
| **Resultado Esperado** | - Status: 201 Created<br/>- Retorna ID de incidencia (UUID)<br/>- Estado: ABIERTA<br/>- Prioridad: ALTA<br/>- Creada por: Usuario autenticado |
| **Resultado Obtenido** | *(Por registrar después de ejecutar)* |
| **Estado** | PENDIENTE ⏳ |

---

### **CP-INC-002: Crear incidencia con archivos**
| Elemento | Valor |
|----------|-------|
| **ID Único** | CP-INC-002 |
| **Descripción del Escenario** | Crear incidencia con múltiples archivos adjuntos |
| **Precondiciones** | - Usuario autenticado<br/>- Archivos: reporte.pdf (200KB), captura.png (150KB)<br/>- Tamaño máximo por archivo: 5MB |
| **Datos de Entrada** | - titulo: "Falla en sistema de facturación"<br/>- descripcion: "No procesa facturas mayores a 100k"<br/>- clienteId: 550e8400-e29b-41d4-a716-446655440000<br/>- categoriaId: 660e8400-e29b-41d4-a716-446655440000<br/>- prioridad: "CRÍTICA"<br/>- archivos: [reporte.pdf, captura.png] |
| **Pasos de Ejecución** | 1. POST /api/incidencias (multipart/form-data)<br/>2. Enviar request con archivos<br/>3. Incluir token en Authorization<br/>4. Validar respuesta y archivos |
| **Resultado Esperado** | - Status: 201 Created<br/>- Retorna ID de incidencia<br/>- Retorna lista de 2 adjuntos<br/>- Archivos guardados en servidor |
| **Resultado Obtenido** | *(Por registrar después de ejecutar)* |
| **Estado** | PENDIENTE ⏳ |

---

### **CP-INC-003: Validación de campos obligatorios**
| Elemento | Valor |
|----------|-------|
| **ID Único** | CP-INC-003 |
| **Descripción del Escenario** | Validar que campos obligatorios sean requeridos |
| **Precondiciones** | - Usuario autenticado |
| **Datos de Entrada** | - titulo: "" (vacío)<br/>- descripcion: "Descripción válida"<br/>- clienteId: null<br/>- categoriaId: 660e8400-e29b-41d4-a716-446655440000<br/>- prioridad: "MEDIA" |
| **Pasos de Ejecución** | 1. POST /api/incidencias<br/>2. Enviar request con campos incompletos<br/>3. Validar errores de validación |
| **Resultado Esperado** | - Status: 400 Bad Request<br/>- Errores:<br/>  • "El titulo es obligatorio"<br/>  • "El aplicativo cliente es obligatorio"<br/>- No crea incidencia |
| **Resultado Obtenido** | *(Por registrar después de ejecutar)* |
| **Estado** | PENDIENTE ⏳ |

---

### **CP-INC-004: Actualizar incidencia existente**
| Elemento | Valor |
|----------|-------|
| **ID Único** | CP-INC-004 |
| **Descripción del Escenario** | Actualizar información de incidencia existente |
| **Precondiciones** | - Incidencia existente ID: 770e8400-e29b-41d4-a716-446655440000<br/>- Estado: ABIERTA<br/>- Usuario tiene permisos de edición |
| **Datos de Entrada** | - titulo: "Error actualizado en módulo de reportes"<br/>- descripcion: "Sistema no genera reportes PDF correctamente"<br/>- clienteId: 550e8400-e29b-41d4-a716-446655440000<br/>- categoriaId: 660e8400-e29b-41d4-a716-446655440000<br/>- prioridad: "CRÍTICA" |
| **Pasos de Ejecución** | 1. PUT /api/incidencias/770e8400-e29b-41d4-a716-446655440000<br/>2. Enviar ActualizarIncidenciaRequest<br/>3. Incluir token en Authorization<br/>4. Validar cambios |
| **Resultado Esperado** | - Status: 200 OK<br/>- Retorna incidencia actualizada<br/>- titulo y descripción actualizados<br/>- prioridad: CRÍTICA |
| **Resultado Obtenido** | *(Por registrar después de ejecutar)* |
| **Estado** | PENDIENTE ⏳ |

---

### **CP-INC-005: Cambiar estado de incidencia**
| Elemento | Valor |
|----------|-------|
| **ID Único** | CP-INC-005 |
| **Descripción del Escenario** | Cambiar estado de incidencia de ABIERTA a EN_PROCESO |
| **Precondiciones** | - Incidencia ID: 770e8400-e29b-41d4-a716-446655440000<br/>- Estado actual: ABIERTA<br/>- Usuario tiene permisos de cambio de estado |
| **Datos de Entrada** | - nuevoEstado: "EN_PROCESO"<br/>- comentario: "Iniciando revisión de incidencia" |
| **Pasos de Ejecución** | 1. PATCH /api/incidencias/770e8400-e29b-41d4-a716-446655440000/estado<br/>2. Enviar CambiarEstadoRequest<br/>3. Incluir token en Authorization<br/>4. Validar nuevo estado |
| **Resultado Esperado** | - Status: 200 OK<br/>- Estado: EN_PROCESO<br/>- Retorna incidencia actualizada<br/>- Se registra en historial |
| **Resultado Obtenido** | *(Por registrar después de ejecutar)* |
| **Estado** | PENDIENTE ⏳ |

---

### **CP-INC-006: Listar incidencias sin filtros**
| Elemento | Valor |
|----------|-------|
| **ID Único** | CP-INC-006 |
| **Descripción del Escenario** | Obtener listado paginado de todas las incidencias |
| **Precondiciones** | - Base de datos con 25+ incidencias<br/>- Usuario autenticado<br/>- Permisos para ver todas las incidencias |
| **Datos de Entrada** | - Parámetros: page=1, size=10 |
| **Pasos de Ejecución** | 1. GET /api/incidencias?page=1&size=10<br/>2. Incluir token en Authorization<br/>3. Validar respuesta paginada |
| **Resultado Esperado** | - Status: 200 OK<br/>- Retorna: {content[], totalElements, totalPages, currentPage, pageSize}<br/>- content: 10 incidencias<br/>- totalElements: 25+ |
| **Resultado Obtenido** | *(Por registrar después de ejecutar)* |
| **Estado** | PENDIENTE ⏳ |

---

### **CP-INC-007: Listar incidencias con filtros múltiples**
| Elemento | Valor |
|----------|-------|
| **ID Único** | CP-INC-007 |
| **Descripción del Escenario** | Filtrar incidencias por múltiples criterios |
| **Precondiciones** | - Base de datos con incidencias variadas<br/>- Incidencias CRÍTICAS del cliente 550e8400-e29b-41d4-a716-446655440000<br/>- Usuario autenticado |
| **Datos de Entrada** | - texto: "error"<br/>- prioridad: "CRÍTICA"<br/>- clienteId: 550e8400-e29b-41d4-a716-446655440000<br/>- estadoProcesoId: 880e8400-e29b-41d4-a716-446655440000<br/>- page: 1, size: 10 |
| **Pasos de Ejecución** | 1. GET /api/incidencias?texto=error&prioridad=CRÍTICA&clienteId=550e8400-e29b-41d4-a716-446655440000&estadoProcesoId=880e8400-e29b-41d4-a716-446655440000&page=1&size=10<br/>2. Incluir token<br/>3. Validar filtros aplicados |
| **Resultado Esperado** | - Status: 200 OK<br/>- Solo retorna incidencias CRÍTICAS<br/>- Solo del cliente especificado<br/>- Contienen "error" en titulo/descripción<br/>- Con estado EN_PROCESO |
| **Resultado Obtenido** | *(Por registrar después de ejecutar)* |
| **Estado** | PENDIENTE ⏳ |

---

### **CP-INC-008: Obtener detalle de incidencia**
| Elemento | Valor |
|----------|-------|
| **ID Único** | CP-INC-008 |
| **Descripción del Escenario** | Obtener información completa de una incidencia específica |
| **Precondiciones** | - Incidencia ID: 770e8400-e29b-41d4-a716-446655440000<br/>- Incidencia tiene 3 comentarios y 2 adjuntos<br/>- Usuario autenticado |
| **Datos de Entrada** | - Incidencia ID: 770e8400-e29b-41d4-a716-446655440000 |
| **Pasos de Ejecución** | 1. GET /api/incidencias/770e8400-e29b-41d4-a716-446655440000<br/>2. Incluir token en Authorization<br/>3. Validar respuesta detallada |
| **Resultado Esperado** | - Status: 200 OK<br/>- Retorna: {id, titulo, descripción, cliente, categoría, prioridad, estado, comentarios[], adjuntos[], historial[]}<br/>- comentarios: 3 items<br/>- adjuntos: 2 items |
| **Resultado Obtenido** | *(Por registrar después de ejecutar)* |
| **Estado** | PENDIENTE ⏳ |

---

### **CP-INC-009: Agregar comentario a incidencia**
| Elemento | Valor |
|----------|-------|
| **ID Único** | CP-INC-009 |
| **Descripción del Escenario** | Agregar comentario a una incidencia existente |
| **Precondiciones** | - Incidencia ID: 770e8400-e29b-41d4-a716-446655440000<br/>- Usuario autenticado<br/>- Tiene permisos para comentar |
| **Datos de Entrada** | - incidenciaId: 770e8400-e29b-41d4-a716-446655440000<br/>- contenido: "Se ha validado el error. Iniciando diagnóstico." |
| **Pasos de Ejecución** | 1. POST /api/incidencias/770e8400-e29b-41d4-a716-446655440000/comentarios<br/>2. Enviar CrearComentarioRequest<br/>3. Incluir token en Authorization<br/>4. Validar comentario creado |
| **Resultado Esperado** | - Status: 201 Created<br/>- Retorna comentario con ID único<br/>- contenido: "Se ha validado el error..."<br/>- Autor: Usuario autenticado<br/>- fechaCreacion: timestamp actual |
| **Resultado Obtenido** | *(Por registrar después de ejecutar)* |
| **Estado** | PENDIENTE ⏳ |

---

### **CP-INC-010: Agregar adjunto a incidencia**
| Elemento | Valor |
|----------|-------|
| **ID Único** | CP-INC-010 |
| **Descripción del Escenario** | Agregar archivo adjunto a incidencia existente |
| **Precondiciones** | - Incidencia ID: 770e8400-e29b-41d4-a716-446655440000<br/>- Archivo: diagnostico.pdf (300KB)<br/>- Usuario autenticado |
| **Datos de Entrada** | - incidenciaId: 770e8400-e29b-41d4-a716-446655440000<br/>- archivo: diagnostico.pdf<br/>- descripcion: "Diagnóstico técnico realizado" |
| **Pasos de Ejecución** | 1. POST /api/incidencias/770e8400-e29b-41d4-a716-446655440000/adjuntos (multipart/form-data)<br/>2. Enviar archivo y descripción<br/>3. Incluir token en Authorization<br/>4. Validar adjunto creado |
| **Resultado Esperado** | - Status: 201 Created<br/>- Retorna lista de adjuntos<br/>- Nuevo adjunto: diagnostico.pdf<br/>- descripcion: "Diagnóstico técnico realizado"<br/>- Archivo guardado en servidor |
| **Resultado Obtenido** | *(Por registrar después de ejecutar)* |
| **Estado** | PENDIENTE ⏳ |

---

### **CP-INC-011: Aprobar incidencia**
| Elemento | Valor |
|----------|-------|
| **ID Único** | CP-INC-011 |
| **Descripción del Escenario** | Aprobar una incidencia con estado PENDIENTE_APROBACIÓN |
| **Precondiciones** | - Incidencia ID: 770e8400-e29b-41d4-a716-446655440000<br/>- Estado Aprobación: PENDIENTE_APROBACIÓN<br/>- Usuario tiene rol GESTOR_APROBACIÓN |
| **Datos de Entrada** | - incidenciaId: 770e8400-e29b-41d4-a716-446655440000<br/>- accion: "aprobar" |
| **Pasos de Ejecución** | 1. PATCH /api/incidencias/770e8400-e29b-41d4-a716-446655440000/aprobacion?accion=aprobar<br/>2. Incluir token en Authorization<br/>3. Validar cambio de estado |
| **Resultado Esperado** | - Status: 200 OK<br/>- Estado Aprobación: APROBADA<br/>- Retorna incidencia actualizada<br/>- Se registra quien aprobó y cuándo |
| **Resultado Obtenido** | *(Por registrar después de ejecutar)* |
| **Estado** | PENDIENTE ⏳ |

---

### **CP-INC-012: Rechazar incidencia con comentario**
| Elemento | Valor |
|----------|-------|
| **ID Único** | CP-INC-012 |
| **Descripción del Escenario** | Rechazar una incidencia y proporcionar razón |
| **Precondiciones** | - Incidencia ID: 770e8400-e29b-41d4-a716-446655440000<br/>- Estado Aprobación: PENDIENTE_APROBACIÓN<br/>- Usuario tiene rol GESTOR_APROBACIÓN |
| **Datos de Entrada** | - incidenciaId: 770e8400-e29b-41d4-a716-446655440000<br/>- accion: "rechazar"<br/>- razon: "Información insuficiente. Se requieren más detalles." |
| **Pasos de Ejecución** | 1. PATCH /api/incidencias/770e8400-e29b-41d4-a716-446655440000/aprobacion?accion=rechazar<br/>2. Enviar AprobacionRequest con razon<br/>3. Incluir token en Authorization<br/>4. Validar rechazo |
| **Resultado Esperado** | - Status: 200 OK<br/>- Estado Aprobación: RECHAZADA<br/>- Motivo guardado: "Información insuficiente..."<br/>- Retorna incidencia actualizada |
| **Resultado Obtenido** | *(Por registrar después de ejecutar)* |
| **Estado** | PENDIENTE ⏳ |

---

### **CP-INC-013: Eliminar incidencia**
| Elemento | Valor |
|----------|-------|
| **ID Único** | CP-INC-013 |
| **Descripción del Escenario** | Eliminar una incidencia |
| **Precondiciones** | - Incidencia ID: 770e8400-e29b-41d4-a716-446655440000<br/>- Estado: ABIERTA<br/>- Usuario es creador o admin |
| **Datos de Entrada** | - incidenciaId: 770e8400-e29b-41d4-a716-446655440000 |
| **Pasos de Ejecución** | 1. DELETE /api/incidencias/770e8400-e29b-41d4-a716-446655440000<br/>2. Incluir token en Authorization<br/>3. Confirmar eliminación<br/>4. Intentar GET de incidencia eliminada |
| **Resultado Esperado** | - Status: 204 No Content<br/>- Incidencia eliminada de BD<br/>- GET /api/incidencias/{id} retorna 404<br/>- Registra quien eliminó y cuándo |
| **Resultado Obtenido** | *(Por registrar después de ejecutar)* |
| **Estado** | PENDIENTE ⏳ |

---

### **CP-INC-014: Intento de acceso sin autenticación**
| Elemento | Valor |
|----------|-------|
| **ID Único** | CP-INC-014 |
| **Descripción del Escenario** | Intentar acceder a endpoint sin token válido |
| **Precondiciones** | - Endpoint protegido: POST /api/incidencias |
| **Datos de Entrada** | - Sin header Authorization |
| **Pasos de Ejecución** | 1. POST /api/incidencias<br/>2. Enviar CrearIncidenciaRequest sin token<br/>3. Validar respuesta |
| **Resultado Esperado** | - Status: 401 Unauthorized<br/>- Mensaje: "Token no encontrado o inválido"<br/>- No crea incidencia |
| **Resultado Obtenido** | *(Por registrar después de ejecutar)* |
| **Estado** | PENDIENTE ⏳ |

---

### **CP-INC-015: Filtrado por rango de fechas**
| Elemento | Valor |
|----------|-------|
| **ID Único** | CP-INC-015 |
| **Descripción del Escenario** | Listar incidencias creadas en un rango de fechas |
| **Precondiciones** | - Base de datos con incidencias de diferentes fechas<br/>- Incidencias entre 2024-01-01 y 2024-12-31<br/>- Usuario autenticado |
| **Datos de Entrada** | - desde: 2024-06-01<br/>- hasta: 2024-06-30<br/>- page: 1, size: 20 |
| **Pasos de Ejecución** | 1. GET /api/incidencias?desde=2024-06-01&hasta=2024-06-30&page=1&size=20<br/>2. Incluir token en Authorization<br/>3. Validar rango de fechas |
| **Resultado Esperado** | - Status: 200 OK<br/>- Solo retorna incidencias del 01 al 30 de junio 2024<br/>- Excluye incidencias previas y posteriores<br/>- Paginación correcta |
| **Resultado Obtenido** | *(Por registrar después de ejecutar)* |
| **Estado** | PENDIENTE ⏳ |

---

## 📊 **RESUMEN EJECUTIVO**

| Total Casos | Módulo Auth | Módulo Incidencias | Cobertura |
|-------------|------------|------------------|-----------|
| **15** | 4 | 11 | Funcional |

### Áreas Cubiertas:
✅ Autenticación y autorización  
✅ CRUD de incidencias (Create, Read, Update, Delete)  
✅ Cambios de estado  
✅ Aprobación/Rechazo  
✅ Comentarios y adjuntos  
✅ Filtrado y búsqueda  
✅ Paginación  
✅ Validaciones  
✅ Seguridad  
✅ Manejo de errores  

---

**Próximos Pasos:**
1. Ejecutar cada caso de prueba
2. Registrar Resultado Obtenido
3. Actualizar Estado (PASA/FALLA/BLOQUEADO)
4. Documentar bugs encontrados