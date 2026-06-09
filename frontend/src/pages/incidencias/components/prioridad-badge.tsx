import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { Prioridad } from "@/types/incidencias"

const priorityStyles: Record<Prioridad, string> = {
  BAJA: "border-slate-200 bg-slate-100 text-slate-600",
  MEDIA: "border-orange-200 bg-orange-50 text-orange-700",
  ALTA: "border-red-200 bg-red-50 text-red-700",
  CRITICA: "border-red-300 bg-red-100 text-red-800",
}

const priorityLabels: Record<Prioridad, string> = {
  BAJA: "Baja",
  MEDIA: "Media",
  ALTA: "Alta",
  CRITICA: "Crítica",
}

export function PrioridadBadge({ prioridad }: { prioridad: Prioridad }) {
  return (
    <Badge
      variant="outline"
      className={cn("h-7 px-3", priorityStyles[prioridad])}
    >
      {priorityLabels[prioridad]}
    </Badge>
  )
}
