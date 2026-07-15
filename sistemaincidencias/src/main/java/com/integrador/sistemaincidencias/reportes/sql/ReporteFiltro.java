package com.integrador.sistemaincidencias.reportes.sql;

import java.sql.Timestamp;
import java.util.UUID;

/**
 * Filtro normalizado que el servicio pasa al DAO.
 *
 * Encapsula el resultado de:
 * <ul>
 *   <li>Resolver el {@code rango} preset a un par de marcas de tiempo
 *       inclusivo/exclusivo (segun design.md D3).</li>
 *   <li>Forzar el alcance por rol (administrador sin ambito, agente
 *       {@code asignado_a = currentUser.id}, usuario {@code creado_por_usuario_id
 *       = currentUser.id}).</li>
 *   <li>Opcional: agregar un {@code agenteId} para drill-down del administrador.</li>
 * </ul>
 *
 * Los timestamps viven en UTC servidor; el intervalo es mitad abierto:
 * {@code [desde, hasta)} donde {@code hasta} es la medianoche del dia
 * siguiente para incluir todas las incidencias del ultimo dia calendario
 * (incluyendo {@code 23:59:59.999999}).
 *
 * Esta estructura se construye unicamente en el servicio y nunca se popula
 * con texto del cliente.
 */
public record ReporteFiltro(
        Timestamp desdeIncluyente,
        Timestamp hastaExcluyente,
        String rolCodigo,
        UUID currentUserId,
        UUID agenteFiltro
) {
}
