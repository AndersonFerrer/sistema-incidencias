package com.integrador.sistemaincidencias.incidencias.dto;

import java.util.List;
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
public class IncidenciaDetalleResponse {

    private IncidenciaResponse incidencia;
    private List<ComentarioResponse> comentarios;
    private List<AdjuntoResponse> adjuntos;
    private List<HistorialResponse> historial;
}
