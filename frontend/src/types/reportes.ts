/**
 * Tipos compartidos entre `reportes-service` y la pagina `/reportes`.
 * Reflejan los campos camelCase que devuelve `GET /api/reportes`
 * (ver `sistemaincidencias/.../reportes/dto/*` y el Postman
 * `Reportes > Obtener reporte JSON`).
 */

/** Preset de ventana temporal aceptado por el endpoint. */
export type Rango = "7d" | "30d" | "90d" | "all"

/** Granularidad del bucket de la serie temporal. */
export type Granularidad = "DIARIA" | "SEMANAL" | "MENSUAL"

/** Filtros de transporte que la UI envia al backend. */
export type ReporteFiltro = {
  desde?: string
  hasta?: string
  rango?: Rango
  agenteId?: string | null
  granularidad?: Granularidad
}

export type ReporteFiltroAplicado = {
  desde: string | null
  hasta: string | null
  rangoAplicado: Rango
  granularidad: Granularidad
}

export type ReporteKpiResponse = {
  total: number
  byEstadoAprobacion: Record<string, number>
  byEstadoProceso: Record<string, number>
  byPrioridad: Record<string, number>
}

export type ReporteConteoCategoria = {
  categoriaId: string
  categoriaNombre: string
  total: number
}

export type ReporteTendencia = {
  bucketInicio: string
  total: number
}

export type ReporteResumenAgente = {
  agenteId: string
  agenteNombre: string
  totalAsignadas: number
  resueltas: number
  pendientes: number
  enProceso: number
  promedioResolucionHoras: number | null
}

export type ReporteDetalle = {
  id: string
  codigo: string
  titulo: string
  categoriaNombre: string
  asignadoA: string | null
  estadoProcesoCodigo: string
  estadoAprobacionCodigo: string
  prioridad: "BAJA" | "MEDIA" | "ALTA" | "CRITICA"
  creadoEn: string
  resueltoEn: string | null
}

export type ReporteResponse = {
  filtro: ReporteFiltroAplicado
  kpis: ReporteKpiResponse
  byCategoria: ReporteConteoCategoria[]
  tendencia: ReporteTendencia[]
  resumenPorAgente: ReporteResumenAgente[]
  tiempoPromedioResolucionHoras: number | null
  detalle: ReporteDetalle[]
}
