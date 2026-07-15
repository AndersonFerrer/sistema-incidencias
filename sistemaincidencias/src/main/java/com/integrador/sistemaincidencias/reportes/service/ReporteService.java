package com.integrador.sistemaincidencias.reportes.service;

import com.integrador.sistemaincidencias.dashboard.dto.IncidenciaResumenResponse;
import com.integrador.sistemaincidencias.reportes.dao.ReporteDao;
import com.integrador.sistemaincidencias.reportes.dto.ReporteConteoCategoriaResponse;
import com.integrador.sistemaincidencias.reportes.dto.ReporteFiltroAplicado;
import com.integrador.sistemaincidencias.reportes.dto.ReporteFormato;
import com.integrador.sistemaincidencias.reportes.dto.ReporteGranularidad;
import com.integrador.sistemaincidencias.reportes.dto.ReporteKpiResponse;
import com.integrador.sistemaincidencias.reportes.dto.ReporteRequest;
import com.integrador.sistemaincidencias.reportes.dto.ReporteResumenAgenteResponse;
import com.integrador.sistemaincidencias.reportes.dto.ReporteResponse;
import com.integrador.sistemaincidencias.reportes.dto.ReporteTendenciaResponse;
import com.integrador.sistemaincidencias.reportes.exporter.ReporteExcelExporter;
import com.integrador.sistemaincidencias.reportes.exporter.ReportePdfExporter;
import com.integrador.sistemaincidencias.reportes.sql.ReporteFiltro;
import com.integrador.sistemaincidencias.shared.exception.ReglaNegocioException;
import com.integrador.sistemaincidencias.usuarios.model.Usuario;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/**
 * Orquestador del endpoint {@code GET /api/reportes} y
 * {@code GET /api/reportes/exportar} (change reportes-export, PR1).
 *
 * Responsabilidades:
 * <ol>
 *   <li>Normalizar el {@link ReporteRequest} de transporte a un par
 *       {@code [desde 00:00:00, hasta + 1 dia 00:00:00)} (design.md D3).</li>
 *   <li>Forzar el alcance por rol ({@link ReporteScope}) a partir del
 *       {@link Usuario} autenticado; el cliente nunca puede relajar el scope
 *       (design.md D2 / spec escenario RBAC forzado).</li>
 *   <li>Invocar secuencialmente las nueve lecturas del {@link ReporteDao}.</li>
 *   <li>Normalizar mapas canonicos a cero para aprobacion, proceso y
 *       prioridad (design.md D6 / seccion 2.7).</li>
 *   <li>Construir el {@link ReporteResponse} devuelto por JSON o el payload
 *       compartido entre JSON y exporters (D6); el placeholder
 *       {@link #exportar} se cablea en PR2 con los exporters PDF/XLSX.</li>
 * </ol>
 *
 * No se aplica transaccion explicita: cada consulta es de lectura y obtiene
 * una conexion del pool (HikariCP, autoCommit=true) de forma independiente,
 * siguiendo el patron del {@code DashboardService}.
 */
@Service
@RequiredArgsConstructor
public class ReporteService {

    private static final List<String> CLAVES_ESTADO_APROBACION =
            List.of("SOLICITADA", "APROBADA", "RECHAZADA");
    private static final List<String> CLAVES_ESTADO_PROCESO =
            List.of("PENDIENTE", "EN_PROCESO", "FINALIZADA");
    private static final List<String> CLAVES_PRIORIDAD =
            List.of("BAJA", "MEDIA", "ALTA", "CRITICA");

    private static final int DIAS_7D = 7;
    private static final int DIAS_30D = 30;
    private static final int DIAS_90D = 90;

    private final ReporteDao reporteDao;
    private final ReportePdfExporter reportePdfExporter;
    private final ReporteExcelExporter reporteExcelExporter;

    public ReporteResponse construir(Usuario actual, ReporteRequest request) {
        ReporteGranularidad granularidad = ReporteGranularidad.desde(request.getGranularidad());
        RangoPreset rango = resolverRango(request);
        if (rango.hasta.isBefore(rango.desde)) {
            throw new ReglaNegocioException("'desde' debe ser anterior o igual a 'hasta'");
        }
        ReporteScope scope = scopeDe(actual, request.getAgenteId());
        ReporteFiltro filtro = new ReporteFiltro(
                Timestamp.valueOf(rango.desde.atStartOfDay()),
                Timestamp.valueOf(rango.hasta.plusDays(1).atStartOfDay()),
                scope.rolCodigo(),
                scope.currentUserId(),
                scope.agenteFiltro()
        );

        long total = reporteDao.contarTotal(filtro);
        Map<String, Long> porAprobacion = reporteDao.contarPorEstadoAprobacion(filtro);
        Map<String, Long> porProceso = reporteDao.contarPorEstadoProceso(filtro);
        Map<String, Long> porPrioridad = reporteDao.contarPorPrioridad(filtro);

        ReporteKpiResponse kpis = ReporteKpiResponse.builder()
                .total(total)
                .byEstadoAprobacion(normalizar(porAprobacion, CLAVES_ESTADO_APROBACION))
                .byEstadoProceso(normalizar(porProceso, CLAVES_ESTADO_PROCESO))
                .byPrioridad(normalizar(porPrioridad, CLAVES_PRIORIDAD))
                .build();

        List<ReporteConteoCategoriaResponse> byCategoria = reporteDao.contarPorCategoria(filtro);
        List<ReporteTendenciaResponse> tendencia =
                reporteDao.listarTendencia(filtro, granularidad);
        // El resumen por agente no aplica para USUARIO: recibio el reporte
        // creado_por_usuario_id, no asignado_a; el join sobre usuarios seria
        // otra incidencia distinta (ver design.md D2 y spec escenarios RBAC).
        List<ReporteResumenAgenteResponse> resumenPorAgente = scope.esUsuario()
                ? List.of()
                : reporteDao.listarResumenPorAgente(filtro);

        Double promedio = reporteDao.tiempoPromedioResolucionHoras(filtro);
        if (promedio == null) {
            // design.md seccion 2.4: AVG sin filas se normaliza a 0.0 (no null)
            // para que el cliente no tenga que distinguir vacio vs cero.
            promedio = 0.0;
        }

        List<IncidenciaResumenResponse> detalle =
                reporteDao.listarDetalle(filtro, ReporteDao.limiteDetalle());

        return ReporteResponse.builder()
                .filtro(ReporteFiltroAplicado.builder()
                        .desde(rango.desde)
                        .hasta(rango.hasta)
                        .rangoAplicado(rango.codigo)
                        .granularidad(granularidad.etiqueta())
                        .build())
                .kpis(kpis)
                .byCategoria(byCategoria)
                .tendencia(tendencia)
                .resumenPorAgente(resumenPorAgente)
                .tiempoPromedioResolucionHoras(promedio)
                .detalle(detalle)
                .build();
    }

    /**
     * Renderiza el reporte en PDF o XLSX reutilizando el mismo dataset que
     * {@link #construir(Usuario, ReporteRequest)} (design.md D6).
     *
     * <p>El DAO no se consulta dos veces: dentro de un mismo HTTP request al
     * endpoint {@code /api/reportes/exportar} solo se arma un
     * {@link ReporteResponse} y se serializa segun el {@link ReporteFormato}
     * solicitado. JSON nunca llega a esta ruta: se sirve por
     * {@code GET /api/reportes}; intentar exportarlo aqui cae en 400 via
     * {@link ReglaNegocioException}.</p>
     *
     * <p>Los exporters se inyectan como dependencias Spring; ninguno toca la
     * base de datos ni recibe el {@link Usuario} ni los parametros crudos del
     * request, garantizando que preview y descarga compartan exactamente los
     * mismos datos.</p>
     */
    public byte[] exportar(Usuario actual, ReporteRequest request, ReporteFormato formato) {
        ReporteResponse dataset = construir(actual, request);
        return switch (formato) {
            case PDF -> reportePdfExporter.exportar(dataset);
            case XLSX -> reporteExcelExporter.exportar(dataset);
            case JSON -> throw new ReglaNegocioException(
                    "JSON se sirve por GET /api/reportes; use formato=pdf|xlsx en /exportar");
        };
    }

    /**
     * Registra tres codigos canonicos para {@code rolCodigo}. Mantener una
     * copia local de los codigos evita acoplar el modulo a Usuario/Rol para
     * una decision que solo se traduce a parametros SQL.
     */
    static final class CodigosRol {
        static final String ADMINISTRADOR = "ADMINISTRADOR";
        static final String AGENTE = "AGENTE";
        static final String USUARIO = "USUARIO";
        private CodigosRol() {
        }
    }

    /**
     * Scope por rol inyectado al WHERE (ver design.md seccion 2.4).
     *
     * <p>Reglas inmutables:
     * <ul>
     *   <li>{@code ADMINISTRADOR}: sin ambito ({@code currentUserId=null}); respeta
     *       {@code agenteId} para drill-down.</li>
     *   <li>{@code AGENTE}: {@code currentUserId} y {@code agenteFiltro} forzados
     *       al id del usuario autenticado, ignorando cualquier {@code agenteId}
     *       enviado por el cliente.</li>
     *   <li>{@code USUARIO}: {@code currentUserId} poblado; {@code agenteFiltro}
     *       siempre {@code null} (RF-42 no aplica a este rol).</li>
     * </ul>
     */
    public record ReporteScope(String rolCodigo, UUID currentUserId, UUID agenteFiltro) {

        public boolean esUsuario() {
            return CodigosRol.USUARIO.equals(rolCodigo);
        }

        public boolean esAgente() {
            return CodigosRol.AGENTE.equals(rolCodigo);
        }

        public boolean esAdministrador() {
            return CodigosRol.ADMINISTRADOR.equals(rolCodigo);
        }
    }

    private ReporteScope scopeDe(Usuario usuario, UUID requestedAgenteId) {
        if (usuario == null || usuario.getRol() == null) {
            // En teoria nunca llega aqui porque PermisoAdministracionService.validarAutenticado
            // garantiza usuario != null. Si por algun motivo llegara, cae al ambito
            // administrador para no romper la consulta.
            return new ReporteScope(CodigosRol.ADMINISTRADOR, null, requestedAgenteId);
        }
        if (usuario.getRol().esAdministrador()) {
            return new ReporteScope(CodigosRol.ADMINISTRADOR, usuario.getId(), requestedAgenteId);
        }
        if (usuario.getRol().esAgente()) {
            // Forzamos el id; ignoramos el agenteId solicitado por el cliente.
            return new ReporteScope(CodigosRol.AGENTE, usuario.getId(), usuario.getId());
        }
        return new ReporteScope(CodigosRol.USUARIO, usuario.getId(), null);
    }

    /**
     * Resuelve el par de fechas y el codigo de rango efectivo a partir del
     * request. Prioridad (design.md D3):
     * <ol>
     *   <li>Si llega un par completo de fechas ({@code desde} y {@code hasta})
     *       gana sobre {@code rango}; reporta {@code custom}.</li>
     *   <li>Si el cliente envia un preset valido se expande a calendario.</li>
     *   <li>{@code rango=all} (o equivalente) elimina la cota temporal.</li>
     *   <li>Sin parametros se usa el preset por defecto {@code 30d}.</li>
     * </ol>
     */
    private RangoPreset resolverRango(ReporteRequest request) {
        LocalDate desdeExplicito = request.getDesde();
        LocalDate hastaExplicito = request.getHasta();
        boolean tieneFechas = desdeExplicito != null || hastaExplicito != null;
        if (tieneFechas) {
            if (desdeExplicito == null || hastaExplicito == null) {
                throw new ReglaNegocioException(
                        "Si envia fechas explicitas debe incluir 'desde' y 'hasta'");
            }
            return new RangoPreset(desdeExplicito, hastaExplicito, "custom");
        }
        String rangoCrudo = request.getRango();
        if (rangoCrudo == null || rangoCrudo.isBlank()) {
            return rangoPorDias(DIAS_30D, "30d");
        }
        String normalizado = rangoCrudo.trim().toLowerCase();
        return switch (normalizado) {
            case "7d" -> rangoPorDias(DIAS_7D, "7d");
            case "30d" -> rangoPorDias(DIAS_30D, "30d");
            case "90d" -> rangoPorDias(DIAS_90D, "90d");
            case "all" -> new RangoPreset(null, LocalDate.now(), "all");
            default -> throw new ReglaNegocioException(
                    "Rango invalido. Valores permitidos: 7d, 30d, 90d, all");
        };
    }

    private RangoPreset rangoPorDias(int dias, String codigo) {
        LocalDate hoy = LocalDate.now();
        return new RangoPreset(hoy.minusDays(dias - 1L), hoy, codigo);
    }

    /**
     * Garantiza que las claves canonicas existan en el mapa aunque la consulta
     * no haya devuelto filas para esa dimension. El orden de insercion
     * (LinkedHashMap via {@code toList/stream}) preserva las claves obligatorias
     * al frente y conserva cualquier clave adicional al final.
     */
    private Map<String, Long> normalizar(Map<String, Long> conteos, List<String> clavesObligatorias) {
        Map<String, Long> base = conteos == null ? Map.of() : conteos;
        java.util.LinkedHashMap<String, Long> normalizado = new java.util.LinkedHashMap<>();
        for (String clave : clavesObligatorias) {
            normalizado.put(clave, base.getOrDefault(clave, 0L));
        }
        for (Map.Entry<String, Long> entry : base.entrySet()) {
            normalizado.putIfAbsent(entry.getKey(), entry.getValue());
        }
        return normalizado;
    }

    private record RangoPreset(LocalDate desde, LocalDate hasta, String codigo) {
    }

    /**
     * Helper expuesto para el controller cuando quiera derivar el nombre del
     * archivo de attachment a partir del rango efectivo (uso PR2, conservado
     * para evitar drift entre PR1 y PR2).
     */
    @SuppressWarnings("unused")
    static LocalDateTime inicioFinExclusivo(LocalDate hasta) {
        return hasta.plusDays(1).atTime(LocalTime.MIDNIGHT);
    }
}
