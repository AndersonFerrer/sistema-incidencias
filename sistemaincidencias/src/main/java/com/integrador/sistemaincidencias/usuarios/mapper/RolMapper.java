package com.integrador.sistemaincidencias.usuarios.mapper;

import com.integrador.sistemaincidencias.usuarios.model.Rol;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.UUID;
import org.springframework.stereotype.Component;

@Component
public class RolMapper {

    public Rol mapear(ResultSet rs) throws SQLException {
        return Rol.builder()
                .id(rs.getObject("rol_id", UUID.class))
                .codigo(rs.getString("rol_codigo"))
                .nombre(rs.getString("rol_nombre"))
                .descripcion(rs.getString("rol_descripcion"))
                .activo(rs.getBoolean("rol_activo"))
                .build();
    }
}
