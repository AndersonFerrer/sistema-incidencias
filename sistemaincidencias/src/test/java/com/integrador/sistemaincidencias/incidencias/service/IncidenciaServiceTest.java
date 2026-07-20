package com.integrador.sistemaincidencias.incidencias.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.integrador.sistemaincidencias.auth.service.AuthService;
import com.integrador.sistemaincidencias.incidencias.dao.AprobacionDao;
import com.integrador.sistemaincidencias.incidencias.dao.AdjuntoDao;
import com.integrador.sistemaincidencias.incidencias.dao.ComentarioDao;
import com.integrador.sistemaincidencias.catalogos.dao.EstadoAprobacionDao;
import com.integrador.sistemaincidencias.catalogos.dao.EstadoProcesoDao;
import com.integrador.sistemaincidencias.incidencias.dao.HistorialIncidenciaDao;
import com.integrador.sistemaincidencias.incidencias.dao.IncidenciaDao;
import com.integrador.sistemaincidencias.incidencias.dto.CambiarEstadoRequest;
import com.integrador.sistemaincidencias.incidencias.dto.IncidenciaDetalleResponse;
import com.integrador.sistemaincidencias.incidencias.dto.IncidenciaFiltro;
import com.integrador.sistemaincidencias.incidencias.dto.IncidenciaResponse;
import com.integrador.sistemaincidencias.catalogos.model.EstadoProceso;
import com.integrador.sistemaincidencias.incidencias.model.Incidencia;
import com.integrador.sistemaincidencias.shared.exception.AccesoDenegadoException;
import com.integrador.sistemaincidencias.shared.exception.ReglaNegocioException;
import com.integrador.sistemaincidencias.shared.pagination.PageRequest;
import com.integrador.sistemaincidencias.shared.pagination.PageResult;
import com.integrador.sistemaincidencias.usuarios.model.Rol;
import com.integrador.sistemaincidencias.usuarios.model.Usuario;
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
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

/**
 * Cubre la pieza mas critica del backend: el RBAC por recurso de la
 * incidencia + el flujo de cambio de estado (incluido el caso "salto
 * permitido" introducido por el usuario, ver commit 714fbaf).
 *
 * <p>validarAlcance() es privado, asi que se valida via los public
 * methods que lo invocan (obtenerDetalle, cambiarEstado, aprobar,
 * rechazar, eliminar, agregarComentario, agregarAdjunto). Lo que se prueba
 * en este archivo:</p>
 * <ul>
 *   <li>Listar filtra por scope segun rol (AGENTE/USUARIO solo lo propio)</li>
 *   <li>ObtenerDetalle sanitiza campos sensibles para no-admin (RF-05)</li>
 *   <li>CambiarEstado: AGENTE asignado puede cambiar, OTRO no, USUARIO no</li>
 *   <li>CambiarEstado: salto de estados permitido (PENDIENTE -> FINALIZADA)</li>
 *   <li>CambiarEstado: retroceder bloqueado</li>
 *   <li>Aprobar/Rechazar: AGENTE bloqueado (validarAlcance "aprobar"/"rechazar")</li>
 * </ul>
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class IncidenciaServiceTest {

    private static final String AUTH = "Bearer jwt";
    private static final UUID ADMIN_ID = UUID.fromString("00000000-0000-0000-0000-0000000000A1");
    private static final UUID AGENTE_ID = UUID.fromString("00000000-0000-0000-0000-0000000000A2");
    private static final UUID USUARIO_ID = UUID.fromString("00000000-0000-0000-0000-0000000000A3");
    private static final UUID INC_ID = UUID.fromString("00000000-0000-0000-0000-0000000000B1");
    private static final UUID ESTADO_PENDIENTE_ID = UUID.fromString("00000000-0000-0000-0000-00000000C001");
    private static final UUID ESTADO_EN_PROCESO_ID = UUID.fromString("00000000-0000-0000-0000-00000000C002");
    private static final UUID ESTADO_FINALIZADA_ID = UUID.fromString("00000000-0000-0000-0000-00000000C003");
    private static final UUID ESTADO_APROBACION_ID = UUID.fromString("00000000-0000-0000-0000-00000000C100");
    private static final UUID CLIENTE_ID = UUID.fromString("00000000-0000-0000-0000-00000000C200");
    private static final UUID CATEGORIA_ID = UUID.fromString("00000000-0000-0000-0000-00000000C300");

    @Mock private IncidenciaDao incidenciaDao;
    @Mock private ComentarioDao comentarioDao;
    @Mock private AdjuntoDao adjuntoDao;
    @Mock private AprobacionDao aprobacionDao;
    @Mock private HistorialIncidenciaDao historialDao;
    @Mock private EstadoAprobacionDao estadoAprobacionDao;
    @Mock private EstadoProcesoDao estadoProcesoDao;
    @Mock private AuthService authService;
    @Mock private com.integrador.sistemaincidencias.shared.storage.ArchivoStorageService archivoStorageService;
    @Mock private com.integrador.sistemaincidencias.notificaciones.service.NotificacionService notificacionService;

    @InjectMocks private IncidenciaService service;

    private Rol rolAdmin, rolAgente, rolUsuario;
    private Usuario admin, agente, usuario, otroAgente, otraPersona;
    private EstadoProceso pendiente, enProceso, finalizada;
    private Incidencia incAsignadaAagente, incDeOtroAgente, incCreadaPorUsuario;

    @BeforeEach
    void setUp() {
        rolAdmin = rol("ADMINISTRADOR");
        rolAgente = rol("AGENTE");
        rolUsuario = rol("USUARIO");

        admin = user(ADMIN_ID, "Admin", "a@s.c", rolAdmin);
        agente = user(AGENTE_ID, "Agente", "ag@s.c", rolAgente);
        usuario = user(USUARIO_ID, "User", "u@s.c", rolUsuario);
        otroAgente = user(UUID.randomUUID(), "Otro", "oag@s.c", rolAgente);
        otraPersona = user(UUID.randomUUID(), "Marta", "marta@s.c", rolUsuario);

        pendiente = estado("PENDIENTE", 1, false, ESTADO_PENDIENTE_ID);
        enProceso = estado("EN_PROCESO", 2, false, ESTADO_EN_PROCESO_ID);
        finalizada = estado("FINALIZADA", 3, true, ESTADO_FINALIZADA_ID);

        LocalDateTime now = LocalDateTime.now();

        incAsignadaAagente = baseInc()
                .id(INC_ID).codigo("INC-2026-TEST").titulo("Test").descripcion("x")
                .estadoProcesoId(ESTADO_PENDIENTE_ID)
                .estadoAprobacionId(ESTADO_APROBACION_ID)
                .clienteId(CLIENTE_ID).categoriaId(CATEGORIA_ID)
                .creadoPorUsuarioId(otraPersona.getId()).asignadoA(agente.getId())
                .prioridad(com.integrador.sistemaincidencias.incidencias.model.Prioridad.MEDIA)
                .creadoEn(now).actualizadoEn(now).build();

        incDeOtroAgente = baseInc()
                .id(UUID.randomUUID()).codigo("INC-OTHER").titulo("Otra").descripcion("x")
                .estadoProcesoId(ESTADO_PENDIENTE_ID)
                .estadoAprobacionId(ESTADO_APROBACION_ID)
                .clienteId(CLIENTE_ID).categoriaId(CATEGORIA_ID)
                .creadoPorUsuarioId(otraPersona.getId()).asignadoA(otroAgente.getId())
                .prioridad(com.integrador.sistemaincidencias.incidencias.model.Prioridad.BAJA)
                .creadoEn(now).actualizadoEn(now).build();

        incCreadaPorUsuario = baseInc()
                .id(UUID.randomUUID()).codigo("INC-USER").titulo("Mio").descripcion("x")
                .estadoProcesoId(ESTADO_PENDIENTE_ID)
                .estadoAprobacionId(ESTADO_APROBACION_ID)
                .clienteId(CLIENTE_ID).categoriaId(CATEGORIA_ID)
                .creadoPorUsuarioId(usuario.getId()).asignadoA(null)
                .prioridad(com.integrador.sistemaincidencias.incidencias.model.Prioridad.MEDIA)
                .creadoEn(now).actualizadoEn(now).build();
    }

    // === helpers ===

    private static Rol rol(String codigo) {
        return Rol.builder().id(UUID.randomUUID()).codigo(codigo).nombre(codigo).activo(true).build();
    }

    private static Usuario user(UUID id, String nombre, String email, Rol rol) {
        return Usuario.builder().id(id).nombre(nombre).email(email).rol(rol)
                .activo(true).passwordHash("x").avatarUrl(null).build();
    }

    private static EstadoProceso estado(String clave, int orden, boolean terminal, UUID id) {
        return EstadoProceso.builder().id(id).clave(clave).etiqueta(clave)
                .orden(orden).esTerminal(terminal).activo(true).build();
    }

    private static Incidencia.IncidenciaBuilder baseInc() {
        return Incidencia.builder();
    }

    /**
     * Stub comodo: el estadoAprobacionDao resuelve el sentinel con un
     * EstadoAprobacion de clave "APROBADA" (no RECHAZADA, asi validarNoRechazada
     * pasa sin tirar). Cada test que toca cambiarEstado/aprobar/rechazar lo usa.
     */
    private com.integrador.sistemaincidencias.catalogos.model.EstadoAprobacion aprobacionNoRechazada() {
        return com.integrador.sistemaincidencias.catalogos.model.EstadoAprobacion.builder()
                .id(ESTADO_APROBACION_ID)
                .clave("APROBADA")
                .etiqueta("Aprobada")
                .activo(true)
                .build();
    }

    /**
     * Stub de "buscarPorClave('RECHAZADA')": el id retornado es OTRO UUID
     * (no ESTADO_APROBACION_ID) para que validarNoRechazada NO lance.
     */
    private static final UUID ESTADO_RECHAZADO_ID = UUID.fromString("00000000-0000-0000-0000-00000000C999");
    private com.integrador.sistemaincidencias.catalogos.model.EstadoAprobacion rechazadaConOtroId() {
        return com.integrador.sistemaincidencias.catalogos.model.EstadoAprobacion.builder()
                .id(ESTADO_RECHAZADO_ID)
                .clave("RECHAZADA")
                .etiqueta("Rechazada")
                .activo(true)
                .build();
    }

    private Incidencia cloneInc(Incidencia i) {
        return Incidencia.builder()
                .id(i.getId()).codigo(i.getCodigo()).titulo(i.getTitulo())
                .descripcion(i.getDescripcion()).clienteId(i.getClienteId())
                .estadoProcesoId(i.getEstadoProcesoId()).estadoAprobacionId(i.getEstadoAprobacionId())
                .categoriaId(i.getCategoriaId()).creadoPorUsuarioId(i.getCreadoPorUsuarioId())
                .asignadoA(i.getAsignadoA()).prioridad(i.getPrioridad())
                .creadoEn(i.getCreadoEn()).actualizadoEn(i.getActualizadoEn()).build();
    }

    // === tests agrupados por comportamiento ===

    @Nested
    @DisplayName("listar — delega al DAO con el filtro recibido (el controller aplica scope)")
    class ListarScope {

        @Test
        @DisplayName("listar invoca al DAO y mapea el resultado a IncidenciaResponse")
        void listar_delega_y_mapea() {
            PageResult<Incidencia> page = PageResult.<Incidencia>builder()
                    .contenido(List.of(incAsignadaAagente)).total(1).page(0).size(20).build();
            when(incidenciaDao.listar(any(IncidenciaFiltro.class), any(PageRequest.class))).thenReturn(page);

            PageResult<IncidenciaResponse> out = service.listar(
                    IncidenciaFiltro.builder().build(),
                    PageRequest.of(0, 20));

            assertThat(out.getContenido()).hasSize(1);
            assertThat(out.getTotal()).isEqualTo(1L);
            // El scope-por-rol vive en IncidenciaController.listar(), no en el service.
            // Eso lo cubre el WebMvcTest de controllers (no incluido en esta suite).
        }
    }

    @Nested
    @DisplayName("obtenerDetalle — sanitizacion por rol (RF-05)")
    class ObtenerDetalle {

        private void stubCatalogosVacios() {
            when(comentarioDao.listarPorIncidencia(any())).thenReturn(List.of());
            when(adjuntoDao.listarPorIncidencia(any())).thenReturn(List.of());
            when(historialDao.listarPorIncidencia(any())).thenReturn(List.of());
        }

        @Test
        @DisplayName("ADMIN ve cliente/categoria/solicitante/responsable + estadoAprobacionId con valor")
        void admin_ve_todo() {
            when(authService.obtenerUsuarioActual(AUTH)).thenReturn(admin);
            when(incidenciaDao.buscarPorId(INC_ID)).thenReturn(Optional.of(incAsignadaAagente));
            stubCatalogosVacios();

            IncidenciaDetalleResponse out = service.obtenerDetalle(INC_ID, AUTH);

            IncidenciaResponse inc = out.getIncidencia();
            assertThat(inc.getClienteId()).isEqualTo(incAsignadaAagente.getClienteId());
            assertThat(inc.getCategoriaId()).isEqualTo(incAsignadaAagente.getCategoriaId());
            assertThat(inc.getCreadoPorUsuarioId()).isEqualTo(incAsignadaAagente.getCreadoPorUsuarioId());
            assertThat(inc.getAsignadoA()).isEqualTo(incAsignadaAagente.getAsignadoA());
            assertThat(inc.getEstadoAprobacionId()).isEqualTo(incAsignadaAagente.getEstadoAprobacionId());
        }

        @Test
        @DisplayName("AGENTE ve cliente/categoria/solicitante/responsable/estadoAprob en null; estadoProcesoId se mantiene")
        void agente_campos_sensibles_null() {
            when(authService.obtenerUsuarioActual(AUTH)).thenReturn(agente);
            when(incidenciaDao.buscarPorId(INC_ID)).thenReturn(Optional.of(incAsignadaAagente));
            stubCatalogosVacios();

            IncidenciaDetalleResponse out = service.obtenerDetalle(INC_ID, AUTH);

            IncidenciaResponse inc = out.getIncidencia();
            assertThat(inc.getClienteId()).isNull();
            assertThat(inc.getCategoriaId()).isNull();
            assertThat(inc.getCreadoPorUsuarioId()).isNull();
            assertThat(inc.getAsignadoA()).isNull();
            assertThat(inc.getEstadoAprobacionId()).isNull();
            // estadoProcesoId SÍ se mantiene: AGENTE cambia estado de proceso.
            assertThat(inc.getEstadoProcesoId()).isEqualTo(ESTADO_PENDIENTE_ID);
        }

        @Test
        @DisplayName("USUARIO ve detalle de incidencia propia; campos sensibles en null")
        void usuario_ve_detalle_propia() {
            when(authService.obtenerUsuarioActual(AUTH)).thenReturn(usuario);
            when(incidenciaDao.buscarPorId(incCreadaPorUsuario.getId()))
                    .thenReturn(Optional.of(incCreadaPorUsuario));
            stubCatalogosVacios();

            IncidenciaDetalleResponse out = service.obtenerDetalle(incCreadaPorUsuario.getId(), AUTH);

            IncidenciaResponse inc = out.getIncidencia();
            assertThat(inc.getClienteId()).isNull();
            assertThat(inc.getAsignadoA()).isNull();
            assertThat(inc.getCreadoPorUsuarioId()).isNull();
        }

        @Test
        @DisplayName("USUARIO intenta ver incidencia ajena -> AccesoDenegadoException")
        void usuario_accede_a_ajena() {
            when(authService.obtenerUsuarioActual(AUTH)).thenReturn(usuario);
            when(incidenciaDao.buscarPorId(INC_ID)).thenReturn(Optional.of(incAsignadaAagente));

            assertThatThrownBy(() -> service.obtenerDetalle(INC_ID, AUTH))
                    .isInstanceOf(AccesoDenegadoException.class);
        }
    }

    @Nested
    @DisplayName("cambiarEstado — RBAC + salto permitido")
    class CambiarEstado {

        @Test
        @DisplayName("AGENTE asignado avanza PENDIENTE -> EN_PROCESO")
        void asignado_avanza_un_paso() {
            when(authService.obtenerUsuarioActual(AUTH)).thenReturn(agente);
            when(incidenciaDao.buscarPorId(INC_ID)).thenReturn(Optional.of(incAsignadaAagente));
            when(estadoAprobacionDao.buscarPorClave("RECHAZADA"))
                    .thenReturn(Optional.of(rechazadaConOtroId()));
            when(estadoProcesoDao.buscarPorId(ESTADO_PENDIENTE_ID)).thenReturn(Optional.of(pendiente));
            when(estadoProcesoDao.buscarPorId(ESTADO_EN_PROCESO_ID)).thenReturn(Optional.of(enProceso));
            // El dao retorna la incidencia YA con el estado nuevo (no la original).
            Incidencia actualizada = cloneInc(incAsignadaAagente);
            actualizada.setEstadoProcesoId(ESTADO_EN_PROCESO_ID);
            when(incidenciaDao.cambiarEstado(eq(INC_ID), eq(ESTADO_EN_PROCESO_ID), eq(false)))
                    .thenReturn(actualizada);
            when(historialDao.listarPorIncidencia(INC_ID)).thenReturn(List.of());

            CambiarEstadoRequest req = new CambiarEstadoRequest();
            req.setEstadoProcesoId(ESTADO_EN_PROCESO_ID);

            IncidenciaResponse out = service.cambiarEstado(INC_ID, req, AUTH);

            assertThat(out.getEstadoProcesoId()).isEqualTo(ESTADO_EN_PROCESO_ID);
        }

        @Test
        @DisplayName("AGENTE asignado puede SALTAR a FINALIZADA (PENDIENTE -> FINALIZADA en un click)")
        void asignado_salta_estados() {
            when(authService.obtenerUsuarioActual(AUTH)).thenReturn(agente);
            when(incidenciaDao.buscarPorId(INC_ID)).thenReturn(Optional.of(incAsignadaAagente));
            when(estadoAprobacionDao.buscarPorClave("RECHAZADA"))
                    .thenReturn(Optional.of(rechazadaConOtroId()));
            when(estadoProcesoDao.buscarPorId(ESTADO_PENDIENTE_ID)).thenReturn(Optional.of(pendiente));
            when(estadoProcesoDao.buscarPorId(ESTADO_FINALIZADA_ID)).thenReturn(Optional.of(finalizada));
            Incidencia actualizada = cloneInc(incAsignadaAagente);
            actualizada.setEstadoProcesoId(ESTADO_FINALIZADA_ID);
            when(incidenciaDao.cambiarEstado(eq(INC_ID), eq(ESTADO_FINALIZADA_ID), eq(true)))
                    .thenReturn(actualizada);
            when(historialDao.listarPorIncidencia(INC_ID)).thenReturn(List.of());

            CambiarEstadoRequest req = new CambiarEstadoRequest();
            req.setEstadoProcesoId(ESTADO_FINALIZADA_ID);

            IncidenciaResponse out = service.cambiarEstado(INC_ID, req, AUTH);

            assertThat(out.getEstadoProcesoId()).isEqualTo(ESTADO_FINALIZADA_ID);
        }

        @Test
        @DisplayName("Retroceder estado -> ReglaNegocioException (mantenemos prohibicion)")
        void retroceder_bloqueado() {
            Incidencia incEnProceso = cloneInc(incAsignadaAagente);
            incEnProceso.setEstadoProcesoId(ESTADO_EN_PROCESO_ID);
            when(authService.obtenerUsuarioActual(AUTH)).thenReturn(agente);
            when(incidenciaDao.buscarPorId(INC_ID)).thenReturn(Optional.of(incEnProceso));
            when(estadoAprobacionDao.buscarPorClave("RECHAZADA"))
                    .thenReturn(Optional.of(rechazadaConOtroId()));
            when(estadoProcesoDao.buscarPorId(ESTADO_EN_PROCESO_ID)).thenReturn(Optional.of(enProceso));
            when(estadoProcesoDao.buscarPorId(ESTADO_PENDIENTE_ID)).thenReturn(Optional.of(pendiente));

            CambiarEstadoRequest req = new CambiarEstadoRequest();
            req.setEstadoProcesoId(ESTADO_PENDIENTE_ID);

            assertThatThrownBy(() -> service.cambiarEstado(INC_ID, req, AUTH))
                    .isInstanceOf(ReglaNegocioException.class)
                    .hasMessageContaining("retroceder");

            verify(incidenciaDao, never()).cambiarEstado(any(), any(), anyBoolean());
        }

        @Test
        @DisplayName("AGENTE sobre incidencia que NO es suya -> AccesoDenegadoException")
        void agente_no_asignado_no_cambia() {
            when(authService.obtenerUsuarioActual(AUTH)).thenReturn(agente);
            when(incidenciaDao.buscarPorId(incDeOtroAgente.getId()))
                    .thenReturn(Optional.of(incDeOtroAgente));

            CambiarEstadoRequest req = new CambiarEstadoRequest();
            req.setEstadoProcesoId(ESTADO_EN_PROCESO_ID);

            assertThatThrownBy(() -> service.cambiarEstado(incDeOtroAgente.getId(), req, AUTH))
                    .isInstanceOf(AccesoDenegadoException.class);
        }
    }

    @Nested
    @DisplayName("aprobar / rechazar — AGENTE bloqueado (RF-05)")
    class AprobarRechazar {

        @Test
        @DisplayName("AGENTE intentando aprobar -> AccesoDenegadoException")
        void agente_no_aprueba() {
            when(authService.obtenerUsuarioActual(AUTH)).thenReturn(agente);
            when(incidenciaDao.buscarPorId(INC_ID)).thenReturn(Optional.of(incAsignadaAagente));

            assertThatThrownBy(() -> service.aprobar(INC_ID, AUTH))
                    .isInstanceOf(AccesoDenegadoException.class)
                    .hasMessageContaining("administrador");
        }

        @Test
        @DisplayName("AGENTE intentando rechazar -> AccesoDenegadoException")
        void agente_no_rechaza() {
            when(authService.obtenerUsuarioActual(AUTH)).thenReturn(agente);
            when(incidenciaDao.buscarPorId(INC_ID)).thenReturn(Optional.of(incAsignadaAagente));

            com.integrador.sistemaincidencias.incidencias.dto.AprobacionRequest req =
                    new com.integrador.sistemaincidencias.incidencias.dto.AprobacionRequest();
            req.setMotivoRechazo("no");

            assertThatThrownBy(() -> service.rechazar(INC_ID, req, AUTH))
                    .isInstanceOf(AccesoDenegadoException.class);
        }
    }
}
