package com.integrador.sistemaincidencias.incidencias.dto;

import jakarta.validation.constraints.NotNull;
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
public class CambiarEstadoRequest {

    @NotNull(message = "El estado de proceso es obligatorio")
    private UUID estadoProcesoId;

    private String nota;
}
