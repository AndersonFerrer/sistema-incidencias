package com.integrador.sistemaincidencias.auditoria.dao;

import com.integrador.sistemaincidencias.auditoria.model.AuditEvento;
import com.integrador.sistemaincidencias.auditoria.sql.AuditEventoSql;
import com.integrador.sistemaincidencias.shared.exception.AccesoDatosException;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.sql.Types;
import java.util.UUID;
import javax.sql.DataSource;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * DAO append-only para {@link AuditEvento}. Solo {@link #insertar}.
 *
 * <p>Una fila de auditoria no se debe editar ni borrar desde el codigo;
 * la tabla es append-only. Las lecturas (futuro endpoint para admins)
 * haran SELECT directo via JdbcTemplate/DataSource, sin un metodo aqui.</p>
 */
@Component
@RequiredArgsConstructor
public class AuditEventoDao {

    private final DataSource dataSource;

    public void insertar(AuditEvento evento) {
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(AuditEventoSql.INSERTAR)) {
            statement.setObject(1, evento.getId());
            if (evento.getUsuarioId() != null) {
                statement.setObject(2, evento.getUsuarioId());
            } else {
                statement.setNull(2, Types.OTHER);
            }
            statement.setString(3, evento.getAccion());
            statement.setString(4, evento.getRecurso());
            if (evento.getRecursoId() != null) {
                statement.setObject(5, evento.getRecursoId());
            } else {
                statement.setNull(5, Types.OTHER);
            }
            if (evento.getMetadata() != null) {
                statement.setString(6, evento.getMetadata());
            } else {
                statement.setNull(6, Types.OTHER);
            }
            statement.setBoolean(7, evento.isExitoso());
            statement.executeUpdate();
        } catch (SQLException exception) {
            throw new AccesoDatosException("Error al registrar evento de auditoria", exception);
        }
    }

    /**
     * Compatibilidad con la API usada en las correcciones: si no se pasa
     * id, se genera uno. Si no se pasa metadata, queda null.
     */
    public void registrar(UUID usuarioId, String accion, String recurso, UUID recursoId,
            String metadata, boolean exitoso) {
        insertar(AuditEvento.builder()
                .id(UUID.randomUUID())
                .usuarioId(usuarioId)
                .accion(accion)
                .recurso(recurso)
                .recursoId(recursoId)
                .metadata(metadata)
                .exitoso(exitoso)
                .build());
    }
}
