package com.integrador.sistemaincidencias.catalogos.mapper;

import com.integrador.sistemaincidencias.catalogos.model.EstadoAprobacion;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.UUID;
import org.springframework.stereotype.Component;

@Component
public class EstadoAprobacionMapper {

    public EstadoAprobacion mapear(ResultSet rs) throws SQLException {
        return EstadoAprobacion.builder()
                .id(rs.getObject("id", UUID.class))
                .clave(rs.getString("clave"))
                .etiqueta(rs.getString("etiqueta"))
                .activo(rs.getBoolean("activo"))
                .build();
    }
}
