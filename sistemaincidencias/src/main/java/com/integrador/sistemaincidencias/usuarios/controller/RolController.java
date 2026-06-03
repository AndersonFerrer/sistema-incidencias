package com.integrador.sistemaincidencias.usuarios.controller;

import com.integrador.sistemaincidencias.usuarios.dto.ActualizarRolRequest;
import com.integrador.sistemaincidencias.usuarios.dto.CrearRolRequest;
import com.integrador.sistemaincidencias.usuarios.dto.RolResponse;
import com.integrador.sistemaincidencias.usuarios.service.RolService;
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
@RequestMapping("/api/roles")
@RequiredArgsConstructor
public class RolController {

    private final RolService rolService;

    @GetMapping
    public ResponseEntity<List<RolResponse>> listar(@RequestHeader("Authorization") String authorizationHeader) {
        return ResponseEntity.ok(rolService.listar(authorizationHeader));
    }

    @GetMapping("/{id}")
    public ResponseEntity<RolResponse> obtener(
            @RequestHeader("Authorization") String authorizationHeader,
            @PathVariable UUID id
    ) {
        return ResponseEntity.ok(rolService.obtener(authorizationHeader, id));
    }

    @PostMapping
    public ResponseEntity<RolResponse> crear(
            @RequestHeader("Authorization") String authorizationHeader,
            @Valid @RequestBody CrearRolRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED).body(rolService.crear(authorizationHeader, request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<RolResponse> actualizar(
            @RequestHeader("Authorization") String authorizationHeader,
            @PathVariable UUID id,
            @Valid @RequestBody ActualizarRolRequest request
    ) {
        return ResponseEntity.ok(rolService.actualizar(authorizationHeader, id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminar(
            @RequestHeader("Authorization") String authorizationHeader,
            @PathVariable UUID id
    ) {
        rolService.eliminar(authorizationHeader, id);
        return ResponseEntity.noContent().build();
    }
}
