package com.integrador.sistemaincidencias.catalogos.service;

import com.integrador.sistemaincidencias.catalogos.dao.EstadoAprobacionDao;
import com.integrador.sistemaincidencias.catalogos.dto.EstadoAprobacionRequest;
import com.integrador.sistemaincidencias.catalogos.dto.EstadoAprobacionResponse;
import com.integrador.sistemaincidencias.catalogos.model.EstadoAprobacion;
import com.integrador.sistemaincidencias.shared.exception.RecursoNoEncontradoException;
import com.integrador.sistemaincidencias.shared.exception.ReglaNegocioException;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class EstadoAprobacionService {

    private final EstadoAprobacionDao estadoAprobacionDao;

    public List<EstadoAprobacionResponse> listar() {
        return estadoAprobacionDao.listar().stream().map(this::toResponse).toList();
    }

    public EstadoAprobacionResponse obtener(UUID id) {
        return toResponse(buscar(id));
    }

    public EstadoAprobacionResponse crear(EstadoAprobacionRequest request) {
        String clave = normalizarClave(request.getClave());
        estadoAprobacionDao.buscarPorClave(clave).ifPresent(estado -> {
            throw new ReglaNegocioException("Ya existe un estado de aprobación con la clave indicada");
        });
        EstadoAprobacion estado = EstadoAprobacion.builder()
                .id(UUID.randomUUID())
                .clave(clave)
                .etiqueta(request.getEtiqueta().trim())
                .activo(Boolean.TRUE.equals(request.getActivo()))
                .build();
        return toResponse(estadoAprobacionDao.insertar(estado));
    }

    public EstadoAprobacionResponse actualizar(UUID id, EstadoAprobacionRequest request) {
        EstadoAprobacion actual = buscar(id);
        String clave = normalizarClave(request.getClave());
        estadoAprobacionDao.buscarPorClave(clave)
                .filter(estado -> !estado.getId().equals(id))
                .ifPresent(estado -> {
                    throw new ReglaNegocioException("Ya existe otro estado de aprobación con la clave indicada");
                });
        actual.setClave(clave);
        actual.setEtiqueta(request.getEtiqueta().trim());
        actual.setActivo(Boolean.TRUE.equals(request.getActivo()));
        return toResponse(estadoAprobacionDao.actualizar(actual));
    }

    public void eliminar(UUID id) {
        buscar(id);
        estadoAprobacionDao.cambiarActivo(id, false);
    }

    private EstadoAprobacion buscar(UUID id) {
        return estadoAprobacionDao.buscarPorId(id)
                .orElseThrow(() -> new RecursoNoEncontradoException("Estado de aprobación no encontrado"));
    }

    private EstadoAprobacionResponse toResponse(EstadoAprobacion estado) {
        return EstadoAprobacionResponse.builder()
                .id(estado.getId())
                .clave(estado.getClave())
                .etiqueta(estado.getEtiqueta())
                .activo(estado.getActivo())
                .build();
    }

    private String normalizarClave(String clave) {
        return clave.trim().toUpperCase();
    }
}
