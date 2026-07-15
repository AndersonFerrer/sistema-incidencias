package com.integrador.sistemaincidencias.reportes.dto;

import java.util.Map;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Bloque de KPIs del reporte (RF-41 + RF-42 + RF-43).
 *
 * Los mapas llegan con claves canonicas garantizadas por el servicio:
 * <ul>
 *   <li>{@code byEstadoAprobacion}: {@code SOLICITADA}, {@code APROBADA}, {@code RECHAZADA}.</li>
 *   <li>{@code byEstadoProceso}: {@code PENDIENTE}, {@code EN_PROCESO}, {@code FINALIZADA}.</li>
 *   <li>{@code byPrioridad}: {@code BAJA}, {@code MEDIA}, {@code ALTA}, {@code CRITICA}.</li>
 * </ul>
 * Las claves faltantes se rellenan con {@code 0L} en el servicio.
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReporteKpiResponse {

    private long total;
    private Map<String, Long> byEstadoAprobacion;
    private Map<String, Long> byEstadoProceso;
    private Map<String, Long> byPrioridad;
}
