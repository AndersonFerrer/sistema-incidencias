import { apiRequest } from "@/lib/http"
import type { Categoria } from "@/types/categorias"

export type CategoriaInput = {
  aplicativoId: string
  nombre: string
  descripcion?: string
  activo?: boolean
}

export const categoriasService = {
  listar() {
    return apiRequest<Categoria[]>("/api/categorias", { method: "GET" })
  },

  obtener(id: string) {
    return apiRequest<Categoria>(`/api/categorias/${id}`, { method: "GET" })
  },

  crear(input: CategoriaInput) {
    return apiRequest<Categoria>("/api/categorias", {
      method: "POST",
      body: JSON.stringify({
        aplicativoId: input.aplicativoId,
        nombre: input.nombre,
        descripcion: input.descripcion,
        activo: input.activo ?? true,
      }),
    })
  },

  actualizar(id: string, input: CategoriaInput) {
    return apiRequest<Categoria>(`/api/categorias/${id}`, {
      method: "PUT",
      body: JSON.stringify({
        aplicativoId: input.aplicativoId,
        nombre: input.nombre,
        descripcion: input.descripcion,
        activo: input.activo ?? true,
      }),
    })
  },

  eliminar(id: string) {
    return apiRequest<void>(`/api/categorias/${id}`, { method: "DELETE" })
  },
}
