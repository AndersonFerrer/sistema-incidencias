package com.integrador.sistemaincidencias.incidencias.dao;

import com.integrador.sistemaincidencias.incidencias.mapper.AdjuntoMapper;
import com.integrador.sistemaincidencias.incidencias.model.Adjunto;
import com.integrador.sistemaincidencias.incidencias.sql.AdjuntoSql;
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
public class AdjuntoDao {

    private final DataSource dataSource;
    private final AdjuntoMapper adjuntoMapper;

    public List<Adjunto> listarPorIncidencia(UUID incidenciaId) {
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(AdjuntoSql.LISTAR_POR_INCIDENCIA)) {
            statement.setObject(1, incidenciaId);
            try (ResultSet rs = statement.executeQuery()) {
                List<Adjunto> adjuntos = new ArrayList<>();
                while (rs.next()) {
                    adjuntos.add(adjuntoMapper.mapear(rs));
                }
                return adjuntos;
            }
        } catch (SQLException exception) {
            throw new AccesoDatosException("Error al listar adjuntos", exception);
        }
    }

    public Adjunto insertar(Adjunto adjunto) {
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(AdjuntoSql.INSERTAR)) {
            statement.setObject(1, adjunto.getId());
            statement.setObject(2, adjunto.getIncidenciaId());
            statement.setObject(3, adjunto.getSubidoPor());
            statement.setString(4, adjunto.getNombreArchivo());
            statement.setString(5, adjunto.getTipoMime());
            statement.setInt(6, adjunto.getTamanoBytes());
            statement.setString(7, adjunto.getUrl());
            statement.executeUpdate();
            return adjunto;
        } catch (SQLException exception) {
            throw new AccesoDatosException("Error al insertar adjunto", exception);
        }
    }
}
