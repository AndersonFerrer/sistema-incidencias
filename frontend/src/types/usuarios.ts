export type Rol = {
  id: string
  codigo: string
  nombre: string
  descripcion?: string
  activo: boolean
}

export type Usuario = {
  id: string
  nombre: string
  email: string
  rol: Rol
  activo: boolean
  avatarUrl?: string | null
  creadoEn?: string
  actualizadoEn?: string
}
