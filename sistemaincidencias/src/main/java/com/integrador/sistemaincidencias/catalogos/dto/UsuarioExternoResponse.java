package com.integrador.sistemaincidencias.catalogos.dto;

import java.util.UUID;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Builder
public class UsuarioExternoResponse {

    private UUID id;
    private String email;
    private String nombre;
    private String apellido;
    private Boolean activo;
}
