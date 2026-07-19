-- Migracion 005 — Audit log global (RNF-09)
--
-- Ejecutar manualmente despues de 004_incidencias_relaciones.sql:
--   psql -U <user> -d sistemaincidencias -f 005_audit_eventos.sql
--
-- Tabla append-only para eventos de auditoria cross-modulo:
-- LOGIN/LOGIN_FAILED (auth), USER_CREATED/UPDATED/DELETED/ACTIVATED/DEACTIVATED
-- (usuarios), CATALOG_CREATED/UPDATED/DELETED (catalogos), etc.

CREATE TABLE IF NOT EXISTS audit_eventos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID,
    accion VARCHAR(50) NOT NULL,
    recurso VARCHAR(100),
    recurso_id UUID,
    metadata JSONB,
    exitoso BOOLEAN NOT NULL DEFAULT true,
    creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_usuario ON audit_eventos (usuario_id, creado_en DESC);
CREATE INDEX IF NOT EXISTS idx_audit_accion ON audit_eventos (accion, creado_en DESC);
CREATE INDEX IF NOT EXISTS idx_audit_recurso ON audit_eventos (recurso, recurso_id);
