package com.integrador.sistemaincidencias.auditoria.model;

import java.time.LocalDateTime;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Evento append-only de auditoria. Representa una fila de la tabla
 * {@code audit_eventos}. Sinonimo de "audit log entry".
 *
 * <p>{@code metadata} se almacena como JSONB en la BD; en Java lo mapeamos
 * a un string crudo y delegamos el parseo al caller si lo necesita.</p>
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuditEvento {

    private UUID id;
    private UUID usuarioId;
    private String accion;
    private String recurso;
    private UUID recursoId;
    private String metadata;
    private boolean exitoso;
    private LocalDateTime creadoEn;
}
