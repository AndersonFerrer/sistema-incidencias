package com.integrador.sistemaincidencias.auth.jwt;

import com.integrador.sistemaincidencias.auth.dto.TokenClaims;
import com.integrador.sistemaincidencias.shared.exception.AutenticacionException;
import com.integrador.sistemaincidencias.usuarios.model.Usuario;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Base64;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class JwtService {

    private static final String HMAC_ALGORITHM = "HmacSHA256";
    private static final Pattern JSON_FIELD_PATTERN = Pattern.compile("\"([^\"]+)\":(\"[^\"]*\"|[0-9]+)");

    @Value("${app.security.jwt.secret}")
    private String secret;

    @Value("${app.security.jwt.expiration-minutes:120}")
    private long expirationMinutes;

    public String generarToken(Usuario usuario) {
        Instant ahora = Instant.now();
        Instant expiracion = ahora.plusSeconds(expirationMinutes * 60);

        String headerBase64 = codificarJson("""
                {"alg":"HS256","typ":"JWT"}
                """);
        String payloadBase64 = codificarJson(String.format(
                "{\"sub\":\"%s\",\"email\":\"%s\",\"rol\":\"%s\",\"iat\":%d,\"exp\":%d}",
                escaparJson(usuario.getId().toString()),
                escaparJson(usuario.getEmail()),
                escaparJson(usuario.codigoRol()),
                ahora.getEpochSecond(),
                expiracion.getEpochSecond()
        ));
        String firma = firmar(headerBase64 + "." + payloadBase64);

        return headerBase64 + "." + payloadBase64 + "." + firma;
    }

    public TokenClaims validarToken(String token) {
        String[] partes = token == null ? new String[0] : token.split("\\.");
        if (partes.length != 3) {
            throw new AutenticacionException("Token invalido");
        }

        String contenidoFirmado = partes[0] + "." + partes[1];
        String firmaEsperada = firmar(contenidoFirmado);
        if (!firmaEsperada.equals(partes[2])) {
            throw new AutenticacionException("Token invalido");
        }

        Map<String, String> payload = decodificarJson(partes[1]);
        Instant expiracion = Instant.ofEpochSecond(Long.parseLong(payload.get("exp")));
        if (Instant.now().isAfter(expiracion)) {
            throw new AutenticacionException("Token expirado");
        }

        return TokenClaims.builder()
                .usuarioId(UUID.fromString(payload.get("sub")))
                .email(payload.get("email"))
                .rol(payload.get("rol"))
                .expiracion(expiracion)
                .build();
    }

    public LocalDateTime calcularExpiracionLocal() {
        return LocalDateTime.ofInstant(
                Instant.now().plusSeconds(expirationMinutes * 60),
                ZoneId.systemDefault()
        );
    }

    private String codificarJson(String json) {
        return Base64.getUrlEncoder()
                .withoutPadding()
                .encodeToString(json.strip().getBytes(StandardCharsets.UTF_8));
    }

    private Map<String, String> decodificarJson(String base64) {
        try {
            String json = new String(Base64.getUrlDecoder().decode(base64), StandardCharsets.UTF_8);
            Matcher matcher = JSON_FIELD_PATTERN.matcher(json);
            java.util.HashMap<String, String> data = new java.util.HashMap<>();
            while (matcher.find()) {
                String value = matcher.group(2);
                data.put(matcher.group(1), value.startsWith("\"") ? value.substring(1, value.length() - 1) : value);
            }
            return data;
        } catch (Exception exception) {
            throw new AutenticacionException("Token invalido");
        }
    }

    private String firmar(String contenido) {
        try {
            Mac mac = Mac.getInstance(HMAC_ALGORITHM);
            SecretKeySpec key = new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), HMAC_ALGORITHM);
            mac.init(key);
            byte[] firma = mac.doFinal(contenido.getBytes(StandardCharsets.UTF_8));
            return Base64.getUrlEncoder().withoutPadding().encodeToString(firma);
        } catch (Exception exception) {
            throw new IllegalStateException("No se pudo firmar el token", exception);
        }
    }

    private String escaparJson(String value) {
        return value == null ? "" : value.replace("\\", "\\\\").replace("\"", "\\\"");
    }
}
