import { apiRequest } from "@/lib/http"
import type {
  ActualizarPerfilPropioInput,
  ActualizarUsuarioInput,
  CambiarPasswordInput,
  CambiarPasswordPropiaInput,
  CrearUsuarioInput,
  Usuario,
} from "@/types/usuarios"

export interface ListarUsuariosParams {
  texto?: string
  rol?: string
  activo?: boolean
  limit?: number
  offset?: number
}

const DEFAULT_LIMIT = 20

export const usuariosService = {
  listar(
    params: ListarUsuariosParams = {},
    signal?: AbortSignal
  ): Promise<Usuario[]> {
    const search = new URLSearchParams()
    if (params.texto) search.set("texto", params.texto)
    if (params.rol) search.set("rol", params.rol)
    if (params.activo !== undefined) search.set("activo", String(params.activo))
    search.set("limit", String(params.limit ?? DEFAULT_LIMIT))
    search.set("offset", String(params.offset ?? 0))
    const qs = search.toString()
    return apiRequest<Usuario[]>(`/api/usuarios${qs ? `?${qs}` : ""}`, {
      method: "GET",
      signal,
    })
  },

  obtener(id: string, signal?: AbortSignal): Promise<Usuario> {
    return apiRequest<Usuario>(`/api/usuarios/${id}`, {
      method: "GET",
      signal,
    })
  },

  listarAgentesAsignables(signal?: AbortSignal): Promise<Usuario[]> {
    return apiRequest<Usuario[]>("/api/usuarios/agentes-asignables", {
      method: "GET",
      signal,
    })
  },

  crear(input: CrearUsuarioInput): Promise<Usuario> {
    return apiRequest<Usuario>("/api/usuarios", {
      method: "POST",
      body: JSON.stringify(input),
    })
  },

  actualizar(id: string, input: ActualizarUsuarioInput): Promise<Usuario> {
    return apiRequest<Usuario>(`/api/usuarios/${id}`, {
      method: "PUT",
      body: JSON.stringify(input),
    })
  },

  cambiarPassword(id: string, input: CambiarPasswordInput): Promise<void> {
    return apiRequest<void>(`/api/usuarios/${id}/password`, {
      method: "PATCH",
      body: JSON.stringify(input),
    })
  },

  activar(id: string): Promise<Usuario> {
    return apiRequest<Usuario>(`/api/usuarios/${id}/activar`, {
      method: "PATCH",
    })
  },

  desactivar(id: string): Promise<Usuario> {
    return apiRequest<Usuario>(`/api/usuarios/${id}/desactivar`, {
      method: "PATCH",
    })
  },

  eliminar(id: string): Promise<void> {
    return apiRequest<void>(`/api/usuarios/${id}`, {
      method: "DELETE",
    })
  },

  /**
   * Self-service wrappers (RF-33, change `perfil-self`). The target is always
   * the authenticated user — there is no `id` parameter.
   */
  obtenerMiPerfil(signal?: AbortSignal): Promise<Usuario> {
    return apiRequest<Usuario>("/api/usuarios/me", {
      method: "GET",
      signal,
    })
  },

  actualizarMiPerfil(input: ActualizarPerfilPropioInput): Promise<Usuario> {
    return apiRequest<Usuario>("/api/usuarios/me", {
      method: "PUT",
      body: JSON.stringify(input),
    })
  },

  cambiarMiPassword(input: CambiarPasswordPropiaInput): Promise<void> {
    return apiRequest<void>("/api/usuarios/me/password", {
      method: "PUT",
      body: JSON.stringify(input),
    })
  },
}