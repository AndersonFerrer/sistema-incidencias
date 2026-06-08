package com.integrador.sistemaincidencias.catalogos.controller;

import com.integrador.sistemaincidencias.catalogos.dto.EstadoProcesoRequest;
import com.integrador.sistemaincidencias.catalogos.dto.EstadoProcesoResponse;
import com.integrador.sistemaincidencias.catalogos.service.EstadoProcesoService;
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
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/estados-proceso")
@RequiredArgsConstructor
public class EstadoProcesoController {

    private final EstadoProcesoService estadoProcesoService;

    @GetMapping
    public ResponseEntity<List<EstadoProcesoResponse>> listar() {
        return ResponseEntity.ok(estadoProcesoService.listar());
    }

    @GetMapping("/{id}")
    public ResponseEntity<EstadoProcesoResponse> obtener(@PathVariable UUID id) {
        return ResponseEntity.ok(estadoProcesoService.obtener(id));
    }

    @PostMapping
    public ResponseEntity<EstadoProcesoResponse> crear(@Valid @RequestBody EstadoProcesoRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(estadoProcesoService.crear(request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<EstadoProcesoResponse> actualizar(
            @PathVariable UUID id,
            @Valid @RequestBody EstadoProcesoRequest request
    ) {
        return ResponseEntity.ok(estadoProcesoService.actualizar(id, request));
    }
}
