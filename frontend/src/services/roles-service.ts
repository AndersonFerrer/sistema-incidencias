import { apiRequest } from "@/lib/http"
import type { Rol } from "@/types/roles"

export const rolesService = {
  listar(signal?: AbortSignal): Promise<Rol[]> {
    return apiRequest<Rol[]>("/api/roles", { method: "GET", signal })
  },

  obtener(id: string, signal?: AbortSignal): Promise<Rol> {
    return apiRequest<Rol>(`/api/roles/${id}`, { method: "GET", signal })
  },
}