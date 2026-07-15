package com.integrador.sistemaincidencias.notificaciones.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Respuesta de {@code POST /api/notificaciones/marcar-todas-leidas}.
 *
 * <p>El campo {@code actualizadas} reporta la cantidad de filas que
 * pasaron de no-leida a leida en esta llamada (idempotencia: una
 * segunda llamada devuelve {@code 0}). Se mantiene como DTO dedicado
 * en lugar de sobrecargar {@link NotificacionCountResponse} porque
 * la semantica del campo es distinta a la del badge del topbar:
 * aquel reporta conteo de no-leidas; este reporta escrituras
 * efectivas. La forma {@code {"actualizadas": N}} cumple el contrato
 * del escenario "marca todas las del usuario" del spec.</p>
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotificacionBulkResponse {

    private long actualizadas;
}
