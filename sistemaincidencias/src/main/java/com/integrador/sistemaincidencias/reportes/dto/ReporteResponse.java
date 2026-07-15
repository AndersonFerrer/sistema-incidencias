package com.integrador.sistemaincidencias.reportes.dto;

import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Respuesta agregada del endpoint {@code GET /api/reportes}.
 *
 * Compone los seis bloques que el frontend necesita para renderizar la vista
 * previa del reporte:
 * <ol>
 *   <li>{@code filtro}: eco del filtro normalizado (RF-41).</li>
 *   <li>{@code kpis}: totales y conteos por estado/proceso/prioridad (RF-41).</li>
 *   <li>{@code byCategoria}: distribucion por categoria (RF-41).</li>
 *   <li>{@code tendencia}: serie temporal por granularidad (RF-43, default semanal).</li>
 *   <li>{@code resumenPorAgente}: filas por agente visible (RF-42, vacio para USUARIO).</li>
 *   <li>{@code tiempoPromedioResolucionHoras}: promedio global de horas entre creacion
 *       y resolucion (normalizado a {@code 0.0} cuando no hay finalizadas).</li>
 *   <li>{@code detalle}: hasta 50 incidencias ordenadas por {@code creadoEn} desc (RF-41 preview).</li>
 * </ol>
 *
 * El campo {@code detalle} reutiliza el DTO {@code dashboard.dto.IncidenciaResumenResponse}
 * para no duplicar el contrato slim que ya consume el frontend.
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReporteResponse {

    private ReporteFiltroAplicado filtro;
    private ReporteKpiResponse kpis;
    private List<ReporteConteoCategoriaResponse> byCategoria;
    private List<ReporteTendenciaResponse> tendencia;
    private List<ReporteResumenAgenteResponse> resumenPorAgente;
    private Double tiempoPromedioResolucionHoras;
    private List<com.integrador.sistemaincidencias.dashboard.dto.IncidenciaResumenResponse> detalle;
}
