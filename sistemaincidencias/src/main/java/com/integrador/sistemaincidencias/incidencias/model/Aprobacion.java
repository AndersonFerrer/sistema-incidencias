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
public class Aprobacion {

    private UUID id;
    private UUID incidenciaId;
    private UUID revisadoPor;
    private UUID estadoAprobacionId;
    private String motivoRechazo;
    private LocalDateTime decididoEn;
}
