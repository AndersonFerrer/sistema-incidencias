package com.integrador.sistemaincidencias.dashboard.sql;

/**
 * Constantes SQL para las agregaciones del dashboard.
 *
 * Las siete consultas ({@code CONTAR_TOTAL}, {@code CONTAR_POR_ESTADO_APROBACION},
 * {@code CONTAR_POR_ESTADO_PROCESO}, {@code CONTAR_POR_CATEGORIA},
 * {@code LISTAR_TENDENCIA_SEMANAL}, {@code LISTAR_RECIENTES} y
 * {@code TIEMPO_PROMEDIO_RESOLUCION_HORAS}) comparten el mismo fragmento
 * {@code WHERE} parametric: scope por rol + limite inferior por fecha de creacion.
 *
 * El helper {@link #construirWhere(ScopeFiltro, java.time.LocalDateTime, java.util.List)}
 * agrega los predicados en el orden esperado (asignado, creadoPor, creadoEn)
 * y registra los parametros en la lista proporcionada, de modo que cada
 * metodo del DAO puede invocar la misma logica sin concatenar SQL.
 */
public final class DashboardSql {

    private DashboardSql() {
    }

    public static final String CONTAR_TOTAL = """
            SELECT COUNT(*)
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

    public static final String LISTAR_TENDENCIA_SEMANAL = """
            SELECT date_trunc('week', i.creado_en)::date AS semana_inicio, COUNT(*) AS total
            FROM incidencias i
            WHERE 1 = 1
            """;

    public static final String LISTAR_RECIENTES = """
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

    public static final String TIEMPO_PROMEDIO_RESOLUCION_HORAS = """
            SELECT AVG(EXTRACT(EPOCH FROM (i.resuelto_en - i.creado_en)) / 3600.0) AS promedio_horas
            FROM incidencias i
            WHERE i.resuelto_en IS NOT NULL
            """;

    /**
     * Aplica el scope por rol y el limite inferior de fecha sobre un fragmento {@code WHERE 1 = 1}.
     * Los predicados se agregan en orden deterministico y los parametros se acumulan en
     * {@code parametros} en el mismo orden en que aparecen.
     *
     * @param scope scope por rol (administrador ve todo; agente asignado; usuario creador)
     * @param desde limite inferior opcional sobre {@code creado_en}; {@code null} para "all"
     * @param parametros lista de parametros a la que se agregan los valores en orden
     * @return fragmento SQL que termina en {@code AND ...} y contiene los placeholders {@code ?}
     */
    public static String construirWhere(ScopeFiltro scope, java.time.LocalDateTime desde, java.util.List<Object> parametros) {
        StringBuilder where = new StringBuilder(" AND 1 = 1");
        if (scope != null) {
            if (scope.asignadoA() != null) {
                where.append(" AND i.asignado_a = ?");
                parametros.add(scope.asignadoA());
            }
            if (scope.creadoPorUsuarioId() != null) {
                where.append(" AND i.creado_por_usuario_id = ?");
                parametros.add(scope.creadoPorUsuarioId());
            }
        }
        if (desde != null) {
            where.append(" AND i.creado_en >= ?");
            parametros.add(java.sql.Timestamp.valueOf(desde));
        }
        return where.toString();
    }
}