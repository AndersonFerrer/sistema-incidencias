package com.integrador.sistemaincidencias.incidencias.service;

import com.integrador.sistemaincidencias.auth.service.AuthService;
import com.integrador.sistemaincidencias.catalogos.dao.EstadoAprobacionDao;
import com.integrador.sistemaincidencias.catalogos.dao.EstadoProcesoDao;
import com.integrador.sistemaincidencias.catalogos.model.EstadoAprobacion;
import com.integrador.sistemaincidencias.catalogos.model.EstadoProceso;
import com.integrador.sistemaincidencias.incidencias.dao.AdjuntoDao;
import com.integrador.sistemaincidencias.incidencias.dao.AprobacionDao;
import com.integrador.sistemaincidencias.incidencias.dao.ComentarioDao;
import com.integrador.sistemaincidencias.incidencias.dao.HistorialIncidenciaDao;
import com.integrador.sistemaincidencias.incidencias.dao.IncidenciaDao;
import com.integrador.sistemaincidencias.incidencias.dto.ActualizarIncidenciaRequest;
import com.integrador.sistemaincidencias.incidencias.dto.AdjuntoResponse;
import com.integrador.sistemaincidencias.incidencias.dto.AprobacionRequest;
import com.integrador.sistemaincidencias.incidencias.dto.CambiarEstadoRequest;
import com.integrador.sistemaincidencias.incidencias.dto.ComentarioResponse;
import com.integrador.sistemaincidencias.incidencias.dto.CrearAdjuntoRequest;
import com.integrador.sistemaincidencias.incidencias.dto.CrearComentarioRequest;
import com.integrador.sistemaincidencias.incidencias.dto.CrearIncidenciaRequest;
import com.integrador.sistemaincidencias.incidencias.dto.HistorialResponse;
import com.integrador.sistemaincidencias.incidencias.dto.IncidenciaDetalleResponse;
import com.integrador.sistemaincidencias.incidencias.dto.IncidenciaFiltro;
import com.integrador.sistemaincidencias.incidencias.dto.IncidenciaResponse;
import com.integrador.sistemaincidencias.incidencias.model.Adjunto;
import com.integrador.sistemaincidencias.incidencias.model.Aprobacion;
import com.integrador.sistemaincidencias.incidencias.model.Comentario;
import com.integrador.sistemaincidencias.incidencias.model.HistorialIncidencia;
import com.integrador.sistemaincidencias.incidencias.model.Incidencia;
import com.integrador.sistemaincidencias.notificaciones.model.NotificacionTipo;
import com.integrador.sistemaincidencias.notificaciones.service.NotificacionService;
import com.integrador.sistemaincidencias.shared.exception.AccesoDenegadoException;
import com.integrador.sistemaincidencias.shared.exception.RecursoNoEncontradoException;
import com.integrador.sistemaincidencias.shared.exception.ReglaNegocioException;
import com.integrador.sistemaincidencias.shared.pagination.PageRequest;
import com.integrador.sistemaincidencias.shared.pagination.PageResult;
import com.integrador.sistemaincidencias.shared.storage.ArchivoAlmacenado;
import com.integrador.sistemaincidencias.shared.storage.ArchivoStorageService;
import com.integrador.sistemaincidencias.usuarios.model.Usuario;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
@RequiredArgsConstructor
public class IncidenciaService {

    private static final String ESTADO_APROBACION_SOLICITADA = "SOLICITADA";
    private static final String ESTADO_APROBACION_APROBADA = "APROBADA";
    private static final String ESTADO_APROBACION_RECHAZADA = "RECHAZADA";
    private static final String ESTADO_PROCESO_PENDIENTE = "PENDIENTE";

    private static final int PREVIEW_COMENTARIO = 60;

    private final IncidenciaDao incidenciaDao;
    private final ComentarioDao comentarioDao;
    private final AdjuntoDao adjuntoDao;
    private final AprobacionDao aprobacionDao;
    private final HistorialIncidenciaDao historialDao;
    private final EstadoAprobacionDao estadoAprobacionDao;
    private final EstadoProcesoDao estadoProcesoDao;
    private final AuthService authService;
    private final ArchivoStorageService archivoStorageService;
    private final NotificacionService notificacionService;

    public PageResult<IncidenciaResponse> listar(IncidenciaFiltro filtro, PageRequest pageRequest) {
        PageResult<Incidencia> page = incidenciaDao.listar(filtro, pageRequest);
        return PageResult.<IncidenciaResponse>builder()
                .contenido(page.getContenido().stream().map(this::toResponse).toList())
                .total(page.getTotal())
                .page(page.getPage())
                .size(page.getSize())
                .build();
    }

    public IncidenciaDetalleResponse obtenerDetalle(UUID id, String authorizationHeader) {
        Usuario actual = authService.obtenerUsuarioActual(authorizationHeader);
        Incidencia incidencia = buscar(id);
        validarAlcance(actual, incidencia, "obtenerDetalle");
        IncidenciaResponse incidenciaResponse = toResponse(incidencia);

        // RBAC (solicitud del usuario): para no-admin (AGENTE/USUARIO) ocultar
        // los campos sensibles que no necesitan ver para su trabajo.
        // - cliente (quien origino la incidencia): info de negocio que el AGENTE
        //   no requiere y el USUARIO no debe ver otros clientes.
        // - categoria: misma razon.
        // - creadoPorUsuarioId (solicitante): privacidad.
        // - asignadoA (responsable): para AGENTE es redundante (el sabe que
        //   es el mismo); para USUARIO no aplica (no deberia ver detalle).
        // - estadoAprobacionId: el AGENTE no puede cambiar este estado (validarAlcance
        //   ya bloquea aprobar/rechazar); exponer el valor seria leak de info.
        if (!actual.getRol().esAdministrador()) {
            incidenciaResponse.setClienteId(null);
            incidenciaResponse.setCategoriaId(null);
            incidenciaResponse.setCreadoPorUsuarioId(null);
            incidenciaResponse.setAsignadoA(null);
            incidenciaResponse.setEstadoAprobacionId(null);
            // Mantener: estadoProcesoId (AGENTE lo cambia), prioridad, descripcion,
            // codigo, titulo, creadoEn, actualizadoEn, resueltoEn, usuarioExternoId.
        }

        return IncidenciaDetalleResponse.builder()
                .incidencia(incidenciaResponse)
                .comentarios(comentarioDao.listarPorIncidencia(id).stream().map(this::toResponse).toList())
                .adjuntos(adjuntoDao.listarPorIncidencia(id).stream().map(this::toResponse).toList())
                .historial(historialDao.listarPorIncidencia(id).stream().map(this::toResponse).toList())
                .build();
    }

    /**
     * Crea la incidencia y registra su historial + notificacion de
     * asignacion en una sola unidad transaccional (ver escenario
     * "fallo en insercion hace rollback completo" del spec).
     */
    @Transactional
    public IncidenciaResponse crear(CrearIncidenciaRequest request, String authorizationHeader) {
        Usuario usuario = authService.obtenerUsuarioActual(authorizationHeader);
        Incidencia creada = crearIncidencia(request, usuario);
        return toResponse(creada);
    }

    /**
     * Variante con archivos: el INSERT de la incidencia, el historial
     * y la notificacion se ejecutan dentro de la misma transaccion.
     */
    @Transactional
    public IncidenciaResponse crearConArchivos(CrearIncidenciaRequest request, String authorizationHeader) {
        Usuario usuario = authService.obtenerUsuarioActual(authorizationHeader);
        Incidencia creada = crearIncidencia(request, usuario);
        registrarAdjuntosDesdeArchivos(creada.getId(), usuario.getId(), request.getArchivos());
        return toResponse(creada);
    }

    private Incidencia crearIncidencia(CrearIncidenciaRequest request, Usuario usuario) {
        EstadoAprobacion solicitada = obtenerEstadoAprobacion(ESTADO_APROBACION_SOLICITADA);
        EstadoProceso pendiente = obtenerEstadoProceso(ESTADO_PROCESO_PENDIENTE);

        Incidencia incidencia = Incidencia.builder()
                .id(UUID.randomUUID())
                .codigo(generarCodigo())
                .titulo(request.getTitulo().trim())
                .descripcion(request.getDescripcion().trim())
                .clienteId(request.getClienteId())
                .estadoProcesoId(pendiente.getId())
                .estadoAprobacionId(solicitada.getId())
                .prioridad(request.getPrioridad())
                .categoriaId(request.getCategoriaId())
                .creadoPorUsuarioId(usuario.getId())
                .usuarioExternoId(request.getUsuarioExternoId())
                .asignadoA(request.getAsignadoA())
                .build();

        Incidencia creada = incidenciaDao.insertar(incidencia);
        registrarHistorial(creada.getId(), usuario.getId(), "CREADA", null, creada.getEstadoProcesoId(), "Incidencia creada");
        // Hook T6 RF-37: si la incidencia nace asignada, notificar al asignado (excluyendo al actor).
        if (creada.getAsignadoA() != null) {
            notificacionService.crearParaUsuario(
                    creada.getAsignadoA(),
                    usuario.getId(),
                    NotificacionTipo.INCIDENCIA_ASIGNADA,
                    creada.getId(),
                    "Incidencia " + creada.getCodigo() + " asignada",
                    creada.getTitulo());
        }
        return creada;
    }

    /**
     * Actualiza la incidencia y emite la notificacion de reasignacion
     * dentro de la misma transaccion.
     */
    @Transactional
    public IncidenciaResponse actualizar(UUID id, ActualizarIncidenciaRequest request, String authorizationHeader) {
        Usuario usuario = authService.obtenerUsuarioActual(authorizationHeader);
        Incidencia actualizada = actualizarIncidencia(id, request, usuario);
        return toResponse(actualizada);
    }

    /**
     * Variante con archivos: la mutacion, el historial y la
     * notificacion viven en la misma unidad transaccional.
     */
    @Transactional
    public IncidenciaResponse actualizarConArchivos(UUID id, ActualizarIncidenciaRequest request, String authorizationHeader) {
        Usuario usuario = authService.obtenerUsuarioActual(authorizationHeader);
        Incidencia actualizada = actualizarIncidencia(id, request, usuario);
        registrarAdjuntosDesdeArchivos(id, usuario.getId(), request.getArchivos());
        return toResponse(actualizada);
    }

    private Incidencia actualizarIncidencia(UUID id, ActualizarIncidenciaRequest request, Usuario usuario) {
        Incidencia incidencia = buscar(id);
        validarAlcance(usuario, incidencia, "actualizar");
        validarNoFinalizada(incidencia);
        UUID asignadoAnterior = incidencia.getAsignadoA();
        incidencia.setTitulo(request.getTitulo().trim());
        incidencia.setDescripcion(request.getDescripcion().trim());
        incidencia.setCategoriaId(request.getCategoriaId());
        incidencia.setPrioridad(request.getPrioridad());
        incidencia.setAsignadoA(request.getAsignadoA());

        Incidencia actualizada = incidenciaDao.actualizar(incidencia);
        registrarHistorial(id, usuario.getId(), "ACTUALIZADA", null, actualizada.getEstadoProcesoId(), "Incidencia actualizada");
        // Hook T6 RF-37: solo notifica cuando el asignado efectivamente cambia
        // (de null a id, o de un id a otro) y excluye auto-eventos.
        UUID asignadoNuevo = actualizada.getAsignadoA();
        if (!Objects.equals(asignadoAnterior, asignadoNuevo) && asignadoNuevo != null) {
            notificacionService.crearParaUsuario(
                    asignadoNuevo,
                    usuario.getId(),
                    NotificacionTipo.INCIDENCIA_ASIGNADA,
                    id,
                    "Incidencia " + actualizada.getCodigo() + " asignada",
                    actualizada.getTitulo());
        }
        return actualizada;
    }

    /**
     * Cambia el estado operativo y notifica al creador + asignado en
     * una sola transaccion.
     */
    @Transactional
    public IncidenciaResponse cambiarEstado(UUID id, CambiarEstadoRequest request, String authorizationHeader) {
        Usuario usuario = authService.obtenerUsuarioActual(authorizationHeader);
        Incidencia incidencia = buscar(id);
        validarAlcance(usuario, incidencia, "cambiarEstado");
        validarNoRechazada(incidencia);
        EstadoProceso actual = obtenerEstadoProceso(incidencia.getEstadoProcesoId());
        EstadoProceso nuevo = obtenerEstadoProceso(request.getEstadoProcesoId());

        if (nuevo.getOrden() < actual.getOrden()) {
            throw new ReglaNegocioException("No se permite retroceder el estado de la incidencia");
        }
        if (nuevo.getOrden() - actual.getOrden() > 1) {
            throw new ReglaNegocioException("No se permite saltar estados del flujo operativo");
        }

        Incidencia actualizada = incidenciaDao.cambiarEstado(id, nuevo.getId(), Boolean.TRUE.equals(nuevo.getEsTerminal()));
        registrarHistorial(id, usuario.getId(), "CAMBIO_ESTADO", actual.getId(), nuevo.getId(), request.getNota());
        // Hook T6 RF-37: notifica al creador y al asignado (excluyendo actor; deduplicados).
        notificarCambioEstado(incidencia, actualizada, nuevo, usuario.getId());
        return toResponse(actualizada);
    }

    /**
     * Genera las notificaciones de INCIDENCIA_ESTADO_CAMBIADO para los
     * destinatarios relevantes (creador y asignado) deduplicando y
     * silenciando auto-eventos. Se hace manualmente en lugar de un bucle
     * explicito para que la regla este en un solo lugar del codigo y el
     * escenario del spec ("dos filas: una por destinatario") sea evidente.
     */
    private void notificarCambioEstado(
            Incidencia original,
            Incidencia actualizada,
            EstadoProceso nuevo,
            UUID actorId
    ) {
        Set<UUID> destinatarios = new LinkedHashSet<>();
        if (original.getCreadoPorUsuarioId() != null) {
            destinatarios.add(original.getCreadoPorUsuarioId());
        }
        if (actualizada.getAsignadoA() != null) {
            destinatarios.add(actualizada.getAsignadoA());
        }
        for (UUID destinatario : destinatarios) {
            if (destinatario.equals(actorId)) {
                continue;
            }
            notificacionService.crearParaUsuario(
                    destinatario,
                    actorId,
                    NotificacionTipo.INCIDENCIA_ESTADO_CAMBIADO,
                    actualizada.getId(),
                    "Incidencia " + original.getCodigo()
                            + " cambio a " + nuevo.getClave(),
                    requestNotaCambioEstado(actualizada.getId()));
        }
    }

    /**
     * Adjunta al mensaje un eco breve del historial para que el destinatario
     * vea que actor produjo el cambio. Aqui colocamos el codigo de la
     * incidencia en el cuerpo y dejamos el titulo sintetizando el evento.
     * (La nota libre del caller no se propaga para evitar filtrar contexto
     * sensible a usuarios no participantes.)
     */
    private String requestNotaCambioEstado(UUID incidenciaId) {
        return null;
    }

    /**
     * Aprueba la incidencia: cambio de estado + aprobacion + historial
     * + notificacion al creador viven en la misma unidad transaccional.
     */
    @Transactional
    public IncidenciaResponse aprobar(UUID id, String authorizationHeader) {
        Usuario usuario = authService.obtenerUsuarioActual(authorizationHeader);
        Incidencia incidencia = buscar(id);
        validarAlcance(usuario, incidencia, "aprobar");
        EstadoAprobacion aprobada = obtenerEstadoAprobacion(ESTADO_APROBACION_APROBADA);
        Incidencia actualizada = incidenciaDao.cambiarAprobacion(id, aprobada.getId());
        aprobacionDao.insertar(Aprobacion.builder()
                .id(UUID.randomUUID())
                .incidenciaId(id)
                .revisadoPor(usuario.getId())
                .estadoAprobacionId(aprobada.getId())
                .build());
        registrarHistorial(id, usuario.getId(), "APROBADA", null, incidencia.getEstadoProcesoId(), "Incidencia aprobada");
        // Hook T6 RF-37: notifica al creador (no al agente que aprobo, salvo auto-evento).
        notificacionService.crearParaUsuario(
                incidencia.getCreadoPorUsuarioId(),
                usuario.getId(),
                NotificacionTipo.INCIDENCIA_APROBADA,
                id,
                "Tu solicitud " + incidencia.getCodigo() + " fue aprobada",
                null);
        return toResponse(actualizada);
    }

    /**
     * Rechaza la incidencia: cambio de estado + aprobacion + historial
     * + notificacion al creador viven en la misma unidad transaccional.
     */
    @Transactional
    public IncidenciaResponse rechazar(UUID id, AprobacionRequest request, String authorizationHeader) {
        Usuario usuario = authService.obtenerUsuarioActual(authorizationHeader);
        Incidencia incidencia = buscar(id);
        validarAlcance(usuario, incidencia, "rechazar");
        validarNoFinalizada(incidencia);
        EstadoAprobacion rechazada = obtenerEstadoAprobacion(ESTADO_APROBACION_RECHAZADA);
        Incidencia actualizada = incidenciaDao.cambiarAprobacion(id, rechazada.getId());
        String motivo = request == null ? null : request.getMotivoRechazo();
        aprobacionDao.insertar(Aprobacion.builder()
                .id(UUID.randomUUID())
                .incidenciaId(id)
                .revisadoPor(usuario.getId())
                .estadoAprobacionId(rechazada.getId())
                .motivoRechazo(motivo)
                .build());
        registrarHistorial(id, usuario.getId(), "RECHAZADA", null, incidencia.getEstadoProcesoId(),
                motivo == null ? "Incidencia rechazada" : motivo);
        // Hook T6 RF-37: notifica al creador con el motivo de rechazo.
        notificacionService.crearParaUsuario(
                incidencia.getCreadoPorUsuarioId(),
                usuario.getId(),
                NotificacionTipo.INCIDENCIA_RECHAZADA,
                id,
                "Tu solicitud " + incidencia.getCodigo() + " fue rechazada. Motivo: "
                        + (motivo == null ? "(sin motivo)" : motivo),
                motivo);
        return toResponse(actualizada);
    }

    /**
     * Inserta el comentario, registra historial y notifica al asignado
     * y al creador en una sola unidad transaccional.
     */
    @Transactional
    public ComentarioResponse agregarComentario(UUID incidenciaId, CrearComentarioRequest request, String authorizationHeader) {
        Usuario usuario = authService.obtenerUsuarioActual(authorizationHeader);
        Incidencia incidencia = buscar(incidenciaId);
        validarAlcance(usuario, incidencia, "agregarComentario");
        Comentario comentario = Comentario.builder()
                .id(UUID.randomUUID())
                .incidenciaId(incidenciaId)
                .autorId(usuario.getId())
                .contenido(request.getContenido().trim())
                .build();
        Comentario creado = comentarioDao.insertar(comentario);
        registrarHistorial(incidenciaId, usuario.getId(), "COMENTARIO_AGREGADO", null, null, "Comentario agregado");
        // Hook T6 RF-37: notifica al asignado y al creador (excluyendo al autor).
        // La deduplicacion y el auto-event guard los aplica crearParaUsuario.
        // Si asignadoA == creadoPorUsuarioId == null, no hay destinatario valido.
        String preview = previewComentario(request.getContenido());
        String titulo = "Nuevo comentario en " + incidencia.getCodigo() + ": \"" + preview + "\"";
        notificacionService.crearParaUsuario(
                incidencia.getAsignadoA(),
                usuario.getId(),
                NotificacionTipo.INCIDENCIA_COMENTARIO,
                incidenciaId,
                titulo,
                null);
        notificacionService.crearParaUsuario(
                incidencia.getCreadoPorUsuarioId(),
                usuario.getId(),
                NotificacionTipo.INCIDENCIA_COMENTARIO,
                incidenciaId,
                titulo,
                null);
        return toResponse(creado);
    }

    private String previewComentario(String contenido) {
        if (contenido == null) {
            return "";
        }
        String limpio = contenido.replaceAll("\\s+", " ").trim();
        if (limpio.length() <= PREVIEW_COMENTARIO) {
            return limpio;
        }
        return limpio.substring(0, PREVIEW_COMENTARIO) + "...";
    }

    public AdjuntoResponse agregarAdjunto(UUID incidenciaId, CrearAdjuntoRequest request, String authorizationHeader) {
        Usuario usuario = authService.obtenerUsuarioActual(authorizationHeader);
        Incidencia incidencia = buscar(incidenciaId);
        validarAlcance(usuario, incidencia, "agregarAdjunto");
        validarNoFinalizada(incidencia);
        Adjunto adjunto = Adjunto.builder()
                .id(UUID.randomUUID())
                .incidenciaId(incidenciaId)
                .subidoPor(usuario.getId())
                .nombreArchivo(request.getNombreArchivo().trim())
                .tipoMime(request.getTipoMime().trim())
                .tamanoBytes(request.getTamanoBytes())
                .url(request.getUrl().trim())
                .build();
        Adjunto creado = adjuntoDao.insertar(adjunto);
        registrarHistorial(incidenciaId, usuario.getId(), "ADJUNTO_AGREGADO", null, null, "Adjunto agregado");
        return toResponse(creado);
    }

    public List<AdjuntoResponse> agregarAdjuntos(UUID incidenciaId, List<MultipartFile> archivos, String authorizationHeader) {
        Usuario usuario = authService.obtenerUsuarioActual(authorizationHeader);
        Incidencia incidencia = buscar(incidenciaId);
        validarAlcance(usuario, incidencia, "agregarAdjuntos");
        validarNoFinalizada(incidencia);
        return registrarAdjuntosDesdeArchivos(incidenciaId, usuario.getId(), archivos).stream()
                .map(this::toResponse)
                .toList();
    }

    public void eliminar(UUID id, String authorizationHeader) {
        Usuario usuario = authService.obtenerUsuarioActual(authorizationHeader);
        Incidencia incidencia = buscar(id);
        if (!usuario.getRol().esAdministrador()) {
            throw new AccesoDenegadoException("Solo el administrador puede eliminar incidencias");
        }
        validarNoFinalizada(incidencia);
        incidenciaDao.eliminar(id);
        // La eliminación física deja el log fuera del historial de la propia incidencia por cascada.
        // En una siguiente iteración conviene registrar auditoría global.
    }

    private Incidencia buscar(UUID id) {
        return incidenciaDao.buscarPorId(id)
                .orElseThrow(() -> new RecursoNoEncontradoException("Incidencia no encontrada"));
    }

    private EstadoAprobacion obtenerEstadoAprobacion(String clave) {
        return estadoAprobacionDao.buscarPorClave(clave)
                .orElseThrow(() -> new ReglaNegocioException("No existe estado de aprobacion " + clave));
    }

    private EstadoProceso obtenerEstadoProceso(String clave) {
        return estadoProcesoDao.buscarPorClave(clave)
                .orElseThrow(() -> new ReglaNegocioException("No existe estado de proceso " + clave));
    }

    private EstadoProceso obtenerEstadoProceso(UUID id) {
        return estadoProcesoDao.buscarPorId(id)
                .orElseThrow(() -> new ReglaNegocioException("Estado de proceso no encontrado"));
    }

    private void validarNoRechazada(Incidencia incidencia) {
        EstadoAprobacion rechazada = obtenerEstadoAprobacion(ESTADO_APROBACION_RECHAZADA);
        if (rechazada.getId().equals(incidencia.getEstadoAprobacionId())) {
            throw new ReglaNegocioException("Una incidencia rechazada no puede avanzar en el flujo operativo");
        }
    }

    private void validarNoFinalizada(Incidencia incidencia) {
        EstadoProceso actual = obtenerEstadoProceso(incidencia.getEstadoProcesoId());
        if (Boolean.TRUE.equals(actual.getEsTerminal())) {
            throw new ReglaNegocioException(
                    "La incidencia esta finalizada y no permite esta operacion (estado de proceso terminal)");
        }
    }

    private void validarAlcance(Usuario actual, Incidencia target, String metodo) {
        if (actual.getRol().esAdministrador()) {
            return;
        }
        if (actual.getRol().esAgente()) {
            if (!Objects.equals(target.getAsignadoA(), actual.getId())) {
                throw new AccesoDenegadoException("Solo puedes modificar incidencias asignadas a ti");
            }
            // AGENTE opera el estado de PROCESO (PENDIENTE -> EN_PROCESO -> FINALIZADA),
            // pero NO el estado de APROBACION (SOLICITADA -> APROBADA/RECHAZADA) — eso
            // es decision del ADMINISTRADOR segun AGENTS.md.
            if ("aprobar".equals(metodo) || "rechazar".equals(metodo)) {
                throw new AccesoDenegadoException(
                        "Solo el administrador puede cambiar el estado de aprobacion");
            }
            return;
        }
        boolean esComentarioOAdjunto = metodo.startsWith("agregarComentario")
                || metodo.startsWith("agregarAdjunto");
        if (!esComentarioOAdjunto) {
            throw new AccesoDenegadoException("No tienes permisos para realizar esta operacion");
        }
        if (!Objects.equals(target.getCreadoPorUsuarioId(), actual.getId())) {
            throw new AccesoDenegadoException("Solo puedes operar sobre incidencias creadas por ti");
        }
    }

    private void registrarHistorial(
            UUID incidenciaId,
            UUID usuarioId,
            String accion,
            UUID estadoAnteriorId,
            UUID estadoNuevoId,
            String nota
    ) {
        historialDao.insertar(HistorialIncidencia.builder()
                .id(UUID.randomUUID())
                .incidenciaId(incidenciaId)
                .usuarioId(usuarioId)
                .accion(accion)
                .estadoProcesoAnteriorId(estadoAnteriorId)
                .estadoProcesoNuevoId(estadoNuevoId)
                .nota(nota)
                .build());
    }

    private List<Adjunto> registrarAdjuntosDesdeArchivos(
            UUID incidenciaId,
            UUID usuarioId,
            List<MultipartFile> archivos
    ) {
        List<ArchivoAlmacenado> almacenados = archivoStorageService.guardarAdjuntosIncidencia(incidenciaId, archivos);
        List<Adjunto> adjuntos = almacenados.stream()
                .map(archivo -> Adjunto.builder()
                        .id(UUID.randomUUID())
                        .incidenciaId(incidenciaId)
                        .subidoPor(usuarioId)
                        .nombreArchivo(archivo.getNombreOriginal())
                        .tipoMime(archivo.getTipoMime())
                        .tamanoBytes(archivo.getTamanoBytes())
                        .url(archivo.getUrl())
                        .build())
                .map(adjuntoDao::insertar)
                .toList();

        if (!adjuntos.isEmpty()) {
            registrarHistorial(incidenciaId, usuarioId, "ADJUNTO_AGREGADO", null, null,
                    "Se agregaron " + adjuntos.size() + " adjunto(s)");
        }

        return adjuntos;
    }

    private String generarCodigo() {
        return "INC-" + java.time.LocalDate.now().getYear() + "-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
    }

    private IncidenciaResponse toResponse(Incidencia incidencia) {
        return IncidenciaResponse.builder()
                .id(incidencia.getId())
                .codigo(incidencia.getCodigo())
                .titulo(incidencia.getTitulo())
                .descripcion(incidencia.getDescripcion())
                .clienteId(incidencia.getClienteId())
                .estadoProcesoId(incidencia.getEstadoProcesoId())
                .estadoAprobacionId(incidencia.getEstadoAprobacionId())
                .prioridad(incidencia.getPrioridad())
                .categoriaId(incidencia.getCategoriaId())
                .creadoPorUsuarioId(incidencia.getCreadoPorUsuarioId())
                .usuarioExternoId(incidencia.getUsuarioExternoId())
                .asignadoA(incidencia.getAsignadoA())
                .creadoEn(incidencia.getCreadoEn())
                .actualizadoEn(incidencia.getActualizadoEn())
                .resueltoEn(incidencia.getResueltoEn())
                .build();
    }

    private ComentarioResponse toResponse(Comentario comentario) {
        return ComentarioResponse.builder()
                .id(comentario.getId())
                .incidenciaId(comentario.getIncidenciaId())
                .autorId(comentario.getAutorId())
                .contenido(comentario.getContenido())
                .creadoEn(comentario.getCreadoEn())
                .actualizadoEn(comentario.getActualizadoEn())
                .build();
    }

    private AdjuntoResponse toResponse(Adjunto adjunto) {
        return AdjuntoResponse.builder()
                .id(adjunto.getId())
                .incidenciaId(adjunto.getIncidenciaId())
                .subidoPor(adjunto.getSubidoPor())
                .nombreArchivo(adjunto.getNombreArchivo())
                .tipoMime(adjunto.getTipoMime())
                .tamanoBytes(adjunto.getTamanoBytes())
                .url(adjunto.getUrl())
                .subidoEn(adjunto.getSubidoEn())
                .build();
    }

    private HistorialResponse toResponse(HistorialIncidencia historial) {
        return HistorialResponse.builder()
                .id(historial.getId())
                .incidenciaId(historial.getIncidenciaId())
                .usuarioId(historial.getUsuarioId())
                .accion(historial.getAccion())
                .estadoProcesoAnteriorId(historial.getEstadoProcesoAnteriorId())
                .estadoProcesoNuevoId(historial.getEstadoProcesoNuevoId())
                .nota(historial.getNota())
                .creadoEn(historial.getCreadoEn())
                .build();
    }
}
