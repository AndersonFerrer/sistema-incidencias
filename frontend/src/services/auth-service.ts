import { apiRequest } from "@/lib/http"
import type { AuthResponse, AuthUser, LoginCredentials } from "@/types/auth"

export const authService = {
  login(credentials: LoginCredentials) {
    return apiRequest<AuthResponse>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials),
    })
  },

  me(token: string) {
    return apiRequest<AuthUser>("/api/auth/me", { token })
  },
}
