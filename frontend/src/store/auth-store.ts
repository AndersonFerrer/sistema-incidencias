import { create } from "zustand"
import { persist } from "zustand/middleware"

import { authService } from "@/services/auth-service"
import type { AuthUser, LoginCredentials } from "@/types/auth"

type AuthState = {
  token: string | null
  expiresAt: string | null
  user: AuthUser | null
  isLoading: boolean
  error: string | null
  login: (credentials: LoginCredentials) => Promise<boolean>
  loginDemo: () => Promise<boolean>
  refreshSession: () => Promise<void>
  syncProfile: (payload: {
    nombre?: string
    email?: string
    avatarUrl?: string | null
  }) => void
  logout: () => void
  clearError: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      expiresAt: null,
      user: null,
      isLoading: false,
      error: null,

      async login(credentials) {
        set({ isLoading: true, error: null })

        try {
          const response = await authService.login(credentials)

          set({
            token: response.token,
            expiresAt: response.expiraEn ?? null,
            user: response.usuario,
            isLoading: false,
            error: null,
          })

          return true
        } catch (error) {
          set({
            isLoading: false,
            error:
              error instanceof Error
                ? error.message
                : "No se pudo iniciar sesión.",
          })

          return false
        }
      },

      async loginDemo() {
        set({ isLoading: true, error: null })

        try {
          const response = await authService.loginDemo()

          set({
            token: response.token,
            expiresAt: response.expiraEn ?? null,
            user: response.usuario,
            isLoading: false,
            error: null,
          })

          return true
        } catch (error) {
          set({
            isLoading: false,
            error:
              error instanceof Error
                ? error.message
                : "No se pudo iniciar sesión demo.",
          })

          return false
        }
      },

      async refreshSession() {
        const { token } = get()

        if (!token) {
          return
        }

        const user = await authService.me(token)
        set({ user })
      },

      /**
       * Maps a `Usuario` payload (from `GET /api/usuarios/me` or
       * `PUT /api/usuarios/me`) onto the persisted `AuthUser` shape without
       * forcing a re-login. Role code is preserved — only `nombre`,
       * `email`, and `avatarUrl` change.
       */
      syncProfile(payload: {
        nombre?: string
        email?: string
        avatarUrl?: string | null
      }) {
        const current = get().user
        if (!current) return
        const next: AuthUser = {
          ...current,
          nombre: payload.nombre ?? current.nombre,
          email: payload.email ?? current.email,
          avatarUrl:
            payload.avatarUrl === undefined
              ? current.avatarUrl
              : (payload.avatarUrl ?? null),
        }
        set({ user: next })
      },

      logout() {
        set({ token: null, expiresAt: null, user: null, error: null })
      },

      clearError() {
        set({ error: null })
      },
    }),
    {
      name: "gestincidencias-auth",
      partialize: (state) => ({
        token: state.token,
        expiresAt: state.expiresAt,
        user: state.user,
      }),
    }
  )
)
