package com.integrador.sistemaincidencias.dashboard.mapper;

import com.integrador.sistemaincidencias.dashboard.dto.CategoriaConteoResponse;
import com.integrador.sistemaincidencias.dashboard.dto.IncidenciaResumenResponse;
import com.integrador.sistemaincidencias.dashboard.dto.TendenciaSemanalResponse;
import com.integrador.sistemaincidencias.incidencias.model.Prioridad;
import java.sql.Date;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.UUID;
import org.springframework.stereotype.Component;

/**
 * Convierte filas de {@link ResultSet} en los DTOs del dashboard.
 *
 * Solo mapea los tipos de salida (no las entidades internas del dominio);
 * el servicio nunca expone modelos crudos al frontend.
 */
@Component
public class DashboardMapper {

    public CategoriaConteoResponse mapearCategoria(ResultSet rs) throws SQLException {
        return CategoriaConteoResponse.builder()
                .categoriaId(rs.getObject("categoria_id", UUID.class))
                .categoriaNombre(rs.getString("categoria_nombre"))
                .total(rs.getLong("total"))
                .build();
    }

    public TendenciaSemanalResponse mapearTendencia(ResultSet rs) throws SQLException {
        Date fecha = rs.getDate("semana_inicio");
        return TendenciaSemanalResponse.builder()
                .semanaInicio(fecha == null ? null : fecha.toLocalDate())
                .total(rs.getLong("total"))
                .build();
    }

    public IncidenciaResumenResponse mapearResumen(ResultSet rs) throws SQLException {
        return IncidenciaResumenResponse.builder()
                .id(rs.getObject("id", UUID.class))
                .codigo(rs.getString("codigo"))
                .titulo(rs.getString("titulo"))
                .categoriaNombre(rs.getString("categoria_nombre"))
                .asignadoA(rs.getObject("asignado_a", UUID.class))
                .estadoProcesoCodigo(rs.getString("estado_proceso_codigo"))
                .estadoAprobacionCodigo(rs.getString("estado_aprobacion_codigo"))
                .prioridad(Prioridad.valueOf(rs.getString("prioridad")))
                .creadoEn(toLocalDateTime(rs.getTimestamp("creado_en")))
                .resueltoEn(toLocalDateTime(rs.getTimestamp("resuelto_en")))
                .build();
    }

    private LocalDateTime toLocalDateTime(Timestamp timestamp) {
        return timestamp == null ? null : timestamp.toLocalDateTime();
    }
}