package com.integrador.sistemaincidencias.usuarios.model;

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
public class Usuario {

    private UUID id;
    private String nombre;
    private String email;
    private String passwordHash;
    private Rol rol;
    private Boolean activo;
    private String avatarUrl;
    private LocalDateTime creadoEn;
    private LocalDateTime actualizadoEn;

    public boolean estaActivo() {
        return Boolean.TRUE.equals(activo);
    }

    public String codigoRol() {
        return rol == null ? null : rol.getCodigo();
    }
}
