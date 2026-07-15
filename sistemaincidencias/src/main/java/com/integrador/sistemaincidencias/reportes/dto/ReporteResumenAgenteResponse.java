package com.integrador.sistemaincidencias.reportes.dto;

import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Resumen por agente visible dentro del alcance autorizado (RF-42).
 *
 * Se omite para el rol {@code USUARIO}: ver {@code ReporteService#construir}
 * (design.md D2 y D6). {@code promedioResolucionHoras} puede ser {@code null}
 * cuando el agente no tiene incidencias resueltas en el rango (no se confunde
 * con un promedio de {@code 0.0}).
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReporteResumenAgenteResponse {

    private UUID agenteId;
    private String agenteNombre;
    private long totalAsignadas;
    private long resueltas;
    private long pendientes;
    private long enProceso;
    private Double promedioResolucionHoras;
}
