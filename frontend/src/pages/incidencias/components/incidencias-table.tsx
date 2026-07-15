import { ArrowUpDown, Trash2 } from "lucide-react"
import { useNavigate } from "@tanstack/react-router"

import { Button } from "@/components/ui/button"
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
import type { Categoria } from "@/types/categorias"
import type { AplicativoCliente } from "@/types/aplicativos"
import type { EstadoAprobacion } from "@/types/estados-aprobacion"
import type { Incidencia } from "@/types/incidencias"
import {
  EstadoAprobacionBadge,
} from "@/pages/incidencias/components/estado-badge"
import { PrioridadBadge } from "@/pages/incidencias/components/prioridad-badge"

type IncidenciasTableProps = {
  incidencias: Incidencia[]
  categorias: Categoria[]
  aplicativos: AplicativoCliente[]
  estadosAprobacion: EstadoAprobacion[]
  currentUserIsAdmin: boolean
}

const dateFormatter = new Intl.DateTimeFormat("es-PE", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
})

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return dateFormatter.format(date)
}

function findCategoria(
  categoriaId: string,
  categorias: Categoria[],
  aplicativoId: string,
  aplicativos: AplicativoCliente[]
) {
  const categoria = categorias.find((item) => item.id === categoriaId)
  const aplicativo = aplicativos.find((item) => item.id === aplicativoId)
  return {
    nombre: categoria?.nombre ?? "Sin categoría",
    aplicativo: aplicativo?.nombre ?? null,
  }
}

function findEstadoAprobacion(
  estadoId: string,
  estados: EstadoAprobacion[]
) {
  return estados.find((estado) => estado.id === estadoId)
}

export function IncidenciasTable({
  incidencias,
  categorias,
  aplicativos,
  estadosAprobacion,
  currentUserIsAdmin,
}: IncidenciasTableProps) {
  const navigate = useNavigate()

  const irADetalle = (incidencia: Incidencia) => {
    void navigate({ to: "/incidencias/$id", params: { id: incidencia.id } })
  }

  return (
    <Card className="rounded-lg bg-white shadow-sm">
      <CardHeader className="border-b px-5 py-3">
        <CardTitle className="text-sm font-semibold text-slate-950">
          Listado de incidencias
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="h-9 px-4 text-xs font-medium uppercase tracking-wide text-slate-500">
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-slate-500 transition-colors hover:text-slate-900"
                >
                  ID
                  <ArrowUpDown aria-hidden="true" className="size-3" />
                </button>
              </TableHead>
              <TableHead className="h-9 text-xs font-medium uppercase tracking-wide text-slate-500">
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-slate-500 transition-colors hover:text-slate-900"
                >
                  Título
                  <ArrowUpDown aria-hidden="true" className="size-3" />
                </button>
              </TableHead>
              <TableHead className="h-9 text-xs font-medium uppercase tracking-wide text-slate-500">
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-slate-500 transition-colors hover:text-slate-900"
                >
                  Categoría
                  <ArrowUpDown aria-hidden="true" className="size-3" />
                </button>
              </TableHead>
              <TableHead className="h-9 text-xs font-medium uppercase tracking-wide text-slate-500">
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-slate-500 transition-colors hover:text-slate-900"
                >
                  Estado
                  <ArrowUpDown aria-hidden="true" className="size-3" />
                </button>
              </TableHead>
              <TableHead className="h-9 text-xs font-medium uppercase tracking-wide text-slate-500">
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-slate-500 transition-colors hover:text-slate-900"
                >
                  Prioridad
                  <ArrowUpDown aria-hidden="true" className="size-3" />
                </button>
              </TableHead>
              <TableHead className="h-9 text-xs font-medium uppercase tracking-wide text-slate-500">
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-slate-500 transition-colors hover:text-slate-900"
                >
                  Asignado
                  <ArrowUpDown aria-hidden="true" className="size-3" />
                </button>
              </TableHead>
              <TableHead className="h-9 text-xs font-medium uppercase tracking-wide text-slate-500">
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-slate-500 transition-colors hover:text-slate-900"
                >
                  Fecha
                  <ArrowUpDown aria-hidden="true" className="size-3" />
                </button>
              </TableHead>
              <TableHead className="h-9 w-12 px-4 text-right text-xs font-medium uppercase tracking-wide text-slate-500">
                <span className="sr-only">Acciones</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {incidencias.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={8}
                  className="px-4 py-8 text-center text-sm text-slate-500"
                >
                  No se encontraron incidencias con los filtros actuales.
                </TableCell>
              </TableRow>
            ) : (
              incidencias.map((incidencia) => {
                const categoria = findCategoria(
                  incidencia.categoriaId,
                  categorias,
                  incidencia.clienteId,
                  aplicativos
                )
                const estadoAprobacion = findEstadoAprobacion(
                  incidencia.estadoAprobacionId,
                  estadosAprobacion
                )

                return (
                  <TableRow
                    key={incidencia.id}
                    onClick={() => irADetalle(incidencia)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault()
                        irADetalle(incidencia)
                      }
                    }}
                    tabIndex={0}
                    role="button"
                    aria-label={`Ver detalle de ${incidencia.codigo}`}
                    className={cn("cursor-pointer")}
                  >
                    <TableCell className="px-4 py-2 font-mono text-xs text-slate-500">
                      {incidencia.codigo}
                    </TableCell>
                    <TableCell className="py-2 font-medium text-slate-950">
                      {incidencia.titulo}
                    </TableCell>
                    <TableCell className="py-2">
                      <div className="flex flex-col gap-0">
                        <span className="text-sm font-medium text-slate-900">
                          {categoria.nombre}
                        </span>
                        {categoria.aplicativo ? (
                          <span className="text-[11px] text-slate-500">
                            {categoria.aplicativo}
                          </span>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="py-2">
                      {estadoAprobacion ? (
                        <EstadoAprobacionBadge estado={estadoAprobacion} />
                      ) : (
                        <span className="text-sm text-slate-500">—</span>
                      )}
                    </TableCell>
                    <TableCell className="py-2">
                      <PrioridadBadge prioridad={incidencia.prioridad} />
                    </TableCell>
                    <TableCell className="py-2 text-sm text-slate-500">
                      {incidencia.asignadoA ? incidencia.asignadoA : "Sin asignar"}
                    </TableCell>
                    <TableCell className="py-2 text-sm text-slate-500">
                      {formatDate(incidencia.creadoEn)}
                    </TableCell>
                    <TableCell className="px-4 py-2 text-right">
                      {currentUserIsAdmin ? (
                        <Button
                          type="button"
                          size="icon-xs"
                          variant="ghost"
                          aria-label={`Eliminar incidencia ${incidencia.codigo}`}
                          className="text-slate-400 hover:text-red-600"
                          onClick={(event) => event.stopPropagation()}
                        >
                          <Trash2 aria-hidden="true" />
                        </Button>
                      ) : null}
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}