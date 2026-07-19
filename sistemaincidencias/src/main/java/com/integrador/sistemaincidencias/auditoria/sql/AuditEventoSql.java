package com.integrador.sistemaincidencias.auditoria.sql;

/**
 * Sentencias SQL del modulo auditoria (RNF-09).
 *
 * <p>Solo operaciones append-only — la tabla {@code audit_eventos} no se
 * modifica ni se borra desde el codigo de aplicacion.</p>
 */
public final class AuditEventoSql {

    private AuditEventoSql() {
    }

    public static final String INSERTAR = """
            INSERT INTO audit_eventos (
                id, usuario_id, accion, recurso, recurso_id, metadata, exitoso, creado_en
            )
            VALUES (?, ?, ?, ?, ?, ?::jsonb, ?, CURRENT_TIMESTAMP)
            """;
}
