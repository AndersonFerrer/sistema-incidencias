package com.integrador.sistemaincidencias.catalogos.mapper;

import com.integrador.sistemaincidencias.catalogos.model.AplicativoCliente;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.UUID;
import org.springframework.stereotype.Component;

@Component
public class AplicativoClienteMapper {

    public AplicativoCliente mapear(ResultSet rs) throws SQLException {
        return AplicativoCliente.builder()
                .id(rs.getObject("id", UUID.class))
                .nombre(rs.getString("nombre"))
                .apiKey(rs.getString("api_key"))
                .activo(rs.getBoolean("activo"))
                .build();
    }
}
