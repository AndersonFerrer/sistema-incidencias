import { apiRequest } from "@/lib/http"

/**
 * Servicio de notificaciones (RF-37..40, change `notificaciones-realtime`).
 *
 * Las cinco rutas viven bajo `/api/notificaciones/*` y el `WHERE usuario_id = ?`
 * se aplica en el backend (decision D6 del design), por lo que el cliente nunca
 * puede relajar el alcance. El badge del topbar consume `count()` cada 30 s
 * (ver `use-notifications-polling`); el dropdown consume `obtener({ size: 10 })`
 * lazy al abrir; el centro consume `obtener({ page, size, soloNoLeidas })`.
 */

export type NotificacionTipo =
  | "INCIDENCIA_ASIGNADA"
  | "INCIDENCIA_APROBADA"
  | "INCIDENCIA_RECHAZADA"
  | "INCIDENCIA_ESTADO_CAMBIADO"
  | "INCIDENCIA_COMENTARIO"

export type Notificacion = {
  id: string
  usuarioId: string
  incidenciaId: string | null
  clienteId: string | null
  tipo: NotificacionTipo
  titulo: string
  descripcion: string | null
  leido: boolean
  leidoEn: string | null
  creadoEn: string
}

export type Page<T> = {
  contenido: T[]
  total: number
  page: number
  size: number
}

export type NotificacionesFiltros = {
  page?: number
  size?: number
  soloNoLeidas?: boolean
}

function buildQuery(filtros: NotificacionesFiltros = {}): string {
  const params = new URLSearchParams()
  if (filtros.page !== undefined && filtros.page !== null) {
    params.set("page", String(filtros.page))
  }
  if (filtros.size !== undefined && filtros.size !== null) {
    params.set("size", String(filtros.size))
  }
  if (filtros.soloNoLeidas !== undefined && filtros.soloNoLeidas !== null) {
    params.set("soloNoLeidas", String(filtros.soloNoLeidas))
  }
  const query = params.toString()
  return query ? `?${query}` : ""
}

export const notificacionesService = {
  obtener(filtros: NotificacionesFiltros = {}, signal?: AbortSignal) {
    return apiRequest<Page<Notificacion>>(
      `/api/notificaciones${buildQuery(filtros)}`,
      { method: "GET", signal }
    )
  },

  count(signal?: AbortSignal) {
    return apiRequest<{ total: number }>(
      "/api/notificaciones/no-leidas/count",
      { method: "GET", signal }
    )
  },

  marcarLeida(id: string, signal?: AbortSignal): Promise<void> {
    return apiRequest<void>(`/api/notificaciones/${id}/leida`, {
      method: "PATCH",
      signal,
    })
  },

  marcarTodas(signal?: AbortSignal) {
    return apiRequest<{ total: number }>(
      "/api/notificaciones/marcar-todas-leidas",
      { method: "POST", signal }
    )
  },

  eliminar(id: string, signal?: AbortSignal): Promise<void> {
    return apiRequest<void>(`/api/notificaciones/${id}`, {
      method: "DELETE",
      signal,
    })
  },
}
