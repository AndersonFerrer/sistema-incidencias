package com.integrador.sistemaincidencias.incidencias.mapper;

import com.integrador.sistemaincidencias.incidencias.model.Incidencia;
import com.integrador.sistemaincidencias.incidencias.model.Prioridad;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.UUID;
import org.springframework.stereotype.Component;

@Component
public class IncidenciaMapper {

    public Incidencia mapear(ResultSet rs) throws SQLException {
        return Incidencia.builder()
                .id(rs.getObject("id", UUID.class))
                .codigo(rs.getString("codigo"))
                .titulo(rs.getString("titulo"))
                .descripcion(rs.getString("descripcion"))
                .clienteId(rs.getObject("cliente_id", UUID.class))
                .estadoProcesoId(rs.getObject("estado_proceso_id", UUID.class))
                .estadoAprobacionId(rs.getObject("estado_aprobacion_id", UUID.class))
                .prioridad(Prioridad.valueOf(rs.getString("prioridad")))
                .categoriaId(rs.getObject("categoria_id", UUID.class))
                .creadoPorUsuarioId(rs.getObject("creado_por_usuario_id", UUID.class))
                .usuarioExternoId(rs.getObject("usuario_externo_id", UUID.class))
                .asignadoA(rs.getObject("asignado_a", UUID.class))
                .creadoEn(toLocalDateTime(rs.getTimestamp("creado_en")))
                .actualizadoEn(toLocalDateTime(rs.getTimestamp("actualizado_en")))
                .resueltoEn(toLocalDateTime(rs.getTimestamp("resuelto_en")))
                .build();
    }

    private LocalDateTime toLocalDateTime(Timestamp timestamp) {
        return timestamp == null ? null : timestamp.toLocalDateTime();
    }
}
