import { ArrowLeft, Pencil } from "lucide-react"
import { useNavigate, useParams } from "@tanstack/react-router"
import { useEffect, useMemo, useState } from "react"

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
import { IncidenciaAdjuntosCard } from "@/pages/incidencias/detalle/components/incidencia-adjuntos-card"
import { IncidenciaActividadCard } from "@/pages/incidencias/detalle/components/incidencia-actividad-card"
import { IncidenciaComentariosCard } from "@/pages/incidencias/detalle/components/incidencia-comentarios-card"
import { IncidenciaRevisionCard } from "@/pages/incidencias/detalle/components/incidencia-revision-card"
import { IncidenciaSidebar } from "@/pages/incidencias/detalle/components/incidencia-sidebar"
import { RechazarIncidenciaDialog } from "@/pages/incidencias/detalle/components/rechazar-incidencia-dialog"
import { API_BASE_URL } from "@/lib/env"
import { aplicativosService } from "@/services/aplicativos-service"
import { categoriasService } from "@/services/categorias-service"
import { estadosAprobacionService } from "@/services/estados-aprobacion-service"
import { estadosProcesoService } from "@/services/estados-proceso-service"
import { incidentsService } from "@/services/incidents-service"
import { usuariosService } from "@/services/usuarios-service"
import type { AplicativoCliente } from "@/types/aplicativos"
import type { Categoria } from "@/types/categorias"
import type { EstadoAprobacion } from "@/types/estados-aprobacion"
import type { EstadoProceso } from "@/types/estados-proceso"
import type { IncidenciaDetalle } from "@/types/incidencias"
import type { Usuario } from "@/types/usuarios"

export function IncidenciaDetallePage() {
  const navigate = useNavigate()
  const params = useParams({ strict: false }) as { id?: string }
  const id = params.id ?? ""

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

  const [rechazarAbierto, setRechazarAbierto] = useState(false)
  const [rechazarError, setRechazarError] = useState<string | null>(null)

  const cargarDetalle = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await incidentsService.obtenerDetalle(id)
      setDetalle(response)
    } catch (err) {
      setDetalle(null)
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo obtener el detalle de la incidencia."
      )
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (!id) return
    void cargarDetalle()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  useEffect(() => {
    let cancelled = false

    async function loadCatalogos() {
      try {
        const [
          categoriasResponse,
          aplicativosResponse,
          usuariosResponse,
          aprobacionResponse,
          procesoResponse,
        ] = await Promise.all([
          categoriasService.listar(),
          aplicativosService.listar(),
          usuariosService.listar(),
          estadosAprobacionService.listar(),
          estadosProcesoService.listar(),
        ])

        if (cancelled) return
        setCategorias(categoriasResponse)
        setAplicativos(aplicativosResponse)
        setUsuarios(usuariosResponse)
        setEstadosAprobacion(aprobacionResponse)
        setEstadosProceso(procesoResponse)
      } catch {
        if (cancelled) return
      }
    }

    void loadCatalogos()

    return () => {
      cancelled = true
    }
  }, [])

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

  const handleAceptarSolicitud = async () => {
    if (!detalle) return
    setIsActionSubmitting(true)
    setActionError(null)
    try {
      await incidentsService.aprobarRechazar(detalle.incidencia.id, "aprobar")
      await cargarDetalle()
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

  const abrirModalRechazo = () => {
    setRechazarError(null)
    setRechazarAbierto(true)
  }

  const cerrarModalRechazo = () => {
    if (isActionSubmitting) return
    setRechazarAbierto(false)
    setRechazarError(null)
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
      setRechazarAbierto(false)
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
                <Button type="button" variant="outline" size="sm">
                  <Pencil data-icon="inline-start" className="size-3.5" />
                  Editar
                </Button>
              </div>
              <p className="text-sm leading-relaxed text-slate-600">
                {incidencia.descripcion}
              </p>
            </CardContent>
          </Card>

          <IncidenciaAdjuntosCard
            adjuntos={adjuntos}
            baseUrl={API_BASE_URL}
          />

          <IncidenciaRevisionCard
            estadoAprobacionClave={estadoAprobacionClave}
            solicitante={solicitante}
            isSubmitting={isActionSubmitting}
            onAceptar={handleAceptarSolicitud}
            onRechazar={abrirModalRechazo}
          />

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
            solicitante={solicitante}
          />
        </div>

        <div className="flex flex-col gap-3">
          <IncidenciaSidebar
            incidencia={incidencia}
            estadoAprobacion={estadoAprobacion}
            categoria={categoria}
            aplicativo={aplicativo}
            solicitante={solicitante}
            asignado={asignado}
          />

          {estadoAprobacionClave !== "RECHAZADA" ? (
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
                  {estadosAprobacion.map((estado) => (
                    <option key={estado.id} value={estado.id}>
                      {estado.etiqueta}
                    </option>
                  ))}
                </select>
              </CardContent>
            </Card>
          ) : null}

          {puedeAvanzarEstado ? (
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

      <Dialog
        open={rechazarAbierto}
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
