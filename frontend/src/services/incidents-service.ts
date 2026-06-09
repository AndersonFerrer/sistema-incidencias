import { apiRequest } from "@/lib/http"
import type {
  IncidenciaDetalle,
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

  obtenerDetalle(id: string) {
    return apiRequest<IncidenciaDetalle>(`/api/incidencias/${id}`, {
      method: "GET",
    })
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

  aprobarRechazar(
    id: string,
    accion: "aprobar" | "rechazar",
    nota?: string
  ) {
    const params = new URLSearchParams()
    params.set("accion", accion)
    if (nota) {
      params.set("nota", nota)
    }
    return apiRequest<Incidencia>(
      `/api/incidencias/${id}/aprobacion?${params.toString()}`,
      { method: "PATCH" }
    )
  },

  cambiarEstado(
    id: string,
    input: { estadoProcesoId: string; nota?: string }
  ) {
    return apiRequest<Incidencia>(`/api/incidencias/${id}/estado`, {
      method: "PATCH",
      body: JSON.stringify(input),
    })
  },

  agregarComentario(
    id: string,
    input: { contenido: string; autorId?: string }
  ) {
    return apiRequest(`/api/incidencias/${id}/comentarios`, {
      method: "POST",
      body: JSON.stringify(input),
    })
  },
}
