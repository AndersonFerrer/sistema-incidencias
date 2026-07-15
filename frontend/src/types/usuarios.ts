import type { Rol } from "@/types/roles"

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

export type RolCodigo = "ADMINISTRADOR" | "AGENTE" | "USUARIO"

export type CrearUsuarioInput = {
  nombre: string
  email: string
  password: string
  rolCodigo: RolCodigo
  avatarUrl?: string
  activo?: boolean
}

export type ActualizarUsuarioInput = {
  nombre: string
  email: string
  rolCodigo: RolCodigo
  avatarUrl?: string
  activo: boolean
}

export type CambiarPasswordInput = {
  password: string
}

/**
 * Self-service profile edit. Only `nombre` and `avatarUrl` are accepted by
 * `PUT /api/usuarios/me`; email, rol and activo are intentionally immutable.
 */
export type ActualizarPerfilPropioInput = {
  nombre: string
  avatarUrl?: string | null
}

/**
 * Self-service password change payload. `currentPassword` is verified server
 * side before the new hash is written.
 */
export type CambiarPasswordPropiaInput = {
  currentPassword: string
  newPassword: string
}