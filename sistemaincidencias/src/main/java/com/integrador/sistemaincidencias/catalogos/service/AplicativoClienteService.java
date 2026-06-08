package com.integrador.sistemaincidencias.catalogos.service;

import com.integrador.sistemaincidencias.catalogos.dao.AplicativoClienteDao;
import com.integrador.sistemaincidencias.catalogos.dto.AplicativoClienteRequest;
import com.integrador.sistemaincidencias.catalogos.dto.AplicativoClienteResponse;
import com.integrador.sistemaincidencias.catalogos.model.AplicativoCliente;
import com.integrador.sistemaincidencias.shared.exception.RecursoNoEncontradoException;
import com.integrador.sistemaincidencias.shared.exception.ReglaNegocioException;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AplicativoClienteService {

    private final AplicativoClienteDao aplicativoClienteDao;

    public List<AplicativoClienteResponse> listar() {
        return aplicativoClienteDao.listar().stream().map(this::toResponse).toList();
    }

    public AplicativoClienteResponse obtener(UUID id) {
        return toResponse(buscar(id));
    }

    public AplicativoClienteResponse crear(AplicativoClienteRequest request) {
        String nombre = request.getNombre().trim();
        aplicativoClienteDao.buscarPorNombre(nombre).ifPresent(aplicativo -> {
            throw new ReglaNegocioException("Ya existe un aplicativo con ese nombre");
        });
        String apiKey = generarApiKey();
        AplicativoCliente aplicativo = AplicativoCliente.builder()
                .id(UUID.randomUUID())
                .nombre(nombre)
                .apiKey(apiKey)
                .activo(Boolean.TRUE.equals(request.getActivo()))
                .build();
        return toResponse(aplicativoClienteDao.insertar(aplicativo));
    }

    public AplicativoClienteResponse actualizar(UUID id, AplicativoClienteRequest request) {
        AplicativoCliente actual = buscar(id);
        String nombre = request.getNombre().trim();
        aplicativoClienteDao.buscarPorNombre(nombre)
                .filter(aplicativo -> !aplicativo.getId().equals(id))
                .ifPresent(aplicativo -> {
                    throw new ReglaNegocioException("Ya existe otro aplicativo con ese nombre");
                });
        actual.setNombre(nombre);
        actual.setActivo(Boolean.TRUE.equals(request.getActivo()));
        return toResponse(aplicativoClienteDao.actualizar(actual));
    }

    public AplicativoClienteResponse rotarApiKey(UUID id) {
        AplicativoCliente actual = buscar(id);
        String nuevoApiKey = generarApiKey();
        aplicativoClienteDao.rotarApiKey(id, nuevoApiKey);
        actual.setApiKey(nuevoApiKey);
        return toResponse(actual);
    }

    public void eliminar(UUID id) {
        AplicativoCliente actual = buscar(id);
        aplicativoClienteDao.eliminar(actual.getId());
    }

    private AplicativoCliente buscar(UUID id) {
        return aplicativoClienteDao.buscarPorId(id)
                .orElseThrow(() -> new RecursoNoEncontradoException("Aplicativo cliente no encontrado"));
    }

    private AplicativoClienteResponse toResponse(AplicativoCliente aplicativo) {
        return AplicativoClienteResponse.builder()
                .id(aplicativo.getId())
                .nombre(aplicativo.getNombre())
                .apiKey(aplicativo.getApiKey())
                .activo(aplicativo.getActivo())
                .build();
    }

    private String generarApiKey() {
        return UUID.randomUUID().toString().replace("-", "").substring(0, 32).toUpperCase();
    }
}
