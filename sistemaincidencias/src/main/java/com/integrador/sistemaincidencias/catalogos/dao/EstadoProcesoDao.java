package com.integrador.sistemaincidencias.catalogos.dao;

import com.integrador.sistemaincidencias.catalogos.mapper.EstadoProcesoMapper;
import com.integrador.sistemaincidencias.catalogos.model.EstadoProceso;
import com.integrador.sistemaincidencias.catalogos.sql.EstadoProcesoSql;
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
public class EstadoProcesoDao {

    private final DataSource dataSource;
    private final EstadoProcesoMapper estadoProcesoMapper;

    public List<EstadoProceso> listar() {
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(EstadoProcesoSql.LISTAR);
                ResultSet rs = statement.executeQuery()) {
            List<EstadoProceso> estados = new ArrayList<>();
            while (rs.next()) {
                estados.add(estadoProcesoMapper.mapear(rs));
            }
            return estados;
        } catch (SQLException exception) {
            throw new AccesoDatosException("Error al listar estados de proceso", exception);
        }
    }

    public Optional<EstadoProceso> buscarPorId(UUID id) {
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(EstadoProcesoSql.BUSCAR_POR_ID)) {
            statement.setObject(1, id);
            try (ResultSet rs = statement.executeQuery()) {
                return rs.next() ? Optional.of(estadoProcesoMapper.mapear(rs)) : Optional.empty();
            }
        } catch (SQLException exception) {
            throw new AccesoDatosException("Error al buscar estado de proceso por id", exception);
        }
    }

    public Optional<EstadoProceso> buscarPorClave(String clave) {
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(EstadoProcesoSql.BUSCAR_POR_CLAVE)) {
            statement.setString(1, clave);
            try (ResultSet rs = statement.executeQuery()) {
                return rs.next() ? Optional.of(estadoProcesoMapper.mapear(rs)) : Optional.empty();
            }
        } catch (SQLException exception) {
            throw new AccesoDatosException("Error al buscar estado de proceso por clave", exception);
        }
    }

    public EstadoProceso insertar(EstadoProceso estado) {
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(EstadoProcesoSql.INSERTAR)) {
            statement.setObject(1, estado.getId());
            statement.setString(2, estado.getClave());
            statement.setString(3, estado.getEtiqueta());
            statement.setBoolean(4, Boolean.TRUE.equals(estado.getEsTerminal()));
            statement.setInt(5, estado.getOrden());
            statement.setBoolean(6, Boolean.TRUE.equals(estado.getActivo()));
            statement.executeUpdate();
            return estado;
        } catch (SQLException exception) {
            throw new AccesoDatosException("Error al insertar estado de proceso", exception);
        }
    }

    public EstadoProceso actualizar(EstadoProceso estado) {
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(EstadoProcesoSql.ACTUALIZAR)) {
            statement.setString(1, estado.getClave());
            statement.setString(2, estado.getEtiqueta());
            statement.setBoolean(3, Boolean.TRUE.equals(estado.getEsTerminal()));
            statement.setInt(4, estado.getOrden());
            statement.setBoolean(5, Boolean.TRUE.equals(estado.getActivo()));
            statement.setObject(6, estado.getId());
            statement.executeUpdate();
            return estado;
        } catch (SQLException exception) {
            throw new AccesoDatosException("Error al actualizar estado de proceso", exception);
        }
    }
}
