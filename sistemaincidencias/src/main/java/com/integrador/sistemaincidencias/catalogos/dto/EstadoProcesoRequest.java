package com.integrador.sistemaincidencias.catalogos.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class EstadoProcesoRequest {

    @NotBlank
    @Size(max = 50)
    @Pattern(regexp = "^[A-Z0-9_]+$")
    private String clave;

    @NotBlank
    @Size(max = 100)
    private String etiqueta;

    @NotNull
    private Boolean esTerminal;

    @NotNull
    @Min(1)
    private Integer orden;

    private Boolean activo = true;
}
