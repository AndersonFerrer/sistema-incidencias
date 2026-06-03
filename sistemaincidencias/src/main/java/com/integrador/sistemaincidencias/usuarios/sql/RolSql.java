package com.integrador.sistemaincidencias.usuarios.sql;

public final class RolSql {

    private RolSql() {
    }

    public static final String CAMPOS_BASE = """
            SELECT
                r.id AS rol_id,
                r.codigo AS rol_codigo,
                r.nombre AS rol_nombre,
                r.descripcion AS rol_descripcion,
                r.activo AS rol_activo
            FROM roles r
            """;

    public static final String LISTAR = CAMPOS_BASE + """
            ORDER BY r.codigo ASC
            """;

    public static final String BUSCAR_POR_ID = CAMPOS_BASE + """
            WHERE r.id = ?
            LIMIT 1
            """;

    public static final String BUSCAR_POR_CODIGO = CAMPOS_BASE + """
            WHERE upper(r.codigo) = upper(?)
            LIMIT 1
            """;

    public static final String INSERTAR = """
            INSERT INTO roles (id, codigo, nombre, descripcion, activo)
            VALUES (?, ?, ?, ?, ?)
            """;

    public static final String ACTUALIZAR = """
            UPDATE roles
            SET codigo = ?,
                nombre = ?,
                descripcion = ?,
                activo = ?
            WHERE id = ?
            """;

    public static final String CONTAR_USUARIOS_ASIGNADOS = """
            SELECT COUNT(*) FROM usuarios WHERE rol_id = ?
            """;

    public static final String ELIMINAR = """
            DELETE FROM roles WHERE id = ?
            """;
}
