package com.integrador.sistemaincidencias.dashboard.dao;

import com.integrador.sistemaincidencias.dashboard.dto.CategoriaConteoResponse;
import com.integrador.sistemaincidencias.dashboard.dto.IncidenciaResumenResponse;
import com.integrador.sistemaincidencias.dashboard.dto.TendenciaSemanalResponse;
import com.integrador.sistemaincidencias.dashboard.mapper.DashboardMapper;
import com.integrador.sistemaincidencias.dashboard.sql.DashboardSql;
import com.integrador.sistemaincidencias.dashboard.sql.ScopeFiltro;
import com.integrador.sistemaincidencias.shared.exception.AccesoDatosException;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import javax.sql.DataSource;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * Acceso a datos del dashboard.
 *
 * Cada metodo ejecuta una sola consulta SQL nativa con parametros vinculados
 * via {@link PreparedStatement#setObject(int, Object)}; nunca se concatena
 * entrada del usuario en la cadena SQL. El scope por rol se aplica en el WHERE
 * a traves de {@link DashboardSql#construirWhere(ScopeFiltro, LocalDateTime, java.util.List)},
 * que ademas registra los parametros en la lista proporcionada.
 *
 * Las consultas se ejecutan en serie sobre conexiones individuales del pool
 * (HikariCP, sin transaccion explicita) siguiendo el patron del
 * {@code IncidenciaDao} del modulo de incidencias.
 */
@Component
@RequiredArgsConstructor
public class DashboardDao {

    private static final int LIMITE_TENDENCIA_TODO = 26;
    private static final String GROUP_ESTADO_APROBACION =
            " GROUP BY ea.clave ORDER BY ea.clave";
    private static final String GROUP_ESTADO_PROCESO =
            " GROUP BY ep.clave ORDER BY ep.clave";
    private static final String GROUP_CATEGORIA =
            " GROUP BY c.id, c.nombre HAVING COUNT(*) > 0 ORDER BY total DESC, c.nombre ASC";
    private static final String GROUP_TENDENCIA =
            " GROUP BY semana_inicio ORDER BY semana_inicio ASC";

    private final DataSource dataSource;
    private final DashboardMapper dashboardMapper;

    public long contarTotal(ScopeFiltro scope, LocalDateTime desde) {
        List<Object> parametros = new ArrayList<>();
        String sql = DashboardSql.CONTAR_TOTAL + DashboardSql.construirWhere(scope, desde, parametros);
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(sql)) {
            asignarParametros(statement, parametros);
            try (ResultSet rs = statement.executeQuery()) {
                return rs.next() ? rs.getLong(1) : 0L;
            }
        } catch (SQLException exception) {
            throw new AccesoDatosException("Error al contar incidencias del dashboard", exception);
        }
    }

    public Map<String, Long> contarPorEstadoAprobacion(ScopeFiltro scope, LocalDateTime desde) {
        List<Object> parametros = new ArrayList<>();
        String sql = DashboardSql.CONTAR_POR_ESTADO_APROBACION
                + DashboardSql.construirWhere(scope, desde, parametros)
                + GROUP_ESTADO_APROBACION;
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(sql)) {
            asignarParametros(statement, parametros);
            try (ResultSet rs = statement.executeQuery()) {
                Map<String, Long> conteos = new LinkedHashMap<>();
                while (rs.next()) {
                    conteos.put(rs.getString("clave"), rs.getLong("total"));
                }
                return conteos;
            }
        } catch (SQLException exception) {
            throw new AccesoDatosException("Error al agrupar incidencias por estado de aprobacion", exception);
        }
    }

    public Map<String, Long> contarPorEstadoProceso(ScopeFiltro scope, LocalDateTime desde) {
        List<Object> parametros = new ArrayList<>();
        String sql = DashboardSql.CONTAR_POR_ESTADO_PROCESO
                + DashboardSql.construirWhere(scope, desde, parametros)
                + GROUP_ESTADO_PROCESO;
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(sql)) {
            asignarParametros(statement, parametros);
            try (ResultSet rs = statement.executeQuery()) {
                Map<String, Long> conteos = new LinkedHashMap<>();
                while (rs.next()) {
                    conteos.put(rs.getString("clave"), rs.getLong("total"));
                }
                return conteos;
            }
        } catch (SQLException exception) {
            throw new AccesoDatosException("Error al agrupar incidencias por estado de proceso", exception);
        }
    }

    public List<CategoriaConteoResponse> contarPorCategoria(ScopeFiltro scope, LocalDateTime desde) {
        List<Object> parametros = new ArrayList<>();
        String sql = DashboardSql.CONTAR_POR_CATEGORIA
                + DashboardSql.construirWhere(scope, desde, parametros)
                + GROUP_CATEGORIA;
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(sql)) {
            asignarParametros(statement, parametros);
            try (ResultSet rs = statement.executeQuery()) {
                List<CategoriaConteoResponse> categorias = new ArrayList<>();
                while (rs.next()) {
                    categorias.add(dashboardMapper.mapearCategoria(rs));
                }
                return categorias;
            }
        } catch (SQLException exception) {
            throw new AccesoDatosException("Error al agrupar incidencias por categoria", exception);
        }
    }

    public List<TendenciaSemanalResponse> listarTendenciaSemanal(ScopeFiltro scope, LocalDateTime desde) {
        List<Object> parametros = new ArrayList<>();
        String sql = DashboardSql.LISTAR_TENDENCIA_SEMANAL
                + DashboardSql.construirWhere(scope, desde, parametros)
                + GROUP_TENDENCIA;
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(sql)) {
            asignarParametros(statement, parametros);
            try (ResultSet rs = statement.executeQuery()) {
                List<TendenciaSemanalResponse> semanas = new ArrayList<>();
                while (rs.next()) {
                    semanas.add(dashboardMapper.mapearTendencia(rs));
                }
                // Para 'all' (desde == null) se limita a las 26 semanas mas recientes
                // (ver design.md D3 + spec escenario 'rango=all -> maximo 26 semanas').
                if (desde == null && semanas.size() > LIMITE_TENDENCIA_TODO) {
                    return new ArrayList<>(semanas.subList(semanas.size() - LIMITE_TENDENCIA_TODO, semanas.size()));
                }
                return semanas;
            }
        } catch (SQLException exception) {
            throw new AccesoDatosException("Error al listar tendencia semanal del dashboard", exception);
        }
    }

    public List<IncidenciaResumenResponse> listarRecientes(ScopeFiltro scope, LocalDateTime desde, int limite) {
        if (limite <= 0) {
            return List.of();
        }
        List<Object> parametros = new ArrayList<>();
        String sql = DashboardSql.LISTAR_RECIENTES
                + DashboardSql.construirWhere(scope, desde, parametros)
                + " ORDER BY i.creado_en DESC LIMIT ?";
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(sql)) {
            asignarParametros(statement, parametros);
            statement.setInt(parametros.size() + 1, limite);
            try (ResultSet rs = statement.executeQuery()) {
                List<IncidenciaResumenResponse> recientes = new ArrayList<>();
                while (rs.next()) {
                    recientes.add(dashboardMapper.mapearResumen(rs));
                }
                return recientes;
            }
        } catch (SQLException exception) {
            throw new AccesoDatosException("Error al listar incidencias recientes del dashboard", exception);
        }
    }

    public Double tiempoPromedioResolucionHoras(ScopeFiltro scope, LocalDateTime desde) {
        List<Object> parametros = new ArrayList<>();
        // construirWhere ya filtra por creado_en; aqui solo necesitamos que el
        // WHERE base siga siendo compatible (incluye el filtro i.resuelto_en IS NOT NULL).
        String sql = DashboardSql.TIEMPO_PROMEDIO_RESOLUCION_HORAS
                + DashboardSql.construirWhere(scope, desde, parametros);
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(sql)) {
            asignarParametros(statement, parametros);
            try (ResultSet rs = statement.executeQuery()) {
                if (!rs.next()) {
                    return null;
                }
                double valor = rs.getDouble(1);
                return rs.wasNull() ? null : valor;
            }
        } catch (SQLException exception) {
            throw new AccesoDatosException("Error al calcular tiempo promedio de resolucion", exception);
        }
    }

    /**
     * Construye un mapa con las claves canonicas rellenas a 0 cuando faltan en el resultado.
     * Lo usa el servicio para que {@code byEstadoAprobacion} siempre incluya
     * {@code SOLICITADA}, {@code APROBADA} y {@code RECHAZADA}, y {@code byEstadoProceso}
     * incluya {@code PENDIENTE}, {@code EN_PROCESO} y {@code FINALIZADA}.
     */
    public static Map<String, Long> normalizar(Map<String, Long> conteos, List<String> clavesObligatorias) {
        Map<String, Long> normalizado = new LinkedHashMap<>();
        Map<String, Long> base = conteos == null ? Map.of() : conteos;
        for (String clave : clavesObligatorias) {
            normalizado.put(clave, base.getOrDefault(clave, 0L));
        }
        // Mantener cualquier clave adicional que provenga de la BD (defensivo ante
        // catalogos extendidos en el futuro) sin pisar las obligatorias.
        for (Map.Entry<String, Long> entry : base.entrySet()) {
            normalizado.putIfAbsent(entry.getKey(), entry.getValue());
        }
        return normalizado;
    }

    private void asignarParametros(PreparedStatement statement, List<Object> parametros) throws SQLException {
        for (int i = 0; i < parametros.size(); i++) {
            statement.setObject(i + 1, parametros.get(i));
        }
    }
}