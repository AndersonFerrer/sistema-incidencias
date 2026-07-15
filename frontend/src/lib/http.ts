import { API_BASE_URL } from "@/lib/env"
import { useAuthStore } from "@/store/auth-store"

type RequestOptions = RequestInit & {
  token?: string | null
  /**
   * Cambia el parseo del body. "json" (default) mantiene el contrato
   * actual; "blob" se usa para descargar binarios (PDF / XLSX).
   */
  responseType?: "json" | "blob"
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
  { headers, token, signal, responseType, ...options }: RequestOptions = {}
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

  if (!response.ok) {
    let payload: { mensaje?: string; message?: string } | null = null
    const contentType = response.headers.get("content-type")
    if (contentType?.includes("application/json")) {
      try {
        payload = await response.json()
      } catch {
        payload = null
      }
    }
    const message =
      payload?.mensaje ??
      payload?.message ??
      "No se pudo completar la solicitud."

    throw new ApiError(message, response.status)
  }

  if (responseType === "blob") {
    return (await response.blob()) as unknown as T
  }

  const contentType = response.headers.get("content-type")
  if (contentType?.includes("application/json")) {
    return (await response.json()) as T
  }
  return null as T
}
