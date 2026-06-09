package com.integrador.sistemaincidencias.incidencias.dao;

import com.integrador.sistemaincidencias.incidencias.mapper.HistorialIncidenciaMapper;
import com.integrador.sistemaincidencias.incidencias.model.HistorialIncidencia;
import com.integrador.sistemaincidencias.incidencias.sql.HistorialIncidenciaSql;
import com.integrador.sistemaincidencias.shared.exception.AccesoDatosException;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import javax.sql.DataSource;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class HistorialIncidenciaDao {

    private final DataSource dataSource;
    private final HistorialIncidenciaMapper historialMapper;

    public List<HistorialIncidencia> listarPorIncidencia(UUID incidenciaId) {
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(HistorialIncidenciaSql.LISTAR_POR_INCIDENCIA)) {
            statement.setObject(1, incidenciaId);
            try (ResultSet rs = statement.executeQuery()) {
                List<HistorialIncidencia> historial = new ArrayList<>();
                while (rs.next()) {
                    historial.add(historialMapper.mapear(rs));
                }
                return historial;
            }
        } catch (SQLException exception) {
            throw new AccesoDatosException("Error al listar historial", exception);
        }
    }

    public HistorialIncidencia insertar(HistorialIncidencia historial) {
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(HistorialIncidenciaSql.INSERTAR)) {
            statement.setObject(1, historial.getId());
            statement.setObject(2, historial.getIncidenciaId());
            statement.setObject(3, historial.getUsuarioId());
            statement.setString(4, historial.getAccion());
            statement.setObject(5, historial.getEstadoProcesoAnteriorId());
            statement.setObject(6, historial.getEstadoProcesoNuevoId());
            statement.setString(7, historial.getNota());
            statement.executeUpdate();
            return historial;
        } catch (SQLException exception) {
            throw new AccesoDatosException("Error al insertar historial", exception);
        }
    }
}
