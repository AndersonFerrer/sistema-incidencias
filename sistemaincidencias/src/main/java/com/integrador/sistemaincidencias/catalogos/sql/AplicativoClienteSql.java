package com.integrador.sistemaincidencias.catalogos.sql;

public final class AplicativoClienteSql {

    private AplicativoClienteSql() {
    }

    public static final String LISTAR = """
            SELECT id, nombre, api_key, activo
            FROM clientes
            ORDER BY nombre ASC
            """;

    public static final String BUSCAR_POR_ID = """
            SELECT id, nombre, api_key, activo
            FROM clientes
            WHERE id = ?
            LIMIT 1
            """;

    public static final String BUSCAR_POR_NOMBRE = """
            SELECT id, nombre, api_key, activo
            FROM clientes
            WHERE lower(nombre) = lower(?)
            LIMIT 1
            """;

    public static final String INSERTAR = """
            INSERT INTO clientes (id, nombre, api_key, activo)
            VALUES (?, ?, ?, ?)
            """;

    public static final String ACTUALIZAR = """
            UPDATE clientes
            SET nombre = ?, activo = ?
            WHERE id = ?
            """;

    public static final String ROTAR_API_KEY = """
            UPDATE clientes
            SET api_key = ?
            WHERE id = ?
            """;

    public static final String ELIMINAR = """
            DELETE FROM clientes
            WHERE id = ?
            """;
}
