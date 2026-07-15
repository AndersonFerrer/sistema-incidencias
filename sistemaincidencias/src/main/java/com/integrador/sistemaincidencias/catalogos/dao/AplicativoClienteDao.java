package com.integrador.sistemaincidencias.catalogos.dao;

import com.integrador.sistemaincidencias.catalogos.mapper.AplicativoClienteMapper;
import com.integrador.sistemaincidencias.catalogos.model.AplicativoCliente;
import com.integrador.sistemaincidencias.catalogos.sql.AplicativoClienteSql;
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
public class AplicativoClienteDao {

    private final DataSource dataSource;
    private final AplicativoClienteMapper aplicativoClienteMapper;

    public List<AplicativoCliente> listar() {
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(AplicativoClienteSql.LISTAR);
                ResultSet rs = statement.executeQuery()) {
            List<AplicativoCliente> aplicativos = new ArrayList<>();
            while (rs.next()) {
                aplicativos.add(aplicativoClienteMapper.mapear(rs));
            }
            return aplicativos;
        } catch (SQLException exception) {
            throw new AccesoDatosException("Error al listar aplicativos cliente", exception);
        }
    }

    public Optional<AplicativoCliente> buscarPorId(UUID id) {
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(AplicativoClienteSql.BUSCAR_POR_ID)) {
            statement.setObject(1, id);
            try (ResultSet rs = statement.executeQuery()) {
                return rs.next() ? Optional.of(aplicativoClienteMapper.mapear(rs)) : Optional.empty();
            }
        } catch (SQLException exception) {
            throw new AccesoDatosException("Error al buscar aplicativo cliente por id", exception);
        }
    }

    public Optional<AplicativoCliente> buscarPorNombre(String nombre) {
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(AplicativoClienteSql.BUSCAR_POR_NOMBRE)) {
            statement.setString(1, nombre);
            try (ResultSet rs = statement.executeQuery()) {
                return rs.next() ? Optional.of(aplicativoClienteMapper.mapear(rs)) : Optional.empty();
            }
        } catch (SQLException exception) {
            throw new AccesoDatosException("Error al buscar aplicativo cliente por nombre", exception);
        }
    }

    public AplicativoCliente insertar(AplicativoCliente aplicativo) {
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(AplicativoClienteSql.INSERTAR)) {
            statement.setObject(1, aplicativo.getId());
            statement.setString(2, aplicativo.getNombre());
            statement.setString(3, aplicativo.getApiKey());
            statement.setBoolean(4, Boolean.TRUE.equals(aplicativo.getActivo()));
            statement.executeUpdate();
            return aplicativo;
        } catch (SQLException exception) {
            throw new AccesoDatosException("Error al insertar aplicativo cliente", exception);
        }
    }

    public AplicativoCliente actualizar(AplicativoCliente aplicativo) {
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(AplicativoClienteSql.ACTUALIZAR)) {
            statement.setString(1, aplicativo.getNombre());
            statement.setBoolean(2, Boolean.TRUE.equals(aplicativo.getActivo()));
            statement.setObject(3, aplicativo.getId());
            statement.executeUpdate();
            return aplicativo;
        } catch (SQLException exception) {
            throw new AccesoDatosException("Error al actualizar aplicativo cliente", exception);
        }
    }

    public void rotarApiKey(UUID id, String nuevoApiKey) {
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(AplicativoClienteSql.ROTAR_API_KEY)) {
            statement.setString(1, nuevoApiKey);
            statement.setObject(2, id);
            statement.executeUpdate();
        } catch (SQLException exception) {
            throw new AccesoDatosException("Error al rotar API key", exception);
        }
    }

    public void cambiarActivo(UUID id, boolean activo) {
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(AplicativoClienteSql.DESACTIVAR)) {
            statement.setBoolean(1, activo);
            statement.setObject(2, id);
            statement.executeUpdate();
        } catch (SQLException exception) {
            throw new AccesoDatosException("Error al cambiar estado de aplicativo cliente", exception);
        }
    }
}
