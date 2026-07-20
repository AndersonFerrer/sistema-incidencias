package com.integrador.sistemaincidencias.dashboard.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.integrador.sistemaincidencias.dashboard.dao.DashboardDao;
import com.integrador.sistemaincidencias.dashboard.dto.DashboardResponse;
import com.integrador.sistemaincidencias.dashboard.Rango;
import com.integrador.sistemaincidencias.dashboard.sql.ScopeFiltro;
import com.integrador.sistemaincidencias.dashboard.dto.IncidenciaResumenResponse;
import com.integrador.sistemaincidencias.usuarios.model.Rol;
import com.integrador.sistemaincidencias.usuarios.model.Usuario;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

/**
 * Cubre el dashboard con scope por rol (RF-05 + RF-06..11). El detalle del
 * shape del JSON se valida en la integracion / smoke. Aqui verificamos:
 * - el DAO recibe un ScopeFiltro coherente segun rol.
 * - el tiempo promedio de resolucion tolera null (sin finalizadas en el rango).
 *
 * <p><b>RF-05</b>: AGENTE/USUARIO ven solo lo propio.</p>
 * <p><b>RF-11</b>: tiempoPromedioResolucionHoras nullable.</p>
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class DashboardServiceTest {

    private static final UUID ADMIN_ID = UUID.fromString("00000000-0000-0000-0000-0000000000A1");
    private static final UUID AGENTE_ID = UUID.fromString("00000000-0000-0000-0000-0000000000A2");

    @Mock private DashboardDao dashboardDao;
    @InjectMocks private DashboardService service;

    private Usuario admin, agente;

    @BeforeEach
    void setUp() {
        Rol rolAdmin = Rol.builder().id(UUID.randomUUID()).codigo("ADMINISTRADOR").nombre("Admin").activo(true).build();
        Rol rolAgente = Rol.builder().id(UUID.randomUUID()).codigo("AGENTE").nombre("Agente").activo(true).build();
        admin = Usuario.builder().id(ADMIN_ID).nombre("Admin").rol(rolAdmin).email("a@s.c").activo(true).passwordHash("x").avatarUrl(null).build();
        agente = Usuario.builder().id(AGENTE_ID).nombre("Agente").rol(rolAgente).email("ag@s.c").activo(true).passwordHash("x").avatarUrl(null).build();
    }

    private void stubDaoVacio() {
        when(dashboardDao.contarTotal(any(ScopeFiltro.class), any())).thenReturn(0L);
        when(dashboardDao.contarPorEstadoAprobacion(any(ScopeFiltro.class), any())).thenReturn(Map.of());
        when(dashboardDao.contarPorEstadoProceso(any(ScopeFiltro.class), any())).thenReturn(Map.of());
        when(dashboardDao.contarPorCategoria(any(ScopeFiltro.class), any())).thenReturn(List.of());
        when(dashboardDao.listarTendenciaSemanal(any(ScopeFiltro.class), any())).thenReturn(List.of());
        when(dashboardDao.listarRecientes(any(ScopeFiltro.class), any(), anyInt())).thenReturn(List.of());
    }

    @Test
    @DisplayName("ADMIN: el scope llega al DAO con asignadoA=null y creadoPorUsuarioId=null")
    void admin_sin_scope() {
        stubDaoVacio();

        service.construir(admin, Rango.RANGO_30D);

        org.mockito.ArgumentCaptor<ScopeFiltro> captor =
                org.mockito.ArgumentCaptor.forClass(ScopeFiltro.class);
        verify(dashboardDao).contarTotal(captor.capture(), any());
        ScopeFiltro scope = captor.getValue();
        assertThat(scope.asignadoA()).isNull();
        assertThat(scope.creadoPorUsuarioId()).isNull();
    }

    @Test
    @DisplayName("AGENTE: el scope fuerza asignadoA=agenteId")
    void agente_forza_asignadoA() {
        stubDaoVacio();

        service.construir(agente, Rango.RANGO_30D);

        org.mockito.ArgumentCaptor<ScopeFiltro> captor =
                org.mockito.ArgumentCaptor.forClass(ScopeFiltro.class);
        verify(dashboardDao).contarTotal(captor.capture(), any());
        ScopeFiltro scope = captor.getValue();
        assertThat(scope.asignadoA()).isEqualTo(agente.getId());
    }

    @Test
    @DisplayName("tiempoPromedioResolucionHoras null cuando no hay finalizadas en el rango")
    void tiempo_promedio_null_sin_datos() {
        stubDaoVacio();
        when(dashboardDao.tiempoPromedioResolucionHoras(any(ScopeFiltro.class), any())).thenReturn(null);

        DashboardResponse out = service.construir(admin, Rango.RANGO_30D);

        // No debe lanzar NullPointerException; el response debe construirse.
        assertThat(out).isNotNull();
    }

    @Test
    @DisplayName("El rango '7d' computa el desde correctamente")
    void rango_siete_dias() {
        stubDaoVacio();
        LocalDate before = LocalDate.now().minusDays(7);

        service.construir(admin, Rango.RANGO_7D);

        org.mockito.ArgumentCaptor<java.time.LocalDateTime> captor =
                org.mockito.ArgumentCaptor.forClass(java.time.LocalDateTime.class);
        verify(dashboardDao).contarTotal(any(), captor.capture());
        // El service pasa un LocalDateTime como desde. Verificamos que la fecha
        // es reciente (>= 7 dias atras). Toleramos un margen de 1 segundo.
        assertThat(captor.getValue()).isAfterOrEqualTo(before.atStartOfDay().minusSeconds(1));
    }

    @Test
    @DisplayName("recientes se exponen via la lista del response")
    void recientes_passthrough() {
        IncidenciaResumenResponse reciente = IncidenciaResumenResponse.builder()
                .id(UUID.randomUUID()).codigo("REC-1").titulo("Reciente")
                .prioridad(com.integrador.sistemaincidencias.incidencias.model.Prioridad.MEDIA)
                .build();
        stubDaoVacio();
        when(dashboardDao.listarRecientes(any(ScopeFiltro.class), any(), anyInt())).thenReturn(List.of(reciente));

        DashboardResponse out = service.construir(admin, Rango.RANGO_30D);

        assertThat(out.getRecientes()).hasSize(1);
        assertThat(out.getRecientes().get(0).getCodigo()).isEqualTo("REC-1");
    }
}
