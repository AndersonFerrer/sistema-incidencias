package com.integrador.sistemaincidencias.incidencias.dto;

import jakarta.validation.constraints.NotBlank;
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
public class CrearComentarioRequest {

    @NotBlank(message = "El comentario no puede estar vacio")
    private String contenido;
}
