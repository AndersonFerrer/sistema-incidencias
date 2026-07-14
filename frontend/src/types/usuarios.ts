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