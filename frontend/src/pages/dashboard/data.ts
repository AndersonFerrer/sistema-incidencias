/**
 * Configuracion visual estatica usada por los componentes del dashboard.
 * Los datos dinamicos (KPIs, charts, recientes) ya no viven aqui: la
 * pagina los obtiene de `GET /api/dashboard` via `dashboardService`.
 */

export const chartColors = {
  grid: "hsl(214 32% 91%)",
  text: "hsl(220 13% 46%)",
  blue: "hsl(217 91% 50%)",
  blueDark: "hsl(217 91% 40%)",
  green: "hsl(142 71% 45%)",
  orange: "hsl(38 92% 50%)",
  red: "hsl(0 72% 51%)",
  slate: "hsl(220 14% 75%)",
}

export const pieColors = [
  chartColors.slate,
  chartColors.blue,
  chartColors.orange,
  chartColors.blueDark,
  chartColors.green,
  chartColors.red,
]

/**
 * Etiquetas en espanol para los codigos canónicos que devuelve el backend:
 * - aprobacion: SOLICITADA | APROBADA | RECHAZADA
 * - proceso:    PENDIENTE | EN_PROCESO | FINALIZADA
 */
export const statusLabels: Record<string, string> = {
  SOLICITADA: "Solicitada",
  APROBADA: "Aprobada",
  RECHAZADA: "Rechazada",
  PENDIENTE: "Pendiente",
  EN_PROCESO: "En Proceso",
  FINALIZADA: "Finalizada",
}

/**
 * Etiquetas para los valores del enum `Prioridad` (BAJA | MEDIA | ALTA |
 * CRITICA). Se mantienen en MAYUSCULAS para mapear directamente los codigos
 * que llegan en `IncidenciaResumen.prioridad`.
 */
export const priorityLabels: Record<string, string> = {
  BAJA: "Baja",
  MEDIA: "Media",
  ALTA: "Alta",
  CRITICA: "Crítica",
}
