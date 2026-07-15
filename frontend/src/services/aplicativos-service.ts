import { apiRequest } from "@/lib/http"
import type { AplicativoCliente } from "@/types/aplicativos"

export type CrearAplicativoInput = {
  nombre: string
  activo?: boolean
}

export type ActualizarAplicativoInput = {
  nombre: string
  activo?: boolean
}

export const aplicativosService = {
  listar(signal?: AbortSignal) {
    return apiRequest<AplicativoCliente[]>("/api/aplicativos", {
      method: "GET",
      signal,
    })
  },

  obtener(id: string) {
    return apiRequest<AplicativoCliente>(`/api/aplicativos/${id}`, {
      method: "GET",
    })
  },

  crear(input: CrearAplicativoInput) {
    return apiRequest<AplicativoCliente>("/api/aplicativos", {
      method: "POST",
      body: JSON.stringify({
        nombre: input.nombre,
        activo: input.activo ?? true,
      }),
    })
  },

  actualizar(id: string, input: ActualizarAplicativoInput) {
    return apiRequest<AplicativoCliente>(`/api/aplicativos/${id}`, {
      method: "PUT",
      body: JSON.stringify({
        nombre: input.nombre,
        activo: input.activo ?? true,
      }),
    })
  },

  rotarApiKey(id: string) {
    return apiRequest<AplicativoCliente>(
      `/api/aplicativos/${id}/rotar-api-key`,
      { method: "PATCH" }
    )
  },

  eliminar(id: string) {
    return apiRequest<void>(`/api/aplicativos/${id}`, { method: "DELETE" })
  },
}
