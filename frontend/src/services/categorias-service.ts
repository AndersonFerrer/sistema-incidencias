import { apiRequest } from "@/lib/http"
import type { Categoria } from "@/types/categorias"

export const categoriasService = {
  listar() {
    return apiRequest<Categoria[]>("/api/categorias", { method: "GET" })
  },
}
