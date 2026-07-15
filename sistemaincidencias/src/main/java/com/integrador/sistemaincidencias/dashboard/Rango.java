package com.integrador.sistemaincidencias.dashboard;

import com.integrador.sistemaincidencias.shared.exception.ReglaNegocioException;
import java.time.LocalDateTime;

/**
 * Rango temporal aceptado por el endpoint {@code GET /api/dashboard}.
 *
 * Codigos publicos expuestos en la URL: {@code 7d}, {@code 30d}, {@code 90d}, {@code all}.
 * El valor por defecto es {@link #RANGO_30D} cuando el cliente no envia el parametro.
 *
 * Cada entrada expone:
 * <ul>
 *   <li>{@link #codigo}: cadena que viaja por la URL y se devuelve en {@code rangoAplicado}.</li>
 *   <li>{@link #dias}: numero de dias hacia atras a aplicar como limite inferior
 *       sobre {@code creado_en}; {@code null} en {@link #TODO} para desactivar el filtro temporal.</li>
 * </ul>
 */
public enum Rango {

    RANGO_7D("7d", 7),
    RANGO_30D("30d", 30),
    RANGO_90D("90d", 90),
    TODO("all", null);

    private final String codigo;
    private final Integer dias;

    Rango(String codigo, Integer dias) {
        this.codigo = codigo;
        this.dias = dias;
    }

    public String codigo() {
        return codigo;
    }

    public Integer dias() {
        return dias;
    }

    /**
     * Resuelve el parametro crudo recibido en la URL.
     *
     * @throws ReglaNegocioException si el valor no coincide con ninguno de los codigos validos.
     */
    public static Rango desde(String valor) {
        if (valor == null || valor.isBlank()) {
            return RANGO_30D;
        }
        String normalizado = valor.trim().toLowerCase();
        for (Rango r : values()) {
            if (r.codigo.equalsIgnoreCase(normalizado)) {
                return r;
            }
        }
        throw new ReglaNegocioException("Rango invalido. Valores permitidos: 7d, 30d, 90d, all");
    }

    /**
     * Calcula el limite inferior de fecha para este rango. Devuelve {@code null} cuando
     * el rango es {@link #TODO}, indicando que no debe aplicarse filtro temporal.
     */
    public LocalDateTime desdeOrNull() {
        if (dias == null) {
            return null;
        }
        return LocalDateTime.now().minusDays(dias);
    }
}