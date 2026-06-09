import { ArrowUpDown, ChevronLeft, ChevronRight, Trash2 } from "lucide-react"

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
  total: number
  page: number
  size: number
  categorias: Categoria[]
  aplicativos: AplicativoCliente[]
  estadosAprobacion: EstadoAprobacion[]
  onPageChange: (page: number) => void
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
  total,
  page,
  size,
  categorias,
  aplicativos,
  estadosAprobacion,
  onPageChange,
}: IncidenciasTableProps) {
  const totalPages = Math.max(1, Math.ceil(total / size))
  const start = total === 0 ? 0 : page * size + 1
  const end = Math.min(total, (page + 1) * size)

  const pageNumbers = Array.from({ length: totalPages }, (_, index) => index)

  return (
    <Card className="rounded-lg bg-white shadow-sm">
      <CardHeader className="border-b px-7 py-5">
        <CardTitle className="text-base font-semibold text-slate-950">
          Listado de incidencias
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="h-14 px-7 text-base font-medium text-slate-500">
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-base font-medium text-slate-500 transition-colors hover:text-slate-900"
                >
                  ID
                  <ArrowUpDown aria-hidden="true" className="size-3.5" />
                </button>
              </TableHead>
              <TableHead className="h-14 text-base font-medium text-slate-500">
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-base font-medium text-slate-500 transition-colors hover:text-slate-900"
                >
                  Título
                  <ArrowUpDown aria-hidden="true" className="size-3.5" />
                </button>
              </TableHead>
              <TableHead className="h-14 text-base font-medium text-slate-500">
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-base font-medium text-slate-500 transition-colors hover:text-slate-900"
                >
                  Categoría
                  <ArrowUpDown aria-hidden="true" className="size-3.5" />
                </button>
              </TableHead>
              <TableHead className="h-14 text-base font-medium text-slate-500">
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-base font-medium text-slate-500 transition-colors hover:text-slate-900"
                >
                  Estado
                  <ArrowUpDown aria-hidden="true" className="size-3.5" />
                </button>
              </TableHead>
              <TableHead className="h-14 text-base font-medium text-slate-500">
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-base font-medium text-slate-500 transition-colors hover:text-slate-900"
                >
                  Prioridad
                  <ArrowUpDown aria-hidden="true" className="size-3.5" />
                </button>
              </TableHead>
              <TableHead className="h-14 text-base font-medium text-slate-500">
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-base font-medium text-slate-500 transition-colors hover:text-slate-900"
                >
                  Asignado
                  <ArrowUpDown aria-hidden="true" className="size-3.5" />
                </button>
              </TableHead>
              <TableHead className="h-14 text-base font-medium text-slate-500">
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-base font-medium text-slate-500 transition-colors hover:text-slate-900"
                >
                  Fecha
                  <ArrowUpDown aria-hidden="true" className="size-3.5" />
                </button>
              </TableHead>
              <TableHead className="h-14 w-16 px-7 text-right text-base font-medium text-slate-500">
                <span className="sr-only">Acciones</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {incidencias.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={8}
                  className="px-7 py-10 text-center text-sm text-slate-500"
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
                  <TableRow key={incidencia.id}>
                    <TableCell className="px-7 font-mono text-sm text-slate-500">
                      {incidencia.codigo}
                    </TableCell>
                    <TableCell className="font-semibold text-slate-950">
                      {incidencia.titulo}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm font-medium text-slate-900">
                          {categoria.nombre}
                        </span>
                        {categoria.aplicativo ? (
                          <span className="text-xs text-slate-500">
                            {categoria.aplicativo}
                          </span>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell>
                      {estadoAprobacion ? (
                        <EstadoAprobacionBadge estado={estadoAprobacion} />
                      ) : (
                        <span className="text-sm text-slate-500">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <PrioridadBadge prioridad={incidencia.prioridad} />
                    </TableCell>
                    <TableCell className="text-slate-500">
                      {incidencia.asignadoA ? incidencia.asignadoA : "Sin asignar"}
                    </TableCell>
                    <TableCell className="text-slate-500">
                      {formatDate(incidencia.creadoEn)}
                    </TableCell>
                    <TableCell className="px-7 text-right">
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        aria-label={`Eliminar incidencia ${incidencia.codigo}`}
                        className="text-slate-400 hover:text-red-600"
                      >
                        <Trash2 aria-hidden="true" />
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </CardContent>

      <div className="flex flex-col items-center justify-between gap-3 border-t px-7 py-4 text-sm text-slate-500 md:flex-row">
        <p>
          Mostrando {start}-{end} de {total}
        </p>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            disabled={page === 0}
            onClick={() => onPageChange(Math.max(0, page - 1))}
            aria-label="Página anterior"
          >
            <ChevronLeft aria-hidden="true" />
          </Button>
          {pageNumbers.map((pageNumber) => (
            <button
              key={pageNumber}
              type="button"
              onClick={() => onPageChange(pageNumber)}
              className={
                pageNumber === page
                  ? "flex size-8 items-center justify-center rounded-lg bg-blue-600 text-sm font-semibold text-white"
                  : "flex size-8 items-center justify-center rounded-lg text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100"
              }
            >
              {pageNumber + 1}
            </button>
          ))}
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            disabled={page >= totalPages - 1}
            onClick={() => onPageChange(Math.min(totalPages - 1, page + 1))}
            aria-label="Página siguiente"
          >
            <ChevronRight aria-hidden="true" />
          </Button>
        </div>
      </div>
    </Card>
  )
}
