import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"
import type { Notificacion } from "@/services/notificaciones-service"

type NotificacionesTableProps = {
  items: Notificacion[]
  loading: boolean
  onClickFila: (item: Notificacion) => void
  onMarcarLeida: (item: Notificacion) => void
  onEliminar: (item: Notificacion) => void
}

const TIPO_LABELS: Record<Notificacion["tipo"], string> = {
  INCIDENCIA_ASIGNADA: "Asignada",
  INCIDENCIA_APROBADA: "Aprobada",
  INCIDENCIA_RECHAZADA: "Rechazada",
  INCIDENCIA_ESTADO_CAMBIADO: "Estado cambiado",
  INCIDENCIA_COMENTARIO: "Nuevo comentario",
}

const TIPO_CLASSES: Record<Notificacion["tipo"], string> = {
  INCIDENCIA_ASIGNADA: "bg-blue-50 text-blue-700",
  INCIDENCIA_APROBADA: "bg-emerald-50 text-emerald-700",
  INCIDENCIA_RECHAZADA: "bg-red-50 text-red-700",
  INCIDENCIA_ESTADO_CAMBIADO: "bg-amber-50 text-amber-700",
  INCIDENCIA_COMENTARIO: "bg-slate-100 text-slate-600",
}

const dateFormatter = new Intl.DateTimeFormat("es-PE", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
})

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return dateFormatter.format(date)
}

export function NotificacionesTable({
  items,
  loading,
  onClickFila,
  onMarcarLeida,
  onEliminar,
}: NotificacionesTableProps) {
  return (
    <Card className="rounded-lg bg-white shadow-sm">
      <CardHeader className="border-b px-5 py-3">
        <CardTitle className="text-sm font-semibold text-slate-950">
          Listado de notificaciones
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="h-9 px-4 text-xs font-medium uppercase tracking-wide text-slate-500">
                Tipo
              </TableHead>
              <TableHead className="h-9 text-xs font-medium uppercase tracking-wide text-slate-500">
                Titulo
              </TableHead>
              <TableHead className="h-9 text-xs font-medium uppercase tracking-wide text-slate-500">
                Descripcion
              </TableHead>
              <TableHead className="h-9 text-xs font-medium uppercase tracking-wide text-slate-500">
                Estado
              </TableHead>
              <TableHead className="h-9 text-xs font-medium uppercase tracking-wide text-slate-500">
                Creado
              </TableHead>
              <TableHead className="h-9 w-32 px-4 text-right text-xs font-medium uppercase tracking-wide text-slate-500">
                <span className="sr-only">Acciones</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={6}
                  className="px-4 py-8 text-center text-sm text-slate-500"
                >
                  {loading
                    ? "Cargando..."
                    : "Sin notificaciones con el filtro actual."}
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow
                  key={item.id}
                  onClick={() => onClickFila(item)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault()
                      onClickFila(item)
                    }
                  }}
                  tabIndex={0}
                  role="button"
                  aria-label={`Abrir notificacion ${item.titulo}`}
                  className={cn(
                    "cursor-pointer",
                    item.leido ? "" : "bg-blue-50/40"
                  )}
                >
                  <TableCell className="px-4 py-2">
                    <span
                      className={cn(
                        "inline-flex h-5 items-center rounded-4xl px-2 text-[11px] font-semibold uppercase tracking-wide",
                        TIPO_CLASSES[item.tipo]
                      )}
                    >
                      {TIPO_LABELS[item.tipo]}
                    </span>
                  </TableCell>
                  <TableCell className="py-2 text-sm font-medium text-slate-950">
                    {item.titulo}
                  </TableCell>
                  <TableCell className="py-2 text-xs text-slate-500">
                    {item.descripcion ?? "-"}
                  </TableCell>
                  <TableCell className="py-2">
                    {item.leido ? (
                      <span className="inline-flex h-5 items-center rounded-4xl bg-slate-100 px-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        Leida
                      </span>
                    ) : (
                      <span className="inline-flex h-5 items-center rounded-4xl bg-blue-50 px-2 text-[11px] font-semibold uppercase tracking-wide text-blue-700">
                        No leida
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="py-2 text-xs text-slate-500">
                    {formatDate(item.creadoEn)}
                  </TableCell>
                  <TableCell className="px-4 py-2 text-right">
                    <div className="inline-flex items-center gap-1">
                      {!item.leido ? (
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation()
                            void onMarcarLeida(item)
                          }}
                          className="inline-flex h-6 items-center gap-1 rounded-md px-2 text-[11px] font-semibold text-blue-700 transition-colors hover:bg-blue-50"
                        >
                          Marcar leida
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation()
                          void onEliminar(item)
                        }}
                        aria-label={`Eliminar notificacion ${item.titulo}`}
                        className="inline-flex size-6 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                      >
                        ×
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
