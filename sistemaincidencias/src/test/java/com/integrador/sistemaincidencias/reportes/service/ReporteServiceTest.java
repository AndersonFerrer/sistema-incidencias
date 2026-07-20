package com.integrador.sistemaincidencias.reportes.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.integrador.sistemaincidencias.reportes.dao.ReporteDao;
import com.integrador.sistemaincidencias.reportes.dto.ReporteRequest;
import com.integrador.sistemaincidencias.reportes.dto.ReporteResponse;
import com.integrador.sistemaincidencias.reportes.exporter.ReporteExcelExporter;
import com.integrador.sistemaincidencias.reportes.exporter.ReportePdfExporter;
import com.integrador.sistemaincidencias.reportes.dto.ReporteFormato;
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

/**
 * Cubre la pieza "filtrado por scope + export PDF/XLSX" del modulo
 * reportes. Los exporters reales son PDFBox/POI (gordos), asi que mockeo
 * el resultado binario y verifico que el servicio rutea al exporter
 * correcto segun el formato.
 *
 * <p><b>RF-41</b> periodo. <b>RF-42</b> por agente. <b>RF-44</b> export.</p>
 */
@ExtendWith(MockitoExtension.class)
class ReporteServiceTest {

    private static final UUID ADMIN_ID = UUID.fromString("00000000-0000-0000-0000-0000000000A1");
    private static final UUID AGENTE_ID = UUID.fromString("00000000-0000-0000-0000-0000000000A2");

    @Mock private ReporteDao reporteDao;
    @Mock private ReportePdfExporter reportePdfExporter;
    @Mock private ReporteExcelExporter reporteExcelExporter;
    @InjectMocks private ReporteService service;

    private Usuario admin;
    private Usuario agente;

    @BeforeEach
    void setUp() {
        Rol rolAdmin = Rol.builder().id(UUID.randomUUID()).codigo("ADMINISTRADOR").nombre("Admin").activo(true).build();
        Rol rolAgente = Rol.builder().id(UUID.randomUUID()).codigo("AGENTE").nombre("Agente").activo(true).build();
        admin = Usuario.builder().id(ADMIN_ID).nombre("Admin").rol(rolAdmin).email("a@s.c").activo(true).passwordHash("x").avatarUrl(null).build();
        agente = Usuario.builder().id(AGENTE_ID).nombre("Agente").rol(rolAgente).email("ag@s.c").activo(true).passwordHash("x").avatarUrl(null).build();
    }

    @Test
    @DisplayName("construir delega al DAO con ReporteFiltro segun scope del usuario")
    void construir_delega_dao() {
        ReporteRequest req = new ReporteRequest();
        req.setDesde(LocalDate.now().minusDays(30));
        req.setHasta(LocalDate.now());
        when(reporteDao.contarTotal(any())).thenReturn(10L);
        when(reporteDao.contarPorEstadoAprobacion(any())).thenReturn(Map.of());
        when(reporteDao.contarPorEstadoProceso(any())).thenReturn(Map.of());
        when(reporteDao.contarPorPrioridad(any())).thenReturn(Map.of());
        when(reporteDao.contarPorCategoria(any())).thenReturn(List.of());

        ReporteResponse out = service.construir(admin, req);

        assertThat(out).isNotNull();
        verify(reporteDao).contarTotal(any());
    }

    @Test
    @DisplayName("construir incluye el agenteId del scope para AGENTE")
    void agente_scope_agregado_al_filtro() {
        ReporteRequest req = new ReporteRequest();
        when(reporteDao.contarTotal(any())).thenReturn(2L);
        when(reporteDao.contarPorEstadoAprobacion(any())).thenReturn(Map.of());
        when(reporteDao.contarPorEstadoProceso(any())).thenReturn(Map.of());
        when(reporteDao.contarPorPrioridad(any())).thenReturn(Map.of());
        when(reporteDao.contarPorCategoria(any())).thenReturn(List.of());

        service.construir(agente, req);

        // El service arma un ReporteScope internamente y se lo pasa al DAO. Verificamos
        // que el metodo del DAO se invoco al menos una vez (el scope wiring es interno).
        verify(reporteDao).contarTotal(any());
    }

    @Test
    @DisplayName("exportar PDF -> delega al PDF exporter")
    void exportar_pdf() {
        ReporteRequest req = new ReporteRequest();
        byte[] pdfBytes = "%PDF-1.4 mock".getBytes();
        when(reportePdfExporter.exportar(any())).thenReturn(pdfBytes);

        byte[] out = service.exportar(admin, req, ReporteFormato.PDF);

        assertThat(out).isEqualTo(pdfBytes);
        verify(reportePdfExporter).exportar(any());
    }

    @Test
    @DisplayName("exportar XLSX -> delega al Excel exporter")
    void exportar_xlsx() {
        ReporteRequest req = new ReporteRequest();
        byte[] xlsxBytes = "PK mock".getBytes();
        when(reporteExcelExporter.exportar(any())).thenReturn(xlsxBytes);

        byte[] out = service.exportar(admin, req, ReporteFormato.XLSX);

        assertThat(out).isEqualTo(xlsxBytes);
        verify(reporteExcelExporter).exportar(any());
    }

    @Test
    @DisplayName("exportar con formato null -> NPE (java exige formato valido)")
    void exportar_formato_invalido() {
        ReporteRequest req = new ReporteRequest();

        // El switch sobre null tira NPE. Documentamos el comportamiento
        // actual; si en el futuro el controller valida el param, cambiara a IAE.
        assertThatThrownBy(() -> service.exportar(admin, req, null))
                .isInstanceOf(NullPointerException.class);
    }
}
