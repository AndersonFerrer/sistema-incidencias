package com.integrador.sistemaincidencias.catalogos.controller;

import com.integrador.sistemaincidencias.auditoria.service.AuditService;
import com.integrador.sistemaincidencias.catalogos.dto.EstadoAprobacionRequest;
import com.integrador.sistemaincidencias.catalogos.dto.EstadoAprobacionResponse;
import com.integrador.sistemaincidencias.catalogos.service.EstadoAprobacionService;
import com.integrador.sistemaincidencias.usuarios.service.PermisoAdministracionService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/estados-aprobacion")
@RequiredArgsConstructor
public class EstadoAprobacionController {

    private final EstadoAprobacionService estadoAprobacionService;
    private final PermisoAdministracionService permisoAdministracionService;
    private final AuditService auditService;

    @GetMapping
    public ResponseEntity<List<EstadoAprobacionResponse>> listar(
            @RequestHeader("Authorization") String token
    ) {
        permisoAdministracionService.validarAutenticado(token);
        return ResponseEntity.ok(estadoAprobacionService.listar());
    }

    @GetMapping("/{id}")
    public ResponseEntity<EstadoAprobacionResponse> obtener(@PathVariable UUID id) {
        return ResponseEntity.ok(estadoAprobacionService.obtener(id));
    }

    @PostMapping
    public ResponseEntity<EstadoAprobacionResponse> crear(
            @RequestHeader("Authorization") String token,
            @Valid @RequestBody EstadoAprobacionRequest request
    ) {
        var admin = permisoAdministracionService.validarAdministrador(token);
        EstadoAprobacionResponse creado = estadoAprobacionService.crear(request);
        auditService.registrar(admin.getId(), "CATALOG_CREATED", "estados_aprobacion", creado.getId(),
                "{\"clave\":\"" + escape(creado.getClave()) + "\"}", true);
        return ResponseEntity.status(HttpStatus.CREATED).body(creado);
    }

    @PutMapping("/{id}")
    public ResponseEntity<EstadoAprobacionResponse> actualizar(
            @PathVariable UUID id,
            @RequestHeader("Authorization") String token,
            @Valid @RequestBody EstadoAprobacionRequest request
    ) {
        var admin = permisoAdministracionService.validarAdministrador(token);
        EstadoAprobacionResponse actualizado = estadoAprobacionService.actualizar(id, request);
        auditService.registrar(admin.getId(), "CATALOG_UPDATED", "estados_aprobacion", id, null, true);
        return ResponseEntity.ok(actualizado);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminar(
            @PathVariable UUID id,
            @RequestHeader("Authorization") String token
    ) {
        var admin = permisoAdministracionService.validarAdministrador(token);
        estadoAprobacionService.eliminar(id);
        auditService.registrar(admin.getId(), "CATALOG_DELETED", "estados_aprobacion", id, null, true);
        return ResponseEntity.noContent().build();
    }

    private static String escape(String s) {
        return s == null ? "" : s.replace("\\", "\\\\").replace("\"", "\\\"");
    }
}
