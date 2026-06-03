package com.integrador.sistemaincidencias.usuarios.dao;

import com.integrador.sistemaincidencias.usuarios.mapper.UsuarioMapper;
import com.integrador.sistemaincidencias.usuarios.model.Usuario;
import com.integrador.sistemaincidencias.usuarios.sql.UsuarioSql;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.Optional;
import java.util.UUID;
import javax.sql.DataSource;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class UsuarioDao {

    private final DataSource dataSource;
    private final UsuarioMapper usuarioMapper;

    public Optional<Usuario> buscarPorEmail(String email) {
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(UsuarioSql.BUSCAR_POR_EMAIL)) {
            statement.setString(1, email);
            try (ResultSet rs = statement.executeQuery()) {
                return rs.next() ? Optional.of(usuarioMapper.mapear(rs)) : Optional.empty();
            }
        } catch (SQLException exception) {
            throw new IllegalStateException("Error al buscar usuario por email", exception);
        }
    }

    public Optional<Usuario> buscarPorId(UUID id) {
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(UsuarioSql.BUSCAR_POR_ID)) {
            statement.setObject(1, id);
            try (ResultSet rs = statement.executeQuery()) {
                return rs.next() ? Optional.of(usuarioMapper.mapear(rs)) : Optional.empty();
            }
        } catch (SQLException exception) {
            throw new IllegalStateException("Error al buscar usuario por id", exception);
        }
    }

    public Optional<Usuario> buscarDemoPorRol(String codigoRol) {
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(UsuarioSql.BUSCAR_DEMO_POR_ROL)) {
            statement.setString(1, codigoRol);
            try (ResultSet rs = statement.executeQuery()) {
                return rs.next() ? Optional.of(usuarioMapper.mapear(rs)) : Optional.empty();
            }
        } catch (SQLException exception) {
            throw new IllegalStateException("Error al buscar usuario demo por rol", exception);
        }
    }
}
