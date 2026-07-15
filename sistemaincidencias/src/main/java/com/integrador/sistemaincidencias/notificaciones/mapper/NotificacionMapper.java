package com.integrador.sistemaincidencias.notificaciones.mapper;

import org.springframework.stereotype.Component;

/**
 * Mapper centralizado de filas de {@code notificaciones} a POJOs del modelo
 * y a DTOs de respuesta.
 *
 * <p>T1 introduce este componente como stub para mantener la simetria con
 * el patron {@code dashboard/mapper/} y para que el resto del modulo
 * (T2 DAO / T4 Service / T5 Controller) compile contra una referencia
 * estable. La implementacion concreta de cada metodo se entrega en T2
 * cuando el DAO ya este disponible para validar los nombres de columna.</p>
 */
@Component
public class NotificacionMapper {

    // La implementacion concreta se completa en T2 una vez definidas las
    // columnas en NotificacionSql. Mantener intencionalmente vacio en T1
    // no rompe compilación porque Spring solo necesita el bean.
}
