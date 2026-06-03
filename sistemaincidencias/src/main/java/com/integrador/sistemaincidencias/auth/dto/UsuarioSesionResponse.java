package com.integrador.sistemaincidencias.auth.dto;

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
public class UsuarioSesionResponse {

    private UUID id;
    private String nombre;
    private String email;
    private String rol;
    private String avatarUrl;
}
