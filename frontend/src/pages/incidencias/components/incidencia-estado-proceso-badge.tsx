import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { EstadoProcesoClave } from "@/types/incidencias"

const estadoStyles: Record<EstadoProcesoClave, string> = {
  PENDIENTE: "border-slate-200 bg-slate-100 text-slate-700",
  EN_PROCESO: "border-blue-200 bg-blue-50 text-blue-700",
  FINALIZADA: "border-emerald-200 bg-emerald-50 text-emerald-700",
}

const estadoLabels: Record<EstadoProcesoClave, string> = {
  PENDIENTE: "Pendiente",
  EN_PROCESO: "En proceso",
  FINALIZADA: "Finalizada",
}

interface IncidenciaEstadoProcesoBadgeProps {
  clave: EstadoProcesoClave
  size?: "sm" | "md"
}

export function IncidenciaEstadoProcesoBadge({
  clave,
  size = "md",
}: IncidenciaEstadoProcesoBadgeProps) {
  const sizeClass = size === "sm" ? "h-6 px-2.5 text-xs" : "h-7 px-3"

  return (
    <Badge
      variant="outline"
      className={cn(sizeClass, estadoStyles[clave])}
    >
      {estadoLabels[clave]}
    </Badge>
  )
}