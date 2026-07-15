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
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.apache.pdfbox.pdmodel.graphics.image.PDImageXObject;
import org.springframework.stereotype.Component;

/**
 * Exportador PDF del reporte (RF-44, design.md D7 y seccion 6.1).
 *
 * <p>Construye un documento PDF/A4 con encabezado, tabla de KPIs, distribuciones
 * por estado/categoria/prioridad, tendencia (tabla + chart), agente (cuando el
 * scope lo permite) y el detalle top 50. Recursos PDFBox siempre se cierran
 * en bloques {@code try-with-resources} o {@code try/finally}.</p>
 *
 * <p>No consulta la base de datos; recibe el {@link ReporteResponse} ya
 * construido por el servicio (design.md D6) garantizando que la vista previa y
 * la descarga usen el mismo filtro, scope y datos.</p>
 */
@Component
public class ReportePdfExporter {

    private static final float MARGEN = 50f;
    private static final PDRectangle PAGINA = PDRectangle.A4;
    private static final float ANCHO = PAGINA.getWidth();
    private static final float ALTO = PAGINA.getHeight();
    private static final float ANCHO_UTIL = ANCHO - 2f * MARGEN;

    private static final float TAM_TITULO = 18f;
    private static final float TAM_H2 = 13f;
    private static final float TAM_CUERPO = 9.5f;
    private static final float TAM_DETALLE = 8.5f;
    private static final float INTERLINEADO = 13f;

    private static final PDType1Font HELVETICA = new PDType1Font(Standard14Fonts.FontName.HELVETICA);
    private static final PDType1Font HELVETICA_BOLD = new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD);

    private static final DateTimeFormatter FECHA_HORA = DateTimeFormatter.ofPattern(
            "yyyy-MM-dd HH:mm", new Locale("es", "PE"));

    /**
     * Renderiza el dataset como bytes PDF. Toda la disposicion de paginas y el
     * cierre del documento viven dentro del {@code try-with-resources}.
     */
    public byte[] exportar(ReporteResponse dataset) {
        try (PDDocument doc = new PDDocument();
                ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            renderizar(doc, dataset);
            escribirPies(doc);
            doc.save(baos);
            return baos.toByteArray();
        } catch (IOException ex) {
            throw new IllegalStateException("No se pudo serializar el PDF del reporte", ex);
        }
    }

    private void renderizar(PDDocument doc, ReporteResponse dataset) throws IOException {
        try (Cursor cursor = new Cursor(doc)) {
            cursor.y = escribirEncabezado(cursor, dataset);
            cursor.y = requireSpace(cursor, 4 * INTERLINEADO);
            cursor.y = escribirSeccion(cursor, "1. Resumen (KPIs)");
            cursor.y = escribirTablaKpis(cursor, dataset.getKpis(),
                    dataset.getTiempoPromedioResolucionHoras());

            cursor.y += INTERLINEADO;
            cursor.y = requireSpace(cursor, 6 * INTERLINEADO);
            cursor.y = escribirSeccion(cursor, "2. Distribucion por estado");
            cursor.y = escribirTablaEstado(cursor, "Estado de proceso",
                    dataset.getKpis().getByEstadoProceso());
            cursor.y = escribirTablaEstado(cursor, "Estado de aprobacion",
                    dataset.getKpis().getByEstadoAprobacion());

            cursor.y += INTERLINEADO;
            cursor.y = requireSpace(cursor, 4 * INTERLINEADO + 40);
            cursor.y = escribirSeccion(cursor, "3. Distribucion por categoria");
            cursor.y = escribirTablaCategoria(cursor, dataset.getByCategoria());

            cursor.y += INTERLINEADO;
            cursor.y = requireSpace(cursor, 4 * INTERLINEADO + 40);
            cursor.y = escribirSeccion(cursor, "4. Distribucion por prioridad");
            cursor.y = escribirTablaPrioridad(cursor, dataset.getKpis().getByPrioridad());

            cursor.y += INTERLINEADO;
            cursor.y = requireSpace(cursor, 5 * INTERLINEADO + 60);
            cursor.y = escribirSeccion(cursor, "5. Tendencia");
            cursor.y = escribirTendencia(cursor, dataset.getTendencia());

            cursor.y += INTERLINEADO;
            if (!dataset.getResumenPorAgente().isEmpty()) {
                cursor.y = requireSpace(cursor, 4 * INTERLINEADO + 40);
                cursor.y = escribirSeccion(cursor, "6. Resumen por agente");
                cursor.y = escribirTablaAgente(cursor, dataset.getResumenPorAgente());
            } else {
                cursor.y = requireSpace(cursor, 3 * INTERLINEADO);
                cursor.y = escribirSeccion(cursor, "6. Resumen por agente");
                escribirLinea(cursor,
                        "No aplica para este alcance (rol USUARIO o sin agentes asignados).");
                cursor.y -= INTERLINEADO;
            }

            cursor.y += INTERLINEADO;
            cursor.y = requireSpace(cursor, 4 * INTERLINEADO + 20);
            cursor.y = escribirSeccion(cursor, "7. Detalle (ultimos 50)");
            cursor.y = escribirDetalle(cursor, dataset.getDetalle());
        }
    }

    private float escribirEncabezado(Cursor cursor, ReporteResponse dataset) throws IOException {
        LocalDateTime ahora = LocalDateTime.now();
        escribirTexto(cursor.stream, "Reporte de Incidencias", HELVETICA_BOLD, TAM_TITULO,
                MARGEN, cursor.y);
        cursor.y -= TAM_TITULO + 4f;
        escribirTexto(cursor.stream, "Generado: " + ahora.format(FECHA_HORA),
                HELVETICA, TAM_CUERPO, MARGEN, cursor.y);
        cursor.y -= INTERLINEADO;
        String rango = dataset.getFiltro().getRangoAplicado();
        String desde = dataset.getFiltro().getDesde() == null ? "historico"
                : dataset.getFiltro().getDesde().toString();
        String hasta = dataset.getFiltro().getHasta() == null ? "hoy" : dataset.getFiltro().getHasta().toString();
        escribirTexto(cursor.stream,
                "Rango: " + rango + " (" + desde + " a " + hasta + ")  -  Granularidad: "
                + dataset.getFiltro().getGranularidad(),
                HELVETICA, TAM_CUERPO, MARGEN, cursor.y);
        cursor.y -= INTERLINEADO;
        escribirLineaHorizontal(cursor.stream, MARGEN, cursor.y, ANCHO_UTIL);
        return cursor.y - 6f;
    }

    private float escribirSeccion(Cursor cursor, String titulo) throws IOException {
        escribirTexto(cursor.stream, titulo, HELVETICA_BOLD, TAM_H2, MARGEN, cursor.y);
        cursor.y -= TAM_H2 + 2f;
        escribirLineaHorizontal(cursor.stream, MARGEN, cursor.y, ANCHO_UTIL);
        return cursor.y - INTERLINEADO;
    }

    private float escribirTablaKpis(Cursor cursor, ReporteKpiResponse kpis, Double promedio)
            throws IOException {
        float[][] cols = {{0f, 200f}, {200f, 100f}, {300f, 80f}};
        float yCursor = cursor.y;
        escribirFilaTabla(cursor.stream, new String[]{"Indicador", "Valor", "Unidad"},
                HELVETICA_BOLD, TAM_CUERPO, cols, yCursor, true);
        yCursor -= INTERLINEADO;
        escribirFilaTabla(cursor.stream,
                new String[]{"Total de incidencias", String.valueOf(kpis.getTotal()), "casos"},
                HELVETICA, TAM_CUERPO, cols, yCursor, false);
        yCursor = escribirFilaKpiEstado(yCursor, cursor, cols, "Por estado de aprobacion",
                kpis.getByEstadoAprobacion());
        yCursor = escribirFilaKpiEstado(yCursor, cursor, cols, "Por estado de proceso",
                kpis.getByEstadoProceso());
        yCursor = escribirFilaKpiEstado(yCursor, cursor, cols, "Por prioridad",
                kpis.getByPrioridad());
        escribirFilaTabla(cursor.stream,
                new String[]{"Tiempo promedio de resolucion",
                        promedio == null ? "-" : String.format(Locale.ROOT, "%.2f", promedio),
                        "horas"},
                HELVETICA, TAM_CUERPO, cols, yCursor, false);
        yCursor -= INTERLINEADO;
        cursor.y = yCursor;
        return cursor.y;
    }

    private float escribirFilaKpiEstado(float yCursor, Cursor cursor, float[][] cols,
            String etiqueta, Map<String, Long> conteos) throws IOException {
        String texto = conteos.entrySet().stream()
                .sorted(Map.Entry.comparingByKey())
                .map(e -> e.getKey() + "=" + e.getValue())
                .reduce((a, b) -> a + ", " + b)
                .orElse("-");
        escribirFilaTabla(cursor.stream,
                new String[]{etiqueta, texto, ""},
                HELVETICA, TAM_CUERPO, cols, yCursor, false);
        return yCursor - INTERLINEADO;
    }

    private float escribirTablaEstado(Cursor cursor, String titulo, Map<String, Long> conteos)
            throws IOException {
        float[][] cols = {{0f, 220f}, {220f, 120f}, {340f, 80f}};
        escribirTexto(cursor.stream, titulo, HELVETICA_BOLD, TAM_CUERPO, MARGEN, cursor.y);
        cursor.y -= INTERLINEADO;
        float yCursor = cursor.y;
        escribirFilaTabla(cursor.stream, new String[]{"Estado", "Cantidad", "%"},
                HELVETICA_BOLD, TAM_CUERPO, cols, yCursor, true);
        yCursor -= INTERLINEADO;
        long total = conteos.values().stream().mapToLong(Long::longValue).sum();
        for (Map.Entry<String, Long> entry : conteos.entrySet()) {
            String pct = total == 0 ? "0%"
                    : String.format(Locale.ROOT, "%.1f%%", entry.getValue() * 100.0 / total);
            escribirFilaTabla(cursor.stream,
                    new String[]{entry.getKey(), String.valueOf(entry.getValue()), pct},
                    HELVETICA, TAM_CUERPO, cols, yCursor, false);
            yCursor -= INTERLINEADO;
        }
        cursor.y = yCursor;
        return cursor.y;
    }

    private float escribirTablaCategoria(Cursor cursor, List<ReporteConteoCategoriaResponse> filas)
            throws IOException {
        float[][] cols = {{0f, 320f}, {320f, 100f}};
        if (filas.isEmpty()) {
            escribirLinea(cursor, "Sin categorias con incidencias en el rango.");
            cursor.y -= INTERLINEADO;
            return cursor.y;
        }
        float yCursor = cursor.y;
        escribirFilaTabla(cursor.stream, new String[]{"Categoria", "Cantidad"},
                HELVETICA_BOLD, TAM_CUERPO, cols, yCursor, true);
        yCursor -= INTERLINEADO;
        for (ReporteConteoCategoriaResponse fila : filas) {
            escribirFilaTabla(cursor.stream,
                    new String[]{fila.getCategoriaNombre(), String.valueOf(fila.getTotal())},
                    HELVETICA, TAM_CUERPO, cols, yCursor, false);
            yCursor -= INTERLINEADO;
        }
        cursor.y = yCursor - INTERLINEADO;
        return cursor.y;
    }

    private float escribirTablaPrioridad(Cursor cursor, Map<String, Long> conteos)
            throws IOException {
        float[][] cols = {{0f, 220f}, {220f, 120f}};
        float yCursor = cursor.y;
        escribirFilaTabla(cursor.stream, new String[]{"Prioridad", "Cantidad"},
                HELVETICA_BOLD, TAM_CUERPO, cols, yCursor, true);
        yCursor -= INTERLINEADO;
        java.util.List<java.util.Map.Entry<String, Long>> ordenados = new java.util.ArrayList<>(conteos.entrySet());
        ordenados.sort((a, b) -> Long.compare(b.getValue(), a.getValue()));
        for (java.util.Map.Entry<String, Long> entry : ordenados) {
            escribirFilaTabla(cursor.stream,
                    new String[]{entry.getKey(), String.valueOf(entry.getValue())},
                    HELVETICA, TAM_CUERPO, cols, yCursor, false);
            yCursor -= INTERLINEADO;
        }
        cursor.y = yCursor - INTERLINEADO;
        return cursor.y;
    }

    private float escribirTendencia(Cursor cursor, List<ReporteTendenciaResponse> buckets)
            throws IOException {
        float[][] cols = {{0f, 140f}, {140f, 80f}};
        if (buckets.isEmpty()) {
            escribirLinea(cursor, "Sin buckets en el rango (rango vacio o sin datos).");
            cursor.y -= INTERLINEADO;
            return cursor.y;
        }
        float yCursor = cursor.y;
        escribirFilaTabla(cursor.stream, new String[]{"Bucket inicio", "Total"},
                HELVETICA_BOLD, TAM_CUERPO, cols, yCursor, true);
        yCursor -= INTERLINEADO;
        for (ReporteTendenciaResponse bucket : buckets) {
            escribirFilaTabla(cursor.stream,
                    new String[]{bucket.getBucketInicio().toString(),
                            String.valueOf(bucket.getTotal())},
                    HELVETICA, TAM_CUERPO, cols, yCursor, false);
            yCursor -= INTERLINEADO;
        }
        yCursor -= INTERLINEADO;
        byte[] png = ReporteChartRenderer.renderizarPng(buckets);
        cursor.y = requireSpace(cursor, ReporteChartRenderer.ALTO);
        PDImageXObject imagen = PDImageXObject.createFromByteArray(cursor.doc, png, "trend");
        float anchoImg = Math.min(ANCHO_UTIL, ReporteChartRenderer.ANCHO);
        float altoImg = ReporteChartRenderer.ALTO;
        cursor.stream.drawImage(imagen, MARGEN, cursor.y - altoImg, anchoImg, altoImg);
        cursor.y -= altoImg + INTERLINEADO;
        return cursor.y;
    }

    private float escribirTablaAgente(Cursor cursor, List<ReporteResumenAgenteResponse> filas)
            throws IOException {
        float[][] cols = {{0f, 200f}, {200f, 60f}, {260f, 60f}, {320f, 60f}, {380f, 70f}, {450f, 50f}};
        float yCursor = cursor.y;
        escribirFilaTabla(cursor.stream,
                new String[]{"Agente", "Asig.", "Resueltas", "Pend.", "En proc.", "Prom.(h)"},
                HELVETICA_BOLD, TAM_CUERPO, cols, yCursor, true);
        yCursor -= INTERLINEADO;
        for (ReporteResumenAgenteResponse fila : filas) {
            String prom = fila.getPromedioResolucionHoras() == null
                    ? "-" : String.format(Locale.ROOT, "%.1f", fila.getPromedioResolucionHoras());
            escribirFilaTabla(cursor.stream,
                    new String[]{
                            fila.getAgenteNombre(),
                            String.valueOf(fila.getTotalAsignadas()),
                            String.valueOf(fila.getResueltas()),
                            String.valueOf(fila.getPendientes()),
                            String.valueOf(fila.getEnProceso()),
                            prom
                    },
                    HELVETICA, TAM_CUERPO, cols, yCursor, false);
            yCursor -= INTERLINEADO;
        }
        cursor.y = yCursor - INTERLINEADO;
        return cursor.y;
    }

    private float escribirDetalle(Cursor cursor, List<IncidenciaResumenResponse> detalle)
            throws IOException {
        if (detalle.isEmpty()) {
            escribirLinea(cursor, "Sin incidencias en el rango.");
            cursor.y -= INTERLINEADO;
            return cursor.y;
        }
        float[][] cols = {
                {0f, 60f}, {60f, 70f}, {130f, 140f}, {270f, 90f}, {360f, 80f},
                {440f, 60f}
        };
        String[] headers = {"Codigo", "Titulo", "Categoria", "Asignado", "Estado"};
        float yCursor = cursor.y;
        escribirFilaTabla(cursor.stream, headers, HELVETICA_BOLD, TAM_DETALLE, cols,
                yCursor, true);
        yCursor -= INTERLINEADO;
        for (IncidenciaResumenResponse fila : detalle) {
            String asignado = fila.getAsignadoA() == null ? "-" : fila.getAsignadoA().toString().substring(0, 8);
            String estado = fila.getEstadoProcesoCodigo() + "/" + fila.getEstadoAprobacionCodigo();
            String titulo = fila.getTitulo() == null ? "" : fila.getTitulo();
            if (titulo.length() > 22) {
                titulo = titulo.substring(0, 21) + ".";
            }
            String codigo = fila.getCodigo();
            String categoria = fila.getCategoriaNombre() == null ? "-" : fila.getCategoriaNombre();
            if (categoria.length() > 12) {
                categoria = categoria.substring(0, 11) + ".";
            }
            escribirFilaTabla(cursor.stream,
                    new String[]{codigo, titulo, categoria, asignado, estado},
                    HELVETICA, TAM_DETALLE, cols, yCursor, false);
            yCursor -= INTERLINEADO;
        }
        cursor.y = yCursor - INTERLINEADO;
        return cursor.y;
    }

    private void escribirPies(PDDocument doc) throws IOException {
        int total = doc.getNumberOfPages();
        for (int i = 0; i < total; i++) {
            PDPage page = doc.getPage(i);
            try (PDPageContentStream cs = new PDPageContentStream(doc, page,
                    PDPageContentStream.AppendMode.APPEND, true, true)) {
                String texto = "Pagina " + (i + 1) + " de " + total;
                float anchoTexto = HELVETICA.getStringWidth(texto) / 1000f * TAM_CUERPO;
                escribirTexto(cs, texto, HELVETICA, TAM_CUERPO,
                        (ANCHO - anchoTexto) / 2f, MARGEN / 2f);
            }
        }
    }

    private static void escribirTexto(PDPageContentStream cs, String texto, PDType1Font fuente,
            float tam, float x, float y) throws IOException {
        cs.beginText();
        cs.setFont(fuente, tam);
        cs.newLineAtOffset(x, y);
        cs.showText(texto);
        cs.endText();
    }

    private static void escribirLineaHorizontal(PDPageContentStream cs, float x, float y,
            float ancho) throws IOException {
        cs.moveTo(x, y);
        cs.lineTo(x + ancho, y);
        cs.stroke();
    }

    private static void escribirFilaTabla(PDPageContentStream cs, String[] celdas, PDType1Font fuente,
            float tam, float[][] cols, float y, boolean encabezado) throws IOException {
        if (encabezado) {
            cs.setNonStrokingColor(0.92f, 0.92f, 0.95f);
            cs.addRect(MARGEN, y - INTERLINEADO + 3f, ANCHO_UTIL, INTERLINEADO);
            cs.fill();
            cs.setNonStrokingColor(0f, 0f, 0f);
        }
        for (int i = 0; i < celdas.length && i < cols.length; i++) {
            escribirTexto(cs, celdas[i] == null ? "" : celdas[i], fuente, tam,
                    MARGEN + cols[i][0], y - 2f);
        }
    }

    private void escribirLinea(Cursor cursor, String texto) throws IOException {
        escribirTexto(cursor.stream, texto, HELVETICA, TAM_CUERPO, MARGEN, cursor.y);
    }

    private float requireSpace(Cursor cursor, float requerido) throws IOException {
        if (cursor.y - requerido < MARGEN) {
            cursor.nuevaPagina();
        }
        return cursor.y;
    }

    /**
     * Cursor mutable que lleva la posicion vertical actual y abre/cierra un
     * {@link PDPageContentStream} por pagina. Se libera con try-with-resources.
     */
    private static final class Cursor implements AutoCloseable {

        final PDDocument doc;
        PDPage page;
        PDPageContentStream stream;
        float y;

        Cursor(PDDocument doc) throws IOException {
            this.doc = doc;
            nuevaPagina();
        }

        void nuevaPagina() throws IOException {
            if (stream != null) {
                stream.close();
            }
            page = new PDPage(PAGINA);
            doc.addPage(page);
            stream = new PDPageContentStream(doc, page);
            y = ALTO - MARGEN;
        }

        @Override
        public void close() throws IOException {
            if (stream != null) {
                stream.close();
            }
        }
    }
}
