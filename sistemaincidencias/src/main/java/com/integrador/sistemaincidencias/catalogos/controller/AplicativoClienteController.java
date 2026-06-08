package com.integrador.sistemaincidencias.catalogos.controller;

import com.integrador.sistemaincidencias.catalogos.dto.AplicativoClienteRequest;
import com.integrador.sistemaincidencias.catalogos.dto.AplicativoClienteResponse;
import com.integrador.sistemaincidencias.catalogos.service.AplicativoClienteService;
import com.integrador.sistemaincidencias.usuarios.service.PermisoAdministracionService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/aplicativos")
@RequiredArgsConstructor
public class AplicativoClienteController {

    private final AplicativoClienteService aplicativoClienteService;
    private final PermisoAdministracionService permisoAdministracionService;

    @GetMapping
    public ResponseEntity<List<AplicativoClienteResponse>> listar(
            @RequestHeader("Authorization") String token
    ) {
        permisoAdministracionService.validarAdministrador(token);
        return ResponseEntity.ok(aplicativoClienteService.listar());
    }

    @GetMapping("/{id}")
    public ResponseEntity<AplicativoClienteResponse> obtener(@PathVariable UUID id) {
        return ResponseEntity.ok(aplicativoClienteService.obtener(id));
    }

    @PostMapping
    public ResponseEntity<AplicativoClienteResponse> crear(
            @RequestHeader("Authorization") String token,
            @Valid @RequestBody AplicativoClienteRequest request
    ) {
        permisoAdministracionService.validarAdministrador(token);
        return ResponseEntity.status(HttpStatus.CREATED).body(aplicativoClienteService.crear(request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<AplicativoClienteResponse> actualizar(
            @PathVariable UUID id,
            @RequestHeader("Authorization") String token,
            @Valid @RequestBody AplicativoClienteRequest request
    ) {
        permisoAdministracionService.validarAdministrador(token);
        return ResponseEntity.ok(aplicativoClienteService.actualizar(id, request));
    }

    @PatchMapping("/{id}/rotar-api-key")
    public ResponseEntity<AplicativoClienteResponse> rotarApiKey(
            @PathVariable UUID id,
            @RequestHeader("Authorization") String token
    ) {
        permisoAdministracionService.validarAdministrador(token);
        return ResponseEntity.ok(aplicativoClienteService.rotarApiKey(id));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminar(
            @PathVariable UUID id,
            @RequestHeader("Authorization") String token
    ) {
        permisoAdministracionService.validarAdministrador(token);
        aplicativoClienteService.eliminar(id);
        return ResponseEntity.noContent().build();
    }
}
