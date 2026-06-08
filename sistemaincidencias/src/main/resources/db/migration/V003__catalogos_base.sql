-- Catalog master tables

-- Estados de Aprobación
CREATE TABLE IF NOT EXISTS estados_aprobacion (
    id UUID PRIMARY KEY,
    clave VARCHAR(50) NOT NULL UNIQUE,
    etiqueta VARCHAR(150) NOT NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT ck_estado_aprobacion_clave CHECK (clave ~ '^[A-Z0-9_]+$')
);

CREATE INDEX idx_estados_aprobacion_clave ON estados_aprobacion(upper(clave));
CREATE INDEX idx_estados_aprobacion_activo ON estados_aprobacion(activo);

-- Categorías
CREATE TABLE IF NOT EXISTS categorias (
    id UUID PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    descripcion VARCHAR(500),
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT ck_categoria_nombre CHECK (char_length(trim(nombre)) > 0)
);

CREATE INDEX idx_categorias_nombre ON categorias(lower(nombre));
CREATE INDEX idx_categorias_activo ON categorias(activo);

-- Aplicativos Cliente
CREATE TABLE IF NOT EXISTS aplicativos_cliente (
    id UUID PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    api_key VARCHAR(32) NOT NULL UNIQUE,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT ck_aplicativo_nombre CHECK (char_length(trim(nombre)) > 0),
    CONSTRAINT ck_api_key_length CHECK (char_length(api_key) = 32)
);

CREATE INDEX idx_aplicativos_cliente_nombre ON aplicativos_cliente(lower(nombre));
CREATE INDEX idx_aplicativos_cliente_api_key ON aplicativos_cliente(api_key);
CREATE INDEX idx_aplicativos_cliente_activo ON aplicativos_cliente(activo);

-- Usuarios Externos
CREATE TABLE IF NOT EXISTS usuarios_externos (
    id UUID PRIMARY KEY,
    email VARCHAR(150) NOT NULL UNIQUE,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT ck_usuario_externo_email CHECK (email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT ck_usuario_externo_nombre CHECK (char_length(trim(nombre)) > 0),
    CONSTRAINT ck_usuario_externo_apellido CHECK (char_length(trim(apellido)) > 0)
);

CREATE INDEX idx_usuarios_externos_email ON usuarios_externos(lower(email));
CREATE INDEX idx_usuarios_externos_nombre ON usuarios_externos(lower(nombre));
CREATE INDEX idx_usuarios_externos_apellido ON usuarios_externos(lower(apellido));
CREATE INDEX idx_usuarios_externos_activo ON usuarios_externos(activo);

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
