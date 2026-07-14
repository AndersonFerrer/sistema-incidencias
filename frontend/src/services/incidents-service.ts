import { apiRequest } from "@/lib/http"
import type {
  IncidenciaDetalle,
  IncidenciasFiltros,
  Incidencia,
  IncidenciaAdjunto,
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

export type ActualizarIncidenciaInput = {
  titulo: string
  descripcion: string
  categoriaId: string
  prioridad: Prioridad
  asignadoA?: string | null
  archivos?: File[]
}

export const incidentsService = {
  listar(filtros: IncidenciasFiltros = {}, signal?: AbortSignal) {
    return apiRequest<Page<Incidencia>>(
      `/api/incidencias${buildQuery(filtros)}`,
      { method: "GET", signal }
    )
  },

  obtenerDetalle(id: string, signal?: AbortSignal) {
    return apiRequest<IncidenciaDetalle>(`/api/incidencias/${id}`, {
      method: "GET",
      signal,
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

  actualizar(
    id: string,
    input: ActualizarIncidenciaInput,
    signal?: AbortSignal
  ) {
    if (input.archivos && input.archivos.length > 0) {
      const formData = new FormData()
      formData.append("titulo", input.titulo)
      formData.append("descripcion", input.descripcion)
      formData.append("categoriaId", input.categoriaId)
      formData.append("prioridad", input.prioridad)
      if (input.asignadoA) {
        formData.append("asignadoA", input.asignadoA)
      }
      input.archivos.forEach((archivo) => {
        formData.append("archivos", archivo)
      })

      return apiRequest<Incidencia>(`/api/incidencias/${id}`, {
        method: "PUT",
        body: formData,
        signal,
      })
    }

    return apiRequest<Incidencia>(`/api/incidencias/${id}`, {
      method: "PUT",
      body: JSON.stringify({
        titulo: input.titulo,
        descripcion: input.descripcion,
        categoriaId: input.categoriaId,
        prioridad: input.prioridad,
        asignadoA: input.asignadoA ?? null,
      }),
      signal,
    })
  },

  subirAdjuntos(id: string, archivos: File[], signal?: AbortSignal) {
    const formData = new FormData()
    archivos.forEach((archivo) => {
      formData.append("archivos", archivo)
    })

    return apiRequest<IncidenciaAdjunto[]>(
      `/api/incidencias/${id}/adjuntos`,
      {
        method: "POST",
        body: formData,
        signal,
      }
    )
  },

  eliminar(id: string, signal?: AbortSignal) {
    return apiRequest<void>(`/api/incidencias/${id}`, {
      method: "DELETE",
      signal,
    })
  },

  aprobarRechazar(
    id: string,
    accion: "aprobar" | "rechazar",
    input: { motivoRechazo?: string } = {}
  ) {
    const params = new URLSearchParams()
    params.set("accion", accion)
    return apiRequest<Incidencia>(
      `/api/incidencias/${id}/aprobacion?${params.toString()}`,
      {
        method: "PATCH",
        body: JSON.stringify(input),
      }
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