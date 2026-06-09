package com.integrador.sistemaincidencias.shared.storage;

import com.integrador.sistemaincidencias.shared.exception.ReglaNegocioException;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.List;
import java.util.UUID;
import org.apache.commons.io.FilenameUtils;
import org.apache.commons.lang3.StringUtils;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
public class ArchivoStorageService {

    private final Path uploadsRoot;

    public ArchivoStorageService(@Value("${app.uploads.dir:uploads}") String uploadsDir) {
        this.uploadsRoot = Paths.get(uploadsDir).toAbsolutePath().normalize();
    }

    public List<ArchivoAlmacenado> guardarAdjuntosIncidencia(UUID incidenciaId, List<MultipartFile> archivos) {
        if (archivos == null || archivos.isEmpty()) {
            return List.of();
        }

        return archivos.stream()
                .filter(archivo -> archivo != null && !archivo.isEmpty())
                .map(archivo -> guardarAdjuntoIncidencia(incidenciaId, archivo))
                .toList();
    }

    private ArchivoAlmacenado guardarAdjuntoIncidencia(UUID incidenciaId, MultipartFile archivo) {
        String nombreOriginal = limpiarNombre(archivo.getOriginalFilename());
        validarTamano(archivo.getSize());

        String extension = FilenameUtils.getExtension(nombreOriginal);
        String nombreFisico = UUID.randomUUID()
                + (StringUtils.isBlank(extension) ? "" : "." + extension.toLowerCase());

        Path carpetaIncidencia = uploadsRoot.resolve("incidencias").resolve(incidenciaId.toString()).normalize();
        Path destino = carpetaIncidencia.resolve(nombreFisico).normalize();

        if (!destino.startsWith(carpetaIncidencia)) {
            throw new ReglaNegocioException("Nombre de archivo no permitido");
        }

        try {
            Files.createDirectories(carpetaIncidencia);
            try (InputStream inputStream = archivo.getInputStream()) {
                Files.copy(inputStream, destino, StandardCopyOption.REPLACE_EXISTING);
            }
        } catch (IOException exception) {
            throw new ReglaNegocioException("No se pudo guardar el archivo adjunto");
        }

        return ArchivoAlmacenado.builder()
                .nombreOriginal(nombreOriginal)
                .tipoMime(StringUtils.defaultIfBlank(archivo.getContentType(), "application/octet-stream"))
                .tamanoBytes(Math.toIntExact(archivo.getSize()))
                .url("/uploads/incidencias/" + incidenciaId + "/" + nombreFisico)
                .build();
    }

    private String limpiarNombre(String nombre) {
        String base = FilenameUtils.getName(StringUtils.defaultIfBlank(nombre, "archivo"));
        String limpio = base.replaceAll("[^A-Za-z0-9._-]", "_");
        return StringUtils.defaultIfBlank(limpio, "archivo");
    }

    private void validarTamano(long tamanoBytes) {
        if (tamanoBytes <= 0) {
            throw new ReglaNegocioException("El archivo adjunto debe tener contenido");
        }
        if (tamanoBytes > Integer.MAX_VALUE) {
            throw new ReglaNegocioException("El archivo adjunto excede el tamano permitido por la base de datos");
        }
    }
}
