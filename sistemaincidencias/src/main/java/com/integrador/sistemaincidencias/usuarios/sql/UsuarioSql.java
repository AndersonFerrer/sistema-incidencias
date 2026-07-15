package com.integrador.sistemaincidencias.usuarios.sql;

public final class UsuarioSql {

    private UsuarioSql() {
    }

    public static final String CAMPOS_BASE = """
            SELECT
                u.id AS usuario_id,
                u.nombre AS usuario_nombre,
                u.email AS usuario_email,
                u.password_hash AS usuario_password_hash,
                u.activo AS usuario_activo,
                u.avatar_url AS usuario_avatar_url,
                u.creado_en AS usuario_creado_en,
                u.actualizado_en AS usuario_actualizado_en,
                r.id AS rol_id,
                r.codigo AS rol_codigo,
                r.nombre AS rol_nombre,
                r.descripcion AS rol_descripcion,
                r.activo AS rol_activo
            FROM usuarios u
            INNER JOIN roles r ON r.id = u.rol_id
            """;

    public static final String BUSCAR_POR_EMAIL = CAMPOS_BASE + """
            WHERE lower(u.email) = lower(?)
            LIMIT 1
            """;

    public static final String BUSCAR_POR_ID = CAMPOS_BASE + """
            WHERE u.id = ?
            LIMIT 1
            """;

    public static final String BUSCAR_DEMO_POR_ROL = CAMPOS_BASE + """
            WHERE u.activo = true
              AND r.activo = true
              AND upper(r.codigo) = upper(?)
            ORDER BY u.creado_en ASC
            LIMIT 1
            """;

    public static final String LISTAR_ASIGNABLES = CAMPOS_BASE + """
            WHERE u.activo = true
              AND r.activo = true
              AND upper(r.codigo) IN ('AGENTE', 'ADMINISTRADOR')
            ORDER BY u.nombre ASC
            LIMIT 100
            """;

    public static final String INSERTAR = """
            INSERT INTO usuarios (
                id,
                nombre,
                email,
                password_hash,
                rol_id,
                activo,
                avatar_url,
                creado_en,
                actualizado_en
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            """;

    public static final String ACTUALIZAR = """
            UPDATE usuarios
            SET nombre = ?,
                email = ?,
                rol_id = ?,
                activo = ?,
                avatar_url = ?,
                actualizado_en = CURRENT_TIMESTAMP
            WHERE id = ?
            """;

    public static final String CAMBIAR_PASSWORD = """
            UPDATE usuarios
            SET password_hash = ?,
                actualizado_en = CURRENT_TIMESTAMP
            WHERE id = ?
            """;

    public static final String CAMBIAR_ACTIVO = """
            UPDATE usuarios
            SET activo = ?,
                actualizado_en = CURRENT_TIMESTAMP
            WHERE id = ?
            """;

    public static final String ACTUALIZAR_PERFIL = """
            UPDATE usuarios
            SET nombre = ?,
                avatar_url = ?,
                actualizado_en = CURRENT_TIMESTAMP
            WHERE id = ?
            """;
}
