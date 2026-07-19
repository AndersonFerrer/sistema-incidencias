package com.integrador.sistemaincidencias.catalogos.controller;

import com.integrador.sistemaincidencias.auditoria.service.AuditService;
import com.integrador.sistemaincidencias.catalogos.dto.EstadoProcesoRequest;
import com.integrador.sistemaincidencias.catalogos.dto.EstadoProcesoResponse;
import com.integrador.sistemaincidencias.catalogos.service.EstadoProcesoService;
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
@RequestMapping("/api/estados-proceso")
@RequiredArgsConstructor
public class EstadoProcesoController {

    private final EstadoProcesoService estadoProcesoService;
    private final PermisoAdministracionService permisoAdministracionService;
    private final AuditService auditService;

    @GetMapping
    public ResponseEntity<List<EstadoProcesoResponse>> listar(
            @RequestHeader("Authorization") String token
    ) {
        permisoAdministracionService.validarAutenticado(token);
        return ResponseEntity.ok(estadoProcesoService.listar());
    }

    @GetMapping("/{id}")
    public ResponseEntity<EstadoProcesoResponse> obtener(@PathVariable UUID id) {
        return ResponseEntity.ok(estadoProcesoService.obtener(id));
    }

    @PostMapping
    public ResponseEntity<EstadoProcesoResponse> crear(
            @RequestHeader("Authorization") String token,
            @Valid @RequestBody EstadoProcesoRequest request
    ) {
        var admin = permisoAdministracionService.validarAdministrador(token);
        EstadoProcesoResponse creado = estadoProcesoService.crear(request);
        auditService.registrar(admin.getId(), "CATALOG_CREATED", "estados_proceso", creado.getId(),
                "{\"clave\":\"" + escape(creado.getClave()) + "\"}", true);
        return ResponseEntity.status(HttpStatus.CREATED).body(creado);
    }

    @PutMapping("/{id}")
    public ResponseEntity<EstadoProcesoResponse> actualizar(
            @PathVariable UUID id,
            @RequestHeader("Authorization") String token,
            @Valid @RequestBody EstadoProcesoRequest request
    ) {
        var admin = permisoAdministracionService.validarAdministrador(token);
        EstadoProcesoResponse actualizado = estadoProcesoService.actualizar(id, request);
        auditService.registrar(admin.getId(), "CATALOG_UPDATED", "estados_proceso", id, null, true);
        return ResponseEntity.ok(actualizado);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminar(
            @PathVariable UUID id,
            @RequestHeader("Authorization") String token
    ) {
        var admin = permisoAdministracionService.validarAdministrador(token);
        estadoProcesoService.eliminar(id);
        auditService.registrar(admin.getId(), "CATALOG_DELETED", "estados_proceso", id, null, true);
        return ResponseEntity.noContent().build();
    }

    private static String escape(String s) {
        return s == null ? "" : s.replace("\\", "\\\\").replace("\"", "\\\"");
    }
}
