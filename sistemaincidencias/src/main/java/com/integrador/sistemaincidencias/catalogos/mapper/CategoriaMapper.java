package com.integrador.sistemaincidencias.catalogos.mapper;

import com.integrador.sistemaincidencias.catalogos.model.Categoria;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.UUID;
import org.springframework.stereotype.Component;

@Component
public class CategoriaMapper {

    public Categoria mapear(ResultSet rs) throws SQLException {
        return Categoria.builder()
                .id(rs.getObject("id", UUID.class))
                .aplicativoId(rs.getObject("cliente_id", UUID.class))
                .nombre(rs.getString("nombre"))
                .descripcion(rs.getString("descripcion"))
                .activo(rs.getBoolean("activo"))
                .build();
    }
}
