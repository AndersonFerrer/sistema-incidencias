package com.integrador.sistemaincidencias.dashboard.dto;

import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Respuesta agregada del endpoint {@code GET /api/dashboard}.
 *
 * Compone los seis bloques que el frontend necesita para renderizar la pantalla:
 * <ol>
 *   <li>{@code kpis}: totales y conteos por estado (RF-06 / RF-07).</li>
 *   <li>{@code byCategoria}: distribucion por categoria (RF-08).</li>
 *   <li>{@code tendenciaSemanal}: serie temporal por semana (RF-09).</li>
 *   <li>{@code recientes}: hasta cinco incidencias ordenadas por {@code creadoEn} desc (RF-10).</li>
 *   <li>{@code tiempoPromedioResolucionHoras}: promedio de horas entre creacion y resolucion (RF-11).
 *       Es {@code null} cuando no hay finalizadas en el scope + rango; el frontend oculta
 *       la card correspondiente en ese caso.</li>
 *   <li>{@code rangoAplicado}: eco del parametro {@code rango} recibido en la URL.</li>
 * </ol>
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DashboardResponse {

    private KpisResponse kpis;
    private List<CategoriaConteoResponse> byCategoria;
    private List<TendenciaSemanalResponse> tendenciaSemanal;
    private List<IncidenciaResumenResponse> recientes;
    private Double tiempoPromedioResolucionHoras;
    private String rangoAplicado;
}