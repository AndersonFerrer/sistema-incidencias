package com.integrador.sistemaincidencias.usuarios.dto;

import java.time.LocalDateTime;
import java.util.UUID;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class UsuarioResponse {

    private UUID id;
    private String nombre;
    private String email;
    private RolResponse rol;
    private Boolean activo;
    private String avatarUrl;
    private LocalDateTime creadoEn;
    private LocalDateTime actualizadoEn;
}
