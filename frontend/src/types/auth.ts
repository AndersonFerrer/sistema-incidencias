export type LoginCredentials = {
  email: string
  password: string
}

export type AuthUser = {
  id: string
  nombre: string
  email: string
  rol: string
  avatarUrl?: string | null
}

export type AuthResponse = {
  token: string
  tipo?: string
  expiraEn?: string
  usuario: AuthUser
}
