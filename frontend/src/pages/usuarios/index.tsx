import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Card, CardContent } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { ApiError } from "@/lib/http"
import { rolesService } from "@/services/roles-service"
import { usuariosService } from "@/services/usuarios-service"
import { useAuthStore } from "@/store/auth-store"
import type { Rol } from "@/types/roles"
import type { Usuario } from "@/types/usuarios"

import { Usuario403 } from "./components/usuario-403"
import { UsuariosFilters } from "./components/usuarios-filters"
import { UsuariosHeader } from "./components/usuarios-header"
import { UsuariosPagination } from "./components/usuarios-pagination"
import { UsuariosTable } from "./components/usuarios-table"
import type {
  FilterState,
  PaginationCursor,
} from "./types"

const DEFAULT_LIMIT = 20
const SEARCH_DEBOUNCE_MS = 300

const INITIAL_FILTERS: FilterState = {
  texto: "",
  rol: "",
  activo: null,
}

const INITIAL_CURSOR: PaginationCursor = {
  offset: 0,
  limit: DEFAULT_LIMIT,
  hasMore: true,
}

// Action stubs — Slice C replaces these with dialogs/toggle flows.
function noop(): void {}

export function UsuariosPage() {
  const currentUser = useAuthStore((state) => state.user)

  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS)
  const [debouncedTexto, setDebouncedTexto] = useState(filters.texto)
  const [cursor, setCursor] = useState<PaginationCursor>(INITIAL_CURSOR)
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [roles, setRoles] = useState<Rol[]>([])
  const [rolesLoading, setRolesLoading] = useState(true)
  const [loading, setLoading] = useState(false)
  const [forbidden, setForbidden] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Debounce the search text so rapid keystrokes don't fire a fetch per char.
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setDebouncedTexto(filters.texto)
    }, SEARCH_DEBOUNCE_MS)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [filters.texto])

  // Load roles once on mount.
  useEffect(() => {
    const controller = new AbortController()
    setRolesLoading(true)
    rolesService
      .listar(controller.signal)
      .then((items) => {
        if (!controller.signal.aborted) {
          setRoles(items)
          setRolesLoading(false)
        }
      })
      .catch((err) => {
        if (controller.signal.aborted) return
        setRolesLoading(false)
        setErrorMsg(
          err instanceof Error
            ? err.message
            : "No se pudieron cargar los roles."
        )
      })
    return () => controller.abort()
  }, [])

  // Reset cursor whenever filters change (after debounce for search).
  useEffect(() => {
    setCursor((prev) => ({ ...prev, offset: 0, hasMore: true }))
  }, [debouncedTexto, filters.rol, filters.activo])

  // Fetch users whenever filters or cursor change.
  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setErrorMsg(null)
    setForbidden(false)
    usuariosService
      .listar(
        {
          texto: debouncedTexto.trim() || undefined,
          rol: filters.rol || undefined,
          activo: filters.activo === null ? undefined : filters.activo,
          limit: cursor.limit,
          offset: cursor.offset,
        },
        controller.signal
      )
      .then((items) => {
        if (controller.signal.aborted) return
        setUsuarios(items)
        setCursor((prev) => ({
          ...prev,
          hasMore: items.length === prev.limit,
        }))
        setLoading(false)
      })
      .catch((err) => {
        if (controller.signal.aborted) return
        if (err instanceof ApiError && err.status === 403) {
          setForbidden(true)
          setLoading(false)
          return
        }
        const message =
          err instanceof ApiError
            ? err.message
            : "No se pudieron cargar los usuarios."
        setErrorMsg(message)
        setLoading(false)
      })
    return () => controller.abort()
  }, [debouncedTexto, filters.rol, filters.activo, cursor])

  const handleFiltersChange = useCallback(
    (next: Partial<FilterState>) => {
      setFilters((prev) => ({ ...prev, ...next }))
    },
    []
  )

  const handleClearFilters = useCallback(() => {
    setFilters(INITIAL_FILTERS)
    setDebouncedTexto("")
  }, [])

  const handlePrev = useCallback(() => {
    setCursor((prev) => ({
      ...prev,
      offset: Math.max(0, prev.offset - prev.limit),
    }))
  }, [])

  const handleNext = useCallback(() => {
    setCursor((prev) => ({
      ...prev,
      offset: prev.offset + prev.limit,
    }))
  }, [])

  const currentUserIsAdmin = useMemo(
    () => currentUser?.rol === "ADMINISTRADOR",
    [currentUser]
  )

  if (forbidden) {
    return (
      <div className="flex flex-col gap-4">
        <UsuariosHeader total={0} onNuevo={noop} />
        <Usuario403 />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <UsuariosHeader total={usuarios.length} onNuevo={noop} />

      <Card className="rounded-lg bg-white p-3 shadow-sm">
        <UsuariosFilters
          texto={filters.texto}
          rol={filters.rol}
          activo={filters.activo}
          roles={roles}
          loadingRoles={rolesLoading}
          onChange={handleFiltersChange}
          onClear={handleClearFilters}
        />
      </Card>

      {errorMsg ? (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{errorMsg}</AlertDescription>
        </Alert>
      ) : null}

      {loading && usuarios.length === 0 ? (
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <Spinner className="size-3.5" />
          Cargando usuarios...
        </div>
      ) : (
        <Card className="rounded-lg bg-white p-0 shadow-sm">
          <CardContent className="p-0">
            <UsuariosTable
              usuarios={usuarios}
              loading={loading}
              currentUserId={currentUser?.id ?? ""}
              currentUserIsAdmin={currentUserIsAdmin}
              onEdit={noop}
              onChangePassword={noop}
              onToggleActive={noop}
            />
            <UsuariosPagination
              cursor={cursor}
              itemsShown={usuarios.length}
              onPrev={handlePrev}
              onNext={handleNext}
            />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
