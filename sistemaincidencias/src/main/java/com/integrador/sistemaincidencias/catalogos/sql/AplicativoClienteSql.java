package com.integrador.sistemaincidencias.catalogos.sql;

public final class AplicativoClienteSql {

    private AplicativoClienteSql() {
    }

    public static final String LISTAR = """
            SELECT id, nombre, api_key, activo
            FROM aplicativos_cliente
            ORDER BY nombre ASC
            """;

    public static final String BUSCAR_POR_ID = """
            SELECT id, nombre, api_key, activo
            FROM aplicativos_cliente
            WHERE id = ?
            LIMIT 1
            """;

    public static final String BUSCAR_POR_NOMBRE = """
            SELECT id, nombre, api_key, activo
            FROM aplicativos_cliente
            WHERE lower(nombre) = lower(?)
            LIMIT 1
            """;

    public static final String INSERTAR = """
            INSERT INTO aplicativos_cliente (id, nombre, api_key, activo)
            VALUES (?, ?, ?, ?)
            """;

    public static final String ACTUALIZAR = """
            UPDATE aplicativos_cliente
            SET nombre = ?, activo = ?
            WHERE id = ?
            """;

    public static final String ROTAR_API_KEY = """
            UPDATE aplicativos_cliente
            SET api_key = ?
            WHERE id = ?
            """;
}
