-- Script inicial para autenticacion.
-- Ejecutar manualmente en PostgreSQL antes de probar /api/auth/login.
-- Credenciales de desarrollo:
--   email: admin@sistema.com
--   password: admin123

CREATE TABLE IF NOT EXISTS roles (
    id uuid PRIMARY KEY,
    codigo varchar(50) NOT NULL UNIQUE,
    nombre varchar(100) NOT NULL,
    descripcion varchar(255),
    activo boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS usuarios (
    id uuid PRIMARY KEY,
    nombre varchar(150) NOT NULL,
    email varchar(150) NOT NULL UNIQUE,
    password_hash varchar(255) NOT NULL,
    rol_id uuid NOT NULL REFERENCES roles(id),
    activo boolean NOT NULL DEFAULT true,
    avatar_url varchar(500),
    creado_en timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios (lower(email));
CREATE INDEX IF NOT EXISTS idx_usuarios_rol_id ON usuarios (rol_id);

INSERT INTO roles (id, codigo, nombre, descripcion, activo)
VALUES
    ('00000000-0000-0000-0000-000000000001', 'ADMINISTRADOR', 'Administrador', 'Acceso total al sistema', true),
    ('00000000-0000-0000-0000-000000000002', 'AGENTE', 'Agente', 'Atiende y gestiona incidencias asignadas', true),
    ('00000000-0000-0000-0000-000000000003', 'USUARIO', 'Usuario', 'Registra y consulta incidencias propias', true)
ON CONFLICT (codigo) DO NOTHING;

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
VALUES (
    '00000000-0000-0000-0000-000000000101',
    'Administrador',
    'admin@sistema.com',
    '$2a$10$grjgxQN/w9nPgYV2xeLYsudAtQ5M0HqEGsIS21rg005EDqpBbYUG6',
    '00000000-0000-0000-0000-000000000001',
    true,
    null,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT (email) DO NOTHING;
