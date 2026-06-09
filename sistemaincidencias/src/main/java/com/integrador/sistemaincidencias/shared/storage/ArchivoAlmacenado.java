package com.integrador.sistemaincidencias.shared.storage;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class ArchivoAlmacenado {

    private String nombreOriginal;
    private String tipoMime;
    private Integer tamanoBytes;
    private String url;
}
