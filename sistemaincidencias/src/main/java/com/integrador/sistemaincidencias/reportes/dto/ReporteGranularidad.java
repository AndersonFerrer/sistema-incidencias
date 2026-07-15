package com.integrador.sistemaincidencias.reportes.dto;

/**
 * Granularidad de la serie temporal del reporte (RF-43, design.md D4).
 *
 * PostgreSQL {@code date_trunc} no acepta de forma segura un identificador SQL
 * arbitrario; por eso cada valor de este enum esta atado a una sentencia
 * preparada completa en {@code sql.ReporteSql} (Q6/Q7/Q8).
 *
 * <ul>
 *   <li>{@link #DIARIA}: buckets por dia ({@code date_trunc('day')}).</li>
 *   <li>{@link #SEMANAL}: buckets por semana ISO ({@code date_trunc('week')}).
 *       Default del endpoint cuando no se envia el parametro.</li>
 *   <li>{@link #MENSUAL}: buckets por mes ({@code date_trunc('month')}).</li>
 * </ul>
 */
public enum ReporteGranularidad {

    DIARIA("Diaria"),
    SEMANAL("Semanal"),
    MENSUAL("Mensual");

    private final String etiqueta;

    ReporteGranularidad(String etiqueta) {
        this.etiqueta = etiqueta;
    }

    public String etiqueta() {
        return etiqueta;
    }

    /**
     * Resuelve la cadena cruda recibida en el query string. Acepta el codigo
     * canonico del enum y la version en minusculas/mayusculas que llega por URL.
     *
     * @throws com.integrador.sistemaincidencias.shared.exception.ReglaNegocioException
     *         si el valor no coincide con ninguno de los codigos validos.
     */
    public static ReporteGranularidad desde(String valor) {
        if (valor == null || valor.isBlank()) {
            return SEMANAL;
        }
        String normalizado = valor.trim().toUpperCase();
        for (ReporteGranularidad g : values()) {
            if (g.name().equals(normalizado)) {
                return g;
            }
        }
        throw new com.integrador.sistemaincidencias.shared.exception.ReglaNegocioException(
                "Granularidad invalida. Valores permitidos: Diaria, Semanal, Mensual");
    }
}
