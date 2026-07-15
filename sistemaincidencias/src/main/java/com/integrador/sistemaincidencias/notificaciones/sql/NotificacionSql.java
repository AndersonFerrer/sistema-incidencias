package com.integrador.sistemaincidencias.notificaciones.sql;

/**
 * Sentencias SQL parametrizadas del modulo de notificaciones.
 *
 * <p>Cada consulta incluye obligatoriamente el predicado
 * {@code WHERE usuario_id = ?} (ver decision D6 del design:
 * "el cliente no puede ampliar el alcance"). Esto bloquea dos clases
 * de bug comunes:</p>
 * <ul>
 *   <li>Inyeccion por encabezado Authorization manipulado: la lectura
 *       siempre reescribe el {@code usuario_id} con el id resuelto por
 *       {@code validarAutenticado}, no con un parametro del cliente.</li>
 *   <li>Cross-user leakage: aunque el cliente cambie el {@code id}
 *       en la URL, la condicion adicional del WHERE mantiene la fila
 *       fuera de su alcance.</li>
 * </ul>
 *
 * <p>El placeholder para el filtro opcional de no-leidas se aplica solo
 * en el metodo {@code listar(usuarioId, page, size, soloNoLeidas)};
 * {@code contarNoLeidas}, {@code marcarTodasLeidas} y
 * {@code eliminar} ya llevan su WHERE interno equivalente.</p>
 */
public final class NotificacionSql {

    private NotificacionSql() {
    }

    public static final String CAMPOS = """
            SELECT id, usuario_id, incidencia_id, cliente_id, tipo, titulo,
                   descripcion, leido_en, creado_en
            FROM notificaciones
            """;

    public static final String BUSCAR_POR_ID = CAMPOS + """
            WHERE id = ?
            LIMIT 1
            """;

    /**
     * Lista paginada del usuario autenticado, ordenada por creado_en desc.
     * Si {@code soloNoLeidas} es {@code true}, agrega el predicado
     * {@code AND leido_en IS NULL}.
     */
    public static final String LISTAR_BASE = CAMPOS
            + " WHERE usuario_id = ?";

    public static final String LISTAR_FILTRO_NO_LEIDAS = " AND leido_en IS NULL";

    public static final String LISTAR_ORDEN =
            " ORDER BY creado_en DESC LIMIT ? OFFSET ?";

    public static final String CONTAR_BASE = """
            SELECT COUNT(*)
            FROM notificaciones
            WHERE usuario_id = ?
            """;

    public static final String CONTAR_FILTRO_NO_LEIDAS =
            " AND leido_en IS NULL";

    /**
     * Marca como leida la fila {@code id} del usuario. La sub-expresion
     * {@code COALESCE(leido_en, ?)} garantiza idempotencia: si la fila ya
     * estaba leida conserva el timestamp original y no falla.
     */
    public static final String MARCAR_LEIDA = """
            UPDATE notificaciones
            SET leido_en = COALESCE(leido_en, ?)
            WHERE id = ? AND usuario_id = ?
            """;

    /**
     * Marca como leidas TODAS las filas del usuario que aun no tienen
     * {@code leido_en}. Idempotente por construccion.
     */
    public static final String MARCAR_TODAS_LEIDAS = """
            UPDATE notificaciones
            SET leido_en = ?
            WHERE usuario_id = ? AND leido_en IS NULL
            """;

    public static final String ELIMINAR = """
            DELETE FROM notificaciones
            WHERE id = ? AND usuario_id = ?
            """;

    public static final String INSERTAR = """
            INSERT INTO notificaciones (
                id, usuario_id, incidencia_id, cliente_id, tipo,
                titulo, descripcion, creado_en
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            """;
}
