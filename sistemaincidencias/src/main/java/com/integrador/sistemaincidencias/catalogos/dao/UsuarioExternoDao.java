package com.integrador.sistemaincidencias.catalogos.dao;

import com.integrador.sistemaincidencias.catalogos.mapper.UsuarioExternoMapper;
import com.integrador.sistemaincidencias.catalogos.model.UsuarioExterno;
import com.integrador.sistemaincidencias.catalogos.sql.UsuarioExternoSql;
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
public class UsuarioExternoDao {

    private final DataSource dataSource;
    private final UsuarioExternoMapper usuarioExternoMapper;

    public List<UsuarioExterno> listar() {
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(UsuarioExternoSql.LISTAR);
                ResultSet rs = statement.executeQuery()) {
            List<UsuarioExterno> usuarios = new ArrayList<>();
            while (rs.next()) {
                usuarios.add(usuarioExternoMapper.mapear(rs));
            }
            return usuarios;
        } catch (SQLException exception) {
            throw new AccesoDatosException("Error al listar usuarios externos", exception);
        }
    }

    public Optional<UsuarioExterno> buscarPorId(UUID id) {
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(UsuarioExternoSql.BUSCAR_POR_ID)) {
            statement.setObject(1, id);
            try (ResultSet rs = statement.executeQuery()) {
                return rs.next() ? Optional.of(usuarioExternoMapper.mapear(rs)) : Optional.empty();
            }
        } catch (SQLException exception) {
            throw new AccesoDatosException("Error al buscar usuario externo por id", exception);
        }
    }

    public Optional<UsuarioExterno> buscarPorEmail(String email) {
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(UsuarioExternoSql.BUSCAR_POR_EMAIL)) {
            statement.setString(1, email);
            try (ResultSet rs = statement.executeQuery()) {
                return rs.next() ? Optional.of(usuarioExternoMapper.mapear(rs)) : Optional.empty();
            }
        } catch (SQLException exception) {
            throw new AccesoDatosException("Error al buscar usuario externo por email", exception);
        }
    }

    public UsuarioExterno insertar(UsuarioExterno usuario) {
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(UsuarioExternoSql.INSERTAR)) {
            statement.setObject(1, usuario.getId());
            statement.setString(2, usuario.getEmail());
            statement.setString(3, usuario.getNombre());
            statement.setString(4, usuario.getApellido());
            statement.setBoolean(5, Boolean.TRUE.equals(usuario.getActivo()));
            statement.executeUpdate();
            return usuario;
        } catch (SQLException exception) {
            throw new AccesoDatosException("Error al insertar usuario externo", exception);
        }
    }

    public UsuarioExterno actualizar(UsuarioExterno usuario) {
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(UsuarioExternoSql.ACTUALIZAR)) {
            statement.setString(1, usuario.getEmail());
            statement.setString(2, usuario.getNombre());
            statement.setString(3, usuario.getApellido());
            statement.setBoolean(4, Boolean.TRUE.equals(usuario.getActivo()));
            statement.setObject(5, usuario.getId());
            statement.executeUpdate();
            return usuario;
        } catch (SQLException exception) {
            throw new AccesoDatosException("Error al actualizar usuario externo", exception);
        }
    }
}
