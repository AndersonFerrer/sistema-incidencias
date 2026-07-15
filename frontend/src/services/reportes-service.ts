import { apiRequest } from "@/lib/http"
import type {
  ReporteFiltro,
  ReporteResponse,
} from "@/types/reportes"

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

function buildExportQuery(
  filtro: ReporteFiltro,
  formato: "pdf" | "xlsx"
): string {
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
 * Dispara descarga de un `Blob` simulando click en `<a download>`.
 * Revoca la URL object para no dejar refs colgadas.
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

export const reportesService = {
  obtener(filtro: ReporteFiltro, signal?: AbortSignal): Promise<ReporteResponse> {
    return apiRequest<ReporteResponse>(`/api/reportes${buildQuery(filtro)}`, {
      method: "GET",
      signal,
    })
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
