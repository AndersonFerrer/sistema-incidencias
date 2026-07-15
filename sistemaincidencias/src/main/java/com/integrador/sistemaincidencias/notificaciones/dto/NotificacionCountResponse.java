package com.integrador.sistemaincidencias.notificaciones.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Conteo de notificaciones no leidas del usuario autenticado.
 *
 * <p>Respuesta de {@code GET /api/notificaciones/no-leidas/count}.
 * El campo {@code total} NUNCA es {@code null}: cuando el usuario
 * no tiene notificaciones sin leer, el servicio retorna {@code 0}
 * para que el badge del topbar se oculte limpiamente en el frontend.</p>
 *
 * <p>Reutilizado tambien como respuesta de
 * {@code POST /api/notificaciones/marcar-todas-leidas} para
 * devolver el numero de filas efectivamente actualizadas; en ese
 * caso la semantica del campo cambia a "actualizadas", pero se
 * mantiene el mismo nombre para evitar un DTO adicional.</p>
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotificacionCountResponse {

    private long total;
}
