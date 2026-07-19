package com.integrador.sistemaincidencias.usuarios.controller;

import com.integrador.sistemaincidencias.auditoria.service.AuditService;
import com.integrador.sistemaincidencias.shared.exception.AccesoDenegadoException;
import com.integrador.sistemaincidencias.usuarios.dto.ActualizarPerfilRequest;
import com.integrador.sistemaincidencias.usuarios.dto.ActualizarUsuarioRequest;
import com.integrador.sistemaincidencias.usuarios.dto.CambiarPasswordPropiaRequest;
import com.integrador.sistemaincidencias.usuarios.dto.CambiarPasswordRequest;
import com.integrador.sistemaincidencias.usuarios.dto.CrearUsuarioRequest;
import com.integrador.sistemaincidencias.usuarios.dto.UsuarioResponse;
import com.integrador.sistemaincidencias.usuarios.service.PermisoAdministracionService;
import com.integrador.sistemaincidencias.usuarios.service.UsuarioService;
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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/usuarios")
@RequiredArgsConstructor
public class UsuarioController {

    private final UsuarioService usuarioService;
    private final PermisoAdministracionService permisoAdministracionService;
    private final AuditService auditService;

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

    /**
     * Self-profile endpoints (RF-33, change `perfil-self`). Static mappings so
     * Spring never resolves them as `/{id}` UUIDs.
     */
    @GetMapping("/me")
    public ResponseEntity<UsuarioResponse> obtenerMiPerfil(
            @RequestHeader("Authorization") String authorizationHeader
    ) {
        return ResponseEntity.ok(usuarioService.obtenerPerfil(authorizationHeader));
    }

    @PutMapping("/me")
    public ResponseEntity<UsuarioResponse> actualizarMiPerfil(
            @RequestHeader("Authorization") String authorizationHeader,
            @Valid @RequestBody ActualizarPerfilRequest request
    ) {
        return ResponseEntity.ok(usuarioService.actualizarPerfil(authorizationHeader, request));
    }

    @PutMapping("/me/password")
    public ResponseEntity<Void> cambiarMiPassword(
            @RequestHeader("Authorization") String authorizationHeader,
            @Valid @RequestBody CambiarPasswordPropiaRequest request
    ) {
        var actual = permisoAdministracionService.validarAutenticado(authorizationHeader);
        usuarioService.cambiarPasswordPropia(authorizationHeader, request);
        auditService.registrar(actual.getId(), "USER_PASSWORD_CHANGED_SELF", "usuarios",
                actual.getId(), null, true);
        return ResponseEntity.noContent().build();
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
        var admin = permisoAdministracionService.validarAdministrador(authorizationHeader);
        UsuarioResponse creado = usuarioService.crear(authorizationHeader, request);
        auditService.registrar(admin.getId(), "USER_CREATED", "usuarios", creado.getId(),
                jsonOf("email", creado.getEmail(), "rol", creado.getRol().getCodigo()), true);
        return ResponseEntity.status(HttpStatus.CREATED).body(creado);
    }

    @PutMapping("/{id}")
    public ResponseEntity<UsuarioResponse> actualizar(
            @RequestHeader("Authorization") String authorizationHeader,
            @PathVariable UUID id,
            @Valid @RequestBody ActualizarUsuarioRequest request
    ) {
        var admin = permisoAdministracionService.validarAdministrador(authorizationHeader);
        UsuarioResponse actualizado = usuarioService.actualizar(authorizationHeader, id, request);
        auditService.registrar(admin.getId(), "USER_UPDATED", "usuarios", id,
                jsonOf("rol", actualizado.getRol().getCodigo()), true);
        return ResponseEntity.ok(actualizado);
    }

    @PatchMapping("/{id}/password")
    public ResponseEntity<Void> cambiarPassword(
            @RequestHeader("Authorization") String authorizationHeader,
            @PathVariable UUID id,
            @Valid @RequestBody CambiarPasswordRequest request
    ) {
        var admin = permisoAdministracionService.validarAdministrador(authorizationHeader);
        usuarioService.cambiarPassword(authorizationHeader, id, request);
        auditService.registrar(admin.getId(), "USER_PASSWORD_CHANGED_BY_ADMIN", "usuarios", id, null, true);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/activar")
    public ResponseEntity<UsuarioResponse> activar(
            @RequestHeader("Authorization") String authorizationHeader,
            @PathVariable UUID id
    ) {
        var admin = permisoAdministracionService.validarAdministrador(authorizationHeader);
        UsuarioResponse out = usuarioService.cambiarActivo(authorizationHeader, id, true);
        auditService.registrar(admin.getId(), "USER_ACTIVATED", "usuarios", id, null, true);
        return ResponseEntity.ok(out);
    }

    @PatchMapping("/{id}/desactivar")
    public ResponseEntity<UsuarioResponse> desactivar(
            @RequestHeader("Authorization") String authorizationHeader,
            @PathVariable UUID id
    ) {
        var admin = permisoAdministracionService.validarAdministrador(authorizationHeader);
        UsuarioResponse out = usuarioService.cambiarActivo(authorizationHeader, id, false);
        auditService.registrar(admin.getId(), "USER_DEACTIVATED", "usuarios", id, null, true);
        return ResponseEntity.ok(out);
    }

    /**
     * ADMIN-only soft delete (RF-33). Returns 204 on success.
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminar(
            @RequestHeader("Authorization") String authorizationHeader,
            @PathVariable UUID id
    ) {
        var admin = permisoAdministracionService.validarAdministrador(authorizationHeader);
        usuarioService.eliminar(authorizationHeader, id);
        auditService.registrar(admin.getId(), "USER_DELETED", "usuarios", id, null, true);
        return ResponseEntity.noContent().build();
    }

    /**
     * Helper para serializar pares clave-valor como JSON minimo valido.
     * Escapado simple: backslash y comillas dobles.
     */
    private static String jsonOf(String... kv) {
        if (kv.length % 2 != 0) {
            throw new IllegalArgumentException("kv pairs must be even");
        }
        StringBuilder sb = new StringBuilder("{");
        for (int i = 0; i < kv.length; i += 2) {
            if (i > 0) sb.append(",");
            sb.append("\"").append(escape(kv[i])).append("\":");
            String v = kv[i + 1];
            if (v == null) {
                sb.append("null");
            } else {
                sb.append("\"").append(escape(v)).append("\"");
            }
        }
        return sb.append("}").toString();
    }

    private static String escape(String s) {
        return s == null ? "" : s.replace("\\", "\\\\").replace("\"", "\\\"");
    }
}
