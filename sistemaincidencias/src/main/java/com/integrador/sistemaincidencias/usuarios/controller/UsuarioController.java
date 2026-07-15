package com.integrador.sistemaincidencias.usuarios.controller;

import com.integrador.sistemaincidencias.usuarios.dto.ActualizarUsuarioRequest;
import com.integrador.sistemaincidencias.usuarios.dto.CambiarPasswordRequest;
import com.integrador.sistemaincidencias.usuarios.dto.CrearUsuarioRequest;
import com.integrador.sistemaincidencias.usuarios.dto.UsuarioResponse;
import com.integrador.sistemaincidencias.usuarios.service.UsuarioService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/usuarios")
@RequiredArgsConstructor
public class UsuarioController {

    private final UsuarioService usuarioService;

    @GetMapping
    public ResponseEntity<List<UsuarioResponse>> listar(
            @RequestHeader("Authorization") String authorizationHeader,
            @RequestParam(required = false) String texto,
            @RequestParam(required = false) String rol,
            @RequestParam(required = false) Boolean activo,
            @RequestParam(defaultValue = "20") int limit,
            @RequestParam(defaultValue = "0") int offset
    ) {
        return ResponseEntity.ok(usuarioService.listar(authorizationHeader, texto, rol, activo, limit, offset));
    }

    @GetMapping("/{id}")
    public ResponseEntity<UsuarioResponse> obtener(
            @RequestHeader("Authorization") String authorizationHeader,
            @PathVariable UUID id
    ) {
        return ResponseEntity.ok(usuarioService.obtener(authorizationHeader, id));
    }

    @GetMapping("/agentes-asignables")
    public ResponseEntity<List<UsuarioResponse>> listarAgentesAsignables(
            @RequestHeader("Authorization") String authorizationHeader
    ) {
        return ResponseEntity.ok(usuarioService.listarAgentesAsignables(authorizationHeader));
    }

    @PostMapping
    public ResponseEntity<UsuarioResponse> crear(
            @RequestHeader("Authorization") String authorizationHeader,
            @Valid @RequestBody CrearUsuarioRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED).body(usuarioService.crear(authorizationHeader, request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<UsuarioResponse> actualizar(
            @RequestHeader("Authorization") String authorizationHeader,
            @PathVariable UUID id,
            @Valid @RequestBody ActualizarUsuarioRequest request
    ) {
        return ResponseEntity.ok(usuarioService.actualizar(authorizationHeader, id, request));
    }

    @PatchMapping("/{id}/password")
    public ResponseEntity<Void> cambiarPassword(
            @RequestHeader("Authorization") String authorizationHeader,
            @PathVariable UUID id,
            @Valid @RequestBody CambiarPasswordRequest request
    ) {
        usuarioService.cambiarPassword(authorizationHeader, id, request);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/activar")
    public ResponseEntity<UsuarioResponse> activar(
            @RequestHeader("Authorization") String authorizationHeader,
            @PathVariable UUID id
    ) {
        return ResponseEntity.ok(usuarioService.cambiarActivo(authorizationHeader, id, true));
    }

    @PatchMapping("/{id}/desactivar")
    public ResponseEntity<UsuarioResponse> desactivar(
            @RequestHeader("Authorization") String authorizationHeader,
            @PathVariable UUID id
    ) {
        return ResponseEntity.ok(usuarioService.cambiarActivo(authorizationHeader, id, false));
    }
}
