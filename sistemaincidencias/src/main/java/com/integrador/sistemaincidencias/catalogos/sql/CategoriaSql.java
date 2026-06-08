package com.integrador.sistemaincidencias.catalogos.sql;

public final class CategoriaSql {

    private CategoriaSql() {
    }

    public static final String LISTAR = """
            SELECT id, cliente_id, nombre, descripcion, activo
            FROM categorias
            ORDER BY nombre ASC
            """;

    public static final String BUSCAR_POR_ID = """
            SELECT id, cliente_id, nombre, descripcion, activo
            FROM categorias
            WHERE id = ?
            LIMIT 1
            """;

    public static final String BUSCAR_POR_NOMBRE = """
            SELECT id, cliente_id, nombre, descripcion, activo
            FROM categorias
            WHERE lower(nombre) = lower(?)
            LIMIT 1
            """;

    public static final String INSERTAR = """
            INSERT INTO categorias (id, cliente_id, nombre, descripcion, activo)
            VALUES (?, ?, ?, ?, ?)
            """;

    public static final String ACTUALIZAR = """
            UPDATE categorias
            SET cliente_id = ?, nombre = ?, descripcion = ?, activo = ?
            WHERE id = ?
            """;
}
