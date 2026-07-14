import { useEffect, useState } from "react"

import { ApiError } from "@/lib/http"
import { usuariosService } from "@/services/usuarios-service"
import type { Usuario } from "@/types/usuarios"

const DEFAULT_LIMIT = 20

// TODO Slice B: add filter + cursor + dialog state using types from
// ./types (PaginationCursor, FilterState, DialogMode). Not declared now to
// keep the foundation slice lint-clean (noUnusedLocals + noUnusedParameters
// reject unused setters); they will be introduced when Slice B components
// consume them.
export function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()

    async function loadUsuarios() {
      setLoading(true)
      setError(null)
      try {
        const items = await usuariosService.listar(
          { limit: DEFAULT_LIMIT, offset: 0 },
          controller.signal
        )
        setUsuarios(items)
      } catch (err) {
        if (controller.signal.aborted) return
        const message =
          err instanceof ApiError
            ? err.message
            : "No se pudieron cargar los usuarios."
        setError(message)
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    void loadUsuarios()

    return () => {
      controller.abort()
    }
  }, [])

  const statusText = loading
    ? "Cargando..."
    : error
      ? error
      : `Mostrando ${usuarios.length} usuario(s).`

  return (
    <div className="flex flex-col gap-3">
      <h1 className="text-2xl font-bold tracking-tight text-slate-950">
        Gestión de Usuarios
      </h1>
      <p className="text-xs text-slate-500">{statusText}</p>
    </div>
  )
}