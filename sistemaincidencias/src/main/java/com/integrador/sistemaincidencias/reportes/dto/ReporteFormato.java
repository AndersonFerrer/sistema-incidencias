package com.integrador.sistemaincidencias.reportes.dto;

/**
 * Formato del archivo de exportacion solicitado en
 * {@code GET /api/reportes/exportar} (RF-44).
 *
 * El servicio solo acepta {@link #PDF} o {@link #XLSX} en PR2; el resto
 * produce {@code 400} en el controller mediante
 * {@link com.integrador.sistemaincidencias.shared.exception.ReglaNegocioException}.
 * En PR1 este enum solo se declara para fijar el contrato del placeholder
 * {@code ReporteService.exportar(...)} que se cablea en PR2.
 */
public enum ReporteFormato {

    JSON("json"),
    PDF("pdf"),
    XLSX("xlsx");

    private final String codigo;

    ReporteFormato(String codigo) {
        this.codigo = codigo;
    }

    public String codigo() {
        return codigo;
    }

    /**
     * Resuelve la cadena cruda del query string.
     *
     * @throws com.integrador.sistemaincidencias.shared.exception.ReglaNegocioException
     *         si el valor no es {@code json|pdf|xlsx}. {@code csv} y vacio producen 400.
     */
    public static ReporteFormato desde(String valor) {
        if (valor == null || valor.isBlank()) {
            throw new com.integrador.sistemaincidencias.shared.exception.ReglaNegocioException(
                    "Formato de exportacion requerido. Valores permitidos: json, pdf, xlsx");
        }
        String normalizado = valor.trim().toLowerCase();
        for (ReporteFormato f : values()) {
            if (f.codigo.equals(normalizado)) {
                return f;
            }
        }
        throw new com.integrador.sistemaincidencias.shared.exception.ReglaNegocioException(
                "Formato invalido. Valores permitidos: json, pdf, xlsx");
    }
}
