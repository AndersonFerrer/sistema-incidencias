package com.integrador.sistemaincidencias.reportes.controller;

import com.integrador.sistemaincidencias.reportes.dto.ReporteFormato;
import com.integrador.sistemaincidencias.reportes.dto.ReporteRequest;
import com.integrador.sistemaincidencias.reportes.dto.ReporteResponse;
import com.integrador.sistemaincidencias.reportes.service.ReporteService;
import com.integrador.sistemaincidencias.usuarios.model.Usuario;
import com.integrador.sistemaincidencias.usuarios.service.PermisoAdministracionService;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Endpoints REST del modulo de reportes (change reportes-export, PR1).
 *
 * <ul>
 *   <li>{@code GET /api/reportes?desde=&hasta=&rango=&agenteId=&granularidad=}
 *       devuelve la vista previa JSON (RF-41..43). Default granularidad
 *       {@code semanal}, default rango {@code 30d}.</li>
 *   <li>{@code GET /api/reportes/exportar?...&formato=pdf|xlsx} es el
 *       placeholder del exportador binario (RF-44). En PR1 retorna 501 porque
 *       la implementacion real (PDFBox + POI) se entrega en PR2.</li>
 * </ul>
 *
 * El controller no construye SQL ni decide el scope por rol: delega al
 * {@link ReporteService} despues de resolver el {@link Usuario} autenticado
 * mediante {@link PermisoAdministracionService#validarAutenticado}.
 * {@code SecurityConfig} ya cubre {@code /api/**} con {@code .authenticated()}.
 */
@RestController
@RequestMapping("/api/reportes")
@RequiredArgsConstructor
public class ReporteController {

    private final ReporteService reporteService;
    private final PermisoAdministracionService permisoAdministracionService;

    @GetMapping
    public ResponseEntity<ReporteResponse> obtener(
            @RequestHeader("Authorization") String token,
            @RequestParam(name = "desde", required = false) String desdeCrudo,
            @RequestParam(name = "hasta", required = false) String hastaCrudo,
            @RequestParam(name = "rango", required = false) String rango,
            @RequestParam(name = "agenteId", required = false) UUID agenteId,
            @RequestParam(name = "granularidad", required = false) String granularidad
    ) {
        Usuario actual = permisoAdministracionService.validarAutenticado(token);
        ReporteRequest request = ReporteRequest.builder()
                .desde(parseFecha(desdeCrudo, "desde"))
                .hasta(parseFecha(hastaCrudo, "hasta"))
                .rango(rango)
                .agenteId(agenteId)
                .granularidad(granularidad)
                .build();
        return ResponseEntity.ok(reporteService.construir(actual, request));
    }

    @GetMapping("/exportar")
    public ResponseEntity<byte[]> exportar(
            @RequestHeader("Authorization") String token,
            @RequestParam(name = "desde", required = false) String desdeCrudo,
            @RequestParam(name = "hasta", required = false) String hastaCrudo,
            @RequestParam(name = "rango", required = false) String rango,
            @RequestParam(name = "agenteId", required = false) UUID agenteId,
            @RequestParam(name = "granularidad", required = false) String granularidad,
            @RequestParam(name = "formato") String formatoCrudo
    ) {
        Usuario actual = permisoAdministracionService.validarAutenticado(token);
        ReporteFormato formato = ReporteFormato.desde(formatoCrudo);
        ReporteRequest request = ReporteRequest.builder()
                .desde(parseFecha(desdeCrudo, "desde"))
                .hasta(parseFecha(hastaCrudo, "hasta"))
                .rango(rango)
                .agenteId(agenteId)
                .granularidad(granularidad)
                .build();
        // Placeholder: la implementacion real (PDFBox + POI) llega en PR2.
        // ReporteService.exportar lanza UnsupportedOperationException que el
        // GlobalExceptionHandler traduce a 501.
        byte[] contenido = reporteService.exportar(actual, request, formato);
        return ResponseEntity.ok()
                .header("Content-Type", mediaTypeDe(formato))
                .header("Content-Disposition", "attachment; filename=\"placeholder\"")
                .body(contenido);
    }

    /**
     * Convierte la cadena ISO {@code YYYY-MM-DD} recibida en query string a
     * {@link java.time.LocalDate}. Centralizado para que PR1 y PR2 compartan
     * la misma politica de parseo.
     */
    private java.time.LocalDate parseFecha(String valor, String nombre) {
        if (valor == null || valor.isBlank()) {
            return null;
        }
        try {
            return java.time.LocalDate.parse(valor.trim());
        } catch (java.time.format.DateTimeParseException ex) {
            throw new com.integrador.sistemaincidencias.shared.exception.ReglaNegocioException(
                    "Formato de fecha invalido para '" + nombre + "'. Use YYYY-MM-DD.");
        }
    }

    /**
     * Mapea el formato al tipo MIME canonico. Conserva el switch aqui (y no en
     * el service) porque el controller es el unico responsable de fijar las
     * cabeceras HTTP de la respuesta.
     */
    private String mediaTypeDe(ReporteFormato formato) {
        return switch (formato) {
            case PDF -> "application/pdf";
            case XLSX -> "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
            case JSON -> "application/json";
        };
    }
}
