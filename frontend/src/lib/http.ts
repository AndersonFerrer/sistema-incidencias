import { API_BASE_URL } from "@/lib/env"
import { useAuthStore } from "@/store/auth-store"

type RequestOptions = RequestInit & {
  token?: string | null
}

export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = "ApiError"
    this.status = status
  }
}

export async function apiRequest<T>(
  path: string,
  { headers, token, signal, ...options }: RequestOptions = {}
) {
  const authToken = token ?? useAuthStore.getState().token
  const isFormData =
    typeof FormData !== "undefined" && options.body instanceof FormData
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    signal,
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      ...headers,
    },
  })

  const contentType = response.headers.get("content-type")
  const payload = contentType?.includes("application/json")
    ? await response.json()
    : null

  if (!response.ok) {
    const message =
      payload?.mensaje ??
      payload?.message ??
      "No se pudo completar la solicitud."

    throw new ApiError(message, response.status)
  }

  return payload as T
}
