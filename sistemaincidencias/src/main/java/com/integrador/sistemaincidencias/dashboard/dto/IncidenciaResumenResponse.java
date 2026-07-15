package com.integrador.sistemaincidencias.dashboard.dto;

import com.integrador.sistemaincidencias.incidencias.model.Prioridad;
import java.time.LocalDateTime;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * DTO ligero para la lista de incidencias recientes del dashboard (RF-10).
 *
 * Es deliberadamente mas estrecho que {@code IncidenciaResponse}: solo expone
 * los campos que el frontend necesita para renderizar la fila. Asi evitamos
 * filtrar informacion interna (ids tecnicos) y mantenemos el payload pequeno.
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class IncidenciaResumenResponse {

    private UUID id;
    private String codigo;
    private String titulo;
    private String categoriaNombre;
    private UUID asignadoA;
    private String estadoProcesoCodigo;
    private String estadoAprobacionCodigo;
    private Prioridad prioridad;
    private LocalDateTime creadoEn;
    private LocalDateTime resueltoEn;
}