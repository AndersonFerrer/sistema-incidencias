package com.integrador.sistemaincidencias.catalogos.dto;

import java.util.UUID;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class EstadoProcesoResponse {

    private UUID id;
    private String clave;
    private String etiqueta;
    private Boolean esTerminal;
    private Integer orden;
    private Boolean activo;
}
