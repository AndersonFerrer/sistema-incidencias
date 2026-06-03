package com.integrador.sistemaincidencias.usuarios.dao;

import com.integrador.sistemaincidencias.usuarios.mapper.RolMapper;
import com.integrador.sistemaincidencias.usuarios.model.Rol;
import com.integrador.sistemaincidencias.usuarios.sql.RolSql;
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
public class RolDao {

    private final DataSource dataSource;
    private final RolMapper rolMapper;

    public List<Rol> listar() {
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(RolSql.LISTAR);
                ResultSet rs = statement.executeQuery()) {
            List<Rol> roles = new ArrayList<>();
            while (rs.next()) {
                roles.add(rolMapper.mapear(rs));
            }
            return roles;
        } catch (SQLException exception) {
            throw new IllegalStateException("Error al listar roles", exception);
        }
    }

    public Optional<Rol> buscarPorId(UUID id) {
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(RolSql.BUSCAR_POR_ID)) {
            statement.setObject(1, id);
            try (ResultSet rs = statement.executeQuery()) {
                return rs.next() ? Optional.of(rolMapper.mapear(rs)) : Optional.empty();
            }
        } catch (SQLException exception) {
            throw new IllegalStateException("Error al buscar rol por id", exception);
        }
    }

    public Optional<Rol> buscarPorCodigo(String codigo) {
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(RolSql.BUSCAR_POR_CODIGO)) {
            statement.setString(1, codigo);
            try (ResultSet rs = statement.executeQuery()) {
                return rs.next() ? Optional.of(rolMapper.mapear(rs)) : Optional.empty();
            }
        } catch (SQLException exception) {
            throw new IllegalStateException("Error al buscar rol por codigo", exception);
        }
    }

    public Rol insertar(Rol rol) {
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(RolSql.INSERTAR)) {
            statement.setObject(1, rol.getId());
            statement.setString(2, rol.getCodigo());
            statement.setString(3, rol.getNombre());
            statement.setString(4, rol.getDescripcion());
            statement.setBoolean(5, Boolean.TRUE.equals(rol.getActivo()));
            statement.executeUpdate();
            return rol;
        } catch (SQLException exception) {
            throw new IllegalStateException("Error al insertar rol", exception);
        }
    }

    public Rol actualizar(Rol rol) {
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(RolSql.ACTUALIZAR)) {
            statement.setString(1, rol.getCodigo());
            statement.setString(2, rol.getNombre());
            statement.setString(3, rol.getDescripcion());
            statement.setBoolean(4, Boolean.TRUE.equals(rol.getActivo()));
            statement.setObject(5, rol.getId());
            statement.executeUpdate();
            return rol;
        } catch (SQLException exception) {
            throw new IllegalStateException("Error al actualizar rol", exception);
        }
    }

    public long contarUsuariosAsignados(UUID rolId) {
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(RolSql.CONTAR_USUARIOS_ASIGNADOS)) {
            statement.setObject(1, rolId);
            try (ResultSet rs = statement.executeQuery()) {
                return rs.next() ? rs.getLong(1) : 0;
            }
        } catch (SQLException exception) {
            throw new IllegalStateException("Error al contar usuarios por rol", exception);
        }
    }

    public void eliminar(UUID id) {
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(RolSql.ELIMINAR)) {
            statement.setObject(1, id);
            statement.executeUpdate();
        } catch (SQLException exception) {
            throw new IllegalStateException("Error al eliminar rol", exception);
        }
    }
}
