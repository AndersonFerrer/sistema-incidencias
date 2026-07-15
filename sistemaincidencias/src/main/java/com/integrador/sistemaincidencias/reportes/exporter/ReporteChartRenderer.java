package com.integrador.sistemaincidencias.reportes.exporter;

import com.integrador.sistemaincidencias.reportes.dto.ReporteTendenciaResponse;
import java.awt.BasicStroke;
import java.awt.Color;
import java.awt.Font;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.format.DateTimeFormatter;
import java.util.List;
import javax.imageio.ImageIO;

/**
 * Renderiza la serie temporal del reporte como una imagen PNG deterministica
 * en memoria (RF-43, design.md D7 y seccion 6).
 *
 * <p>El mismo {@code byte[]} se incrusta en el PDF (vía
 * {@code PDImageXObject.createFromByteArray}) y en la hoja {@code Charts} del
 * XLSX (vía {@code XSSFWorkbook.addPicture}). El render usa Java2D puro, sin
 * librerias externas de chart, para mantener las dependencias acotadas y
 * producir el mismo resultado en cada ejecucion.</p>
 *
 * <p>Si la lista viene vacia (rango sin datos) se dibuja un placeholder
 * explicito; nunca se inventan puntos. El tamano del lienzo es fijo
 * ({@value #ANCHO} x {@value #ALTO}) para que ambos exporters puedan reservarlo
 * sin recalcular layout.</p>
 */
public final class ReporteChartRenderer {

    static final int ANCHO = 600;
    static final int ALTO = 240;
    private static final DateTimeFormatter ETIQUETA_MES = DateTimeFormatter.ofPattern("MM-dd");

    private ReporteChartRenderer() {
    }

    /**
     * Genera el PNG de barras para los buckets entregados. Retorna un arreglo
     * no nulo; nunca se devuelve vacio.
     */
    public static byte[] renderizarPng(List<ReporteTendenciaResponse> buckets) {
        BufferedImage imagen = new BufferedImage(ANCHO, ALTO, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = imagen.createGraphics();
        try {
            g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
            g.setRenderingHint(RenderingHints.KEY_TEXT_ANTIALIASING, RenderingHints.VALUE_TEXT_ANTIALIAS_ON);
            g.setColor(Color.WHITE);
            g.fillRect(0, 0, ANCHO, ALTO);
            g.setColor(new Color(50, 50, 50));
            g.setFont(new Font(Font.SANS_SERIF, Font.BOLD, 13));
            g.drawString("Tendencia de incidencias", 16, 22);
            if (buckets == null || buckets.isEmpty()) {
                g.setColor(new Color(120, 120, 120));
                g.setFont(new Font(Font.SANS_SERIF, Font.PLAIN, 12));
                g.drawString("Sin datos en el rango seleccionado", 16, ALTO / 2);
                return aPng(imagen);
            }

            int margenIzq = 48;
            int margenDer = 16;
            int margenSup = 36;
            int margenInf = 36;
            int anchoGrafico = ANCHO - margenIzq - margenDer;
            int altoGrafico = ALTO - margenSup - margenInf;

            long maximo = buckets.stream()
                    .mapToLong(ReporteTendenciaResponse::getTotal)
                    .max()
                    .orElse(1L);

            // Ejes
            g.setColor(new Color(200, 200, 200));
            g.setStroke(new BasicStroke(1f));
            g.drawLine(margenIzq, margenSup, margenIzq, ALTO - margenInf);
            g.drawLine(margenIzq, ALTO - margenInf, ANCHO - margenDer, ALTO - margenInf);

            // Linea base (maximo) + 0
            g.setColor(new Color(120, 120, 120));
            g.setFont(new Font(Font.SANS_SERIF, Font.PLAIN, 9));
            g.drawString(String.valueOf(maximo), 4, margenSup + 4);
            g.drawString("0", 32, ALTO - margenInf - 2);

            // Barras
            int cantidad = buckets.size();
            int anchoBarra = Math.max(6, Math.min(40, anchoGrafico / Math.max(1, cantidad) - 6));
            int espacio = Math.max(2, (anchoGrafico - anchoBarra * cantidad) / Math.max(1, cantidad + 1));
            g.setColor(new Color(60, 110, 180));
            for (int i = 0; i < cantidad; i++) {
                ReporteTendenciaResponse bucket = buckets.get(i);
                long total = bucket.getTotal();
                int altoBarra = (int) Math.round((double) total / Math.max(1L, maximo) * altoGrafico);
                int x = margenIzq + espacio + i * (anchoBarra + espacio);
                int y = ALTO - margenInf - altoBarra;
                g.fillRect(x, y, anchoBarra, altoBarra);
                g.setColor(Color.DARK_GRAY);
                g.setFont(new Font(Font.SANS_SERIF, Font.PLAIN, 9));
                g.drawString(String.valueOf(total), x, Math.max(margenSup + 10, y - 3));
                String etiqueta = bucket.getBucketInicio().format(ETIQUETA_MES);
                g.drawString(etiqueta, x - 2, ALTO - margenInf + 14);
                g.setColor(new Color(60, 110, 180));
            }
            return aPng(imagen);
        } finally {
            g.dispose();
        }
    }

    private static byte[] aPng(BufferedImage imagen) {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        try {
            ImageIO.write(imagen, "png", baos);
        } catch (IOException ex) {
            throw new IllegalStateException("No se pudo serializar el chart PNG", ex);
        }
        return baos.toByteArray();
    }
}
