package com.integrador.sistemaincidencias.auth.controller;

import com.integrador.sistemaincidencias.auth.dto.AuthResponse;
import com.integrador.sistemaincidencias.auth.dto.LoginDemoRequest;
import com.integrador.sistemaincidencias.auth.dto.LoginRequest;
import com.integrador.sistemaincidencias.auth.dto.UsuarioSesionResponse;
import com.integrador.sistemaincidencias.auth.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.login(request.getEmail(), request.getPassword()));
    }

    /**
     * Credential-free demo login. Resolves the fixed seeded
     * {@code demo@sistema.com} account. The optional {@code rol} field in
     * the request body is accepted for backwards compatibility but is ignored:
     * the demo endpoint always authenticates the exact seeded user.
     */
    @PostMapping("/demo")
    public ResponseEntity<AuthResponse> loginDemo(
            @RequestBody(required = false) LoginDemoRequest request
    ) {
        String rol = request == null ? null : request.getRol();
        return ResponseEntity.ok(authService.loginDemo(rol));
    }

    @GetMapping("/me")
    public ResponseEntity<UsuarioSesionResponse> me(@RequestHeader("Authorization") String authorizationHeader) {
        return ResponseEntity.ok(authService.obtenerSesionActual(authorizationHeader));
    }
}
