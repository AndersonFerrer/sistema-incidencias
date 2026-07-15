package com.integrador.sistemaincidencias.dashboard.sql;

import java.util.UUID;

/**
 * Scope de visibilidad por rol inyectado al WHERE de las consultas de dashboard.
 *
 * El administrador no aplica ningun filtro adicional (ambos campos en {@code null}).
 * El agente ve solo las incidencias que tiene asignadas ({@code asignadoA} poblado).
 * El usuario ve solo las que el mismo creo ({@code creadoPorUsuarioId} poblado).
 *
 * Esta estructura se construye en el service a partir del rol del usuario autenticado
 * y se pasa al DAO sin posibilidad de que el cliente lo manipule.
 */
public record ScopeFiltro(UUID asignadoA, UUID creadoPorUsuarioId) {

    public static ScopeFiltro administrador() {
        return new ScopeFiltro(null, null);
    }

    public static ScopeFiltro agente(UUID agenteId) {
        return new ScopeFiltro(agenteId, null);
    }

    public static ScopeFiltro usuario(UUID usuarioId) {
        return new ScopeFiltro(null, usuarioId);
    }

    public boolean esAdministrador() {
        return asignadoA == null && creadoPorUsuarioId == null;
    }
}