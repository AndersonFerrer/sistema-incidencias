package com.integrador.sistemaincidencias.incidencias.dao;

import com.integrador.sistemaincidencias.incidencias.model.Aprobacion;
import com.integrador.sistemaincidencias.incidencias.sql.AprobacionSql;
import com.integrador.sistemaincidencias.shared.exception.AccesoDatosException;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.SQLException;
import javax.sql.DataSource;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class AprobacionDao {

    private final DataSource dataSource;

    public Aprobacion insertar(Aprobacion aprobacion) {
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(AprobacionSql.INSERTAR)) {
            statement.setObject(1, aprobacion.getId());
            statement.setObject(2, aprobacion.getIncidenciaId());
            statement.setObject(3, aprobacion.getRevisadoPor());
            statement.setObject(4, aprobacion.getEstadoAprobacionId());
            statement.setString(5, aprobacion.getMotivoRechazo());
            statement.executeUpdate();
            return aprobacion;
        } catch (SQLException exception) {
            throw new AccesoDatosException("Error al insertar aprobacion", exception);
        }
    }
}
