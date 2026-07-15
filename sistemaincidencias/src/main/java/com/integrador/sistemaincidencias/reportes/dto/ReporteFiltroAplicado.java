package com.integrador.sistemaincidencias.reportes.dto;

import java.time.LocalDate;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Eco del filtro normalizado que el backend aplico al dataset (RF-41).
 *
 * Las fechas ya estan en formato {@code YYYY-MM-DD} y la granularidad es el
 * codigo canonico resuelto por el servicio ({@code Diaria|Semanal|Mensual}).
 * Si el cliente envio un preset, {@code rangoAplicado} lleva el codigo
 * ({@code 7d|30d|90d|all}); en caso contrario es {@code custom}.
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReporteFiltroAplicado {

    private LocalDate desde;
    private LocalDate hasta;
    private String rangoAplicado;
    private String granularidad;
}
