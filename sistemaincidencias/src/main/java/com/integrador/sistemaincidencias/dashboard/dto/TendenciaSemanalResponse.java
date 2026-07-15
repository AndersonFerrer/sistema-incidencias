package com.integrador.sistemaincidencias.dashboard.dto;

import java.time.LocalDate;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Punto de la serie temporal semanal del dashboard (RF-09).
 *
 * {@code semanaInicio} representa el lunes (UTC servidor) al que {@code date_trunc('week', creado_en)}
 * colapsa la fecha de creacion. La serie llega ordenada ascendente sin huecos internos.
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TendenciaSemanalResponse {

    private LocalDate semanaInicio;
    private long total;
}