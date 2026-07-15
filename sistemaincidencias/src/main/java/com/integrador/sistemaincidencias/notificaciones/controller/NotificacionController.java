package com.integrador.sistemaincidencias.notificaciones.controller;

import com.integrador.sistemaincidencias.notificaciones.dto.NotificacionCountResponse;
import com.integrador.sistemaincidencias.notificaciones.dto.NotificacionResponse;
import com.integrador.sistemaincidencias.notificaciones.service.NotificacionService;
import com.integrador.sistemaincidencias.shared.pagination.PageRequest;
import com.integrador.sistemaincidencias.shared.pagination.PageResult;
import com.integrador.sistemaincidencias.usuarios.model.Usuario;
import com.integrador.sistemaincidencias.usuarios.service.PermisoAdministracionService;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Endpoints REST del modulo de notificaciones (change
 * {@code notificaciones-realtime}, PR1 backend).
 *
 * <p>Todos requieren autenticacion JWT via {@link PermisoAdministracionService#validarAutenticado}.
 * El control de acceso por usuario (RF-40) se materializa en el service /
 * DAO obligando el predicado {@code WHERE usuario_id = ?} (decision D6 del
 * design). El cliente nunca puede relajar este alcance.</p>
 *
 * <ul>
 *   <li>{@code GET /api/notificaciones?page=&size=&soloNoLeidas=}: lista
 *       paginada del usuario autenticado, ordenada por {@code creado_en}
 *       descendente. Default page=0 size=20, max size=50 (limites
 *       impuestos por {@link PageRequest#of(Integer, Integer)}).</li>
 *   <li>{@code GET /api/notificaciones/no-leidas/count}: conteo del badge
 *       del topbar. Retorna {@code {"total": 0}} cuando el usuario no tiene
 *       notificaciones sin leer, nunca {@code null}.</li>
 *   <li>{@code PATCH /api/notificaciones/{id}/leida}: idempotente;
 *       404 cuando la fila no pertenece al usuario autenticado.</li>
 *   <li>{@code POST /api/notificaciones/marcar-todas-leidas}: idempotente;
 *       afecta unicamente a filas del usuario con {@code leido_en IS NULL}.</li>
 *   <li>{@code DELETE /api/notificaciones/{id}}: borrado fisico del dueno
 *       unicamente; 404 cuando la fila no pertenece al usuario.</li>
 * </ul>
 *
 * <p>El path variable {@code id} se declara como {@link UUID} para que
 * Spring rechace con 400 cualquier valor no-UUID antes de tocar el
 * DAO (ver escenario "id invalido retorna 400" del spec).</p>
 */
@RestController
@RequestMapping("/api/notificaciones")
@RequiredArgsConstructor
public class NotificacionController {

    private final NotificacionService notificacionService;
    private final PermisoAdministracionService permisoAdministracionService;

    @GetMapping
    public ResponseEntity<PageResult<NotificacionResponse>> listar(
            @RequestHeader("Authorization") String token,
            @RequestParam(name = "page", required = false) Integer page,
            @RequestParam(name = "size", required = false) Integer size,
            @RequestParam(name = "soloNoLeidas", required = false, defaultValue = "false") boolean soloNoLeidas
    ) {
        Usuario actual = permisoAdministracionService.validarAutenticado(token);
        PageResult<NotificacionResponse> respuesta = notificacionService.listar(
                actual.getId(), PageRequest.of(page, size), soloNoLeidas);
        return ResponseEntity.ok(respuesta);
    }

    @GetMapping("/no-leidas/count")
    public ResponseEntity<NotificacionCountResponse> contarNoLeidas(
            @RequestHeader("Authorization") String token
    ) {
        Usuario actual = permisoAdministracionService.validarAutenticado(token);
        return ResponseEntity.ok(notificacionService.contarNoLeidas(actual.getId()));
    }

    @PatchMapping("/{id}/leida")
    public ResponseEntity<NotificacionResponse> marcarLeida(
            @PathVariable("id") UUID id,
            @RequestHeader("Authorization") String token
    ) {
        Usuario actual = permisoAdministracionService.validarAutenticado(token);
        return ResponseEntity.ok(notificacionService.marcarLeida(id, actual.getId()));
    }

    @PostMapping("/marcar-todas-leidas")
    public ResponseEntity<NotificacionCountResponse> marcarTodasLeidas(
            @RequestHeader("Authorization") String token
    ) {
        Usuario actual = permisoAdministracionService.validarAutenticado(token);
        return ResponseEntity.ok(notificacionService.marcarTodasLeidas(actual.getId()));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminar(
            @PathVariable("id") UUID id,
            @RequestHeader("Authorization") String token
    ) {
        Usuario actual = permisoAdministracionService.validarAutenticado(token);
        notificacionService.eliminar(id, actual.getId());
        return ResponseEntity.status(HttpStatus.NO_CONTENT).build();
    }
}
