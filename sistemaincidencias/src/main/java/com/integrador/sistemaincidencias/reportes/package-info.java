/**
 * Modulo de reportes con exportacion PDF/Excel (change reportes-export, PR1).
 *
 * Endpoints:
 * <ul>
 *   <li>{@code GET /api/reportes} - dataset JSON con KPIs, distribuciones y detalle (RF-41..43).</li>
 *   <li>{@code GET /api/reportes/exportar} - exportacion sincrona a PDF o XLSX (RF-44, wired en PR2).</li>
 * </ul>
 *
 * Sigue el patron {@code controller -> service -> dao -> mapper} establecido por
 * {@code dashboard} y la regla DAO del AGENTS.md (sin JPA, SQL nativo parametrizado).
 */
package com.integrador.sistemaincidencias.reportes;
