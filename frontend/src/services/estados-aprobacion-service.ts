import { apiRequest } from "@/lib/http"
import type { EstadoAprobacion } from "@/types/estados-aprobacion"

export const estadosAprobacionService = {
  listar() {
    return apiRequest<EstadoAprobacion[]>("/api/estados-aprobacion", {
      method: "GET",
    })
  },
}
