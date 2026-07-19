import {
  AlertTriangle,
  ArrowLeft,
  Check,
  Pencil,
  Trash2,
  Upload,
} from "lucide-react"
import { useNavigate, useParams } from "@tanstack/react-router"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Spinner } from "@/components/ui/spinner"
import { API_BASE_URL } from "@/lib/env"
import { ApiError } from "@/lib/http"
import { ConfirmarEliminarIncidenciaDialog } from "@/pages/incidencias/components/confirmar-eliminar-incidencia-dialog"
import { EditarIncidenciaDialog } from "@/pages/incidencias/components/editar-incidencia-dialog"
import { SubirAdjuntosDialog } from "@/pages/incidencias/components/subir-adjuntos-dialog"
import { IncidenciaAdjuntosCard } from "@/pages/incidencias/detalle/components/incidencia-adjuntos-card"
import { IncidenciaActividadCard } from "@/pages/incidencias/detalle/components/incidencia-actividad-card"
import { IncidenciaComentariosCard } from "@/pages/incidencias/detalle/components/incidencia-comentarios-card"
import { IncidenciaRevisionCard } from "@/pages/incidencias/detalle/components/incidencia-revision-card"
import { IncidenciaSidebar } from "@/pages/incidencias/detalle/components/incidencia-sidebar"
import { RechazarIncidenciaDialog } from "@/pages/incidencias/detalle/components/rechazar-incidencia-dialog"
import { aplicativosService } from "@/services/aplicativos-service"
import { categoriasService } from "@/services/categorias-service"
import { estadosAprobacionService } from "@/services/estados-aprobacion-service"
import { estadosProcesoService } from "@/services/estados-proceso-service"
import { incidentsService } from "@/services/incidents-service"
import { usuariosService } from "@/services/usuarios-service"
import { useAuthStore } from "@/store/auth-store"
import type { AplicativoCliente } from "@/types/aplicativos"
import type { Categoria } from "@/types/categorias"
import type { EstadoAprobacion } from "@/types/estados-aprobacion"
import type { EstadoProceso } from "@/types/estados-proceso"
import type {
  ActualizarIncidenciaInput,
  IncidenciaDialogMode,
  IncidenciaDetalle,
} from "@/types/incidencias"
import { CLOSED_DIALOG } from "@/types/incidencias"
import type { Usuario } from "@/types/usuarios"

type ToastAlert = {
  variant: "default" | "destructive"
  message: string
}

const ALERT_AUTO_DISMISS_MS = 3000

export function IncidenciaDetallePage() {
  const navigate = useNavigate()
  const params = useParams({ strict: false }) as { id?: string }
  const id = params.id ?? ""

  const currentUser = useAuthStore((state) => state.user)
  const currentUserRol = currentUser?.rol ?? ""
  const puedeEditar =
    currentUserRol === "ADMINISTRADOR" || currentUserRol === "AGENTE"
  const puedeEliminar = currentUserRol === "ADMINISTRADOR"
  const puedeSubirAdjuntos = puedeEditar

  const [detalle, setDetalle] = useState<IncidenciaDetalle | null>(null)
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [aplicativos, setAplicativos] = useState<AplicativoCliente[]>([])
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [estadosAprobacion, setEstadosAprobacion] = useState<EstadoAprobacion[]>(
    []
  )
  const [estadosProceso, setEstadosProceso] = useState<EstadoProceso[]>([])

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [isActionSubmitting, setIsActionSubmitting] = useState(false)

  const [rechazarError, setRechazarError] = useState<string | null>(null)

  const [dialogMode, setDialogMode] =
    useState<IncidenciaDialogMode>(CLOSED_DIALOG)
  const [toast, setToast] = useState<ToastAlert | null>(null)
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

  const cargarDetalle = useCallback(
    async (signal?: AbortSignal) => {
      setIsLoading(true)
      setError(null)
      try {
        const response = await incidentsService.obtenerDetalle(id, signal)
        if (signal?.aborted) return
        setDetalle(response)
      } catch (err) {
        if (signal?.aborted) return
        setDetalle(null)
        const message =
          err instanceof Error ? err.message : "No se pudo obtener el detalle de la incidencia."
        // RBAC: USUARIO no tiene acceso al detalle. Si el backend rechaza
        // con 403 + mensaje de permisos, redirigir al listado en lugar de
        // mostrar la pagina vacia. Tambien aplica a AGENTE si la incidencia
        // dejo de pertenecerle (caso raro pero posible).
        if (message.toLowerCase().includes("permisos") || message.toLowerCase().includes("asignad")) {
          navigate({ to: "/incidencias", replace: true })
          return
        }
        setError(message)
      } finally {
        if (!signal?.aborted) {
          setIsLoading(false)
        }
      }
    },
    [id, navigate]
  )

  useEffect(() => {
    if (!id) return
    const controller = new AbortController()
    void cargarDetalle(controller.signal)
    return () => controller.abort()
  }, [cargarDetalle, id])

  useEffect(() => {
    let cancelled = false

    async function loadCatalogos() {
      try {
        // Por rol: ADMIN ve todo; AGENTE/USUARIO no pueden listar todos los
        // usuarios (admin-only) ni necesitan ver cliente/categoria/solicitante/
        // responsable (sanitizados en el response de detalle). Solo cargan
        // estados (necesarios para los dropdowns de cambio de estado de proceso)
        // y /api/usuarios/agentes-asignables si la pagina lo necesitara.
        const esAdmin = currentUserRol === "ADMINISTRADOR";

        if (esAdmin) {
          const [categorias, aplicativos, aprobacion, proceso, users] =
            await Promise.all([
              categoriasService.listar(),
              aplicativosService.listar(),
              estadosAprobacionService.listar(),
              estadosProcesoService.listar(),
              usuariosService.listar(),
            ])
          if (cancelled) return
          setCategorias(categorias)
          setAplicativos(aplicativos)
          setUsuarios(users)
          setEstadosAprobacion(aprobacion)
          setEstadosProceso(proceso)
        } else {
          // AGENTE / USUARIO: saltamos /api/usuarios (admin-only, causa 403).
          // Tampoco necesitan categorias/aplicativos para VER detalle (los
          // campos estan sanitizados en el response). Cargarlos solo si
          // abriran el edit dialog (futuro: fetch on demand).
          const [categorias, aplicativos, aprobacion, proceso] =
            await Promise.all([
              categoriasService.listar(),
              aplicativosService.listar(),
              estadosAprobacionService.listar(),
              estadosProcesoService.listar(),
            ])
          if (cancelled) return
          setCategorias(categorias)
          setAplicativos(aplicativos)
          setEstadosAprobacion(aprobacion)
          setEstadosProceso(proceso)
        }
      } catch {
        if (cancelled) return
      }
    }

    void loadCatalogos()

    return () => {
      cancelled = true
    }
  }, [currentUserRol])

  const voltar = () => {
    void navigate({ to: "/incidencias" })
  }

  const categoria = useMemo(() => {
    if (!detalle) return null
    return (
      categorias.find(
        (item) => item.id === detalle.incidencia.categoriaId
      ) ?? null
    )
  }, [detalle, categorias])

  const aplicativo = useMemo(() => {
    if (!detalle) return null
    return (
      aplicativos.find(
        (item) => item.id === detalle.incidencia.clienteId
      ) ?? null
    )
  }, [detalle, aplicativos])

  const estadoAprobacion = useMemo(() => {
    if (!detalle) return null
    return (
      estadosAprobacion.find(
        (estado) => estado.id === detalle.incidencia.estadoAprobacionId
      ) ?? null
    )
  }, [detalle, estadosAprobacion])

  const estadoProceso = useMemo(() => {
    if (!detalle) return null
    return (
      estadosProceso.find(
        (estado) => estado.id === detalle.incidencia.estadoProcesoId
      ) ?? null
    )
  }, [detalle, estadosProceso])

  const usuarioById = useMemo(
    () => new Map(usuarios.map((usuario) => [usuario.id, usuario])),
    [usuarios]
  )

  const solicitante = useMemo(() => {
    if (!detalle) return null
    return (
      usuarioById.get(detalle.incidencia.creadoPorUsuarioId) ??
      usuarioById.get(detalle.incidencia.usuarioExternoId ?? "") ??
      null
    )
  }, [detalle, usuarioById])

  const asignado = useMemo(() => {
    if (!detalle) return null
    const idAsignado = detalle.incidencia.asignadoA
    if (!idAsignado) return null
    return usuarioById.get(idAsignado) ?? null
  }, [detalle, usuarioById])

  const handleCloseDialog = useCallback(() => {
    setDialogMode(CLOSED_DIALOG)
  }, [])

  const handleOpenEdit = useCallback(() => {
    if (!detalle) return
    setActionError(null)
    setDialogMode({ kind: "edit", incidenciaId: detalle.incidencia.id })
  }, [detalle])

  const handleOpenSubirAdjuntos = useCallback(() => {
    if (!detalle) return
    setActionError(null)
    setDialogMode({
      kind: "subir-adjuntos",
      incidenciaId: detalle.incidencia.id,
    })
  }, [detalle])

  const handleOpenEliminar = useCallback(() => {
    if (!detalle) return
    setActionError(null)
    setDialogMode({
      kind: "confirmar-eliminar",
      incidenciaId: detalle.incidencia.id,
    })
  }, [detalle])

  const abrirModalRechazo = useCallback(() => {
    if (!detalle) return
    setRechazarError(null)
    setDialogMode({ kind: "rechazar", incidenciaId: detalle.incidencia.id })
  }, [detalle])

  const cerrarModalRechazo = useCallback(() => {
    if (isActionSubmitting) return
    setRechazarError(null)
    setDialogMode(CLOSED_DIALOG)
  }, [isActionSubmitting])

  const handleAceptarSolicitud = async () => {
    if (!detalle) return
    setIsActionSubmitting(true)
    setActionError(null)
    try {
      await incidentsService.aprobarRechazar(detalle.incidencia.id, "aprobar")
      await cargarDetalle()
      showToast({
        variant: "default",
        message: "Solicitud aprobada correctamente.",
      })
    } catch (err) {
      setActionError(
        err instanceof Error
          ? err.message
          : "No se pudo aceptar la solicitud."
      )
    } finally {
      setIsActionSubmitting(false)
    }
  }

  const confirmarRechazo = async (motivoRechazo: string) => {
    if (!detalle) return
    setIsActionSubmitting(true)
    setRechazarError(null)
    try {
      await incidentsService.aprobarRechazar(detalle.incidencia.id, "rechazar", {
        motivoRechazo,
      })
      await cargarDetalle()
      setDialogMode(CLOSED_DIALOG)
      showToast({
        variant: "default",
        message: "Solicitud rechazada correctamente.",
      })
    } catch (err) {
      setRechazarError(
        err instanceof Error
          ? err.message
          : "No se pudo rechazar la solicitud."
      )
    } finally {
      setIsActionSubmitting(false)
    }
  }

  const handleEnviarComentario = async (contenido: string) => {
    if (!detalle) return
    setIsActionSubmitting(true)
    setActionError(null)
    try {
      await incidentsService.agregarComentario(detalle.incidencia.id, {
        contenido,
      })
      await cargarDetalle()
      showToast({
        variant: "default",
        message: "Comentario enviado correctamente.",
      })
    } catch (err) {
      setActionError(
        err instanceof Error
          ? err.message
          : "No se pudo enviar el comentario."
      )
    } finally {
      setIsActionSubmitting(false)
    }
  }

  const handleMoverEstado = async () => {
    if (!detalle || !estadoProceso) return
    const siguiente = siguienteEstadoProceso(estadoProceso, estadosProceso)
    if (!siguiente) return
    setIsActionSubmitting(true)
    setActionError(null)
    try {
      await incidentsService.cambiarEstado(detalle.incidencia.id, {
        estadoProcesoId: siguiente.id,
      })
      await cargarDetalle()
      showToast({
        variant: "default",
        message: `Estado actualizado a ${siguiente.etiqueta}.`,
      })
    } catch (err) {
      setActionError(
        err instanceof Error
          ? err.message
          : "No se pudo cambiar el estado de la incidencia."
      )
    } finally {
      setIsActionSubmitting(false)
    }
  }

  const siguienteEstado = estadoProceso
    ? siguienteEstadoProceso(estadoProceso, estadosProceso)
    : null

  const handleCambiarAprobacion = async (estadoId: string) => {
    if (!detalle) return
    const estado = estadosAprobacion.find((item) => item.id === estadoId)
    if (!estado) return
    setIsActionSubmitting(true)
    setActionError(null)
    try {
      await incidentsService.aprobarRechazar(
        detalle.incidencia.id,
        estado.clave === "RECHAZADA" ? "rechazar" : "aprobar"
      )
      await cargarDetalle()
      showToast({
        variant: "default",
        message: `Estado de aprobación actualizado a ${estado.etiqueta}.`,
      })
    } catch (err) {
      setActionError(
        err instanceof Error
          ? err.message
          : "No se pudo actualizar el estado."
      )
    } finally {
      setIsActionSubmitting(false)
    }
  }

  const handleEdit = useCallback(
    async (input: ActualizarIncidenciaInput) => {
      if (!detalle) return
      const targetId = detalle.incidencia.id
      try {
        await incidentsService.actualizar(targetId, input)
        await cargarDetalle()
        showToast({
          variant: "default",
          message: "Incidencia actualizada correctamente.",
        })
      } catch (err) {
        const message =
          err instanceof ApiError
            ? err.message
            : err instanceof Error
              ? err.message
              : "No se pudo actualizar la incidencia."
        showToast({ variant: "destructive", message })
        throw err
      }
    },
    [detalle, cargarDetalle, showToast]
  )

  const handleSubirAdjuntos = useCallback(
    async (files: File[]) => {
      if (!detalle) return
      const targetId = detalle.incidencia.id
      try {
        await incidentsService.subirAdjuntos(targetId, files)
        await cargarDetalle()
        showToast({
          variant: "default",
          message:
            files.length === 1
              ? "Adjunto subido correctamente."
              : `${files.length} adjuntos subidos correctamente.`,
        })
      } catch (err) {
        const message =
          err instanceof ApiError
            ? err.message
            : err instanceof Error
              ? err.message
              : "No se pudieron subir los adjuntos."
        showToast({ variant: "destructive", message })
        throw err
      }
    },
    [detalle, cargarDetalle, showToast]
  )

  const handleEliminar = useCallback(async () => {
    if (!detalle) return
    const targetId = detalle.incidencia.id
    try {
      await incidentsService.eliminar(targetId)
      showToast({
        variant: "default",
        message: `Incidencia ${detalle.incidencia.codigo} eliminada correctamente.`,
      })
      void navigate({ to: "/incidencias" })
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "No se pudo eliminar la incidencia."
      showToast({ variant: "destructive", message })
      throw err
    }
  }, [detalle, navigate, showToast])

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Spinner className="size-4" />
        Cargando detalle de la incidencia...
      </div>
    )
  }

  if (error || !detalle) {
    return (
      <div className="flex flex-col gap-4">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="w-fit text-slate-500"
          onClick={voltar}
        >
          <ArrowLeft aria-hidden="true" className="size-3.5" />
          Volver a incidencias
        </Button>
        <Alert variant="destructive">
          <AlertTitle>No se pudo cargar la incidencia</AlertTitle>
          <AlertDescription>
            {error ?? "La incidencia solicitada no existe o fue eliminada."}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  const { incidencia, comentarios, adjuntos, historial } = detalle
  const estadoAprobacionClave = estadoAprobacion?.clave ?? ""
  const esFinalizada = estadoProceso?.esTerminal ?? false
  const motivoRechazo =
    historial.find((item) => item.accion === "RECHAZADA")?.nota ?? null
  const puedeAvanzarEstado =
    Boolean(estadoProceso) &&
    !esFinalizada &&
    estadoAprobacionClave === "APROBADA" &&
    Boolean(siguienteEstado)

  const editDialogOpen = dialogMode.kind === "edit"
  const subirDialogOpen = dialogMode.kind === "subir-adjuntos"
  const eliminarDialogOpen = dialogMode.kind === "confirmar-eliminar"
  const rechazarDialogOpen = dialogMode.kind === "rechazar"

  return (
    <div className="flex flex-col gap-4">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="w-fit text-slate-500"
        onClick={voltar}
      >
        <ArrowLeft aria-hidden="true" className="size-3.5" />
        Volver a incidencias
      </Button>

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

      {actionError ? (
        <Alert variant="destructive">
          <AlertTitle>No se pudo completar la acción</AlertTitle>
          <AlertDescription>{actionError}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="flex flex-col gap-3">
          <Card className="rounded-lg bg-white shadow-sm">
            <CardContent className="flex flex-col gap-3 p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex flex-col gap-0.5">
                  <span className="font-mono text-xs text-slate-500">
                    {incidencia.codigo}
                  </span>
                  <h1 className="text-xl font-bold tracking-tight text-slate-950">
                    {incidencia.titulo}
                  </h1>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {puedeEditar && !esFinalizada ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 px-3"
                      onClick={handleOpenSubirAdjuntos}
                      disabled={isActionSubmitting}
                    >
                      <Upload
                        data-icon="inline-start"
                        className="size-3.5"
                      />
                      Subir adjuntos
                    </Button>
                  ) : null}
                  {puedeEditar && !esFinalizada ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 px-3"
                      onClick={handleOpenEdit}
                      disabled={isActionSubmitting}
                    >
                      <Pencil data-icon="inline-start" className="size-3.5" />
                      Editar
                    </Button>
                  ) : null}
                  {puedeEliminar && !esFinalizada ? (
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="h-8 px-3"
                      onClick={handleOpenEliminar}
                      disabled={isActionSubmitting}
                    >
                      <Trash2 data-icon="inline-start" className="size-3.5" />
                      Eliminar
                    </Button>
                  ) : null}
                </div>
              </div>
              <p className="text-sm leading-relaxed text-slate-600">
                {incidencia.descripcion}
              </p>
            </CardContent>
          </Card>

          <IncidenciaAdjuntosCard
            adjuntos={adjuntos}
            baseUrl={API_BASE_URL}
            puedeSubir={puedeSubirAdjuntos && !esFinalizada}
            onSubirAdjuntos={handleOpenSubirAdjuntos}
          />

          {puedeEditar ? (
            <IncidenciaRevisionCard
              estadoAprobacionClave={estadoAprobacionClave}
              solicitante={solicitante}
              isSubmitting={isActionSubmitting}
              onAceptar={handleAceptarSolicitud}
              onRechazar={abrirModalRechazo}
            />
          ) : null}

          {estadoAprobacionClave === "RECHAZADA" ? (
            <Card className="rounded-lg border-red-200 bg-red-50 shadow-sm">
              <CardContent className="flex flex-col gap-2 p-3.5">
                <div className="flex items-center gap-2 text-red-700">
                  <span className="text-sm font-semibold">
                    Solicitud rechazada
                  </span>
                </div>
                {motivoRechazo ? (
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-red-700">
                      Motivo
                    </span>
                    <p className="rounded-md border border-red-200 bg-white/70 px-2.5 py-2 text-sm text-slate-800">
                      {motivoRechazo}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-red-700">
                    Sin motivo registrado.
                  </p>
                )}
              </CardContent>
            </Card>
          ) : null}

          <IncidenciaComentariosCard
            comentarios={comentarios}
            usuarios={usuarios}
            isSubmitting={isActionSubmitting}
            onEnviar={handleEnviarComentario}
          />

          <IncidenciaActividadCard
            historial={historial}
            usuarios={usuarios}
            estadosProceso={estadosProceso}
            solicitante={solicitante}
          />
        </div>

        <div className="flex flex-col gap-3">
          <IncidenciaSidebar
            incidencia={incidencia}
            estadoAprobacion={estadoAprobacion}
            estadoProceso={estadoProceso}
            categoria={categoria}
            aplicativo={aplicativo}
            solicitante={solicitante}
            asignado={asignado}
            currentUserRol={currentUserRol}
          />

          {/* Cambiar estado de aprobacion: solo ADMIN.
              (AGENTE no puede aprobar/rechazar; el backend tambien bloquea con 403
              via validarAlcance, pero el frontend lo esconde para evitar enseniar
              controles que el usuario no puede usar.) */}
          {puedeEditar && currentUserRol === "ADMINISTRADOR" && estadoAprobacionClave !== "RECHAZADA" && !esFinalizada ? (
            <Card className="rounded-lg bg-white shadow-sm">
              <CardContent className="flex flex-col gap-1.5 p-3">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  Cambiar estado de aprobación
                </span>
                <select
                  aria-label="Estado de aprobación"
                  value={estadoAprobacion?.id ?? ""}
                  onChange={(event) =>
                    handleCambiarAprobacion(event.target.value)
                  }
                  disabled={isActionSubmitting}
                  className="h-8 w-full rounded-md border border-input bg-white px-2.5 text-sm text-slate-900 outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
                >
                  <option value="" disabled>
                    {estadosAprobacion.length === 0
                      ? "Sin estados disponibles"
                      : "Selecciona un estado"}
                  </option>
                  {estadosAprobacion.map((estado) => (
                    <option key={estado.id} value={estado.id}>
                      {estado.etiqueta}
                    </option>
                  ))}
                </select>
              </CardContent>
            </Card>
          ) : null}

          {puedeEditar && puedeAvanzarEstado ? (
            <Button
              type="button"
              size="default"
              onClick={handleMoverEstado}
              disabled={isActionSubmitting}
            >
              {isActionSubmitting ? (
                <Spinner className="size-4" />
              ) : null}
              {siguienteEstado
                ? `Mover a ${siguienteEstado.etiqueta}`
                : "Avanzar estado"}
            </Button>
          ) : null}
        </div>
      </div>

      <EditarIncidenciaDialog
        key={`editar-${incidencia.id}`}
        open={editDialogOpen}
        mode="editar"
        initial={incidencia}
        aplicativos={aplicativos}
        categorias={categorias}
        usuarios={usuarios}
        onClose={handleCloseDialog}
        onSubmit={handleEdit}
      />

      <SubirAdjuntosDialog
        key={`adjuntos-${incidencia.id}`}
        open={subirDialogOpen}
        onClose={handleCloseDialog}
        onSubmit={handleSubirAdjuntos}
      />

      <ConfirmarEliminarIncidenciaDialog
        key={`eliminar-${incidencia.id}`}
        open={eliminarDialogOpen}
        incidencia={{
          codigo: incidencia.codigo,
          titulo: incidencia.titulo,
        }}
        onClose={handleCloseDialog}
        onConfirm={handleEliminar}
      />

      <Dialog
        open={rechazarDialogOpen}
        onOpenChange={(open) => {
          if (!open) cerrarModalRechazo()
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Rechazar solicitud</DialogTitle>
            <DialogDescription>
              Indica el motivo por el que se rechaza esta incidencia. El
              solicitante podrá ver este mensaje.
            </DialogDescription>
          </DialogHeader>
          <RechazarIncidenciaDialog
            key={incidencia.id}
            incidencia={incidencia}
            isSubmitting={isActionSubmitting}
            error={rechazarError}
            onConfirm={confirmarRechazo}
            onCancel={cerrarModalRechazo}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}

function siguienteEstadoProceso(
  actual: EstadoProceso,
  estados: EstadoProceso[]
): EstadoProceso | null {
  if (actual.esTerminal) return null
  return (
    estados.find(
      (estado) => estado.activo && estado.orden === actual.orden + 1
    ) ?? null
  )
}