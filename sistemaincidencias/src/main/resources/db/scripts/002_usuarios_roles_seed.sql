-- Datos complementarios para el modulo de usuarios y roles.
-- Ejecutar despues de 001_auth_base.sql.
-- Credenciales de desarrollo:
--   admin@sistema.com / agente@sistema.com / usuario@sistema.com -> password: admin123
--   demo@sistema.com                                                 -> password: demo123
--      (solo acceso via /api/auth/demo; user normal login tambien disponible)

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
    ),
    (
        '00000000-0000-0000-0000-000000000104',
        'Administrador Demo',
        'demo@sistema.com',
        '$2a$10$.zYhlTDbdQBgG3B6eYW0cOmgfEMeVVGMbMLHFdl/CaQ.sjV3qBTq6',
        '00000000-0000-0000-0000-000000000001',
        true,
        null,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    )
ON CONFLICT (email) DO NOTHING;