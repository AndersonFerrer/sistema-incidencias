import { apiRequest } from "@/lib/http"
import type { EstadoProceso } from "@/types/estados-proceso"

export type EstadoProcesoInput = {
  clave: string
  etiqueta: string
  esTerminal: boolean
  orden: number
  activo?: boolean
}

export const estadosProcesoService = {
  listar() {
    return apiRequest<EstadoProceso[]>("/api/estados-proceso", {
      method: "GET",
    })
  },

  crear(input: EstadoProcesoInput) {
    return apiRequest<EstadoProceso>("/api/estados-proceso", {
      method: "POST",
      body: JSON.stringify({
        clave: input.clave,
        etiqueta: input.etiqueta,
        esTerminal: input.esTerminal,
        orden: input.orden,
        activo: input.activo ?? true,
      }),
    })
  },

  actualizar(id: string, input: EstadoProcesoInput) {
    return apiRequest<EstadoProceso>(`/api/estados-proceso/${id}`, {
      method: "PUT",
      body: JSON.stringify({
        clave: input.clave,
        etiqueta: input.etiqueta,
        esTerminal: input.esTerminal,
        orden: input.orden,
        activo: input.activo ?? true,
      }),
    })
  },

  eliminar(id: string) {
    return apiRequest<void>(`/api/estados-proceso/${id}`, { method: "DELETE" })
  },
}
