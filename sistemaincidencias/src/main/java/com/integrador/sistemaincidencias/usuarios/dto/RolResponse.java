package com.integrador.sistemaincidencias.usuarios.dto;

import java.util.UUID;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class RolResponse {

    private UUID id;
    private String codigo;
    private String nombre;
    private String descripcion;
    private Boolean activo;
}
