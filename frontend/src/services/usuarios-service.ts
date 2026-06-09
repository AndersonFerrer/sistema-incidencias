import { apiRequest } from "@/lib/http"
import type { Usuario } from "@/types/usuarios"

export const usuariosService = {
  listar() {
    return apiRequest<Usuario[]>("/api/usuarios", { method: "GET" })
  },
}
