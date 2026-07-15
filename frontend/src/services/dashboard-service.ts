import { apiRequest } from "@/lib/http"
import type { Prioridad } from "@/types/incidencias"

/**
 * Rango temporal aceptado por el endpoint `GET /api/dashboard`.
 * El backend enums el parametro `rango` a este mismo set (ver
 * `dashboard.controller.DashboardController#obtener`).
 */
export type Rango = "7d" | "30d" | "90d" | "all"

export const RANGO_POR_DEFECTO: Rango = "30d"

export const RANGOS_DISPONIBLES: ReadonlyArray<{
  codigo: Rango
  etiqueta: string
}> = [
  { codigo: "7d", etiqueta: "Últimos 7 días" },
  { codigo: "30d", etiqueta: "Últimos 30 días" },
  { codigo: "90d", etiqueta: "Últimos 90 días" },
  { codigo: "all", etiqueta: "Todo el histórico" },
]

export type Kpis = {
  total: number
  byEstadoAprobacion: Record<string, number>
  byEstadoProceso: Record<string, number>
}

export type CategoriaConteo = {
  categoriaId: string
  categoriaNombre: string
  total: number
}

export type TendenciaSemanal = {
  semanaInicio: string
  total: number
}

export type IncidenciaResumen = {
  id: string
  codigo: string
  titulo: string
  categoriaNombre: string
  asignadoA: string | null
  estadoProcesoCodigo: string
  estadoAprobacionCodigo: string
  prioridad: Prioridad
  creadoEn: string
  resueltoEn: string | null
}

export type Dashboard = {
  kpis: Kpis
  byCategoria: CategoriaConteo[]
  tendenciaSemanal: TendenciaSemanal[]
  recientes: IncidenciaResumen[]
  tiempoPromedioResolucionHoras: number | null
  rangoAplicado: Rango
}

export const dashboardService = {
  obtener(rango: Rango = RANGO_POR_DEFECTO, signal?: AbortSignal) {
    return apiRequest<Dashboard>(`/api/dashboard?rango=${rango}`, {
      method: "GET",
      signal,
    })
  },
}
