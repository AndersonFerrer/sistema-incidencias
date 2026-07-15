package com.integrador.sistemaincidencias.reportes.dao;

import com.integrador.sistemaincidencias.dashboard.dto.IncidenciaResumenResponse;
import com.integrador.sistemaincidencias.reportes.dto.ReporteConteoCategoriaResponse;
import com.integrador.sistemaincidencias.reportes.dto.ReporteGranularidad;
import com.integrador.sistemaincidencias.reportes.dto.ReporteResumenAgenteResponse;
import com.integrador.sistemaincidencias.reportes.dto.ReporteTendenciaResponse;
import com.integrador.sistemaincidencias.reportes.mapper.ReporteMapper;
import com.integrador.sistemaincidencias.reportes.sql.ReporteFiltro;
import com.integrador.sistemaincidencias.reportes.sql.ReporteSql;
import com.integrador.sistemaincidencias.shared.exception.AccesoDatosException;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Types;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import javax.sql.DataSource;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * Acceso a datos del modulo de reportes.
 *
 * Cada metodo ejecuta una sola consulta SQL nativa con parametros vinculados
 * via {@link PreparedStatement#setObject(int, Object)}; nunca se concatena
 * entrada del usuario en la cadena SQL. El scope por rol se aplica en el WHERE
 * a traves de {@link ReporteSql#construirWhere}, que ademas registra los
 * parametros en la lista proporcionada.
 *
 * Reglas inmutables (ver design.md D5):
 * <ul>
 *   <li>Los identificadores que vienen del cliente ({@code desde}, {@code hasta},
 *       {@code rol}, {@code currentUserId}, {@code agenteId}) son parametros; el
 *       string del rol y los codigos de estado nunca se concatenan.</li>
 *   <li>{@code date_trunc} solo recibe literales conocidos ({@code day|week|month});
 *       la eleccion se hace en {@link ReporteSql#tendenciaPara}.</li>
 *   <li>UUIDs nulos se enlazan como {@link Types#OTHER} para que Postgres los
 *       evalue como NULL y desactiven el drill-down.</li>
 *   <li>{@code LIMIT} (detalle Q11) se vincula por separado despues del WHERE,
 *       nunca como parte del WHERE.</li>
 * </ul>
 *
 * Las consultas se ejecutan en serie sobre conexiones individuales del pool
 * (HikariCP, sin transaccion explicita) siguiendo el patron del
 * {@code DashboardDao}.
 */
@Component
@RequiredArgsConstructor
public class ReporteDao {

    private static final int LIMITE_DETALLE = 50;

    private final DataSource dataSource;
    private final ReporteMapper reporteMapper;

    public long contarTotal(ReporteFiltro filtro) {
        String sql = ReporteSql.CONTAR_TOTAL + ReporteSql.construirWhere(filtro, new ArrayList<>());
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(sql)) {
            asignarParametros(statement, ReporteSql.parametrosWhere(filtro));
            try (ResultSet rs = statement.executeQuery()) {
                return rs.next() ? rs.getLong("total") : 0L;
            }
        } catch (SQLException exception) {
            throw new AccesoDatosException("Error al contar incidencias del reporte", exception);
        }
    }

    public Map<String, Long> contarPorEstadoAprobacion(ReporteFiltro filtro) {
        String sql = ReporteSql.CONTAR_POR_ESTADO_APROBACION
                + ReporteSql.construirWhere(filtro, new ArrayList<>())
                + " GROUP BY ea.clave ORDER BY ea.clave ASC";
        return ejecutarConteoPorClave(filtro, sql, "Error al agrupar por estado de aprobacion");
    }

    public Map<String, Long> contarPorEstadoProceso(ReporteFiltro filtro) {
        String sql = ReporteSql.CONTAR_POR_ESTADO_PROCESO
                + ReporteSql.construirWhere(filtro, new ArrayList<>())
                + " GROUP BY ep.clave ORDER BY ep.clave ASC";
        return ejecutarConteoPorClave(filtro, sql, "Error al agrupar por estado de proceso");
    }

    public List<ReporteConteoCategoriaResponse> contarPorCategoria(ReporteFiltro filtro) {
        String sql = ReporteSql.CONTAR_POR_CATEGORIA
                + ReporteSql.construirWhere(filtro, new ArrayList<>())
                + " GROUP BY c.id, c.nombre HAVING COUNT(*) > 0 ORDER BY total DESC, c.nombre ASC";
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(sql)) {
            asignarParametros(statement, ReporteSql.parametrosWhere(filtro));
            try (ResultSet rs = statement.executeQuery()) {
                List<ReporteConteoCategoriaResponse> categorias = new ArrayList<>();
                while (rs.next()) {
                    categorias.add(reporteMapper.mapearCategoria(rs));
                }
                return categorias;
            }
        } catch (SQLException exception) {
            throw new AccesoDatosException("Error al agrupar por categoria", exception);
        }
    }

    public Map<String, Long> contarPorPrioridad(ReporteFiltro filtro) {
        String sql = ReporteSql.CONTAR_POR_PRIORIDAD
                + ReporteSql.construirWhere(filtro, new ArrayList<>())
                + " GROUP BY i.prioridad ORDER BY total DESC, i.prioridad ASC";
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(sql)) {
            asignarParametros(statement, ReporteSql.parametrosWhere(filtro));
            try (ResultSet rs = statement.executeQuery()) {
                Map<String, Long> prioridades = new LinkedHashMap<>();
                while (rs.next()) {
                    String clave = rs.getString("prioridad");
                    prioridades.put(clave == null ? "DESCONOCIDA" : clave, rs.getLong("total"));
                }
                return prioridades;
            }
        } catch (SQLException exception) {
            throw new AccesoDatosException("Error al agrupar por prioridad", exception);
        }
    }

    /**
     * Resuelve la sentencia de tendencia segun {@code granularidad} (en service
     * ya se valido el enum) y devuelve los buckets ordenados ascendentemente.
     */
    public List<ReporteTendenciaResponse> listarTendencia(ReporteFiltro filtro, ReporteGranularidad granularidad) {
        String base = ReporteSql.tendenciaPara(granularidad);
        String sql = base
                + ReporteSql.construirWhere(filtro, new ArrayList<>())
                + " GROUP BY bucket_inicio ORDER BY bucket_inicio ASC";
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(sql)) {
            asignarParametros(statement, ReporteSql.parametrosWhere(filtro));
            try (ResultSet rs = statement.executeQuery()) {
                List<ReporteTendenciaResponse> buckets = new ArrayList<>();
                while (rs.next()) {
                    buckets.add(reporteMapper.mapearTendencia(rs));
                }
                return buckets;
            }
        } catch (SQLException exception) {
            throw new AccesoDatosException(
                    "Error al listar la tendencia (" + granularidad + ") del reporte", exception);
        }
    }

    public List<ReporteResumenAgenteResponse> listarResumenPorAgente(ReporteFiltro filtro) {
        // El WHERE base incluye "i.asignado_a IS NOT NULL"; el fragmento comun
        // agregar a continuacion los predicados por rol y fecha.
        String sql = ReporteSql.RESUMEN_POR_AGENTE
                + ReporteSql.construirWhere(filtro, new ArrayList<>())
                + " GROUP BY u.id, u.nombre ORDER BY u.nombre ASC";
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(sql)) {
            asignarParametros(statement, ReporteSql.parametrosWhere(filtro));
            try (ResultSet rs = statement.executeQuery()) {
                List<ReporteResumenAgenteResponse> agentes = new ArrayList<>();
                while (rs.next()) {
                    agentes.add(reporteMapper.mapearResumenAgente(rs));
                }
                return agentes;
            }
        } catch (SQLException exception) {
            throw new AccesoDatosException("Error al listar el resumen por agente", exception);
        }
    }

    public Double tiempoPromedioResolucionHoras(ReporteFiltro filtro) {
        // construirWhere ya filtra por creado_en; la consulta agrega el filtro
        // i.resuelto_en IS NOT NULL en su WHERE base.
        String sql = ReporteSql.TIEMPO_PROMEDIO_RESOLUCION_HORAS
                + ReporteSql.construirWhere(filtro, new ArrayList<>());
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(sql)) {
            asignarParametros(statement, ReporteSql.parametrosWhere(filtro));
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

    public List<IncidenciaResumenResponse> listarDetalle(ReporteFiltro filtro, int limite) {
        if (limite <= 0) {
            return List.of();
        }
        // Para el detalle se vincula el WHERE base + LIMIT ? al final.
        String sql = ReporteSql.DETALLE
                + ReporteSql.construirWhere(filtro, new ArrayList<>())
                + " ORDER BY i.creado_en DESC LIMIT ?";
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(sql)) {
            List<Object> parametros = ReporteSql.parametrosWhere(filtro);
            asignarParametros(statement, parametros);
            statement.setInt(parametros.size() + 1, limite);
            try (ResultSet rs = statement.executeQuery()) {
                List<IncidenciaResumenResponse> detalle = new ArrayList<>();
                while (rs.next()) {
                    detalle.add(reporteMapper.mapearDetalle(rs));
                }
                return detalle;
            }
        } catch (SQLException exception) {
            throw new AccesoDatosException("Error al listar el detalle del reporte", exception);
        }
    }

    public static int limiteDetalle() {
        return LIMITE_DETALLE;
    }

    /**
     * Reconstruye el predicado por rol + fechas + agente sobre la consulta base
     * indicada y devuelve un mapa con clave=cadena devuelta y valor=conteo.
     * Usado por las dimensiones pequenas (estados y prioridad).
     */
    private Map<String, Long> ejecutarConteoPorClave(ReporteFiltro filtro, String sql, String mensajeError) {
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(sql)) {
            asignarParametros(statement, ReporteSql.parametrosWhere(filtro));
            try (ResultSet rs = statement.executeQuery()) {
                Map<String, Long> conteos = new LinkedHashMap<>();
                while (rs.next()) {
                    conteos.put(rs.getString("clave"), rs.getLong("total"));
                }
                return conteos;
            }
        } catch (SQLException exception) {
            throw new AccesoDatosException(mensajeError, exception);
        }
    }

    /**
     * Vincula la lista de parametros al {@code PreparedStatement}. Trata los
     * UUIDs nulos como {@link Types#OTHER} para forzar la conversion implicita
     * a NULL por el driver de PostgreSQL (los parametros serializan el resto
     * via {@link PreparedStatement#setObject(int, Object)}).
     */
    private void asignarParametros(PreparedStatement statement, List<Object> parametros) throws SQLException {
        for (int i = 0; i < parametros.size(); i++) {
            Object valor = parametros.get(i);
            if (valor instanceof UUID uuid) {
                if (uuid == null) {
                    statement.setNull(i + 1, Types.OTHER);
                } else {
                    statement.setObject(i + 1, uuid);
                }
            } else {
                statement.setObject(i + 1, valor);
            }
        }
    }
}
