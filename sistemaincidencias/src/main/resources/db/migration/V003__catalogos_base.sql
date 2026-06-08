-- Catalog master tables

-- Estados de Aprobación
CREATE TABLE IF NOT EXISTS estados_aprobacion (
    id UUID PRIMARY KEY,
    clave VARCHAR(50) NOT NULL UNIQUE,
    etiqueta VARCHAR(150) NOT NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT ck_estado_aprobacion_clave CHECK (clave ~ '^[A-Z0-9_]+$')
);

CREATE INDEX IF NOT EXISTS idx_estados_aprobacion_clave ON estados_aprobacion(upper(clave));
CREATE INDEX IF NOT EXISTS idx_estados_aprobacion_activo ON estados_aprobacion(activo);

-- Clientes (Aplicativos Cliente)
CREATE TABLE IF NOT EXISTS clientes (
    id UUID PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL UNIQUE,
    api_key VARCHAR(255),
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_clientes_nombre ON clientes(lower(nombre));
CREATE INDEX IF NOT EXISTS idx_clientes_api_key ON clientes(api_key);
CREATE INDEX IF NOT EXISTS idx_clientes_activo ON clientes(activo);

-- Categorías
CREATE TABLE IF NOT EXISTS categorias (
    id UUID PRIMARY KEY,
    cliente_id UUID NOT NULL REFERENCES clientes(id),
    nombre VARCHAR(150) NOT NULL,
    descripcion VARCHAR(255),
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_categorias_nombre ON categorias(lower(nombre));
CREATE INDEX IF NOT EXISTS idx_categorias_activo ON categorias(activo);
CREATE INDEX IF NOT EXISTS idx_categorias_cliente ON categorias(cliente_id);

-- Usuarios Externos
CREATE TABLE IF NOT EXISTS usuarios_externos (
    id UUID PRIMARY KEY,
    cliente_id UUID NOT NULL REFERENCES clientes(id),
    nombre VARCHAR(150) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_usuarios_externos_email ON usuarios_externos(lower(email));
CREATE INDEX IF NOT EXISTS idx_usuarios_externos_nombre ON usuarios_externos(lower(nombre));
CREATE INDEX IF NOT EXISTS idx_usuarios_externos_activo ON usuarios_externos(activo);
CREATE INDEX IF NOT EXISTS idx_usuarios_externos_cliente ON usuarios_externos(cliente_id);

-- Initial data for Estados de Aprobación
INSERT INTO estados_aprobacion (id, clave, etiqueta, activo) VALUES
    ('550e8400-e29b-41d4-a716-446655440001', 'SOLICITADA', 'Solicitada', true),
    ('550e8400-e29b-41d4-a716-446655440002', 'APROBADA', 'Aprobada', true),
    ('550e8400-e29b-41d4-a716-446655440003', 'RECHAZADA', 'Rechazada', true)
ON CONFLICT (clave) DO NOTHING;

-- Initial data for Estados de Proceso (if not already inserted)
INSERT INTO estados_proceso (id, clave, etiqueta, es_terminal, orden, activo) VALUES
    ('550e8400-e29b-41d4-a716-446655340001', 'PENDIENTE', 'Pendiente', false, 1, true),
    ('550e8400-e29b-41d4-a716-446655340002', 'EN_PROCESO', 'En Proceso', false, 2, true),
    ('550e8400-e29b-41d4-a716-446655340003', 'FINALIZADA', 'Finalizada', true, 3, true),
    ('550e8400-e29b-41d4-a716-446655340004', 'RECHAZADA', 'Rechazada', true, 4, true)
ON CONFLICT (clave) DO NOTHING;
