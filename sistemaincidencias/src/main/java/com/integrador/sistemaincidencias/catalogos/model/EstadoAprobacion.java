package com.integrador.sistemaincidencias.catalogos.model;

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
public class EstadoAprobacion {

    private UUID id;
    private String clave;
    private String etiqueta;
    private Boolean activo;
}
