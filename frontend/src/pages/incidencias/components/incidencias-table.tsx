import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Trash2,
} from "lucide-react"
import { useNavigate } from "@tanstack/react-router"
import { useMemo, useState } from "react"

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
import type { EstadoProceso } from "@/types/estados-proceso"
import type { Incidencia, Prioridad } from "@/types/incidencias"
import type { Usuario } from "@/types/usuarios"
import {
  EstadoAprobacionBadge,
} from "@/pages/incidencias/components/estado-badge"
import { IncidenciaEstadoProcesoBadge } from "@/pages/incidencias/components/incidencia-estado-proceso-badge"
import { PrioridadBadge } from "@/pages/incidencias/components/prioridad-badge"

type IncidenciasTableProps = {
  incidencias: Incidencia[]
  categorias: Categoria[]
  aplicativos: AplicativoCliente[]
  estadosAprobacion: EstadoAprobacion[]
  estadosProceso: EstadoProceso[]
  usuarios: Usuario[]
  currentUserIsAdmin: boolean
  onEliminar: (incidencia: Incidencia) => void
}

type SortColumn = "titulo" | "creadoEn" | "prioridad"
type SortDirection = "asc" | "desc"
type SortState = { column: SortColumn; direction: SortDirection } | null

const PRIORIDAD_ORDEN: Record<Prioridad, number> = {
  BAJA: 0,
  MEDIA: 1,
  ALTA: 2,
  CRITICA: 3,
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

function findEstadoProceso(
  estadoId: string,
  estados: EstadoProceso[]
) {
  return estados.find((estado) => estado.id === estadoId)
}

function compareByColumn(
  a: Incidencia,
  b: Incidencia,
  column: SortColumn
): number {
  if (column === "prioridad") {
    return PRIORIDAD_ORDEN[a.prioridad] - PRIORIDAD_ORDEN[b.prioridad]
  }
  if (column === "creadoEn") {
    return Date.parse(a.creadoEn) - Date.parse(b.creadoEn)
  }
  return a.titulo.localeCompare(b.titulo, "es", { sensitivity: "base" })
}

export function IncidenciasTable({
  incidencias,
  categorias,
  aplicativos,
  estadosAprobacion,
  estadosProceso,
  usuarios,
  currentUserIsAdmin,
  onEliminar,
}: IncidenciasTableProps) {
  const navigate = useNavigate()

  const [sort, setSort] = useState<SortState>(null)

  const usuariosById = useMemo(
    () => new Map(usuarios.map((usuario) => [usuario.id, usuario])),
    [usuarios]
  )

  const sortedIncidencias = useMemo(() => {
    if (!sort) return incidencias
    const list = [...incidencias]
    list.sort((a, b) => {
      const cmp = compareByColumn(a, b, sort.column)
      return sort.direction === "asc" ? cmp : -cmp
    })
    return list
  }, [incidencias, sort])

  const toggleSort = (column: SortColumn) => {
    setSort((prev) => {
      if (!prev || prev.column !== column) {
        // First click on a column: default to a sensible starting direction.
        const initial = column === "creadoEn" ? "desc" : "asc"
        return { column, direction: initial }
      }
      if (prev.direction === "asc") {
        return { column, direction: "desc" }
      }
      return null
    })
  }

  const ariaSortFor = (column: SortColumn): "ascending" | "descending" | "none" => {
    if (!sort || sort.column !== column) return "none"
    return sort.direction === "asc" ? "ascending" : "descending"
  }

  const sortIconFor = (column: SortColumn) => {
    if (!sort || sort.column !== column) {
      return ArrowUpDown
    }
    return sort.direction === "asc" ? ArrowUp : ArrowDown
  }

  const renderSortableHeader = (
    label: string,
    column: SortColumn,
    className?: string
  ) => {
    const Icon = sortIconFor(column)
    return (
      <TableHead
        aria-sort={ariaSortFor(column)}
        className={cn(
          "h-9 text-xs font-medium uppercase tracking-wide text-slate-500",
          className
        )}
      >
        <button
          type="button"
          onClick={() => toggleSort(column)}
          aria-label={`Ordenar por ${label}`}
          className="inline-flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-slate-500 transition-colors hover:text-slate-900"
        >
          {label}
          <Icon aria-hidden="true" className="size-3" />
        </button>
      </TableHead>
    )
  }

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
                ID
              </TableHead>
              {renderSortableHeader("Título", "titulo")}
              <TableHead className="h-9 text-xs font-medium uppercase tracking-wide text-slate-500">
                Categoría
              </TableHead>
              <TableHead className="h-9 text-xs font-medium uppercase tracking-wide text-slate-500">
                Estado (aprob.)
              </TableHead>
              <TableHead className="h-9 text-xs font-medium uppercase tracking-wide text-slate-500">
                Estado (proceso)
              </TableHead>
              {renderSortableHeader("Prioridad", "prioridad")}
              <TableHead className="h-9 text-xs font-medium uppercase tracking-wide text-slate-500">
                Asignado
              </TableHead>
              {renderSortableHeader(
                "Fecha",
                "creadoEn"
              )}
              <TableHead className="h-9 w-12 px-4 text-right text-xs font-medium uppercase tracking-wide text-slate-500">
                <span className="sr-only">Acciones</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedIncidencias.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={9}
                  className="px-4 py-8 text-center text-sm text-slate-500"
                >
                  No se encontraron incidencias con los filtros actuales.
                </TableCell>
              </TableRow>
            ) : (
              sortedIncidencias.map((incidencia) => {
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
                const estadoProceso = findEstadoProceso(
                  incidencia.estadoProcesoId,
                  estadosProceso
                )
                const asignado = incidencia.asignadoA
                  ? usuariosById.get(incidencia.asignadoA)
                  : null

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
                      {estadoProceso ? (
                        <IncidenciaEstadoProcesoBadge clave={estadoProceso.clave} />
                      ) : (
                        <span className="text-sm text-slate-500">—</span>
                      )}
                    </TableCell>
                    <TableCell className="py-2">
                      <PrioridadBadge prioridad={incidencia.prioridad} />
                    </TableCell>
                    <TableCell className="py-2 text-sm text-slate-500">
                      {asignado ? asignado.nombre : "Sin asignar"}
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
                          onClick={(event) => {
                            event.stopPropagation()
                            onEliminar(incidencia)
                          }}
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
