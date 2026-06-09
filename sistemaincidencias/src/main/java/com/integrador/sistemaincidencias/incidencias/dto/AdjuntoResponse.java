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
public class AdjuntoResponse {

    private UUID id;
    private UUID incidenciaId;
    private UUID subidoPor;
    private String nombreArchivo;
    private String tipoMime;
    private Integer tamanoBytes;
    private String url;
    private LocalDateTime subidoEn;
}
