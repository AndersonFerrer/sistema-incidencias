package com.integrador.sistemaincidencias.incidencias.dao;

import com.integrador.sistemaincidencias.incidencias.mapper.ComentarioMapper;
import com.integrador.sistemaincidencias.incidencias.model.Comentario;
import com.integrador.sistemaincidencias.incidencias.sql.ComentarioSql;
import com.integrador.sistemaincidencias.shared.exception.AccesoDatosException;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;
import javax.sql.DataSource;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class ComentarioDao {

    private final DataSource dataSource;
    private final ComentarioMapper comentarioMapper;

    public List<Comentario> listarPorIncidencia(java.util.UUID incidenciaId) {
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(ComentarioSql.LISTAR_POR_INCIDENCIA)) {
            statement.setObject(1, incidenciaId);
            try (ResultSet rs = statement.executeQuery()) {
                List<Comentario> comentarios = new ArrayList<>();
                while (rs.next()) {
                    comentarios.add(comentarioMapper.mapear(rs));
                }
                return comentarios;
            }
        } catch (SQLException exception) {
            throw new AccesoDatosException("Error al listar comentarios", exception);
        }
    }

    public Comentario insertar(Comentario comentario) {
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(ComentarioSql.INSERTAR)) {
            statement.setObject(1, comentario.getId());
            statement.setObject(2, comentario.getIncidenciaId());
            statement.setObject(3, comentario.getAutorId());
            statement.setString(4, comentario.getContenido());
            statement.executeUpdate();
            return comentario;
        } catch (SQLException exception) {
            throw new AccesoDatosException("Error al insertar comentario", exception);
        }
    }
}
