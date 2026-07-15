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
import {
  PriorityBadge,
  StatusBadge,
} from "@/pages/dashboard/components/status-badges"
import type { ReporteDetalle } from "@/types/reportes"

type ReportePreviewTableProps = {
  detalle: ReporteDetalle[]
}

/**
 * Tabla preview con las mismas 10 columnas y el mismo orden que la hoja
 * `Datos` del XLSX exportado (ver T7: ID, Codigo, Titulo, Categoria,
 * Asignado a, Estado proceso, Estado aprobacion, Prioridad, Creado en,
 * Resuelto en).
 *
 * Limite: 50 filas (backend ya recorta `detalle` a top 50 mas recientes).
 */
export function ReportePreviewTable({ detalle }: ReportePreviewTableProps) {
  return (
    <Card className="rounded-lg bg-white shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between border-b px-4 py-2.5">
        <CardTitle className="text-sm font-semibold text-slate-950">
          Detalle (top {detalle.length})
        </CardTitle>
        <span className="text-[11px] text-slate-500">
          Maximo 50 filas - mismo orden que el XLSX
        </span>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="h-9 px-4 text-xs font-medium uppercase tracking-wide text-slate-500">
                ID
              </TableHead>
              <TableHead className="h-9 text-xs font-medium uppercase tracking-wide text-slate-500">
                Codigo
              </TableHead>
              <TableHead className="h-9 text-xs font-medium uppercase tracking-wide text-slate-500">
                Titulo
              </TableHead>
              <TableHead className="h-9 text-xs font-medium uppercase tracking-wide text-slate-500">
                Categoria
              </TableHead>
              <TableHead className="h-9 text-xs font-medium uppercase tracking-wide text-slate-500">
                Asignado a
              </TableHead>
              <TableHead className="h-9 text-xs font-medium uppercase tracking-wide text-slate-500">
                Estado proceso
              </TableHead>
              <TableHead className="h-9 text-xs font-medium uppercase tracking-wide text-slate-500">
                Estado aprobacion
              </TableHead>
              <TableHead className="h-9 text-xs font-medium uppercase tracking-wide text-slate-500">
                Prioridad
              </TableHead>
              <TableHead className="h-9 text-xs font-medium uppercase tracking-wide text-slate-500">
                Creado en
              </TableHead>
              <TableHead className="h-9 text-xs font-medium uppercase tracking-wide text-slate-500">
                Resuelto en
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {detalle.length === 0 ? (
              <TableRow>
                <TableCell
                  className="px-4 py-6 text-center text-sm text-slate-500"
                  colSpan={10}
                >
                  Sin incidencias en el rango seleccionado.
                </TableCell>
              </TableRow>
            ) : (
              detalle.map((fila) => (
                <TableRow key={fila.id}>
                  <TableCell className="px-4 py-2 font-mono text-[11px] text-slate-500">
                    {fila.id.slice(0, 8)}
                  </TableCell>
                  <TableCell className="py-2 font-mono text-xs text-slate-700">
                    {fila.codigo}
                  </TableCell>
                  <TableCell className="py-2 text-sm font-medium text-slate-950">
                    {fila.titulo}
                  </TableCell>
                  <TableCell className="py-2 text-sm text-slate-700">
                    {fila.categoriaNombre}
                  </TableCell>
                  <TableCell className="py-2 font-mono text-[11px] text-slate-500">
                    {fila.asignadoA ? fila.asignadoA.slice(0, 8) : "Sin asignar"}
                  </TableCell>
                  <TableCell className="py-2">
                    <StatusBadge status={fila.estadoProcesoCodigo} />
                  </TableCell>
                  <TableCell className="py-2">
                    <StatusBadge status={fila.estadoAprobacionCodigo} />
                  </TableCell>
                  <TableCell className="py-2">
                    <PriorityBadge priority={fila.prioridad} />
                  </TableCell>
                  <TableCell className="py-2 text-xs text-slate-500">
                    {fila.creadoEn}
                  </TableCell>
                  <TableCell className="py-2 text-xs text-slate-500">
                    {fila.resueltoEn ?? "-"}
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
