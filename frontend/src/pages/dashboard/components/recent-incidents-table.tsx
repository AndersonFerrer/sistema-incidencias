import { ArrowRight } from "lucide-react"

import { PriorityBadge, StatusBadge } from "@/pages/dashboard/components/status-badges"
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
import type { IncidenciaResumen } from "@/services/dashboard-service"

type RecentIncidentsTableProps = {
  recientes: IncidenciaResumen[]
}

/**
 * Tabla de las 5 (o menos) incidencias mas recientes segun el backend
 * (RF-10). Mapea cada `IncidenciaResumen` a una fila con badges
 * derivados del codigo canónico del backend.
 */
export function RecentIncidentsTable({ recientes }: RecentIncidentsTableProps) {
  return (
    <Card className="rounded-lg bg-white shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between border-b px-4 py-2.5">
        <CardTitle className="text-sm font-semibold text-slate-950">
          Incidencias Recientes
        </CardTitle>
        <Button size="sm" variant="link" className="h-7 text-xs">
          Ver todas
          <ArrowRight data-icon="inline-end" className="size-3" />
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="h-9 px-4 text-xs font-medium uppercase tracking-wide text-slate-500">
                ID
              </TableHead>
              <TableHead className="h-9 text-xs font-medium uppercase tracking-wide text-slate-500">
                Título
              </TableHead>
              <TableHead className="h-9 text-xs font-medium uppercase tracking-wide text-slate-500">
                Estado
              </TableHead>
              <TableHead className="h-9 text-xs font-medium uppercase tracking-wide text-slate-500">
                Prioridad
              </TableHead>
              <TableHead className="h-9 text-xs font-medium uppercase tracking-wide text-slate-500">
                Asignado
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {recientes.length === 0 ? (
              <TableRow>
                <TableCell
                  className="px-4 py-6 text-center text-sm text-slate-500"
                  colSpan={5}
                >
                  Sin incidencias en el rango seleccionado.
                </TableCell>
              </TableRow>
            ) : (
              recientes.map((incidencia) => (
                <TableRow key={incidencia.id}>
                  <TableCell className="px-4 py-2 font-mono text-xs text-slate-500">
                    {incidencia.codigo}
                  </TableCell>
                  <TableCell className="py-2 font-medium text-slate-950">
                    {incidencia.titulo}
                  </TableCell>
                  <TableCell className="py-2">
                    <StatusBadge status={incidencia.estadoProcesoCodigo} />
                  </TableCell>
                  <TableCell className="py-2">
                    <PriorityBadge priority={incidencia.prioridad} />
                  </TableCell>
                  <TableCell className="py-2 text-sm text-slate-500">
                    {incidencia.asignadoA ? incidencia.asignadoA : "Sin asignar"}
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
