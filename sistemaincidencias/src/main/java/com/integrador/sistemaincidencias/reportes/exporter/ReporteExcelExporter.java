package com.integrador.sistemaincidencias.reportes.exporter;

import com.integrador.sistemaincidencias.dashboard.dto.IncidenciaResumenResponse;
import com.integrador.sistemaincidencias.reportes.dto.ReporteConteoCategoriaResponse;
import com.integrador.sistemaincidencias.reportes.dto.ReporteKpiResponse;
import com.integrador.sistemaincidencias.reportes.dto.ReporteResponse;
import com.integrador.sistemaincidencias.reportes.dto.ReporteResumenAgenteResponse;
import com.integrador.sistemaincidencias.reportes.dto.ReporteTendenciaResponse;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Locale;
import org.apache.poi.ss.usermodel.BorderStyle;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.FillPatternType;
import org.apache.poi.ss.usermodel.Font;
import org.apache.poi.ss.usermodel.HorizontalAlignment;
import org.apache.poi.ss.usermodel.IndexedColors;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.VerticalAlignment;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.streaming.SXSSFWorkbook;
import org.apache.poi.xssf.usermodel.XSSFClientAnchor;
import org.apache.poi.xssf.usermodel.XSSFDrawing;
import org.apache.poi.xssf.usermodel.XSSFSheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Component;

/**
 * Exportador XLSX del reporte (RF-44, design.md D7 y seccion 6.2).
 *
 * <p>Usa {@link SXSSFWorkbook} para mantener las filas fuera del heap y se
 * libera con {@code try-with-resources} (que invoca {@code dispose()} y borra
 * los temporales). El workbook de salida conserva las mismas hojas que la
 * vista previa del frontend: Resumen, Datos, Charts, Por estado, Por
 * categoria, Por prioridad, Tendencia y Por agente (este ultimo solo cuando
 * el alcance lo permite).</p>
 *
 * <p>Los rangos vacios producen archivos validos con hojas y encabezados
 * presentes, sin filas inventadas. No se consulta a la base de datos: el
 * dataset llega como {@link ReporteResponse}.</p>
 */
@Component
public class ReporteExcelExporter {

    private static final String HOJA_RESUMEN = "Resumen";
    private static final String HOJA_DATOS = "Datos";
    private static final String HOJA_CHARTS = "Charts";
    private static final String HOJA_POR_ESTADO = "Por estado";
    private static final String HOJA_POR_CATEGORIA = "Por categoria";
    private static final String HOJA_POR_PRIORIDAD = "Por prioridad";
    private static final String HOJA_TENDENCIA = "Tendencia";
    private static final String HOJA_POR_AGENTE = "Por agente";

    private static final DateTimeFormatter FECHA_HORA = DateTimeFormatter.ofPattern(
            "yyyy-MM-dd HH:mm", new Locale("es", "PE"));
    private static final DateTimeFormatter FECHA_CELDA = DateTimeFormatter.ofPattern(
            "yyyy-MM-dd HH:mm");

    /**
     * Serializa el dataset a bytes XLSX. {@link SXSSFWorkbook} implementa
     * {@link AutoCloseable} y elimina los temporales en {@code dispose()}.
     */
    public byte[] exportar(ReporteResponse dataset) {
        try (SXSSFWorkbook wb = new SXSSFWorkbook(100);
                ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            wb.setCompressTempFiles(true);
            Estilos estilos = new Estilos(wb);

            escribirResumen(wb, estilos, dataset);
            escribirDatos(wb, estilos, dataset);
            escribirCharts(wb, estilos, dataset);
            escribirPorEstado(wb, estilos, dataset);
            escribirPorCategoria(wb, estilos, dataset);
            escribirPorPrioridad(wb, estilos, dataset);
            escribirTendencia(wb, estilos, dataset);
            escribirPorAgente(wb, estilos, dataset);

            wb.write(baos);
            return baos.toByteArray();
        } catch (IOException ex) {
            throw new IllegalStateException("No se pudo serializar el XLSX del reporte", ex);
        }
    }

    private void escribirResumen(SXSSFWorkbook wb, Estilos estilos, ReporteResponse dataset) {
        Sheet sh = wb.createSheet(HOJA_RESUMEN);
        String stamp = LocalDateTime.now().format(FECHA_HORA);
        String rangoAplicado = dataset.getFiltro().getRangoAplicado();
        String desde = dataset.getFiltro().getDesde() == null ? "historico"
                : dataset.getFiltro().getDesde().toString();
        String hasta = dataset.getFiltro().getHasta() == null ? "hoy"
                : dataset.getFiltro().getHasta().toString();

        agregarCelda(sh, 0, 0, "Reporte de Incidencias", estilos.titulo);
        agregarCelda(sh, 1, 0, "Generado: " + stamp, estilos.etiqueta);
        agregarCelda(sh, 2, 0,
                "Rango: " + rangoAplicado + " (" + desde + " a " + hasta + ")",
                estilos.etiqueta);
        agregarCelda(sh, 3, 0,
                "Granularidad: " + dataset.getFiltro().getGranularidad(),
                estilos.etiqueta);

        ReporteKpiResponse kpis = dataset.getKpis();
        Double promedio = dataset.getTiempoPromedioResolucionHoras();
        int fila = 5;
        agregarCelda(sh, fila, 0, "Indicador", estilos.cabeceraTabla);
        agregarCelda(sh, fila, 1, "Valor", estilos.cabeceraTabla);
        fila++;
        agregarCelda(sh, fila, 0, "Total de incidencias", estilos.etiqueta);
        agregarCelda(sh, fila, 1, kpis.getTotal(), estilos.numeroEntero);
        fila++;
        agregarCelda(sh, fila, 0, "Por estado de aprobacion", estilos.etiqueta);
        agregarCelda(sh, fila, 1, unirConMapas(kpis.getByEstadoAprobacion()),
                estilos.etiqueta);
        fila++;
        agregarCelda(sh, fila, 0, "Por estado de proceso", estilos.etiqueta);
        agregarCelda(sh, fila, 1, unirConMapas(kpis.getByEstadoProceso()),
                estilos.etiqueta);
        fila++;
        agregarCelda(sh, fila, 0, "Por prioridad", estilos.etiqueta);
        agregarCelda(sh, fila, 1, unirConMapas(kpis.getByPrioridad()), estilos.etiqueta);
        fila++;
        agregarCelda(sh, fila, 0, "Tiempo promedio de resolucion (horas)", estilos.etiqueta);
        agregarCelda(sh, fila, 1, promedio, estilos.numeroDecimal,
                promedio == null ? "-" : String.format(Locale.ROOT, "%.2f", promedio));

        ajustarAnchos(sh, new int[]{38, 60});
        sh.createFreezePane(0, 1);
    }

    private void escribirDatos(SXSSFWorkbook wb, Estilos estilos, ReporteResponse dataset) {
        Sheet sh = wb.createSheet(HOJA_DATOS);
        String[] cabecera = {
                "ID", "Codigo", "Titulo", "Categoria", "Asignado a",
                "Estado proceso", "Estado aprobacion", "Prioridad",
                "Creado en", "Resuelto en"
        };
        Row filaCabecera = sh.createRow(0);
        for (int i = 0; i < cabecera.length; i++) {
            Cell c = filaCabecera.createCell(i);
            c.setCellValue(cabecera[i]);
            c.setCellStyle(estilos.cabeceraTabla);
        }
        sh.createFreezePane(0, 1);
        int fila = 1;
        for (IncidenciaResumenResponse detalle : dataset.getDetalle()) {
            Row row = sh.createRow(fila++);
            int col = 0;
            agregarCelda(row, col++, detalle.getId() == null ? "" : detalle.getId().toString(),
                    estilos.etiqueta);
            agregarCelda(row, col++, detalle.getCodigo(), estilos.etiqueta);
            agregarCelda(row, col++, detalle.getTitulo(), estilos.etiqueta);
            agregarCelda(row, col++, detalle.getCategoriaNombre(), estilos.etiqueta);
            agregarCelda(row, col++,
                    detalle.getAsignadoA() == null ? "" : detalle.getAsignadoA().toString(),
                    estilos.etiqueta);
            agregarCelda(row, col++, detalle.getEstadoProcesoCodigo(), estilos.etiqueta);
            agregarCelda(row, col++, detalle.getEstadoAprobacionCodigo(), estilos.etiqueta);
            agregarCelda(row, col++,
                    detalle.getPrioridad() == null ? "" : detalle.getPrioridad().name(),
                    estilos.etiqueta);
            agregarCelda(row, col++,
                    detalle.getCreadoEn() == null ? "" : detalle.getCreadoEn().format(FECHA_CELDA),
                    estilos.etiqueta);
            agregarCelda(row, col,
                    detalle.getResueltoEn() == null ? "" : detalle.getResueltoEn().format(FECHA_CELDA),
                    estilos.etiqueta);
        }
        ajustarAnchos(sh, new int[]{36, 14, 50, 22, 36, 18, 22, 14, 20, 20});
    }

    private void escribirCharts(SXSSFWorkbook wb, Estilos estilos, ReporteResponse dataset) {
        Sheet sh = wb.createSheet(HOJA_CHARTS);
        agregarCelda(sh, 0, 0, "Tendencia (grafica)", estilos.titulo);
        byte[] png = ReporteChartRenderer.renderizarPng(dataset.getTendencia());
        if (png.length > 0) {
            XSSFWorkbook subyacente = wb.getXSSFWorkbook();
            int idx = subyacente.addPicture(png, XSSFWorkbook.PICTURE_TYPE_PNG);
            XSSFSheet xsheet = subyacente.getSheet(HOJA_CHARTS);
            XSSFDrawing drawing = xsheet.createDrawingPatriarch();
            XSSFClientAnchor anchor = new XSSFClientAnchor();
            anchor.setCol1(0);
            anchor.setCol2(9);
            anchor.setRow1(2);
            anchor.setRow2(28);
            org.apache.poi.xssf.usermodel.XSSFPicture picture = drawing.createPicture(anchor, idx);
            picture.resize();
        }
        Row filaCab = sh.createRow(30);
        Cell a = filaCab.createCell(0);
        a.setCellValue("Bucket inicio");
        a.setCellStyle(estilos.cabeceraTabla);
        Cell b = filaCab.createCell(1);
        b.setCellValue("Total");
        b.setCellStyle(estilos.cabeceraTabla);
        int fila = 31;
        for (ReporteTendenciaResponse bucket : dataset.getTendencia()) {
            Row row = sh.createRow(fila++);
            agregarCelda(row, 0, bucket.getBucketInicio().toString(), estilos.etiqueta);
            agregarCelda(row, 1, bucket.getTotal(), estilos.numeroEntero);
        }
        ajustarAnchos(sh, new int[]{18, 14});
    }

    private void escribirPorEstado(SXSSFWorkbook wb, Estilos estilos, ReporteResponse dataset) {
        Sheet sh = wb.createSheet(HOJA_POR_ESTADO);
        agregarCelda(sh, 0, 0, "Estado de proceso", estilos.titulo);
        escribirTablaEstado(sh, estilos, 1, dataset.getKpis().getByEstadoProceso());
        agregarCelda(sh, 5, 0, "Estado de aprobacion", estilos.titulo);
        escribirTablaEstado(sh, estilos, 6, dataset.getKpis().getByEstadoAprobacion());
        ajustarAnchos(sh, new int[]{28, 14, 10});
    }

    private void escribirPorCategoria(SXSSFWorkbook wb, Estilos estilos, ReporteResponse dataset) {
        Sheet sh = wb.createSheet(HOJA_POR_CATEGORIA);
        agregarCelda(sh, 0, 0, "Categoria", estilos.cabeceraTabla);
        agregarCelda(sh, 0, 1, "Cantidad", estilos.cabeceraTabla);
        int fila = 1;
        for (ReporteConteoCategoriaResponse categoria : dataset.getByCategoria()) {
            Row row = sh.createRow(fila++);
            agregarCelda(row, 0, categoria.getCategoriaNombre(), estilos.etiqueta);
            agregarCelda(row, 1, categoria.getTotal(), estilos.numeroEntero);
        }
        ajustarAnchos(sh, new int[]{36, 14});
    }

    private void escribirPorPrioridad(SXSSFWorkbook wb, Estilos estilos, ReporteResponse dataset) {
        Sheet sh = wb.createSheet(HOJA_POR_PRIORIDAD);
        agregarCelda(sh, 0, 0, "Prioridad", estilos.cabeceraTabla);
        agregarCelda(sh, 0, 1, "Cantidad", estilos.cabeceraTabla);
        java.util.List<java.util.Map.Entry<String, Long>> ordenados = new java.util.ArrayList<>(
                dataset.getKpis().getByPrioridad().entrySet());
        ordenados.sort((a, b) -> Long.compare(b.getValue(), a.getValue()));
        int fila = 1;
        for (java.util.Map.Entry<String, Long> entry : ordenados) {
            Row row = sh.createRow(fila++);
            agregarCelda(row, 0, entry.getKey(), estilos.etiqueta);
            agregarCelda(row, 1, entry.getValue(), estilos.numeroEntero);
        }
        ajustarAnchos(sh, new int[]{20, 14});
    }

    private void escribirTendencia(SXSSFWorkbook wb, Estilos estilos, ReporteResponse dataset) {
        Sheet sh = wb.createSheet(HOJA_TENDENCIA);
        agregarCelda(sh, 0, 0, "Bucket inicio", estilos.cabeceraTabla);
        agregarCelda(sh, 0, 1, "Total", estilos.cabeceraTabla);
        int fila = 1;
        for (ReporteTendenciaResponse bucket : dataset.getTendencia()) {
            Row row = sh.createRow(fila++);
            agregarCelda(row, 0, bucket.getBucketInicio().toString(), estilos.etiqueta);
            agregarCelda(row, 1, bucket.getTotal(), estilos.numeroEntero);
        }
        ajustarAnchos(sh, new int[]{18, 14});
    }

    private void escribirPorAgente(SXSSFWorkbook wb, Estilos estilos, ReporteResponse dataset) {
        Sheet sh = wb.createSheet(HOJA_POR_AGENTE);
        if (dataset.getResumenPorAgente().isEmpty()) {
            agregarCelda(sh, 0, 0,
                    "Hoja presente pero sin filas: el alcance del reporte no incluye agentes (rol USUARIO o sin asignaciones).",
                    estilos.etiqueta);
            ajustarAnchos(sh, new int[]{80});
            return;
        }
        String[] cabecera = {"Agente", "Total asignadas", "Resueltas", "Pendientes",
                "En proceso", "Promedio (h)"};
        Row filaCabecera = sh.createRow(0);
        for (int i = 0; i < cabecera.length; i++) {
            Cell c = filaCabecera.createCell(i);
            c.setCellValue(cabecera[i]);
            c.setCellStyle(estilos.cabeceraTabla);
        }
        sh.createFreezePane(0, 1);
        int fila = 1;
        for (ReporteResumenAgenteResponse agente : dataset.getResumenPorAgente()) {
            Row row = sh.createRow(fila++);
            agregarCelda(row, 0, agente.getAgenteNombre(), estilos.etiqueta);
            agregarCelda(row, 1, agente.getTotalAsignadas(), estilos.numeroEntero);
            agregarCelda(row, 2, agente.getResueltas(), estilos.numeroEntero);
            agregarCelda(row, 3, agente.getPendientes(), estilos.numeroEntero);
            agregarCelda(row, 4, agente.getEnProceso(), estilos.numeroEntero);
            Double prom = agente.getPromedioResolucionHoras();
            agregarCelda(row, 5, prom, estilos.numeroDecimal,
                    prom == null ? "" : String.format(Locale.ROOT, "%.2f", prom));
        }
        ajustarAnchos(sh, new int[]{30, 14, 12, 12, 12, 14});
    }

    private static void escribirTablaEstado(Sheet sh, Estilos estilos, int filaInicio,
            java.util.Map<String, Long> conteos) {
        int fila = filaInicio;
        agregarCelda(sh, fila, 0, "Estado", estilos.cabeceraTabla);
        agregarCelda(sh, fila, 1, "Cantidad", estilos.cabeceraTabla);
        agregarCelda(sh, fila, 2, "%", estilos.cabeceraTabla);
        long total = conteos.values().stream().mapToLong(Long::longValue).sum();
        fila++;
        for (java.util.Map.Entry<String, Long> entry : conteos.entrySet()) {
            Row row = sh.createRow(fila++);
            agregarCelda(row, 0, entry.getKey(), estilos.etiqueta);
            agregarCelda(row, 1, entry.getValue(), estilos.numeroEntero);
            String pct = total == 0 ? "0%"
                    : String.format(Locale.ROOT, "%.1f%%", entry.getValue() * 100.0 / total);
            agregarCelda(row, 2, pct, estilos.etiqueta);
        }
    }

    private static Row fila(Sheet sh, int fila) {
        Row row = sh.getRow(fila);
        return row == null ? sh.createRow(fila) : row;
    }

    private static void agregarCelda(Sheet sh, int fila, int col, String texto, CellStyle estilo) {
        Cell cell = fila(sh, fila).createCell(col);
        cell.setCellValue(texto == null ? "" : texto);
        if (estilo != null) {
            cell.setCellStyle(estilo);
        }
    }

    private static void agregarCelda(Sheet sh, int fila, int col, long valor, CellStyle estilo) {
        Cell cell = fila(sh, fila).createCell(col);
        cell.setCellValue(valor);
        if (estilo != null) {
            cell.setCellStyle(estilo);
        }
    }

    private static void agregarCelda(Sheet sh, int fila, int col, Double valor, CellStyle estilo,
            String textoAlternativo) {
        Row row = fila(sh, fila);
        if (valor != null) {
            Cell cell = row.createCell(col);
            cell.setCellValue(valor);
            if (estilo != null) {
                cell.setCellStyle(estilo);
            }
        } else {
            Cell cell = row.createCell(col);
            cell.setCellValue(textoAlternativo == null ? "" : textoAlternativo);
            if (estilo != null) {
                cell.setCellStyle(estilo);
            }
        }
    }

    private static void agregarCelda(Row row, int col, String texto, CellStyle estilo) {
        Cell cell = row.createCell(col);
        cell.setCellValue(texto == null ? "" : texto);
        if (estilo != null) {
            cell.setCellStyle(estilo);
        }
    }

    private static void agregarCelda(Row row, int col, long valor, CellStyle estilo) {
        Cell cell = row.createCell(col);
        cell.setCellValue(valor);
        if (estilo != null) {
            cell.setCellStyle(estilo);
        }
    }

    private static void agregarCelda(Row row, int col, Double valor, CellStyle estilo,
            String textoAlternativo) {
        if (valor != null) {
            Cell cell = row.createCell(col);
            cell.setCellValue(valor);
            if (estilo != null) {
                cell.setCellStyle(estilo);
            }
        } else {
            Cell cell = row.createCell(col);
            cell.setCellValue(textoAlternativo == null ? "" : textoAlternativo);
            if (estilo != null) {
                cell.setCellStyle(estilo);
            }
        }
    }

    private static void ajustarAnchos(Sheet sh, int[] anchos) {
        for (int i = 0; i < anchos.length; i++) {
            sh.setColumnWidth(i, anchos[i] * 256);
        }
    }

    private static String unirConMapas(java.util.Map<String, Long> conteos) {
        return conteos.entrySet().stream()
                .sorted(java.util.Map.Entry.comparingByKey())
                .map(e -> e.getKey() + "=" + e.getValue())
                .reduce((a, b) -> a + ", " + b)
                .orElse("-");
    }

    /**
     * Estilos reutilizables del workbook. POI exige crear el estilo en el
     * libro para que el XML generado lo registre y pueda referenciarlo.
     */
    private static final class Estilos {

        final CellStyle titulo;
        final CellStyle cabeceraTabla;
        final CellStyle etiqueta;
        final CellStyle numeroEntero;
        final CellStyle numeroDecimal;

        Estilos(Workbook wb) {
            Font fontTitulo = wb.createFont();
            fontTitulo.setBold(true);
            fontTitulo.setFontHeightInPoints((short) 14);
            fontTitulo.setColor(IndexedColors.WHITE.getIndex());
            titulo = wb.createCellStyle();
            titulo.setFont(fontTitulo);
            titulo.setFillForegroundColor(IndexedColors.GREY_50_PERCENT.getIndex());
            titulo.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            titulo.setAlignment(HorizontalAlignment.LEFT);
            titulo.setVerticalAlignment(VerticalAlignment.CENTER);

            Font fontCabecera = wb.createFont();
            fontCabecera.setBold(true);
            cabeceraTabla = wb.createCellStyle();
            cabeceraTabla.setFont(fontCabecera);
            cabeceraTabla.setFillForegroundColor(IndexedColors.GREY_25_PERCENT.getIndex());
            cabeceraTabla.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            cabeceraTabla.setBorderBottom(BorderStyle.THIN);
            cabeceraTabla.setBorderTop(BorderStyle.THIN);

            etiqueta = wb.createCellStyle();
            etiqueta.setVerticalAlignment(VerticalAlignment.TOP);

            short formatoEntero = wb.createDataFormat().getFormat("0");
            numeroEntero = wb.createCellStyle();
            numeroEntero.setDataFormat(formatoEntero);

            short formatoDecimal = wb.createDataFormat().getFormat("0.00");
            numeroDecimal = wb.createCellStyle();
            numeroDecimal.setDataFormat(formatoDecimal);
        }
    }
}
