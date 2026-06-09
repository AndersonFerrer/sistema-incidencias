import { Navigate } from "@tanstack/react-router"

import { useAuthStore } from "@/store/auth-store"

type PrivateRouteProps = {
  children: React.ReactNode
}

export function PrivateRoute({ children }: PrivateRouteProps) {
  const token = useAuthStore((state) => state.token)

  if (!token) {
    return <Navigate to="/" replace />
  }

  return children
}
