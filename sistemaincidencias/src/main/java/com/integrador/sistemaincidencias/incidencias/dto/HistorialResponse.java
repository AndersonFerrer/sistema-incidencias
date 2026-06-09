package com.integrador.sistemaincidencias.incidencias.dto;

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
public class HistorialResponse {

    private UUID id;
    private UUID incidenciaId;
    private UUID usuarioId;
    private String accion;
    private UUID estadoProcesoAnteriorId;
    private UUID estadoProcesoNuevoId;
    private String nota;
    private LocalDateTime creadoEn;
}
