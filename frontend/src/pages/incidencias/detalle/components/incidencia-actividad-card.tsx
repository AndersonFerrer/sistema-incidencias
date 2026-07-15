import {
  ArrowRight,
  Check,
  Clock,
  MessageSquare,
  Paperclip,
  Pencil,
  Plus,
  X,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type {
  IncidenciaHistorial,
  IncidenciaHistorialAccion,
} from "@/types/incidencias"
import type { EstadoProceso } from "@/types/estados-proceso"
import type { Usuario } from "@/types/usuarios"

const dateTimeFormatter = new Intl.DateTimeFormat("es-PE", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
})

function formatDateTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return dateTimeFormatter.format(date)
}

const ACCION_LABELS: Record<string, string> = {
  CREADA: "Incidencia creada",
  ACTUALIZADA: "Incidencia actualizada",
  ESTADO_CAMBIADO: "Estado cambiado",
  APROBADA: "Incidencia aprobada",
  RECHAZADA: "Incidencia rechazada",
  ASIGNADA: "Incidencia asignada",
  COMENTARIO_AGREGADO: "Comentario agregado",
  ADJUNTO_AGREGADO: "Adjunto agregado",
  ADJUNTO_ELIMINADO: "Adjunto eliminado",
}

function getAccionLabel(accion: IncidenciaHistorialAccion): string {
  if (typeof accion !== "string") return "Actividad"
  return ACCION_LABELS[accion] ?? accion.replace(/_/g, " ").toLowerCase()
}

type AccionVisual = {
  Icon: LucideIcon
  badgeClass: string
}

const ACCION_VISUAL: Record<string, AccionVisual> = {
  CREADA: {
    Icon: Plus,
    badgeClass: "bg-emerald-100 text-emerald-700 ring-emerald-200",
  },
  ACTUALIZADA: {
    Icon: Pencil,
    badgeClass: "bg-blue-100 text-blue-700 ring-blue-200",
  },
  ASIGNADA: {
    Icon: Pencil,
    badgeClass: "bg-blue-100 text-blue-700 ring-blue-200",
  },
  ESTADO_CAMBIADO: {
    Icon: ArrowRight,
    badgeClass: "bg-amber-100 text-amber-700 ring-amber-200",
  },
  APROBADA: {
    Icon: Check,
    badgeClass: "bg-emerald-100 text-emerald-700 ring-emerald-200",
  },
  RECHAZADA: {
    Icon: X,
    badgeClass: "bg-red-100 text-red-700 ring-red-200",
  },
  COMENTARIO_AGREGADO: {
    Icon: MessageSquare,
    badgeClass: "bg-slate-100 text-slate-600 ring-slate-200",
  },
  ADJUNTO_AGREGADO: {
    Icon: Paperclip,
    badgeClass: "bg-slate-100 text-slate-600 ring-slate-200",
  },
  ADJUNTO_ELIMINADO: {
    Icon: X,
    badgeClass: "bg-slate-100 text-slate-600 ring-slate-200",
  },
}

const DEFAULT_VISUAL: AccionVisual = {
  Icon: Clock,
  badgeClass: "bg-slate-100 text-slate-600 ring-slate-200",
}

type IncidenciaActividadCardProps = {
  historial: IncidenciaHistorial[]
  usuarios: Usuario[]
  estadosProceso: EstadoProceso[]
  solicitante: Usuario | null
}

export function IncidenciaActividadCard({
  historial,
  usuarios,
  estadosProceso,
  solicitante,
}: IncidenciaActividadCardProps) {
  const usuarioById = new Map(usuarios.map((usuario) => [usuario.id, usuario]))
  const estadosProcesoById = new Map(
    estadosProceso.map((estado) => [estado.id, estado])
  )

  return (
    <Card className="rounded-lg bg-white shadow-sm">
      <CardContent className="flex flex-col gap-3 p-3.5">
        <h2 className="text-sm font-semibold text-slate-950">Actividad</h2>

        {historial.length === 0 ? (
          <p className="text-sm text-slate-500">
            Aún no hay movimientos registrados para esta incidencia.
          </p>
        ) : (
          <ol className="relative ml-3 flex flex-col gap-3 border-l border-slate-200 pl-5">
            {historial.map((evento) => {
              const visual =
                ACCION_VISUAL[evento.accion] ?? DEFAULT_VISUAL
              const { Icon } = visual
              const usuario = usuarioById.get(evento.usuarioId)
              const nombre = usuario?.nombre ?? "el sistema"
              const esSolicitante = solicitante?.id === evento.usuarioId

              const estadoAnterior = evento.estadoProcesoAnteriorId
                ? estadosProcesoById.get(evento.estadoProcesoAnteriorId) ??
                  null
                : null
              const estadoNuevo = evento.estadoProcesoNuevoId
                ? estadosProcesoById.get(evento.estadoProcesoNuevoId) ?? null
                : null

              const transitionLabel =
                evento.accion === "ESTADO_CAMBIADO" &&
                (estadoAnterior || estadoNuevo)
                  ? `De ${estadoAnterior?.etiqueta ?? "—"} → ${
                      estadoNuevo?.etiqueta ?? "—"
                    }`
                  : null

              return (
                <li key={evento.id} className="relative">
                  <span
                    aria-hidden="true"
                    className={cn(
                      "absolute -left-[31px] flex size-6 items-center justify-center rounded-full ring-4 ring-white",
                      visual.badgeClass
                    )}
                  >
                    <Icon className="size-3.5" />
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <p className="text-sm text-slate-700">
                      <span className="font-medium text-slate-900">
                        {getAccionLabel(evento.accion)}
                      </span>{" "}
                      por{" "}
                      <span className="font-medium text-slate-900">
                        {nombre}
                        {esSolicitante ? " (solicitante)" : ""}
                      </span>
                    </p>
                    {transitionLabel ? (
                      <p className="text-sm font-medium text-amber-700">
                        {transitionLabel}
                      </p>
                    ) : null}
                    {evento.nota ? (
                      <p
                        className={cn(
                          "text-sm text-slate-600",
                          evento.accion === "RECHAZADA" ? "italic" : null
                        )}
                      >
                        {evento.nota}
                      </p>
                    ) : null}
                    <span className="text-[11px] text-slate-500">
                      {formatDateTime(evento.creadoEn)}
                    </span>
                  </div>
                </li>
              )
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  )
}
