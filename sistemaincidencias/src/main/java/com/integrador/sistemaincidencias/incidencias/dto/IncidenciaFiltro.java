package com.integrador.sistemaincidencias.incidencias.dto;

import com.integrador.sistemaincidencias.incidencias.model.Prioridad;
import java.time.LocalDate;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class IncidenciaFiltro {

    private String texto;
    private UUID clienteId;
    private UUID estadoProcesoId;
    private UUID estadoAprobacionId;
    private UUID categoriaId;
    private UUID asignadoA;
    private Prioridad prioridad;
    private LocalDate desde;
    private LocalDate hasta;
}
