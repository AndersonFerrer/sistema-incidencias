package com.integrador.sistemaincidencias.catalogos.dao;

import com.integrador.sistemaincidencias.catalogos.mapper.CategoriaMapper;
import com.integrador.sistemaincidencias.catalogos.model.Categoria;
import com.integrador.sistemaincidencias.catalogos.sql.CategoriaSql;
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
public class CategoriaDao {

    private final DataSource dataSource;
    private final CategoriaMapper categoriaMapper;

    public List<Categoria> listar() {
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(CategoriaSql.LISTAR);
                ResultSet rs = statement.executeQuery()) {
            List<Categoria> categorias = new ArrayList<>();
            while (rs.next()) {
                categorias.add(categoriaMapper.mapear(rs));
            }
            return categorias;
        } catch (SQLException exception) {
            throw new AccesoDatosException("Error al listar categorías", exception);
        }
    }

    public Optional<Categoria> buscarPorId(UUID id) {
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(CategoriaSql.BUSCAR_POR_ID)) {
            statement.setObject(1, id);
            try (ResultSet rs = statement.executeQuery()) {
                return rs.next() ? Optional.of(categoriaMapper.mapear(rs)) : Optional.empty();
            }
        } catch (SQLException exception) {
            throw new AccesoDatosException("Error al buscar categoría por id", exception);
        }
    }

    public Optional<Categoria> buscarPorNombre(String nombre) {
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(CategoriaSql.BUSCAR_POR_NOMBRE)) {
            statement.setString(1, nombre);
            try (ResultSet rs = statement.executeQuery()) {
                return rs.next() ? Optional.of(categoriaMapper.mapear(rs)) : Optional.empty();
            }
        } catch (SQLException exception) {
            throw new AccesoDatosException("Error al buscar categoría por nombre", exception);
        }
    }

    public Categoria insertar(Categoria categoria) {
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(CategoriaSql.INSERTAR)) {
            statement.setObject(1, categoria.getId());
            statement.setObject(2, categoria.getAplicativoId());
            statement.setString(3, categoria.getNombre());
            statement.setString(4, categoria.getDescripcion());
            statement.setBoolean(5, Boolean.TRUE.equals(categoria.getActivo()));
            statement.executeUpdate();
            return categoria;
        } catch (SQLException exception) {
            throw new AccesoDatosException("Error al insertar categoría", exception);
        }
    }

    public Categoria actualizar(Categoria categoria) {
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(CategoriaSql.ACTUALIZAR)) {
            statement.setObject(1, categoria.getAplicativoId());
            statement.setString(2, categoria.getNombre());
            statement.setString(3, categoria.getDescripcion());
            statement.setBoolean(4, Boolean.TRUE.equals(categoria.getActivo()));
            statement.setObject(5, categoria.getId());
            statement.executeUpdate();
            return categoria;
        } catch (SQLException exception) {
            throw new AccesoDatosException("Error al actualizar categoría", exception);
        }
    }
}
