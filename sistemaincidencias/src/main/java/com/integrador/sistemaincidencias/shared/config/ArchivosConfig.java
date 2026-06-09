package com.integrador.sistemaincidencias.shared.config;

import java.nio.file.Path;
import java.nio.file.Paths;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class ArchivosConfig implements WebMvcConfigurer {

    private final Path uploadsRoot;

    public ArchivosConfig(@Value("${app.uploads.dir:uploads}") String uploadsDir) {
        this.uploadsRoot = Paths.get(uploadsDir).toAbsolutePath().normalize();
    }

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        registry.addResourceHandler("/uploads/**")
                .addResourceLocations(uploadsRoot.toUri().toString());
    }
}
