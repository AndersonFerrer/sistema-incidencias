package com.integrador.sistemaincidencias.incidencias.mapper;

import com.integrador.sistemaincidencias.incidencias.model.Comentario;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.UUID;
import org.springframework.stereotype.Component;

@Component
public class ComentarioMapper {

    public Comentario mapear(ResultSet rs) throws SQLException {
        return Comentario.builder()
                .id(rs.getObject("id", UUID.class))
                .incidenciaId(rs.getObject("incidencia_id", UUID.class))
                .autorId(rs.getObject("autor_id", UUID.class))
                .contenido(rs.getString("contenido"))
                .creadoEn(toLocalDateTime(rs.getTimestamp("creado_en")))
                .actualizadoEn(toLocalDateTime(rs.getTimestamp("actualizado_en")))
                .build();
    }

    private LocalDateTime toLocalDateTime(Timestamp timestamp) {
        return timestamp == null ? null : timestamp.toLocalDateTime();
    }
}
