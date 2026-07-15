import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { priorityLabels, statusLabels } from "@/pages/dashboard/data"
import type { Prioridad } from "@/types/incidencias"

/**
 * Las etiquetas de estado/prioridad viven en `pages/dashboard/data.ts`
 * (config visual estatica). Aqui solo mapeamos los codigos canonicos del
 * backend a sus clases de Tailwind.
 */

const statusStyles: Record<string, string> = {
  SOLICITADA: "border-slate-200 bg-slate-100 text-slate-700",
  APROBADA: "border-blue-200 bg-blue-50 text-blue-700",
  RECHAZADA: "border-red-200 bg-red-50 text-red-700",
  PENDIENTE: "border-orange-200 bg-orange-50 text-orange-700",
  EN_PROCESO: "border-blue-200 bg-blue-50 text-blue-700",
  FINALIZADA: "border-green-200 bg-green-50 text-green-700",
}

const priorityStyles: Record<Prioridad, string> = {
  BAJA: "border-slate-200 bg-slate-100 text-slate-600",
  MEDIA: "border-orange-200 bg-orange-50 text-orange-700",
  ALTA: "border-red-200 bg-red-50 text-red-700",
  CRITICA: "border-red-200 bg-red-50 text-red-700",
}

export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge variant="outline" className={cn("h-7 px-3", statusStyles[status] ?? "")}>
      {statusLabels[status] ?? status}
    </Badge>
  )
}

export function PriorityBadge({ priority }: { priority: Prioridad }) {
  return (
    <Badge
      variant="outline"
      className={cn("h-7 px-3", priorityStyles[priority] ?? "")}
    >
      {priorityLabels[priority] ?? priority}
    </Badge>
  )
}
