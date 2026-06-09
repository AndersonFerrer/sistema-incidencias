package com.integrador.sistemaincidencias.incidencias.sql;

public final class AdjuntoSql {

    private AdjuntoSql() {
    }

    public static final String LISTAR_POR_INCIDENCIA = """
            SELECT id, incidencia_id, subido_por, nombre_archivo, tipo_mime, tamaño_bytes, url, subido_en
            FROM adjuntos
            WHERE incidencia_id = ?
            ORDER BY subido_en DESC
            """;

    public static final String INSERTAR = """
            INSERT INTO adjuntos (id, incidencia_id, subido_por, nombre_archivo, tipo_mime, tamaño_bytes, url, subido_en)
            VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            """;
}
