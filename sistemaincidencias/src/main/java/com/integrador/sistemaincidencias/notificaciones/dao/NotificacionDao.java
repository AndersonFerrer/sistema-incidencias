package com.integrador.sistemaincidencias.notificaciones.dao;

import com.integrador.sistemaincidencias.notificaciones.mapper.NotificacionMapper;
import com.integrador.sistemaincidencias.notificaciones.model.Notificacion;
import com.integrador.sistemaincidencias.notificaciones.sql.NotificacionSql;
import com.integrador.sistemaincidencias.shared.exception.AccesoDatosException;
import com.integrador.sistemaincidencias.shared.pagination.PageRequest;
import com.integrador.sistemaincidencias.shared.pagination.PageResult;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import javax.sql.DataSource;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * Acceso a datos del modulo de notificaciones.
 *
 * <p>Cada metodo ejecuta una sola sentencia SQL nativa con parametros
 * vinculados via {@link PreparedStatement#setObject(int, Object)};
 * nunca se concatena entrada del usuario. El scope por usuario
 * esta siempre presente en la condicion {@code WHERE usuario_id = ?}
 * (decision D6 del design: "SQL owner predicate").</p>
 *
 * <p>Patron heredado de {@code IncidenciaDao}: conexiones tomadas del
 * pool HikariCP con {@code dataSource.getConnection()}, sin transaccion
 * explicita salvo donde el helper {@code insertar} es invocado
 * dentro de un metodo ya transaccionado aguas arriba
 * (ver propuesta R3 y seccion "Manejo transaccional").</p>
 */
@Component
@RequiredArgsConstructor
public class NotificacionDao {

    private final DataSource dataSource;
    private final NotificacionMapper notificacionMapper;

    /**
     * Lista paginada del usuario autenticado.
     *
     * @param usuarioId id del destinatario (siempre resuelto por
     *        {@code validarAutenticado} aguas arriba)
     * @param pageRequest paginacion solicitada por el cliente
     * @param soloNoLeidas si {@code true}, agrega el predicado
     *        {@code AND leido_en IS NULL} a la consulta
     */
    public PageResult<Notificacion> listar(
            UUID usuarioId,
            PageRequest pageRequest,
            boolean soloNoLeidas
    ) {
        String sql = NotificacionSql.LISTAR_BASE
                + (soloNoLeidas ? NotificacionSql.LISTAR_FILTRO_NO_LEIDAS : "")
                + NotificacionSql.LISTAR_ORDEN;
        String countSql = NotificacionSql.CONTAR_BASE
                + (soloNoLeidas ? NotificacionSql.CONTAR_FILTRO_NO_LEIDAS : "");

        try (Connection connection = dataSource.getConnection()) {
            long total = contarFiltrado(connection, countSql, usuarioId);
            List<Notificacion> contenido = listar(connection, sql, usuarioId, pageRequest);
            return PageResult.<Notificacion>builder()
                    .contenido(contenido)
                    .total(total)
                    .page(pageRequest.getPage())
                    .size(pageRequest.getSize())
                    .build();
        } catch (SQLException exception) {
            throw new AccesoDatosException("Error al listar notificaciones", exception);
        }
    }

    /**
     * Cuenta las filas no leidas del usuario. Es el endpoint del badge
     * del topbar, asi que se ejecuta con una sola query por peticion.
     */
    public long contarNoLeidas(UUID usuarioId) {
        String sql = NotificacionSql.CONTAR_BASE + NotificacionSql.CONTAR_FILTRO_NO_LEIDAS;
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setObject(1, usuarioId);
            try (ResultSet rs = statement.executeQuery()) {
                return rs.next() ? rs.getLong(1) : 0L;
            }
        } catch (SQLException exception) {
            throw new AccesoDatosException(
                    "Error al contar notificaciones no leidas", exception);
        }
    }

    /**
     * Marca una sola notificacion como leida. Devuelve {@code true}
     * cuando la fila existia y era del usuario; {@code false} en otro
     * caso (id ajeno o ya inexistente). El servicio traduce ese
     * {@code false} a {@code RecursoNoEncontradoException} para que el
     * controller emita 404 (ver escenario "id de otro usuario retorna 404"
     * del spec).
     */
    public boolean marcarLeida(UUID notificacionId, UUID usuarioId, LocalDateTime leidoEn) {
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(
                        NotificacionSql.MARCAR_LEIDA)) {
            statement.setTimestamp(1, Timestamp.valueOf(leidoEn));
            statement.setObject(2, notificacionId);
            statement.setObject(3, usuarioId);
            return statement.executeUpdate() > 0;
        } catch (SQLException exception) {
            throw new AccesoDatosException(
                    "Error al marcar notificacion como leida", exception);
        }
    }

    /**
     * Marca todas las notificaciones no leidas del usuario. Idempotente
     * por construccion: solo afecta filas con {@code leido_en IS NULL}.
     */
    public long marcarTodasLeidas(UUID usuarioId, LocalDateTime leidoEn) {
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(
                        NotificacionSql.MARCAR_TODAS_LEIDAS)) {
            statement.setTimestamp(1, Timestamp.valueOf(leidoEn));
            statement.setObject(2, usuarioId);
            return statement.executeUpdate();
        } catch (SQLException exception) {
            throw new AccesoDatosException(
                    "Error al marcar todas las notificaciones como leidas", exception);
        }
    }

    /**
     * Elimina una sola notificacion del usuario. Devuelve {@code true}
     * cuando la fila existia y era del dueno; {@code false} en otro
     * caso. La conversion a 404 la hace el servicio.
     */
    public boolean eliminar(UUID notificacionId, UUID usuarioId) {
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(
                        NotificacionSql.ELIMINAR)) {
            statement.setObject(1, notificacionId);
            statement.setObject(2, usuarioId);
            return statement.executeUpdate() > 0;
        } catch (SQLException exception) {
            throw new AccesoDatosException(
                    "Error al eliminar notificacion", exception);
        }
    }

    /**
     * Inserta una nueva notificacion para el destinatario.
     *
     * <p>Helper interno de generacion automatica (ver T6, hooks en
     * {@code IncidenciaService}). No recibe {@code leido_en} (se omite
     * del insert; la columna acepta {@code NULL}). El {@code creadoEn}
     * lo asigna la propia BD con {@code CURRENT_TIMESTAMP}.</p>
     */
    public Notificacion insertar(Notificacion notificacion) {
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(
                        NotificacionSql.INSERTAR)) {
            statement.setObject(1, notificacion.getId());
            statement.setObject(2, notificacion.getUsuarioId());
            statement.setObject(3, notificacion.getIncidenciaId());
            statement.setObject(4, notificacion.getClienteId());
            statement.setString(5, notificacion.getTipo());
            statement.setString(6, notificacion.getTitulo());
            statement.setString(7, notificacion.getDescripcion());
            statement.executeUpdate();
            return buscarPorId(notificacion.getId()).orElse(notificacion);
        } catch (SQLException exception) {
            throw new AccesoDatosException("Error al insertar notificacion", exception);
        }
    }

    public Optional<Notificacion> buscarPorId(UUID id) {
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(
                        NotificacionSql.BUSCAR_POR_ID)) {
            statement.setObject(1, id);
            try (ResultSet rs = statement.executeQuery()) {
                return rs.next() ? Optional.of(notificacionMapper.mapear(rs)) : Optional.empty();
            }
        } catch (SQLException exception) {
            throw new AccesoDatosException("Error al buscar notificacion por id", exception);
        }
    }

    private long contarFiltrado(Connection connection, String countSql, UUID usuarioId)
            throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(countSql)) {
            statement.setObject(1, usuarioId);
            try (ResultSet rs = statement.executeQuery()) {
                return rs.next() ? rs.getLong(1) : 0L;
            }
        }
    }

    private List<Notificacion> listar(
            Connection connection,
            String sql,
            UUID usuarioId,
            PageRequest pageRequest
    ) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setObject(1, usuarioId);
            statement.setInt(2, pageRequest.getSize());
            statement.setInt(3, pageRequest.offset());
            try (ResultSet rs = statement.executeQuery()) {
                List<Notificacion> filas = new ArrayList<>();
                while (rs.next()) {
                    filas.add(notificacionMapper.mapear(rs));
                }
                return filas;
            }
        }
    }
}
