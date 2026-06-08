package com.integrador.sistemaincidencias.catalogos.mapper;

import com.integrador.sistemaincidencias.catalogos.model.UsuarioExterno;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.UUID;
import org.springframework.stereotype.Component;

@Component
public class UsuarioExternoMapper {

    public UsuarioExterno mapear(ResultSet rs) throws SQLException {
        return UsuarioExterno.builder()
                .id(rs.getObject("id", UUID.class))
                .email(rs.getString("email"))
                .nombre(rs.getString("nombre"))
                .apellido(rs.getString("apellido"))
                .activo(rs.getBoolean("activo"))
                .build();
    }
}
