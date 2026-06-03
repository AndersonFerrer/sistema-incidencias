package com.integrador.sistemaincidencias.usuarios.mapper;

import com.integrador.sistemaincidencias.usuarios.dto.RolResponse;
import com.integrador.sistemaincidencias.usuarios.dto.UsuarioResponse;
import com.integrador.sistemaincidencias.usuarios.model.Rol;
import com.integrador.sistemaincidencias.usuarios.model.Usuario;
import org.springframework.stereotype.Component;

@Component
public class UsuarioDtoMapper {

    public UsuarioResponse toResponse(Usuario usuario) {
        return UsuarioResponse.builder()
                .id(usuario.getId())
                .nombre(usuario.getNombre())
                .email(usuario.getEmail())
                .rol(toResponse(usuario.getRol()))
                .activo(usuario.getActivo())
                .avatarUrl(usuario.getAvatarUrl())
                .creadoEn(usuario.getCreadoEn())
                .actualizadoEn(usuario.getActualizadoEn())
                .build();
    }

    public RolResponse toResponse(Rol rol) {
        if (rol == null) {
            return null;
        }
        return RolResponse.builder()
                .id(rol.getId())
                .codigo(rol.getCodigo())
                .nombre(rol.getNombre())
                .descripcion(rol.getDescripcion())
                .activo(rol.getActivo())
                .build();
    }
}
