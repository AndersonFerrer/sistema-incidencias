package com.integrador.sistemaincidencias.shared.exception;

import com.integrador.sistemaincidencias.shared.response.ErrorResponse;
import jakarta.servlet.http.HttpServletRequest;
import java.time.LocalDateTime;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingRequestHeaderException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(AutenticacionException.class)
    public ResponseEntity<ErrorResponse> manejarAutenticacion(
            AutenticacionException exception,
            HttpServletRequest request
    ) {
        return construirRespuesta(HttpStatus.UNAUTHORIZED, exception.getMessage(), request, List.of());
    }

    @ExceptionHandler(MissingRequestHeaderException.class)
    public ResponseEntity<ErrorResponse> manejarCabeceraFaltante(
            MissingRequestHeaderException exception,
            HttpServletRequest request
    ) {
        if ("Authorization".equalsIgnoreCase(exception.getHeaderName())) {
            return construirRespuesta(HttpStatus.UNAUTHORIZED, "Token no enviado", request, List.of());
        }
        return construirRespuesta(HttpStatus.BAD_REQUEST, "Cabecera requerida no enviada", request, List.of());
    }

    @ExceptionHandler(RecursoNoEncontradoException.class)
    public ResponseEntity<ErrorResponse> manejarNoEncontrado(
            RecursoNoEncontradoException exception,
            HttpServletRequest request
    ) {
        return construirRespuesta(HttpStatus.NOT_FOUND, exception.getMessage(), request, List.of());
    }

    @ExceptionHandler(AccesoDenegadoException.class)
    public ResponseEntity<ErrorResponse> manejarAccesoDenegado(
            AccesoDenegadoException exception,
            HttpServletRequest request
    ) {
        return construirRespuesta(HttpStatus.FORBIDDEN, exception.getMessage(), request, List.of());
    }

    @ExceptionHandler(ReglaNegocioException.class)
    public ResponseEntity<ErrorResponse> manejarReglaNegocio(
            ReglaNegocioException exception,
            HttpServletRequest request
    ) {
        return construirRespuesta(HttpStatus.BAD_REQUEST, exception.getMessage(), request, List.of());
    }

    @ExceptionHandler(UnsupportedOperationException.class)
    public ResponseEntity<ErrorResponse> manejarNoImplementado(
            UnsupportedOperationException exception,
            HttpServletRequest request
    ) {
        // Se usa como placeholder entre PRs de un mismo change (ej. exportador
        // PDF/XLSX del modulo reportes que llega en PR2). Cualquier otro uso
        // accidental termina aqui y devuelve 501 explicito, no 500.
        return construirRespuesta(HttpStatus.NOT_IMPLEMENTED, exception.getMessage(), request, List.of());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> manejarValidacion(
            MethodArgumentNotValidException exception,
            HttpServletRequest request
    ) {
        List<String> detalles = exception.getBindingResult()
                .getFieldErrors()
                .stream()
                .map(error -> error.getField() + ": " + error.getDefaultMessage())
                .toList();

        return construirRespuesta(HttpStatus.BAD_REQUEST, "Datos de entrada invalidos", request, detalles);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> manejarGeneral(Exception exception, HttpServletRequest request) {
        log.error("Error no controlado en {}", request.getRequestURI(), exception);
        return construirRespuesta(HttpStatus.INTERNAL_SERVER_ERROR, "Error interno del servidor", request, List.of());
    }

    private ResponseEntity<ErrorResponse> construirRespuesta(
            HttpStatus estado,
            String mensaje,
            HttpServletRequest request,
            List<String> detalles
    ) {
        ErrorResponse response = ErrorResponse.builder()
                .fecha(LocalDateTime.now())
                .estado(estado.value())
                .error(estado.getReasonPhrase())
                .mensaje(mensaje)
                .ruta(request.getRequestURI())
                .detalles(detalles)
                .build();

        return ResponseEntity.status(estado).body(response);
    }
}
