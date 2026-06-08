package com.integrador.sistemaincidencias.catalogos.sql;

public final class EstadoProcesoSql {

    private EstadoProcesoSql() {
    }

    public static final String LISTAR = """
            SELECT id, clave, etiqueta, es_terminal, orden, activo
            FROM estados_proceso
            ORDER BY orden ASC
            """;

    public static final String BUSCAR_POR_ID = """
            SELECT id, clave, etiqueta, es_terminal, orden, activo
            FROM estados_proceso
            WHERE id = ?
            LIMIT 1
            """;

    public static final String BUSCAR_POR_CLAVE = """
            SELECT id, clave, etiqueta, es_terminal, orden, activo
            FROM estados_proceso
            WHERE upper(clave) = upper(?)
            LIMIT 1
            """;

    public static final String INSERTAR = """
            INSERT INTO estados_proceso (id, clave, etiqueta, es_terminal, orden, activo)
            VALUES (?, ?, ?, ?, ?, ?)
            """;

    public static final String ACTUALIZAR = """
            UPDATE estados_proceso
            SET clave = ?, etiqueta = ?, es_terminal = ?, orden = ?, activo = ?
            WHERE id = ?
            """;
}
