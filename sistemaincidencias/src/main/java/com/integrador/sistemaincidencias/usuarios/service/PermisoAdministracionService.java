package com.integrador.sistemaincidencias.usuarios.service;

import com.integrador.sistemaincidencias.auth.service.AuthService;
import com.integrador.sistemaincidencias.shared.exception.AccesoDenegadoException;
import com.integrador.sistemaincidencias.usuarios.model.Usuario;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class PermisoAdministracionService {

    private final AuthService authService;

    public Usuario validarAdministrador(String authorizationHeader) {
        Usuario usuario = authService.obtenerUsuarioActual(authorizationHeader);
        if (usuario.getRol() == null || !usuario.getRol().esAdministrador()) {
            throw new AccesoDenegadoException("Solo el administrador puede realizar esta operacion");
        }
        return usuario;
    }
}
