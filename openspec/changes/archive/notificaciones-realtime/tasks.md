# Tasks: Notificaciones centro + badge + polling 30s (change D)

**Capability**: notificaciones
**Change**: notificaciones-realtime
**Date**: 2026-07-14
**Status**: ready-to-apply
**Strategy**: stacked-to-master with 2 PRs. PR1 = backend module + hooks. PR2 = frontend.

## Review Workload Forecast

Estimated changed lines: 550-650; delivery strategy: ask-on-risk.

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

### Suggested Work Units

- PR1: backend + hooks; test `cd sistemaincidencias && ./mvnw compile`; runtime authenticated five-event curl smoke; rollback module/Postman/hooks.
- PR2: frontend; test `cd frontend && npm run lint && npm run build`; runtime badge/dropdown/hidden-tab browser smoke; rollback notification UI/header/router.

## PR1 — Backend (T1-T6)

### T1. Create notificaciones package skeleton
- Where: sistemaincidencias/src/main/java/com/integrador/sistemaincidencias/notificaciones/{model,dao,sql,service,controller,dto}/
- Action: Create empty placeholder classes; Notificacion POJO matches DB schema (id, usuarioId, tipo, incidenciaId nullable, titulo, descripcion, leido bool, creadoEn, leidoEn nullable).
- Done when: mvn compile passes.

### T2. NotificacionDao + NotificacionSql (5 queries + 1 helper)
- Where: dao/NotificacionDao.java + sql/NotificacionSql.java
- Action: Implement listar, contarNoLeidas, marcarLeida, marcarTodasLeidas, eliminar (all with WHERE usuario_id = ?), plus helper insertar.
- Done when: mvn compile passes; 6 methods callable.

### T3. DTOs + NotificacionTipo enum
- Where: dto/NotificacionResponse.java, dto/NotificacionCountResponse.java, model/NotificacionTipo.java
- Action: NotificacionTipo enum: INCIDENCIA_ASIGNADA, INCIDENCIA_APROBADA, INCIDENCIA_RECHAZADA, INCIDENCIA_ESTADO_CAMBIADO, INCIDENCIA_COMENTARIO. DTOs Lombok @Builder @Getter.
- Done when: compile + JSON serializable.

### T4. NotificacionService (CRUD + generation helper)
- Where: service/NotificacionService.java
- Action: listar, count, marcarLeida (verifies owner), marcarTodas, eliminar (verifies owner), crear(usuarioId, tipo, incidenciaId, titulo, descripcion) — helper.
- Done when: compile.

### T5. NotificacionController + Postman
- Where: controller/NotificacionController.java + postman collection
- Action: 5 endpoints with validarAutenticado. Postman: 5 sample responses.
- Done when: mvn compile + Postman JSON valid + curl returns 200 with token.

### T6. Hook into IncidenciaService
- Where: service/IncidenciaService.java (existing)
- Action: Inject NotificacionService. Call crearParaUsuario at:
  - asignar → INCIDENCIA_ASIGNADA for asignadoA
  - aprobar → INCIDENCIA_APROBADA for creadoPorUsuarioId
  - rechazar → INCIDENCIA_RECHAZADA for creadoPorUsuarioId
  - cambiarEstado → INCIDENCIA_ESTADO_CAMBIADO for asignadoA + creadoPorUsuarioId
  - agregarComentario → INCIDENCIA_COMENTARIO for asignadoA (exclude author)
- Done when: compile + smoke test confirms notif created on each event.

## PR2 — Frontend (T7-T10)

### T7. notificaciones-service.ts
- File: frontend/src/services/notificaciones-service.ts
- Methods: obtener(filtros), count(), marcarLeida(id), marcarTodas(), eliminar(id)
- Done when: npm run lint passes.

### T8. Topbar bell + badge update
- File: frontend/src/layout/app-header.tsx (replaces hardcoded "4")
- Action: useNotificacionesCount hook + bell icon + badge that updates from polling
- Done when: bell shows real count, not "4".

### T9. NotificationDropdown component
- File: frontend/src/components/notifications/notification-dropdown.tsx
- Action: panel showing last 10 notifications, "Ver todas" link, "Marcar como leída" on click
- Done when: component renders + click marks as read.

### T10. /notificaciones page + polling hook
- Files: pages/notificaciones/index.tsx + hooks/use-notificaciones-polling.ts
- Action: paginated list, "Solo no leídas" filter, "Marcar todas" button. Hook polls every 30s, pauses on document.hidden.
- Done when: npm run build passes.

## Definition of done
- T1-T10 complete
- mvn compile + npm lint + npm build all green (pre-existing master errors tolerated)
- Manual smoke: AGENTE assigned to incidencia → sees badge update within 30s
- Updated proposal.md status
- apply-progress.md created
