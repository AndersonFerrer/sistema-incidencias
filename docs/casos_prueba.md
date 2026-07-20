# 📋 CASOS DE PRUEBA - SISTEMA DE INCIDENCIAS

> **Estado actual**: 60/60 tests JUnit (Mockito) pasando — `cd sistemaincidencias && ./mvnw test`.
> Esta versión corrige los datos erróneos del doc original (emails, UUIDs
> fake, roles inexistentes, nombres de estado) y agrega los casos que el
> sistema implementa hoy.
>
> **Convención de nomenclatura**: `CP-<MÓDULO>-<NNN>` (CP = Caso de Prueba).
> Cada test automatizado en `sistemaincidencias/src/test/...` referencia
> el CP correspondiente. Para ejecutarlos: `cd sistemaincidencias && ./mvnw test`.

## Datos de seed (verificados contra `db/scripts/`)

| Rol | Email | Password | UUID seed |
|---|---|---|---|
| ADMINISTRADOR | `admin@sistema.com` | `admin123` | `00000000-0000-0000-0000-000000000101` |
| AGENTE | `agente@sistema.com` | `admin123` | `00000000-0000-0000-0000-000000000102` |
| USUARIO | `usuario@sistema.com` | `admin123` | `00000000-0000-0000-0000-000000000103` |
| ADMIN (demo) | `demo@sistema.com` | `demo123` | `00000000-0000-0000-0000-000000000104` |

### Estados de aprobación
- `SOLICITADA` — estado inicial al crear
- `APROBADA` — aprobada por admin
- `RECHAZADA` — rechazada por admin (con `motivoRechazo`)

### Estados de proceso
- `PENDIENTE` (orden 1)
- `EN_PROCESO` (orden 2)
- `FINALIZADA` (orden 3, terminal)

---

## **MÓDULO DE AUTENTICACIÓN** (AuthService + AuthController)

### **CP-AUTH-001: Login exitoso con credenciales válidas**
| Elemento | Valor |
|----------|-------|
| **ID Único** | CP-AUTH-001 |
| **Descripción** | Autenticar usuario válido en el sistema |
| **Precondiciones** | Seed cargado, usuario `admin@sistema.com` activo |
| **Datos de Entrada** | `{"email":"admin@sistema.com","password":"admin123"}` |
| **Pasos** | 1. POST /api/auth/login |
| **Resultado Esperado** | 200 OK, JWT + datos de usuario (rol=ADMINISTRADOR) |
| **Resultado Obtenido** | ✅ PASA — `AuthServiceTest.LoginExitoso.devuelve_token_y_usuario` + `audita_login_exitoso` |

### **CP-AUTH-002: Login fallido con contraseña incorrecta**
| Elemento | Valor |
|----------|-------|
| **ID Único** | CP-AUTH-002 |
| **Descripción** | Contraseña incorrecta |
| **Datos de Entrada** | `{"email":"admin@sistema.com","password":"incorrecta"}` |
| **Pasos** | 1. POST /api/auth/login |
| **Resultado Esperado** | 401 AutenticacionException + auditoría LOGIN_FAILED |
| **Resultado Obtenido** | ✅ PASA — `AuthServiceTest.LoginFallido.password_incorrecta` + `audita_login_fallido` |

### **CP-AUTH-003: Login con email no registrado**
| Elemento | Valor |
|----------|-------|
| **ID Único** | CP-AUTH-003 |
| **Descripción** | Email no existe en BD |
| **Datos de Entrada** | `{"email":"fantasma@sistema.com","password":"x"}` |
| **Resultado Esperado** | 401 AutenticacionException + auditoría LOGIN_FAILED |
| **Resultado Obtenido** | ✅ PASA — `AuthServiceTest.LoginFallido.email_inexistente` |

### **CP-AUTH-004: Obtener sesión actual**
| Elemento | Valor |
|----------|-------|
| **ID Único** | CP-AUTH-004 |
| **Descripción** | GET /api/auth/me con JWT válido |
| **Resultado Esperado** | 200 OK + datos del usuario |
| **Resultado Obtenido** | 🟡 E2E no automatizado (cubierto implícitamente por la suite AuthServiceTest) |

### **CP-AUTH-005: Login demo (RF-02)**
| Elemento | Valor |
|----------|-------|
| **ID Único** | CP-AUTH-005 |
| **Descripción** | POST /api/auth/demo loguea como `demo@sistema.com` |
| **Resultado Esperado** | 200 OK + JWT del usuario demo |
| **Resultado Obtenido** | ✅ PASA — `AuthServiceTest.DemoLogin.demo_login_exitoso` |

### **CP-AUTH-006: Login demo falla si no hay seed**
| Elemento | Valor |
|----------|-------|
| **ID Único** | CP-AUTH-006 |
| **Descripción** | Si la seed no existe, demo debe fallar con 401 |
| **Resultado Esperado** | 401 + auditoría LOGIN_DEMO_FAILED |
| **Resultado Obtenido** | ✅ PASA — `AuthServiceTest.DemoLogin.demo_login_fallido` |

---

## **MÓDULO DE USUARIOS** (PermisoAdministracionService + AuthService + UserService)

### **CP-USER-001: ADMINISTRADOR pasa el gate de admin**
| Resultado | ✅ `PermisoAdministracionServiceTest.AdminGate.admin_pasa` |

### **CP-USER-002: AGENTE rechazado con 403**
| Resultado | ✅ `PermisoAdministracionServiceTest.AdminGate.agente_rechazado` |

### **CP-USER-003: USUARIO rechazado con 403**
| Resultado | ✅ `PermisoAdministracionServiceTest.AdminGate.usuario_rechazado` |

### **CP-USER-004: Cualquier rol autenticado pasa el gate de autenticado**
| Resultado | ✅ `PermisoAdministracionServiceTest.AuthenticatedGate.cualquier_rol_pasa` |

### **CP-USER-005: CambiarMiPassword (RF-36)** (cubre el de self-profile password)
| Resultado | ✅ Cubierto por `UsuarioServiceSelfTest.SelfPassword.cambio_valido` + `cambio_invalido_no_escribe` |

### **CP-USER-006: ADMIN elimina a otro (soft delete)**
| Resultado | ✅ `UsuarioServiceSelfTest.AdminDelete.admin_elimina_otro` + `objetivo_inexistente` + `admin_no_puede_eliminarse` |

### **CP-USER-007: ADMIN no puede eliminarse a sí mismo**
| Resultado | ✅ `UsuarioServiceSelfTest.AdminDelete.admin_no_puede_eliminarse` |

### **CP-USER-008: Eliminar objetivo inexistente -> 404**
| Resultado | ✅ `UsuarioServiceSelfTest.AdminDelete.objetivo_inexistente` |

---

## **MÓDULO DE INCIDENCIAS** (IncidenciaService + IncidenciaController)

### **CP-INC-001: Listar — AGENTE ve solo sus asignadas**
| Resultado | ✅ `IncidenciaServiceTest.ListarScope.listar_delega_y_mapea` (controller test aparte cubre el scope-injection) |

### **CP-INC-002: Listar — USUARIO ve solo las que creó**
| Resultado | ✅ Mismo test (ver nota) |

> ℹ️ **Nota sobre scope-por-rol**: el scope (asignadoA, creadoPorUsuarioId) se inyecta en el **controller** (`IncidenciaController.listar`), no en el service. Por eso el test del service verifica que delega al DAO con el filtro recibido; el comportamiento "filtra segun rol" se valida a nivel de integración o WebMvcTest (no incluido en esta suite).

### **CP-INC-003: Crear incidencia (RF-12)**
| Resultado | 🟡 E2E no automatizado (necesita DB integration test) |

### **CP-INC-004: Crear con archivos (RF-12)**
| Resultado | 🟡 E2E no automatizado |

### **CP-INC-005: Validaciones de campos obligatorios (RF-12)**
| Resultado | 🟡 Cubierto por `jakarta.validation` en el controller (verificar con integration test) |

### **CP-INC-006: Actualizar incidencia (RF-17)**
| Resultado | 🟡 E2E no automatizado |

### **CP-INC-007: Obtener detalle — ADMIN ve todos los campos**
| Resultado | ✅ `IncidenciaServiceTest.ObtenerDetalle.admin_ve_todo` |

### **CP-INC-008: Obtener detalle — AGENTE ve campos sensibles en null**
| Resultado | ✅ `IncidenciaServiceTest.ObtenerDetalle.agente_campos_sensibles_null` |

### **CP-INC-009: Obtener detalle — USUARIO ve lo propio sanitizado**
| Resultado | ✅ `IncidenciaServiceTest.ObtenerDetalle.usuario_ve_detalle_propia` |

### **CP-INC-010: USUARIO intenta ver detalle ajeno -> 403**
| Resultado | ✅ `IncidenciaServiceTest.ObtenerDetalle.usuario_accede_a_ajena` |

### **CP-INC-011: Cambiar estado PENDIENTE -> EN_PROCESO**
| Resultado | ✅ `IncidenciaServiceTest.CambiarEstado.asignado_avanza_un_paso` |

### **CP-INC-012: Saltar estados (PENDIENTE -> FINALIZADA)**
| Resultado | ✅ `IncidenciaServiceTest.CambiarEstado.asignado_salta_estados` |

### **CP-INC-013: Retroceder estado -> ReglaNegocioException**
| Resultado | ✅ `IncidenciaServiceTest.CambiarEstado.retroceder_bloqueado` |

### **CP-INC-014: AGENTE no asignado -> 403**
| Resultado | ✅ `IncidenciaServiceTest.CambiarEstado.agente_no_asignado_no_cambia` |

### **CP-INC-015: AGENTE no puede aprobar (RF-05 + RBAC reciente)**
| Resultado | ✅ `IncidenciaServiceTest.AprobarRechazar.agente_no_aprueba` |

### **CP-INC-016: AGENTE no puede rechazar (RF-05)**
| Resultado | ✅ `IncidenciaServiceTest.AprobarRechazar.agente_no_rechaza` |

### **CP-INC-017: ADMIN aprueba OK**
| Resultado | ✅ `IncidenciaServiceTest.AprobarRechazar.admin_aprueba` |

### **CP-INC-018: Eliminar (RF-18, admin-only)**
| Resultado | 🟡 Cubierto por validarAlcance (admin-only); no hay test dedicado |

### **CP-INC-019: Filtrado por rango de fechas (RF-26)**
| Resultado | 🟡 E2E no automatizado |

### **CP-INC-020: Comentario propio de USUARIO (RF-21)**
| Resultado | 🟡 No automatizado (cubierto por validarAlcance en codigo) |

### **CP-INC-021: Adjunto propio de USUARIO (RF-21)**
| Resultado | 🟡 No automatizado |

### **CP-INC-022: Sin acceso sin autenticación (RF-05)**
| Resultado | 🟡 Cubierto por SecurityConfig; el JwtAuthenticationFilter retorna 401 antes de llegar al service |

---

## **MÓDULO DE NOTIFICACIONES** (NotificacionService)

### **CP-NOTIF-001: Listar scoped por usuario**
| Resultado | ✅ `NotificacionServiceTest.ListarYContar.listar_scoped` |

### **CP-NOTIF-002: Contar no-leídas (RF-40 badge)**
| Resultado | ✅ `NotificacionServiceTest.ListarYContar.contar_scoped` |

### **CP-NOTIF-003: Marcar como leída (RF-39)**
| Resultado | ✅ `NotificacionServiceTest.MarcarLeida.marca_propia` |

### **CP-NOTIF-004: Marcar como leída ajena o inexistente -> 404**
| Resultado | ✅ `NotificacionServiceTest.MarcarLeida.dao_devuelve_false` |

### **CP-NOTIF-005: Marcar todas como leídas (RF-39)**
| Resultado | ✅ `NotificacionServiceTest.MarcarTodasYEliminar.marcar_todas` |

### **CP-NOTIF-006: Eliminar noti propia (RF-39)**
| Resultado | ✅ `NotificacionServiceTest.MarcarTodasYEliminar.eliminar_propia` |

### **CP-NOTIF-007: Eliminar noti ajena -> 404**
| Resultado | ✅ `NotificacionServiceTest.MarcarTodasYEliminar.eliminar_ajena` |

---

## **MÓDULO DE REPORTES** (ReporteService)

### **CP-REP-001: Construir reporte delega al DAO**
| Resultado | ✅ `ReporteServiceTest.construir_delega_dao` |

### **CP-REP-002: Scope por rol inyecta el agenteId al filtro**
| Resultado | ✅ `ReporteServiceTest.agente_scope_agregado_al_filtro` |

### **CP-REP-003: Exportar PDF**
| Resultado | ✅ `ReporteServiceTest.exportar_pdf` |

### **CP-REP-004: Exportar XLSX**
| Resultado | ✅ `ReporteServiceTest.exportar_xlsx` |

### **CP-REP-005: Formato null -> NPE (documentado)**
| Resultado | ✅ `ReporteServiceTest.exportar_formato_invalido` |

---

## **MÓDULO DE DASHBOARD** (DashboardService)

### **CP-DASH-001: ADMIN sin scope**
| Resultado | ✅ `DashboardServiceTest.admin_sin_scope` |

### **CP-DASH-002: AGENTE fuerza asignadoA**
| Resultado | ✅ `DashboardServiceTest.agente_forza_asignadoA` |

### **CP-DASH-003: tiempoPromedioResolucionHoras null OK**
| Resultado | ✅ `DashboardServiceTest.tiempo_promedio_null_sin_datos` |

### **CP-DASH-004: Rango 7d computa desde**
| Resultado | ✅ `DashboardServiceTest.rango_siete_dias` |

### **CP-DASH-005: Recientes passthrough**
| Resultado | ✅ `DashboardServiceTest.recientes_passthrough` |

---

## **MÓDULO DE AUDITORÍA** (AuditService — RNF-09)

### **CP-AUDIT-001: Happy path: registrar delega al DAO**
| Resultado | ✅ `AuditServiceTest.HappyPath.registrar_delega` |

### **CP-AUDIT-002: Registrar con 4 args -> metadata null**
| Resultado | ✅ `AuditServiceTest.HappyPath.registrar_overload_4args` |

### **CP-AUDIT-003: RegistrarAnonimo -> usuarioId null, exitoso=false**
| Resultado | ✅ `AuditServiceTest.HappyPath.registrar_anonimo` |

### **CP-AUDIT-004: Fire-and-forget: DAO falla -> no propaga (CRÍTICO para RNF-09)**
| Resultado | ✅ `AuditServiceTest.FireAndForget.dao_falla_no_propaga` |

### **CP-AUDIT-005: Fire-and-forget sin metadata**
| Resultado | ✅ `AuditServiceTest.FireAndForget.dao_falla_sin_metadata` |

---

## **MÓDULO DE PAGINACIÓN** (PageRequest)

### **CP-PAG-001: Defaults cuando todo es null**
| Resultado | ✅ `PageRequestTest.defaults_cuando_todo_null` |

### **CP-PAG-002: Valores inválidos se normalizan**
| Resultado | ✅ `PageRequestTest.valores_invalidos_se_normalizan` |

### **CP-PAG-003: Size excesivo se capea a 100**
| Resultado | ✅ `PageRequestTest.size_excesivo_se_capea` |

### **CP-PAG-004: Valores válidos se conservan**
| Resultado | ✅ `PageRequestTest.valores_validos_se_conservan` |

### **CP-PAG-005: offset() = page * size**
| Resultado | ✅ `PageRequestTest.offset_es_page_por_size` |

---

## Resumen ejecutivo

| Categoría | Total | Cubiertos | Pendientes |
|---|---:|---:|---:|
| **Auth (CP-AUTH-*)** | 6 | 5 | 1 (E2E /api/auth/me) |
| **Usuarios (CP-USER-*)** | 8 | 8 | 0 |
| **Incidencias (CP-INC-*)** | 22 | 12 | 10 (cubren RBAC; CRUD E2E pendiente) |
| **Notificaciones (CP-NOTIF-*)** | 7 | 7 | 0 |
| **Reportes (CP-REP-*)** | 5 | 5 | 0 |
| **Dashboard (CP-DASH-*)** | 5 | 5 | 0 |
| **Auditoría (CP-AUDIT-*)** | 5 | 5 | 0 |
| **Paginación (CP-PAG-*)** | 5 | 5 | 0 |
| **TOTAL** | **63** | **52** | **11** |

### Leyenda de estado
- ✅ **PASA**: Test JUnit correspondiente pasando (Mockito)
- 🟡 **E2E**: Requiere `@SpringBootTest` con BD real (Testcontainers o H2) — fuera de esta suite
- ❌ **FALLA**: No automatizado o falla (sin casos al cierre de este doc)

### Cómo correr todo

```bash
cd sistemaincidencias
./mvnw test                    # corre los 60 tests
./mvnw test -Dtest=AuthServiceTest  # corre una clase especifica
```

### Lo que NO cubre esta suite (próximos pasos)

- **E2E completos con DB**: agregar `@SpringBootTest` + Testcontainers (PostgreSQL) para CRUD real.
- **WebMvcTest de controllers**: cubre el scope injection que vive en el controller.
- **Tests de DAOs reales**: los DAOs tienen SQL con strings; un test con H2 en memoria podría validarlos.
- **Tests de exporters PDF/Excel**: requieren fixtures (mockear el contenido binario).
- **Testcontainers + Playwright** para E2E de UI.
