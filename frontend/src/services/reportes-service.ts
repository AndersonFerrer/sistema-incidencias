import { apiRequest } from "@/lib/http"
import type {
  ReporteFiltro,
  ReporteResponse,
} from "@/types/reportes"

/**
 * Construye un query string a partir de un `ReporteFiltro`.
 * Omite claves vacias o nulas para no contaminar el cache del backend.
 */
function buildQuery(filtro: ReporteFiltro): string {
  const params = new URLSearchParams()
  if (filtro.desde) params.set("desde", filtro.desde)
  if (filtro.hasta) params.set("hasta", filtro.hasta)
  if (filtro.rango) params.set("rango", filtro.rango)
  if (filtro.agenteId) params.set("agenteId", filtro.agenteId)
  if (filtro.granularidad) params.set("granularidad", filtro.granularidad)
  const qs = params.toString()
  return qs ? `?${qs}` : ""
}

function buildExportQuery(filtro: ReporteFiltro, formato: "pdf" | "xlsx"): string {
  const params = new URLSearchParams()
  if (filtro.desde) params.set("desde", filtro.desde)
  if (filtro.hasta) params.set("hasta", filtro.hasta)
  if (filtro.rango) params.set("rango", filtro.rango)
  if (filtro.agenteId) params.set("agenteId", filtro.agenteId)
  if (filtro.granularidad) params.set("granularidad", filtro.granularidad)
  params.set("formato", formato)
  return `?${params.toString()}`
}

/**
 * Dispara la descarga de un `Blob` simulando el click en un `<a download>`.
 * Revoca la URL inmediatamente despues para no dejar refs colgadas.
 */
export function iniciarDescarga(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

/**
 * Wrappers finos sobre `GET /api/reportes` (JSON) y
 * `GET /api/reportes/exportar?formato=pdf|xlsx` (Blob).
 */
export const reportesService = {
  obtener(filtro: ReporteFiltro, signal?: AbortSignal): Promise<ReporteResponse> {
    return apiRequest<ReporteResponse>(
      `/api/reportes${buildQuery(filtro)}`,
      { method: "GET", signal }
    )
  },

  descargarPdf(filtro: ReporteFiltro, signal?: AbortSignal): Promise<Blob> {
    return apiRequest<Blob>(
      `/api/reportes/exportar${buildExportQuery(filtro, "pdf")}`,
      { method: "GET", signal, responseType: "blob" }
    )
  },

  descargarExcel(filtro: ReporteFiltro, signal?: AbortSignal): Promise<Blob> {
    return apiRequest<Blob>(
      `/api/reportes/exportar${buildExportQuery(filtro, "xlsx")}`,
      { method: "GET", signal, responseType: "blob" }
    )
  },
}
