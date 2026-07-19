# HTTPS / TLS (RNF-10)

## Perfil `https`

Activar con:

```bash
SPRING_PROFILES_ACTIVE=https ./mvnw spring-boot:run
```

o via `application.properties` local:

```properties
spring.profiles.active=https
```

El perfil `https`:

- Cambia el puerto del backend a **8443** (HTTP alternativo en 8080 sigue disponible si no activas el perfil).
- Carga el cert autofirmado `dev-localhost.p12` del classpath.
- Habilita `https://localhost:8443/api/...` y `https://localhost:8443/swagger-ui.html`.

## Cert autofirmado (dev)

`dev-localhost.p12` está en `src/main/resources/` y vence 365 días después
del último `openssl req -x509` que aparece en la historia del repo. Es
para localhost only (CN + SAN: localhost, 127.0.0.1). NO usar en
producción.

### Regenerar el cert

```bash
cd sistemaincidencias

# 1. Generar key + cert autofirmado
openssl req -x509 -newkey rsa:2048 -nodes \
  -keyout src/main/resources/dev-localhost.key \
  -out    src/main/resources/dev-localhost.crt \
  -days 365 -subj "/CN=localhost" \
  -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"

# 2. Empaquetar en PKCS12 (lo que Spring Boot consume)
openssl pkcs12 -export \
  -in  src/main/resources/dev-localhost.crt \
  -inkey src/main/resources/dev-localhost.key \
  -out src/main/resources/dev-localhost.p12 \
  -name dev-localhost -password pass:changeit

# 3. (Opcional) Limpiar los archivos intermedios — solo el .p12 se usa
rm src/main/resources/dev-localhost.crt src/main/resources/dev-localhost.key
```

Si cambias el password o alias, actualiza también `application-https.properties`.

## Producción

El cert autofirmado es **inacceptable** en producción. Patrones recomendados:

1. **Reverse proxy con nginx + Let's Encrypt**: nginx sirve el cert real y pasa al backend por HTTP plano interno.
   ```nginx
   server {
     listen 443 ssl http2;
     server_name api.sistema.local;
     ssl_certificate /etc/letsencrypt/live/api.sistema.local/fullchain.pem;
     ssl_certificate_key /etc/letsencrypt/live/api.sistema.local/privkey.pem;
     location / { proxy_pass http://127.0.0.1:8080; }
   }
   ```
   El backend corre SIN perfil `https` (puerto 8080 plano); nginx hace TLS termination.

2. **Cert montado via Kubernetes secret** + perfil que apunte al classpath/secrets:
   ```yaml
   volumes:
     - name: tls
       secret: { secretName: api-tls-cert }
   ```
   y en `application-https.properties`:
   ```properties
   server.ssl.key-store=file:/etc/ssl/certs/dev-localhost.p12
   ```

3. **Ingress controller** (EKS / GKE) con `cert-manager` para renovaciones automáticas.

## Frontend y HTTPS

Si nginx hace TLS termination en `:443`, el frontend Vite puede quedarse
en HTTP (`http://localhost:5173`) y hacer `fetch` a `http://localhost:8080`
como hasta ahora — solo cambia el dominio público en producción.

Si querés HTTPS end-to-end (Vite también sirve por TLS), requeriría
otro cert o `mkcert` para `127.0.0.1`. Fuera del scope de RNF-10.
