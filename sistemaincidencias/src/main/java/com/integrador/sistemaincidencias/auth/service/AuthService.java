package com.integrador.sistemaincidencias.auth.service;

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

    private final UsuarioDao usuarioDao;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AuthResponse login(String email, String password) {
        Usuario usuario = usuarioDao.buscarPorEmail(email)
                .filter(Usuario::estaActivo)
                .filter(encontrado -> passwordEncoder.matches(password, encontrado.getPasswordHash()))
                .orElseThrow(() -> new AutenticacionException("Credenciales invalidas"));

        log.info("Login exitoso para usuario {}", usuario.getEmail());
        return construirRespuesta(usuario);
    }

    public AuthResponse loginDemo(String rolSolicitado) {
        String rol = rolSolicitado == null || rolSolicitado.isBlank() ? "ADMINISTRADOR" : rolSolicitado.trim();
        Usuario usuario = usuarioDao.buscarDemoPorRol(rol)
                .orElseThrow(() -> new AutenticacionException("No existe usuario demo activo para el rol solicitado"));

        log.info("Login demo exitoso para rol {} con usuario {}", rol, usuario.getEmail());
        return construirRespuesta(usuario);
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
