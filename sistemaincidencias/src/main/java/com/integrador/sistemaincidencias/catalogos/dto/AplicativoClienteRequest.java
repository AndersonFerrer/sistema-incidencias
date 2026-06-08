package com.integrador.sistemaincidencias.catalogos.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class AplicativoClienteRequest {

    @NotBlank
    @Size(max = 100)
    private String nombre;

    private Boolean activo = true;
}
