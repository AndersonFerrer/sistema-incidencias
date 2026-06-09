package com.integrador.sistemaincidencias.incidencias.model;

import java.time.LocalDateTime;
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
public class Incidencia {

    private UUID id;
    private String codigo;
    private String titulo;
    private String descripcion;
    private UUID clienteId;
    private UUID estadoProcesoId;
    private UUID estadoAprobacionId;
    private Prioridad prioridad;
    private UUID categoriaId;
    private UUID creadoPorUsuarioId;
    private UUID usuarioExternoId;
    private UUID asignadoA;
    private LocalDateTime creadoEn;
    private LocalDateTime actualizadoEn;
    private LocalDateTime resueltoEn;
}
