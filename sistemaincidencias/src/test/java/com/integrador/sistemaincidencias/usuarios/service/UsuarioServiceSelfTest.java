package com.integrador.sistemaincidencias.usuarios.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.integrador.sistemaincidencias.shared.exception.AccesoDenegadoException;
import com.integrador.sistemaincidencias.shared.exception.RecursoNoEncontradoException;
import com.integrador.sistemaincidencias.shared.exception.ReglaNegocioException;
import com.integrador.sistemaincidencias.usuarios.dao.RolDao;
import com.integrador.sistemaincidencias.usuarios.dao.UsuarioDao;
import com.integrador.sistemaincidencias.usuarios.dto.ActualizarPerfilRequest;
import com.integrador.sistemaincidencias.usuarios.dto.CambiarPasswordPropiaRequest;
import com.integrador.sistemaincidencias.usuarios.mapper.UsuarioDtoMapper;
import com.integrador.sistemaincidencias.usuarios.model.Rol;
import com.integrador.sistemaincidencias.usuarios.model.Usuario;
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

@ExtendWith(MockitoExtension.class)
class UsuarioServiceSelfTest {

    private static final String AUTH = "Bearer token";
    private static final UUID USUARIO_ID = UUID.fromString("11111111-1111-1111-1111-111111111111");
    private static final UUID OBJETIVO_ID = UUID.fromString("22222222-2222-2222-2222-222222222222");

    @Mock
    private UsuarioDao usuarioDao;

    @Mock
    private RolDao rolDao;

    @Mock
    private UsuarioDtoMapper usuarioDtoMapper;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private PermisoAdministracionService permisoAdministracionService;

    @InjectMocks
    private UsuarioService usuarioService;

    private Rol rolUsuario;
    private Rol rolAdmin;
    private Usuario usuarioNormal;
    private Usuario administrador;

    @BeforeEach
    void setUp() {
        rolUsuario = Rol.builder().id(UUID.randomUUID()).codigo("USUARIO").nombre("Usuario").activo(true).build();
        rolAdmin = Rol.builder().id(UUID.randomUUID()).codigo("ADMINISTRADOR").nombre("Admin").activo(true).build();

        usuarioNormal = Usuario.builder()
                .id(USUARIO_ID).nombre("Ana").email("ana@sistema.com")
                .passwordHash("hash-ana").rol(rolUsuario).activo(true).avatarUrl(null).build();

        administrador = Usuario.builder()
                .id(UUID.fromString("99999999-9999-9999-9999-999999999999"))
                .nombre("Admin").email("admin@sistema.com")
                .passwordHash("hash-admin").rol(rolAdmin).activo(true).avatarUrl(null).build();
    }

    @Nested
    @DisplayName("obtenerPerfil / actualizarPerfil")
    class SelfProfile {

        @Test
        @DisplayName("USUARIO puede leer y editar su propio perfil sin filtrar hash")
        void actualiza_perfil_usuario_normal() {
            when(permisoAdministracionService.validarAutenticado(AUTH)).thenReturn(usuarioNormal);
            when(usuarioDao.buscarPorId(USUARIO_ID)).thenReturn(Optional.of(usuarioNormal));

            ActualizarPerfilRequest request = new ActualizarPerfilRequest();
            request.setNombre("  Ana Actualizada  ");
            request.setAvatarUrl("https://example.com/avatar.png");

            usuarioService.actualizarPerfil(AUTH, request);

            verify(usuarioDao, times(1)).actualizarPerfil(
                    eq(USUARIO_ID),
                    eq("Ana Actualizada"),
                    eq("https://example.com/avatar.png"));
        }

        @Test
        @DisplayName("avatar vacio limpia el campo sin tocar el resto")
        void avatar_vacio_se_normaliza_a_null() {
            when(permisoAdministracionService.validarAutenticado(AUTH)).thenReturn(usuarioNormal);
            when(usuarioDao.buscarPorId(USUARIO_ID)).thenReturn(Optional.of(usuarioNormal));

            ActualizarPerfilRequest request = new ActualizarPerfilRequest();
            request.setNombre("Ana");
            request.setAvatarUrl("   ");

            usuarioService.actualizarPerfil(AUTH, request);

            verify(usuarioDao).actualizarPerfil(eq(USUARIO_ID), eq("Ana"), eq(null));
        }
    }

    @Nested
    @DisplayName("cambiarPasswordPropia")
    class SelfPassword {

        @Test
        @DisplayName("currentPassword valida -> reemplaza el hash y devuelve 204")
        void cambio_valido() {
            when(permisoAdministracionService.validarAutenticado(AUTH)).thenReturn(usuarioNormal);
            when(usuarioDao.buscarPorId(USUARIO_ID)).thenReturn(Optional.of(usuarioNormal));
            when(passwordEncoder.matches("vieja123", "hash-ana")).thenReturn(true);
            when(passwordEncoder.encode("nuevaClave123")).thenReturn("hash-nuevo");

            CambiarPasswordPropiaRequest request = new CambiarPasswordPropiaRequest();
            request.setCurrentPassword("vieja123");
            request.setNewPassword("nuevaClave123");

            usuarioService.cambiarPasswordPropia(AUTH, request);

            verify(passwordEncoder).matches("vieja123", "hash-ana");
            verify(usuarioDao).cambiarPassword(USUARIO_ID, "hash-nuevo");
        }

        @Test
        @DisplayName("currentPassword incorrecta -> 400 y el hash no se toca")
        void cambio_invalido_no_escribe() {
            when(permisoAdministracionService.validarAutenticado(AUTH)).thenReturn(usuarioNormal);
            when(usuarioDao.buscarPorId(USUARIO_ID)).thenReturn(Optional.of(usuarioNormal));
            when(passwordEncoder.matches("incorrecta", "hash-ana")).thenReturn(false);

            CambiarPasswordPropiaRequest request = new CambiarPasswordPropiaRequest();
            request.setCurrentPassword("incorrecta");
            request.setNewPassword("nuevaClave123");

            assertThatThrownBy(() -> usuarioService.cambiarPasswordPropia(AUTH, request))
                    .isInstanceOf(ReglaNegocioException.class)
                    .hasMessageContaining("contraseña actual");

            verify(usuarioDao, never()).cambiarPassword(any(UUID.class), anyString());
        }
    }

    @Nested
    @DisplayName("eliminar (admin soft delete)")
    class AdminDelete {

        @Test
        @DisplayName("ADMIN elimina a otro usuario y desactiva")
        void admin_elimina_otro() {
            when(permisoAdministracionService.validarAdministrador(AUTH)).thenReturn(administrador);
            when(usuarioDao.buscarPorId(OBJETIVO_ID)).thenReturn(
                    Optional.of(Usuario.builder()
                            .id(OBJETIVO_ID).nombre("Otro").rol(rolUsuario).activo(true).build()));

            usuarioService.eliminar(AUTH, OBJETIVO_ID);

            verify(usuarioDao).cambiarActivo(OBJETIVO_ID, false);
        }

        @Test
        @DisplayName("ADMIN intenta eliminarse a si mismo -> 400")
        void admin_no_puede_eliminarse() {
            when(permisoAdministracionService.validarAdministrador(AUTH)).thenReturn(administrador);

            assertThatThrownBy(() -> usuarioService.eliminar(AUTH, administrador.getId()))
                    .isInstanceOf(ReglaNegocioException.class)
                    .hasMessageContaining("tu propio");

            verify(usuarioDao, never()).cambiarActivo(any(UUID.class), eq(false));
        }

        @Test
        @DisplayName("Usuario objetivo no existe -> 404")
        void objetivo_inexistente() {
            when(permisoAdministracionService.validarAdministrador(AUTH)).thenReturn(administrador);
            when(usuarioDao.buscarPorId(OBJETIVO_ID)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> usuarioService.eliminar(AUTH, OBJETIVO_ID))
                    .isInstanceOf(RecursoNoEncontradoException.class);

            verify(usuarioDao, never()).cambiarActivo(any(UUID.class), any(Boolean.class));
        }

        @Test
        @DisplayName("El permiso de administrador propaga 403 cuando el rol no es admin")
        void sin_permiso_admin_propaga_403() {
            when(permisoAdministracionService.validarAdministrador(AUTH))
                    .thenThrow(new AccesoDenegadoException("Solo administradores"));

            assertThatThrownBy(() -> usuarioService.eliminar(AUTH, OBJETIVO_ID))
                    .isInstanceOf(AccesoDenegadoException.class);

            verify(usuarioDao, never()).cambiarActivo(any(UUID.class), any(Boolean.class));
        }
    }

    @Test
    @DisplayName("obtenerPerfil resuelve el usuario actual y mapea la respuesta")
    void obtener_perfil_mapea() {
        when(permisoAdministracionService.validarAutenticado(AUTH)).thenReturn(usuarioNormal);
        when(usuarioDao.buscarPorId(USUARIO_ID)).thenReturn(Optional.of(usuarioNormal));
        when(usuarioDtoMapper.toResponse(usuarioNormal)).thenReturn(
                com.integrador.sistemaincidencias.usuarios.dto.UsuarioResponse.builder()
                        .id(USUARIO_ID).nombre("Ana").email("ana@sistema.com").build());

        var response = usuarioService.obtenerPerfil(AUTH);

        assertThat(response.getId()).isEqualTo(USUARIO_ID);
        assertThat(response.getNombre()).isEqualTo("Ana");
        verify(usuarioDao, never()).actualizarPerfil(any(), any(), any());
    }
}
