import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { AlertTriangle, Check } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Card, CardContent } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { ApiError } from "@/lib/http"
import { rolesService } from "@/services/roles-service"
import { usuariosService } from "@/services/usuarios-service"
import { useAuthStore } from "@/store/auth-store"
import type { Rol } from "@/types/roles"
import type {
  ActualizarUsuarioInput,
  CrearUsuarioInput,
  Usuario,
} from "@/types/usuarios"

import { Usuario403 } from "./components/usuario-403"
import { UsuarioFormDialog } from "./components/usuario-form-dialog"
import { UsuarioPasswordDialog } from "./components/usuario-password-dialog"
import { UsuariosFilters } from "./components/usuarios-filters"
import { UsuariosHeader } from "./components/usuarios-header"
import { UsuariosPagination } from "./components/usuarios-pagination"
import { UsuariosTable } from "./components/usuarios-table"
import type {
  DialogMode,
  FilterState,
  PaginationCursor,
} from "./types"

const DEFAULT_LIMIT = 20
const SEARCH_DEBOUNCE_MS = 300
const ALERT_AUTO_DISMISS_MS = 3000

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

const CLOSED_DIALOG: DialogMode = { kind: "closed" }

type ToastAlert = {
  variant: "default" | "destructive"
  message: string
}

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
  const [dialogMode, setDialogMode] = useState<DialogMode>(CLOSED_DIALOG)
  const [toast, setToast] = useState<ToastAlert | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const showToast = useCallback((alert: ToastAlert) => {
    setToast(alert)
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    toastTimerRef.current = setTimeout(() => {
      setToast(null)
      toastTimerRef.current = null
    }, ALERT_AUTO_DISMISS_MS)
  }, [])

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    }
  }, [])

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

  // Fetch users whenever filters, cursor, or reloadKey change.
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
  }, [debouncedTexto, filters.rol, filters.activo, cursor, reloadKey])

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

  const handleCloseDialog = useCallback(() => {
    setDialogMode(CLOSED_DIALOG)
  }, [])

  const handleNuevoUsuario = useCallback(() => {
    setDialogMode({ kind: "create" })
  }, [])

  const handleEdit = useCallback((user: Usuario) => {
    setDialogMode({ kind: "edit", userId: user.id })
  }, [])

  const handleChangePassword = useCallback((user: Usuario) => {
    setDialogMode({ kind: "password", userId: user.id })
  }, [])

  const handleSaveUser = useCallback(
    async (input: CrearUsuarioInput | ActualizarUsuarioInput) => {
      const editingUserId =
        dialogMode.kind === "edit" ? dialogMode.userId : null
      try {
        if (editingUserId) {
          await usuariosService.actualizar(
            editingUserId,
            input as ActualizarUsuarioInput
          )
        } else {
          await usuariosService.crear(input as CrearUsuarioInput)
        }
        setCursor(INITIAL_CURSOR)
        setReloadKey((prev) => prev + 1)
        setDialogMode(CLOSED_DIALOG)
        showToast({
          variant: "default",
          message:
            editingUserId !== null
              ? "Usuario actualizado correctamente."
              : "Usuario creado correctamente.",
        })
      } catch (err) {
        const message =
          err instanceof ApiError
            ? err.message
            : err instanceof Error
              ? err.message
              : "No se pudo guardar el usuario."
        showToast({ variant: "destructive", message })
        throw err
      }
    },
    [dialogMode, showToast]
  )

  const handleSubmitPassword = useCallback(
    async (password: string) => {
      const target =
        dialogMode.kind === "password" ? dialogMode.userId : null
      if (!target) {
        throw new Error("Diálogo de contraseña sin usuario objetivo.")
      }
      try {
        await usuariosService.cambiarPassword(target, { password })
        setDialogMode(CLOSED_DIALOG)
        showToast({
          variant: "default",
          message: "Contraseña actualizada correctamente.",
        })
      } catch (err) {
        const message =
          err instanceof ApiError
            ? err.message
            : err instanceof Error
              ? err.message
              : "No se pudo actualizar la contraseña."
        showToast({ variant: "destructive", message })
        throw err
      }
    },
    [dialogMode, showToast]
  )

  const handleToggleActive = useCallback(
    async (user: Usuario) => {
      const previousActivo = user.activo
      const nextActivo = !previousActivo
      // Optimistic local flip.
      setUsuarios((prev) =>
        prev.map((item) =>
          item.id === user.id ? { ...item, activo: nextActivo } : item
        )
      )
      try {
        const serviceCall = nextActivo
          ? usuariosService.activar
          : usuariosService.desactivar
        const updated = await serviceCall(user.id)
        setUsuarios((prev) =>
          prev.map((item) => (item.id === user.id ? updated : item))
        )
        showToast({
          variant: "default",
          message: nextActivo
            ? "Usuario activado correctamente."
            : "Usuario desactivado correctamente.",
        })
      } catch (err) {
        // Revert the optimistic flip.
        setUsuarios((prev) =>
          prev.map((item) =>
            item.id === user.id ? { ...item, activo: previousActivo } : item
          )
        )
        const message =
          err instanceof ApiError
            ? err.message
            : err instanceof Error
              ? err.message
              : "No se pudo cambiar el estado del usuario."
        showToast({ variant: "destructive", message })
      }
    },
    [showToast]
  )

  const currentUserIsAdmin = useMemo(
    () => currentUser?.rol === "ADMINISTRADOR",
    [currentUser]
  )

  const dialogTarget: Usuario | null = useMemo(() => {
    if (dialogMode.kind === "closed" || dialogMode.kind === "create") {
      return null
    }
    return usuarios.find((u) => u.id === dialogMode.userId) ?? null
  }, [dialogMode, usuarios])

  const formDialogOpen =
    dialogMode.kind === "create" || dialogMode.kind === "edit"

  const formDialogMode: "create" | "edit" =
    dialogMode.kind === "edit" ? "edit" : "create"

  const passwordDialogKey =
    dialogMode.kind === "password" ? `pwd-${dialogMode.userId}` : "pwd-closed"

  if (forbidden) {
    return (
      <div className="flex flex-col gap-4">
        <UsuariosHeader total={0} onNuevo={handleNuevoUsuario} />
        <Usuario403 />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <UsuariosHeader total={usuarios.length} onNuevo={handleNuevoUsuario} />

      {toast ? (
        <Alert variant={toast.variant}>
          {toast.variant === "destructive" ? (
            <AlertTriangle aria-hidden="true" />
          ) : (
            <Check aria-hidden="true" />
          )}
          <AlertTitle>
            {toast.variant === "destructive" ? "Error" : "Listo"}
          </AlertTitle>
          <AlertDescription>{toast.message}</AlertDescription>
        </Alert>
      ) : null}

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
          <AlertTriangle aria-hidden="true" />
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
              onEdit={handleEdit}
              onChangePassword={handleChangePassword}
              onToggleActive={handleToggleActive}
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

      <UsuarioFormDialog
        key={
          dialogMode.kind === "edit"
            ? `edit-${dialogMode.userId}`
            : "create"
        }
        open={formDialogOpen}
        mode={formDialogMode}
        initial={dialogMode.kind === "edit" ? dialogTarget : null}
        roles={roles}
        onClose={handleCloseDialog}
        onSubmit={handleSaveUser}
      />

      <UsuarioPasswordDialog
        key={passwordDialogKey}
        open={dialogMode.kind === "password"}
        usuario={dialogMode.kind === "password" ? dialogTarget : null}
        onClose={handleCloseDialog}
        onSubmit={handleSubmitPassword}
      />
    </div>
  )
}
