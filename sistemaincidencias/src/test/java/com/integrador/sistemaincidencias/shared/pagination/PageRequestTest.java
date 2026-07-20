package com.integrador.sistemaincidencias.shared.pagination;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * Cubre el contrato del helper {@link PageRequest#of} que los controllers
 * invocan sin saber si el caller mando valores validos.
 *
 * <p><b>RF-RNF-03</b>: paginacion con maximo 20 registros por pagina (default)
 * y techo 100 (cap para no permitir queries sin limites). Las notis tienen
 * su propio cap de 50 (cubierto por NotificacionController).</p>
 */
class PageRequestTest {

    @Test
    @DisplayName("page=null y size=null -> defaults 0 y 20")
    void defaults_cuando_todo_null() {
        PageRequest req = PageRequest.of(null, null);
        assertThat(req.getPage()).isZero();
        assertThat(req.getSize()).isEqualTo(20);
    }

    @Test
    @DisplayName("page negativo se normaliza a 0; size <= 0 cae al default 20")
    void valores_invalidos_se_normalizan() {
        PageRequest req = PageRequest.of(-3, 0);
        assertThat(req.getPage()).isZero();
        assertThat(req.getSize()).isEqualTo(20);

        PageRequest req2 = PageRequest.of(-1, -10);
        assertThat(req2.getPage()).isZero();
        assertThat(req2.getSize()).isEqualTo(20);
    }

    @Test
    @DisplayName("size > 100 se capea a 100 para no tumbar la BD")
    void size_excesivo_se_capea() {
        PageRequest req = PageRequest.of(0, 9999);
        assertThat(req.getSize()).isEqualTo(100);
    }

    @Test
    @DisplayName("page >= 0 y size entre 1 y 100 se aceptan tal cual")
    void valores_validos_se_conservan() {
        PageRequest req = PageRequest.of(2, 25);
        assertThat(req.getPage()).isEqualTo(2);
        assertThat(req.getSize()).isEqualTo(25);
    }

    @Test
    @DisplayName("offset() = page * size se usa en el SQL del DAO")
    void offset_es_page_por_size() {
        assertThat(PageRequest.of(0, 20).offset()).isZero();
        assertThat(PageRequest.of(2, 20).offset()).isEqualTo(40);
        assertThat(PageRequest.of(3, 50).offset()).isEqualTo(150);
    }
}
