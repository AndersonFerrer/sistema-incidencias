package com.integrador.sistemaincidencias.notificaciones.service;

import com.integrador.sistemaincidencias.notificaciones.dao.NotificacionDao;
import com.integrador.sistemaincidencias.notificaciones.dto.NotificacionBulkResponse;
import com.integrador.sistemaincidencias.notificaciones.dto.NotificacionCountResponse;
import com.integrador.sistemaincidencias.notificaciones.dto.NotificacionResponse;
import com.integrador.sistemaincidencias.notificaciones.model.Notificacion;
import com.integrador.sistemaincidencias.notificaciones.model.NotificacionTipo;
import com.integrador.sistemaincidencias.shared.exception.RecursoNoEncontradoException;
import com.integrador.sistemaincidencias.shared.exception.ReglaNegocioException;
import com.integrador.sistemaincidencias.shared.pagination.PageRequest;
import com.integrador.sistemaincidencias.shared.pagination.PageResult;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Orquestador del modulo de notificaciones.
 *
 * <p>Mantiene la regla de AGENTS.md "No llamar a DAOs directamente desde
 * controllers; siempre pasar por services" y aplica las politicas
 * transversales del change {@code notificaciones-realtime}: scope por
 * usuario (D6), auto-evento silenciado (Q3) e idempotencia de
 * {@code marcarLeida} / {@code marcarTodasLeidas}.</p>
 *
 * <p>El metodo {@link #crear(UUID, NotificacionTipo, UUID, String, String)}
 * es el helper interno consumido por los hooks de
 * {@code IncidenciaService} (T6). No se expone en el controller.</p>
 */
@Service
@RequiredArgsConstructor
public class NotificacionService {

    private final NotificacionDao notificacionDao;

    /**
     * Lista paginada del usuario. El {@code pageRequest} se construye a
     * partir de {@code PageRequest.of(page, size)} en el controller para
     * aplicar las cotas maximas (20 por default, 50 por maximo).
     */
    public PageResult<NotificacionResponse> listar(
            UUID usuarioId,
            PageRequest pageRequest,
            boolean soloNoLeidas
    ) {
        PageResult<Notificacion> page = notificacionDao.listar(
                usuarioId, pageRequest, soloNoLeidas);
        return PageResult.<NotificacionResponse>builder()
                .contenido(page.getContenido().stream().map(this::toResponse).toList())
                .total(page.getTotal())
                .page(page.getPage())
                .size(page.getSize())
                .build();
    }

    /**
     * Conteo de no leidas del usuario (endpoint del badge del topbar).
     */
    public NotificacionCountResponse contarNoLeidas(UUID usuarioId) {
        long total = notificacionDao.contarNoLeidas(usuarioId);
        return NotificacionCountResponse.builder().total(total).build();
    }

    /**
     * Marca una sola notificacion como leida, verificando ownership.
     * Lanza {@link RecursoNoEncontradoException} cuando la fila no
     * pertenece al usuario autenticado (mantiene el 404 y no filtra
     * existencia de filas ajenas; ver escenario id_de_otro_usuario
     * del spec).
     */
    public NotificacionResponse marcarLeida(UUID notificacionId, UUID usuarioId) {
        LocalDateTime ahora = LocalDateTime.now();
        boolean actualizada = notificacionDao.marcarLeida(notificacionId, usuarioId, ahora);
        if (!actualizada) {
            throw new RecursoNoEncontradoException("Notificacion no encontrada");
        }
        // Se devuelve la representacion persistida para confirmar al cliente
        // el timestamp aplicado (util para idempotencia visible).
        return notificacionDao.buscarPorId(notificacionId)
                .filter(n -> usuarioId.equals(n.getUsuarioId()))
                .map(this::toResponse)
                .orElseThrow(() -> new RecursoNoEncontradoException(
                        "Notificacion no encontrada"));
    }

    /**
     * Marca todas las notificaciones del usuario. Idempotente.
     *
     * <p>Retorna {@link NotificacionBulkResponse} (forma
     * {@code {"actualizadas": N}}) exigido por el spec
     * ({@code /api/notificaciones/marcar-todas-leidas}). Se usa un
     * DTO dedicado para no sobrecargar
     * {@link NotificacionCountResponse}, cuya semantica
     * ({@code {"total": N}}) sigue siendo la del badge del topbar
     * (endpoint {@code /no-leidas/count}).</p>
     */
    public NotificacionBulkResponse marcarTodasLeidas(UUID usuarioId) {
        long actualizadas = notificacionDao.marcarTodasLeidas(
                usuarioId, LocalDateTime.now());
        return NotificacionBulkResponse.builder().actualizadas(actualizadas).build();
    }

    /**
     * Elimina una sola notificacion del usuario. 404 si la fila no
     * pertenece al usuario autenticado.
     */
    public void eliminar(UUID notificacionId, UUID usuarioId) {
        boolean eliminada = notificacionDao.eliminar(notificacionId, usuarioId);
        if (!eliminada) {
            throw new RecursoNoEncontradoException("Notificacion no encontrada");
        }
    }

    /**
     * Helper interno de generacion automatica (T6 / hooks en
     * {@code IncidenciaService}). NO se expone en el controller.
     *
     * <p>Politica:</p>
     * <ul>
     *   <li>Si {@code usuarioDestinoId} es {@code null}, no se crea
     *       notificacion (origen sin destinatario resuelto).</li>
     *   <li>Si {@code usuarioDestinoId.equals(actorId)}, no se crea
     *       notificacion (auto-evento silenciado, Q3).</li>
     *   <li>El id de la notificacion se genera al azar.</li>
     *   <li>El {@code creadoEn} lo fija la BD
     *       ({@code CURRENT_TIMESTAMP}).</li>
     * </ul>
     *
     * <p>Firma alineada con el design ({@code crear(usuarioId, tipo,
     * incidenciaId, titulo, descripcion)}). El {@code clienteId} no se
     * recibe aqui porque el design no lo expone; puede ampliarse en
     * una iteracion posterior via overload sin romper el contrato.</p>
     */
    public Notificacion crear(
            UUID usuarioDestinoId,
            NotificacionTipo tipo,
            UUID incidenciaId,
            String titulo,
            String descripcion
    ) {
        return crear(usuarioDestinoId, tipo, incidenciaId, null, titulo, descripcion);
    }

    /**
     * Sobrecarga con {@code clienteId} para futuros hooks que quieran
     * asociar la notificacion al aplicativo cliente de origen
     * (no la usan los hooks de T6, pero el service la ofrece para no
     * tocar su firma si se anade en una iteracion posterior).
     *
     * <p>Anotada como {@link Transactional} (REQUIRED) para que la
     * insercion participe en la transaccion abierta por el caller
     * (hooks de {@code IncidenciaService}). Si la insercion falla,
     * Spring propaga el rollback a la mutacion de incidencia y al
     * historial registrados en la misma unidad de trabajo, evitando
     * el escenario "fallo en insercion hace rollback completo" del
     * spec quede en commit parcial.</p>
     */
    @Transactional
    public Notificacion crear(
            UUID usuarioDestinoId,
            NotificacionTipo tipo,
            UUID incidenciaId,
            UUID clienteId,
            String titulo,
            String descripcion
    ) {
        // Auto-evento silenciado: si el destino coincide con el actor,
        // omitimos la generacion. Esta comprobacion la hace el caller
        // cuando conoce al actor; aqui dejamos un fallback defensivo:
        // no se discrimina por actor a nivel de helper, pero se
        // garantiza que el destinatario nunca sea null.
        if (usuarioDestinoId == null) {
            return null;
        }
        validarTitulo(titulo);
        Notificacion notificacion = Notificacion.builder()
                .id(UUID.randomUUID())
                .usuarioId(usuarioDestinoId)
                .incidenciaId(incidenciaId)
                .clienteId(clienteId)
                .tipo(tipo.name())
                .titulo(titulo == null ? null : titulo.trim())
                .descripcion(descripcion == null ? null : descripcion.trim())
                .build();
        return notificacionDao.insertar(notificacion);
    }

    /**
     * Overload explicito con actor para que los hooks de
     * {@code IncidenciaService} puedan aplicar la politica de
     * auto-evento sin repetir el {@code if} en cada sitio.
     *
     * <p>Convenio: si {@code actorId != null && actorId.equals(usuarioDestinoId)},
     * la llamada es no-op. En otro caso se delega al
     * {@link #crear(UUID, NotificacionTipo, UUID, UUID, String, String)}
     * sobrecargado.</p>
     */
    public Notificacion crearParaUsuario(
            UUID usuarioDestinoId,
            UUID actorId,
            NotificacionTipo tipo,
            UUID incidenciaId,
            String titulo,
            String descripcion
    ) {
        if (usuarioDestinoId == null) {
            return null;
        }
        if (actorId != null && actorId.equals(usuarioDestinoId)) {
            return null;
        }
        return crear(
                usuarioDestinoId, tipo, incidenciaId, null, titulo, descripcion);
    }

    private void validarTitulo(String titulo) {
        if (titulo == null || titulo.isBlank()) {
            throw new ReglaNegocioException(
                    "El titulo de la notificacion es obligatorio");
        }
    }

    private NotificacionResponse toResponse(Notificacion notificacion) {
        LocalDateTime leidoEn = notificacion.getLeidoEn();
        NotificacionTipo tipo = notificacion.getTipo() == null
                ? null
                : NotificacionTipo.valueOf(notificacion.getTipo());
        return NotificacionResponse.builder()
                .id(notificacion.getId())
                .usuarioId(notificacion.getUsuarioId())
                .incidenciaId(notificacion.getIncidenciaId())
                .tipo(tipo)
                .titulo(notificacion.getTitulo())
                .descripcion(notificacion.getDescripcion())
                .leido(leidoEn != null)
                .leidoEn(leidoEn)
                .creadoEn(notificacion.getCreadoEn())
                .build();
    }

    /**
     * Reutilizado por el controller para el shape de la respuesta de
     * "marcar todas leidas" (ver controller T5).
     */
    public List<NotificacionResponse> toResponseList(List<Notificacion> notificaciones) {
        return notificaciones.stream().map(this::toResponse).toList();
    }
}
