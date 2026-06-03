package com.integrador.sistemaincidencias.usuarios.sql;

public final class UsuarioSql {

    private UsuarioSql() {
    }

    public static final String BUSCAR_POR_EMAIL = """
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
            WHERE lower(u.email) = lower(?)
            LIMIT 1
            """;

    public static final String BUSCAR_POR_ID = """
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
            WHERE u.id = ?
            LIMIT 1
            """;

    public static final String BUSCAR_DEMO_POR_ROL = """
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
            WHERE u.activo = true
              AND r.activo = true
              AND upper(r.codigo) = upper(?)
            ORDER BY u.creado_en ASC
            LIMIT 1
            """;
}
