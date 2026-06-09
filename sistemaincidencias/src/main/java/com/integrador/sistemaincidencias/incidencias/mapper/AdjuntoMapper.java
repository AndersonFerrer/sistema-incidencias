package com.integrador.sistemaincidencias.incidencias.mapper;

import com.integrador.sistemaincidencias.incidencias.model.Adjunto;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.UUID;
import org.springframework.stereotype.Component;

@Component
public class AdjuntoMapper {

    public Adjunto mapear(ResultSet rs) throws SQLException {
        return Adjunto.builder()
                .id(rs.getObject("id", UUID.class))
                .incidenciaId(rs.getObject("incidencia_id", UUID.class))
                .subidoPor(rs.getObject("subido_por", UUID.class))
                .nombreArchivo(rs.getString("nombre_archivo"))
                .tipoMime(rs.getString("tipo_mime"))
                .tamanoBytes(rs.getInt("tamaño_bytes"))
                .url(rs.getString("url"))
                .subidoEn(toLocalDateTime(rs.getTimestamp("subido_en")))
                .build();
    }

    private LocalDateTime toLocalDateTime(Timestamp timestamp) {
        return timestamp == null ? null : timestamp.toLocalDateTime();
    }
}
