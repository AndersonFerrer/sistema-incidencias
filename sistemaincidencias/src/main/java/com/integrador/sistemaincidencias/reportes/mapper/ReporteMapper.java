package com.integrador.sistemaincidencias.reportes.mapper;

import com.integrador.sistemaincidencias.dashboard.dto.IncidenciaResumenResponse;
import com.integrador.sistemaincidencias.incidencias.model.Prioridad;
import com.integrador.sistemaincidencias.reportes.dto.ReporteConteoCategoriaResponse;
import com.integrador.sistemaincidencias.reportes.dto.ReporteResumenAgenteResponse;
import com.integrador.sistemaincidencias.reportes.dto.ReporteTendenciaResponse;
import java.sql.Date;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.UUID;
import org.springframework.stereotype.Component;

/**
 * Convierte filas de {@link ResultSet} en los DTOs del reporte.
 *
 * Reutiliza el slim DTO {@code dashboard.dto.IncidenciaResumenResponse} para el
 * detalle (sin duplicar columnas), tal como exige design.md seccion 4.1.
 */
@Component
public class ReporteMapper {

    public ReporteConteoCategoriaResponse mapearCategoria(ResultSet rs) throws SQLException {
        return ReporteConteoCategoriaResponse.builder()
                .categoriaId(rs.getObject("categoria_id", UUID.class))
                .categoriaNombre(rs.getString("categoria_nombre"))
                .total(rs.getLong("total"))
                .build();
    }

    public ReporteTendenciaResponse mapearTendencia(ResultSet rs) throws SQLException {
        Date fecha = rs.getDate("bucket_inicio");
        return ReporteTendenciaResponse.builder()
                .bucketInicio(fecha == null ? null : fecha.toLocalDate())
                .total(rs.getLong("total"))
                .build();
    }

    public ReporteResumenAgenteResponse mapearResumenAgente(ResultSet rs) throws SQLException {
        double promedio = rs.getDouble("promedio_resolucion_horas");
        boolean promedioEsNull = rs.wasNull();
        return ReporteResumenAgenteResponse.builder()
                .agenteId(rs.getObject("agente_id", UUID.class))
                .agenteNombre(rs.getString("agente_nombre"))
                .totalAsignadas(rs.getLong("total_asignadas"))
                .resueltas(rs.getLong("resueltas"))
                .pendientes(rs.getLong("pendientes"))
                .enProceso(rs.getLong("en_proceso"))
                .promedioResolucionHoras(promedioEsNull ? null : promedio)
                .build();
    }

    public IncidenciaResumenResponse mapearDetalle(ResultSet rs) throws SQLException {
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
