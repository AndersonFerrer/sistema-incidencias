package com.integrador.sistemaincidencias.usuarios.mapper;

import com.integrador.sistemaincidencias.usuarios.model.Rol;
import com.integrador.sistemaincidencias.usuarios.model.Usuario;
import java.sql.ResultSet;
import java.sql.SQLException;
import org.springframework.stereotype.Component;

@Component
public class UsuarioMapper {

    public Usuario mapear(ResultSet rs) throws SQLException {
        Rol rol = Rol.builder()
                .id(rs.getObject("rol_id", java.util.UUID.class))
                .codigo(rs.getString("rol_codigo"))
                .nombre(rs.getString("rol_nombre"))
                .descripcion(rs.getString("rol_descripcion"))
                .activo(rs.getBoolean("rol_activo"))
                .build();

        return Usuario.builder()
                .id(rs.getObject("usuario_id", java.util.UUID.class))
                .nombre(rs.getString("usuario_nombre"))
                .email(rs.getString("usuario_email"))
                .passwordHash(rs.getString("usuario_password_hash"))
                .rol(rol)
                .activo(rs.getBoolean("usuario_activo"))
                .avatarUrl(rs.getString("usuario_avatar_url"))
                .creadoEn(rs.getTimestamp("usuario_creado_en") == null
                        ? null
                        : rs.getTimestamp("usuario_creado_en").toLocalDateTime())
                .actualizadoEn(rs.getTimestamp("usuario_actualizado_en") == null
                        ? null
                        : rs.getTimestamp("usuario_actualizado_en").toLocalDateTime())
                .build();
    }
}
