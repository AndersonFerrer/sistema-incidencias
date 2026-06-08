-- Script incremental para completar el DER final del Sistema de Incidencias.
-- Ejecutar despues de:
--   001_auth_base.sql
--   002_usuarios_roles_seed.sql
--   003_catalogos.sql
--
-- Este script crea las tablas faltantes y sus relaciones:
--   incidencias
--   comentarios
--   adjuntos
--   aprobaciones
--   notificaciones
--   historial_incidencias
--
-- Tambien agrega usuarios_externos.external_id porque aparece en el DER final.

BEGIN;

-- Ajuste pendiente detectado al comparar BD actual vs DER final.
ALTER TABLE usuarios_externos
    ADD COLUMN IF NOT EXISTS external_id varchar(150);

CREATE INDEX IF NOT EXISTS idx_usuarios_externos_external_id
    ON usuarios_externos (external_id);

-- Tabla central de incidencias.
CREATE TABLE IF NOT EXISTS incidencias (
    id uuid PRIMARY KEY,
    codigo varchar(50) NOT NULL UNIQUE,
    titulo varchar(200) NOT NULL,
    descripcion text NOT NULL,
    cliente_id uuid NOT NULL,
    estado_proceso_id uuid NOT NULL,
    estado_aprobacion_id uuid NOT NULL,
    prioridad varchar(20) NOT NULL,
    categoria_id uuid NOT NULL,
    creado_por_usuario_id uuid,
    usuario_externo_id uuid,
    asignado_a uuid,
    creado_en timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    resuelto_en timestamp without time zone,

    CONSTRAINT fk_incidencias_cliente
        FOREIGN KEY (cliente_id)
        REFERENCES clientes(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_incidencias_estado_proceso
        FOREIGN KEY (estado_proceso_id)
        REFERENCES estados_proceso(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_incidencias_estado_aprobacion
        FOREIGN KEY (estado_aprobacion_id)
        REFERENCES estados_aprobacion(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_incidencias_categoria
        FOREIGN KEY (categoria_id)
        REFERENCES categorias(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_incidencias_creado_por_usuario
        FOREIGN KEY (creado_por_usuario_id)
        REFERENCES usuarios(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,

    CONSTRAINT fk_incidencias_usuario_externo
        FOREIGN KEY (usuario_externo_id)
        REFERENCES usuarios_externos(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,

    CONSTRAINT fk_incidencias_asignado_a
        FOREIGN KEY (asignado_a)
        REFERENCES usuarios(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,

    CONSTRAINT ck_incidencias_prioridad
        CHECK (prioridad IN ('BAJA', 'MEDIA', 'ALTA', 'CRITICA')),

    CONSTRAINT ck_incidencias_fechas
        CHECK (resuelto_en IS NULL OR resuelto_en >= creado_en)
);

-- Comentarios de avance o notas de la incidencia.
CREATE TABLE IF NOT EXISTS comentarios (
    id uuid PRIMARY KEY,
    incidencia_id uuid NOT NULL,
    autor_id uuid NOT NULL,
    contenido text NOT NULL,
    creado_en timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en timestamp without time zone,

    CONSTRAINT fk_comentarios_incidencia
        FOREIGN KEY (incidencia_id)
        REFERENCES incidencias(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT fk_comentarios_autor
        FOREIGN KEY (autor_id)
        REFERENCES usuarios(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
);

-- Evidencias o archivos adjuntos de una incidencia.
CREATE TABLE IF NOT EXISTS adjuntos (
    id uuid PRIMARY KEY,
    incidencia_id uuid NOT NULL,
    subido_por uuid NOT NULL,
    nombre_archivo varchar(255) NOT NULL,
    tipo_mime varchar(120) NOT NULL,
    tamaño_bytes integer NOT NULL,
    url varchar(500) NOT NULL,
    subido_en timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_adjuntos_incidencia
        FOREIGN KEY (incidencia_id)
        REFERENCES incidencias(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT fk_adjuntos_subido_por
        FOREIGN KEY (subido_por)
        REFERENCES usuarios(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT ck_adjuntos_tamano
        CHECK (tamaño_bytes > 0)
);

-- Historial de decisiones de aprobacion o rechazo.
CREATE TABLE IF NOT EXISTS aprobaciones (
    id uuid PRIMARY KEY,
    incidencia_id uuid NOT NULL,
    revisado_por uuid NOT NULL,
    estado_aprobacion_id uuid NOT NULL,
    motivo_rechazo text,
    decidido_en timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_aprobaciones_incidencia
        FOREIGN KEY (incidencia_id)
        REFERENCES incidencias(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT fk_aprobaciones_revisado_por
        FOREIGN KEY (revisado_por)
        REFERENCES usuarios(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_aprobaciones_estado_aprobacion
        FOREIGN KEY (estado_aprobacion_id)
        REFERENCES estados_aprobacion(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
);

-- Centro de notificaciones del sistema.
CREATE TABLE IF NOT EXISTS notificaciones (
    id uuid PRIMARY KEY,
    usuario_id uuid NOT NULL,
    incidencia_id uuid,
    cliente_id uuid,
    tipo varchar(80) NOT NULL,
    titulo varchar(200) NOT NULL,
    descripcion text,
    leido_en timestamp without time zone,
    creado_en timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_notificaciones_usuario
        FOREIGN KEY (usuario_id)
        REFERENCES usuarios(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT fk_notificaciones_incidencia
        FOREIGN KEY (incidencia_id)
        REFERENCES incidencias(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT fk_notificaciones_cliente
        FOREIGN KEY (cliente_id)
        REFERENCES clientes(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL
);

-- Auditoria de cambios relevantes de incidencias.
CREATE TABLE IF NOT EXISTS historial_incidencias (
    id uuid PRIMARY KEY,
    incidencia_id uuid NOT NULL,
    usuario_id uuid,
    accion varchar(80) NOT NULL,
    estado_proceso_anterior_id uuid,
    estado_proceso_nuevo_id uuid,
    nota text,
    creado_en timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_historial_incidencia
        FOREIGN KEY (incidencia_id)
        REFERENCES incidencias(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT fk_historial_usuario
        FOREIGN KEY (usuario_id)
        REFERENCES usuarios(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,

    CONSTRAINT fk_historial_estado_proceso_anterior
        FOREIGN KEY (estado_proceso_anterior_id)
        REFERENCES estados_proceso(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,

    CONSTRAINT fk_historial_estado_proceso_nuevo
        FOREIGN KEY (estado_proceso_nuevo_id)
        REFERENCES estados_proceso(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL
);

-- Indices para busquedas, filtros, JOINs y paginacion.
CREATE INDEX IF NOT EXISTS idx_incidencias_codigo
    ON incidencias (codigo);

CREATE INDEX IF NOT EXISTS idx_incidencias_cliente
    ON incidencias (cliente_id);

CREATE INDEX IF NOT EXISTS idx_incidencias_estado_proceso
    ON incidencias (estado_proceso_id);

CREATE INDEX IF NOT EXISTS idx_incidencias_estado_aprobacion
    ON incidencias (estado_aprobacion_id);

CREATE INDEX IF NOT EXISTS idx_incidencias_categoria
    ON incidencias (categoria_id);

CREATE INDEX IF NOT EXISTS idx_incidencias_creado_por_usuario
    ON incidencias (creado_por_usuario_id);

CREATE INDEX IF NOT EXISTS idx_incidencias_usuario_externo
    ON incidencias (usuario_externo_id);

CREATE INDEX IF NOT EXISTS idx_incidencias_asignado_a
    ON incidencias (asignado_a);

CREATE INDEX IF NOT EXISTS idx_incidencias_prioridad
    ON incidencias (prioridad);

CREATE INDEX IF NOT EXISTS idx_incidencias_creado_en
    ON incidencias (creado_en);

CREATE INDEX IF NOT EXISTS idx_incidencias_actualizado_en
    ON incidencias (actualizado_en);

CREATE INDEX IF NOT EXISTS idx_comentarios_incidencia
    ON comentarios (incidencia_id);

CREATE INDEX IF NOT EXISTS idx_comentarios_autor
    ON comentarios (autor_id);

CREATE INDEX IF NOT EXISTS idx_adjuntos_incidencia
    ON adjuntos (incidencia_id);

CREATE INDEX IF NOT EXISTS idx_adjuntos_subido_por
    ON adjuntos (subido_por);

CREATE INDEX IF NOT EXISTS idx_aprobaciones_incidencia
    ON aprobaciones (incidencia_id);

CREATE INDEX IF NOT EXISTS idx_aprobaciones_revisado_por
    ON aprobaciones (revisado_por);

CREATE INDEX IF NOT EXISTS idx_aprobaciones_estado
    ON aprobaciones (estado_aprobacion_id);

CREATE INDEX IF NOT EXISTS idx_notificaciones_usuario
    ON notificaciones (usuario_id);

CREATE INDEX IF NOT EXISTS idx_notificaciones_incidencia
    ON notificaciones (incidencia_id);

CREATE INDEX IF NOT EXISTS idx_notificaciones_cliente
    ON notificaciones (cliente_id);

CREATE INDEX IF NOT EXISTS idx_notificaciones_leido_en
    ON notificaciones (leido_en);

CREATE INDEX IF NOT EXISTS idx_notificaciones_creado_en
    ON notificaciones (creado_en);

CREATE INDEX IF NOT EXISTS idx_historial_incidencias_incidencia
    ON historial_incidencias (incidencia_id);

CREATE INDEX IF NOT EXISTS idx_historial_incidencias_usuario
    ON historial_incidencias (usuario_id);

CREATE INDEX IF NOT EXISTS idx_historial_incidencias_accion
    ON historial_incidencias (accion);

CREATE INDEX IF NOT EXISTS idx_historial_incidencias_creado_en
    ON historial_incidencias (creado_en);

COMMIT;
