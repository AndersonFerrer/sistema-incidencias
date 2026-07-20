package com.integrador.sistemaincidencias.usuarios.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

import com.integrador.sistemaincidencias.auth.service.AuthService;
import com.integrador.sistemaincidencias.shared.exception.AccesoDenegadoException;
import com.integrador.sistemaincidencias.usuarios.model.Rol;
import com.integrador.sistemaincidencias.usuarios.model.Usuario;
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
 * Cubre la unica pieza de seguridad transversal: el gate de rol por endpoint.
 * Es la frontera RBAC de cada controller — si esto cambia, cambia todo.
 *
 * <p><b>RF-05</b>: Control de acceso por roles. Esta clase es el "policia"
 * que cada controller invoca antes de delegar al service.</p>
 */
@ExtendWith(MockitoExtension.class)
class PermisoAdministracionServiceTest {

    private static final String AUTH = "Bearer jwt-valido";
    private static final UUID USER_ID = UUID.fromString("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");

    @Mock
    private AuthService authService;

    @InjectMocks
    private PermisoAdministracionService service;

    private Usuario admin;
    private Usuario agente;
    private Usuario usuarioFinal;

    @BeforeEach
    void setUp() {
        Rol rolAdmin = Rol.builder().id(UUID.randomUUID()).codigo("ADMINISTRADOR").nombre("Admin").activo(true).build();
        Rol rolAgente = Rol.builder().id(UUID.randomUUID()).codigo("AGENTE").nombre("Agente").activo(true).build();
        Rol rolUsuario = Rol.builder().id(UUID.randomUUID()).codigo("USUARIO").nombre("Usuario").activo(true).build();

        admin = Usuario.builder().id(USER_ID).nombre("Admin").email("admin@sistema.com")
                .rol(rolAdmin).activo(true).avatarUrl(null).passwordHash("x").build();
        agente = Usuario.builder().id(UUID.randomUUID()).nombre("Agente").email("agente@sistema.com")
                .rol(rolAgente).activo(true).avatarUrl(null).passwordHash("x").build();
        usuarioFinal = Usuario.builder().id(UUID.randomUUID()).nombre("User").email("usuario@sistema.com")
                .rol(rolUsuario).activo(true).avatarUrl(null).passwordHash("x").build();
    }

    @Nested
    @DisplayName("validarAdministrador")
    class AdminGate {

        @Test
        @DisplayName("ADMINISTRADOR pasa -> devuelve el Usuario")
        void admin_pasa() {
            when(authService.obtenerUsuarioActual(AUTH)).thenReturn(admin);

            Usuario out = service.validarAdministrador(AUTH);

            assertThat(out.getEmail()).isEqualTo("admin@sistema.com");
        }

        @Test
        @DisplayName("AGENTE -> 403 AccesoDenegadoException")
        void agente_rechazado() {
            when(authService.obtenerUsuarioActual(AUTH)).thenReturn(agente);

            assertThatThrownBy(() -> service.validarAdministrador(AUTH))
                    .isInstanceOf(AccesoDenegadoException.class)
                    .hasMessageContaining("administrador");
        }

        @Test
        @DisplayName("USUARIO -> 403 AccesoDenegadoException")
        void usuario_rechazado() {
            when(authService.obtenerUsuarioActual(AUTH)).thenReturn(usuarioFinal);

            assertThatThrownBy(() -> service.validarAdministrador(AUTH))
                    .isInstanceOf(AccesoDenegadoException.class);
        }
    }

    @Nested
    @DisplayName("validarAutenticado")
    class AuthenticatedGate {

        @Test
        @DisplayName("Cualquier rol autenticado pasa -> devuelve el Usuario")
        void cualquier_rol_pasa() {
            when(authService.obtenerUsuarioActual(AUTH)).thenReturn(agente);

            Usuario out = service.validarAutenticado(AUTH);

            assertThat(out.getRol().getCodigo()).isEqualTo("AGENTE");
        }

        @Test
        @DisplayName("Propaga el throw de AuthService si el token no es valido")
        void token_invalido_propaga_error() {
            when(authService.obtenerUsuarioActual("Bearer bad"))
                    .thenThrow(new com.integrador.sistemaincidencias.shared.exception.AutenticacionException("Token invalido"));

            assertThatThrownBy(() -> service.validarAutenticado("Bearer bad"))
                    .isInstanceOf(com.integrador.sistemaincidencias.shared.exception.AutenticacionException.class);
        }
    }
}
