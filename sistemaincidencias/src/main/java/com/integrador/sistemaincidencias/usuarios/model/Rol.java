package com.integrador.sistemaincidencias.usuarios.model;

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
public class Rol {

    private UUID id;
    private String codigo;
    private String nombre;
    private String descripcion;
    private Boolean activo;

    public boolean esAdministrador() {
        return "ADMINISTRADOR".equalsIgnoreCase(codigo);
    }

    public boolean esAgente() {
        return "AGENTE".equalsIgnoreCase(codigo);
    }
}
