package com.integrador.sistemaincidencias.catalogos.sql;

public final class UsuarioExternoSql {

    private UsuarioExternoSql() {
    }

    public static final String LISTAR = """
            SELECT id, email, nombre, apellido, activo
            FROM usuarios_externos
            ORDER BY nombre ASC, apellido ASC
            """;

    public static final String BUSCAR_POR_ID = """
            SELECT id, email, nombre, apellido, activo
            FROM usuarios_externos
            WHERE id = ?
            LIMIT 1
            """;

    public static final String BUSCAR_POR_EMAIL = """
            SELECT id, email, nombre, apellido, activo
            FROM usuarios_externos
            WHERE lower(email) = lower(?)
            LIMIT 1
            """;

    public static final String INSERTAR = """
            INSERT INTO usuarios_externos (id, email, nombre, apellido, activo)
            VALUES (?, ?, ?, ?, ?)
            """;

    public static final String ACTUALIZAR = """
            UPDATE usuarios_externos
            SET email = ?, nombre = ?, apellido = ?, activo = ?
            WHERE id = ?
            """;
}
