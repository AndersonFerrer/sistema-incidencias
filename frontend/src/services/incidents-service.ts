import { apiRequest } from "@/lib/http"
import type {
  IncidenciasFiltros,
  Incidencia,
  Page,
  Prioridad,
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

export type CrearIncidenciaInput = {
  titulo: string
  descripcion: string
  clienteId: string
  categoriaId: string
  prioridad: Prioridad
  usuarioExternoId?: string
  asignadoA?: string
  archivos?: File[]
}

export const incidentsService = {
  listar(filtros: IncidenciasFiltros = {}) {
    return apiRequest<Page<Incidencia>>(
      `/api/incidencias${buildQuery(filtros)}`,
      { method: "GET" }
    )
  },

  crear(input: CrearIncidenciaInput) {
    const formData = new FormData()
    formData.append("titulo", input.titulo)
    formData.append("descripcion", input.descripcion)
    formData.append("clienteId", input.clienteId)
    formData.append("categoriaId", input.categoriaId)
    formData.append("prioridad", input.prioridad)
    if (input.usuarioExternoId) {
      formData.append("usuarioExternoId", input.usuarioExternoId)
    }
    if (input.asignadoA) {
      formData.append("asignadoA", input.asignadoA)
    }
    input.archivos?.forEach((archivo) => {
      formData.append("archivos", archivo)
    })

    return apiRequest<Incidencia>("/api/incidencias", {
      method: "POST",
      body: formData,
    })
  },
}
