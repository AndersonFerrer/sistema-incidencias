import { apiRequest } from "@/lib/http"
import type { EstadoAprobacion } from "@/types/estados-aprobacion"

export type EstadoAprobacionInput = {
  clave: string
  etiqueta: string
  activo?: boolean
}

export const estadosAprobacionService = {
  listar() {
    return apiRequest<EstadoAprobacion[]>("/api/estados-aprobacion", {
      method: "GET",
    })
  },

  crear(input: EstadoAprobacionInput) {
    return apiRequest<EstadoAprobacion>("/api/estados-aprobacion", {
      method: "POST",
      body: JSON.stringify({
        clave: input.clave,
        etiqueta: input.etiqueta,
        activo: input.activo ?? true,
      }),
    })
  },

  actualizar(id: string, input: EstadoAprobacionInput) {
    return apiRequest<EstadoAprobacion>(`/api/estados-aprobacion/${id}`, {
      method: "PUT",
      body: JSON.stringify({
        clave: input.clave,
        etiqueta: input.etiqueta,
        activo: input.activo ?? true,
      }),
    })
  },

  eliminar(id: string) {
    return apiRequest<void>(`/api/estados-aprobacion/${id}`, {
      method: "DELETE",
    })
  },
}
