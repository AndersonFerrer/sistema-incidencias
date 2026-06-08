package com.integrador.sistemaincidencias.catalogos.mapper;

import com.integrador.sistemaincidencias.catalogos.model.EstadoProceso;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.UUID;
import org.springframework.stereotype.Component;

@Component
public class EstadoProcesoMapper {

    public EstadoProceso mapear(ResultSet rs) throws SQLException {
        return EstadoProceso.builder()
                .id(rs.getObject("id", UUID.class))
                .clave(rs.getString("clave"))
                .etiqueta(rs.getString("etiqueta"))
                .esTerminal(rs.getBoolean("es_terminal"))
                .orden(rs.getInt("orden"))
                .activo(rs.getBoolean("activo"))
                .build();
    }
}
