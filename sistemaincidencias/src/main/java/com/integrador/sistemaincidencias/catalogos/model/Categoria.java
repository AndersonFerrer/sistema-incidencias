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
public class Categoria {

    private UUID id;
    private UUID aplicativoId;
    private String nombre;
    private String descripcion;
    private Boolean activo;
}
