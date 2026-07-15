package com.integrador.sistemaincidencias.dashboard.dto;

import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Conteo de incidencias agrupadas por categoria (RF-08).
 *
 * Solo se devuelven categorias con al menos una incidencia en el scope + rango
 * solicitado (filtro {@code HAVING COUNT(*) > 0} en SQL), ordenadas desc por total.
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CategoriaConteoResponse {

    private UUID categoriaId;
    private String categoriaNombre;
    private long total;
}