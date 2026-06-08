package com.integrador.sistemaincidencias.shared.exception;

public class AccesoDatosException extends RuntimeException {

    public AccesoDatosException(String message) {
        super(message);
    }

    public AccesoDatosException(String message, Throwable cause) {
        super(message, cause);
    }
}
