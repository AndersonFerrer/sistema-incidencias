package com.integrador.sistemaincidencias.notificaciones.model;

/**
 * Tipos de notificacion reconocidos por el modulo (change
 * {@code notificaciones-realtime}).
 *
 * <p>Se almacenan en la columna {@code tipo varchar(80)} como la
 * representacion en mayusculas del nombre de la constante (por ejemplo
 * {@code "INCIDENCIA_ASIGNADA"}). El mapper / el servicio debe llamar a
 * {@link NotificacionTipo#name()} al serializar y a
 * {@link NotificacionTipo#valueOf(String)} al deserializar.</p>
 *
 * <p>El conjunto cubre los cinco eventos del RF-37 que generan
 * notificacion automatica (ver
 * {@code sistemaincidencias/incidencias/service/IncidenciaService.java}
 * hooks T6) y queda alineado con la seccion "Resolucion de Q2" del
 * {@code openspec/changes/notificaciones-realtime/proposal.md}.</p>
 */
public enum NotificacionTipo {
    INCIDENCIA_ASIGNADA,
    INCIDENCIA_APROBADA,
    INCIDENCIA_RECHAZADA,
    INCIDENCIA_ESTADO_CAMBIADO,
    INCIDENCIA_COMENTARIO
}
