package com.integrador.sistemaincidencias.auditoria.service;

import com.integrador.sistemaincidencias.auditoria.dao.AuditEventoDao;
import com.integrador.sistemaincidencias.shared.exception.AccesoDatosException;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

/**
 * Servicio de auditoria (RNF-09).
 *
 * <p>API publica: {@link #registrar(UUID, String, String, UUID)} y overloads.
 * Fire-and-forget: si el insert lanza {@link AccesoDatosException}, se loguea
 * con WARN y NO se propaga — los errores de auditoria no deben romper una
 * operacion de negocio exitosa (ej. un POST /usuarios que falla al auditar
 * debe igual crear el usuario si la operacion principal es valida).</p>
 *
 * <p>Las acciones siguen el patron upper_snake: LOGIN, LOGIN_FAILED,
 * USER_CREATED, USER_UPDATED, USER_DELETED, USER_ACTIVATED,
 * USER_DEACTIVATED, CATALOG_CREATED, CATALOG_UPDATED, CATALOG_DELETED, etc.
 * Cada controller define su propio set en su llamada al servicio.</p>
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AuditService {

    private final AuditEventoDao auditEventoDao;

    public void registrar(UUID usuarioId, String accion, String recurso, UUID recursoId) {
        registrar(usuarioId, accion, recurso, recursoId, null, true);
    }

    public void registrar(UUID usuarioId, String accion, String recurso, UUID recursoId,
            String metadata, boolean exitoso) {
        try {
            auditEventoDao.registrar(usuarioId, accion, recurso, recursoId, metadata, exitoso);
        } catch (AccesoDatosException exception) {
            // Fire-and-forget: el insert fallo (ej. tabla no creada en dev),
            // logueamos pero no rompemos la operacion de negocio.
            log.warn(
                    "No se pudo registrar evento de auditoria (usuario={}, accion={}, recurso={}): {}",
                    usuarioId, accion, recurso, exception.getMessage());
        }
    }

    /**
     * Helper para eventos de fallo donde no conocemos el usuario todavia
     * (ej. intento de login con email inexistente).
     */
    public void registrarAnonimo(String accion, String recurso, String metadata) {
        registrar(null, accion, recurso, null, metadata, false);
    }
}
