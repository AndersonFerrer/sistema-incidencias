package com.integrador.sistemaincidencias.catalogos.controller;

import com.integrador.sistemaincidencias.auditoria.service.AuditService;
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
@RequestMapping("/api/categorias")
@RequiredArgsConstructor
public class CategoriaController {

    private final CategoriaService categoriaService;
    private final PermisoAdministracionService permisoAdministracionService;
    private final AuditService auditService;

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
        var admin = permisoAdministracionService.validarAdministrador(token);
        CategoriaResponse creado = categoriaService.crear(request);
        auditService.registrar(admin.getId(), "CATALOG_CREATED", "categorias", creado.getId(),
                "{\"nombre\":\"" + escape(creado.getNombre()) + "\"}", true);
        return ResponseEntity.status(HttpStatus.CREATED).body(creado);
    }

    @PutMapping("/{id}")
    public ResponseEntity<CategoriaResponse> actualizar(
            @PathVariable UUID id,
            @RequestHeader("Authorization") String token,
            @Valid @RequestBody CategoriaRequest request
    ) {
        var admin = permisoAdministracionService.validarAdministrador(token);
        CategoriaResponse actualizado = categoriaService.actualizar(id, request);
        auditService.registrar(admin.getId(), "CATALOG_UPDATED", "categorias", id, null, true);
        return ResponseEntity.ok(actualizado);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminar(
            @PathVariable UUID id,
            @RequestHeader("Authorization") String token
    ) {
        var admin = permisoAdministracionService.validarAdministrador(token);
        categoriaService.eliminar(id);
        auditService.registrar(admin.getId(), "CATALOG_DELETED", "categorias", id, null, true);
        return ResponseEntity.noContent().build();
    }

    private static String escape(String s) {
        return s == null ? "" : s.replace("\\", "\\\\").replace("\"", "\\\"");
    }
}
