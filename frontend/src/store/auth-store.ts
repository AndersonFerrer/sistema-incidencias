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
  refreshSession: () => Promise<void>
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

      async refreshSession() {
        const { token } = get()

        if (!token) {
          return
        }

        const user = await authService.me(token)
        set({ user })
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
