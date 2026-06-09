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
import com.integrador.sistemaincidencias.shared.exception.RecursoNoEncontradoException;
import com.integrador.sistemaincidencias.shared.exception.ReglaNegocioException;
import com.integrador.sistemaincidencias.shared.pagination.PageRequest;
import com.integrador.sistemaincidencias.shared.pagination.PageResult;
import com.integrador.sistemaincidencias.shared.storage.ArchivoAlmacenado;
import com.integrador.sistemaincidencias.shared.storage.ArchivoStorageService;
import com.integrador.sistemaincidencias.usuarios.model.Usuario;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
@RequiredArgsConstructor
public class IncidenciaService {

    private static final String ESTADO_APROBACION_SOLICITADA = "SOLICITADA";
    private static final String ESTADO_APROBACION_APROBADA = "APROBADA";
    private static final String ESTADO_APROBACION_RECHAZADA = "RECHAZADA";
    private static final String ESTADO_PROCESO_PENDIENTE = "PENDIENTE";

    private final IncidenciaDao incidenciaDao;
    private final ComentarioDao comentarioDao;
    private final AdjuntoDao adjuntoDao;
    private final AprobacionDao aprobacionDao;
    private final HistorialIncidenciaDao historialDao;
    private final EstadoAprobacionDao estadoAprobacionDao;
    private final EstadoProcesoDao estadoProcesoDao;
    private final AuthService authService;
    private final ArchivoStorageService archivoStorageService;

    public PageResult<IncidenciaResponse> listar(IncidenciaFiltro filtro, PageRequest pageRequest) {
        PageResult<Incidencia> page = incidenciaDao.listar(filtro, pageRequest);
        return PageResult.<IncidenciaResponse>builder()
                .contenido(page.getContenido().stream().map(this::toResponse).toList())
                .total(page.getTotal())
                .page(page.getPage())
                .size(page.getSize())
                .build();
    }

    public IncidenciaDetalleResponse obtenerDetalle(UUID id) {
        Incidencia incidencia = buscar(id);
        return IncidenciaDetalleResponse.builder()
                .incidencia(toResponse(incidencia))
                .comentarios(comentarioDao.listarPorIncidencia(id).stream().map(this::toResponse).toList())
                .adjuntos(adjuntoDao.listarPorIncidencia(id).stream().map(this::toResponse).toList())
                .historial(historialDao.listarPorIncidencia(id).stream().map(this::toResponse).toList())
                .build();
    }

    public IncidenciaResponse crear(CrearIncidenciaRequest request, String authorizationHeader) {
        Usuario usuario = authService.obtenerUsuarioActual(authorizationHeader);
        Incidencia creada = crearIncidencia(request, usuario);
        return toResponse(creada);
    }

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
        return creada;
    }

    public IncidenciaResponse actualizar(UUID id, ActualizarIncidenciaRequest request, String authorizationHeader) {
        Usuario usuario = authService.obtenerUsuarioActual(authorizationHeader);
        Incidencia actualizada = actualizarIncidencia(id, request, usuario);
        return toResponse(actualizada);
    }

    public IncidenciaResponse actualizarConArchivos(UUID id, ActualizarIncidenciaRequest request, String authorizationHeader) {
        Usuario usuario = authService.obtenerUsuarioActual(authorizationHeader);
        Incidencia actualizada = actualizarIncidencia(id, request, usuario);
        registrarAdjuntosDesdeArchivos(id, usuario.getId(), request.getArchivos());
        return toResponse(actualizada);
    }

    private Incidencia actualizarIncidencia(UUID id, ActualizarIncidenciaRequest request, Usuario usuario) {
        Incidencia incidencia = buscar(id);
        incidencia.setTitulo(request.getTitulo().trim());
        incidencia.setDescripcion(request.getDescripcion().trim());
        incidencia.setCategoriaId(request.getCategoriaId());
        incidencia.setPrioridad(request.getPrioridad());
        incidencia.setAsignadoA(request.getAsignadoA());

        Incidencia actualizada = incidenciaDao.actualizar(incidencia);
        registrarHistorial(id, usuario.getId(), "ACTUALIZADA", null, actualizada.getEstadoProcesoId(), "Incidencia actualizada");
        return actualizada;
    }

    public IncidenciaResponse cambiarEstado(UUID id, CambiarEstadoRequest request, String authorizationHeader) {
        Usuario usuario = authService.obtenerUsuarioActual(authorizationHeader);
        Incidencia incidencia = buscar(id);
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
        return toResponse(actualizada);
    }

    public IncidenciaResponse aprobar(UUID id, String authorizationHeader) {
        Usuario usuario = authService.obtenerUsuarioActual(authorizationHeader);
        Incidencia incidencia = buscar(id);
        EstadoAprobacion aprobada = obtenerEstadoAprobacion(ESTADO_APROBACION_APROBADA);
        Incidencia actualizada = incidenciaDao.cambiarAprobacion(id, aprobada.getId());
        aprobacionDao.insertar(Aprobacion.builder()
                .id(UUID.randomUUID())
                .incidenciaId(id)
                .revisadoPor(usuario.getId())
                .estadoAprobacionId(aprobada.getId())
                .build());
        registrarHistorial(id, usuario.getId(), "APROBADA", null, incidencia.getEstadoProcesoId(), "Incidencia aprobada");
        return toResponse(actualizada);
    }

    public IncidenciaResponse rechazar(UUID id, AprobacionRequest request, String authorizationHeader) {
        Usuario usuario = authService.obtenerUsuarioActual(authorizationHeader);
        Incidencia incidencia = buscar(id);
        EstadoAprobacion rechazada = obtenerEstadoAprobacion(ESTADO_APROBACION_RECHAZADA);
        Incidencia actualizada = incidenciaDao.cambiarAprobacion(id, rechazada.getId());
        aprobacionDao.insertar(Aprobacion.builder()
                .id(UUID.randomUUID())
                .incidenciaId(id)
                .revisadoPor(usuario.getId())
                .estadoAprobacionId(rechazada.getId())
                .motivoRechazo(request == null ? null : request.getMotivoRechazo())
                .build());
        registrarHistorial(id, usuario.getId(), "RECHAZADA", null, incidencia.getEstadoProcesoId(),
                request == null ? "Incidencia rechazada" : request.getMotivoRechazo());
        return toResponse(actualizada);
    }

    public ComentarioResponse agregarComentario(UUID incidenciaId, CrearComentarioRequest request, String authorizationHeader) {
        Usuario usuario = authService.obtenerUsuarioActual(authorizationHeader);
        buscar(incidenciaId);
        Comentario comentario = Comentario.builder()
                .id(UUID.randomUUID())
                .incidenciaId(incidenciaId)
                .autorId(usuario.getId())
                .contenido(request.getContenido().trim())
                .build();
        Comentario creado = comentarioDao.insertar(comentario);
        registrarHistorial(incidenciaId, usuario.getId(), "COMENTARIO_AGREGADO", null, null, "Comentario agregado");
        return toResponse(creado);
    }

    public AdjuntoResponse agregarAdjunto(UUID incidenciaId, CrearAdjuntoRequest request, String authorizationHeader) {
        Usuario usuario = authService.obtenerUsuarioActual(authorizationHeader);
        buscar(incidenciaId);
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
        buscar(incidenciaId);
        return registrarAdjuntosDesdeArchivos(incidenciaId, usuario.getId(), archivos).stream()
                .map(this::toResponse)
                .toList();
    }

    public void eliminar(UUID id, String authorizationHeader) {
        Usuario usuario = authService.obtenerUsuarioActual(authorizationHeader);
        buscar(id);
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
