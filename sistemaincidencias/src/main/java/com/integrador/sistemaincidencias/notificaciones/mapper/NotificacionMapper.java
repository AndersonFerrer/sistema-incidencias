package com.integrador.sistemaincidencias.notificaciones.mapper;

import com.integrador.sistemaincidencias.notificaciones.model.Notificacion;
import com.integrador.sistemaincidencias.notificaciones.model.NotificacionTipo;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.UUID;
import org.springframework.stereotype.Component;

/**
 * Convierte filas de {@link ResultSet} en {@link Notificacion}.
 *
 * <p>Mapea columnas crudas de {@code notificaciones} a tipos Java:
 * columnas UUID con {@code getObject(name, UUID.class)}, columnas
 * timestamp con {@link Timestamp} -> {@link LocalDateTime}, columna
 * {@code tipo varchar(80)} con {@link NotificacionTipo#valueOf(String)}
 * (defensivo: un valor invalido en BD se traduce a {@code IllegalArgumentException}
 * que el DAO envuelve como {@code AccesoDatosException}, terminando en 500
 * explicito por el {@code GlobalExceptionHandler}).</p>
 */
@Component
public class NotificacionMapper {

    public Notificacion mapear(ResultSet rs) throws SQLException {
        String tipoCrudo = rs.getString("tipo");
        NotificacionTipo tipo = tipoCrudo == null ? null : NotificacionTipo.valueOf(tipoCrudo);
        return Notificacion.builder()
                .id(rs.getObject("id", UUID.class))
                .usuarioId(rs.getObject("usuario_id", UUID.class))
                .incidenciaId(rs.getObject("incidencia_id", UUID.class))
                .clienteId(rs.getObject("cliente_id", UUID.class))
                .tipo(tipo == null ? null : tipo.name())
                .titulo(rs.getString("titulo"))
                .descripcion(rs.getString("descripcion"))
                .leidoEn(toLocalDateTime(rs.getTimestamp("leido_en")))
                .creadoEn(toLocalDateTime(rs.getTimestamp("creado_en")))
                .build();
    }

    private LocalDateTime toLocalDateTime(Timestamp timestamp) {
        return timestamp == null ? null : timestamp.toLocalDateTime();
    }
}
