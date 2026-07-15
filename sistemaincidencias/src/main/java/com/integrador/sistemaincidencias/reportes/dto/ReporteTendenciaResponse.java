package com.integrador.sistemaincidencias.reportes.dto;

import java.time.LocalDate;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Punto de la serie temporal del reporte (RF-43).
 *
 * {@code bucketInicio} representa el inicio del bucket segun
 * {@link ReporteGranularidad}: el lunes ISO ({@code date_trunc('week')}),
 * el primer dia del mes ({@code date_trunc('month')}) o el dia
 * ({@code date_trunc('day')}). La serie llega ordenada ascendente sin huecos.
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReporteTendenciaResponse {

    private LocalDate bucketInicio;
    private long total;
}
