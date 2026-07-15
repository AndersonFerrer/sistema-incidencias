package com.integrador.sistemaincidencias.reportes.sql;

import com.integrador.sistemaincidencias.reportes.dto.ReporteGranularidad;
import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Sentencias SQL nativas y parametros para las once consultas del reporte.
 *
 * Reglas inmutables (ver design.md D5, D6 y seccion 2.5/2.6):
 * <ul>
 *   <li>Ningun valor del request se concatena a la cadena SQL. Todo se vincula
 *       con {@code PreparedStatement#setObject(int, Object)}.</li>
 *   <li>Las once consultas comparten el mismo predicado where de rol + fechas
 *       + agente opcional (ver {@link #construirWhere}).</li>
 *   <li>{@code date_trunc} acepta solo tres argumentos literales
 *       ({@code day|week|month}); por eso existen tres sentencias separadas
 *       ({@link #TENDENCIA_DIARIA}, {@link #TENDENCIA_SEMANAL}, {@link #TENDENCIA_MENSUAL})
 *       seleccionadas por el enum {@link ReporteGranularidad}.</li>
 *   <li>El orden de parametros en {@link #construirWhere} es determinista:
 *       {@code desde}x2, {@code hasta}x2, roles (3 constantes + 2 ids), agente (x2).</li>
 * </ul>
 */
public final class ReporteSql {

    private ReporteSql() {
    }

    public static final String CONTAR_TOTAL = """
            SELECT COUNT(*) AS total
            FROM incidencias i
            WHERE 1 = 1
            """;

    public static final String CONTAR_POR_ESTADO_APROBACION = """
            SELECT ea.clave AS clave, COUNT(*) AS total
            FROM incidencias i
            INNER JOIN estados_aprobacion ea ON ea.id = i.estado_aprobacion_id
            WHERE 1 = 1
            """;

    public static final String CONTAR_POR_ESTADO_PROCESO = """
            SELECT ep.clave AS clave, COUNT(*) AS total
            FROM incidencias i
            INNER JOIN estados_proceso ep ON ep.id = i.estado_proceso_id
            WHERE 1 = 1
            """;

    public static final String CONTAR_POR_CATEGORIA = """
            SELECT c.id AS categoria_id, c.nombre AS categoria_nombre, COUNT(*) AS total
            FROM incidencias i
            INNER JOIN categorias c ON c.id = i.categoria_id
            WHERE 1 = 1
            """;

    public static final String CONTAR_POR_PRIORIDAD = """
            SELECT i.prioridad AS prioridad, COUNT(*) AS total
            FROM incidencias i
            WHERE 1 = 1
            """;

    public static final String TENDENCIA_DIARIA = """
            SELECT date_trunc('day', i.creado_en)::date AS bucket_inicio, COUNT(*) AS total
            FROM incidencias i
            WHERE 1 = 1
            """;

    public static final String TENDENCIA_SEMANAL = """
            SELECT date_trunc('week', i.creado_en)::date AS bucket_inicio, COUNT(*) AS total
            FROM incidencias i
            WHERE 1 = 1
            """;

    public static final String TENDENCIA_MENSUAL = """
            SELECT date_trunc('month', i.creado_en)::date AS bucket_inicio, COUNT(*) AS total
            FROM incidencias i
            WHERE 1 = 1
            """;

    public static final String RESUMEN_POR_AGENTE = """
            SELECT u.id AS agente_id,
                   u.nombre AS agente_nombre,
                   COUNT(*) AS total_asignadas,
                   COUNT(*) FILTER (WHERE i.resuelto_en IS NOT NULL) AS resueltas,
                   COUNT(*) FILTER (WHERE ep.clave = 'PENDIENTE') AS pendientes,
                   COUNT(*) FILTER (WHERE ep.clave = 'EN_PROCESO') AS en_proceso,
                   AVG(EXTRACT(EPOCH FROM (i.resuelto_en - i.creado_en)) / 3600.0)
                       FILTER (WHERE i.resuelto_en IS NOT NULL) AS promedio_resolucion_horas
            FROM incidencias i
            INNER JOIN usuarios u ON u.id = i.asignado_a
            INNER JOIN estados_proceso ep ON ep.id = i.estado_proceso_id
            WHERE i.asignado_a IS NOT NULL
            """;

    public static final String TIEMPO_PROMEDIO_RESOLUCION_HORAS = """
            SELECT AVG(EXTRACT(EPOCH FROM (i.resuelto_en - i.creado_en)) / 3600.0) AS promedio_horas
            FROM incidencias i
            WHERE i.resuelto_en IS NOT NULL
            """;

    public static final String DETALLE = """
            SELECT i.id                AS id,
                   i.codigo            AS codigo,
                   i.titulo            AS titulo,
                   c.nombre            AS categoria_nombre,
                   i.asignado_a        AS asignado_a,
                   ep.clave            AS estado_proceso_codigo,
                   ea.clave            AS estado_aprobacion_codigo,
                   i.prioridad         AS prioridad,
                   i.creado_en         AS creado_en,
                   i.resuelto_en       AS resuelto_en
            FROM incidencias i
            INNER JOIN categorias c        ON c.id = i.categoria_id
            INNER JOIN estados_proceso ep  ON ep.id = i.estado_proceso_id
            INNER JOIN estados_aprobacion ea ON ea.id = i.estado_aprobacion_id
            WHERE 1 = 1
            """;

    /**
     * Selecciona la sentencia de tendencia correspondiente a la granularidad pedida.
     * Cualquier valor fuera de las tres constantes del enum debe haber sido rechazado
     * por el servicio antes de llegar aqui.
     */
    public static String tendenciaPara(ReporteGranularidad granularidad) {
        return switch (granularidad) {
            case DIARIA -> TENDENCIA_DIARIA;
            case SEMANAL -> TENDENCIA_SEMANAL;
            case MENSUAL -> TENDENCIA_MENSUAL;
        };
    }

    /**
     * Aplica el predicado por rol + intervalo + drill-down sobre un fragmento
     * {@code WHERE 1 = 1} y registra los placeholders en {@code parametros} en el
     * orden esperado por las once consultas.
     *
     * <p>Orden de parametros:
     * <ol>
     *   <li>{@code desde} (rango inferior de {@code creado_en});</li>
     *   <li>{@code desde} repetido (el predicado se escribe dos veces para
     *       mayor legibilidad y auditoria);</li>
     *   <li>{@code hasta} exclusivo;</li>
     *   <li>{@code hasta} repetido;</li>
     *   <li>constante {@code 'ADMINISTRADOR'};</li>
     *   <li>constante {@code 'AGENTE'};</li>
     *   <li>{@code currentUserId} (UUID; se vincula como {@code Types.OTHER} si null);</li>
     *   <li>constante {@code 'USUARIO'};</li>
     *   <li>{@code currentUserId} (idem);</li>
     *   <li>{@code agenteFiltro} (UUID; null desactiva el drill-down);</li>
     *   <li>{@code agenteFiltro} repetido.</li>
     * </ol>
     */
    public static String construirWhere(ReporteFiltro filtro, List<Object> parametros) {
        StringBuilder where = new StringBuilder(" AND 1 = 1");

        Timestamp desde = filtro.desdeIncluyente();
        Timestamp hasta = filtro.hastaExcluyente();
        where.append(" AND (CAST(? AS timestamp without time zone) IS NULL OR i.creado_en >= CAST(? AS timestamp without time zone))");
        parametros.add(desde);
        parametros.add(desde);

        where.append(" AND (CAST(? AS timestamp without time zone) IS NULL OR i.creado_en < CAST(? AS timestamp without time zone))");
        parametros.add(hasta);
        parametros.add(hasta);

        where.append(" AND ((? = 'ADMINISTRADOR') OR (? = 'AGENTE' AND i.asignado_a = ?) OR (? = 'USUARIO' AND i.creado_por_usuario_id = ?))");
        parametros.add(filtro.rolCodigo());
        parametros.add(filtro.rolCodigo());
        parametros.add(filtro.currentUserId());
        parametros.add(filtro.rolCodigo());
        parametros.add(filtro.currentUserId());

        UUID agente = filtro.agenteFiltro();
        where.append(" AND (CAST(? AS uuid) IS NULL OR i.asignado_a = CAST(? AS uuid))");
        parametros.add(agente);
        parametros.add(agente);

        return where.toString();
    }

    /**
     * Construye la lista de parametros para una consulta solo-WHERE (sin limite).
     * Util cuando un DAO necesita construir un {@code PreparedStatement} por su
     * cuenta; la mayoria de metodos delegan en {@link #construirWhere}.
     */
    public static List<Object> parametrosWhere(ReporteFiltro filtro) {
        List<Object> parametros = new ArrayList<>(11);
        construirWhere(filtro, parametros);
        return parametros;
    }
}
