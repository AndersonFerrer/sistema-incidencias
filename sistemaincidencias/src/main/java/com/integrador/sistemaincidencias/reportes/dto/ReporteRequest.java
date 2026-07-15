package com.integrador.sistemaincidencias.reportes.dto;

import java.time.LocalDate;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Filtro de transporte aceptado por {@code GET /api/reportes} y
 * {@code GET /api/reportes/exportar}.
 *
 * Todos los campos son opcionales. El servicio normaliza este objeto a un
 * {@code ReporteFiltro} interno con marcas de tiempo y enum validados.
 *
 * Reglas:
 * <ul>
 *   <li>Si llega un par completo de fechas ({@code desde} y {@code hasta}) gana sobre
 *       {@code rango}; ver proposal.md seccion 3.2 y design.md D3.</li>
 *   <li>{@code rango} es el preset UI ({@code 7d|30d|90d|all}); {@code custom} solo
 *       es una pista del frontend y se resuelve con las fechas explicitas.</li>
 *   <li>{@code granularidad} se normaliza a {@link ReporteGranularidad}; vacio o nulo
 *       se interpreta como {@code SEMANAL}.</li>
 *   <li>{@code agenteId} solo es respetado para {@code ADMINISTRADOR}; el resto de
 *       roles lo ignora (ver design.md D2 y RBAC forzado por el servicio).</li>
 * </ul>
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReporteRequest {

    private LocalDate desde;
    private LocalDate hasta;
    private String rango;
    private UUID agenteId;
    private String granularidad;
}
