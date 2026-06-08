package com.integrador.sistemaincidencias.catalogos.dto;

import java.util.UUID;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Builder
public class EstadoAprobacionResponse {

    private UUID id;
    private String clave;
    private String etiqueta;
    private Boolean activo;
}
