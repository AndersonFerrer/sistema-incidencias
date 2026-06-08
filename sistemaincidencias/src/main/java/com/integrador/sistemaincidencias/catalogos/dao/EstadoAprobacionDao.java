package com.integrador.sistemaincidencias.catalogos.dao;

import com.integrador.sistemaincidencias.catalogos.mapper.EstadoAprobacionMapper;
import com.integrador.sistemaincidencias.catalogos.model.EstadoAprobacion;
import com.integrador.sistemaincidencias.catalogos.sql.EstadoAprobacionSql;
import com.integrador.sistemaincidencias.shared.exception.AccesoDatosException;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import javax.sql.DataSource;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class EstadoAprobacionDao {

    private final DataSource dataSource;
    private final EstadoAprobacionMapper estadoAprobacionMapper;

    public List<EstadoAprobacion> listar() {
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(EstadoAprobacionSql.LISTAR);
                ResultSet rs = statement.executeQuery()) {
            List<EstadoAprobacion> estados = new ArrayList<>();
            while (rs.next()) {
                estados.add(estadoAprobacionMapper.mapear(rs));
            }
            return estados;
        } catch (SQLException exception) {
            throw new AccesoDatosException("Error al listar estados de aprobación", exception);
        }
    }

    public Optional<EstadoAprobacion> buscarPorId(UUID id) {
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(EstadoAprobacionSql.BUSCAR_POR_ID)) {
            statement.setObject(1, id);
            try (ResultSet rs = statement.executeQuery()) {
                return rs.next() ? Optional.of(estadoAprobacionMapper.mapear(rs)) : Optional.empty();
            }
        } catch (SQLException exception) {
            throw new AccesoDatosException("Error al buscar estado de aprobación por id", exception);
        }
    }

    public Optional<EstadoAprobacion> buscarPorClave(String clave) {
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(EstadoAprobacionSql.BUSCAR_POR_CLAVE)) {
            statement.setString(1, clave);
            try (ResultSet rs = statement.executeQuery()) {
                return rs.next() ? Optional.of(estadoAprobacionMapper.mapear(rs)) : Optional.empty();
            }
        } catch (SQLException exception) {
            throw new AccesoDatosException("Error al buscar estado de aprobación por clave", exception);
        }
    }

    public EstadoAprobacion insertar(EstadoAprobacion estado) {
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(EstadoAprobacionSql.INSERTAR)) {
            statement.setObject(1, estado.getId());
            statement.setString(2, estado.getClave());
            statement.setString(3, estado.getEtiqueta());
            statement.setBoolean(4, Boolean.TRUE.equals(estado.getActivo()));
            statement.executeUpdate();
            return estado;
        } catch (SQLException exception) {
            throw new AccesoDatosException("Error al insertar estado de aprobación", exception);
        }
    }

    public EstadoAprobacion actualizar(EstadoAprobacion estado) {
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(EstadoAprobacionSql.ACTUALIZAR)) {
            statement.setString(1, estado.getClave());
            statement.setString(2, estado.getEtiqueta());
            statement.setBoolean(3, Boolean.TRUE.equals(estado.getActivo()));
            statement.setObject(4, estado.getId());
            statement.executeUpdate();
            return estado;
        } catch (SQLException exception) {
            throw new AccesoDatosException("Error al actualizar estado de aprobación", exception);
        }
    }
}
