package com.integrador.sistemaincidencias.catalogos.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class EstadoAprobacionRequest {

    @NotBlank
    @Size(max = 50)
    private String clave;

    @NotBlank
    @Size(max = 150)
    private String etiqueta;

    private Boolean activo = true;
}
