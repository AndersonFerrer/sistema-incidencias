package com.integrador.sistemaincidencias.catalogos.controller;

import com.integrador.sistemaincidencias.catalogos.dto.CategoriaRequest;
import com.integrador.sistemaincidencias.catalogos.dto.CategoriaResponse;
import com.integrador.sistemaincidencias.catalogos.service.CategoriaService;
import com.integrador.sistemaincidencias.usuarios.service.PermisoAdministracionService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/categorias")
@RequiredArgsConstructor
public class CategoriaController {

    private final CategoriaService categoriaService;
    private final PermisoAdministracionService permisoAdministracionService;

    @GetMapping
    public ResponseEntity<List<CategoriaResponse>> listar(
            @RequestHeader("Authorization") String token
    ) {
        permisoAdministracionService.validarAutenticado(token);
        return ResponseEntity.ok(categoriaService.listar());
    }

    @GetMapping("/{id}")
    public ResponseEntity<CategoriaResponse> obtener(@PathVariable UUID id) {
        return ResponseEntity.ok(categoriaService.obtener(id));
    }

    @PostMapping
    public ResponseEntity<CategoriaResponse> crear(
            @RequestHeader("Authorization") String token,
            @Valid @RequestBody CategoriaRequest request
    ) {
        permisoAdministracionService.validarAdministrador(token);
        return ResponseEntity.status(HttpStatus.CREATED).body(categoriaService.crear(request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<CategoriaResponse> actualizar(
            @PathVariable UUID id,
            @RequestHeader("Authorization") String token,
            @Valid @RequestBody CategoriaRequest request
    ) {
        permisoAdministracionService.validarAdministrador(token);
        return ResponseEntity.ok(categoriaService.actualizar(id, request));
    }
}
