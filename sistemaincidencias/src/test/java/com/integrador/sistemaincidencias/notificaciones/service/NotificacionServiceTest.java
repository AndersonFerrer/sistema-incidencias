package com.integrador.sistemaincidencias.notificaciones.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.integrador.sistemaincidencias.notificaciones.dao.NotificacionDao;
import com.integrador.sistemaincidencias.notificaciones.dto.NotificacionCountResponse;
import com.integrador.sistemaincidencias.notificaciones.model.Notificacion;
import com.integrador.sistemaincidencias.shared.exception.RecursoNoEncontradoException;
import com.integrador.sistemaincidencias.shared.pagination.PageRequest;
import com.integrador.sistemaincidencias.shared.pagination.PageResult;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * Cubre la regla de aislamiento por usuario: las notificaciones SIEMPRE
 * se filtran por usuarioId en el SQL. Ningun endpoint acepta que el caller
 * especifique otro usuarioId (todas las mutaciones reciben el usuarioId
 * resuelto del token en el controller).
 *
 * <p><b>RF-40</b> badge count por usuario. <b>RF-38</b> historial scoped. <b>RF-39</b>
 * marcar como leida individual o todas.</p>
 */
@ExtendWith(MockitoExtension.class)
class NotificacionServiceTest {

    private static final UUID USUARIO_ID = UUID.fromString("00000000-0000-0000-0000-0000000000A1");
    private static final UUID OTRO_USUARIO_ID = UUID.fromString("00000000-0000-0000-0000-0000000000A2");
    private static final UUID NOTIF_ID = UUID.fromString("00000000-0000-0000-0000-0000000000B1");

    @Mock private NotificacionDao notificacionDao;
    @InjectMocks private NotificacionService service;

    private Notificacion notiDelUsuario;
    private Notificacion notiDeOtro;

    @BeforeEach
    void setUp() {
        LocalDateTime now = LocalDateTime.now();
        notiDelUsuario = Notificacion.builder()
                .id(NOTIF_ID).usuarioId(USUARIO_ID).titulo("Mia")
                .creadoEn(now).build();
        notiDeOtro = Notificacion.builder()
                .id(UUID.randomUUID()).usuarioId(OTRO_USUARIO_ID).titulo("Otra")
                .creadoEn(now).build();
    }

    @Nested
    @DisplayName("listar / contar — scope por usuario (RF-40)")
    class ListarYContar {

        @Test
        @DisplayName("listar pasa el usuarioId al DAO (no delega a 'todos')")
        void listar_scoped() {
            when(notificacionDao.listar(eq(USUARIO_ID), any(PageRequest.class), eq(false)))
                    .thenReturn(PageResult.<Notificacion>builder()
                            .contenido(List.of(notiDelUsuario)).total(1).page(0).size(20).build());

            service.listar(USUARIO_ID, PageRequest.of(0, 20), false);

            verify(notificacionDao).listar(eq(USUARIO_ID), any(PageRequest.class), eq(false));
            // Nunca consultar con OTRO usuario (el boolean default es false; cualquier
            // valor es OK para este assert).
            verify(notificacionDao, never()).listar(eq(OTRO_USUARIO_ID), any(PageRequest.class), any(boolean.class));
        }

        @Test
        @DisplayName("contarNoLeidas devuelve el count del usuario actual")
        void contar_scoped() {
            when(notificacionDao.contarNoLeidas(USUARIO_ID)).thenReturn(7L);

            NotificacionCountResponse out = service.contarNoLeidas(USUARIO_ID);

            assertThat(out.getTotal()).isEqualTo(7L);
            verify(notificacionDao).contarNoLeidas(USUARIO_ID);
        }
    }

    @Nested
    @DisplayName("marcarLeida (RF-39)")
    class MarcarLeida {

        @Test
        @DisplayName("Marca como leida una notificacion del usuario actual")
        void marca_propia() {
            when(notificacionDao.marcarLeida(eq(NOTIF_ID), eq(USUARIO_ID), any()))
                    .thenReturn(true);
            when(notificacionDao.buscarPorId(NOTIF_ID)).thenReturn(Optional.of(notiDelUsuario));

            service.marcarLeida(NOTIF_ID, USUARIO_ID);

            verify(notificacionDao).marcarLeida(eq(NOTIF_ID), eq(USUARIO_ID), any());
        }

        @Test
        @DisplayName("DAO devuelve false (no existe o no es del usuario) -> RecursoNoEncontradoException")
        void dao_devuelve_false() {
            when(notificacionDao.marcarLeida(eq(NOTIF_ID), eq(USUARIO_ID), any()))
                    .thenReturn(false);

            assertThatThrownBy(() -> service.marcarLeida(NOTIF_ID, USUARIO_ID))
                    .isInstanceOf(RecursoNoEncontradoException.class);
        }
    }

    @Nested
    @DisplayName("marcarTodasLeidas / eliminar (RF-39)")
    class MarcarTodasYEliminar {

        @Test
        @DisplayName("marcarTodasLeidas devuelve count de afectadas")
        void marcar_todas() {
            when(notificacionDao.marcarTodasLeidas(eq(USUARIO_ID), any())).thenReturn(5L);

            var out = service.marcarTodasLeidas(USUARIO_ID);

            assertThat(out.getActualizadas()).isEqualTo(5L);
            verify(notificacionDao).marcarTodasLeidas(eq(USUARIO_ID), any());
        }

        @Test
        @DisplayName("eliminar noti del usuario actual -> OK")
        void eliminar_propia() {
            when(notificacionDao.eliminar(eq(NOTIF_ID), eq(USUARIO_ID))).thenReturn(true);

            service.eliminar(NOTIF_ID, USUARIO_ID);

            verify(notificacionDao).eliminar(eq(NOTIF_ID), eq(USUARIO_ID));
        }

        @Test
        @DisplayName("eliminar noti que no es del usuario -> RecursoNoEncontradoException")
        void eliminar_ajena() {
            when(notificacionDao.eliminar(eq(NOTIF_ID), eq(USUARIO_ID))).thenReturn(false);

            assertThatThrownBy(() -> service.eliminar(NOTIF_ID, USUARIO_ID))
                    .isInstanceOf(RecursoNoEncontradoException.class);
        }
    }
}
