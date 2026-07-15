import {
  chartColors,
  pieColors,
  priorityLabels,
  statusLabels,
} from "@/pages/dashboard/data"
import type { Rango } from "@/types/reportes"

/**
 * Configuracion visual y etiquetas especificas de la pagina `/reportes`.
 * Reutiliza `chartColors` / `pieColors` / `statusLabels` / `priorityLabels`
 * del dashboard; aqui solo anade presets extendidos y labels de granularidad.
 */

export const RANGO_POR_DEFECTO: Rango = "30d"

export const RANGOS_DISPONIBLES: ReadonlyArray<{
  codigo: Rango | "custom"
  etiqueta: string
}> = [
  { codigo: "7d", etiqueta: "Últimos 7 días" },
  { codigo: "30d", etiqueta: "Últimos 30 días" },
  { codigo: "90d", etiqueta: "Últimos 90 días" },
  { codigo: "all", etiqueta: "Todo el histórico" },
  { codigo: "custom", etiqueta: "Rango personalizado" },
]

export const GRANULARIDADES_DISPONIBLES = [
  { codigo: "DIARIA", etiqueta: "Diaria" },
  { codigo: "SEMANAL", etiqueta: "Semanal" },
  { codigo: "MENSUAL", etiqueta: "Mensual" },
] as const

export const GRANULARIDAD_POR_DEFECTO = "SEMANAL" as const

export { chartColors, pieColors, statusLabels, priorityLabels }
