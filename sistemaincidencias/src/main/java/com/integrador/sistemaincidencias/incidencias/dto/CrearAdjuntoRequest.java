package com.integrador.sistemaincidencias.incidencias.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
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
public class CrearAdjuntoRequest {

    @NotBlank(message = "El nombre del archivo es obligatorio")
    private String nombreArchivo;

    @NotBlank(message = "El tipo MIME es obligatorio")
    private String tipoMime;

    @NotNull(message = "El tamano del archivo es obligatorio")
    @Min(value = 1, message = "El tamano del archivo debe ser mayor a cero")
    private Integer tamanoBytes;

    @NotBlank(message = "La URL o ruta del archivo es obligatoria")
    private String url;
}
