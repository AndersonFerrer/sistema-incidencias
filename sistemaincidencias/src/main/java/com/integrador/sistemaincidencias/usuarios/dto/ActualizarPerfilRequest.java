package com.integrador.sistemaincidencias.usuarios.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ActualizarPerfilRequest {

    @NotBlank
    @Size(max = 150)
    private String nombre;

    @Size(max = 500)
    @Pattern(regexp = "^$|^https://[A-Za-z0-9.-]+(:[0-9]{1,5})?(/[A-Za-z0-9._~:/?#\\[\\]@!$&'()*+,;=%-]*)?$")
    private String avatarUrl;
}
