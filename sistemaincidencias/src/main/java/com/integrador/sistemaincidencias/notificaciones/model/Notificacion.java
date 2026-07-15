package com.integrador.sistemaincidencias.notificaciones.model;

import java.time.LocalDateTime;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Modelo de dominio para una fila de {@code notificaciones}.
 *
 * <p>Espejo 1:1 de la tabla persistida en
 * {@code sistemaincidencias/src/main/resources/db/scripts/004_incidencias_relaciones.sql:171-199}:
 * columnas {@code id}, {@code usuario_id}, {@code incidencia_id}, {@code cliente_id},
 * {@code tipo}, {@code titulo}, {@code descripcion}, {@code leido_en}, {@code creado_en}.</p>
 *
 * <p>Es un POJO Lombok sin anotaciones JPA (ver {@code sistemaincidencias/AGENTS.md}
 * regla tecnica principal). No se anota con {@code @Entity}. El tipo de
 * {@code tipo} es {@link String} para no acoplar este POJO al enum todavia;
 * la conversion a {@link NotificacionTipo} la hace el mapper o el servicio.</p>
 *
 * <p>El campo derivado {@code leido} no existe fisicamente; se calcula en el
 * mapper como {@code leido_en != null} cuando se necesita exponerlo en respuestas
 * JSON (ver {@code NotificacionResponse#leido}).</p>
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Notificacion {

    private UUID id;
    private UUID usuarioId;
    private UUID incidenciaId;
    private UUID clienteId;
    private String tipo;
    private String titulo;
    private String descripcion;
    private LocalDateTime leidoEn;
    private LocalDateTime creadoEn;
}
