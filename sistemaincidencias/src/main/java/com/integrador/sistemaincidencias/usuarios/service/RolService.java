package com.integrador.sistemaincidencias.usuarios.service;

import com.integrador.sistemaincidencias.shared.exception.RecursoNoEncontradoException;
import com.integrador.sistemaincidencias.shared.exception.ReglaNegocioException;
import com.integrador.sistemaincidencias.usuarios.dao.RolDao;
import com.integrador.sistemaincidencias.usuarios.dto.ActualizarRolRequest;
import com.integrador.sistemaincidencias.usuarios.dto.CrearRolRequest;
import com.integrador.sistemaincidencias.usuarios.dto.RolResponse;
import com.integrador.sistemaincidencias.usuarios.mapper.UsuarioDtoMapper;
import com.integrador.sistemaincidencias.usuarios.model.Rol;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class RolService {

    private final RolDao rolDao;
    private final UsuarioDtoMapper usuarioDtoMapper;
    private final PermisoAdministracionService permisoAdministracionService;

    public List<RolResponse> listar(String authorizationHeader) {
        permisoAdministracionService.validarAdministrador(authorizationHeader);
        return rolDao.listar().stream()
                .map(usuarioDtoMapper::toResponse)
                .toList();
    }

    public RolResponse obtener(String authorizationHeader, UUID id) {
        permisoAdministracionService.validarAdministrador(authorizationHeader);
        return usuarioDtoMapper.toResponse(buscarRol(id));
    }

    public RolResponse crear(String authorizationHeader, CrearRolRequest request) {
        permisoAdministracionService.validarAdministrador(authorizationHeader);
        String codigo = normalizarCodigo(request.getCodigo());
        rolDao.buscarPorCodigo(codigo).ifPresent(rol -> {
            throw new ReglaNegocioException("Ya existe un rol con el codigo indicado");
        });

        Rol rol = Rol.builder()
                .id(UUID.randomUUID())
                .codigo(codigo)
                .nombre(request.getNombre().trim())
                .descripcion(limpiar(request.getDescripcion()))
                .activo(Boolean.TRUE.equals(request.getActivo()))
                .build();

        return usuarioDtoMapper.toResponse(rolDao.insertar(rol));
    }

    public RolResponse actualizar(String authorizationHeader, UUID id, ActualizarRolRequest request) {
        permisoAdministracionService.validarAdministrador(authorizationHeader);
        Rol actual = buscarRol(id);
        String codigo = normalizarCodigo(request.getCodigo());
        rolDao.buscarPorCodigo(codigo)
                .filter(rol -> !rol.getId().equals(id))
                .ifPresent(rol -> {
                    throw new ReglaNegocioException("Ya existe otro rol con el codigo indicado");
                });

        actual.setCodigo(codigo);
        actual.setNombre(request.getNombre().trim());
        actual.setDescripcion(limpiar(request.getDescripcion()));
        actual.setActivo(Boolean.TRUE.equals(request.getActivo()));
        return usuarioDtoMapper.toResponse(rolDao.actualizar(actual));
    }

    public void eliminar(String authorizationHeader, UUID id) {
        permisoAdministracionService.validarAdministrador(authorizationHeader);
        buscarRol(id);
        if (rolDao.contarUsuariosAsignados(id) > 0) {
            throw new ReglaNegocioException("No se puede eliminar un rol con usuarios asignados");
        }
        rolDao.eliminar(id);
    }

    private Rol buscarRol(UUID id) {
        return rolDao.buscarPorId(id)
                .orElseThrow(() -> new RecursoNoEncontradoException("Rol no encontrado"));
    }

    private String normalizarCodigo(String codigo) {
        return codigo.trim().toUpperCase().replace(' ', '_');
    }

    private String limpiar(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
