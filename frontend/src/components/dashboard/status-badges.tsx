import { Badge } from "@/components/ui/badge"
import {
  type IncidentPriority,
  type IncidentStatus,
  priorityLabels,
  statusLabels,
} from "@/data/dashboard-data"
import { cn } from "@/lib/utils"

const statusStyles: Record<IncidentStatus, string> = {
  solicitada: "border-slate-200 bg-slate-100 text-slate-700",
  aceptada: "border-blue-200 bg-blue-50 text-blue-700",
  pendiente: "border-orange-200 bg-orange-50 text-orange-700",
  en_proceso: "border-blue-200 bg-blue-50 text-blue-700",
  finalizada: "border-green-200 bg-green-50 text-green-700",
  rechazada: "border-red-200 bg-red-50 text-red-700",
}

const priorityStyles: Record<IncidentPriority, string> = {
  baja: "border-slate-200 bg-slate-100 text-slate-600",
  media: "border-orange-200 bg-orange-50 text-orange-700",
  alta: "border-red-200 bg-red-50 text-red-700",
}

export function StatusBadge({ status }: { status: IncidentStatus }) {
  return (
    <Badge variant="outline" className={cn("h-7 px-3", statusStyles[status])}>
      {statusLabels[status]}
    </Badge>
  )
}

export function PriorityBadge({ priority }: { priority: IncidentPriority }) {
  return (
    <Badge
      variant="outline"
      className={cn("h-7 px-3", priorityStyles[priority])}
    >
      {priorityLabels[priority]}
    </Badge>
  )
}
