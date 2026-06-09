package com.integrador.sistemaincidencias.incidencias.sql;

public final class IncidenciaSql {

    private IncidenciaSql() {
    }

    public static final String CAMPOS = """
            SELECT id, codigo, titulo, descripcion, cliente_id, estado_proceso_id,
                   estado_aprobacion_id, prioridad, categoria_id, creado_por_usuario_id,
                   usuario_externo_id, asignado_a, creado_en, actualizado_en, resuelto_en
            FROM incidencias
            """;

    public static final String BUSCAR_POR_ID = CAMPOS + """
            WHERE id = ?
            LIMIT 1
            """;

    public static final String INSERTAR = """
            INSERT INTO incidencias (
                id, codigo, titulo, descripcion, cliente_id, estado_proceso_id,
                estado_aprobacion_id, prioridad, categoria_id, creado_por_usuario_id,
                usuario_externo_id, asignado_a, creado_en, actualizado_en, resuelto_en
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, ?)
            """;

    public static final String ACTUALIZAR = """
            UPDATE incidencias
            SET titulo = ?, descripcion = ?, categoria_id = ?, prioridad = ?,
                asignado_a = ?, actualizado_en = CURRENT_TIMESTAMP
            WHERE id = ?
            """;

    public static final String CAMBIAR_ESTADO = """
            UPDATE incidencias
            SET estado_proceso_id = ?, actualizado_en = CURRENT_TIMESTAMP,
                resuelto_en = CASE WHEN ? THEN CURRENT_TIMESTAMP ELSE resuelto_en END
            WHERE id = ?
            """;

    public static final String CAMBIAR_APROBACION = """
            UPDATE incidencias
            SET estado_aprobacion_id = ?, actualizado_en = CURRENT_TIMESTAMP
            WHERE id = ?
            """;

    public static final String ELIMINAR = """
            DELETE FROM incidencias
            WHERE id = ?
            """;
}
