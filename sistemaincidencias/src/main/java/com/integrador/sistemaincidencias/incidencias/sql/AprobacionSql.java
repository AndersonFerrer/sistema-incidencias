package com.integrador.sistemaincidencias.incidencias.sql;

public final class AprobacionSql {

    private AprobacionSql() {
    }

    public static final String INSERTAR = """
            INSERT INTO aprobaciones (
                id, incidencia_id, revisado_por, estado_aprobacion_id, motivo_rechazo, decidido_en
            )
            VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            """;
}
