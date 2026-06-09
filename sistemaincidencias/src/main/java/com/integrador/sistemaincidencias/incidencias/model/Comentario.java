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
public class Comentario {

    private UUID id;
    private UUID incidenciaId;
    private UUID autorId;
    private String contenido;
    private LocalDateTime creadoEn;
    private LocalDateTime actualizadoEn;
}
