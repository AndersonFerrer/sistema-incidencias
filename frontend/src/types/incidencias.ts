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
