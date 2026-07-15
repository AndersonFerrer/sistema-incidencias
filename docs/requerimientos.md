# Sistema de Gestión de Incidencias

**Especificación de Requerimientos de Software**  
**Backoffice – Módulo Administrativo**  
**Versión:** 1.0  
**Fecha:** Abril 2025

---

## Resumen

| Tipo | Cantidad |
|------|---------:|
| Requerimientos Funcionales | 50 |
| Requerimientos No Funcionales | 25 |
| **Total** | **75** |

---

# 1. Requerimientos Funcionales

## 1.1 Autenticación y Control de Acceso (RF-01 – RF-05)

| ID | Requerimiento | Descripción | Prioridad |
|----|--------------|-------------|-----------|
| RF-01 | Login con credenciales | El sistema debe permitir autenticación mediante usuario y contraseña. El campo contraseña debe ocultarse con asteriscos. | Alta |
| RF-02 | Acceso de demostración | El sistema debe proveer un botón de acceso rápido sin credenciales para entornos de demostración. | Alta |
| RF-03 | Gestión de sesión activa | El sistema debe mantener la sesión del usuario autenticado entre páginas y cerrarla al solicitarlo. | Alta |
| RF-04 | Cierre de sesión | El sistema debe proveer una opción visible de cierre de sesión accesible desde cualquier pantalla. | Alta |
| RF-05 | Control de acceso por roles | El sistema debe diferenciar permisos entre Administrador, Agente y Usuario final, limitando funciones según el rol. | Alta |

---

## 1.2 Dashboard y Métricas (RF-06 – RF-11)

| ID | Requerimiento | Descripción | Prioridad |
|----|--------------|-------------|-----------|
| RF-06 | KPIs en dashboard | Mostrar total de incidencias y conteo por estado. | Alta |
| RF-07 | Tarjetas de resumen por estado | Mostrar tarjetas visuales con conteo por estado. | Alta |
| RF-08 | Gráfico por categoría | Mostrar gráfico de barras o pastel con incidencias por categoría. | Alta |
| RF-09 | Gráfico de tendencia temporal | Mostrar evolución temporal de incidencias. | Media |
| RF-10 | Incidencias recientes | Mostrar las últimas incidencias registradas. | Alta |
| RF-11 | Tiempo promedio de resolución | Mostrar el tiempo promedio de resolución. | Media |

---

## 1.3 Gestión de Incidencias (RF-12 – RF-28)

| ID | Requerimiento | Descripción | Prioridad |
|----|--------------|-------------|-----------|
| RF-12 | Registro de nueva incidencia | Crear incidencias con título, descripción, categoría, prioridad y responsable. | Alta |
| RF-13 | Asignación de prioridad | Baja, Media, Alta o Crítica. | Alta |
| RF-14 | Asignación de categoría | Hardware, Software, Red, etc. | Alta |
| RF-15 | Asignación de responsable | Asignar incidencia a un usuario o agente. | Alta |
| RF-16 | Cambio de estado | Abierta → En Progreso → Resuelta → Cerrada. | Alta |
| RF-17 | Edición de incidencia | Modificar incidencias existentes. | Alta |
| RF-18 | Eliminación de incidencia | Eliminar con confirmación. | Media |
| RF-19 | Vista detalle | Mostrar todos los datos e historial. | Alta |
| RF-20 | Historial de cambios | Registrar quién cambió qué y cuándo. | Alta |
| RF-21 | Comentarios | Permitir comentarios sobre incidencias. | Alta |
| RF-22 | Búsqueda | Buscar por título, descripción o código. | Alta |
| RF-23 | Filtro por estado | Filtrar incidencias por estado. | Alta |
| RF-24 | Filtro por prioridad | Filtrar por prioridad. | Alta |
| RF-25 | Filtro por categoría | Filtrar por categoría. | Alta |
| RF-26 | Filtro por fecha | Filtrar por rango de fechas. | Media |
| RF-27 | Paginación | Listado paginado. | Alta |
| RF-28 | Ordenamiento | Ordenar por cualquier columna. | Media |

---

## 1.4 Gestión de Usuarios (RF-29 – RF-36)

| ID | Requerimiento | Descripción | Prioridad |
|----|--------------|-------------|-----------|
| RF-29 | Listado de usuarios | Mostrar usuarios registrados. | Alta |
| RF-30 | Creación de usuario | Registrar nuevos usuarios. | Alta |
| RF-31 | Edición de usuario | Modificar información y rol. | Alta |
| RF-32 | Desactivación | Desactivar sin eliminar. | Alta |
| RF-33 | Eliminación | Eliminar usuarios con confirmación. | Media |
| RF-34 | Gestión de roles | Administrador, Agente y Usuario. | Alta |
| RF-35 | Búsqueda | Buscar por nombre o correo. | Media |
| RF-36 | Perfil | Mostrar información personal del usuario. | Media |

---

## 1.5 Notificaciones (RF-37 – RF-40)

| ID | Requerimiento | Descripción | Prioridad |
|----|--------------|-------------|-----------|
| RF-37 | Tiempo real | Notificar asignaciones y cambios. | Alta |
| RF-38 | Centro de notificaciones | Historial de alertas. | Alta |
| RF-39 | Marcar como leída | Individual o todas. | Media |
| RF-40 | Badge | Mostrar cantidad pendientes. | Media |

---

## 1.6 Reportes y Estadísticas (RF-41 – RF-44)

| ID | Requerimiento | Descripción | Prioridad |
|----|--------------|-------------|-----------|
| RF-41 | Reporte por período | Filtrar por fechas. | Alta |
| RF-42 | Reporte por agente | Métricas por agente. | Media |
| RF-43 | Gráficos | Incluir visualizaciones. | Media |
| RF-44 | Exportación | PDF y/o Excel. | Media |

---

## 1.7 Navegación e Interfaz (RF-45 – RF-48)

| ID | Requerimiento | Descripción | Prioridad |
|----|--------------|-------------|-----------|
| RF-45 | Menú lateral | Dashboard, Incidencias, Usuarios, Reportes y Configuración. | Alta |
| RF-46 | Breadcrumb | Mostrar ruta de navegación. | Media |
| RF-47 | Barra superior | Usuario, rol, notificaciones y cierre de sesión. | Alta |
| RF-48 | Diseño responsivo | Compatible con escritorio, tablet y móvil. | Alta |

---

## 1.8 Configuración (RF-49 – RF-50)

| ID | Requerimiento | Descripción | Prioridad |
|----|--------------|-------------|-----------|
| RF-49 | Gestión de categorías | CRUD de categorías. | Media |
| RF-50 | Gestión de estados | CRUD de estados. | Media |

---

# 2. Requerimientos No Funcionales

## 2.1 Rendimiento (RNF-01 – RNF-03)

| ID | Requerimiento | Descripción | Prioridad |
|----|--------------|-------------|-----------|
| RNF-01 | Dashboard < 3 s | Carga inferior a 3 segundos. | Alta |
| RNF-02 | CRUD < 2 s | Operaciones menores a 2 segundos. | Alta |
| RNF-03 | Paginación | Máximo 20 registros por página. | Media |

## 2.2 Seguridad (RNF-04 – RNF-10)

- bcrypt / Argon2
- JWT
- Protección de rutas
- Validación de entradas
- RBAC
- Logs de auditoría
- HTTPS

## 2.3 Usabilidad (RNF-11 – RNF-15)

- Interfaz consistente
- Feedback visual
- Indicadores de carga
- Confirmación antes de eliminar
- Accesibilidad WCAG 2.1 AA

## 2.4 Mantenibilidad (RNF-16 – RNF-19)

- Frontend modular
- Arquitectura en capas
- Documentación Swagger/OpenAPI
- Git

## 2.5 Escalabilidad (RNF-20 – RNF-23)

- Disponibilidad del 99 %
- 50 usuarios concurrentes
- Escalabilidad horizontal
- Índices en base de datos

## 2.6 Compatibilidad (RNF-24 – RNF-25)

- Chrome
- Firefox
- Edge
- Safari
- Dispositivos móviles desde 375 px

---

# Resumen de Cobertura

| Módulo | RF |
|--------|---:|
| Autenticación | 5 |
| Dashboard | 6 |
| Gestión de Incidencias | 17 |
| Gestión de Usuarios | 8 |
| Notificaciones | 4 |
| Reportes | 4 |
| Navegación | 4 |
| Configuración | 2 |

---

**Total:** 50 Requerimientos Funcionales + 25 Requerimientos No Funcionales = **75 requerimientos**