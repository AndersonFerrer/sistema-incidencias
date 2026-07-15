package com.integrador.sistemaincidencias.dashboard.dto;

import java.util.Map;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Bloque de KPIs globales del dashboard (RF-06 / RF-07).
 *
 * Las claves de los mapas corresponden a los codigos canónicos de los catalogos:
 * <ul>
 *   <li>{@code byEstadoAprobacion}: {@code SOLICITADA}, {@code APROBADA}, {@code RECHAZADA}.</li>
 *   <li>{@code byEstadoProceso}: {@code PENDIENTE}, {@code EN_PROCESO}, {@code FINALIZADA}.</li>
 * </ul>
 * El servicio garantiza que las claves esperadas existan incluso cuando el conteo es cero,
 * por lo que el frontend puede iterar de forma segura sin comprobaciones adicionales.
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class KpisResponse {

    private long total;
    private Map<String, Long> byEstadoAprobacion;
    private Map<String, Long> byEstadoProceso;
}