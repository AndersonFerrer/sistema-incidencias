import { Card, CardContent } from "@/components/ui/card"
import type {
  IncidenciaHistorial,
  IncidenciaHistorialAccion,
} from "@/types/incidencias"
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

type IncidenciaActividadCardProps = {
  historial: IncidenciaHistorial[]
  usuarios: Usuario[]
  solicitante: Usuario | null
}

export function IncidenciaActividadCard({
  historial,
  usuarios,
  solicitante,
}: IncidenciaActividadCardProps) {
  const usuarioById = new Map(usuarios.map((usuario) => [usuario.id, usuario]))

  return (
    <Card className="rounded-lg bg-white shadow-sm">
      <CardContent className="flex flex-col gap-2.5 p-3.5">
        <h2 className="text-sm font-semibold text-slate-950">Actividad</h2>

        {historial.length === 0 ? (
          <p className="text-sm text-slate-500">
            Aún no hay movimientos registrados para esta incidencia.
          </p>
        ) : (
          <ol className="flex flex-col gap-2.5">
            {historial.map((evento) => {
              const usuario = usuarioById.get(evento.usuarioId)
              const nombre = usuario?.nombre ?? "el sistema"
              const esSolicitante = solicitante?.id === evento.usuarioId

              return (
                <li
                  key={evento.id}
                  className="flex items-start gap-2.5 border-l-2 border-slate-100 pl-3"
                >
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
                    {evento.nota ? (
                      <p className="text-sm text-slate-600">{evento.nota}</p>
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
