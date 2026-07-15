package com.integrador.sistemaincidencias.catalogos.sql;

public final class EstadoAprobacionSql {

    private EstadoAprobacionSql() {
    }

    public static final String LISTAR = """
            SELECT id, clave, etiqueta, activo
            FROM estados_aprobacion
            WHERE activo = true
            ORDER BY clave ASC
            """;

    public static final String BUSCAR_POR_ID = """
            SELECT id, clave, etiqueta, activo
            FROM estados_aprobacion
            WHERE id = ?
            LIMIT 1
            """;

    public static final String BUSCAR_POR_CLAVE = """
            SELECT id, clave, etiqueta, activo
            FROM estados_aprobacion
            WHERE upper(clave) = upper(?)
            LIMIT 1
            """;

    public static final String INSERTAR = """
            INSERT INTO estados_aprobacion (id, clave, etiqueta, activo)
            VALUES (?, ?, ?, ?)
            """;

    public static final String ACTUALIZAR = """
            UPDATE estados_aprobacion
            SET clave = ?, etiqueta = ?, activo = ?
            WHERE id = ?
            """;

    public static final String DESACTIVAR = """
            UPDATE estados_aprobacion
            SET activo = ?
            WHERE id = ?
            """;
}
