import { API_BASE_URL } from "@/lib/env"

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
  { headers, token, ...options }: RequestOptions = {}
) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
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
