package com.integrador.sistemaincidencias.auditoria.service;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

import com.integrador.sistemaincidencias.auditoria.dao.AuditEventoDao;
import com.integrador.sistemaincidencias.shared.exception.AccesoDatosException;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * Cubre el contrato fire-and-forget del audit log (RNF-09): si el insert
 * falla (ej. tabla no creada en dev, BD caida), NO debe propagar la
 * excepcion al caller. La operacion de negocio sigue.
 *
 * <p>Si la auditoria fallara, hariamos que un login no funcione porque
 * no se registro el LOGIN. Eso es inaceptable.</p>
 */
@ExtendWith(MockitoExtension.class)
class AuditServiceTest {

    private static final UUID USUARIO_ID = UUID.fromString("00000000-0000-0000-0000-0000000000A1");
    private static final UUID RECURSO_ID = UUID.fromString("00000000-0000-0000-0000-0000000000B1");

    @Mock private AuditEventoDao auditEventoDao;
    @InjectMocks private AuditService service;

    @Nested
    @DisplayName("happy path")
    class HappyPath {

        @Test
        @DisplayName("registrar delega al DAO con los 5 argumentos")
        void registrar_delega() {
            service.registrar(USUARIO_ID, "USER_CREATED", "usuarios", RECURSO_ID, "{\"x\":1}", true);

            verify(auditEventoDao, times(1)).registrar(
                    eq(USUARIO_ID), eq("USER_CREATED"), eq("usuarios"),
                    eq(RECURSO_ID), eq("{\"x\":1}"), eq(true));
        }

        @Test
        @DisplayName("registrar (overload 4-args) -> metadata null, exitoso=true")
        void registrar_overload_4args() {
            service.registrar(USUARIO_ID, "LOGIN", "auth", null);

            verify(auditEventoDao).registrar(
                    eq(USUARIO_ID), eq("LOGIN"), eq("auth"),
                    isNull(), isNull(), eq(true));
        }

        @Test
        @DisplayName("registrarAnonimo -> usuarioId null, exitoso=false")
        void registrar_anonimo() {
            service.registrarAnonimo("LOGIN_FAILED", "auth", "{\"email\":\"x\"}");

            verify(auditEventoDao).registrar(
                    isNull(), eq("LOGIN_FAILED"), eq("auth"),
                    isNull(), eq("{\"email\":\"x\"}"), eq(false));
        }
    }

    @Nested
    @DisplayName("fire-and-forget — la auditoria NO rompe la operacion de negocio")
    class FireAndForget {

        @Test
        @DisplayName("DAO lanza AccesoDatosException -> service no propaga")
        void dao_falla_no_propaga() {
            doThrow(new AccesoDatosException("BD caida"))
                    .when(auditEventoDao).registrar(any(), anyString(), anyString(), any(), any(), anyBoolean());

            assertThatCode(() -> service.registrar(
                    USUARIO_ID, "LOGIN", "auth", null, null, true))
                    .doesNotThrowAnyException();

            verify(auditEventoDao, times(1)).registrar(
                    eq(USUARIO_ID), eq("LOGIN"), eq("auth"),
                    isNull(), isNull(), eq(true));
        }

        @Test
        @DisplayName("DAO falla con null metadata tambien -> no propaga")
        void dao_falla_sin_metadata() {
            doThrow(new AccesoDatosException("insert failed"))
                    .when(auditEventoDao).registrar(any(), anyString(), anyString(), any(), any(), anyBoolean());

            assertThatCode(() -> service.registrarAnonimo("LOGIN_DEMO_FAILED", "auth", "x"))
                    .doesNotThrowAnyException();
        }
    }
}
