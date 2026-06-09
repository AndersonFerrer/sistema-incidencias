export type AplicativoCliente = {
  id: string
  nombre: string
  apiKey?: string
  descripcion?: string
  creadoEn?: string
  actualizadoEn?: string
  activo: boolean
  categoriasCount?: number
  solicitantesCount?: number
}
