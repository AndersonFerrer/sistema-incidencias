package com.integrador.sistemaincidencias.usuarios.service;

import com.integrador.sistemaincidencias.shared.exception.RecursoNoEncontradoException;
import com.integrador.sistemaincidencias.shared.exception.ReglaNegocioException;
import com.integrador.sistemaincidencias.usuarios.dao.RolDao;
import com.integrador.sistemaincidencias.usuarios.dao.UsuarioDao;
import com.integrador.sistemaincidencias.usuarios.dto.ActualizarPerfilRequest;
import com.integrador.sistemaincidencias.usuarios.dto.ActualizarUsuarioRequest;
import com.integrador.sistemaincidencias.usuarios.dto.CambiarPasswordPropiaRequest;
import com.integrador.sistemaincidencias.usuarios.dto.CambiarPasswordRequest;
import com.integrador.sistemaincidencias.usuarios.dto.CrearUsuarioRequest;
import com.integrador.sistemaincidencias.usuarios.dto.UsuarioResponse;
import com.integrador.sistemaincidencias.usuarios.mapper.UsuarioDtoMapper;
import com.integrador.sistemaincidencias.usuarios.model.Rol;
import com.integrador.sistemaincidencias.usuarios.model.Usuario;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class UsuarioService {

    private static final int LIMITE_MAXIMO = 100;

    private final UsuarioDao usuarioDao;
    private final RolDao rolDao;
    private final UsuarioDtoMapper usuarioDtoMapper;
    private final PasswordEncoder passwordEncoder;
    private final PermisoAdministracionService permisoAdministracionService;

    public List<UsuarioResponse> listar(
            String authorizationHeader,
            String texto,
            String rol,
            Boolean activo,
            int limit,
            int offset
    ) {
        permisoAdministracionService.validarAdministrador(authorizationHeader);
        int limitSeguro = Math.max(1, Math.min(limit, LIMITE_MAXIMO));
        int offsetSeguro = Math.max(0, offset);
        return usuarioDao.listar(texto, rol, activo, limitSeguro, offsetSeguro)
                .stream()
                .map(usuarioDtoMapper::toResponse)
                .toList();
    }

    public List<UsuarioResponse> listarAgentesAsignables(String authorizationHeader) {
        permisoAdministracionService.validarAutenticado(authorizationHeader);
        return usuarioDao.listarAsignables()
                .stream()
                .map(usuarioDtoMapper::toResponse)
                .toList();
    }

    public UsuarioResponse obtener(String authorizationHeader, UUID id) {
        permisoAdministracionService.validarAdministrador(authorizationHeader);
        return usuarioDtoMapper.toResponse(buscarUsuario(id));
    }

    public UsuarioResponse crear(String authorizationHeader, CrearUsuarioRequest request) {
        permisoAdministracionService.validarAdministrador(authorizationHeader);
        String email = normalizarEmail(request.getEmail());
        validarEmailDisponible(email, null);
        Rol rol = buscarRolActivo(request.getRolCodigo());

        Usuario usuario = Usuario.builder()
                .id(UUID.randomUUID())
                .nombre(request.getNombre().trim())
                .email(email)
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .rol(rol)
                .activo(Boolean.TRUE.equals(request.getActivo()))
                .avatarUrl(limpiar(request.getAvatarUrl()))
                .build();

        return usuarioDtoMapper.toResponse(usuarioDao.insertar(usuario));
    }

    public UsuarioResponse actualizar(String authorizationHeader, UUID id, ActualizarUsuarioRequest request) {
        permisoAdministracionService.validarAdministrador(authorizationHeader);
        Usuario actual = buscarUsuario(id);
        String email = normalizarEmail(request.getEmail());
        validarEmailDisponible(email, id);

        actual.setNombre(request.getNombre().trim());
        actual.setEmail(email);
        actual.setRol(buscarRolActivo(request.getRolCodigo()));
        actual.setActivo(Boolean.TRUE.equals(request.getActivo()));
        actual.setAvatarUrl(limpiar(request.getAvatarUrl()));

        return usuarioDtoMapper.toResponse(usuarioDao.actualizar(actual));
    }

    public void cambiarPassword(String authorizationHeader, UUID id, CambiarPasswordRequest request) {
        permisoAdministracionService.validarAdministrador(authorizationHeader);
        buscarUsuario(id);
        usuarioDao.cambiarPassword(id, passwordEncoder.encode(request.getPassword()));
    }

    public UsuarioResponse cambiarActivo(String authorizationHeader, UUID id, boolean activo) {
        Usuario administrador = permisoAdministracionService.validarAdministrador(authorizationHeader);
        if (administrador.getId().equals(id) && !activo) {
            throw new ReglaNegocioException("No puedes desactivar tu propio usuario administrador");
        }
        buscarUsuario(id);
        usuarioDao.cambiarActivo(id, activo);
        return usuarioDtoMapper.toResponse(buscarUsuario(id));
    }

    /**
     * Reads the authenticated user's profile. Any active role may call this.
     */
    public UsuarioResponse obtenerPerfil(String authorizationHeader) {
        Usuario actual = permisoAdministracionService.validarAutenticado(authorizationHeader);
        return usuarioDtoMapper.toResponse(buscarUsuario(actual.getId()));
    }

    /**
     * Updates only self-editable fields (nombre + avatarUrl). Email, role, and
     * activo cannot be changed through this route.
     */
    public UsuarioResponse actualizarPerfil(
            String authorizationHeader,
            ActualizarPerfilRequest request
    ) {
        Usuario actual = permisoAdministracionService.validarAutenticado(authorizationHeader);
        String nombre = request.getNombre().trim();
        String avatar = limpiar(request.getAvatarUrl());
        usuarioDao.actualizarPerfil(actual.getId(), nombre, avatar);
        return usuarioDtoMapper.toResponse(buscarUsuario(actual.getId()));
    }

    /**
     * Verifies the user's current password and replaces the stored hash with a
     * fresh BCrypt of the new password. Returns 204; throws on mismatch.
     */
    public void cambiarPasswordPropia(
            String authorizationHeader,
            CambiarPasswordPropiaRequest request
    ) {
        Usuario actual = permisoAdministracionService.validarAutenticado(authorizationHeader);
        Usuario recargado = buscarUsuario(actual.getId());
        if (!passwordEncoder.matches(request.getCurrentPassword(), recargado.getPasswordHash())) {
            throw new ReglaNegocioException("La contraseña actual no coincide");
        }
        usuarioDao.cambiarPassword(recargado.getId(), passwordEncoder.encode(request.getNewPassword()));
    }

    /**
     * ADMIN-only soft delete (activo=false). Refuses to soft-delete the
     * authenticated administrator's own row.
     */
    public void eliminar(String authorizationHeader, UUID id) {
        Usuario administrador = permisoAdministracionService.validarAdministrador(authorizationHeader);
        if (administrador.getId().equals(id)) {
            throw new ReglaNegocioException("No puedes eliminar tu propio usuario administrador");
        }
        buscarUsuario(id);
        usuarioDao.cambiarActivo(id, false);
    }

    private Usuario buscarUsuario(UUID id) {
        return usuarioDao.buscarPorId(id)
                .orElseThrow(() -> new RecursoNoEncontradoException("Usuario no encontrado"));
    }

    private Rol buscarRolActivo(String codigoRol) {
        return rolDao.buscarPorCodigo(codigoRol)
                .filter(rol -> Boolean.TRUE.equals(rol.getActivo()))
                .orElseThrow(() -> new ReglaNegocioException("Rol no encontrado o inactivo"));
    }

    private void validarEmailDisponible(String email, UUID usuarioIdActual) {
        usuarioDao.buscarPorEmail(email)
                .filter(usuario -> usuarioIdActual == null || !usuario.getId().equals(usuarioIdActual))
                .ifPresent(usuario -> {
                    throw new ReglaNegocioException("Ya existe un usuario con el email indicado");
                });
    }

    private String normalizarEmail(String email) {
        return email.trim().toLowerCase();
    }

    private String limpiar(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
