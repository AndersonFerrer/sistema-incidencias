import { apiRequest } from "@/lib/http"
import type { AplicativoCliente } from "@/types/aplicativos"

export const aplicativosService = {
  listar() {
    return apiRequest<AplicativoCliente[]>("/api/aplicativos", {
      method: "GET",
    })
  },
}
