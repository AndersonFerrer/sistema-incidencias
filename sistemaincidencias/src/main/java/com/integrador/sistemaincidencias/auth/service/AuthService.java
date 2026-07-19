package com.integrador.sistemaincidencias.auth.service;

import com.integrador.sistemaincidencias.auditoria.service.AuditService;
import com.integrador.sistemaincidencias.auth.dto.AuthResponse;
import com.integrador.sistemaincidencias.auth.dto.TokenClaims;
import com.integrador.sistemaincidencias.auth.dto.UsuarioSesionResponse;
import com.integrador.sistemaincidencias.auth.jwt.JwtService;
import com.integrador.sistemaincidencias.shared.exception.AutenticacionException;
import com.integrador.sistemaincidencias.shared.exception.RecursoNoEncontradoException;
import com.integrador.sistemaincidencias.usuarios.dao.UsuarioDao;
import com.integrador.sistemaincidencias.usuarios.model.Usuario;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthService {

    private static final Logger log = LoggerFactory.getLogger(AuthService.class);
    private static final String BEARER_PREFIX = "Bearer ";
    /**
     * Fixed email for the seeded demo account. The /api/auth/demo endpoint
     * resolves this exact active user (avoiding role-based first-user
     * ambiguity). If the seed is missing or the user is inactive the
     * endpoint must fail safely.
     */
    public static final String DEMO_EMAIL = "demo@sistema.com";

    private final UsuarioDao usuarioDao;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuditService auditService;

    public AuthResponse login(String email, String password) {
        // Lookup + password check separados para poder registrar LOGIN_FAILED
        // con email conocido vs email desconocido, sin filtrar el Optional.
        var encontrado = usuarioDao.buscarPorEmail(email)
                .filter(Usuario::estaActivo)
                .filter(u -> passwordEncoder.matches(password, u.getPasswordHash()));

        if (encontrado.isEmpty()) {
            auditService.registrarAnonimo(
                    "LOGIN_FAILED", "auth",
                    "{\"email\":\"" + sanitize(email) + "\"}");
            throw new AutenticacionException("Credenciales invalidas");
        }

        Usuario usuario = encontrado.get();
        log.info("Login exitoso para usuario {}", usuario.getEmail());
        auditService.registrar(usuario.getId(), "LOGIN", "auth", null, null, true);
        return construirRespuesta(usuario);
    }

    public AuthResponse loginDemo(String rolSolicitado) {
        // /api/auth/demo always resolves the fixed demo@sistema.com account. The
        // optional `rol` parameter is accepted for backwards compatibility but
        // intentionally ignored: the seed is authoritative.
        Usuario usuario = usuarioDao.buscarDemoPorEmail(DEMO_EMAIL)
                .orElseThrow(() -> {
                    auditService.registrarAnonimo(
                            "LOGIN_DEMO_FAILED", "auth",
                            "{\"motivo\":\"seed_inactivo_o_inexistente\"}");
                    return new AutenticacionException("No existe usuario demo activo registrado");
                });

        log.info("Login demo exitoso para usuario {}", usuario.getEmail());
        auditService.registrar(usuario.getId(), "LOGIN_DEMO", "auth", null, null, true);
        return construirRespuesta(usuario);
    }

    /**
     * Sanea un email antes de mandarlo a JSON para evitar inyecciones en el
     * campo metadata de audit. Escapa comillas y backslashes.
     */
    private static String sanitize(String value) {
        if (value == null) return "";
        return value.replace("\\", "\\\\").replace("\"", "\\\"");
    }

    public UsuarioSesionResponse obtenerSesionActual(String authorizationHeader) {
        return mapearUsuarioSesion(obtenerUsuarioActual(authorizationHeader));
    }

    public Usuario obtenerUsuarioActual(String authorizationHeader) {
        TokenClaims claims = jwtService.validarToken(extraerToken(authorizationHeader));
        return usuarioDao.buscarPorId(claims.getUsuarioId())
                .filter(Usuario::estaActivo)
                .orElseThrow(() -> new RecursoNoEncontradoException("Usuario de sesion no encontrado"));
    }

    private AuthResponse construirRespuesta(Usuario usuario) {
        return AuthResponse.builder()
                .token(jwtService.generarToken(usuario))
                .tipo("Bearer")
                .expiraEn(jwtService.calcularExpiracionLocal())
                .usuario(mapearUsuarioSesion(usuario))
                .build();
    }

    private UsuarioSesionResponse mapearUsuarioSesion(Usuario usuario) {
        return UsuarioSesionResponse.builder()
                .id(usuario.getId())
                .nombre(usuario.getNombre())
                .email(usuario.getEmail())
                .rol(usuario.codigoRol())
                .avatarUrl(usuario.getAvatarUrl())
                .build();
    }

    private String extraerToken(String authorizationHeader) {
        if (authorizationHeader == null || !authorizationHeader.startsWith(BEARER_PREFIX)) {
            throw new AutenticacionException("Token no enviado");
        }
        return authorizationHeader.substring(BEARER_PREFIX.length());
    }
}
