package com.integrador.sistemaincidencias.incidencias.mapper;

import com.integrador.sistemaincidencias.incidencias.model.HistorialIncidencia;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.UUID;
import org.springframework.stereotype.Component;

@Component
public class HistorialIncidenciaMapper {

    public HistorialIncidencia mapear(ResultSet rs) throws SQLException {
        return HistorialIncidencia.builder()
                .id(rs.getObject("id", UUID.class))
                .incidenciaId(rs.getObject("incidencia_id", UUID.class))
                .usuarioId(rs.getObject("usuario_id", UUID.class))
                .accion(rs.getString("accion"))
                .estadoProcesoAnteriorId(rs.getObject("estado_proceso_anterior_id", UUID.class))
                .estadoProcesoNuevoId(rs.getObject("estado_proceso_nuevo_id", UUID.class))
                .nota(rs.getString("nota"))
                .creadoEn(toLocalDateTime(rs.getTimestamp("creado_en")))
                .build();
    }

    private LocalDateTime toLocalDateTime(Timestamp timestamp) {
        return timestamp == null ? null : timestamp.toLocalDateTime();
    }
}
