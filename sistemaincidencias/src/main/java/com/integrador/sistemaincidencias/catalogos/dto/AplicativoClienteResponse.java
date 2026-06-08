package com.integrador.sistemaincidencias.catalogos.dto;

import java.util.UUID;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Builder
public class AplicativoClienteResponse {

    private UUID id;
    private String nombre;
    private String apiKey;
    private Boolean activo;
}
