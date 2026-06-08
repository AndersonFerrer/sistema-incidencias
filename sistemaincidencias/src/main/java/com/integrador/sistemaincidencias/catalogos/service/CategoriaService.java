package com.integrador.sistemaincidencias.catalogos.service;

import com.integrador.sistemaincidencias.catalogos.dao.CategoriaDao;
import com.integrador.sistemaincidencias.catalogos.dto.CategoriaRequest;
import com.integrador.sistemaincidencias.catalogos.dto.CategoriaResponse;
import com.integrador.sistemaincidencias.catalogos.model.Categoria;
import com.integrador.sistemaincidencias.shared.exception.RecursoNoEncontradoException;
import com.integrador.sistemaincidencias.shared.exception.ReglaNegocioException;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class CategoriaService {

    private final CategoriaDao categoriaDao;

    public List<CategoriaResponse> listar() {
        return categoriaDao.listar().stream().map(this::toResponse).toList();
    }

    public CategoriaResponse obtener(UUID id) {
        return toResponse(buscar(id));
    }

    public CategoriaResponse crear(CategoriaRequest request) {
        String nombre = request.getNombre().trim();
        categoriaDao.buscarPorNombre(nombre).ifPresent(categoria -> {
            throw new ReglaNegocioException("Ya existe una categoría con ese nombre");
        });
        Categoria categoria = Categoria.builder()
                .id(UUID.randomUUID())
                .nombre(nombre)
                .descripcion(request.getDescripcion() != null ? request.getDescripcion().trim() : null)
                .activo(Boolean.TRUE.equals(request.getActivo()))
                .build();
        return toResponse(categoriaDao.insertar(categoria));
    }

    public CategoriaResponse actualizar(UUID id, CategoriaRequest request) {
        Categoria actual = buscar(id);
        String nombre = request.getNombre().trim();
        categoriaDao.buscarPorNombre(nombre)
                .filter(categoria -> !categoria.getId().equals(id))
                .ifPresent(categoria -> {
                    throw new ReglaNegocioException("Ya existe otra categoría con ese nombre");
                });
        actual.setNombre(nombre);
        actual.setDescripcion(request.getDescripcion() != null ? request.getDescripcion().trim() : null);
        actual.setActivo(Boolean.TRUE.equals(request.getActivo()));
        return toResponse(categoriaDao.actualizar(actual));
    }

    private Categoria buscar(UUID id) {
        return categoriaDao.buscarPorId(id)
                .orElseThrow(() -> new RecursoNoEncontradoException("Categoría no encontrada"));
    }

    private CategoriaResponse toResponse(Categoria categoria) {
        return CategoriaResponse.builder()
                .id(categoria.getId())
                .nombre(categoria.getNombre())
                .descripcion(categoria.getDescripcion())
                .activo(categoria.getActivo())
                .build();
    }
}
