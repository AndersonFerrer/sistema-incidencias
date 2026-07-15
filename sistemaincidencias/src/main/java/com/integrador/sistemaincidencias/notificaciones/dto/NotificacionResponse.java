package com.integrador.sistemaincidencias.notificaciones.dto;

import com.integrador.sistemaincidencias.notificaciones.model.NotificacionTipo;
import java.time.LocalDateTime;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Fila del centro de notificaciones.
 *
 * <p>Es la representacion externa de una notificacion persistida.
 * El campo {@code leido} se calcula en el mapper o el servicio
 * como {@code leidoEn != null} para no exponer la columna cruda
 * (en la tabla se llama {@code leido_en}).</p>
 *
 * <p>Es la salida de {@code GET /api/notificaciones} (paginado),
 * de la accion {@code marcarLeida} y del payload del dropdown del
 * topbar (ultimas 10).</p>
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotificacionResponse {

    private UUID id;
    private UUID usuarioId;
    private UUID incidenciaId;
    private NotificacionTipo tipo;
    private String titulo;
    private String descripcion;
    private boolean leido;
    private LocalDateTime leidoEn;
    private LocalDateTime creadoEn;
}
