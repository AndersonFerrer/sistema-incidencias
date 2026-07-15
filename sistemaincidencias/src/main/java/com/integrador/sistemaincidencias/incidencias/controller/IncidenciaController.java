package com.integrador.sistemaincidencias.incidencias.controller;

import com.integrador.sistemaincidencias.incidencias.dto.ActualizarIncidenciaRequest;
import com.integrador.sistemaincidencias.incidencias.dto.AdjuntoResponse;
import com.integrador.sistemaincidencias.incidencias.dto.AprobacionRequest;
import com.integrador.sistemaincidencias.incidencias.dto.CambiarEstadoRequest;
import com.integrador.sistemaincidencias.incidencias.dto.ComentarioResponse;
import com.integrador.sistemaincidencias.incidencias.dto.CrearAdjuntoRequest;
import com.integrador.sistemaincidencias.incidencias.dto.CrearComentarioRequest;
import com.integrador.sistemaincidencias.incidencias.dto.CrearIncidenciaRequest;
import com.integrador.sistemaincidencias.incidencias.dto.IncidenciaDetalleResponse;
import com.integrador.sistemaincidencias.incidencias.dto.IncidenciaFiltro;
import com.integrador.sistemaincidencias.incidencias.dto.IncidenciaResponse;
import com.integrador.sistemaincidencias.incidencias.model.Prioridad;
import com.integrador.sistemaincidencias.incidencias.service.IncidenciaService;
import com.integrador.sistemaincidencias.shared.pagination.PageRequest;
import com.integrador.sistemaincidencias.shared.pagination.PageResult;
import com.integrador.sistemaincidencias.usuarios.model.Usuario;
import com.integrador.sistemaincidencias.auth.service.AuthService;
import jakarta.validation.Valid;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/incidencias")
@RequiredArgsConstructor
public class IncidenciaController {

    private final IncidenciaService incidenciaService;
    private final AuthService authService;

    @GetMapping
    public ResponseEntity<PageResult<IncidenciaResponse>> listar(
            @RequestHeader("Authorization") String token,
            @RequestParam(required = false) String texto,
            @RequestParam(required = false) UUID clienteId,
            @RequestParam(required = false) UUID estadoProcesoId,
            @RequestParam(required = false) UUID estadoAprobacionId,
            @RequestParam(required = false) UUID categoriaId,
            @RequestParam(required = false) UUID asignadoA,
            @RequestParam(required = false) Prioridad prioridad,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate desde,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate hasta,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size
    ) {
        IncidenciaFiltro filtro = IncidenciaFiltro.builder()
                .texto(texto)
                .clienteId(clienteId)
                .estadoProcesoId(estadoProcesoId)
                .estadoAprobacionId(estadoAprobacionId)
                .categoriaId(categoriaId)
                .asignadoA(asignadoA)
                .prioridad(prioridad)
                .desde(desde)
                .hasta(hasta)
                .build();
        Usuario actual = authService.obtenerUsuarioActual(token);
        if (!actual.getRol().esAdministrador()) {
            if (actual.getRol().esAgente()) {
                filtro.setAsignadoA(actual.getId());
            } else {
                filtro.setCreadoPorUsuarioId(actual.getId());
            }
        }
        return ResponseEntity.ok(incidenciaService.listar(filtro, PageRequest.of(page, size)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<IncidenciaDetalleResponse> obtener(@PathVariable UUID id) {
        return ResponseEntity.ok(incidenciaService.obtenerDetalle(id));
    }

    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<IncidenciaResponse> crear(
            @RequestHeader("Authorization") String token,
            @Valid @RequestBody CrearIncidenciaRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED).body(incidenciaService.crear(request, token));
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<IncidenciaResponse> crearConArchivos(
            @RequestHeader("Authorization") String token,
            @Valid @ModelAttribute CrearIncidenciaRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED).body(incidenciaService.crearConArchivos(request, token));
    }

    @PutMapping(value = "/{id}", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<IncidenciaResponse> actualizar(
            @PathVariable UUID id,
            @RequestHeader("Authorization") String token,
            @Valid @RequestBody ActualizarIncidenciaRequest request
    ) {
        return ResponseEntity.ok(incidenciaService.actualizar(id, request, token));
    }

    @PutMapping(value = "/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<IncidenciaResponse> actualizarConArchivos(
            @PathVariable UUID id,
            @RequestHeader("Authorization") String token,
            @Valid @ModelAttribute ActualizarIncidenciaRequest request
    ) {
        return ResponseEntity.ok(incidenciaService.actualizarConArchivos(id, request, token));
    }

    @PatchMapping("/{id}/estado")
    public ResponseEntity<IncidenciaResponse> cambiarEstado(
            @PathVariable UUID id,
            @RequestHeader("Authorization") String token,
            @Valid @RequestBody CambiarEstadoRequest request
    ) {
        return ResponseEntity.ok(incidenciaService.cambiarEstado(id, request, token));
    }

    @PatchMapping("/{id}/aprobacion")
    public ResponseEntity<IncidenciaResponse> aprobar(
            @PathVariable UUID id,
            @RequestHeader("Authorization") String token,
            @RequestParam(defaultValue = "aprobar") String accion,
            @RequestBody(required = false) AprobacionRequest request
    ) {
        if ("rechazar".equalsIgnoreCase(accion)) {
            return ResponseEntity.ok(incidenciaService.rechazar(id, request, token));
        }
        return ResponseEntity.ok(incidenciaService.aprobar(id, token));
    }

    @PostMapping("/{id}/comentarios")
    public ResponseEntity<ComentarioResponse> agregarComentario(
            @PathVariable UUID id,
            @RequestHeader("Authorization") String token,
            @Valid @RequestBody CrearComentarioRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED).body(incidenciaService.agregarComentario(id, request, token));
    }

    @PostMapping(value = "/{id}/adjuntos", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<AdjuntoResponse> agregarAdjunto(
            @PathVariable UUID id,
            @RequestHeader("Authorization") String token,
            @Valid @RequestBody CrearAdjuntoRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED).body(incidenciaService.agregarAdjunto(id, request, token));
    }

    @PostMapping(value = "/{id}/adjuntos", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<List<AdjuntoResponse>> subirAdjuntos(
            @PathVariable UUID id,
            @RequestHeader("Authorization") String token,
            @RequestParam(required = false) List<MultipartFile> archivos
    ) {
        return ResponseEntity.status(HttpStatus.CREATED).body(incidenciaService.agregarAdjuntos(id, archivos, token));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminar(
            @PathVariable UUID id,
            @RequestHeader("Authorization") String token
    ) {
        incidenciaService.eliminar(id, token);
        return ResponseEntity.noContent().build();
    }
}
