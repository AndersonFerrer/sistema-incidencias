package com.integrador.sistemaincidencias.auth.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.integrador.sistemaincidencias.auditoria.service.AuditService;
import com.integrador.sistemaincidencias.auth.dto.AuthResponse;
import com.integrador.sistemaincidencias.auth.jwt.JwtService;
import com.integrador.sistemaincidencias.shared.exception.AutenticacionException;
import com.integrador.sistemaincidencias.usuarios.dao.UsuarioDao;
import com.integrador.sistemaincidencias.usuarios.model.Rol;
import com.integrador.sistemaincidencias.usuarios.model.Usuario;
import java.time.LocalDateTime;
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
import org.springframework.security.crypto.password.PasswordEncoder;

/**
 * Cubre CP-AUTH-001..004 (login, password incorrecta, email inexistente, sesion)
 * + los flujos de demo login (RF-02) y cambio de password propio (RF-36).
 *
 * <p>Tambien verifica que cada accion auditable dispara el evento correspondiente
 * en AuditService (RNF-09 — audit log global cross-modulo).</p>
 */
@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    private static final String AUTH = "Bearer jwt-valido";
    private static final UUID ID = UUID.fromString("00000000-0000-0000-0000-000000000001");

    @Mock private UsuarioDao usuarioDao;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private JwtService jwtService;
    @Mock private AuditService auditService;

    @InjectMocks private AuthService authService;

    private Rol rolAdmin;
    private Usuario admin;

    @BeforeEach
    void setUp() {
        rolAdmin = Rol.builder().id(UUID.randomUUID()).codigo("ADMINISTRADOR").nombre("Admin").activo(true).build();
        admin = Usuario.builder()
                .id(ID).nombre("Admin").email("admin@sistema.com")
                .passwordHash("$2a$10$hash").rol(rolAdmin).activo(true)
                .avatarUrl(null).creadoEn(LocalDateTime.now()).actualizadoEn(LocalDateTime.now()).build();
    }

    @Nested
    @DisplayName("CP-AUTH-001: login con credenciales validas")
    class LoginExitoso {

        @Test
        @DisplayName("Email + password correctos -> 200 OK con JWT + user")
        void devuelve_token_y_usuario() {
            when(usuarioDao.buscarPorEmail("admin@sistema.com")).thenReturn(Optional.of(admin));
            when(passwordEncoder.matches(eq("admin123"), eq("$2a$10$hash"))).thenReturn(true);
            when(jwtService.generarToken(admin)).thenReturn("jwt-firmado");
            when(jwtService.calcularExpiracionLocal()).thenReturn(LocalDateTime.now().plusHours(2));

            AuthResponse out = authService.login("admin@sistema.com", "admin123");

            assertThat(out.getToken()).isEqualTo("jwt-firmado");
            assertThat(out.getUsuario().getEmail()).isEqualTo("admin@sistema.com");
            assertThat(out.getUsuario().getRol()).isEqualTo("ADMINISTRADOR");
        }

        @Test
        @DisplayName("Login exitoso escribe evento LOGIN en audit log")
        void audita_login_exitoso() {
            when(usuarioDao.buscarPorEmail("admin@sistema.com")).thenReturn(Optional.of(admin));
            when(passwordEncoder.matches(anyString(), anyString())).thenReturn(true);
            when(jwtService.generarToken(any())).thenReturn("jwt");
            when(jwtService.calcularExpiracionLocal()).thenReturn(LocalDateTime.now().plusHours(2));

            authService.login("admin@sistema.com", "admin123");

            verify(auditService, times(1)).registrar(
                    eq(admin.getId()), eq("LOGIN"), eq("auth"), eq(null), eq(null), eq(true));
        }
    }

    @Nested
    @DisplayName("CP-AUTH-002 + CP-AUTH-003: login fallido")
    class LoginFallido {

        @Test
        @DisplayName("CP-AUTH-002: password incorrecta -> 401 AutenticacionException")
        void password_incorrecta() {
            when(usuarioDao.buscarPorEmail("admin@sistema.com")).thenReturn(Optional.of(admin));
            when(passwordEncoder.matches(eq("cualquier"), eq("$2a$10$hash"))).thenReturn(false);

            assertThatThrownBy(() -> authService.login("admin@sistema.com", "cualquier"))
                    .isInstanceOf(AutenticacionException.class)
                    .hasMessageContaining("inv");
        }

        @Test
        @DisplayName("CP-AUTH-003: email no registrado -> 401 AutenticacionException")
        void email_inexistente() {
            when(usuarioDao.buscarPorEmail("fantasma@sistema.com")).thenReturn(Optional.empty());

            assertThatThrownBy(() -> authService.login("fantasma@sistema.com", "admin123"))
                    .isInstanceOf(AutenticacionException.class);
        }

        @Test
        @DisplayName("Login fallido escribe LOGIN_FAILED en audit (anonimo)")
        void audita_login_fallido() {
            when(usuarioDao.buscarPorEmail("noexiste@sistema.com")).thenReturn(Optional.empty());

            assertThatThrownBy(() -> authService.login("noexiste@sistema.com", "x"));
            // No es necesario verificar el email exacto (sanitizado); basta con que el evento se loguee.
            verify(auditService, times(1)).registrarAnonimo(eq("LOGIN_FAILED"), eq("auth"), anyString());
        }
    }

    @Nested
    @DisplayName("RF-02: loginDemo (cuenta seed fijo)")
    class DemoLogin {

        @Test
        @DisplayName("Seed de demo@sistema.com activo -> login demo exitoso")
        void demo_login_exitoso() {
            when(usuarioDao.buscarDemoPorEmail(AuthService.DEMO_EMAIL))
                    .thenReturn(Optional.of(admin));
            when(jwtService.generarToken(admin)).thenReturn("jwt-demo");
            when(jwtService.calcularExpiracionLocal()).thenReturn(LocalDateTime.now().plusHours(2));

            AuthResponse out = authService.loginDemo(null);

            assertThat(out.getToken()).isEqualTo("jwt-demo");
            verify(auditService, times(1)).registrar(eq(admin.getId()), eq("LOGIN_DEMO"), eq("auth"),
                    eq(null), eq(null), eq(true));
        }

        @Test
        @DisplayName("Seed inactivo (o ausente) -> 401 y audita LOGIN_DEMO_FAILED")
        void demo_login_fallido() {
            when(usuarioDao.buscarDemoPorEmail(AuthService.DEMO_EMAIL)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> authService.loginDemo(null))
                    .isInstanceOf(AutenticacionException.class);

            verify(auditService, times(1))
                    .registrarAnonimo(eq("LOGIN_DEMO_FAILED"), eq("auth"), anyString());
        }
    }

    // El flujo de "cambiarMiPassword" propio vive en UsuarioService.cambiarPasswordPropia()
    // (no en AuthService). El cambio-self de password se cubre en UsuarioServiceSelfTest.
}
