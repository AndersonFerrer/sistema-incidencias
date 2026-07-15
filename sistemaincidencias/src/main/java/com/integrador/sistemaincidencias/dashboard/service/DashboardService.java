package com.integrador.sistemaincidencias.dashboard.service;

import com.integrador.sistemaincidencias.dashboard.Rango;
import com.integrador.sistemaincidencias.dashboard.dao.DashboardDao;
import com.integrador.sistemaincidencias.dashboard.dto.CategoriaConteoResponse;
import com.integrador.sistemaincidencias.dashboard.dto.DashboardResponse;
import com.integrador.sistemaincidencias.dashboard.dto.IncidenciaResumenResponse;
import com.integrador.sistemaincidencias.dashboard.dto.KpisResponse;
import com.integrador.sistemaincidencias.dashboard.dto.TendenciaSemanalResponse;
import com.integrador.sistemaincidencias.dashboard.sql.ScopeFiltro;
import com.integrador.sistemaincidencias.usuarios.model.Usuario;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/**
 * Orquestador del endpoint {@code GET /api/dashboard}.
 *
 * El servicio:
 * <ol>
 *   <li>Deriva el {@link ScopeFiltro} del rol del usuario autenticado
 *       (administrador sin filtro, agente asignadoA, usuario creadoPor).</li>
 *   <li>Calcula el limite inferior de fecha a partir del {@link Rango}.</li>
 *   <li>Invoca secuencialmente las siete agregaciones del {@link DashboardDao}.</li>
 *   <li>Normaliza los mapas de KPIs para garantizar las claves canonicas
 *       (ver {@link DashboardDao#normalizar}).</li>
 *   <li>Compone el {@link DashboardResponse} con el eco del rango aplicado.</li>
 * </ol>
 *
 * No se aplica transaccion explicita: cada consulta es de lectura y obtiene
 * una conexion del pool (HikariCP, autoCommit=true) de forma independiente.
 * El plan de 7 lecturas secuenciales mantiene la latencia p95 dentro del
 * presupuesto del RNF-01 (< 1.5 s) sobre el dataset de smoke.
 */
@Service
@RequiredArgsConstructor
public class DashboardService {

    private static final int LIMITE_RECIENTES = 5;
    private static final List<String> CLAVES_ESTADO_APROBACION =
            List.of("SOLICITADA", "APROBADA", "RECHAZADA");
    private static final List<String> CLAVES_ESTADO_PROCESO =
            List.of("PENDIENTE", "EN_PROCESO", "FINALIZADA");

    private final DashboardDao dashboardDao;

    public DashboardResponse construir(Usuario actual, Rango rango) {
        ScopeFiltro scope = scopeDe(actual);
        LocalDateTime desde = rango.desdeOrNull();

        long total = dashboardDao.contarTotal(scope, desde);
        Map<String, Long> porAprobacion = dashboardDao.contarPorEstadoAprobacion(scope, desde);
        Map<String, Long> porProceso = dashboardDao.contarPorEstadoProceso(scope, desde);

        KpisResponse kpis = KpisResponse.builder()
                .total(total)
                .byEstadoAprobacion(DashboardDao.normalizar(porAprobacion, CLAVES_ESTADO_APROBACION))
                .byEstadoProceso(DashboardDao.normalizar(porProceso, CLAVES_ESTADO_PROCESO))
                .build();

        List<CategoriaConteoResponse> byCategoria = dashboardDao.contarPorCategoria(scope, desde);
        List<TendenciaSemanalResponse> tendencia = dashboardDao.listarTendenciaSemanal(scope, desde);
        List<IncidenciaResumenResponse> recientes = dashboardDao.listarRecientes(scope, desde, LIMITE_RECIENTES);
        Double tiempo = dashboardDao.tiempoPromedioResolucionHoras(scope, desde);

        return DashboardResponse.builder()
                .kpis(kpis)
                .byCategoria(byCategoria)
                .tendenciaSemanal(tendencia)
                .recientes(recientes)
                .tiempoPromedioResolucionHoras(tiempo)
                .rangoAplicado(rango.codigo())
                .build();
    }

    private ScopeFiltro scopeDe(Usuario usuario) {
        if (usuario == null || usuario.getRol() == null) {
            return ScopeFiltro.administrador();
        }
        if (usuario.getRol().esAdministrador()) {
            return ScopeFiltro.administrador();
        }
        if (usuario.getRol().esAgente()) {
            return ScopeFiltro.agente(usuario.getId());
        }
        return ScopeFiltro.usuario(usuario.getId());
    }
}