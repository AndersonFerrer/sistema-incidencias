package com.integrador.sistemaincidencias.usuarios.dao;

import com.integrador.sistemaincidencias.shared.exception.AccesoDatosException;
import com.integrador.sistemaincidencias.usuarios.mapper.UsuarioMapper;
import com.integrador.sistemaincidencias.usuarios.model.Usuario;
import com.integrador.sistemaincidencias.usuarios.sql.UsuarioSql;
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
            throw new AccesoDatosException("Error al buscar usuario por email", exception);
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
            throw new AccesoDatosException("Error al buscar usuario por id", exception);
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
            throw new AccesoDatosException("Error al buscar usuario demo por rol", exception);
        }
    }

    public Optional<Usuario> buscarDemoPorEmail(String email) {
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(UsuarioSql.BUSCAR_DEMO_POR_EMAIL)) {
            statement.setString(1, email);
            try (ResultSet rs = statement.executeQuery()) {
                return rs.next() ? Optional.of(usuarioMapper.mapear(rs)) : Optional.empty();
            }
        } catch (SQLException exception) {
            throw new AccesoDatosException("Error al buscar usuario demo por email", exception);
        }
    }

    public List<Usuario> listarAsignables() {
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(UsuarioSql.LISTAR_ASIGNABLES);
                ResultSet rs = statement.executeQuery()) {
            List<Usuario> usuarios = new ArrayList<>();
            while (rs.next()) {
                usuarios.add(usuarioMapper.mapear(rs));
            }
            return usuarios;
        } catch (SQLException exception) {
            throw new AccesoDatosException("Error al listar usuarios asignables", exception);
        }
    }

    public List<Usuario> listar(String texto, String codigoRol, Boolean activo, int limit, int offset) {
        List<Object> parametros = new ArrayList<>();
        String sql = construirSqlListado(texto, codigoRol, activo, parametros);

        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(sql)) {
            for (int i = 0; i < parametros.size(); i++) {
                statement.setObject(i + 1, parametros.get(i));
            }
            statement.setInt(parametros.size() + 1, limit);
            statement.setInt(parametros.size() + 2, offset);

            try (ResultSet rs = statement.executeQuery()) {
                List<Usuario> usuarios = new ArrayList<>();
                while (rs.next()) {
                    usuarios.add(usuarioMapper.mapear(rs));
                }
                return usuarios;
            }
        } catch (SQLException exception) {
            throw new AccesoDatosException("Error al listar usuarios", exception);
        }
    }

    public Usuario insertar(Usuario usuario) {
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(UsuarioSql.INSERTAR)) {
            statement.setObject(1, usuario.getId());
            statement.setString(2, usuario.getNombre());
            statement.setString(3, usuario.getEmail());
            statement.setString(4, usuario.getPasswordHash());
            statement.setObject(5, usuario.getRol().getId());
            statement.setBoolean(6, Boolean.TRUE.equals(usuario.getActivo()));
            statement.setString(7, usuario.getAvatarUrl());
            statement.executeUpdate();
            return buscarPorId(usuario.getId()).orElse(usuario);
        } catch (SQLException exception) {
            throw new AccesoDatosException("Error al insertar usuario", exception);
        }
    }

    public Usuario actualizar(Usuario usuario) {
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(UsuarioSql.ACTUALIZAR)) {
            statement.setString(1, usuario.getNombre());
            statement.setString(2, usuario.getEmail());
            statement.setObject(3, usuario.getRol().getId());
            statement.setBoolean(4, Boolean.TRUE.equals(usuario.getActivo()));
            statement.setString(5, usuario.getAvatarUrl());
            statement.setObject(6, usuario.getId());
            statement.executeUpdate();
            return buscarPorId(usuario.getId()).orElse(usuario);
        } catch (SQLException exception) {
            throw new AccesoDatosException("Error al actualizar usuario", exception);
        }
    }

    public void cambiarPassword(UUID id, String passwordHash) {
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(UsuarioSql.CAMBIAR_PASSWORD)) {
            statement.setString(1, passwordHash);
            statement.setObject(2, id);
            statement.executeUpdate();
        } catch (SQLException exception) {
            throw new AccesoDatosException("Error al cambiar password de usuario", exception);
        }
    }

    public void cambiarActivo(UUID id, boolean activo) {
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(UsuarioSql.CAMBIAR_ACTIVO)) {
            statement.setBoolean(1, activo);
            statement.setObject(2, id);
            statement.executeUpdate();
        } catch (SQLException exception) {
            throw new AccesoDatosException("Error al cambiar estado de usuario", exception);
        }
    }

    /**
     * Updates only the self-editable profile fields (nombre, avatarUrl) for the
     * given user id. Email, role and activo are intentionally NOT touched.
     */
    public void actualizarPerfil(UUID id, String nombre, String avatarUrl) {
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(UsuarioSql.ACTUALIZAR_PERFIL)) {
            statement.setString(1, nombre);
            statement.setString(2, avatarUrl);
            statement.setObject(3, id);
            statement.executeUpdate();
        } catch (SQLException exception) {
            throw new AccesoDatosException("Error al actualizar perfil de usuario", exception);
        }
    }

    private String construirSqlListado(String texto, String codigoRol, Boolean activo, List<Object> parametros) {
        StringBuilder sql = new StringBuilder(UsuarioSql.CAMPOS_BASE);
        sql.append(" WHERE 1 = 1");

        if (texto != null && !texto.isBlank()) {
            sql.append(" AND (lower(u.nombre) LIKE lower(?) OR lower(u.email) LIKE lower(?))");
            String patron = "%" + texto.trim() + "%";
            parametros.add(patron);
            parametros.add(patron);
        }

        if (codigoRol != null && !codigoRol.isBlank()) {
            sql.append(" AND upper(r.codigo) = upper(?)");
            parametros.add(codigoRol.trim());
        }

        if (activo != null) {
            sql.append(" AND u.activo = ?");
            parametros.add(activo);
        }

        sql.append(" ORDER BY u.creado_en DESC LIMIT ? OFFSET ?");
        return sql.toString();
    }
}
