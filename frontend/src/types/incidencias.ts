export type Prioridad = "BAJA" | "MEDIA" | "ALTA" | "CRITICA"

export type Incidencia = {
  id: string
  codigo: string
  titulo: string
  descripcion: string
  clienteId: string
  estadoProcesoId: string
  estadoAprobacionId: string
  prioridad: Prioridad
  categoriaId: string
  creadoPorUsuarioId: string
  usuarioExternoId: string | null
  asignadoA: string | null
  creadoEn: string
  actualizadoEn: string
  resueltoEn: string | null
}

export type ActualizarIncidenciaInput = {
  titulo: string
  descripcion: string
  categoriaId: string
  prioridad: Prioridad
  asignadoA?: string | null
  archivos?: File[]
}

export type IncidenciaDialogMode =
  | { kind: "closed" }
  | { kind: "edit"; incidenciaId: string }
  | { kind: "subir-adjuntos"; incidenciaId: string }
  | { kind: "confirmar-eliminar"; incidenciaId: string }
  | { kind: "rechazar"; incidenciaId: string }

export const CLOSED_DIALOG: IncidenciaDialogMode = { kind: "closed" }

export type EstadoProcesoClave = "PENDIENTE" | "EN_PROCESO" | "FINALIZADA"

export type Page<T> = {
  contenido: T[]
  total: number
  page: number
  size: number
}

export type IncidenciasFiltros = {
  texto?: string
  clienteId?: string
  estadoProcesoId?: string
  estadoAprobacionId?: string
  categoriaId?: string
  asignadoA?: string
  prioridad?: Prioridad
  desde?: string
  hasta?: string
  page?: number
  size?: number
}

export type IncidenciaComentario = {
  id: string
  incidenciaId: string
  autorId: string
  contenido: string
  creadoEn: string
  actualizadoEn: string | null
}

export type IncidenciaAdjunto = {
  id: string
  incidenciaId: string
  subidoPor: string
  nombreArchivo: string
  tipoMime: string
  tamanoBytes: number
  url: string
  subidoEn: string
}

export type IncidenciaHistorialAccion =
  | "CREADA"
  | "ACTUALIZADA"
  | "ESTADO_CAMBIADO"
  | "APROBADA"
  | "RECHAZADA"
  | "ASIGNADA"
  | "COMENTARIO_AGREGADO"
  | "ADJUNTO_AGREGADO"
  | "ADJUNTO_ELIMINADO"
  | string

export type IncidenciaHistorial = {
  id: string
  incidenciaId: string
  usuarioId: string
  accion: IncidenciaHistorialAccion
  estadoProcesoAnteriorId: string | null
  estadoProcesoNuevoId: string | null
  nota: string | null
  creadoEn: string
}

export type IncidenciaDetalle = {
  incidencia: Incidencia
  comentarios: IncidenciaComentario[]
  adjuntos: IncidenciaAdjunto[]
  historial: IncidenciaHistorial[]
}
