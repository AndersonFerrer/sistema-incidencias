package com.integrador.sistemaincidencias.catalogos.service;

import com.integrador.sistemaincidencias.catalogos.dao.EstadoProcesoDao;
import com.integrador.sistemaincidencias.catalogos.dto.EstadoProcesoRequest;
import com.integrador.sistemaincidencias.catalogos.dto.EstadoProcesoResponse;
import com.integrador.sistemaincidencias.catalogos.model.EstadoProceso;
import com.integrador.sistemaincidencias.shared.exception.RecursoNoEncontradoException;
import com.integrador.sistemaincidencias.shared.exception.ReglaNegocioException;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class EstadoProcesoService {

    private final EstadoProcesoDao estadoProcesoDao;

    public List<EstadoProcesoResponse> listar() {
        return estadoProcesoDao.listar().stream().map(this::toResponse).toList();
    }

    public EstadoProcesoResponse obtener(UUID id) {
        return toResponse(buscar(id));
    }

    public EstadoProcesoResponse crear(EstadoProcesoRequest request) {
        String clave = normalizarClave(request.getClave());
        estadoProcesoDao.buscarPorClave(clave).ifPresent(estado -> {
            throw new ReglaNegocioException("Ya existe un estado de proceso con la clave indicada");
        });
        EstadoProceso estado = EstadoProceso.builder()
                .id(UUID.randomUUID())
                .clave(clave)
                .etiqueta(request.getEtiqueta().trim())
                .esTerminal(Boolean.TRUE.equals(request.getEsTerminal()))
                .orden(request.getOrden())
                .activo(Boolean.TRUE.equals(request.getActivo()))
                .build();
        return toResponse(estadoProcesoDao.insertar(estado));
    }

    public EstadoProcesoResponse actualizar(UUID id, EstadoProcesoRequest request) {
        EstadoProceso actual = buscar(id);
        String clave = normalizarClave(request.getClave());
        estadoProcesoDao.buscarPorClave(clave)
                .filter(estado -> !estado.getId().equals(id))
                .ifPresent(estado -> {
                    throw new ReglaNegocioException("Ya existe otro estado de proceso con la clave indicada");
                });
        actual.setClave(clave);
        actual.setEtiqueta(request.getEtiqueta().trim());
        actual.setEsTerminal(Boolean.TRUE.equals(request.getEsTerminal()));
        actual.setOrden(request.getOrden());
        actual.setActivo(Boolean.TRUE.equals(request.getActivo()));
        return toResponse(estadoProcesoDao.actualizar(actual));
    }

    private EstadoProceso buscar(UUID id) {
        return estadoProcesoDao.buscarPorId(id)
                .orElseThrow(() -> new RecursoNoEncontradoException("Estado de proceso no encontrado"));
    }

    private EstadoProcesoResponse toResponse(EstadoProceso estado) {
        return EstadoProcesoResponse.builder()
                .id(estado.getId())
                .clave(estado.getClave())
                .etiqueta(estado.getEtiqueta())
                .esTerminal(estado.getEsTerminal())
                .orden(estado.getOrden())
                .activo(estado.getActivo())
                .build();
    }

    private String normalizarClave(String clave) {
        return clave.trim().toUpperCase();
    }
}
