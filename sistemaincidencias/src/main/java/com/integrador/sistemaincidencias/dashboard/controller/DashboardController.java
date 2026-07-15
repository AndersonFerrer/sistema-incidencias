package com.integrador.sistemaincidencias.dashboard.controller;

import com.integrador.sistemaincidencias.dashboard.Rango;
import com.integrador.sistemaincidencias.dashboard.dto.DashboardResponse;
import com.integrador.sistemaincidencias.dashboard.service.DashboardService;
import com.integrador.sistemaincidencias.usuarios.model.Usuario;
import com.integrador.sistemaincidencias.usuarios.service.PermisoAdministracionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Endpoint publico del dashboard.
 *
 * Responde {@code GET /api/dashboard?rango={7d|30d|90d|all}} (default {@code 30d}).
 * Cualquier rol autenticado puede invocarlo; el filtrado por rol se aplica
 * en el servicio y nunca a partir de parametros del cliente (ver
 * {@code design.md} D2 y spec escenario
 * {@code el backend filtra - no se confia en filtro frontend}).
 *
 * El orden de operaciones es deliberado:
 * <ol>
 *   <li>Validar el parametro {@code rango} contra el enum {@link Rango}
 *       (cualquier valor invalido produce 400 via
 *       {@link com.integrador.sistemaincidencias.shared.exception.ReglaNegocioException}).</li>
 *   <li>Resolver el usuario actual desde el JWT ({@code validarAutenticado}).
 *       401 lo emite {@code JwtAuthenticationFilter} aguas arriba.</li>
 *   <li>Delegar la composicion al {@link DashboardService}.</li>
 * </ol>
 */
@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService dashboardService;
    private final PermisoAdministracionService permisoAdministracionService;

    @GetMapping
    public ResponseEntity<DashboardResponse> obtener(
            @RequestHeader("Authorization") String token,
            @RequestParam(name = "rango", defaultValue = "30d") String rango
    ) {
        Rango rangoValido = Rango.desde(rango);
        Usuario actual = permisoAdministracionService.validarAutenticado(token);
        return ResponseEntity.ok(dashboardService.construir(actual, rangoValido));
    }
}