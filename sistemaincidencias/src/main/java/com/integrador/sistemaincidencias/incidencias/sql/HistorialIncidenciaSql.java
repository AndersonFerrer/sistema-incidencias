package com.integrador.sistemaincidencias.incidencias.sql;

public final class HistorialIncidenciaSql {

    private HistorialIncidenciaSql() {
    }

    public static final String LISTAR_POR_INCIDENCIA = """
            SELECT id, incidencia_id, usuario_id, accion, estado_proceso_anterior_id,
                   estado_proceso_nuevo_id, nota, creado_en
            FROM historial_incidencias
            WHERE incidencia_id = ?
            ORDER BY creado_en ASC
            """;

    public static final String INSERTAR = """
            INSERT INTO historial_incidencias (
                id, incidencia_id, usuario_id, accion, estado_proceso_anterior_id,
                estado_proceso_nuevo_id, nota, creado_en
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            """;
}
