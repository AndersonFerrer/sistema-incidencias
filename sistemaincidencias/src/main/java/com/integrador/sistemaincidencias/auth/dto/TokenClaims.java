package com.integrador.sistemaincidencias.auth.dto;

import java.time.Instant;
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
public class TokenClaims {

    private UUID usuarioId;
    private String email;
    private String rol;
    private Instant expiracion;
}
