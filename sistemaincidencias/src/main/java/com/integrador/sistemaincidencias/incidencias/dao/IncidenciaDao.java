package com.integrador.sistemaincidencias.incidencias.dao;

import com.integrador.sistemaincidencias.incidencias.dto.IncidenciaFiltro;
import com.integrador.sistemaincidencias.incidencias.mapper.IncidenciaMapper;
import com.integrador.sistemaincidencias.incidencias.model.Incidencia;
import com.integrador.sistemaincidencias.incidencias.sql.IncidenciaSql;
import com.integrador.sistemaincidencias.shared.exception.AccesoDatosException;
import com.integrador.sistemaincidencias.shared.pagination.PageRequest;
import com.integrador.sistemaincidencias.shared.pagination.PageResult;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import javax.sql.DataSource;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class IncidenciaDao {

    private final DataSource dataSource;
    private final IncidenciaMapper incidenciaMapper;

    public Optional<Incidencia> buscarPorId(UUID id) {
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(IncidenciaSql.BUSCAR_POR_ID)) {
            statement.setObject(1, id);
            try (ResultSet rs = statement.executeQuery()) {
                return rs.next() ? Optional.of(incidenciaMapper.mapear(rs)) : Optional.empty();
            }
        } catch (SQLException exception) {
            throw new AccesoDatosException("Error al buscar incidencia por id", exception);
        }
    }

    public PageResult<Incidencia> listar(IncidenciaFiltro filtro, PageRequest pageRequest) {
        List<Object> parametros = new ArrayList<>();
        String where = construirWhere(filtro, parametros);
        String sql = IncidenciaSql.CAMPOS + where + " ORDER BY creado_en DESC LIMIT ? OFFSET ?";
        String countSql = "SELECT COUNT(*) FROM incidencias " + where;

        try (Connection connection = dataSource.getConnection()) {
            long total = contar(connection, countSql, parametros);
            List<Incidencia> contenido = listar(connection, sql, parametros, pageRequest);
            return PageResult.<Incidencia>builder()
                    .contenido(contenido)
                    .total(total)
                    .page(pageRequest.getPage())
                    .size(pageRequest.getSize())
                    .build();
        } catch (SQLException exception) {
            throw new AccesoDatosException("Error al listar incidencias", exception);
        }
    }

    public Incidencia insertar(Incidencia incidencia) {
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(IncidenciaSql.INSERTAR)) {
            statement.setObject(1, incidencia.getId());
            statement.setString(2, incidencia.getCodigo());
            statement.setString(3, incidencia.getTitulo());
            statement.setString(4, incidencia.getDescripcion());
            statement.setObject(5, incidencia.getClienteId());
            statement.setObject(6, incidencia.getEstadoProcesoId());
            statement.setObject(7, incidencia.getEstadoAprobacionId());
            statement.setString(8, incidencia.getPrioridad().name());
            statement.setObject(9, incidencia.getCategoriaId());
            statement.setObject(10, incidencia.getCreadoPorUsuarioId());
            statement.setObject(11, incidencia.getUsuarioExternoId());
            statement.setObject(12, incidencia.getAsignadoA());
            statement.setTimestamp(13, incidencia.getResueltoEn() == null ? null : Timestamp.valueOf(incidencia.getResueltoEn()));
            statement.executeUpdate();
            return buscarPorId(incidencia.getId()).orElse(incidencia);
        } catch (SQLException exception) {
            throw new AccesoDatosException("Error al insertar incidencia", exception);
        }
    }

    public Incidencia actualizar(Incidencia incidencia) {
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(IncidenciaSql.ACTUALIZAR)) {
            statement.setString(1, incidencia.getTitulo());
            statement.setString(2, incidencia.getDescripcion());
            statement.setObject(3, incidencia.getCategoriaId());
            statement.setString(4, incidencia.getPrioridad().name());
            statement.setObject(5, incidencia.getAsignadoA());
            statement.setObject(6, incidencia.getId());
            statement.executeUpdate();
            return buscarPorId(incidencia.getId()).orElse(incidencia);
        } catch (SQLException exception) {
            throw new AccesoDatosException("Error al actualizar incidencia", exception);
        }
    }

    public Incidencia cambiarEstado(UUID id, UUID estadoProcesoId, boolean terminal) {
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(IncidenciaSql.CAMBIAR_ESTADO)) {
            statement.setObject(1, estadoProcesoId);
            statement.setBoolean(2, terminal);
            statement.setObject(3, id);
            statement.executeUpdate();
            return buscarPorId(id).orElseThrow(() -> new AccesoDatosException("No se encontro incidencia actualizada"));
        } catch (SQLException exception) {
            throw new AccesoDatosException("Error al cambiar estado de incidencia", exception);
        }
    }

    public Incidencia cambiarAprobacion(UUID id, UUID estadoAprobacionId) {
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(IncidenciaSql.CAMBIAR_APROBACION)) {
            statement.setObject(1, estadoAprobacionId);
            statement.setObject(2, id);
            statement.executeUpdate();
            return buscarPorId(id).orElseThrow(() -> new AccesoDatosException("No se encontro incidencia actualizada"));
        } catch (SQLException exception) {
            throw new AccesoDatosException("Error al cambiar aprobación de incidencia", exception);
        }
    }

    public void eliminar(UUID id) {
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(IncidenciaSql.ELIMINAR)) {
            statement.setObject(1, id);
            statement.executeUpdate();
        } catch (SQLException exception) {
            throw new AccesoDatosException("Error al eliminar incidencia", exception);
        }
    }

    private long contar(Connection connection, String countSql, List<Object> parametros) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(countSql)) {
            asignarParametros(statement, parametros);
            try (ResultSet rs = statement.executeQuery()) {
                return rs.next() ? rs.getLong(1) : 0;
            }
        }
    }

    private List<Incidencia> listar(
            Connection connection,
            String sql,
            List<Object> parametros,
            PageRequest pageRequest
    ) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            asignarParametros(statement, parametros);
            statement.setInt(parametros.size() + 1, pageRequest.getSize());
            statement.setInt(parametros.size() + 2, pageRequest.offset());
            try (ResultSet rs = statement.executeQuery()) {
                List<Incidencia> incidencias = new ArrayList<>();
                while (rs.next()) {
                    incidencias.add(incidenciaMapper.mapear(rs));
                }
                return incidencias;
            }
        }
    }

    private void asignarParametros(PreparedStatement statement, List<Object> parametros) throws SQLException {
        for (int i = 0; i < parametros.size(); i++) {
            statement.setObject(i + 1, parametros.get(i));
        }
    }

    private String construirWhere(IncidenciaFiltro filtro, List<Object> parametros) {
        StringBuilder where = new StringBuilder(" WHERE 1 = 1");
        if (filtro == null) {
            return where.toString();
        }
        if (filtro.getTexto() != null && !filtro.getTexto().isBlank()) {
            where.append(" AND (lower(titulo) LIKE lower(?) OR lower(descripcion) LIKE lower(?) OR lower(codigo) LIKE lower(?))");
            String patron = "%" + filtro.getTexto().trim() + "%";
            parametros.add(patron);
            parametros.add(patron);
            parametros.add(patron);
        }
        if (filtro.getClienteId() != null) {
            where.append(" AND cliente_id = ?");
            parametros.add(filtro.getClienteId());
        }
        if (filtro.getEstadoProcesoId() != null) {
            where.append(" AND estado_proceso_id = ?");
            parametros.add(filtro.getEstadoProcesoId());
        }
        if (filtro.getEstadoAprobacionId() != null) {
            where.append(" AND estado_aprobacion_id = ?");
            parametros.add(filtro.getEstadoAprobacionId());
        }
        if (filtro.getCategoriaId() != null) {
            where.append(" AND categoria_id = ?");
            parametros.add(filtro.getCategoriaId());
        }
        if (filtro.getAsignadoA() != null) {
            where.append(" AND asignado_a = ?");
            parametros.add(filtro.getAsignadoA());
        }
        if (filtro.getPrioridad() != null) {
            where.append(" AND prioridad = ?");
            parametros.add(filtro.getPrioridad().name());
        }
        if (filtro.getDesde() != null) {
            where.append(" AND creado_en >= ?");
            parametros.add(Timestamp.valueOf(filtro.getDesde().atStartOfDay()));
        }
        if (filtro.getHasta() != null) {
            where.append(" AND creado_en < ?");
            parametros.add(Timestamp.valueOf(filtro.getHasta().plusDays(1).atStartOfDay()));
        }
        return where.toString();
    }
}
