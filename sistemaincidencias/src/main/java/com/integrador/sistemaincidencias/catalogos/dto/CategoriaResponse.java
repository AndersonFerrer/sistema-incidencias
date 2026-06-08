package com.integrador.sistemaincidencias.catalogos.dto;

import java.util.UUID;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Builder
public class CategoriaResponse {

    private UUID id;
    private String nombre;
    private String descripcion;
    private Boolean activo;
}
