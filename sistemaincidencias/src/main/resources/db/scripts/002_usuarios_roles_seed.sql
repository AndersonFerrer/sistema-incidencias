-- Datos complementarios para el modulo de usuarios y roles.
-- Ejecutar despues de 001_auth_base.sql.
-- Credenciales de desarrollo para ambos usuarios:
--   password: admin123

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
VALUES
    (
        '00000000-0000-0000-0000-000000000102',
        'Agente Mesa de Ayuda',
        'agente@sistema.com',
        '$2a$10$1iYpEJ0JhiWXIUbvPpojSufUQuWuw6IkVNBmKvwztY7iXzWhxXjyW',
        '00000000-0000-0000-0000-000000000002',
        true,
        null,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    ),
    (
        '00000000-0000-0000-0000-000000000103',
        'Usuario Demo',
        'usuario@sistema.com',
        '$2a$10$1iYpEJ0JhiWXIUbvPpojSufUQuWuw6IkVNBmKvwztY7iXzWhxXjyW',
        '00000000-0000-0000-0000-000000000003',
        true,
        null,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    )
ON CONFLICT (email) DO NOTHING;
