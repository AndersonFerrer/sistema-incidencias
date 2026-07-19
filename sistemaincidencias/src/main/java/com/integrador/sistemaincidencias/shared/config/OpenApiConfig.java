package com.integrador.sistemaincidencias.shared.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import io.swagger.v3.oas.models.servers.Server;
import java.util.List;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Configuracion de OpenAPI / Swagger (RNF-18 del change "quick wins").
 *
 * <p>Acceso en dev: <a href="http://localhost:8080/swagger-ui.html">/swagger-ui.html</a>
 * y JSON crudo en <a href="http://localhost:8080/v3/api-docs">/v3/api-docs</a>.</p>
 */
@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI sistemaIncidenciasOpenApi() {
        return new OpenAPI()
                .info(new Info()
                        .title("Sistema de Gestion de Incidencias — API")
                        .description(
                                "API REST del modulo administrativo del Sistema de Gestion de Incidencias. "
                                        + "Incluye autenticacion JWT, gestion de incidencias con RBAC por rol "
                                        + "(ADMINISTRADOR / AGENTE / USUARIO), modulo de notificaciones en tiempo "
                                        + "casi-real (polling 30s), reportes con export PDF/Excel, dashboard con "
                                        + "agregaciones PostgreSQL y panel de administracion de catalogos."
                        )
                        .version("1.0.0")
                        .contact(new Contact()
                                .name("Equipo de desarrollo")
                                .email("dev@sistema.local"))
                        .license(new License()
                                .name("Uso interno")
                                .url("https://sistema.local")))
                .servers(List.of(
                        new Server().url("http://localhost:8080").description("Dev local"),
                        new Server().url("https://api.sistema.local").description("Produccion")));
    }
}
