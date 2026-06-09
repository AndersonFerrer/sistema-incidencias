import { apiRequest } from "@/lib/http"
import type { EstadoProceso } from "@/types/estados-proceso"

export const estadosProcesoService = {
  listar() {
    return apiRequest<EstadoProceso[]>("/api/estados-proceso", {
      method: "GET",
    })
  },
}
