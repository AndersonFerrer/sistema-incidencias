package com.integrador.sistemaincidencias.incidencias.dto;

import com.integrador.sistemaincidencias.incidencias.model.Prioridad;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.web.multipart.MultipartFile;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CrearIncidenciaRequest {

    @NotBlank(message = "El titulo es obligatorio")
    private String titulo;

    @NotBlank(message = "La descripcion es obligatoria")
    private String descripcion;

    @NotNull(message = "El aplicativo cliente es obligatorio")
    private UUID clienteId;

    @NotNull(message = "La categoria es obligatoria")
    private UUID categoriaId;

    @NotNull(message = "La prioridad es obligatoria")
    private Prioridad prioridad;

    private UUID usuarioExternoId;

    @NotNull(message = "El agente asignado es obligatorio")
    private UUID asignadoA;

    @Builder.Default
    private List<MultipartFile> archivos = new ArrayList<>();
}
