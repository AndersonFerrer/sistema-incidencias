package com.integrador.sistemaincidencias.incidencias.sql;

public final class ComentarioSql {

    private ComentarioSql() {
    }

    public static final String LISTAR_POR_INCIDENCIA = """
            SELECT id, incidencia_id, autor_id, contenido, creado_en, actualizado_en
            FROM comentarios
            WHERE incidencia_id = ?
            ORDER BY creado_en ASC
            """;

    public static final String INSERTAR = """
            INSERT INTO comentarios (id, incidencia_id, autor_id, contenido, creado_en, actualizado_en)
            VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, NULL)
            """;
}
