import { apiRequest } from "@/lib/http"
import type {
  IncidenciasFiltros,
  Incidencia,
  Page,
} from "@/types/incidencias"

function buildQuery(filtros: IncidenciasFiltros = {}): string {
  const params = new URLSearchParams()

  const setIfPresent = (key: string, value: string | number | undefined) => {
    if (value === undefined || value === null || value === "") return
    params.set(key, String(value))
  }

  setIfPresent("texto", filtros.texto)
  setIfPresent("clienteId", filtros.clienteId)
  setIfPresent("estadoProcesoId", filtros.estadoProcesoId)
  setIfPresent("estadoAprobacionId", filtros.estadoAprobacionId)
  setIfPresent("categoriaId", filtros.categoriaId)
  setIfPresent("asignadoA", filtros.asignadoA)
  setIfPresent("prioridad", filtros.prioridad)
  setIfPresent("desde", filtros.desde)
  setIfPresent("hasta", filtros.hasta)
  setIfPresent("page", filtros.page ?? 0)
  setIfPresent("size", filtros.size ?? 20)

  const query = params.toString()
  return query ? `?${query}` : ""
}

export const incidentsService = {
  listar(filtros: IncidenciasFiltros = {}) {
    return apiRequest<Page<Incidencia>>(
      `/api/incidencias${buildQuery(filtros)}`,
      { method: "GET" }
    )
  },
}
